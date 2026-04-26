import { prisma } from '../lib/prisma';
import { cacheGet, cacheSet, cacheDelete } from './redis.service';
import { processPayment } from './payment.service';
import { createAndSendNotification } from './notification.service';
import { NOTIFICATION_TYPES } from '@zartsa/shared';
import type { RouteSearchResult, SeatLayout, SeatInfo, TicketStatus, PaymentMethod } from '@zartsa/shared';
import * as QRCode from 'qrcode';
import { uploadFile } from './minio.service';
import { logger } from '../utils/logger';
import { AppError, NotFoundError, ForbiddenError } from '../utils/errors';

const SEAT_LOCK_TTL = 600; // 10 minutes in seconds
const SEAT_ROWS = 10;
const SEATS_PER_ROW = 4;
const TOTAL_SEATS = SEAT_ROWS * SEATS_PER_ROW;

// Mock schedule: generate departure times for the day
const MOCK_DEPARTURE_TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00',
  '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00',
];

function getSeatLockKey(departure: string, destination: string, dateStr: string, seatNum: string): string {
  return `seat:${departure}:${destination}:${dateStr}:${seatNum}`;
}

function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(date: Date): string {
  return date.toISOString().split('T')[1]?.substring(0, 5) || '08:00';
}

/**
 * Search available routes for a given departure, destination, and date.
 * Queries the FareTable and generates mock trip schedules.
 */
export async function searchRoutes(
  departure: string,
  destination: string,
  date: string,
): Promise<RouteSearchResult[]> {
  const travelDate = new Date(date);
  const cacheKey = `routes:${departure}:${destination}:${formatDateStr(travelDate)}`;
  const cached = await cacheGet<RouteSearchResult[]>(cacheKey);
  if (cached) return cached;

  const fares = await prisma.fareTable.findMany({
    where: {
      departure: { contains: departure, mode: 'insensitive' },
      destination: { contains: destination, mode: 'insensitive' },
      effectiveDate: { lte: new Date() },
    },
    orderBy: { effectiveDate: 'desc' },
  });

  if (fares.length === 0) return [];

  // Count booked seats for the date to compute available seats
  const startOfDay = new Date(travelDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(travelDate);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      departure: { contains: departure, mode: 'insensitive' },
      destination: { contains: destination, mode: 'insensitive' },
      travelDate: { gte: startOfDay, lte: endOfDay },
      status: 'ACTIVE',
    },
    select: { seatNumbers: true },
  });

  const bookedSeatCount = bookings.reduce((count, b) => {
    const seats = Array.isArray(b.seatNumbers) ? b.seatNumbers : [];
    return count + seats.length;
  }, 0);

  const results: RouteSearchResult[] = fares.map((fare) => {
    const baseFare = Number(fare.baseFare);
    const surcharge = Number(fare.surcharge);
    const totalFare = baseFare + surcharge;
    const availableSeats = Math.max(0, TOTAL_SEATS - bookedSeatCount);

    // Pick a mock departure time (deterministic based on route)
    const timeIndex = fares.indexOf(fare) % MOCK_DEPARTURE_TIMES.length;
    const depTime = MOCK_DEPARTURE_TIMES[timeIndex];

    // Estimate arrival: ~2 hours later for shamba, ~1 hour for daladala
    const durationHours = fare.routeType === 'shamba' ? 2 : 1;
    const arrHour = parseInt(depTime.split(':')[0], 10) + durationHours;
    const arrTime = `${String(arrHour).padStart(2, '0')}:${depTime.split(':')[1]}`;

    return {
      departure: fare.departure,
      destination: fare.destination,
      routeType: fare.routeType,
      availableSeats,
      baseFare,
      surcharge,
      totalFare,
      departureTime: depTime,
      estimatedArrival: arrTime,
    };
  });

  await cacheSet(cacheKey, results, 300); // cache 5 minutes
  return results;
}

/**
 * Generate the bus seat layout (10 rows x 4 seats).
 * Checks booked seats from DB and locked seats from Redis.
 */
