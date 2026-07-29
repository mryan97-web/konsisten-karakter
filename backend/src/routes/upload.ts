import { Hono } from 'hono';
import { withAuth } from '../middleware/auth';
import { CharacterService } from '../services/character-service';
import { UploadService } from '../services/upload-service';
import { E, created } from '../shared/response';
import { CONSTANTS } from '../shared/constants';

const upload = new Hono();

// ─── POST /api/character/:id/upload ───
upload.post('/character/:id/upload', withAuth, async (c) => {
  const userId = c.var.userId;
  const charId = c.req.param('id');

  // Verify ownership
  const ownership = await CharacterService.verifyOwnership(charId, userId);
  if (!ownership) return E.NOT_FOUND('Karakter tidak ditemukan');

  // Parse form
  const formData = await c.req.formData();
  const files = formData.getAll('files') as File[];
  if (!files?.length) return E.VALIDATION('Tidak ada file yang diupload');

  // Check max limit
  const existingCount = await CharacterService.countImages(charId);
  if (existingCount + files.length > CONSTANTS.MAX_IMAGES) {
    return E.VALIDATION(`Maksimal ${CONSTANTS.MAX_IMAGES} foto per karakter. Saat ini sudah ${existingCount} foto.`);
  }

  // Validate batch
  const { valid, errors } = UploadService.validateBatch(files);
  if (errors.length > 0) return E.VALIDATION(errors.join('; '));

  // Check min 5
  if (existingCount + valid.length < CONSTANTS.MIN_IMAGES) {
    return E.VALIDATION(
      `Minimal ${CONSTANTS.MIN_IMAGES} foto. Saat ini ${existingCount + valid.length} foto. ` +
      `Upload ${Math.max(0, CONSTANTS.MIN_IMAGES - (existingCount + valid.length))} foto lagi.`
    );
  }

  // Upload batch (reused by demo-char too)
  const result = await UploadService.uploadBatch(valid, charId, userId, userId, existingCount);

  return created({
    uploaded: result.uploaded,
    total_images: result.totalImages,
    images_remaining: Math.max(0, CONSTANTS.MIN_IMAGES - result.totalImages),
    errors: result.errors.length > 0 ? result.errors : undefined,
  }, {
    next_step: result.errors.length === 0 ? 'Analisis DNA' : 'Upload ulang file yang gagal',
  });
});

export default upload;
