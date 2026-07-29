import { Hono } from 'hono';
import { getSupabase, getSupabaseAdmin } from '../lib/supabase';
import { withAuth } from '../middleware/auth';

const character = new Hono();

// ─── POST /api/character ───
character.post('/', withAuth, async (c) => {
  const userId = c.var.userId;
  const user = c.var.user;
  const { name, gender, description, height_cm, weight_kg, notes } = await c.req.json();

  // Validation
  if (!name || name.trim().length === 0) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Nama karakter wajib diisi' } }, 400);
  }
  if (name.length > 100) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Nama karakter maksimal 100 karakter' } }, 400);
  }
  if (gender && !['Laki-laki', 'Perempuan'].includes(gender)) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Gender harus Laki-laki atau Perempuan' } }, 400);
  }

  // Tier check: Free = max 1 character
  const sb = getSupabaseAdmin();
  if (user.tier === 'free') {
    const { count } = await sb
      .from('characters')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count && count >= 1) {
      return c.json({
        success: false,
        error: {
          code: 'TIER_LIMIT',
          message: 'Free tier hanya bisa membuat 1 karakter. Upgrade ke Pro untuk karakter tak terbatas.',
          details: { current_tier: 'free', required_tier: 'pro' },
        },
      }, 403);
    }
  }

  // Create character
  const { data: char, error } = await sb
    .from('characters')
    .insert({
      user_id: userId,
      name: name.trim(),
      gender: gender || null,
      description: description || null,
      type: 'custom',
      share_mode: 'private',
    })
    .select('char_id, name, gender, type, share_mode, is_locked, created_at')
    .single();

  if (error) {
    console.error('Create character error:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Gagal membuat karakter' } }, 500);
  }

  return c.json({
    success: true,
    data: char,
    meta: {
      next_step: 'Upload foto',
      upload_url: `/api/character/${char.char_id}/upload`,
    },
  }, 201);
});

// ─── GET /api/character ───
character.get('/', withAuth, async (c) => {
  const userId = c.var.userId;

  const sb = getSupabase();
  const { data: characters, error } = await sb
    .from('characters')
    .select('char_id, name, gender, type, share_mode, is_locked, prompt_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('List characters error:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Gagal memuat karakter' } }, 500);
  }

  return c.json({
    success: true,
    data: characters || [],
    meta: { total: characters?.length || 0 },
  });
});

// ─── GET /api/character/:id ───
character.get('/:id', withAuth, async (c) => {
  const userId = c.var.userId;
  const charId = c.req.param('id');

  const sb = getSupabase();
  const { data: char, error } = await sb
    .from('characters')
    .select(`
      char_id, name, gender, type, description, share_mode, share_code,
      is_locked, locked_at, prompt_count, created_at, updated_at
    `)
    .eq('char_id', charId)
    .eq('user_id', userId)
    .single();

  if (error || !char) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Karakter tidak ditemukan' } }, 404);
  }

  // Load DNA if exists
  const { data: dna } = await sb
    .from('character_dna')
    .select('*')
    .eq('char_id', charId)
    .eq('is_current', true)
    .maybeSingle();

  // Load images (non-deleted)
  const { data: images } = await sb
    .from('character_images')
    .select('image_id, blob_url, thumbnail_url, file_type, sort_order')
    .eq('char_id', charId)
    .eq('is_deleted', false)
    .order('sort_order');

  return c.json({
    success: true,
    data: {
      ...char,
      dna: dna || null,
      images: images || [],
    },
  });
});

// ─── PUT /api/character/:id ───
character.put('/:id', withAuth, async (c) => {
  const userId = c.var.userId;
  const charId = c.req.param('id');
  const { name, gender, description } = await c.req.json();

  // Validate ownership
  const sb = getSupabaseAdmin();
  const { data: existing } = await sb
    .from('characters')
    .select('char_id, is_locked')
    .eq('char_id', charId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Karakter tidak ditemukan' } }, 404);
  }

  // Cannot edit locked character name/gender (identity field)
  if (existing.is_locked && (name !== undefined || gender !== undefined)) {
    return c.json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Karakter sudah di-lock. Nama dan gender tidak bisa diubah. Upgrade deskripsi masih bisa.',
      },
    }, 403);
  }

  // Build update payload
  const updates: Record<string, any> = {};
  if (name !== undefined) {
    if (!name.trim()) return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Nama tidak boleh kosong' } }, 400);
    updates.name = name.trim();
  }
  if (gender !== undefined) {
    if (!['Laki-laki', 'Perempuan'].includes(gender)) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Gender harus Laki-laki atau Perempuan' } }, 400);
    }
    updates.gender = gender;
  }
  if (description !== undefined) {
    updates.description = description;
  }
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length <= 1) { // only updated_at
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Tidak ada field yang diupdate' } }, 400);
  }

  const { data: updated, error } = await sb
    .from('characters')
    .update(updates)
    .eq('char_id', charId)
    .eq('user_id', userId)
    .select('char_id, name, gender, description, is_locked, updated_at')
    .single();

  if (error) {
    console.error('Update character error:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Gagal mengupdate karakter' } }, 500);
  }

  return c.json({ success: true, data: updated });
});

// ─── DELETE /api/character/:id ───
character.delete('/:id', withAuth, async (c) => {
  const userId = c.var.userId;
  const charId = c.req.param('id');

  // Check ownership + get image URLs for cleanup
  const sb = getSupabaseAdmin();
  const { data: existing } = await sb
    .from('characters')
    .select('char_id, name')
    .eq('char_id', charId)
    .eq('user_id', userId)
    .single();

  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Karakter tidak ditemukan' } }, 404);
  }

  // Cascade delete — images, dna, shares akan kehapus otomatis via FK CASCADE
  const { error } = await sb
    .from('characters')
    .delete()
    .eq('char_id', charId)
    .eq('user_id', userId);

  if (error) {
    console.error('Delete character error:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Gagal menghapus karakter' } }, 500);
  }

  return c.json({
    success: true,
    data: {
      message: `Karakter "${existing.name}" berhasil dihapus`,
      char_id: charId,
    },
  });
});

export default character;
