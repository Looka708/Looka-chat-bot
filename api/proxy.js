// Vercel Serverless Function (Node) - proxy to OpenRouter API
// This keeps your API key secure on the server side

module.exports = async function handler(req, res) {
  // CORS handling
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Title');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not set in Vercel' });
  }

  try {
    const body = req.body;

    // Using native fetch (Node 18+)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': req.headers.referer || 'https://looka-ai.vercel.app',
        'X-Title': 'Looka AI Assistant'
      },
      body: JSON.stringify(body)
    });

    const text = await response.text();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    return res.status(response.status).send(text);

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Proxy error', message: err.message });
  }
};
