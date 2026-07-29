import { Hono } from 'hono';
import { getSupabaseAdmin } from '../lib/supabase';
import { withAuth } from '../middleware/auth';
import { validateImage } from '../lib/storage';

const upload = new Hono();

// ─── POST /api/character/:id/upload ───
upload.post('/character/:id/upload', withAuth, async (c) => {
  const userId = c.var.userId;
  const charId = c.req.param('id');
  const sb = getSupabaseAdmin();

  // Verify ownership
  const { data: char } = await sb
    .from('characters')
    .select('char_id, is_locked')
    .eq('char_id', charId)
    .eq('user_id', userId)
    .single();

  if (!char) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Karakter tidak ditemukan' } }, 404);
  }

  // Handle multipart form data
  const formData = await c.req.formData();
  const files = formData.getAll('files') as File[];
  const angleValues = formData.getAll('angle') as string[];

  // Basic validation
  if (!files || files.length === 0) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Tidak ada file yang diupload' } }, 400);
  }

  // Check existing count
  const { count: existingCount } = await sb
    .from('character_images')
    .select('*', { count: 'exact', head: true })
    .eq('char_id', charId)
    .eq('is_deleted', false);

  const totalAfter = (existingCount || 0) + files.length;
  if (totalAfter > 20) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: `Maksimal 20 foto per karakter. Saat ini sudah ${existingCount || 0} foto.` } }, 400);
  }

  // Validate each file
  const errors: string[] = [];
  const validFiles: { file: File; order: number; angle: string | null }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const validation = await validateImage(file);
    if (!validation.valid) {
      errors.push(`File ${i + 1}: ${validation.error}`);
    } else {
      validFiles.push({
        file,
        order: (existingCount || 0) + i + 1,
        angle: angleValues[i] || null,
      });
    }
  }

  if (errors.length > 0) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: errors.join('; ') } }, 400);
  }

  if ((existingCount || 0) + validFiles.length < 5) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `Minimal 5 foto. Saat ini ${existingCount || 0 + validFiles.length} foto. Upload ${Math.max(0, 5 - ((existingCount || 0) + validFiles.length))} foto lagi.`,
      },
    }, 400);
  }

  // Upload files
  const uploaded: any[] = [];
  for (const vf of validFiles) {
    const buffer = Buffer.from(await vf.file.arrayBuffer());
    const ext = vf.file.type.split('/')[1] || 'jpg';
    const fileName = `photo_${vf.order}_${crypto.randomUUID()}.${ext}`;
    const filePath = `${userId}/${charId}/${fileName}`;

    // Upload original
    const { error: uploadError } = await sb.storage
      .from('character-photos')
      .upload(filePath, buffer, { contentType: vf.file.type, upsert: false });

    if (uploadError) {
      errors.push(`File ${vf.order}: gagal upload (${uploadError.message})`);
      continue;
    }

    const { data: { publicUrl } } = sb.storage.from('character-photos').getPublicUrl(filePath);

    // Insert record
    const { data: record } = await sb
      .from('character_images')
      .insert({
        char_id: charId,
        user_id: userId,
        blob_url: publicUrl,
        thumbnail_url: publicUrl, // Sementara sama, nanti di-optimize worker
        file_type: ext,
        file_size: buffer.length,
        sort_order: vf.order,
        angle: vf.angle,
        moderation_status: 'pending',
      })
      .select('image_id, blob_url, thumbnail_url, file_type, sort_order')
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
    meta: {
      next_step: errors.length === 0 ? 'Analisis DNA' : 'Upload ulang file yang gagal',
    },
  }, 201);
});

export default upload;
