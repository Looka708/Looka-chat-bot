// Claude-style Streaming Animation for Looka AI
// Add this to your index.html after the sendMessage function

// Typing animation - displays text character by character
function typeWriter(element, text, speed = 20) {
    return new Promise((resolve) => {
        let i = 0;
        element.textContent = '';

        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else {
                resolve();
            }
        }

        type();
    });
}

// Stream text word by word (Claude-style)
async function streamText(element, text, wordsPerChunk = 2, delay = 30) {
    const words = text.split(' ');
    element.textContent = '';

    for (let i = 0; i < words.length; i += wordsPerChunk) {
        const chunk = words.slice(i, i + wordsPerChunk).join(' ') + ' ';
        element.textContent += chunk;

        // Scroll to bottom as text appears
        scrollToBottom();

        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

// Enhanced loading animation with thinking dots
function showThinkingAnimation() {
    const messagesEl = document.getElementById('chat-messages');

    const thinkingDiv = document.createElement('div');
    thinkingDiv.id = 'thinking-animation';
    thinkingDiv.className = 'flex items-start gap-3';
    thinkingDiv.innerHTML = `
        <div class="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
            <img src="logo.svg" alt="Looka" class="w-5 h-5" />
        </div>
        <div class="glass-card rounded-2xl px-4 py-3 max-w-2xl">
            <div class="flex items-center gap-2">
                <div class="flex gap-1">
                    <span class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0s"></span>
                    <span class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></span>
                    <span class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></span>
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
    if (thinking) {
        thinking.remove();
    }
}

// Create a streaming message bubble
function createStreamingBubble() {
    const messagesEl = document.getElementById('chat-messages');

    const wrapper = document.createElement('div');
    wrapper.id = 'streaming-message';
    wrapper.className = 'flex items-start gap-3';

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
    if (streaming) {
        streaming.remove();
    }
}

// Enhanced sendMessage with streaming
async function sendMessageWithStreaming(e) {
    e.preventDefault();
    const ta = elInput();
    const text = (ta.value || "").trim();
    if (!text) return;

    // Process uploaded files
    const attachedFiles = await processUploadedFiles();

    // Build the user message content
    let userMessageContent = text;
    if (attachedFiles && attachedFiles.length > 0) {
        userMessageContent += '\n\nAttached files:\n';
        attachedFiles.forEach(file => {
            if (file.type === 'image') {
                userMessageContent += `📷 ${file.name}\n`;
            } else if (file.type === 'document') {
                userMessageContent += `📄 ${file.name} (${file.content.length} chars loaded)\n`;
            } else {
                userMessageContent += `📎 ${file.name} (${file.size} bytes)\n`;
            }
        });
    }

    const now = Date.now();
    state.messages.push({ role: "user", content: userMessageContent, ts: now, files: attachedFiles });
    renderMessage("user", userMessageContent, now);

    ta.value = "";
    autoResize(ta);

    // Clear file attachments
    uploadedFiles = [];
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview').classList.add('hidden');

    // Show thinking animation
    showThinkingAnimation();
    setTyping(true);

    try {
        // Prepare messages for API
        const apiMessages = [];

        for (const msg of state.messages) {
            if (msg.files && msg.files.length > 0) {
                const content = [
                    { type: "text", text: msg.content }
                ];

                msg.files.forEach(file => {
                    if (file.type === 'image') {
                        content.push({
                            type: "image_url",
                            image_url: { url: file.data }
                        });
                    } else if (file.type === 'document' && file.content) {
                        content[0].text += `\n\nDocument "${file.name}":\n${file.content}`;
                    }
                });

                apiMessages.push({
                    role: msg.role,
                    content: content
                });
            } else {
                apiMessages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.CONFIG?.OPENROUTER_API_KEY || 'your_api_key_here'}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'Looka AI Assistant'
            },
            body: JSON.stringify({
                model: window.CONFIG?.AI_MODEL || 'z-ai/glm-4.5-air:free',
                messages: apiMessages,
                temperature: window.CONFIG?.TEMPERATURE || 0.7,
                max_tokens: window.CONFIG?.MAX_TOKENS || 90000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        // Hide thinking, show streaming
        hideThinkingAnimation();
        const streamingElement = createStreamingBubble();

        // Stream the text Claude-style
        await streamText(streamingElement, reply, 2, 30);

        // Remove streaming bubble and add permanent message
        removeStreamingBubble();

        const ts = Date.now();
        state.messages.push({ role: "assistant", content: reply, ts });
        renderMessage("assistant", reply, ts);

    } catch (error) {
        console.error('Error:', error);
        hideThinkingAnimation();

        const errorMsg = `Error: ${error.message}. Please check your connection and try again.`;
        const ts = Date.now();
        state.messages.push({ role: "assistant", content: errorMsg, ts });
        renderMessage("assistant", errorMsg, ts);
    } finally {
        setTyping(false);
        // Auto-save chat after each message
        if (typeof saveCurrentChat === 'function') {
            saveCurrentChat();
        }
    }
}

// Replace the original sendMessage with the streaming version
// Comment out or remove the old sendMessage function and use this one instead
