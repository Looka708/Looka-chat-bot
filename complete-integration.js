// Complete Integration Script for Looka AI
// This file contains all the JavaScript needed for the complete chatbot
// Key changes in this version:
// - Dynamic Prettier loader + beautifier (fixes single-line AI code blocks)
// - Re-runs Prism highlighting after beautify
// - No custom referer header to avoid CORS preflight problems
// - Optional serverless proxy support (USE_PROXY / PROXY_URL in window.CONFIG)

// ============================================
// 1. STATE MANAGEMENT
// ============================================
var state = window.state || { currentChatId: null, messages: [] };

// ============================================
// 2. HELPERS
// ============================================
const elMessages = () => document.getElementById('chat-messages');
const elInput = () => document.getElementById('chat-input');
const elTyping = () => document.getElementById('typing');

function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ============================================
// 2.a Prettier loader & prettifier utilities
//    (dynamically loads Prettier + parsers when needed)
// ============================================
async function loadPrettierIfNeeded() {
    if (window.prettier && typeof window.prettier.format === 'function') return;
    if (loadPrettierIfNeeded._loading) return loadPrettierIfNeeded._loading;
    loadPrettierIfNeeded._loading = (async () => {
        const base = 'https://cdn.jsdelivr.net/npm/prettier@2.8.8';
        const scripts = [
            `${base}/standalone.js`,
            `${base}/parser-babel.js`,
            `${base}/parser-typescript.js`,
            `${base}/parser-postcss.js`,
            `${base}/parser-html.js`,
            `${base}/parser-markdown.js`
        ];
        for (const src of scripts) {
            await new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = src;
                s.async = false;
                s.onload = () => resolve();
                s.onerror = (e) => {
                    console.warn('Failed to load:', src, e);
                    // resolve anyway so site continues — we'll fallback if Prettier missing
                    resolve();
                };
                document.head.appendChild(s);
            });
        }
    })();
    return loadPrettierIfNeeded._loading;
}

// synchronous heuristics fallback (kept lightweight)
function tryPrettyPrintFallback(language, code) {
    if (!code || typeof code !== 'string') return null;
    const lang = (language || '').toLowerCase();

    // JSON
    if (lang === 'json') {
        try { return JSON.stringify(JSON.parse(code), null, 2); } catch (e) {}
    }

    // HTML / XML
    if (lang === 'html' || lang === 'xml') {
        try {
            let s = code.replace(/>\s*</g, '>\n<');
            const lines = s.split('\n').map(l => l.trim()).filter(Boolean);
            let indent = 0;
            const out = [];
            lines.forEach(line => {
                if (/^<\/\w/.test(line)) indent = Math.max(0, indent - 1);
                out.push('  '.repeat(indent) + line);
                if (/^<\w[^>]*[^\/]>$/.test(line) && !/^<!(?:--)/.test(line)) indent++;
            });
            return out.join('\n');
        } catch (e) {}
    }

    // CSS
    if (lang === 'css') {
        try {
            let s = code.replace(/\s*{\s*/g, ' {\n').replace(/\s*}\s*/g, '\n}\n').replace(/;\s*/g, ';\n');
            const lines = s.split('\n').map(l => l.trim()).filter(Boolean);
            let indent = 0;
            const out = [];
            lines.forEach(line => {
                if (line === '}') indent = Math.max(0, indent - 1);
                out.push('  '.repeat(indent) + line);
                if (line.endsWith('{')) indent++;
            });
            return out.join('\n');
        } catch (e) {}
    }

    // JS/TS heuristic
    if (/^(js|javascript|ts|typescript|jsx|tsx)$/.test(lang)) {
        try {
            let s = code.replace(/\s+/g, ' ').trim();
            s = s.replace(/\s*{\s*/g, ' {\n').replace(/\s*}\s*/g, '\n}\n').replace(/\s*;\s*/g, ';\n');
            const lines = s.split('\n').map(l => l.trim()).filter(Boolean);
            let indent = 0;
            const out = [];
            lines.forEach(line => {
                if (line.startsWith('}')) indent = Math.max(0, indent - 1);
                out.push('  '.repeat(indent) + line);
                if (line.endsWith('{')) indent++;
            });
            return out.join('\n');
        } catch (e) {}
    }

    // fallback long single-line split
    if (!code.includes('\n') && code.length > 200) {
        let s = code.replace(/;\s*/g, ';\n').replace(/,\s*/g, ',\n');
        const lines = s.split('\n').map(l => l.trim()).filter(Boolean);
        return lines.join('\n');
    }

    return null;
}

