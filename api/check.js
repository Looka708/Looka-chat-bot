// Deep Diagnostic endpoint
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const allKeys = Object.keys(process.env);
    const openRouterKeys = allKeys.filter(k => k.toLowerCase().includes('openrouter'));

    return res.status(200).json({
        status: "Scanning Environment...",
        environmentVariableSet: !!process.env.OPENROUTER_API_KEY,
        foundOpenRouterKeys: openRouterKeys,
        allAvailableEnvVars: allKeys.filter(k => !k.includes('VERCEL') && !k.includes('AWS')), // Filter noise
        nodeVersion: process.version,
        tip: "If foundOpenRouterKeys is empty, the variable is missing from Vercel Settings -> Environment Variables.",
        timestamp: new Date().toISOString()
    });
};
