import { prisma } from '../lib/prisma';
import { uploadFile } from './minio.service';
import { createAndSendNotification } from './notification.service';
import type { ItemCategory, ItemStatus } from '@zartsa/shared';

export async function reportLostItem(data: {
  userId: string;
  description: string;
  category: ItemCategory;
  route: string;
  travelDate: Date;
  contactInfo: string;
}) {
  const item = await prisma.lostItemReport.create({
    data: { ...data, status: 'REPORTED' },
  });

  await findMatchesForLostItem(item.id, data.category, data.route, data.description);

  return item;
}

export async function reportFoundItem(data: {
  reportedBy: string;
  description: string;
  category: ItemCategory;
  busNumber: string;
  route: string;
  foundDate: Date;
  photoBuffer?: Buffer;
  photoMimetype?: string;
}) {
  let photoUrl: string | null = null;
  if (data.photoBuffer && data.photoMimetype) {
    const ext = data.photoMimetype.split('/')[1];
    const objectName = `lost-found/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    photoUrl = await uploadFile(objectName, data.photoBuffer, data.photoMimetype);
  }

  const item = await prisma.foundItemReport.create({
    data: {
      reportedBy: data.reportedBy,
      description: data.description,
      category: data.category,
      busNumber: data.busNumber,
      route: data.route,
      foundDate: data.foundDate,
      photoUrl,
      status: 'FOUND',
    },
  });

  await findMatchesForFoundItem(item.id, data.category, data.route, data.description);

  return item;
}

async function findMatchesForLostItem(lostItemId: string, category: ItemCategory, route: string, description: string) {
  const foundItems = await prisma.foundItemReport.findMany({
    where: { category, status: 'FOUND' },
  });

  for (const found of foundItems) {
    const score = calculateMatchScore(description, found.description, route, found.route);
    if (score >= 0.5) {
      await prisma.lostItemReport.update({
        where: { id: lostItemId },
        data: { status: 'MATCHED', matchedWith: found.id },
      });
      await prisma.foundItemReport.update({
        where: { id: found.id },
        data: { status: 'MATCHED' },
      });

      const lostItem = await prisma.lostItemReport.findUnique({ where: { id: lostItemId } });
      if (lostItem) {
        await createAndSendNotification({
          userId: lostItem.userId,
          type: 'lost_item_match',
          title: 'Kifaa chako kimepatikana / Item match found',
          message: `A found item matching your report may be yours: ${found.description.slice(0, 100)}`,
        }).catch(() => {});
      }
      break;
    }
  }
}

async function findMatchesForFoundItem(foundItemId: string, category: ItemCategory, route: string, description: string) {
  const lostItems = await prisma.lostItemReport.findMany({
    where: { category, status: 'REPORTED' },
  });

  for (const lost of lostItems) {
    const score = calculateMatchScore(description, lost.description, route, lost.route);
    if (score >= 0.5) {
      await prisma.foundItemReport.update({
        where: { id: foundItemId },
        data: { status: 'MATCHED' },
      });
      await prisma.lostItemReport.update({
        where: { id: lost.id },
        data: { status: 'MATCHED', matchedWith: foundItemId },
      });

      await createAndSendNotification({
        userId: lost.userId,
        type: 'lost_item_match',
        title: 'Kifaa chako kimepatikana / Item match found',
        message: `A found item matching your report may be yours: ${description.slice(0, 100)}`,
      }).catch(() => {});

      break;
    }
  }
}

function calculateMatchScore(desc1: string, desc2: string, route1: string, route2: string): number {
  let score = 0;
  const words1 = desc1.toLowerCase().split(/\s+/);
  const words2 = desc2.toLowerCase().split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));
  score += (commonWords.length / Math.max(words1.length, words2.length)) * 0.6;
  if (route1.toLowerCase() === route2.toLowerCase()) score += 0.4;
  return Math.min(score, 1);
}

export async function searchFoundItems(params: {
  route?: string;
  category?: ItemCategory;
  dateFrom?: Date;
  dateTo?: Date;
  keyword?: string;
  page?: number;
  limit?: number;
}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    status: { in: ['FOUND', 'MATCHED'] as ItemStatus[] },
    ...(params.route ? { route: { contains: params.route, mode: 'insensitive' as const } } : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(params.dateFrom || params.dateTo ? {
      foundDate: {
        ...(params.dateFrom ? { gte: params.dateFrom } : {}),
        ...(params.dateTo ? { lte: params.dateTo } : {}),
      },
    } : {}),
    ...(params.keyword ? { description: { contains: params.keyword, mode: 'insensitive' as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.foundItemReport.findMany({ where, orderBy: { foundDate: 'desc' }, skip, take: limit }),
    prisma.foundItemReport.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getFoundItem(id: string) {
  return prisma.foundItemReport.findUnique({ where: { id } });
}

export async function claimFoundItem(foundItemId: string, userId: string) {
  return prisma.foundItemReport.update({
    where: { id: foundItemId },
    data: { status: 'CLAIMED' as ItemStatus, claimedBy: userId },
  });
}

export async function reviewItem(itemId: string, action: 'approve' | 'reject') {
  const status: ItemStatus = action === 'approve' ? 'CLAIMED' : 'REMOVED';
  return prisma.foundItemReport.update({
    where: { id: itemId },
    data: { status },
  });
}

export async function autoUnclaimOldItems() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.foundItemReport.updateMany({
    where: {
      status: 'FOUND',
      createdAt: { lt: thirtyDaysAgo },
    },
    data: { status: 'UNCLAIMED' as ItemStatus },
  });
  return result.count;
}