// async pretty-printer that prefers Prettier and falls back
async function tryPrettyPrintAsync(language, code) {
    if (!code || typeof code !== 'string') return null;
    try {
        await loadPrettierIfNeeded();
        if (window.prettier && typeof window.prettier.format === 'function') {
            let parser = 'babel';
            const lang = (language || '').toLowerCase();
            if (lang === 'json') parser = 'json';
            else if (lang === 'html' || lang === 'xml') parser = 'html';
            else if (lang === 'css' || lang === 'scss' || lang === 'less') parser = 'css';
            else if (lang === 'ts' || lang === 'typescript' || lang === 'tsx') parser = 'typescript';
            else if (lang === 'md' || lang === 'markdown') parser = 'markdown';
            try {
                const plugins = window.prettierPlugins || [];
                return window.prettier.format(code, { parser, plugins, semi: true, singleQuote: false });
            } catch (e) {
                console.debug('Prettier formatting failed, falling back to heuristics', e);
            }
        }
    } catch (e) {
        console.debug('Prettier load failed', e);
    }
    return tryPrettyPrintFallback(language, code);
}

// escape helper for text nodes (used when assigning textContent)
function setCodeTextSafe(codeNode, text) {
    if (!codeNode) return;
    codeNode.textContent = text;
}

// ============================================
// 2.b Message formatting (inline + fenced code)
// ============================================
// NEW ASYNC VERSION - detects fenced blocks AND loose code messages
async function formatMessageContentAsync(text) {
    if (!text) return '';

    // Helper: basic heuristic to decide whether an entire message is likely code
    function looksLikeCode(s) {
        if (!s || typeof s !== 'string') return false;
        // If it already contains fenced code, treat as code only inside fences
        if (/```[\s\S]*?```/.test(s)) return false;
        const codeIndicators = [
            /\bimport\s+[A-Za-z0-9_.]+/i,
            /\bfrom\s+[A-Za-z0-9_.]+\s+import\b/i,
            /\bdef\s+[A-Za-z0-9_]+\s*\(/i,
            /\bclass\s+[A-Za-z0-9_]+\b/i,
            /=>|->|\bfunction\b|\bconsole\.log\b|\bprintf\b/,
            /[{}();=<>+\-\*\/%]/,        // punctuation common in code
            /#|\/\/|\/\*/               // comments
        ];
        let score = 0;
        for (const rx of codeIndicators) {
            if (rx.test(s)) score++;
        }
        // long single-line with many punctuation or no natural-language spaces -> likely code
        const longSingleLine = !s.includes('\n') && s.length > 120 && /[;{}()]/.test(s);
        if (score >= 2 || longSingleLine) return true;

        // also treat if many lines but lines look code-like
        const lines = s.split('\n').slice(0, 8);
        let codeLikeLines = 0;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '') continue;
            if (/^[A-Za-z0-9_]+\s*[:=]\s*/.test(trimmed)) codeLikeLines++;
            if (/^\s*(if|for|while|return|import|from|class|def)\b/.test(trimmed)) codeLikeLines++;
            if (/[;{}()]/.test(trimmed)) codeLikeLines++;
        }
        if (codeLikeLines >= Math.max(1, Math.floor(lines.length / 2))) return true;

        return false;
    }

    // First escape for HTML where needed, but we'll replace fenced blocks and code blocks with pre > code elements
    // We will assemble HTML parts manually so we can insert code blocks safely.
    const resultParts = [];
    let lastIndex = 0;
    const fencedRe = /```(\w+)?\n([\s\S]*?)```/g;
    let m;

    // Process fenced code blocks first (preserve location)
    while ((m = fencedRe.exec(text)) !== null) {
        // push text before fenced block (escape it for HTML)
        const before = text.slice(lastIndex, m.index);
        resultParts.push(escapeHtml(before).replace(/\n/g, '<br/>'));
        lastIndex = m.index + m[0].length;

        const lang = m[1] || '';
        const raw = m[2];

        // Attempt to pretty-print (async)
        let pretty;
        try { pretty = await tryPrettyPrintAsync(lang, raw); } catch (e) { pretty = null; }
        if (!pretty) pretty = raw;

        const rawB64 = btoa(encodeURIComponent(raw));
        const prettyB64 = btoa(encodeURIComponent(pretty));
        const languageLabel = lang ? '<span class="code-lang">' + escapeHtml(lang) + '</span>' : '';
        const safePretty = escapeHtml(pretty);

        resultParts.push(`
            <div class="code-block" data-raw-b64="${rawB64}" data-pretty-b64="${prettyB64}">
                <div class="code-header">${languageLabel}<div class="code-actions"><button class="toggle-btn">Raw</button><button class="copy-btn">Copy</button></div></div>
                <pre><code class="language-${escapeHtml(lang)}">${safePretty}</code></pre>
            </div>
        `);
    }

    // push trailing text after last fenced block
    const trailing = text.slice(lastIndex);

    // If there were fenced blocks, we've already added preceding/trailing pieces as escaped HTML. Now handle trailing.
    if (lastIndex > 0) {
        resultParts.push(escapeHtml(trailing).replace(/\n/g, '<br/>'));
        return resultParts.join('');
    }

    // No fenced blocks found: detect if the whole message looks like code
    if (looksLikeCode(text)) {
        // Attempt to pretty-print the entire message (try async prettier, then fallback)
        let prettyWhole;
        try { prettyWhole = await tryPrettyPrintAsync('unknown', text); } catch (e) { prettyWhole = null; }
        if (!prettyWhole) {
            // Try language-specific guesses: if it contains 'import' or '#', assume python
            const langGuess = /\bimport\b|def\b|class\b|pygame\b/.test(text) ? 'python' : 'javascript';
            try { prettyWhole = await tryPrettyPrintAsync(langGuess, text); } catch (e) { prettyWhole = null; }
        }
        if (!prettyWhole) prettyWhole = text;

        const rawB64 = btoa(encodeURIComponent(text));
        const prettyB64 = btoa(encodeURIComponent(prettyWhole));
        const safePretty = escapeHtml(prettyWhole);

        return `
            <div class="code-block" data-raw-b64="${rawB64}" data-pretty-b64="${prettyB64}">
                <div class="code-header"><div class="code-actions"><button class="toggle-btn">Raw</button><button class="copy-btn">Copy</button></div></div>
                <pre><code class="language-">${safePretty}</code></pre>
            </div>
        `;
    }

    // Otherwise, no fenced blocks and not detected as code — treat as ordinary text
    // Also handle inline code: `code`
    let out = escapeHtml(text);
    out = out.replace(/(^|[^`])`([^`\n]+)`(?!`)/g, (m, p1, code) => {
        return p1 + '<code class="inline-code">' + escapeHtml(code) + '</code>';
    });
    return out.replace(/\n/g, '<br/>');
}

// Original synchronous version (kept for backward compatibility)
function formatMessageContent(text) {
    if (!text) return '';

    let out = escapeHtml(text);

    // inline code: `code`
    out = out.replace(/(^|[^`])`([^`\n]+)`(?!`)/g, (m, p1, code) => {
        return p1 + '<code class="inline-code">' + escapeHtml(code) + '</code>';
    });

    // fenced code blocks: ```lang\ncode```
    out = out.replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
        const raw = code;
        const language = lang || '';
        const rawB64 = btoa(encodeURIComponent(raw || ''));
        const pretty = raw;
        const prettyB64 = btoa(encodeURIComponent(pretty || ''));

        const languageLabel = language ? '<span class="code-lang">' + escapeHtml(language) + '</span>' : '';

        return `
            <div class="code-block" data-raw-b64="${rawB64}" data-pretty-b64="${prettyB64}">
                <div class="code-header">${languageLabel}<div class="code-actions"><button class="toggle-btn">Raw</button><button class="copy-btn">Copy</button></div></div>
                <pre><code class="language-${escapeHtml(language)}">${escapeHtml(pretty)}</code></pre>
            </div>
        `;
    });

    return `<p class="message-text">${out.replace(/\n/g, '<br/>')}</p>`;
}