export async function getSeatLayout(
  departure: string,
  destination: string,
  date: string,
): Promise<SeatLayout> {
  const travelDate = new Date(date);
  const dateStr = formatDateStr(travelDate);

  // Get booked seats from DB
  const startOfDay = new Date(travelDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(travelDate);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      departure: { contains: departure, mode: 'insensitive' },
      destination: { contains: destination, mode: 'insensitive' },
      travelDate: { gte: startOfDay, lte: endOfDay },
      status: { in: ['ACTIVE', 'USED'] },
    },
    select: { seatNumbers: true },
  });

  const bookedSeats = new Set<string>();
  for (const b of bookings) {
    const seats = Array.isArray(b.seatNumbers) ? (b.seatNumbers as string[]) : [];
    for (const s of seats) bookedSeats.add(String(s));
  }

  // Build layout
  const layout: SeatInfo[][] = [];
  for (let row = 1; row <= SEAT_ROWS; row++) {
    const rowSeats: SeatInfo[] = [];
    for (let col = 1; col <= SEATS_PER_ROW; col++) {
      const seatNum = `${row}${String.fromCharCode(64 + col)}`; // e.g. 1A, 1B, 1C, 1D
      const lockKey = getSeatLockKey(departure, destination, dateStr, seatNum);
      const lockedBy = await cacheGet<string>(lockKey);

      const isAvailable = !bookedSeats.has(seatNum) && lockedBy === null;
      const isWindow = col === 1 || col === SEATS_PER_ROW;

      rowSeats.push({
        number: seatNum,
        isAvailable,
        isWindow,
        type: row <= 2 ? 'premium' : 'standard',
      });
    }
    layout.push(rowSeats);
  }

  return { rows: SEAT_ROWS, seatsPerRow: SEATS_PER_ROW, layout };
}

/**
 * Lock seats in Redis with a 10-minute TTL.
 * Throws if any seat is already locked by another user.
 */
export async function lockSeats(
  departure: string,
  destination: string,
  date: string,
  seatNumbers: string[],
  userId: string,
): Promise<void> {
  const travelDate = new Date(date);
  const dateStr = formatDateStr(travelDate);

  // Check which seats are already locked
  const conflicts: string[] = [];
  for (const seatNum of seatNumbers) {
    const lockKey = getSeatLockKey(departure, destination, dateStr, seatNum);
    const lockedBy = await cacheGet<string>(lockKey);
    if (lockedBy && lockedBy !== userId) {
      conflicts.push(seatNum);
    }
  }

  if (conflicts.length > 0) {
    throw new AppError(
      409,
      `Seats ${conflicts.join(', ')} are already locked by another user`,
      'SEAT_LOCK_CONFLICT',
    );
  }

  // Lock all seats
  for (const seatNum of seatNumbers) {
    const lockKey = getSeatLockKey(departure, destination, dateStr, seatNum);
    await cacheSet(lockKey, userId, SEAT_LOCK_TTL);
  }

  logger.info('Seats locked', { departure, destination, dateStr, seatNumbers, userId });
}

/**
 * Create a booking: lock seats, calculate fare, process payment, create record with QR code,
 * and send notification.
 */
