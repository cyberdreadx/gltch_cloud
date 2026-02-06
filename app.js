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

    // Load sessions from API
    async function loadSessions() {
        const sessionsList = document.getElementById('sessions-list');
        const sessionsEmpty = document.getElementById('sessions-empty');

        try {
            if (window.gltchAPI) {
                const response = await window.gltchAPI.getSessions();
                const sessions = response.sessions || [];

                if (sessions.length === 0) {
                    sessionsEmpty.style.display = 'block';
                    return;
                }

                sessionsEmpty.style.display = 'none';

                // Clear existing and render sessions
                sessionsList.innerHTML = '';
                sessions.forEach((session, index) => {
                    const isActive = session.id === currentSessionId;
                    const card = document.createElement('div');
                    card.className = `session-card${isActive ? ' active' : ''}`;
                    card.dataset.sessionId = session.id;

                    const timeAgo = getTimeAgo(session.created_at);

                    card.innerHTML = `
                        <div class="session-icon">💬</div>
                        <div class="session-content">
                            <span class="session-title">${escapeHtml(session.title || 'Chat Session')}</span>
                            <span class="session-preview">${escapeHtml(session.preview || 'Click to open...')}</span>
                        </div>
                        <span class="session-time">${timeAgo}</span>
                    `;

                    card.addEventListener('click', () => selectSession(session.id));
                    sessionsList.appendChild(card);
                });
            }
        } catch (error) {
            console.warn('Could not load sessions:', error.message);
        }
    }

    function getTimeAgo(dateStr) {
        if (!dateStr) return 'Just now';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays}d ago`;
    }

    function selectSession(sessionId) {
        currentSessionId = sessionId;
        document.querySelectorAll('.session-card').forEach(c => c.classList.remove('active'));
        const card = document.querySelector(`[data-session-id="${sessionId}"]`);
        if (card) card.classList.add('active');

        // Switch to chat view
        document.querySelector('[data-view="chat"]').click();

        // TODO: Load session messages
    }

    // New Chat button
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            currentSessionId = null;
            messagesContainer.innerHTML = '';
            document.querySelector('[data-view="chat"]').click();
        });
    }

    // Load sessions when sessions tab is clicked
    document.querySelector('[data-view="sessions"]')?.addEventListener('click', loadSessions);
});
