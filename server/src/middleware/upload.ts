import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

export const uploadSingle = upload.single('photo');
export const uploadMultiple = upload.array('attachments', 3);

/**
 * Magic-byte signatures for allowed image types.
 * Each entry maps a MIME type to one or more byte-pattern signatures.
 */
const SIGNATURES: Record<string, Uint8Array[]> = {
  'image/jpeg': [
    // JPEG always starts with FF D8 FF
    new Uint8Array([0xff, 0xd8, 0xff]),
  ],
  'image/png': [
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ],
  'image/webp': [
    // WebP: RIFF....WEBP
    // Bytes 0-3: RIFF, bytes 8-11: WEBP
    new Uint8Array([0x52, 0x49, 0x46, 0x46]), // RIFF at offset 0
  ],
};

/**
 * Validates that a file's actual content (magic bytes) matches its declared MIME type.
 * Must be called after multer has populated file.buffer.
 *
 * @param mimetype - The MIME type declared by the client (file.mimetype)
 * @param buffer   - The file content buffer
 * @returns true if the file signature matches the declared MIME type
 */
export function validateFileSignature(mimetype: string, buffer: Buffer): boolean {
  const signatures = SIGNATURES[mimetype];
  if (!signatures) return false;

  return signatures.some((sig) => {
    if (buffer.length < sig.length) return false;

    // Special handling for WebP: check "RIFF" at offset 0 and "WEBP" at offset 8
    if (mimetype === 'image/webp') {
      const riff = buffer.subarray(0, 4);
      const webp = buffer.subarray(8, 12);
      return (
        riff[0] === 0x52 && riff[1] === 0x49 && riff[2] === 0x46 && riff[3] === 0x46 &&
        webp[0] === 0x57 && webp[1] === 0x45 && webp[2] === 0x42 && webp[3] === 0x50
      );
    }

    // For JPEG and PNG, check the signature bytes at the start
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) return false;
    }
    return true;
  });
}