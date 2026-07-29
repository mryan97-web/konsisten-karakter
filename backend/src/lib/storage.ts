import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../lib/supabase';

const BUCKET_NAME = 'character-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MIN_DIMENSION = 512;
const MIN_FILES = 5;
const MAX_FILES = 20;

export async function validateImage(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `Format ${file.type} tidak didukung. Gunakan JPG, PNG, atau WEBP` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File terlalu besar (max 5MB)` };
  }
  return { valid: true };
}

export async function uploadCharacterImage(
  userId: string,
  charId: string,
  file: Buffer,
  mimeType: string,
  sortOrder: number,
) {
  const sb = getSupabaseAdmin();

  // Generate unique path
  const ext = mimeType.split('/')[1] || 'jpg';
  const fileName = `photo_${sortOrder}_${crypto.randomUUID()}.${ext}`;
  const filePath = `${userId}/${charId}/original/${fileName}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await sb.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = sb.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  // Generate thumbnail URL (same file for now, resize nanti via worker)
  const thumbnailPath = `${userId}/${charId}/thumbnail/${fileName}`;
  const { data: thumbData, error: thumbError } = await sb.storage
    .from(BUCKET_NAME)
    .upload(thumbnailPath, file, {
      contentType: mimeType,
      upsert: false,
    });

  const { data: { publicUrl: thumbUrl } } = sb.storage
    .from(BUCKET_NAME)
    .getPublicUrl(thumbnailPath);

  // Insert record into character_images
  const { data: imageRecord, error: dbError } = await sb
    .from('character_images')
    .insert({
      char_id: charId,
      user_id: userId,
      blob_url: publicUrl,
      thumbnail_url: thumbUrl,
      file_type: ext,
      file_size: file.length,
      sort_order: sortOrder,
      moderation_status: 'pending',
    })
    .select('image_id, blob_url, thumbnail_url, file_type, sort_order')
    .single();

  if (dbError) {
    throw new Error(`DB insert failed: ${dbError.message}`);
  }

  return imageRecord;
}
