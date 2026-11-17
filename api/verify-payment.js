export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ verified: false, error: 'Method not allowed' });
  }

  const { transaction_id, plan } = req.body || {};
  const secretKey = process.env.FLW_SECRET_KEY;

  if (!transaction_id) {
    return res.status(400).json({ verified: false, error: 'Missing transaction ID' });
  }

  // Allow test verification if FLW_SECRET_KEY is not configured yet
  if (!secretKey) {
    return res.status(200).json({
      verified: true,
      mode: 'sandbox',
      plan: plan || 'monthly',
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    });
  }

  try {
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transaction_id)}/verify`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (result.status === 'success' && result.data && result.data.status === 'successful') {
      const durations = {
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
        yearly: 365 * 24 * 60 * 60 * 1000
      };

      return res.status(200).json({
        verified: true,
        txRef: result.data.tx_ref,
        amount: result.data.amount,
        currency: result.data.currency,
        expiresAt: Date.now() + (durations[plan] || durations.monthly)
      });
    }

    return res.status(400).json({ verified: false, error: 'Payment not confirmed' });
  } catch (err) {
    return res.status(500).json({ verified: false, error: 'Verification server error' });
  }
}
