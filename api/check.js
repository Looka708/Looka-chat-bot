// Diagnostic endpoint to check if environment variable is set
// Visit /api/check to see if OPENROUTER_API_KEY is configured

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    // Don't expose the actual key, just check if it exists
    const status = {
        environmentVariableSet: !!apiKey,
        keyLength: apiKey ? apiKey.length : 0,
        keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET',
        allEnvVars: Object.keys(process.env).filter(k => k.includes('OPENROUTER') || k.includes('SUPABASE')),
        timestamp: new Date().toISOString()
    };

    return res.status(200).json(status);
};
