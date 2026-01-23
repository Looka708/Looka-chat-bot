// Vercel Serverless Function (Node) - simple proxy to OpenRouter
// Put this file at /api/proxy.js
// Set environment var OPENROUTER_API_KEY in Vercel to your OpenRouter key
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Lightweight CORS handling: restrict in production to your domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server not configured' });

  try {
    const body = req.body;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    // Passthrough response
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err) {
    console.error('proxy error', err);
    res.status(500).json({ error: 'Proxy error' });
  }
}