/**
 * GLTCH Cloud - App Dashboard Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    // View Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-container');
    const pageTitle = document.querySelector('.page-title');

    const viewTitles = {
        'chat': 'Chat',
        'sessions': 'Sessions',
        'wallet': 'Wallet',
        'settings': 'Settings'
    };

    // Load user stats on page load
    loadUserStats();

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = item.dataset.view;

            // Update active nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show correct view
            views.forEach(view => {
                view.classList.add('hidden');
                if (view.id === `${viewName}-view`) {
                    view.classList.remove('hidden');
                }
            });

            // Update title
            pageTitle.textContent = viewTitles[viewName] || 'Chat';
        });
    });

    // Chat functionality
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('messages');

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    });

    // Send message on Enter (without Shift)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    let currentSessionId = null;
    let isLoading = false;

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text || isLoading) return;

        // Add user message
        addMessage('user', text);
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Show loading state
        isLoading = true;
        sendBtn.disabled = true;
        const loadingMsg = addMessage('assistant', '💭 Thinking...', true);

        try {
            // Try API first
            if (window.gltchAPI) {
                const response = await window.gltchAPI.sendMessage(text, currentSessionId);
                currentSessionId = response.session_id;

                // Remove loading message
                loadingMsg.remove();

                // Add real response
                addMessage('assistant', response.content);

                // Update usage display
                updateUsage(response.input_tokens + response.output_tokens, response.cost_usd);
            } else {
                throw new Error('API not available');
            }
        } catch (error) {
            console.warn('API error, using demo mode:', error.message);

            // Remove loading message
            loadingMsg.remove();

            // Fallback to demo responses
            const responses = [
                "Got it, operator! Let me work on that for you. 💜",
                "Interesting request... I'll handle it. Give me a sec.",
                "On it! This is exactly what I was built for.",
                "Consider it done. Anything else you need?",
                "Processing... Okay, here's what I found.",
                "I like how you think. Let me help with that."
            ];
            addMessage('assistant', responses[Math.floor(Math.random() * responses.length)]);
        }

        isLoading = false;
        sendBtn.disabled = false;
    }

    function updateUsage(tokens, cost) {
        const usageTokens = document.getElementById('usage-tokens');
        if (usageTokens) {
            const currentTokens = parseInt(usageTokens.textContent.replace(/[^0-9]/g, '')) || 0;
            usageTokens.textContent = `${(currentTokens + tokens).toLocaleString()} tokens today`;
        }
    }

    async function loadUserStats() {
        try {
            if (window.gltchAPI) {
                // Fetch usage stats
                const usage = await window.gltchAPI.getUsage();
                const usageTokens = document.getElementById('usage-tokens');
                if (usageTokens && usage) {
                    usageTokens.textContent = `${usage.tokens_today?.toLocaleString() || 0} tokens today`;
                }

                // Fetch user info for provider
                const user = await window.gltchAPI.getMe();
                const providerName = document.getElementById('provider-name');
                if (providerName && user) {
                    const providerMap = {
                        'openai': 'GPT-4o',
                        'anthropic': 'Claude',
                        'gemini': 'Gemini',
                        'grok': 'Grok'
                    };
                    providerName.textContent = providerMap[user.provider] || 'GPT-4o';
                }
            }
        } catch (error) {
            console.warn('Could not load user stats:', error.message);
        }
    }

    function addMessage(type, text, isLoading = false) {
        const message = document.createElement('div');
        message.className = `message ${type}${isLoading ? ' loading' : ''}`;

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (type === 'user') {
            message.innerHTML = `
                <div class="message-avatar">CD</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-name">You</span>
                        <span class="message-time">${timeStr}</span>
                    </div>
                    <div class="message-text">${escapeHtml(text)}</div>
                </div>
            `;
        } else {
            message.innerHTML = `
                <div class="message-avatar">💜</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-name">GLTCH</span>
                        <span class="message-time">${timeStr}</span>
                    </div>
                    <div class="message-text">${escapeHtml(text)}</div>
                </div>
            `;
        }

        messagesContainer.appendChild(message);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return message;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Session cards click
    document.querySelectorAll('.session-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.session-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            // Switch to chat view
            document.querySelector('[data-view="chat"]').click();
        });
    });
});
