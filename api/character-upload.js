// Character Upload & Management API
// Handles character reference photo uploads + character descriptor extraction

import { put } from '@vercel/blob';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, mimeType, characterName, action } = req.body;

    // Validate
    if (!image || !characterName || !action) {
      return res.status(400).json({ error: 'Missing image, characterName, or action' });
    }

    if (!['upload', 'extract'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use upload or extract' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(image, 'base64');
    const filename = `characters/${Date.now()}-${characterName}.jpg`;

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: mimeType || 'image/jpeg',
    });

    if (action === 'upload') {
      return res.json({
        success: true,
        blobUrl: blob.url,
        filename: blob.pathname,
      });
    }

    // If action === 'extract', analyze the image with Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured' });

    const extractPrompt = `Analisis foto referensi karakter ini dan buat deskriptor detail. Jawab dalam JSON dengan struktur:

{
  "face": {
    "shape": "bentuk wajah (oval, round, square, heart, dll)",
    "skin": "warna & tekstur kulit",
    "features": "fitur wajah penting (mata, hidung, bibir, dll)"
  },
  "hair": {
    "color": "warna rambut",
    "length": "panjang rambut",
    "texture": "tekstur rambut (lurus, curly, wavy)",
    "style": "gaya rambut"
  },
  "body": {
    "type": "tipe body (slim, athletic, curvy, dll)",
    "height_estimate": "estimasi tinggi",
    "posture": "postur tubuh"
  },
  "outfit": {
    "clothing": "deskripsi pakaian yang terlihat",
    "accessories": "aksesori yang terlihat",
    "style": "gaya fashion"
  },
  "expression": {
    "mood": "mood/expression",
    "eyes": "deskripsi mata",
    "smile": "jenis senyuman"
  },
  "makeup": "makeup yang terlihat (jika ada)",
  "summary": "ringkasan karakter 1-2 kalimat"
}`;

    const payload = {
      contents: [{
        parts: [
          { text: extractPrompt },
          {
            inline_data: {
              mime_type: mimeType || 'image/jpeg',
              data: image,
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0.3,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('Gemini error:', err);
      return res.status(502).json({ error: 'Gemini API error', detail: err });
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON
    let descriptor;
    try {
      const jsonMatch = text.match(/```(?:json)?\\s*([\\s\\S]*?)```/);
      if (jsonMatch) {
        descriptor = JSON.parse(jsonMatch[1]);
      } else {
        descriptor = { raw: text };
      }
    } catch {
      descriptor = { raw: text };
    }

    res.json({
      success: true,
      blobUrl: blob.url,
      descriptor,
      raw: text,
    });

  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: err.message });
  }
}
