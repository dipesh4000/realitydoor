import { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, ChevronRight } from 'lucide-react';
import { sendMessage } from '../../api/chat';

export default function AiPanel({ title = 'AI Copilot', subtitle, actionCard, suggestedQuestions = [], initialMessages = [] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await sendMessage(msg);
      setMessages((prev) => [...prev, { role: 'ai', text: res.reply, sources: res.sources }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'The grounded assistant is temporarily unavailable. Please use the Rules page citations.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="ai-panel">
      {/* Header */}
      <div className="ai-panel-header">
        <div className="ai-panel-avatar">
          <Bot size={18} color="var(--color-primary-container)" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-on-surface)' }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="ai-panel-body" ref={feedRef} aria-live="polite" aria-busy={loading}>
        {/* Action card */}
        {actionCard && (
          <div className="ai-card primary-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <Sparkles size={15} color="var(--color-primary-container)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-on-surface)' }}>{actionCard.title}</div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: 10 }}>
              {actionCard.message}
            </p>
            {actionCard.fileRef && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--color-surface-white)', border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--color-on-surface-variant)', marginBottom: 10, width: 'fit-content' }}>
                <FileIcon /> {actionCard.fileRef}
              </div>
            )}
            {actionCard.action && (
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}>
                {actionCard.action}
              </button>
            )}
          </div>
        )}

        {/* Chat messages */}
        {messages.length > 0 && (
          <div className="chat-feed">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 8 }}>
                  <div className="user-message-bubble" style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-surface-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, color: 'var(--color-on-surface-variant)' }}>JD</div>
                </div>
              ) : (
                <div key={i} className="ai-message">
                  <div className="ai-panel-avatar" style={{ flexShrink: 0 }}>
                    <Bot size={14} color="var(--color-primary-container)" />
                  </div>
                  <div className="ai-message-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                    {m.text}
                    {m.sources?.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-primary-container)' }}>
                        Sources: {m.sources.map((source) => `${source.title}${source.page ? `, p. ${source.page}` : ''}`).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
            {loading && (
              <div className="ai-message">
                <div className="ai-panel-avatar" style={{ flexShrink: 0 }}>
                  <Bot size={14} color="var(--color-primary-container)" />
                </div>
                <div className="ai-message-bubble" style={{ color: 'var(--color-outline)' }}>
                  <LoadingDots />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggested questions */}
        {suggestedQuestions.length > 0 && (
          <div className="suggested-questions">
            <div className="suggested-questions-label">Suggested Questions</div>
            {suggestedQuestions.map((q, i) => (
              <button key={i} className="suggestion-btn" onClick={() => handleSend(q)}>
                {q}
                <ChevronRight size={14} color="var(--color-outline)" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="ai-input-area">
        <div className="ai-input-row">
          <input
            aria-label="Ask the grounded RealDoor assistant"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Copilot anything..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="ai-send-btn" aria-label="Send question" onClick={() => handleSend()} disabled={loading}>
            <Send size={14} />
          </button>
        </div>
        <p className="disclaimer" style={{ marginTop: 6 }}>AI can make mistakes. Verify important information.</p>
      </div>
    </aside>
  );
}

function FileIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>;
}

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-outline)', display: 'inline-block', animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
      ))}
      <style>{`@keyframes pulse { 0%,80%,100%{opacity:0.3} 40%{opacity:1} }`}</style>
    </span>
  );
}
