// Vercel Serverless Function (Node) - proxy to OpenRouter API
// This keeps your API key secure on the server side
// Set OPENROUTER_API_KEY in Vercel environment variables

module.exports = async function handler(req, res) {
  // CORS handling - restrict to your domain in production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Title');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not set in environment variables');
    return res.status(500).json({
      error: 'Server not configured. Please add OPENROUTER_API_KEY to Vercel environment variables.'
    });
  }

  try {
    const body = req.body;

    // Make request to OpenRouter
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': req.headers.referer || 'https://looka-ai.vercel.app',
        'X-Title': req.headers['x-title'] || 'Looka AI Assistant'
      },
      body: JSON.stringify(body)
    });

    // Get response text
    const text = await response.text();

    // Set content type for streaming
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');

    // Return response
    return res.status(response.status).send(text);

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({
      error: 'Proxy error',
      message: err.message
    });
  }
};
