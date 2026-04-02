import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_REPLIES = [
  "What is ULPIN?",
  "How to transfer property?",
  "Check encumbrances",
  "Explain e-KYC"
];

const BhoomikaChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Namaste! I am Bhoomika, your AI guide to Indian Land Laws & Registry. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Pass the entire history context for Claude
      const payload = { messages: [...messages, userMsg].filter(m => m.role === 'user' || m.role === 'assistant') };
      
      const res = await axios.post('http://localhost:8080/chat', payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      const botMsg: Message = { role: 'assistant', content: res.data.reply };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I am facing network issues reaching the Bhoomika AI server. Please make sure the FastAPI server is running on port 8080." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', bottom: '24px', right: '24px',
            background: 'var(--primary)', color: 'white',
            width: '60px', height: '60px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', zIndex: 9999, transition: 'var(--transition)'
          }}
        >
          <MessageSquare size={28} />
        </button>
      )}

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '380px', height: '600px',
          background: '#1F2937', color: 'white',
          borderRadius: '16px', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', zIndex: 9999,
          overflow: 'hidden', border: '1px solid #374151'
        }}>
          {/* Header */}
          <div style={{
            background: '#111827', padding: '16px', display: 'flex', 
            justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid #374151'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '50%' }}>
                <Bot size={24} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Bhoomika AI</h3>
                <span style={{ fontSize: '0.8rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{width: 8, height: 8, background: '#10B981', borderRadius: '50%'}}></div> Online
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ color: '#9CA3AF' }}><X size={24} /></button>
          </div>

          {/* Chat Body */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23374151\' fill-opacity=\'0.2\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                display: 'flex', gap: '12px',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}>
                <div style={{
                  background: msg.role === 'user' ? '#374151' : 'var(--primary)',
                  padding: '8px', borderRadius: '50%', height: '36px', width: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {msg.role === 'user' ? <User size={20} /> : <span style={{fontWeight: 'bold', fontSize: 14}}>BH</span>}
                </div>
                <div style={{
                  background: msg.role === 'user' ? '#374151' : '#111827',
                  padding: '12px 16px', borderRadius: '12px',
                  maxWidth: '75%', fontSize: '0.95rem',
                  borderTopRightRadius: msg.role === 'user' ? '4px' : '12px',
                  borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '12px',
                  lineHeight: 1.5,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '50%', height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{fontWeight: 'bold', fontSize: 14}}>BH</span>
                </div>
                <div style={{ background: '#111827', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} color="var(--primary)" />
                  <span style={{ marginLeft: 8, fontSize: '0.9rem', color: '#9CA3AF' }}>Bhoomika is typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form */}
          <div style={{ padding: '16px', background: '#111827', borderTop: '1px solid #374151' }}>
            {/* Quick replies */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '12px', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {QUICK_REPLIES.map(qr => (
                <button key={qr} onClick={() => handleSend(qr)} style={{
                  background: '#374151', color: '#D1D5DB', padding: '6px 12px',
                  borderRadius: '16px', fontSize: '0.8rem', whiteSpace: 'nowrap',
                  border: '1px solid #4B5563', transition: 'var(--transition)'
                }}
                onMouseOver={(e) => Object.assign(e.currentTarget.style, { background: '#4B5563', color: 'white' })}
                onMouseOut={(e) => Object.assign(e.currentTarget.style, { background: '#374151', color: '#D1D5DB' })}
                >
                  {qr}
                </button>
              ))}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Bhoomika..."
                style={{
                  flex: 1, background: '#374151', border: '1px solid #4B5563',
                  padding: '12px', borderRadius: '8px', color: 'white', outline: 'none',
                  fontSize: '0.95rem'
                }}
              />
              <button type="submit" disabled={!input.trim() || isLoading} style={{
                background: 'var(--primary)', color: 'white', padding: '12px',
                borderRadius: '8px', opacity: (!input.trim() || isLoading) ? 0.5 : 1,
                cursor: (!input.trim() || isLoading) ? 'not-allowed' : 'pointer'
              }}>
                <Send size={20} />
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.7rem', color: '#6B7280' }}>
              Disclaimer: AI answers are generated for reference. They do not constitute formal legal advice.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BhoomikaChat;
