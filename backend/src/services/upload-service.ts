import { getSupabaseAdmin } from '../lib/supabase';
import { FileValidationResult, UploadResult, CharacterImageDto } from '../shared/types';
import { CONSTANTS } from '../shared/constants';
import { validateImageFile } from '../shared/validators';
import { CharacterService } from './character-service';

type UploadBatchResult = {
  uploaded: UploadResult[];
  errors: string[];
  totalImages: number;
};

/**
 * UploadService — single responsibility: file handling + storage
 */
export const UploadService = {
  /**
   * Validate all files in batch, return valid ones + errors.
   */
  validateBatch(files: File[]): { valid: File[]; errors: string[] } {
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const r = validateImageFile(file);
      if (r.valid) {
        valid.push(file);
      } else {
        errors.push(`${file.name}: ${r.error}`);
      }
    }

    return { valid, errors };
  },

  /**
   * Upload multiple files to Supabase Storage + insert DB records.
   * Used by BOTH authenticated upload and demo upload routes.
   * DRY: was duplicated in routes/upload.ts and routes/demo-char.ts.
   */
  async uploadBatch(
    files: File[],
    charId: string,
    userId: string | null,
    pathPrefix: string,
    existingCount: number,
  ): Promise<UploadBatchResult> {
    const sb = getSupabaseAdmin();
    const uploaded: UploadResult[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const order = existingCount + i + 1;
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.type.split('/')[1] || 'jpg';
      const fileName = `photo_${order}_${crypto.randomUUID()}.${ext}`;
      const filePath = `${pathPrefix}/${charId}/${fileName}`;

      const { error: uploadError } = await sb.storage
        .from('character-photos')
        .upload(filePath, buffer, { contentType: file.type, upsert: false });

      if (uploadError) {
        errors.push(`File ${order}: ${uploadError.message}`);
        continue;
      }

      const { data: { publicUrl } } = sb.storage.from('character-photos').getPublicUrl(filePath);

      const record: Partial<CharacterImageDto & { user_id?: string; char_id: string; blob_url: string; file_size: number; moderation_status: string }> = {
        char_id: charId,
        blob_url: publicUrl,
        file_type: ext,
        file_size: buffer.length,
        sort_order: order,
        moderation_status: 'pending',
      };
      if (userId) record.user_id = userId;

      const { data: inserted } = await sb
        .from('character_images')
        .insert(record)
        .select('image_id, blob_url, file_type, sort_order')
        .single();

      if (inserted) uploaded.push(inserted as UploadResult);
    }

    return {
      uploaded,
      errors,
      totalImages: existingCount + uploaded.length,
    };
  },
};
