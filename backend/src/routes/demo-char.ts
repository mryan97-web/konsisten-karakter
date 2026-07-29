import { Hono } from 'hono';
import { getSupabaseAdmin } from '../lib/supabase';
import { withDemo } from '../middleware/demo';
import { CharacterService } from '../services/character-service';
import { UploadService } from '../services/upload-service';
import { extractCharacterDna } from '../services/dna-extractor';
import { E, ok, created } from '../shared/response';
import { CONSTANTS } from '../shared/constants';

const demoChar = new Hono();

// ─── GET /api/demo/char ───
demoChar.get('/char', withDemo, async (c) => {
  const demo = c.var.demoUser!;
  const full = await CharacterService.getFullCharacter(demo.char_id);

  return ok({
    ...full,
    prompt_count: demo.prompt_count,
    prompts_remaining: CONSTANTS.DEMO_MAX_PROMPTS - demo.prompt_count,
  });
});

// ─── POST /api/demo/char/upload ───
demoChar.post('/char/upload', withDemo, async (c) => {
  const demo = c.var.demoUser!;
  const charId = demo.char_id;

  // Parse form
  const formData = await c.req.formData();
  const files = formData.getAll('files') as File[];
  if (!files?.length) return E.VALIDATION('Tidak ada file');

  // Check max
  const existingCount = await CharacterService.countImages(charId);
  if (existingCount + files.length > CONSTANTS.MAX_IMAGES) {
    return E.VALIDATION(`Max ${CONSTANTS.MAX_IMAGES} foto. Saat ini ${existingCount} foto.`);
  }

  // Validate batch
  const { valid, errors } = UploadService.validateBatch(files);
  if (errors.length > 0) return E.VALIDATION(errors.join('; '));

  // Check min 5
  if (existingCount + valid.length < CONSTANTS.MIN_IMAGES) {
    return E.VALIDATION(`${CONSTANTS.MIN_IMAGES - (existingCount + valid.length)} foto lagi minimal.`);
  }

  // Upload batch — reuse same service, different path prefix
  const result = await UploadService.uploadBatch(valid, charId, null, 'demo', existingCount);

  return created({
    uploaded: result.uploaded,
    total_images: result.totalImages,
    images_remaining: Math.max(0, CONSTANTS.MIN_IMAGES - result.totalImages),
    errors: result.errors.length > 0 ? result.errors : undefined,
  });
});

// ─── POST /api/demo/char/analyze-dna ───
demoChar.post('/char/analyze-dna', withDemo, async (c) => {
  const demo = c.var.demoUser!;

  // Check prompt limit
  if (demo.prompt_count >= CONSTANTS.DEMO_MAX_PROMPTS) {
    return E.DEMO_LIMIT('Batas demo tercapai (3 prompt). Daftar akun gratis untuk akses penuh.');
  }

  // Check image count
  const imgCount = await CharacterService.countImages(demo.char_id);
  if (imgCount < CONSTANTS.MIN_IMAGES) {
    return E.VALIDATION(`Minimal ${CONSTANTS.MIN_IMAGES} foto. Saat ini ${imgCount} foto.`);
  }

  // Extract DNA (empty userId for demo)
  const result = await extractCharacterDna(demo.char_id, '');
  if (!result.success) return E.VALIDATION(result.error!);

  // Increment prompt count
  const sb = getSupabaseAdmin();
  await sb.from('demo_sessions')
    .update({ prompt_count: demo.prompt_count + 1 })
    .eq('session_id', demo.session_id);

  return ok({
    char_id: demo.char_id,
    dna: result.dna,
    prompts_remaining: CONSTANTS.DEMO_MAX_PROMPTS - demo.prompt_count - 1,
  });
});

export default demoChar;
