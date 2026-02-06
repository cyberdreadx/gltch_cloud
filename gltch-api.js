/**
 * GLTCH Cloud - API Client
 * Handles communication with the backend API
 */

const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api'
    : 'https://cloud.gltch.app/api';

class GltchAPI {
    constructor() {
        this.token = localStorage.getItem('gltch_token');
        this.user = null;
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('gltch_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('gltch_token');
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 401) {
                this.clearToken();
                window.location.href = '/login.html';
                return null;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth
    async register(callsign, email, provider, keyMode) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ callsign, email, provider, key_mode: keyMode })
        });
    }

    async getMe() {
        const user = await this.request('/auth/me');
        this.user = user;
        return user;
    }

    async updateSettings(settings) {
        return this.request('/auth/settings', {
            method: 'PATCH',
            body: JSON.stringify(settings)
        });
    }

    // Chat
    async sendMessage(content, sessionId = null) {
        return this.request('/chat', {
            method: 'POST',
            body: JSON.stringify({ content, session_id: sessionId })
        });
    }

    async getSessions() {
        return this.request('/sessions');
    }

    async getSessionMessages(sessionId) {
        return this.request(`/sessions/${sessionId}/messages`);
    }

    // Billing
    async getUsage() {
        return this.request('/billing/usage');
    }

    async upgradeToPro() {
        const result = await this.request('/billing/upgrade', { method: 'POST' });
        if (result.checkout_url) {
            window.location.href = result.checkout_url;
        }
        return result;
    }

    // Health
    async checkHealth() {
        return this.request('/health');
    }
}

// Global API instance
window.gltchAPI = new GltchAPI();

// Check if API is available
(async () => {
    try {
        await window.gltchAPI.checkHealth();
        console.log('✅ GLTCH Cloud API connected');
    } catch (e) {
        console.warn('⚠️ GLTCH Cloud API not available (running in demo mode)');
    }
})();
