import { useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, ChevronRight, MessageCircle, PanelRightClose, PanelRightOpen, Send, Sparkles, X } from 'lucide-react';
import { streamMessage } from '../../api/chat';

export default function AiPanel({ title, subtitle, suggestedQuestions = [], initialMessages = [], open, onOpenChange, collapsed = false, onCollapsedChange, resizeHandleProps }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const feedRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSend = async (text) => {
    const message = text || input.trim();
    if (!message || loading) return;
    setInput('');
    setMessages((current) => [...current, { role: 'user', text: message }]);
    setHistoryOpen(true);
    setLoading(true);
    const replyId = `reply-${Date.now()}`;
    const controller = new AbortController();
    requestRef.current = controller;
    setMessages((current) => [...current, { id: replyId, role: 'ai', text: '', streaming: true }]);
    try {
      await streamMessage(message, {
        signal: controller.signal,
        onDelta: (delta) => setMessages((current) => current.map((item) => item.id === replyId ? { ...item, text: item.text + delta } : item)),
        onComplete: (response) => setMessages((current) => current.map((item) => item.id === replyId ? { ...item, sources: response.sources, streaming: false } : item)),
      });
    } catch {
      if (!controller.signal.aborted) setMessages((current) => current.map((item) => item.id === replyId ? {
        ...item,
        text: 'I am temporarily unavailable. Your documents and progress are safe. You can still use the cited Rules & sources page.',
        error: true,
        streaming: false,
      } : item));
    } finally {
      requestRef.current = null;
      setLoading(false);
    }
  };

  return (
    <>
      <button className="assistant-fab" onClick={() => onOpenChange(true)} aria-label="Ask RealDoor" aria-expanded={open}>
        <MessageCircle size={20} /><span>Ask RealDoor</span>
      </button>
      {open && <button className="assistant-scrim" aria-label="Close assistant" onClick={() => onOpenChange(false)} />}
      <aside className={`assistant-panel ${open ? 'is-open' : ''}${collapsed ? ' is-collapsed' : ''}`} aria-label="RealDoor assistant">
        {!collapsed && <div className="panel-resize-handle panel-resize-handle--left" role="separator" aria-orientation="vertical" aria-label="Resize assistant" tabIndex="0" {...resizeHandleProps} />}
        <header className="assistant-panel__header">
          <div className="assistant-avatar"><Sparkles size={17} /></div>
          <div className="assistant-panel__title"><strong>{title}</strong><span>{subtitle}</span></div>
          <button className="icon-button assistant-panel__collapse" aria-label={collapsed ? 'Expand assistant' : 'Collapse assistant'} onClick={() => onCollapsedChange?.(!collapsed)}>{collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}</button>
          <button className="icon-button assistant-panel__close" aria-label="Close assistant" onClick={() => onOpenChange(false)}><X size={19} /></button>
        </header>

        <div className="assistant-panel__context">
          <Bot size={18} aria-hidden="true" />
          <p><strong>Grounded help, not a decision.</strong> I explain what RealDoor found and show where it came from.</p>
        </div>

        <div className="assistant-panel__body" ref={feedRef} aria-live="polite" aria-busy={loading}>
          <button className="assistant-history-toggle" onClick={() => setHistoryOpen((value) => !value)} aria-expanded={historyOpen}>
            Conversation <ChevronDown size={15} />
          </button>
          {historyOpen && (
            <div className="assistant-feed">
              {messages.map((message, index) => (
                <div key={message.id || `${message.role}-${index}`} className={`assistant-message assistant-message--${message.role}${message.error ? ' is-error' : ''}`}>
                  {message.role === 'ai' && <span className="assistant-message__avatar"><Bot size={14} /></span>}
                  <div className="assistant-message__bubble">
                    <div>{message.text || (message.streaming ? <><span className="typing-dots"><i /><i /><i /></span><span className="sr-only">RealDoor is responding</span></> : null)}</div>
                    {message.sources?.length > 0 && (
                      <div className="assistant-message__sources">
                        {message.sources.map((source) => <span key={`${source.title}-${source.page || ''}`}>{source.title}{source.page ? `, p. ${source.page}` : ''}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="assistant-suggestions">
            <span>Helpful questions</span>
            {suggestedQuestions.map((question) => (
              <button key={question} onClick={() => handleSend(question)} disabled={loading}>{question}<ChevronRight size={15} /></button>
            ))}
          </div>
        </div>

        <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); handleSend(); }}>
          <label className="sr-only" htmlFor="assistant-input">Ask the grounded RealDoor assistant</label>
          <textarea id="assistant-input" rows="1" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about this step…" onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSend(); }
          }} />
          <button type="submit" aria-label="Send question" disabled={loading || !input.trim()}><Send size={16} /></button>
          <small>Verify important information using the cited source.</small>
        </form>
      </aside>
    </>
  );
}
