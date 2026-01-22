// Supabase Configuration - now loaded from config.js
const SUPABASE_URL = window.CONFIG?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.CONFIG?.SUPABASE_ANON_KEY;

// Reference global state (use var to avoid redeclaration errors across scripts)
var state = window.state;

let supabaseClient = null;

// Initialize Supabase
function initSupabase() {
    console.log('Initializing Supabase with URL:', SUPABASE_URL);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('your_supabase_url')) {
        console.warn('Supabase credentials missing or default in config.js');
        document.getElementById('chat-history').innerHTML =
            '<p class="text-xs text-neutral-600 text-center py-8">Supabase not configured. Check config.js</p>';
        return;
    }

    try {
        if (!window.supabase) {
            throw new Error('Supabase SDK not loaded. Check script tag in index.html');
        }
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client created successfully');
        loadChatHistory();
    } catch (error) {
        console.error('Supabase initialization failed:', error);
        document.getElementById('chat-history').innerHTML =
            `<p class="text-xs text-neutral-600 text-center py-8">Supabase Error: ${error.message}</p>`;
    }
}

// Load chat history from Supabase
async function loadChatHistory() {
    if (!supabaseClient) {
        console.warn('loadChatHistory called but supabaseClient is null');
        return;
    }

    try {
        console.log('Fetching chats from Supabase...');
        const { data, error } = await supabaseClient
            .from('chats')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        console.log('Successfully loaded chats:', data?.length || 0);
        state.chats = data || [];
        renderChatHistory();
    } catch (error) {
        console.error('Error loading chat history:', error);

        // If table missing in Supabase, show actionable guidance
        const errMsg = (error && error.message) ? error.message : String(error);
        if (errMsg.includes("Could not find the table") || errMsg.includes('PGRST205')) {
            document.getElementById('chat-history').innerHTML = `
                <div class="p-4 text-xs text-neutral-600 text-center">
                    <p class="mb-2">Supabase schema error: the <strong>chats</strong> table was not found.</p>
                    <p class="mb-2">Create a table named <code>chats</code> with columns: <code>id (uuid)</code>, <code>title (text)</code>, <code>messages (jsonb)</code>, <code>created_at</code>, <code>updated_at</code>.</p>
                    <p class="text-neutral-500">See your Supabase dashboard &gt; Table Editor. After creating the table refresh the page.</p>
                </div>
            `;
        } else {
            document.getElementById('chat-history').innerHTML =
                `<p class="text-xs text-neutral-600 text-center py-8">Unable to load chats: ${errMsg}</p>`;
        }
    }
}

// Render chat history in sidebar
function renderChatHistory() {
    const historyEl = document.getElementById('chat-history');

    if (state.chats.length === 0) {
        historyEl.innerHTML = '<p class="text-xs text-neutral-600 text-center py-8">No previous chats</p>';
        return;
    }

    historyEl.innerHTML = state.chats.map(chat => {
        const isActive = chat.id === state.currentChatId;
        const date = new Date(chat.updated_at);
        const timeAgo = getTimeAgo(date);

        return `
            <div onclick="loadChat('${chat.id}')" 
                class="group cursor-pointer px-3 py-2.5 rounded-lg border border-white/${isActive ? '20' : '10'} bg-${isActive ? 'blue-500/10' : 'black/20'} hover:bg-white/5 transition-colors">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm text-white font-medium truncate">${escapeHtml(chat.title)}</p>
                        <p class="text-xs text-neutral-500 mt-0.5">${timeAgo}</p>
                    </div>
                    <button onclick="event.stopPropagation(); deleteChat('${chat.id}')" 
                        class="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all">
                        <iconify-icon icon="solar:trash-bin-minimalistic-linear" width="0.9rem" height="0.9rem"></iconify-icon>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Create new chat
async function createNewChat() {
    console.log('Creating new chat session...');
    state.currentChatId = null;
    state.messages = [
        { role: "assistant", content: "Hi — I'm Looka, your AI assistant. Ask me anything, upload files, or generate images!", ts: Date.now() }
    ];

    const messagesEl = document.getElementById('chat-messages');
    if (messagesEl) {
        messagesEl.innerHTML = '';
        renderMessage("assistant", state.messages[0].content, state.messages[0].ts);
    }

    const inputEl = document.getElementById('chat-input');
    if (inputEl) inputEl.focus();

    renderChatHistory();
}

// Save current chat to Supabase
async function saveCurrentChat() {
    if (!supabaseClient) {
        console.warn('saveCurrentChat: Supabase not initialized');
        return;
    }

    if (state.messages.length <= 1) {
        console.log('saveCurrentChat: Only greeting in chat, skipping save');
        return;
    }

    try {
        console.log('Saving chat to Supabase...', state.currentChatId || 'NEW CHAT');

        // Generate title from first user message
        const firstUserMsg = state.messages.find(m => m.role === 'user');
        const title = firstUserMsg
            ? firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
            : 'New Chat';

        const chatData = {
            title,
            messages: state.messages,
            updated_at: new Date().toISOString()
        };

        if (state.currentChatId) {
            console.log('Updating existing chat:', state.currentChatId);
            const { error } = await supabaseClient
                .from('chats')
                .update(chatData)
                .eq('id', state.currentChatId);

            if (error) throw error;
            console.log('Update successful');
        } else {
            console.log('Inserting new chat...');
            const { data, error } = await supabaseClient
                .from('chats')
                .insert([chatData])
                .select()
                .single();

            if (error) throw error;
            console.log('Insert successful, new ID:', data.id);
            state.currentChatId = data.id;
        }

        await loadChatHistory();
    } catch (error) {
        console.error('Error saving chat:', error);
    }
}

// Load specific chat
async function loadChat(chatId) {
    if (!supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from('chats')
            .select('*')
            .eq('id', chatId)
            .single();

        if (error) throw error;

        state.currentChatId = data.id;
        state.messages = data.messages;

        // Re-render all messages
        const messagesEl = document.getElementById('chat-messages');
        messagesEl.innerHTML = '';
        state.messages.forEach(msg => {
            renderMessage(msg.role, msg.content, msg.ts);
        });

        renderChatHistory();
        scrollToBottom();
    } catch (error) {
        console.error('Error loading chat:', error);
    }
}

// Delete chat
async function deleteChat(chatId) {
    if (!supabaseClient || !confirm('Delete this chat?')) return;

    try {
        const { error } = await supabaseClient
            .from('chats')
            .delete()
            .eq('id', chatId);

        if (error) throw error;

        if (state.currentChatId === chatId) {
            createNewChat();
        } else {
            await loadChatHistory();
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
    }
}

// Helper function to get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
}

// Delete chats older than 7 days (client-side cleanup)
async function cleanupOldChats() {
    if (!supabaseClient) return;

    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { error } = await supabaseClient
            .from('chats')
            .delete()
            .lt('created_at', sevenDaysAgo.toISOString());

        if (error) throw error;
        console.log('Cleaned up old chats');
    } catch (error) {
        console.error('Error cleaning up old chats:', error);
    }
}

// Initialize on page load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        initSupabase();
        // Run cleanup daily
        setInterval(cleanupOldChats, 24 * 60 * 60 * 1000);
    });
}
