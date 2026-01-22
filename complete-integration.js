// Complete Integration Script for Looka AI
// This file contains all the JavaScript needed for the complete chatbot

// ============================================
// 1. STATE MANAGEMENT
// ============================================
// Use global state from window.state (initialized in config.js)
var state = window.state;

// ============================================
// 2. HELPER FUNCTIONS
// ============================================
const elMessages = () => document.getElementById('chat-messages');
const elInput = () => document.getElementById('chat-input');
const elTyping = () => document.getElementById('typing');

function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    return str
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// Format message content to support code fences (```lang\ncode```) and inline code
function formatMessageContent(text) {
    if (!text) return '';

    // Escape HTML first
    let out = escapeHtml(text);

    // Inline code: `code`
    out = out.replace(/(^|[^`])`([^`\n]+)`(?!`)/g, (m, p1, code) => {
        return p1 + '<code class="inline-code">' + code.replace(/</g, '&lt;') + '</code>';
    });

    // Fenced code blocks: ```lang\ncode```
    out = out.replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
        const safeCode = escapeHtml(code);
        const language = lang || '';
        const languageLabel = language ? '<span class="code-lang">' + escapeHtml(language) + '</span>' : '';
        return `
            <div class="code-block">
                <div class="code-header">${languageLabel}<div class="code-actions"><button class="toggle-btn">Raw</button><button class="copy-btn">Copy</button></div></div>
                <pre><code class="language-${escapeHtml(language)}">${safeCode}</code></pre>
            </div>
        `;
    });

    // Wrap paragraphs
    return `<p class="message-text">${out.replace(/\n/g, '<br/>')}</p>`;
}

// Attach handlers (copy + toggle) to code blocks inside a container
function attachCodeBlockHandlers(container) {
    const root = container || document;
    const blocks = root.querySelectorAll('.code-block');

    blocks.forEach(block => {
        if (block._hasHandlers) return;
        block._hasHandlers = true;

        const copyBtn = block.querySelector('.copy-btn');
        const toggleBtn = block.querySelector('.toggle-btn');
        const pre = block.querySelector('pre');
        const codeEl = block.querySelector('pre > code');

        // COPY
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const text = pre ? (pre.textContent || pre.innerText || '') : '';
                try {
                    await navigator.clipboard.writeText(text);
                    copyBtn.textContent = 'Copied';
                    setTimeout(() => copyBtn.textContent = 'Copy', 1400);
                } catch (e) {
                    console.error('Copy failed', e);
                    copyBtn.textContent = 'Copy';
                }
            });
        }

        // TOGGLE Raw/Pretty
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const isRaw = !!block.querySelector('textarea.code-raw');
                if (isRaw) {
                    // switch to pretty
                    const ta = block.querySelector('textarea.code-raw');
                    const text = ta.value;
                    const langClass = codeEl ? codeEl.className || '' : '';
                    const newCode = document.createElement('code');
                    newCode.className = langClass;
                    newCode.textContent = text;
                    const newPre = document.createElement('pre');
                    newPre.appendChild(newCode);
                    ta.replaceWith(newPre);
                    if (window.Prism && typeof window.Prism.highlightElement === 'function') {
                        try { window.Prism.highlightElement(newCode); } catch (e) { /* ignore */ }
                    }
                    toggleBtn.textContent = 'Raw';
                } else {
                    // switch to raw textarea
                    const codeNode = block.querySelector('pre > code');
                    const text = codeNode ? (codeNode.textContent || codeNode.innerText || '') : '';
                    const ta = document.createElement('textarea');
                    ta.className = 'code-raw';
                    ta.readOnly = true;
                    ta.style.width = '100%';
                    ta.style.padding = '12px';
                    ta.style.background = '#050507';
                    ta.style.color = '#e6eef8';
                    ta.value = text;
                    const preNode = block.querySelector('pre');
                    if (preNode) preNode.replaceWith(ta);
                    toggleBtn.textContent = 'Pretty';
                }
            });
        }
    });
}

function scrollToBottom() {
    const box = elMessages();
    if (box) {
        box.scrollTop = box.scrollHeight;
    }
}

// ============================================
// 3. MESSAGE RENDERING
// ============================================
function renderMessage(role, content, ts) {
    const isUser = role === "user";
    const wrapper = document.createElement('div');
    wrapper.className = "flex items-start gap-3 message-enter " + (isUser ? "justify-end" : "");

    const avatar = document.createElement('div');
    avatar.className = (isUser
        ? "hidden sm:flex w-9 h-9 rounded-xl bg-white/5 border border-white/10 items-center justify-center text-neutral-300 shrink-0 order-2"
        : "w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0");

    avatar.innerHTML = isUser
        ? '<iconify-icon icon="solar:user-linear" width="1.2rem" height="1.2rem" style="--iconify-stroke-width:1.5;"></iconify-icon>'
        : '<img src="logo.svg" alt="Looka" class="w-5 h-5" />';

    const col = document.createElement('div');
    col.className = "max-w-2xl " + (isUser ? "order-1" : "");

    const bubble = document.createElement('div');
    bubble.className = (isUser
        ? "rounded-2xl px-4 py-3 border border-white/10 bg-white/5 message-bubble"
        : "glass-card rounded-2xl px-4 py-3 message-bubble");

    bubble.innerHTML = formatMessageContent(content) || `<p class="text-sm ${isUser ? 'text-white' : 'text-neutral-200'} leading-relaxed whitespace-pre-wrap">${escapeHtml(content)}</p>`;

    const meta = document.createElement('p');
    meta.className = "text-xs text-neutral-600 mt-2 " + (isUser ? "text-right" : "");
    meta.textContent = (isUser ? "You" : "Looka") + " • " + formatTime(ts);

    col.appendChild(bubble);
    col.appendChild(meta);
    wrapper.appendChild(avatar);
    wrapper.appendChild(col);

    elMessages().appendChild(wrapper);
    scrollToBottom();
    // Attach code-block handlers (copy + toggle) for any code blocks in this message
    attachCodeBlockHandlers(wrapper);

    // Run Prism highlighting for this message's code blocks (autoloader will fetch languages)
    if (window.Prism && typeof Prism.highlightAllUnder === 'function') {
        try { Prism.highlightAllUnder(wrapper); } catch (e) { /* ignore highlight errors */ }
    }
}

function setTyping(on) {
    const t = elTyping();
    if (!t) return;
    t.classList.toggle('hidden', !on);
}

// ============================================
// 4. FILE HANDLING
// ============================================
let uploadedFiles = [];

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function processUploadedFiles() {
    if (uploadedFiles.length === 0) return null;

    const fileData = [];

    for (const file of uploadedFiles) {
        if (file.type.startsWith('image/')) {
            const base64 = await fileToBase64(file);
            fileData.push({
                type: 'image',
                name: file.name,
                data: base64,
                mimeType: file.type
            });
        } else {
            try {
                const text = await file.text();
                fileData.push({
                    type: 'document',
                    name: file.name,
                    content: text.substring(0, 5000),
                    mimeType: file.type
                });
            } catch (error) {
                fileData.push({
                    type: 'file',
                    name: file.name,
                    size: file.size,
                    mimeType: file.type
                });
            }
        }
    }

    return fileData;
}

function handleFileUpload() {
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');

    if (!fileInput || !filePreview) return;

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        uploadedFiles = files;

        if (files.length > 0) {
            filePreview.classList.remove('hidden');
            filePreview.innerHTML = files.map((file, idx) => `
                <div class="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-xs file-badge">
                    <iconify-icon icon="solar:file-linear" width="1rem" height="1rem" class="text-blue-400"></iconify-icon>
                    <span class="text-white">${escapeHtml(file.name)}</span>
                    <button type="button" onclick="removeFile(${idx})" class="text-neutral-400 hover:text-white ml-1">
                        <iconify-icon icon="solar:close-circle-linear" width="0.9rem" height="0.9rem"></iconify-icon>
                    </button>
                </div>
            `).join('');
        } else {
            filePreview.classList.add('hidden');
        }
    });
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    const filePreview = document.getElementById('file-preview');
    const fileInput = document.getElementById('file-input');

    if (uploadedFiles.length === 0) {
        filePreview.classList.add('hidden');
        fileInput.value = '';
    } else {
        handleFileUpload();
    }
}

// ============================================
// 5. STREAMING ANIMATIONS
// ============================================
function showThinkingAnimation() {
    const messagesEl = elMessages();
    if (!messagesEl) return;

    const thinkingDiv = document.createElement('div');
    thinkingDiv.id = 'thinking-animation';
    thinkingDiv.className = 'flex items-start gap-3';
    thinkingDiv.innerHTML = `
        <div class="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
            <img src="logo.svg" alt="Looka" class="w-5 h-5" />
        </div>
        <div class="glass-card rounded-2xl px-4 py-3 max-w-2xl thinking-bubble">
            <div class="flex items-center gap-2">
                <div class="flex gap-1 thinking-dots">
                    <span class="w-2 h-2 bg-blue-400 rounded-full"></span>
                    <span class="w-2 h-2 bg-blue-400 rounded-full"></span>
                    <span class="w-2 h-2 bg-blue-400 rounded-full"></span>
                </div>
                <span class="text-sm text-neutral-400 ml-2">Thinking...</span>
            </div>
        </div>
    `;

    messagesEl.appendChild(thinkingDiv);
    scrollToBottom();
}

function hideThinkingAnimation() {
    const thinking = document.getElementById('thinking-animation');
    if (thinking) thinking.remove();
}

function createStreamingBubble() {
    const messagesEl = elMessages();
    if (!messagesEl) return null;

    const wrapper = document.createElement('div');
    wrapper.id = 'streaming-message';
    wrapper.className = 'flex items-start gap-3 message-enter';

    wrapper.innerHTML = `
        <div class="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
            <img src="logo.svg" alt="Looka" class="w-5 h-5" />
        </div>
        <div class="max-w-2xl">
            <div class="glass-card rounded-2xl px-4 py-3">
                <p id="streaming-text" class="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap"></p>
            </div>
            <p class="text-xs text-neutral-600 mt-2">Looka • now</p>
        </div>
    `;

    messagesEl.appendChild(wrapper);
    scrollToBottom();

    return document.getElementById('streaming-text');
}

function removeStreamingBubble() {
    const streaming = document.getElementById('streaming-message');
    if (streaming) streaming.remove();
}

// This function is still useful for initial greetings or simulated typing, 
// but we'll use actual streaming for API responses for better speed.
async function streamText(element, text, wordsPerChunk = 2, delay = 30) {
    if (!element) return;

    const words = text.split(' ');
    element.textContent = '';

    for (let i = 0; i < words.length; i += wordsPerChunk) {
        const chunk = words.slice(i, i + wordsPerChunk).join(' ') + ' ';
        element.textContent += chunk;
        scrollToBottom();
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

// ============================================
// 6. MAIN SEND MESSAGE FUNCTION
// ============================================
function getApiKey(model) {
    // Prefer keys in window.CONFIG, fall back to localStorage overrides
    try {
        if (window.CONFIG && window.CONFIG.API_KEYS) {
            const k = window.CONFIG.API_KEYS[model] || window.CONFIG.API_KEYS['default'];
            if (k) return k;
        }
        // LocalStorage override names (optional)
        const lsModelKey = localStorage.getItem(`LOOKA_KEY_${model}`);
        if (lsModelKey) return lsModelKey;
        const lsDefault = localStorage.getItem('LOOKA_KEY_DEFAULT');
        if (lsDefault) return lsDefault;
    } catch (e) {
        // ignore localStorage errors
    }
    return 'your_api_key_here';
}

function maskKey(key) {
    if (!key || typeof key !== 'string') return 'MISSING';
    if (key.length <= 12) return key.replace(/.(?=.{4})/g, '*');
    return key.slice(0, 8) + '...' + key.slice(-4);
}

// Expose a simple test helper to validate model auth and connectivity from the browser console.
async function testModelAuth(model) {
    const selected = model || document.getElementById('model-select')?.value || window.CONFIG?.AI_MODEL || 'z-ai/glm-4.5-air:free';
    const apiKey = getApiKey(selected);
    console.log('Testing model auth for', selected, 'using key', maskKey(apiKey));

    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ model: selected, messages: [{ role: 'user', content: 'Ping' }], max_tokens: 1, temperature: 0.0, stream: false })
        });

        let data;
        try { data = await res.json(); } catch (e) { data = await res.text(); }

        console.log('Test result status:', res.status, 'body:', data);
        return { status: res.status, body: data };
    } catch (err) {
        console.error('Network or CORS error during model test:', err);
        throw err;
    }
}

window.testModel = testModelAuth;

function getModelLimit(model) {
    if (!window.CONFIG || !window.CONFIG.MODEL_LIMITS) return 4096;
    return window.CONFIG.MODEL_LIMITS[model] || window.CONFIG.MODEL_LIMITS['default'] || 4096;
}

// Determine model capabilities (attachments, images)
function getModelCapabilities(model) {
    try {
        if (window.CONFIG && window.CONFIG.MODEL_CAPABILITIES) {
            return window.CONFIG.MODEL_CAPABILITIES[model] || window.CONFIG.MODEL_CAPABILITIES['default'] || { attachments: false, images: false };
        }
    } catch (e) {}
    // sensible defaults
    return { attachments: false, images: false };
}

function updateModelUI(model) {
    const caps = getModelCapabilities(model);
    const attachBtn = document.getElementById('attach-btn');
    const genBtn = document.getElementById('generate-image-btn');
    if (attachBtn) attachBtn.style.display = caps.attachments ? '' : 'none';
    if (genBtn) genBtn.style.display = caps.images ? '' : 'none';
}

async function sendMessage(e) {
    e.preventDefault();
    const ta = elInput();
    const text = (ta.value || "").trim();
    if (!text) return;

    // Process files
    const attachedFiles = await processUploadedFiles();

    let userMessageContent = text;
    if (attachedFiles && attachedFiles.length > 0) {
        userMessageContent += '\n\nAttached files:\n';
        attachedFiles.forEach(file => {
            if (file.type === 'image') userMessageContent += `📷 ${file.name}\n`;
            else if (file.type === 'document') userMessageContent += `📄 ${file.name}\n`;
            else userMessageContent += `📎 ${file.name}\n`;
        });
    }

    const now = Date.now();
    state.messages.push({ role: "user", content: userMessageContent, ts: now, files: attachedFiles });
    renderMessage("user", userMessageContent, now);

    ta.value = "";
    autoResize(ta);

    // Clear files
    uploadedFiles = [];
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    if (fileInput) fileInput.value = '';
    if (filePreview) filePreview.classList.add('hidden');

    showThinkingAnimation();
    setTyping(true);

    try {
        const apiMessages = [];
        const filteredMessages = state.messages.length > 1 && state.messages[0].role === 'assistant'
            ? state.messages.slice(1)
            : state.messages;

        for (const msg of filteredMessages) {
            if (msg.files && msg.files.length > 0) {
                const content = [];
                // Only add text block if there is content to avoid errors in some models
                if (msg.content.trim()) {
                    content.push({ type: "text", text: msg.content });
                }

                msg.files.forEach(file => {
                    if (file.type === 'image') {
                        content.push({
                            type: "image_url",
                            image_url: { url: file.data }
                        });
                    } else if (file.type === 'document' && file.content) {
                        // For documents, we still append to text if possible or handle accordingly
                        if (content.length > 0 && content[0].type === 'text') {
                            content[0].text += `\n\nDocument "${file.name}":\n${file.content}`;
                        } else {
                            content.push({ type: "text", text: `Document "${file.name}":\n${file.content}` });
                        }
                    }
                });
                apiMessages.push({ role: msg.role, content: content });
            } else {
                apiMessages.push({ role: msg.role, content: msg.content });
            }
        }

        const selectedModel = document.getElementById('model-select')?.value || window.CONFIG?.AI_MODEL || 'z-ai/glm-4.5-air:free';

        // Ensure we have a valid referer for local development
        const referer = window.location.href.startsWith('file') ? 'http://localhost:3000' : window.location.href;

        const body = JSON.stringify({
            model: selectedModel,
            messages: apiMessages,
            temperature: window.CONFIG?.TEMPERATURE || 0.7,
            max_tokens: getModelLimit(selectedModel),
            stream: true
        });

        console.log('Sending request to OpenRouter:', {
            model: selectedModel,
            messages: apiMessages
        });

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey(selectedModel)}`,
                'HTTP-Referer': referer,
                'X-Title': 'Looka AI Assistant'
            },
            body: body
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenRouter Error Full Object:', errorData);
            const msg = errorData.error?.message || errorData.error || 'Unknown API error';
            throw new Error(msg);
        }

        hideThinkingAnimation();
        const streamingElement = createStreamingBubble();
        let fullReply = "";

        // Read the stream with a buffer for robust line parsing
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // Keep the last partial line in the buffer
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    const data = trimmed.slice(6);
                    if (data === '[DONE]') break;

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content || "";
                        fullReply += content;

                        if (streamingElement) {
                            streamingElement.textContent = fullReply;
                            scrollToBottom();
                        }
                    } catch (e) {
                        // Ignore partial or malformed JSON chunks
                    }
                }
            }
        }

        removeStreamingBubble();

        const ts = Date.now();
        state.messages.push({ role: "assistant", content: fullReply, ts });
        renderMessage("assistant", fullReply, ts);

    } catch (error) {
        console.error('Error:', error);
        hideThinkingAnimation();

        const errorMsg = `Error: ${error.message}. Please check your connection and try again.`;
        const ts = Date.now();
        state.messages.push({ role: "assistant", content: errorMsg, ts });
        renderMessage("assistant", errorMsg, ts);
    } finally {
        setTyping(false);
        if (typeof saveCurrentChat === 'function') {
            saveCurrentChat();
        }
    }
}

