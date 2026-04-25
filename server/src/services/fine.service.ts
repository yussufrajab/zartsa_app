import { prisma } from '../lib/prisma';
import { zimsService } from './zims.service';
import { processPayment } from './payment.service';
import { zimsSyncQueue } from './queue.service';
import { createAndSendNotification } from './notification.service';
import { NOTIFICATION_TYPES } from '@zartsa/shared';
import type { PaymentMethod, NotificationType } from '@zartsa/shared';
import { logger } from '../utils/logger';
import { NotFoundError, AppError } from '../utils/errors';

export async function getFinesByLicense(drivingLicense: string) {
  // Check local DB first
  const localFines = await prisma.fine.findMany({
    where: { drivingLicense },
    orderBy: { offenseDate: 'desc' },
  });

  const localControlNumbers = new Set(localFines.map((f) => f.controlNumber));

  // Fetch from ZIMS for new fines
  try {
    const zimsFines = await zimsService.getFinesByLicense(drivingLicense);

    const newFines = zimsFines.filter((zf) => !localControlNumbers.has(zf.controlNumber));

    if (newFines.length > 0) {
      await prisma.fine.createMany({
        data: newFines.map((zf) => ({
          drivingLicense,
          vehiclePlate: null,
          offenseType: zf.offenseType,
          offenseDate: new Date(zf.offenseDate),
          location: zf.location,
          penaltyAmount: zf.penaltyAmount,
          currency: 'TZS',
          controlNumber: zf.controlNumber,
          paymentStatus: (zf.paymentStatus === 'OUTSTANDING' || zf.paymentStatus === 'PAID' || zf.paymentStatus === 'DISPUTED' || zf.paymentStatus === 'WAIVED')
            ? zf.paymentStatus
            : 'OUTSTANDING',
        })),
      });

      logger.info(`Created ${newFines.length} new fines from ZIMS for license ${drivingLicense}`);

      // Notify users about new fines
      for (const zf of newFines) {
        const newFine = await prisma.fine.findUnique({
          where: { controlNumber: zf.controlNumber },
        });

        if (newFine) {
          await notifyFineHolders(newFine).catch(() => {
            /* Don't fail if notification fails */
          });
        }
      }

      // Merge local and newly created fines
      return await prisma.fine.findMany({
        where: { drivingLicense },
        orderBy: { offenseDate: 'desc' },
      });
    }
  } catch (err: any) {
    // If ZIMS is unavailable, return local fines only
    logger.warn('ZIMS fetch failed, returning local fines only', {
      drivingLicense,
      error: err?.message,
    });
  }

  return localFines;
}

export async function getFinesByVehicle(vehiclePlate: string) {
  // Check local DB first
  const localFines = await prisma.fine.findMany({
    where: { vehiclePlate },
    orderBy: { offenseDate: 'desc' },
  });

  const localControlNumbers = new Set(localFines.map((f) => f.controlNumber));

  // Fetch from ZIMS for new fines
  try {
    const zimsFines = await zimsService.getFinesByVehicle(vehiclePlate);

    const newFines = zimsFines.filter((zf) => !localControlNumbers.has(zf.controlNumber));

    if (newFines.length > 0) {
      await prisma.fine.createMany({
        data: newFines.map((zf) => ({
          drivingLicense: null,
          vehiclePlate,
          offenseType: zf.offenseType,
          offenseDate: new Date(zf.offenseDate),
          location: zf.location,
          penaltyAmount: zf.penaltyAmount,
          currency: 'TZS',
          controlNumber: zf.controlNumber,
          paymentStatus: (zf.paymentStatus === 'OUTSTANDING' || zf.paymentStatus === 'PAID' || zf.paymentStatus === 'DISPUTED' || zf.paymentStatus === 'WAIVED')
            ? zf.paymentStatus
            : 'OUTSTANDING',
        })),
      });

      logger.info(`Created ${newFines.length} new fines from ZIMS for vehicle ${vehiclePlate}`);

      // Notify users about new fines
      for (const zf of newFines) {
        const newFine = await prisma.fine.findUnique({
          where: { controlNumber: zf.controlNumber },
        });

        if (newFine) {
          await notifyFineHolders(newFine).catch(() => {
            /* Don't fail if notification fails */
          });
        }
      }

      // Merge local and newly created fines
      return await prisma.fine.findMany({
        where: { vehiclePlate },
        orderBy: { offenseDate: 'desc' },
      });
    }
  } catch (err: any) {
    // If ZIMS is unavailable, return local fines only
    logger.warn('ZIMS fetch failed, returning local fines only', {
      vehiclePlate,
      error: err?.message,
    });
  }

  return localFines;
}

export async function getFineById(id: string) {
  const fine = await prisma.fine.findUnique({ where: { id } });

  if (!fine) {
    throw new NotFoundError('Fine');
  }

  return fine;
}

