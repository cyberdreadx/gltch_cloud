import { useState } from 'react'
import './Sidebar.css'

const navItems = [
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'sessions', icon: '📝', label: 'Sessions' },
    { id: 'wallet', icon: '💰', label: 'Wallet' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
]

export default function Sidebar({ activeView, onNavigate, isOpen, onClose }) {
    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <a href="/" className="logo">
                    <span className="logo-icon">💜</span>
                    <span className="logo-text">GLTCH</span>
                </a>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                        onClick={() => {
                            onNavigate(item.id)
                            onClose?.()
                        }}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">👤</div>
                    <div className="user-details">
                        <span className="user-name">Operator</span>
                        <span className="user-tier">Free Tier</span>
                    </div>
                </div>
            </div>
        </aside>
    )
}
