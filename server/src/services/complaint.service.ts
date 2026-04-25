import { prisma } from '../lib/prisma';
import { createAndSendNotification } from './notification.service';
import { NOTIFICATION_TYPES } from '@zartsa/shared';
import type { ComplaintCategory, ComplaintStatus, CreateComplaintInput, UpdateStatusInput } from '@zartsa/shared';

function generateReferenceNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CMP-${timestamp}-${random}`;
}

export async function createComplaint(data: CreateComplaintInput & { userId?: string; attachments?: string[] }) {
  const referenceNumber = generateReferenceNumber();

  return prisma.complaint.create({
    data: {
      referenceNumber,
      userId: data.userId ?? null,
      vehiclePlate: data.vehiclePlate,
      route: data.route,
      incidentDate: new Date(data.incidentDate),
      category: data.category,
      description: data.description,
      attachments: data.attachments ?? [],
      status: 'RECEIVED',
    },
  });
}

export async function getComplaintByReference(referenceNumber: string) {
  return prisma.complaint.findUnique({
    where: { referenceNumber },
  });
}

export async function getUserComplaints(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = { userId };

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.complaint.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getAllComplaints(params?: {
  status?: ComplaintStatus;
  category?: ComplaintCategory;
  page?: number;
  limit?: number;
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.category ? { category: params.category } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.complaint.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function updateComplaintStatus(id: string, data: UpdateStatusInput) {
  const updateData: {
    status: ComplaintStatus;
    resolution?: string;
    resolvedAt?: Date;
  } = {
    status: data.status as ComplaintStatus,
  };

  if (data.resolution) {
    updateData.resolution = data.resolution;
  }

  if (data.status === 'RESOLVED') {
    updateData.resolvedAt = new Date();
  }

  const complaint = await prisma.complaint.update({
    where: { id },
    data: updateData,
  });

  // Notify the complainant if userId exists
  if (complaint.userId) {
    await createAndSendNotification({
      userId: complaint.userId,
      type: NOTIFICATION_TYPES.COMPLAINT_STATUS_UPDATE,
      title: 'Complaint Status Update',
      message: `Your complaint ${complaint.referenceNumber} has been updated to ${data.status}.`,
    }).catch(() => { /* Don't fail status update if notification fails */ });
  }

  return complaint;
}

export async function assignComplaint(id: string, assignedTo: string) {
  return prisma.complaint.update({
    where: { id },
    data: {
      assignedTo,
      status: 'UNDER_REVIEW',
    },
  });
}

export async function exportComplaintsCsv(params?: {
  status?: ComplaintStatus;
  category?: ComplaintCategory;
}) {
  const where = {
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.category ? { category: params.category } : {}),
  };

  const complaints = await prisma.complaint.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'referenceNumber',
    'userId',
    'vehiclePlate',
    'route',
    'incidentDate',
    'category',
    'description',
    'status',
    'assignedTo',
    'resolution',
    'resolvedAt',
    'createdAt',
  ];

  const rows = complaints.map((c) =>
    headers
      .map((h) => {
        const val = c[h as keyof typeof c];
        if (val === null || val === undefined) return '';
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      })
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}