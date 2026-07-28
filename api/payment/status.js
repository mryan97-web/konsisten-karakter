// Payment Status Check API
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { order_id } = req.query;

  try {
    if (!order_id) {
      return res.status(400).json({ error: 'order_id required' });
    }

    // TODO: In production, check with payment provider (Xendit, Midtrans)
    // For demo, check in-memory store
    const payment = global.pendingPayments?.[order_id];

    if (!payment) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // TODO: In production, query actual payment provider
    // For demo, simulate payment after 10 seconds
    const now = new Date();
    const createdAt = new Date(payment.created_at);
    const secondsElapsed = (now - createdAt) / 1000;

    let status = 'pending';
    if (secondsElapsed > 10) {
      status = 'paid'; // Simulate successful payment after 10s
    }

    const response = {
      status,
      order_id,
      amount: payment.amount,
      tier: payment.tier,
    };

    if (status === 'paid') {
      // Generate subscription record
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + payment.period_days);

      response.subscription = {
        user_id: payment.user_id,
        tier: payment.tier,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        period_days: payment.period_days,
      };

      // Clean up
      delete global.pendingPayments[order_id];
    }

    return res.json(response);
  } catch (err) {
    console.error('Status check error:', err);
    return res.status(500).json({ error: err.message });
  }
}
