-- ===================== SEED: SCENE LIBRARY =====================
INSERT INTO scene_library (name, category, tier, icon, sort_order, prompt_hint, description)
VALUES
  ('Studio', 'studio', 'basic', '🎬', 1, 'clean studio background with soft lighting', 'Studio foto dengan background bersih'),
  ('Kamar', 'indoor', 'basic', '🛏️', 2, 'bedroom with natural lighting', 'Kamar tidur dengan pencahayaan alami'),
  ('Taman', 'outdoor', 'basic', '🌳', 3, 'garden with green background', 'Taman dengan background hijau'),
  ('Kantor', 'indoor', 'basic', '💼', 4, 'modern office interior', 'Kantor modern interior'),
  ('Jalanan', 'outdoor', 'basic', '🛣️', 5, 'urban street at daytime', 'Jalan perkotaan di siang hari'),
  ('Café', 'indoor', 'full', '☕', 6, 'cozy café interior with warm lighting', 'Kafe nyaman dengan lampu hangat'),
  ('Pantai', 'outdoor', 'full', '🏖️', 7, 'beach with ocean view', 'Pantai dengan pemandangan laut'),
  ('Butik', 'indoor', 'full', '👗', 8, 'fashion boutique with racks of clothes', 'Butik fashion dengan rak baju'),
  ('Mall', 'indoor', 'full', '🏬', 9, 'shopping mall interior with stores', 'Mal dengan toko-toko'),
  ('Gym', 'indoor', 'full', '🏋️', 10, 'modern gym with equipment', 'Gym modern dengan alat fitness'),
  ('Kolam Renang', 'outdoor', 'full', '🏊', 11, 'swimming pool with lounge chairs', 'Kolam renang dengan kursi santai'),
  ('Hutan', 'outdoor', 'full', '🌲', 12, 'forest with sunlight filtering through trees', 'Hutan dengan sinar matahari menembus pepohonan'),
  ('Gunung', 'outdoor', 'full', '⛰️', 13, 'mountain landscape with sky background', 'Gunung dengan langit cerah'),
  ('Panggung', 'indoor', 'full', '🎤', 14, 'stage with spotlights and audience', 'Panggung dengan lampu sorot'),
  ('Restoran', 'indoor', 'full', '🍽️', 15, 'elegant restaurant with dim lighting', 'Restoran elegan dengan lampu temaram')
ON CONFLICT DO NOTHING;

-- ===================== SEED: OUTFIT LIBRARY =====================
INSERT INTO outfit_library (name, category, gender, tier, icon, sort_order, prompt_hint, description)
VALUES
  ('Kaos Polos', 'casual', 'unisex', 'basic', '👕', 1, 'plain t-shirt', 'Kaos polos sederhana'),
  ('Kemeja', 'formal', 'unisex', 'basic', '👔', 2, 'button-up shirt', 'Kemeja formal'),
  ('Gaun Sederhana', 'formal', 'female', 'basic', '👗', 3, 'simple dress', 'Gaun sederhana'),
  ('Jaket', 'outerwear', 'unisex', 'basic', '🧥', 4, 'jacket worn over outfit', 'Jaket'),
  ('Batik', 'traditional', 'unisex', 'basic', '🦋', 5, 'batik patterned shirt', 'Batik tradisional'),
  ('Kemeja Flanel', 'casual', 'unisex', 'full', '👕', 6, 'flannel shirt', 'Kemeja flanel kasual'),
  ('Hoodie', 'casual', 'unisex', 'full', '🧥', 7, 'hoodie sweatshirt', 'Hoodie'),
  ('Blazer', 'formal', 'unisex', 'full', '🧥', 8, 'blazer jacket', 'Blazer formal'),
  ('Setelan Jas', 'formal', 'male', 'full', '🤵', 9, 'suit and tie', 'Setelan jas lengkap'),
  ('Gaun Malam', 'formal', 'female', 'full', '👗', 10, 'elegant evening gown', 'Gaun malam elegan'),
  ('Kebaya', 'traditional', 'female', 'full', '👘', 11, 'traditional kebaya', 'Kebaya tradisional'),
  ('Jas Tutup', 'traditional', 'male', 'full', '🧥', 12, 'traditional jas tutup', 'Jas tutup adat'),
  ('Baju Renang', 'swimwear', 'unisex', 'full', '🩱', 13, 'swimsuit', 'Baju renang'),
  ('Kostum Olahraga', 'sport', 'unisex', 'full', '🎽', 14, 'athletic sportswear', 'Pakaian olahraga'),
  ('Tank Top', 'casual', 'unisex', 'full', '🎽', 15, 'tank top', 'Tank top'),
  ('Cardigan', 'outerwear', 'unisex', 'full', '🧶', 16, 'cardigan sweater', 'Cardigan'),
  ('Jeans Jaket', 'outerwear', 'unisex', 'full', '🧥', 17, 'denim jacket', 'Jaket denim'),
  ('Tunik', 'casual', 'female', 'full', '👚', 18, 'tunic top', 'Tunik'),
  ('Polo', 'casual', 'unisex', 'full', '👕', 19, 'polo shirt', 'Kaos polo'),
  ('Sweater', 'casual', 'unisex', 'full', '🧶', 20, 'knit sweater', 'Sweater rajut')
ON CONFLICT DO NOTHING;
