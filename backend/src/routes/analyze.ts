import { Hono } from 'hono';
import { getSupabaseAdmin } from '../lib/supabase';
import { withAuth } from '../middleware/auth';
import { extractCharacterDna } from '../services/dna-extractor';

const analyze = new Hono();

// ─── POST /api/character/:id/analyze-dna ───
analyze.post('/character/:id/analyze-dna', withAuth, async (c) => {
  const userId = c.var.userId;
  const charId = c.req.param('id');
  const sb = getSupabaseAdmin();

  // Verify ownership
  const { data: char } = await sb
    .from('characters')
    .select('char_id, name')
    .eq('char_id', charId)
    .eq('user_id', userId)
    .single();

  if (!char) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Karakter tidak ditemukan' } }, 404);
  }

  // Check if there are uploaded images
  const { count: imgCount } = await sb
    .from('character_images')
    .select('*', { count: 'exact', head: true })
    .eq('char_id', charId)
    .eq('is_deleted', false);

  if (!imgCount || imgCount < 5) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `Minimal 5 foto diperlukan. Saat ini hanya ${imgCount || 0} foto. Upload ${5 - (imgCount || 0)} foto lagi.`,
      },
    }, 400);
  }

  // Process extraction
  const result = await extractCharacterDna(charId, userId);

  if (!result.success) {
    return c.json({
      success: false,
      error: { code: 'EXTRACTION_ERROR', message: result.error },
    }, 500);
  }

  return c.json({
    success: true,
    data: {
      char_id: charId,
      name: char.name,
      dna: result.dna,
    },
    meta: {
      next_step: 'Generate prompt menggunakan karakter ini',
    },
  });
});

// ─── GET /api/character/:id/dna ───
analyze.get('/character/:id/dna', withAuth, async (c) => {
  const userId = c.var.userId;
  const charId = c.req.param('id');

  const sb = getSupabaseAdmin();
  const { data: dna } = await sb
    .from('character_dna')
    .select('*')
    .eq('char_id', charId)
    .eq('is_current', true)
    .maybeSingle();

  if (!dna) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'DNA belum diekstrak. Lakukan analisis terlebih dahulu.' } }, 404);
  }

  // Build clean response
  return c.json({
    success: true,
    data: {
      dna_id: dna.dna_id,
      version: dna.version,
      is_current: dna.is_current,
      base: dna.base,
      face: dna.face,
      hair: dna.hair,
      body: dna.body,
      style: dna.style,
      expression: dna.expression,
      created_at: dna.created_at,
    },
  });
});

export default analyze;
