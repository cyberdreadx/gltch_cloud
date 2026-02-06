import { useState, useRef, useEffect } from 'react'
import Orb from './Orb'
import './ChatView.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ChatView() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hey there, operator! 💜 Welcome to GLTCH Cloud. What shall we work on?" }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [orbState, setOrbState] = useState('idle')
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setIsLoading(true)
        setOrbState('thinking')

        try {
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: userMessage })
            })

            if (!response.ok) throw new Error('Chat failed')

            const data = await response.json()
            setOrbState('speaking')

            // Simulate typing effect
            setTimeout(() => {
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
                setOrbState('idle')
            }, 500)

        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "⚠️ Connection issue. Make sure the API is running."
            }])
            setOrbState('idle')
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className="chat-view">
            <div className="chat-container">
                <Orb state={orbState} />

                <div className="chat-messages">
                    {messages.map((msg, i) => (
                        <div key={i} className={`message ${msg.role}`}>
                            <div className="message-avatar">
                                {msg.role === 'assistant' ? '💜' : '👤'}
                            </div>
                            <div className="message-text">{msg.content}</div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message assistant">
                            <div className="message-avatar">💜</div>
                            <div className="message-text thinking">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-wrapper">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message GLTCH..."
                        disabled={isLoading}
                        rows={1}
                    />
                    <button
                        className="send-btn"
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                    >
                        {isLoading ? '⏳' : '→'}
                    </button>
                </div>
            </div>
        </div>
    )
}
