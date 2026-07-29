import { Hono } from 'hono';
import { getSupabaseAdmin } from '../lib/supabase';
import { withDemo } from '../middleware/demo';
import { validateImage } from '../lib/storage';
import { extractCharacterDna } from '../services/dna-extractor';

const demoChar = new Hono();

// ─── GET /api/demo/char ───
demoChar.get('/char', withDemo, async (c) => {
  const demo = c.var.demoUser!;
  const sb = getSupabaseAdmin();

  const { data: char } = await sb
    .from('characters')
    .select('char_id, name, gender, type, description, is_locked, prompt_count, created_at')
    .eq('char_id', demo.char_id)
    .single();

  if (!char) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Demo karakter tidak ditemukan' } }, 404);
  }

  const { data: images } = await sb
    .from('character_images')
    .select('image_id, blob_url, thumbnail_url, file_type, sort_order')
    .eq('char_id', demo.char_id)
    .eq('is_deleted', false)
    .order('sort_order');

  const { data: dna } = await sb
    .from('character_dna')
    .select('*')
    .eq('char_id', demo.char_id)
    .eq('is_current', true)
    .maybeSingle();

  return c.json({
    success: true,
    data: {
      ...char,
      images: images || [],
      dna: dna || null,
      prompt_count: demo.prompt_count,
      prompts_remaining: 3 - demo.prompt_count,
    },
  });
});

// ─── POST /api/demo/char/upload ───
demoChar.post('/char/upload', withDemo, async (c) => {
  const demo = c.var.demoUser!;
  const charId = demo.char_id;
  const sb = getSupabaseAdmin();

  const { data: char } = await sb
    .from('characters')
    .select('char_id')
    .eq('char_id', charId)
    .single();

  if (!char) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Demo karakter tidak ditemukan' } }, 404);
  }

  const formData = await c.req.formData();
  const files = formData.getAll('files') as File[];

  if (!files || files.length === 0) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Tidak ada file' } }, 400);
  }

  const { count: existingCount } = await sb
    .from('character_images')
    .select('*', { count: 'exact', head: true })
    .eq('char_id', charId)
    .eq('is_deleted', false);

  const totalAfter = (existingCount || 0) + files.length;
  if (totalAfter > 20) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Max 20 foto' } }, 400);
  }

  const errors: string[] = [];
  const uploaded: any[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const validation = await validateImage(file);
    if (!validation.valid) {
      errors.push(`File ${i + 1}: ${validation.error}`);
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split('/')[1] || 'jpg';
    const order = (existingCount || 0) + i + 1;
    const fileName = `demo_${order}_${crypto.randomUUID()}.${ext}`;
    const filePath = `demo/${charId}/${fileName}`;

    const { error: uploadError } = await sb.storage
      .from('character-photos')
      .upload(filePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      errors.push(`File ${order}: ${uploadError.message}`);
      continue;
    }

    const { data: { publicUrl } } = sb.storage.from('character-photos').getPublicUrl(filePath);

    const { data: record } = await sb
      .from('character_images')
      .insert({
        char_id: charId,
        blob_url: publicUrl,
        file_type: ext,
        file_size: buffer.length,
        sort_order: order,
        moderation_status: 'pending',
      })
      .select('image_id, blob_url, file_type, sort_order')
      .single();

    if (record) uploaded.push(record);
  }

  return c.json({
    success: true,
    data: {
      uploaded,
      total_images: (existingCount || 0) + uploaded.length,
      images_remaining: Math.max(0, 5 - ((existingCount || 0) + uploaded.length)),
      errors: errors.length > 0 ? errors : undefined,
    },
  }, 201);
});

// ─── POST /api/demo/char/analyze-dna ───
demoChar.post('/char/analyze-dna', withDemo, async (c) => {
  const demo = c.var.demoUser!;

  // Check prompt limit
  if (demo.prompt_count >= 3) {
    return c.json({
      success: false,
      error: {
        code: 'DEMO_LIMIT',
        message: 'Batas demo tercapai (3 prompt). Daftar akun gratis untuk akses penuh.',
      },
    }, 403);
  }

  const sb = getSupabaseAdmin();
  const { count: imgCount } = await sb
    .from('character_images')
    .select('*', { count: 'exact', head: true })
    .eq('char_id', demo.char_id)
    .eq('is_deleted', false);

  if (!imgCount || imgCount < 5) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `Minimal 5 foto. Saat ini ${imgCount || 0} foto.`,
      },
    }, 400);
  }

  const result = await extractCharacterDna(demo.char_id, '');

  if (!result.success) {
    return c.json({ success: false, error: { code: 'EXTRACTION_ERROR', message: result.error } }, 500);
  }

  // Increment prompt count
  await sb.from('demo_sessions')
    .update({ prompt_count: demo.prompt_count + 1 })
    .eq('session_id', demo.session_id);

  return c.json({
    success: true,
    data: {
      char_id: demo.char_id,
      dna: result.dna,
      prompts_remaining: 2 - demo.prompt_count,
    },
  });
});

export default demoChar;
