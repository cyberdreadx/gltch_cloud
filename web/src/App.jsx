import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatView from './components/ChatView'
import './App.css'

function App() {
  const [activeView, setActiveView] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const renderView = () => {
    switch (activeView) {
      case 'chat':
        return <ChatView />
      case 'sessions':
        return (
          <div className="view-placeholder">
            <h2>📝 Sessions</h2>
            <p>Your conversation history will appear here.</p>
          </div>
        )
      case 'wallet':
        return (
          <div className="view-placeholder">
            <h2>💰 Wallet</h2>
            <p>Crypto wallet integration coming soon.</p>
          </div>
        )
      case 'settings':
        return (
          <div className="view-placeholder">
            <h2>⚙️ Settings</h2>
            <p>Configuration options coming soon.</p>
          </div>
        )
      default:
        return <ChatView />
    }
  }

  return (
    <div className="app">
      <div className="bg-grid"></div>

      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        <header className="app-header">
          <div className="header-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <h1 className="page-title">
              {activeView.charAt(0).toUpperCase() + activeView.slice(1)}
            </h1>
            <span className="status-badge online">
              <span className="status-dot"></span>
              Connected
            </span>
          </div>
          <div className="header-right">
            <div className="provider-badge">
              🧠 GPT-4o
            </div>
          </div>
        </header>

        {renderView()}
      </main>
    </div>
  )
}

export default App
