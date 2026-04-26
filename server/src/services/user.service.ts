import { prisma } from '../lib/prisma';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logAuditEvent } from './audit-logger';
import type { UpdateProfileInput, SaveRouteInput } from '@zartsa/shared';

const MAX_SAVED_ROUTES = 10;

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      savedRoutes: {
        orderBy: { createdAt: 'desc' },
      },
      notificationPrefs: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.toLowerCase(),
    nationalId: user.nationalId,
    preferredLanguage: user.preferredLanguage,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    savedRoutes: user.savedRoutes,
    notificationPreferences: user.notificationPrefs,
  };
}

export async function updateUserProfile(userId: string, data: UpdateProfileInput, ipAddress?: string) {
  const updateData: Record<string, unknown> = {};

  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.nationalId !== undefined) updateData.nationalId = data.nationalId;
  if (data.preferredLanguage !== undefined) updateData.preferredLanguage = data.preferredLanguage;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    include: {
      savedRoutes: { orderBy: { createdAt: 'desc' } },
      notificationPrefs: true,
    },
  });

  await logAuditEvent({
    userId,
    action: 'UPDATE_PROFILE',
    resource: 'users',
    details: `Updated fields: ${Object.keys(updateData).join(', ')}`,
    ipAddress,
  });

  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.toLowerCase(),
    nationalId: user.nationalId,
    preferredLanguage: user.preferredLanguage,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    savedRoutes: user.savedRoutes,
    notificationPreferences: user.notificationPrefs,
  };
}

export async function updateLanguage(userId: string, language: 'sw' | 'en') {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { preferredLanguage: language === 'sw' ? 'sw' : 'en' },
  });

  return { preferredLanguage: user.preferredLanguage };
}

export async function saveRoute(userId: string, data: SaveRouteInput) {
  const routeCount = await prisma.savedRoute.count({
    where: { userId },
  });

  if (routeCount >= MAX_SAVED_ROUTES) {
    throw new ValidationError(`Maximum of ${MAX_SAVED_ROUTES} saved routes reached. Remove a route before adding a new one.`);
  }

  const route = await prisma.savedRoute.create({
    data: {
      userId,
      departure: data.departure,
      destination: data.destination,
      label: data.label,
    },
  });

  await logAuditEvent({
    userId,
    action: 'SAVE_ROUTE',
    resource: 'saved_routes',
    details: `${data.departure} -> ${data.destination}`,
  });

  return route;
}

export async function deleteSavedRoute(userId: string, routeId: string) {
  const route = await prisma.savedRoute.findUnique({
    where: { id: routeId },
  });

  if (!route || route.userId !== userId) {
    throw new NotFoundError('Saved route');
  }

  await prisma.savedRoute.delete({
    where: { id: routeId },
  });

  await logAuditEvent({
    userId,
    action: 'DELETE_ROUTE',
    resource: 'saved_routes',
    details: `Route ${routeId}`,
  });
}

export async function deleteAccount(userId: string, ipAddress?: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  await logAuditEvent({
    userId,
    action: 'DELETE_ACCOUNT',
    resource: 'users',
    details: 'Account deactivated (soft delete for data protection compliance)',
    ipAddress,
  });
}

export async function getDashboardHistory(userId: string) {
  const [bookings, complaints, fines] = await Promise.all([
    prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        departure: true,
        destination: true,
        travelDate: true,
        totalAmount: true,
        currency: true,
        status: true,
        qrCode: true,
        createdAt: true,
      },
    }),
    prisma.complaint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        referenceNumber: true,
        vehiclePlate: true,
        category: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.fine.findMany({
      where: {
        OR: [
          { drivingLicense: { in: await getUserLicenseNumbers(userId) } },
          { vehiclePlate: { in: await getUserVehiclePlates(userId) } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        offenseType: true,
        location: true,
        penaltyAmount: true,
        currency: true,
        paymentStatus: true,
        controlNumber: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    bookings: bookings.map((b) => ({
      ...b,
      totalAmount: Number(b.totalAmount),
      travelDate: b.travelDate.toISOString(),
      createdAt: b.createdAt.toISOString(),
    })),
    verifications: [],
    complaints: complaints.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
    fines: fines.map((f) => ({
      ...f,
      penaltyAmount: Number(f.penaltyAmount),
      createdAt: f.createdAt.toISOString(),
    })),
  };
}

async function getUserLicenseNumbers(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.nationalId) return [];
  return [user.nationalId];
}

async function getUserVehiclePlates(userId: string): Promise<string[]> {
  // Get vehicle plates from bookings where user has active tickets
  const bookings = await prisma.booking.findMany({
    where: { userId, status: { in: ['ACTIVE', 'USED'] } },
    select: { vehiclePlate: true },
  });
  return bookings.map(b => b.vehiclePlate).filter((p): p is string => p !== null);
}