export async function createBooking(data: {
  departure: string;
  destination: string;
  travelDate: string;
  passengerCount: number;
  seatNumbers: string[];
  paymentMethod: PaymentMethod;
  userId: string;
  phoneNumber?: string;
}) {
  const { departure, destination, travelDate, passengerCount, seatNumbers, paymentMethod, userId, phoneNumber } = data;

  // Lock seats first
  await lockSeats(departure, destination, travelDate, seatNumbers, userId);

  try {
    // Calculate fare from FareTable
    const fare = await prisma.fareTable.findFirst({
      where: {
        departure: { contains: departure, mode: 'insensitive' },
        destination: { contains: destination, mode: 'insensitive' },
        effectiveDate: { lte: new Date() },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!fare) {
      throw new NotFoundError('Fare for this route');
    }

    const baseFare = Number(fare.baseFare);
    const surcharge = Number(fare.surcharge);
    const totalFare = baseFare + surcharge;
    const totalAmount = totalFare * passengerCount;

    // Process payment
    const paymentResult = await processPayment({
      amount: totalAmount,
      currency: fare.currency,
      paymentMethod,
      phoneNumber,
      controlNumber: `BK-${Date.now()}`,
      description: `Booking ${departure} to ${destination}`,
    });

    if (!paymentResult.success) {
      throw new AppError(400, paymentResult.message, 'PAYMENT_FAILED');
    }

    // Generate QR code
    const bookingRef = `BK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const qrData = JSON.stringify({
      bookingRef,
      departure,
      destination,
      travelDate,
      seatNumbers,
      passengerCount,
    });
    const qrBuffer = await QRCode.toBuffer(qrData, {
      type: 'png',
      width: 256,
      margin: 2,
    });

    // Upload QR code to MinIO
    const qrObjectName = `qr-codes/${bookingRef}.png`;
    const qrCodePath = await uploadFile(qrObjectName, qrBuffer, 'image/png');

    // Create booking record inside a transaction
    const booking = await prisma.$transaction(async (tx) => {
      return tx.booking.create({
        data: {
          userId,
          departure,
          destination,
          travelDate: new Date(travelDate),
          passengerCount,
          seatNumbers,
          totalAmount,
          currency: fare.currency,
          paymentMethod,
          paymentRef: paymentResult.transactionRef,
          status: 'ACTIVE',
          qrCode: qrCodePath,
        },
      });
    });

    // Release seat locks (booking is now in DB)
    const dateStr = formatDateStr(new Date(travelDate));
    for (const seatNum of seatNumbers) {
      const lockKey = getSeatLockKey(departure, destination, dateStr, seatNum);
      await cacheDelete(lockKey);
    }

    // Send notification
    await createAndSendNotification({
      userId,
      type: NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      title: 'Booking Confirmed',
      message: `Your booking from ${departure} to ${destination} on ${formatDateStr(new Date(travelDate))} is confirmed. Seats: ${seatNumbers.join(', ')}. Ref: ${bookingRef}`,
    }).catch(() => {
      /* Don't fail booking if notification fails */
    });

    logger.info('Booking created', { bookingId: booking.id, userId, bookingRef });

    return {
      ...booking,
      totalAmount: Number(booking.totalAmount),
      seatNumbers: booking.seatNumbers as string[],
      bookingRef,
    };
  } catch (error) {
    // Release seat locks on failure
    const dateStr = formatDateStr(new Date(travelDate));
    for (const seatNum of seatNumbers) {
      const lockKey = getSeatLockKey(departure, destination, dateStr, seatNum);
      await cacheDelete(lockKey);
    }
    throw error;
  }
}

/**
 * Cancel a booking: verify ownership and ACTIVE status, set CANCELLED, release seat locks.
 */
export async function cancelBooking(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  if (booking.userId !== userId) {
    throw new ForbiddenError('You can only cancel your own booking');
  }

  if (booking.status !== 'ACTIVE') {
    throw new AppError(400, 'Only active bookings can be cancelled', 'INVALID_STATUS');
  }

  // Update status to CANCELLED in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    return tx.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' as TicketStatus },
    });
  });

  // Release seat locks in Redis (in case they still exist)
  const dateStr = formatDateStr(booking.travelDate);
  const seatNumbers = Array.isArray(booking.seatNumbers) ? (booking.seatNumbers as string[]) : [];
  for (const seatNum of seatNumbers) {
    const lockKey = getSeatLockKey(booking.departure, booking.destination, dateStr, seatNum);
    await cacheDelete(lockKey);
  }

  // Send notification
  await createAndSendNotification({
    userId,
    type: NOTIFICATION_TYPES.PAYMENT_RECEIPT,
    title: 'Booking Cancelled',
    message: `Your booking from ${booking.departure} to ${booking.destination} on ${dateStr} has been cancelled.`,
  }).catch(() => {
    /* Don't fail cancellation if notification fails */
  });

  logger.info('Booking cancelled', { bookingId, userId });

  return {
    ...updated,
    totalAmount: Number(updated.totalAmount),
    seatNumbers: updated.seatNumbers as string[],
  };
}

/**
 * Get paginated bookings for a user.
 */
export async function getUserBookings(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = { userId };

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    items: items.map((b) => ({
      ...b,
      totalAmount: Number(b.totalAmount),
      seatNumbers: b.seatNumbers as string[],
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single booking by ID with ownership check.
 */
export async function getBookingById(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  if (booking.userId !== userId) {
    throw new ForbiddenError('You can only view your own booking');
  }

  return {
    ...booking,
    totalAmount: Number(booking.totalAmount),
    seatNumbers: booking.seatNumbers as string[],
  };
}

/**
 * Generate a QR code image buffer from booking data.
 */
export async function generateQRCode(bookingId: string): Promise<Buffer> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  const qrData = JSON.stringify({
    bookingId: booking.id,
    departure: booking.departure,
    destination: booking.destination,
    travelDate: booking.travelDate.toISOString(),
    seatNumbers: booking.seatNumbers,
    status: booking.status,
  });

  return QRCode.toBuffer(qrData, {
    type: 'png',
    width: 256,
    margin: 2,
  });
}