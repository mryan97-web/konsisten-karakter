// QRIS Payment API
// Generate QRIS code dan track payment status

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user_id, user_email, tier, amount, period_days } = req.body;

  try {
    if (!user_id || !tier || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // TODO: In production, integrate with QRIS provider (e.g., Xendit, Midtrans)
    // For now, generate a placeholder QRIS code
    const qrisCode = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

    // Store payment record (in production, use database)
    const paymentRecord = {
      order_id: orderId,
      user_id,
      user_email,
      tier,
      amount,
      period_days,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min expiry
    };

    // TODO: Store in database
    // For demo, store in memory (won't persist across restarts)
    global.pendingPayments = global.pendingPayments || {};
    global.pendingPayments[orderId] = paymentRecord;

    return res.json({
      success: true,
      order_id: orderId,
      qris_code: qrisCode,
      amount,
      tier,
      message: 'Silakan scan QRIS untuk melanjutkan pembayaran',
    });
  } catch (err) {
    console.error('Payment error:', err);
    return res.status(500).json({ error: err.message });
  }
}
