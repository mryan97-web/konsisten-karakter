import { Hono } from 'hono';
import { withAuth } from '../middleware/auth';
import { CharacterService } from '../services/character-service';
import { extractCharacterDna } from '../services/dna-extractor';
import { E, ok } from '../shared/response';
import { CONSTANTS } from '../shared/constants';

const analyze = new Hono();

// ─── POST /api/character/:id/analyze-dna ───
analyze.post('/character/:id/analyze-dna', withAuth, async (c) => {
  const userId = c.var.userId;
  const charId = c.req.param('id');

  // Verify ownership
  const ownership = await CharacterService.verifyOwnership(charId, userId);
  if (!ownership) return E.NOT_FOUND('Karakter tidak ditemukan');

  // Check image count
  const imgCount = await CharacterService.countImages(charId);
  if (imgCount < CONSTANTS.MIN_IMAGES) {
    return E.VALIDATION(
      `Minimal ${CONSTANTS.MIN_IMAGES} foto diperlukan. Saat ini ${imgCount} foto. Upload ${CONSTANTS.MIN_IMAGES - imgCount} foto lagi.`
    );
  }

  // Extract DNA
  const result = await extractCharacterDna(charId, userId);
  if (!result.success) return E.VALIDATION(result.error!);

  return ok({
    char_id: charId,
    name: ownership.name,
    dna: result.dna,
  }, { next_step: 'Generate prompt menggunakan karakter ini' });
});

// ─── GET /api/character/:id/dna ───
analyze.get('/character/:id/dna', withAuth, async (c) => {
  const userId = c.var.userId;
  const charId = c.req.param('id');

  const ownership = await CharacterService.verifyOwnership(charId, userId);
  if (!ownership) return E.NOT_FOUND('Karakter tidak ditemukan');

  const full = await CharacterService.getFullCharacter(charId);
  if (!full.dna) return E.NOT_FOUND('DNA belum diekstrak. Lakukan analisis terlebih dahulu.');

  return ok(full.dna);
});

export default analyze;