// ============================================
// 7. UTILITY FUNCTIONS
// ============================================
function resetChat() {
    if (typeof createNewChat === 'function') {
        createNewChat();
    } else {
        state.currentChatId = null;
        state.messages = [
            { role: "assistant", content: "Hi — I'm Looka, your AI assistant. Ask me anything, upload files, or generate images!", ts: Date.now() }
        ];
        elMessages().innerHTML = "";
        renderMessage("assistant", state.messages[0].content, state.messages[0].ts);
        elInput().focus();
    }
}

function quickPrompt(text) {
    const ta = elInput();
    ta.value = text;
    autoResize(ta);
    ta.focus();
}

function downloadChat() {
    const lines = state.messages.map(m => {
        const who = m.role === "user" ? "You" : "Looka";
        return `[${formatTime(m.ts)}] ${who}: ${m.content}`;
    }).join("\n\n");

    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "looka-chat.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

async function generateImage() {
    const prompt = elInput().value.trim();
    if (!prompt) {
        elInput().value = "Generate an image of: ";
        elInput().focus();
        return;
    }

    const now = Date.now();
    const userMsg = `Generate image: ${prompt}`;
    state.messages.push({ role: "user", content: userMsg, ts: now });
    renderMessage("user", userMsg, now);

    elInput().value = "";
    setTyping(true);

    try {
        const selectedModel = document.getElementById('model-select')?.value || window.CONFIG?.AI_MODEL || 'z-ai/glm-4.5-air:free';
        const apiKey = getApiKey(selectedModel);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'Looka AI Assistant'
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [{
                    role: 'user',
                    content: `I'll create an image for you! Here's what I envision: ${prompt}\n\nNote: Image generation via API requires additional setup. For now, I can describe what the image would look like in detail.`
                }],
                temperature: 0.8,
                max_tokens: 1000
            })
        });

        if (!response.ok) throw new Error('Image generation request failed');

        const data = await response.json();
        const reply = data.choices[0].message.content;
        const ts = Date.now();
        state.messages.push({ role: "assistant", content: reply, ts });
        renderMessage("assistant", reply, ts);
    } catch (error) {
        console.error('Error:', error);
        const errorMsg = `Error generating image: ${error.message}`;
        const ts = Date.now();
        state.messages.push({ role: "assistant", content: errorMsg, ts });
        renderMessage("assistant", errorMsg, ts);
    } finally {
        setTyping(false);
    }
}

function autoResize(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = (el.scrollHeight) + "px";
}

// ============================================
// 8. INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    const ta = elInput();
    if (!ta) return;

    ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            document.getElementById("chat-form").requestSubmit();
        }
    });

    ta.addEventListener("input", () => autoResize(ta));
    autoResize(ta);

    handleFileUpload();

    // Initialize model UI based on capabilities and react to changes
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
        updateModelUI(modelSelect.value || window.CONFIG?.AI_MODEL);
        modelSelect.addEventListener('change', (e) => updateModelUI(e.target.value));
    }
});

console.log("✅ Looka AI Complete Integration Loaded!");