// ============================================
// 2.c Code-block handlers (copy + toggle)
// ============================================
function attachCodeBlockHandlers(container) {
    const root = container || document;
    const blocks = root.querySelectorAll('.code-block');

    blocks.forEach(block => {
        if (block._hasHandlers) return;
        block._hasHandlers = true;

        const copyBtn = block.querySelector('.copy-btn');
        const toggleBtn = block.querySelector('.toggle-btn');

        const decodeDataKey = (k) => {
            try {
                const raw = block.dataset[k];
                if (!raw) return '';
                return decodeURIComponent(atob(raw));
            } catch (e) {
                return '';
            }
        };

        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const ta = block.querySelector('textarea.code-raw');
                let text = '';
                if (ta) text = ta.value;
                else {
                    const pre = block.querySelector('pre');
                    text = pre ? (pre.textContent || pre.innerText || '') : '';
                }
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

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const isRaw = !!block.querySelector('textarea.code-raw');
                if (isRaw) {
                    // switch to pretty
                    const pretty = decodeDataKey('prettyB64') || '';
                    const codeEl = document.createElement('code');
                    codeEl.className = block.querySelector('pre > code')?.className || '';
                    codeEl.textContent = pretty;
                    const newPre = document.createElement('pre');
                    newPre.appendChild(codeEl);
                    const ta = block.querySelector('textarea.code-raw');
                    if (ta) ta.replaceWith(newPre);
                    if (window.Prism && typeof window.Prism.highlightElement === 'function') {
                        try { window.Prism.highlightElement(codeEl); } catch (e) { /* ignore */ }
                    }
                    toggleBtn.textContent = 'Raw';
                } else {
                    // switch to raw
                    const raw = decodeDataKey('rawB64') || '';
                    const ta = document.createElement('textarea');
                    ta.className = 'code-raw';
                    ta.readOnly = true;
                    ta.style.width = '100%';
                    ta.style.padding = '12px';
                    ta.style.background = '#050507';
                    ta.style.color = '#e6eef8';
                    ta.value = raw;
                    const preNode = block.querySelector('pre');
                    if (preNode) preNode.replaceWith(ta);
                    toggleBtn.textContent = 'Pretty';
                }
            });
        }
    });
}

