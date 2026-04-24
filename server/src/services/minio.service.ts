// server/src/services/minio.service.ts
import * as Minio from 'minio';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let minioClient: Minio.Client;

export function getMinio(): Minio.Client {
  if (!minioClient) {
    minioClient = new Minio.Client({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.NODE_ENV === 'production',
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
  }
  return minioClient;
}

export async function ensureBucket(bucket?: string): Promise<void> {
  const bucketName = bucket ?? env.MINIO_BUCKET;
  const exists = await getMinio().bucketExists(bucketName);
  if (!exists) {
    await getMinio().makeBucket(bucketName);
    logger.info(`Created MinIO bucket: ${bucketName}`);
  }
}

export async function uploadFile(
  objectName: string,
  buffer: Buffer,
  contentType: string,
  bucket?: string
): Promise<string> {
  const bucketName = bucket ?? env.MINIO_BUCKET;
  await ensureBucket(bucketName);
  await getMinio().putObject(bucketName, objectName, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return objectName;
}

export async function getFileUrl(objectName: string, bucket?: string): Promise<string> {
  const bucketName = bucket ?? env.MINIO_BUCKET;
  return await getMinio().presignedGetObject(bucketName, objectName, 60 * 60);
}

export async function deleteFile(objectName: string, bucket?: string): Promise<void> {
  const bucketName = bucket ?? env.MINIO_BUCKET;
  await getMinio().removeObject(bucketName, objectName);
}