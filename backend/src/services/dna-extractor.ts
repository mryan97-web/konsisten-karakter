import { getSupabaseAdmin } from '../lib/supabase';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';

export type DnaExtractionResult = {
  success: boolean;
  dna?: {
    base: Record<string, any>;
    face: Record<string, any>;
    hair: Record<string, any>;
    body: Record<string, any>;
    style: Record<string, any>;
    expression: Record<string, any>;
    raw_ai_output: string;
  };
  error?: string;
};

/**
 * Analyze character images using Gemini Vision and extract Character DNA
 */
export async function extractCharacterDna(
  charId: string,
  userId: string,
): Promise<DnaExtractionResult> {
  const sb = getSupabaseAdmin();

  // 1. Get character info
  const { data: char } = await sb
    .from('characters')
    .select('name, gender, description')
    .eq('char_id', charId)
    .eq('user_id', userId)
    .single();

  if (!char) {
    return { success: false, error: 'Karakter tidak ditemukan' };
  }

  // 2. Get uploaded images
  const { data: images } = await sb
    .from('character_images')
    .select('blob_url, file_type, angle')
    .eq('char_id', charId)
    .eq('is_deleted', false)
    .order('sort_order');

  if (!images || images.length < 5) {
    return { success: false, error: 'Minimal 5 foto diperlukan untuk analisis DNA' };
  }

  // 3. Download images and prepare for Gemini
  const imageParts: { inlineData: { mimeType: string; data: string } }[] = [];
  for (const img of images) {
    try {
      const resp = await fetch(img.blob_url);
      if (!resp.ok) continue;
      const buffer = Buffer.from(await resp.arrayBuffer());
      const base64 = buffer.toString('base64');
      const mimeType = img.file_type === 'png' ? 'image/png' : img.file_type === 'webp' ? 'image/webp' : 'image/jpeg';
      imageParts.push({
        inlineData: { mimeType, data: base64 },
      });
      if (imageParts.length >= 10) break; // Max 10 images per request
    } catch {
      continue;
    }
  }

  if (imageParts.length < 3) {
    return { success: false, error: 'Gagal memproses foto. Pastikan file dapat diakses.' };
  }

  // 4. Build prompt
  const genderLabel = char.gender || 'unknown';
  const charName = char.name;
  const charDesc = char.description || '(no description)';

  const systemPrompt = `Anda adalah AI karakter ekstraktor. Tugas Anda adalah menganalisis foto seseorang dan mengekstrak "Character DNA" — data struktural yang memungkinkan AI image generator menghasilkan ulang karakter yang SAMA secara konsisten.

Analisis secara detail dan berstruktur. Respons HARUS dalam format JSON valid tanpa markdown formatting atau backticks.

Karakter: ${charName}
Gender: ${genderLabel}
Deskripsi: ${charDesc}

{
  "base": {
    "gender": "${genderLabel}",
    "age_range": "estimated_age_or_range",
    "ethnicity": "deskripsi etnis/skin tone",
    "body_type": "slim/average/athletic/curvy",
    "height_impression": "pendek/sedang/tinggi",
    "distinctive_features": ["fitur1", "fitur2"]
  },
  "face": {
    "face_shape": "oval/round/square/heart/diamond/long",
    "skin_tone": "fair/light/medium/olive/tan/dark dengan undertone",
    "skin_texture": "smooth/porcelain/glowing/matte",
    "forehead": "tinggi/sedang/rendah/lebar",
    "eyebrows": {
      "shape": "arched/straight/rounded/angled",
      "thickness": "thin/medium/thick/bushy",
      "color": "warna alis"
    },
    "eyes": {
      "shape": "almond/round/monolid/hooded/downturned",
      "size": "small/medium/large",
      "color": "warna mata",
      "spacing": "close-set/average/wide-set",
      "lash_length": "pendek/sedang/panjang"
    },
    "nose": {
      "shape": "button/straight/aquiline/flat/wide",
      "size": "small/medium/large",
      "bridge": "low/medium/high"
    },
    "lips": {
      "shape": "thin/medium/full/uneven",
      "upper_lip": "thin/medium/full",
      "lower_lip": "thin/medium/full",
      "lip_color_natural": "deskripsi warna natural"
    },
    "jawline": "sharp/rounded/square/soft/defined",
    "chin": "pointed/rounded/square/dimpled",
    "cheekbones": "low/prominent/high/defined",
    "ears": "small/medium/large/close-to-head"
  },
  "hair": {
    "color": "warna rambut dominan dengan highlight jika ada",
    "length": "botak/pendek/sebahu/medium/panjang/sangat panjang",
    "texture": "lurus/bergelombang/keriting/ikal/sangat keriting",
    "style": "gaya rambut (layer/poni/bob/swept/etc)",
    "hairline": "straight/rounded/receding/widows_peak",
    "parting": "tengah/samping/tidak ada/gaya acak",
    "condition": "sehat/berkilau/kering/rusak"
  },
  "body": {
    "neck": "pendek/sedang/panjang/langsing",
    "shoulders": "sempit/sedang/lebar/tegap",
    "arms": "langsing/sedang/berotot",
    "hands": "kecil/sedang/besar/ramping",
    "waist": "sempit/sedang/lebar/terdefinisi",
    "hips": "sempit/sedang/lebar",
    "legs": "panjang/sedang/pendek/langsing/berotot",
    "posture": "tegap/membungkuk/relaks/elegan",
    "skin_details": ["detail1", "detail2"]  
  },
  "style": {
    "fashion_vibe": "casual/elegant/sporty/edgy/minimalist/bohemian",
    "common_colors": ["warna1", "warna2", "warna3"],
    "accessories": ["aksesoris1", "aksesoris2"],
    "makeup_style": "natural/full/no makeup/glam",
    "makeup_focus": ["focus1", "focus2"],
    "nail_style": "natural/pendek/sedang/panjang/polos/warna"
  },
  "expression": {
    "default_mood": "neutral/happy/serious/thoughtful/calm",
    "smile_type": "subtle/broad/no_smile/closed_lip",
    "eye_expression": "friendly/intense/soft/warm/neutral",
    "common_expression_tendencies": ["tendensi1", "tendensi2"]
  }
}

Berikan estimasi akurat berdasarkan foto yang diberikan. Jika ada detail yang tidak terlihat jelas dari foto, isi dengan estimasi terbaik dan akhiri dengan "(estimated)". Jangan gunakan markdown dalam output.`;

  // ─── 5. Call Gemini API with timeout + retry ───
  try {
    if (!GEMINI_API_KEY) {
      return { success: false, error: 'GEMINI_API_KEY tidak dikonfigurasi' };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            ...imageParts.slice(0, 5),
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    };

    // Retry loop: max 3 attempts
    let lastError: string = 'Gagal setelah 3 percobaan';
    let success = false;
    let text = '';
    let durationMs = 0;
    let raw = '';

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt > 1) {
        // Exponential backoff: 2s, 4s
        const waitMs = 2000 * Math.pow(2, attempt - 2);
        await new Promise(r => setTimeout(r, waitMs));
      }

      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30s timeout

      try {
        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        durationMs = Date.now() - startTime;
        clearTimeout(timeoutId);

        raw = await geminiRes.text();

        if (!geminiRes.ok) {
          lastError = `Gemini API error (${geminiRes.status}): ${raw.slice(0, 200)}`;

          // 429 = rate limited → retry; 4xx non-429 = no retry
          if (geminiRes.status !== 429 && geminiRes.status >= 400 && geminiRes.status < 500) {
            break;
          }
          continue;
        }

        const data = JSON.parse(raw);
        text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!text) {
          lastError = 'AI mengembalikan response kosong';
          continue;
        }

        success = true;
        break;
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        durationMs = Date.now() - startTime;

        if (fetchErr.name === 'AbortError') {
          lastError = `Gemini timeout setelah 30 detik (attempt ${attempt}/3)`;
        } else {
          lastError = `Network error (attempt ${attempt}/3): ${fetchErr.message}`;
        }
      }
    }

    if (!success) {
      // Log failed attempt ke DB untuk debugging
      await sb.from('ai_usage').insert({
        user_id: userId,
        job_type: 'dna_extraction',
        model: GEMINI_MODEL,
        images_analyzed: imageParts.length,
        duration_ms: durationMs,
        estimated_cost_usd: 0,
      }).maybeSingle();

      return { success: false, error: lastError };
    }

    // 6. Parse JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    // Clean up any non-JSON prefix
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonStr);

    // 7. Structure the DNA
    const dna = {
      base: parsed.base || { gender: genderLabel },
      face: parsed.face || {},
      hair: parsed.hair || {},
      body: parsed.body || {},
      style: parsed.style || {},
      expression: parsed.expression || {},
      raw_ai_output: text.slice(0, 2000), // Store truncated raw response
    };

    // 8. Save to database
    // Set previous versions to not current
    await sb
      .from('character_dna')
      .update({ is_current: false })
      .eq('char_id', charId)
      .eq('is_current', true);

    // Insert new DNA
    const { data: dnaRecord } = await sb
      .from('character_dna')
      .insert({
        char_id: charId,
        version: 1, // Will auto-increment on subsequent analyses
        is_current: true,
        base: dna.base,
        face: dna.face,
        hair: dna.hair,
        body: dna.body,
        style: dna.style,
        expression: dna.expression,
        raw_ai_output: dna.raw_ai_output,
      })
      .select('dna_id, version')
      .single();

    // 9. Log AI usage
    await sb.from('ai_usage').insert({
      user_id: userId,
      job_type: 'dna_extraction',
      model: GEMINI_MODEL,
      images_analyzed: imageParts.length,
      estimated_cost_usd: imageParts.length * 0.002, // Rough estimate
      duration_ms: durationMs,
    });

    return {
      success: true,
      dna: {
        base: dna.base,
        face: dna.face,
        hair: dna.hair,
        body: dna.body,
        style: dna.style,
        expression: dna.expression,
        raw_ai_output: text.slice(0, 500),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Gagal menganalisis DNA: ${err.message}`,
    };
  }
}