// ============================================
// 2.d Beautify code blocks after rendering
// ============================================
async function beautifyCodeBlocks(container) {
    if (!container) return;
    const blocks = container.querySelectorAll('.code-block');
    if (!blocks) return;

    for (const block of blocks) {
        try {
            // get raw
            const rawB64 = block.dataset.rawB64;
            let raw = rawB64 ? decodeURIComponent(atob(rawB64)) : '';
            if (!raw) {
                // fallback: take current pre>code text
                const cur = block.querySelector('pre > code');
                raw = cur ? (cur.textContent || cur.innerText || '') : '';
            }
            if (!raw) continue;

            // only attempt prettify if single-line or compact (prevent reformatting big code we didn't intend)
            const isCompact = !raw.includes('\n') || raw.length < 400;
            if (!isCompact) continue;

            // language guess
            const cls = block.querySelector('pre > code')?.className || '';
            const m = cls.match(/language-([^\s]+)/);
            const lang = m ? m[1] : '';

            const pretty = await tryPrettyPrintAsync(lang, raw);
            if (!pretty) continue;

            // update displayed code & store prettyB64
            const codeEl = block.querySelector('pre > code');
            if (codeEl) {
                setCodeTextSafe(codeEl, pretty);
                block.dataset.prettyB64 = btoa(encodeURIComponent(pretty));
                // re-highlight only this code element
                if (window.Prism && typeof window.Prism.highlightElement === 'function') {
                    try { window.Prism.highlightElement(codeEl); } catch (e) { /* ignore */ }
                }
            }
        } catch (e) {
            console.debug('Beautify block failed', e);
        }
    }
}

// ============================================
// 3. MESSAGE RENDERING
// ============================================
function scrollToBottom() {
    const box = elMessages();
    if (box) box.scrollTop = box.scrollHeight;
}

