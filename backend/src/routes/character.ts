import { Hono } from 'hono';
import { withAuth } from '../middleware/auth';
import { CharacterService } from '../services/character-service';
import { E } from '../shared/response';
import { ok, created } from '../shared/response';
import { validateCharacterName, validateGender } from '../shared/validators';
import { CreateCharacterRequest, UpdateCharacterRequest } from '../shared/types';
import { getSupabaseAdmin } from '../lib/supabase';

const character = new Hono();

// ─── POST /api/character ───
character.post('/', withAuth, async (c) => {
  const userId = c.var.userId;
  const user = c.var.user;
  const body: CreateCharacterRequest = await c.req.json();

  // Validate
  const nameErr = validateCharacterName(body.name);
  if (nameErr) return E.VALIDATION(nameErr);
  const genderErr = validateGender(body.gender);
  if (genderErr) return E.VALIDATION(genderErr);

  // Tier check
  const limit = await CharacterService.checkFreeTierLimit(userId, user.tier);
  if (limit.blocked) return E.TIER_LIMIT(limit.message!, 'pro');

  const sb = getSupabaseAdmin();
  const { data: char } = await sb
    .from('characters')
    .insert({
      user_id: userId,
      name: body.name.trim(),
      gender: body.gender || null,
      description: body.description || null,
      type: 'custom',
      share_mode: 'private',
    })
    .select('char_id, name, gender, type, share_mode, is_locked, created_at')
    .single();

  if (!char) return E.INTERNAL('Gagal membuat karakter');

  return created(char, { next_step: 'Upload foto', upload_url: `/api/character/${char.char_id}/upload` });
});

// ─── GET /api/character ───
character.get('/', withAuth, async (c) => {
  const userId = c.var.userId;
  const sb = getSupabaseAdmin();
  const { data: characters } = await sb
    .from('characters')
    .select('char_id, name, gender, type, share_mode, is_locked, prompt_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return ok(characters || [], { total: characters?.length || 0 });
});

// ─── GET /api/character/:id ───
character.get('/:id', withAuth, async (c) => {
  const userId = c.var.userId;
  const charId = c.req.param('id');

  const ownership = await CharacterService.verifyOwnership(charId, userId);
  if (!ownership) return E.NOT_FOUND('Karakter tidak ditemukan');

  const full = await CharacterService.getFullCharacter(charId);
  return ok(full);
});

// ─── PUT /api/character/:id ───
character.put('/:id', withAuth, async (c) => {
  const userId = c.var.userId;
  const charId = c.req.param('id');
  const body: UpdateCharacterRequest = await c.req.json();

  const ownership = await CharacterService.verifyOwnership(charId, userId);
  if (!ownership) return E.NOT_FOUND('Karakter tidak ditemukan');

  // Check lock
  const sb = getSupabaseAdmin();
  const { data: existing } = await sb
    .from('characters')
    .select('is_locked')
    .eq('char_id', charId)
    .eq('user_id', userId)
    .single();

  if (existing?.is_locked && (body.name !== undefined || body.gender !== undefined)) {
    return E.FORBIDDEN('Karakter sudah di-lock. Nama dan gender tidak bisa diubah.');
  }

  // Validate
  if (body.name !== undefined) {
    const nameErr = validateCharacterName(body.name);
    if (nameErr) return E.VALIDATION(nameErr);
  }
  if (body.gender !== undefined) {
    const genderErr = validateGender(body.gender);
    if (genderErr) return E.VALIDATION(genderErr);
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.gender !== undefined) updates.gender = body.gender;
  if (body.description !== undefined) updates.description = body.description;

  if (Object.keys(updates).length <= 1) {
    return E.VALIDATION('Tidak ada field yang diupdate');
  }

  const { data: updated } = await sb
    .from('characters')
    .update(updates)
    .eq('char_id', charId)
    .eq('user_id', userId)
    .select('char_id, name, gender, description, is_locked, updated_at')
    .single();

  if (!updated) return E.INTERNAL('Gagal mengupdate karakter');
  return ok(updated);
});

// ─── DELETE /api/character/:id ───
character.delete('/:id', withAuth, async (c) => {
  const userId = c.var.userId;
  const charId = c.req.param('id');

  const ownership = await CharacterService.verifyOwnership(charId, userId);
  if (!ownership) return E.NOT_FOUND('Karakter tidak ditemukan');

  const sb = getSupabaseAdmin();
  await sb.from('characters').delete().eq('char_id', charId).eq('user_id', userId);

  return ok({ message: `Karakter "${ownership.name}" berhasil dihapus`, char_id: charId });
});

export default character;
