import { getSupabaseAdmin } from '../lib/supabase';
import { CharacterDto, CharacterImageDto, DnaDto } from '../shared/types';
import { CONSTANTS } from '../shared/constants';

type OwnershipCheck = {
  char_id: string;
  name?: string;
};

/**
 * CharacterService — single responsibility: character CRUD + ownership
 */
export const CharacterService = {
  /**
   * Verify a character belongs to a user.
   * Used by EVERY protected route — DRY.
   */
  async verifyOwnership(charId: string, userId: string): Promise<OwnershipCheck | null> {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from('characters')
      .select('char_id, name')
      .eq('char_id', charId)
      .eq('user_id', userId)
      .single();
    return data;
  },

  /**
   * Get character + images + DNA in one call.
   * Replaces 3 separate queries in character detail + demo-char routes.
   */
  async getFullCharacter(charId: string): Promise<CharacterDto & { images: CharacterImageDto[]; dna: DnaDto | null }> {
    const sb = getSupabaseAdmin();

    const [charResult, imagesData, dnaData] = await Promise.all([
      sb
        .from('characters')
        .select('*')
        .eq('char_id', charId)
        .single(),
      sb
        .from('character_images')
        .select('image_id, blob_url, thumbnail_url, file_type, sort_order')
        .eq('char_id', charId)
        .eq('is_deleted', false)
        .order('sort_order'),
      sb
        .from('character_dna')
        .select('*')
        .eq('char_id', charId)
        .eq('is_current', true)
        .maybeSingle(),
    ]);

    return {
      ...charResult.data!,
      images: imagesData.data || [],
      dna: dnaData.data as DnaDto | null,
    } as unknown as CharacterDto & { images: CharacterImageDto[]; dna: DnaDto | null };
  },

  /**
   * Count existing images for a character.
   */
  async countImages(charId: string): Promise<number> {
    const sb = getSupabaseAdmin();
    const { count } = await sb
      .from('character_images')
      .select('*', { count: 'exact', head: true })
      .eq('char_id', charId)
      .eq('is_deleted', false);
    return count || 0;
  },

  /**
   * Check if user has hit free tier limit.
   */
  async checkFreeTierLimit(userId: string, tier: string): Promise<{ blocked: boolean; message?: string }> {
    if (tier !== 'free') return { blocked: false };

    const sb = getSupabaseAdmin();
    const { count } = await sb
      .from('characters')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count && count >= CONSTANTS.FREE_MAX_CHARACTERS) {
      return {
        blocked: true,
        message: `Free tier hanya bisa membuat ${CONSTANTS.FREE_MAX_CHARACTERS} karakter. Upgrade ke Pro untuk karakter tak terbatas.`,
      };
    }
    return { blocked: false };
  },
};