// UPDATED RENDER FUNCTION - uses async formatting
async function renderMessage(role, content, ts) {
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

    // Use async formatting for assistant messages, sync for user messages
    let formattedContent;
    if (!isUser) {
        formattedContent = await formatMessageContentAsync(content) || `<p class="text-sm ${isUser ? 'text-white' : 'text-neutral-200'} leading-relaxed whitespace-pre-wrap">${escapeHtml(content)}</p>`;
    } else {
        formattedContent = formatMessageContent(content) || `<p class="text-sm ${isUser ? 'text-white' : 'text-neutral-200'} leading-relaxed whitespace-pre-wrap">${escapeHtml(content)}</p>`;
    }
    
    bubble.innerHTML = formattedContent;

    const meta = document.createElement('p');
    meta.className = "text-xs text-neutral-600 mt-2 " + (isUser ? "text-right" : "");
    meta.textContent = (isUser ? "You" : "Looka") + " • " + formatTime(ts);

    col.appendChild(bubble);
    col.appendChild(meta);
    wrapper.appendChild(avatar);
    wrapper.appendChild(col);

    elMessages().appendChild(wrapper);
    scrollToBottom();

    // attach code handlers
    attachCodeBlockHandlers(wrapper);

    // Try to beautify compact code-blocks and re-run Prism highlight
    beautifyCodeBlocks(wrapper).finally(() => {
        if (window.Prism && typeof Prism.highlightAllUnder === 'function') {
            try { Prism.highlightAllUnder(wrapper); } catch (e) { /* ignore */ }
        }
    });
}

// ============================================
// 4. FILE HANDLING
// ============================================
let uploadedFiles = [];

const MAX_INLINE_IMAGE_BYTES = 5 * 1024 * 1024;

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
            if (file.size > MAX_INLINE_IMAGE_BYTES) {
                fileData.push({
                    type: 'file',
                    name: file.name,
                    size: file.size,
                    mimeType: file.type,
                    note: 'Image too large to inline; upload to server and send URL instead.'
                });
                continue;
            }
            const base64 = await fileToBase64(file);
            fileData.push({ type: 'image', name: file.name, data: base64, mimeType: file.type });
        } else {
            try {
                const text = await file.text();
                fileData.push({ type: 'document', name: file.name, content: text.substring(0, 5000), mimeType: file.type });
            } catch (error) {
                fileData.push({ type: 'file', name: file.name, size: file.size, mimeType: file.type });
            }
        }
    }

    return fileData;
}

