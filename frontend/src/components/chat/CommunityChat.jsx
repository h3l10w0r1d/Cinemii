import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Info, Users, Coins } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE } from '../../core/config';

const WS_BASE = API_BASE.replace('http', 'ws');

const PALETTE = ['#f7931a', '#ff3040', '#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#14b8a6'];

function colorFor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function CommunityChat({ onClose }) {
  const { user, loggedIn } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(0);

  const wsRef = useRef(null);
  const chatRef = useRef(null);
  const joinedUsersRef = useRef(new Set());

  const name = user?.name || 'Guest';

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/chat?name=${encodeURIComponent(name)}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'history') {
        const cleanHistory = (data.messages || []).filter((m) => {
          if (m.type !== 'system') return true;

          const systemText = String(m.text || '');
          const lower = systemText.toLowerCase();

          if (lower.includes('left the chat')) return false;

          if (lower.includes('joined the chat')) {
            if (joinedUsersRef.current.has(systemText)) return false;
            joinedUsersRef.current.add(systemText);
          }

          return true;
        });

        setMessages(cleanHistory);
        return;
      }

      if (data.type === 'presence') {
        setOnline(data.online || 0);
        return;
      }

      if (data.type === 'system') {
        const systemText = String(data.text || '');
        const lower = systemText.toLowerCase();

        if (lower.includes('left the chat')) return;

        if (lower.includes('joined the chat')) {
          if (joinedUsersRef.current.has(systemText)) return;
          joinedUsersRef.current.add(systemText);
        }
      }

      setMessages((prev) => [...prev.slice(-119), data]);
    };

    return () => ws.close();
  }, [name]);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages]);

  const send = useCallback(() => {
    if (!loggedIn || !text.trim() || wsRef.current?.readyState !== 1) return;

    wsRef.current.send(JSON.stringify({
      type: 'chat',
      name,
      text: text.trim(),
    }));

    setText('');
  }, [text, name, loggedIn]);

  return (
    <div className="fixed top-16 right-0 bottom-0 z-[800] w-[340px] max-w-[88vw] glass-dark border-l border-white/[0.06] flex flex-col shadow-2xl">
      <div className="flex items-center gap-2 px-4 h-14 border-b border-white/[0.06] flex-shrink-0">
        <span className="text-white font-bold text-base">Chat</span>
        <Info size={14} className="text-muted" />

        <div className="flex items-center gap-1.5 ml-auto mr-1 text-muted text-xs">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <Users size={12} /> {online}
        </div>

        <button onClick={onClose} className="text-muted hover:text-white transition p-1">
          <X size={18} />
        </button>
      </div>

      <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 min-h-0">
        {messages.map((m, i) => {
          if (m.type === 'system') {
            return (
              <div key={i} className="flex items-center justify-center gap-2 py-0.5">
                <span className="text-muted/70 text-xs italic">{m.text}</span>
              </div>
            );
          }

          const c = colorFor(m.name);

          return (
            <div key={i} className="flex items-start gap-2.5 group">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${c}22` }}
              >
                <Coins size={14} style={{ color: c }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold truncate" style={{ color: c }}>
                    {m.name}
                  </span>
                  <span className="text-muted/60 text-[11px] ml-auto flex-shrink-0">
                    {fmtTime(m.ts)}
                  </span>
                </div>

                <p className="text-white/90 text-sm leading-snug break-words mt-0.5">
                  {m.text}
                </p>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <p className="text-center text-xs text-muted mt-10">No messages yet. Say hi!</p>
        )}
      </div>

      <div className="border-t border-white/[0.06] flex-shrink-0">
        {loggedIn ? (
          <div className="px-3 py-3 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={connected ? 'Send a message…' : 'Connecting…'}
              disabled={!connected}
              className="flex-1 bg-white/5 ring-1 ring-white/10 rounded-full px-4 py-2.5 text-white placeholder:text-muted text-sm focus:outline-none focus:ring-accent/40 transition disabled:opacity-50"
            />

            <button
              onClick={send}
              disabled={!connected || !text.trim()}
              className="gradient-accent text-white rounded-full p-2.5 hover:opacity-90 transition active:scale-95 disabled:opacity-40 flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
        ) : (
          <div className="px-4 py-5 text-center">
            <p className="text-muted text-sm">Login required to send messages</p>
          </div>
        )}
      </div>
    </div>
  );
}
