import { prisma } from '../lib/prisma';
import { createAndSendNotification } from './notification.service';
import { NOTIFICATION_TYPES } from '@zartsa/shared';
import type { AnnouncementCategory, CreateAnnouncementInput, UpdateAnnouncementInput } from '@zartsa/shared';

export async function listPublishedAnnouncements(category?: AnnouncementCategory, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = {
    isPublished: true,
    publishedAt: { lte: new Date() },
    ...(category ? { category } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.announcement.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getPublishedAnnouncement(id: string) {
  return prisma.announcement.findFirst({
    where: { id, isPublished: true, publishedAt: { lte: new Date() } },
  });
}

export async function listAllAnnouncements(category?: AnnouncementCategory, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = category ? { category } : {};

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.announcement.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function createAnnouncement(data: CreateAnnouncementInput) {
  return prisma.announcement.create({
    data: {
      titleSw: data.titleSw,
      titleEn: data.titleEn,
      contentSw: data.contentSw,
      contentEn: data.contentEn,
      category: data.category,
      sourceAuthority: data.sourceAuthority,
      isPublished: data.publishNow ?? false,
      publishedAt: data.publishNow ? new Date() : null,
    },
  });
}

export async function updateAnnouncement(id: string, data: UpdateAnnouncementInput) {
  return prisma.announcement.update({
    where: { id },
    data,
  });
}

export async function publishAnnouncement(id: string) {
  const announcement = await prisma.announcement.update({
    where: { id },
    data: { isPublished: true, publishedAt: new Date() },
  });

  const optedInUsers = await prisma.notificationPreference.findMany({
    where: { type: 'new_announcement', inApp: true },
    select: { userId: true },
  });

  const title = announcement.titleEn;
  const message = `New ${announcement.category.replace(/_/g, ' ').toLowerCase()}: ${title}`;

  for (const user of optedInUsers) {
    await createAndSendNotification({
      userId: user.userId,
      type: 'new_announcement',
      title: title,
      message: message,
    }).catch(() => { /* Don't fail publish if notification fails */ });
  }

  return announcement;
}

export async function unpublishAnnouncement(id: string) {
  return prisma.announcement.update({
    where: { id },
    data: { isPublished: false, publishedAt: null },
  });
}

export async function deleteAnnouncement(id: string) {
  return prisma.announcement.delete({ where: { id } });
}