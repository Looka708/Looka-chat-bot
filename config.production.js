// Looka AI Production Configuration
// This file is safe to deploy - no API keys stored here
// API keys are managed server-side via environment variables

const CONFIG = {
    // Configuration Version
    VERSION: '2.0.0',

    // API Keys - EMPTY in production (use proxy instead)
    API_KEYS: {
        'default': '' // No client-side keys in production
    },

    // Model capabilities
    MODEL_CAPABILITIES: {
        'meta-llama/llama-3.3-70b-instruct:free': { attachments: false, images: false },
        'z-ai/glm-4.5-air:free': { attachments: true, images: true },
        'deepseek/deepseek-r1-0528:free': { attachments: true, images: false },
        'meta-llama/llama-3.1-405b-instruct:free': { attachments: true, images: false },
        'qwen/qwen3-4b:free': { attachments: true, images: false },
        'mistralai/mistral-small-3.1-24b-instruct:free': { attachments: true, images: false },
        'meta-llama/llama-3.2-3b-instruct:free': { attachments: true, images: false },
        'google/gemma-3-4b-it:free': { attachments: true, images: false },
        'default': { attachments: false, images: false }
    },

    // Token limits per model
    MODEL_LIMITS: {
        'deepseek/deepseek-r1-0528:free': 32768,
        'meta-llama/llama-3.3-70b-instruct:free': 8192,
        'meta-llama/llama-3.1-405b-instruct:free': 8192,
        'meta-llama/llama-3.2-3b-instruct:free': 8192,
        'qwen/qwen3-4b:free': 8192,
        'mistralai/mistral-small-3.1-24b-instruct:free': 8192,
        'google/gemma-3-4b-it:free': 8192,
        'z-ai/glm-4.5-air:free': 8192,
        'default': 4096
    },

    // Supabase Configuration
    SUPABASE_URL: 'https://knfetctystmnbecbovbs.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_TAQFU3OARH-8jgq_aUVv4g_2qo2IRtF',

    // AI Model Settings
    AI_MODEL: 'deepseek/deepseek-r1-0528:free',
    TEMPERATURE: 0.7,

    // ⚠️ PRODUCTION MODE - ALWAYS USE PROXY
    USE_PROXY: true,  // ✅ Server-side API key management
    PROXY_URL: '/api/proxy',
};

// Make config available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;

    // Initialize global state if it doesn't exist
    window.state = window.state || {
        currentChatId: null,
        messages: [
            { role: "assistant", content: "Hi — I'm Looka, your AI assistant. Ask me anything, upload files, or generate images!", ts: Date.now() }
        ],
        chats: []
    };
}