export async function payFine(fineId: string, paymentMethod: PaymentMethod, phoneNumber?: string) {
  const fine = await prisma.fine.findUnique({ where: { id: fineId } });

  if (!fine) {
    throw new NotFoundError('Fine');
  }

  if (fine.paymentStatus !== 'OUTSTANDING') {
    throw new AppError(400, 'Fine is not in OUTSTANDING status', 'FINE_NOT_OUTSTANDING');
  }

  // Process payment via payment service
  const paymentResult = await processPayment({
    amount: Number(fine.penaltyAmount),
    currency: fine.currency,
    paymentMethod,
    phoneNumber,
    controlNumber: fine.controlNumber,
    description: `Fine payment - ${fine.offenseType} at ${fine.location}`,
  });

  if (!paymentResult.success) {
    throw new AppError(402, paymentResult.message, 'PAYMENT_FAILED');
  }

  // Update fine status to PAID
  const updatedFine = await prisma.fine.update({
    where: { id: fineId },
    data: {
      paymentStatus: 'PAID',
      paymentRef: paymentResult.transactionRef,
      paidAt: paymentResult.paidAt,
    },
  });

  // Queue ZIMS sync
  await zimsSyncQueue.add('zims-sync', {
    fineId,
    action: 'payment' as const,
  });

  // Send payment receipt notification
  await notifyFineHolders(updatedFine, {
    type: NOTIFICATION_TYPES.PAYMENT_RECEIPT,
    title: 'Payment Receipt',
    message: `Payment of TZS ${Number(updatedFine.penaltyAmount).toLocaleString()} for fine ${updatedFine.controlNumber} confirmed. Ref: ${paymentResult.transactionRef}`,
  }).catch(() => {
    /* Don't fail payment if notification fails */
  });

  return updatedFine;
}

export async function submitDispute(fineId: string, userId: string, reason: string) {
  const fine = await prisma.fine.findUnique({ where: { id: fineId } });

  if (!fine) {
    throw new NotFoundError('Fine');
  }

  if (fine.paymentStatus !== 'OUTSTANDING') {
    throw new AppError(400, 'Only OUTSTANDING fines can be disputed', 'FINE_NOT_OUTSTANDING');
  }

  const updatedFine = await prisma.fine.update({
    where: { id: fineId },
    data: {
      paymentStatus: 'DISPUTED',
    },
  });

  // Notify the disputing user
  await createAndSendNotification({
    userId,
    type: NOTIFICATION_TYPES.COMPLAINT_STATUS_UPDATE,
    title: 'Fine Dispute Submitted',
    message: `Your dispute for fine ${fine.controlNumber} has been submitted and is under review.`,
  }).catch(() => {
    /* Don't fail dispute if notification fails */
  });

  // Queue ZIMS sync for dispute
  await zimsSyncQueue.add('zims-sync', {
    fineId,
    action: 'dispute' as const,
  });

  return updatedFine;
}

export async function waiveFine(fineId: string) {
  const fine = await prisma.fine.findUnique({ where: { id: fineId } });

  if (!fine) {
    throw new NotFoundError('Fine');
  }

  if (fine.paymentStatus !== 'OUTSTANDING' && fine.paymentStatus !== 'DISPUTED') {
    throw new AppError(400, 'Only OUTSTANDING or DISPUTED fines can be waived', 'FINE_CANNOT_BE_WAIVED');
  }

  const updatedFine = await prisma.fine.update({
    where: { id: fineId },
    data: {
      paymentStatus: 'WAIVED',
    },
  });

  // Notify fine holder about waiver
  await notifyFineHolders(updatedFine, {
    type: NOTIFICATION_TYPES.NEW_FINE,
    title: 'Fine Waived',
    message: `Fine ${fine.controlNumber} for ${fine.offenseType} has been waived.`,
  }).catch(() => {
    /* Don't fail waiver if notification fails */
  });

  return updatedFine;
}

export async function getDisputes(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = { paymentStatus: 'DISPUTED' as const };

  const [items, total] = await Promise.all([
    prisma.fine.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.fine.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Helper to notify users associated with a fine.
 * Since the User model doesn't directly store drivingLicense or vehiclePlate,
 * we attempt to find users by nationalId matching the drivingLicense.
 */
async function notifyFineHolders(
  fine: { id: string; drivingLicense: string | null; vehiclePlate: string | null; offenseType: string; controlNumber: string; penaltyAmount: { toNumber: () => number } },
  override?: { type: NotificationType; title: string; message: string },
) {
  const amount = Number(fine.penaltyAmount);
  const notificationData = override ?? {
    type: NOTIFICATION_TYPES.NEW_FINE as NotificationType,
    title: 'New Fine Issued',
    message: `A new fine for ${fine.offenseType} has been issued. Control number: ${fine.controlNumber}. Amount: TZS ${amount.toLocaleString()}`,
  };

  if (fine.drivingLicense) {
    const users = await prisma.user.findMany({
      where: { nationalId: fine.drivingLicense },
      select: { id: true },
    });

    for (const user of users) {
      await createAndSendNotification({
        userId: user.id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
      });
    }
  }

  if (fine.vehiclePlate && !fine.drivingLicense) {
    logger.info('Vehicle-based fine notification requires userId context', {
      fineId: fine.id,
      vehiclePlate: fine.vehiclePlate,
    });
  }
}