import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

interface AuditEvent {
  userId?: string;
  action: string;
  resource: string;
  details?: string;
  ipAddress?: string;
}

export async function logAuditEvent(event: AuditEvent) {
  try {
    const entry = await prisma.auditLog.create({
      data: {
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        details: event.details,
        ipAddress: event.ipAddress,
      },
    });
    logger.info('Audit event', { action: event.action, userId: event.userId });
    return entry;
  } catch (err) {
    logger.error('Failed to write audit log', { error: (err as Error).message });
    throw err;
  }
}