function renderFilePreview() {
    const filePreview = document.getElementById('file-preview');
    if (!filePreview) return;

    if (uploadedFiles.length > 0) {
        filePreview.classList.remove('hidden');
        filePreview.innerHTML = uploadedFiles.map((file, idx) => `
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
}

function handleFileUpload() {
    const fileInput = document.getElementById('file-input');
    if (!fileInput) return;
    if (fileInput._listenerAdded) return;
    fileInput._listenerAdded = true;
    fileInput.addEventListener('change', (e) => {
        uploadedFiles = Array.from(e.target.files || []);
        renderFilePreview();
    });
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    const fileInput = document.getElementById('file-input');
    if (uploadedFiles.length === 0) {
        const filePreview = document.getElementById('file-preview');
        if (filePreview) filePreview.classList.add('hidden');
        if (fileInput) fileInput.value = '';
    } else {
        renderFilePreview();
    }
}

// ============================================
// 5. STREAMING UI helpers
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

// ============================================
// 6. API key & proxy helpers
// ============================================
function getApiKey(model) {
    try {
        if (window.CONFIG && window.CONFIG.API_KEYS) {
            const k = window.CONFIG.API_KEYS[model] || window.CONFIG.API_KEYS['default'];
            if (k) return k;
        }
        const lsModelKey = localStorage.getItem(`LOOKA_KEY_${model}`);
        if (lsModelKey) return lsModelKey;
        const lsDefault = localStorage.getItem('LOOKA_KEY_DEFAULT');
        if (lsDefault) return lsDefault;
    } catch (e) {
        // ignore localStorage errors
    }
    return null;
}

function maskKey(key) {
    if (!key || typeof key !== 'string') return 'MISSING';
    if (key.length <= 12) return key.replace(/.(?=.{4})/g, '*');
    return key.slice(0, 8) + '...' + key.slice(-4);
}

// ============================================
// 7. MAIN sendMessage (uses proxy when configured)
// ============================================
async function sendMessage(e) {
    e?.preventDefault?.();
    const ta = elInput();
    const text = (ta?.value || "").trim();
    if (!text) return;

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
    // Use synchronous rendering for user messages
    renderMessage("user", userMessageContent, now);

    if (ta) { ta.value = ""; autoResize(ta); }
    uploadedFiles = [];
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    if (fileInput) fileInput.value = '';
    if (filePreview) filePreview.classList.add('hidden');

    showThinkingAnimation();
    setTyping(true);

    try {
        const apiMessages = [];
        const filteredMessages = state.messages.length > 1 && state.messages[0].role === 'assistant' ? state.messages.slice(1) : state.messages;

        for (const msg of filteredMessages) {
            if (msg.files && msg.files.length > 0) {
                const content = [];
                if ((msg.content || '').trim()) content.push({ type: "text", text: msg.content });
                msg.files.forEach(file => {
                    if (file.type === 'image' && file.data) {
                        content.push({ type: "image_url", image_url: { url: file.data } });
                    } else if (file.type === 'document' && file.content) {
                        if (content.length > 0 && content[0].type === 'text') {
                            content[0].text += `\n\nDocument "${file.name}":\n${file.content}`;
                        } else {
                            content.push({ type: "text", text: `Document "${file.name}":\n${file.content}` });
                        }
                    } else {
                        if (content.length > 0 && content[0].type === 'text') {
                            content[0].text += `\n\nFile "${file.name}" (${file.mimeType || 'unknown'}, ${file.size || 'unknown'} bytes)`;
                        } else {
                            content.push({ type: "text", text: `File "${file.name}" (${file.mimeType || 'unknown'}, ${file.size || 'unknown'} bytes)` });
                        }
                    }
                });
                apiMessages.push({ role: msg.role, content: content });
            } else {
                apiMessages.push({ role: msg.role, content: msg.content });
            }
        }

        const selectedModel = document.getElementById('model-select')?.value || window.CONFIG?.AI_MODEL || 'z-ai/glm-4.5-air:free';
        const useProxy = !!window.CONFIG?.USE_PROXY;
        const proxyUrl = window.CONFIG?.PROXY_URL || '/api/proxy';

        // If using proxy, client shouldn't send Authorization header — server uses env var
        const apiKey = getApiKey(selectedModel);

        if (!useProxy && !apiKey) {
            hideThinkingAnimation();
            setTyping(false);
            const msg = 'API key missing. For deployed sites use a server-side proxy to keep keys secret, or set window.CONFIG.API_KEYS locally (not recommended in production).';
            const ts = Date.now();
            state.messages.push({ role: "assistant", content: msg, ts });
            // Use async rendering for assistant messages
            await renderMessage("assistant", msg, ts);
            return;
        }

        const body = JSON.stringify({
            model: selectedModel,
            messages: apiMessages,
            temperature: window.CONFIG?.TEMPERATURE || 0.7,
            max_tokens: getModelLimit(selectedModel),
            stream: true
        });

        console.debug('Sending request for model', selectedModel, useProxy ? 'via proxy' : 'direct');

        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Title': 'Looka AI Assistant'
            },
            body
        };

        if (!useProxy && apiKey) {
            fetchOptions.headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const endpoint = useProxy ? proxyUrl : 'https://openrouter.ai/api/v1/chat/completions';

        const response = await fetch(endpoint, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            let errorData;
            try { errorData = errorText ? JSON.parse(errorText) : {}; } catch (e) { errorData = { message: errorText }; }
            console.error('API error:', errorData);
            throw new Error(errorData.error?.message || errorData.message || 'Unknown API error');
        }

        hideThinkingAnimation();
        const streamingElement = createStreamingBubble();
        let fullReply = "";

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let doneFlag = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed.startsWith('data: ')) {
                    const data = trimmed.slice(6);
                    if (data === '[DONE]') { doneFlag = true; break; }
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || parsed.choices?.[0]?.text || "";
                        fullReply += content;
                        if (streamingElement) { streamingElement.textContent = fullReply; scrollToBottom(); }
                    } catch (e) {
                        // ignore JSON parse errors for partial chunks
                    }
                }
            }
            if (doneFlag) break;
        }

        // process any leftover buffer
        if (buffer && buffer.trim().startsWith('data: ')) {
            try {
                const parsed = JSON.parse(buffer.trim().slice(6));
                const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || parsed.choices?.[0]?.text || "";
                fullReply += content;
            } catch (e) {}
        }

        removeStreamingBubble();
        const ts = Date.now();
        state.messages.push({ role: "assistant", content: fullReply, ts });
        // Use async rendering for assistant messages
        await renderMessage("assistant", fullReply, ts);
    } catch (error) {
        console.error('Error:', error);
        hideThinkingAnimation();
        const errorMsg = `Error: ${error.message}. Please check your connection and try again.`;
        const ts = Date.now();
        state.messages.push({ role: "assistant", content: errorMsg, ts });
        // Use async rendering for assistant messages
        await renderMessage("assistant", errorMsg, ts);
    } finally {
        setTyping(false);
        if (typeof saveCurrentChat === 'function') saveCurrentChat();
    }
}

// expose sendMessage for forms / buttons
window.sendMessage = sendMessage;

// ============================================
// 8. UTILS & initialization
// ============================================
function getModelLimit(model) {
    if (!window.CONFIG || !window.CONFIG.MODEL_LIMITS) return 4096;
    return window.CONFIG.MODEL_LIMITS[model] || window.CONFIG.MODEL_LIMITS['default'] || 4096;
}

function getModelCapabilities(model) {
    try {
        if (window.CONFIG && window.CONFIG.MODEL_CAPABILITIES) {
            return window.CONFIG.MODEL_CAPABILITIES[model] || window.CONFIG.MODEL_CAPABILITIES['default'] || { attachments: false, images: false };
        }
    } catch (e) {}
    return { attachments: false, images: false };
}

function updateModelUI(model) {
    const caps = getModelCapabilities(model);
    const attachBtn = document.getElementById('attach-btn');
    const genBtn = document.getElementById('generate-image-btn');
    if (attachBtn) attachBtn.style.display = caps.attachments ? '' : 'none';
    if (genBtn) genBtn.style.display = caps.images ? '' : 'none';
}

function setTyping(on) {
    const t = elTyping();
    if (!t) return;
    t.classList.toggle('hidden', !on);
}

function resetChat() {
    if (typeof createNewChat === 'function') createNewChat();
    else {
        state.currentChatId = null;
        state.messages = [{ role: "assistant", content: "Hi — I'm Looka, your AI assistant. Ask me anything, upload files, or generate images!", ts: Date.now() }];
        elMessages().innerHTML = "";
        // Use async rendering for initial assistant message
        renderMessage("assistant", state.messages[0].content, state.messages[0].ts);
        elInput().focus();
    }
}

function quickPrompt(text) {
    const ta = elInput();
    if (!ta) return;
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
    if (!prompt) { elInput().value = "Generate an image of: "; elInput().focus(); return; }
    const now = Date.now();
    const userMsg = `Generate image: ${prompt}`;
    state.messages.push({ role: "user", content: userMsg, ts: now });
    renderMessage("user", userMsg, now);
    elInput().value = "";
    setTyping(true);

    try {
        const selectedModel = document.getElementById('model-select')?.value || window.CONFIG?.AI_MODEL || 'z-ai/glm-4.5-air:free';
        const useProxy = !!window.CONFIG?.USE_PROXY;
        const proxyUrl = window.CONFIG?.PROXY_URL || '/api/proxy';
        const apiKey = getApiKey(selectedModel);
        if (!useProxy && !apiKey) throw new Error('API key not configured.');

        const response = await fetch(useProxy ? proxyUrl : 'https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Title': 'Looka AI Assistant'
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [{ role: 'user', content: `I'll create an image for you! Here's what I envision: ${prompt}\n\nNote: Image generation via API requires additional setup.` }],
                temperature: 0.8,
                max_tokens: 1000
            })
        });

        if (!response.ok) throw new Error('Image generation request failed');
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
        const ts = Date.now();
        state.messages.push({ role: "assistant", content: reply, ts });
        await renderMessage("assistant", reply, ts);
    } catch (error) {
        console.error('Error:', error);
        const errorMsg = `Error generating image: ${error.message}`;
        const ts = Date.now();
        state.messages.push({ role: "assistant", content: errorMsg, ts });
        await renderMessage("assistant", errorMsg, ts);
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
// 9. INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    const ta = elInput();
    if (!ta) return;
    ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); document.getElementById("chat-form").requestSubmit(); }
    });
    ta.addEventListener("input", () => autoResize(ta));
    autoResize(ta);
    handleFileUpload();

    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
        updateModelUI(modelSelect.value || window.CONFIG?.AI_MODEL);
        modelSelect.addEventListener('change', (e) => updateModelUI(e.target.value));
    }

    console.log("✅ Looka AI (updated) loaded!");
});