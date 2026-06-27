import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, ArrowLeft, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../core/backend';

export function Messages() {
  const [searchParams] = useSearchParams();

  const [friends, setFriends] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
  if (api.heartbeat) {
  api.heartbeat().catch(() => {});
}

  const timer = setInterval(() => {
    if (api.heartbeat) {
  api.heartbeat().catch(() => {});
}
    loadFriends();
  }, 30000);

  return () => clearInterval(timer);
}, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selected) return;

    const timer = setInterval(async () => {
      try {
        const data = await api.listMessages(selected.id);
        setMessages(data || []);
      } catch (err) {
        console.error(err);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [selected]);

  async function loadFriends() {
    try {
      const data = await api.listFriends();
      const list = data || [];
      setFriends(list);

      const friendId = searchParams.get('friend');
      if (friendId) {
        const found = list.find((f) => String(f.id) === String(friendId));
        if (found) {
          openChat(found);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function openChat(friend) {
    setSelected(friend);

    try {
      const data = await api.listMessages(friend.id);
      setMessages(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function sendMessage() {
    if (!selected || !text.trim()) return;

    try {
      const msg = await api.sendMessage(selected.id, text.trim());
      setMessages((prev) => [...prev, msg]);
      setText('');
    } catch (err) {
      console.error(err);
    }
  }

  function formatTime(value) {
    if (!value) return '';
    const d = new Date(value);
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const filteredFriends = friends.filter((f) =>
    `${f.name} ${f.username || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-24 px-6 pb-10 bg-bg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/profile"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-white"
          >
            <ArrowLeft size={18} />
          </Link>

          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <MessageCircle size={24} className="text-muted" />
            Messages
          </h1>
        </div>

        <div className="grid lg:grid-cols-[340px_1fr] gap-6">
          <div className="glass-dark rounded-3xl p-4 h-[75vh] overflow-y-auto border border-white/10">
            <h2 className="font-bold text-white mb-4">Friends</h2>

            <div className="relative mb-5 group">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-accent/25 via-white/5 to-accent/10 blur-xl opacity-0 group-focus-within:opacity-100 transition duration-500" />

              <div className="relative flex items-center rounded-3xl bg-white/[0.06] border border-white/10 group-focus-within:border-accent/50 group-focus-within:bg-white/[0.08] transition-all duration-300 shadow-lg shadow-black/20">
                <div className="w-11 h-11 ml-2 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center">
                  <Search size={17} className="text-muted group-focus-within:text-accent transition" />
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search friends..."
                  className="flex-1 bg-transparent px-4 py-4 text-white placeholder:text-muted outline-none text-sm font-medium"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="mr-3 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/15 text-muted hover:text-white transition"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {friends.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-white font-bold">No friends yet</p>
                <p className="text-muted text-sm mt-2">Add friends from your profile first.</p>
              </div>
            )}

            {friends.length > 0 && filteredFriends.length === 0 && (
              <p className="text-muted text-sm text-center mt-6">No friends found</p>
            )}

            {filteredFriends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => openChat(friend)}
                className={`w-full text-left p-3 rounded-2xl transition mb-2 flex items-center gap-3 border ${
                  selected?.id === friend.id
                    ? 'bg-white/10 border-accent/30'
                    : 'hover:bg-white/5 border-transparent'
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/10 flex items-center justify-center text-white font-black">
                    {friend.picture ? (
                      <img
                        src={friend.picture}
                        alt={friend.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      friend.name?.[0]?.toUpperCase() || '?'
                    )}
                  </div>

                  <span
  className={`absolute -right-1 -bottom-1 w-4 h-4 rounded-full ring-2 ring-bg ${
    friend.online ? 'bg-green-500' : 'bg-white/30'
  }`}
/>
</div>

<div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{friend.name}</div>
                  <div className="text-xs text-muted truncate">
                    @{friend.username || 'cinemii-user'}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="glass-dark rounded-3xl h-[75vh] flex flex-col border border-white/10 overflow-hidden">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <MessageCircle size={28} className="text-accent" />
                </div>
                <p className="text-white font-black text-xl">Select a friend</p>
                <p className="text-muted text-sm mt-2">
                  Choose someone from the left to start chatting.
                </p>
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-white/10 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white/10 flex items-center justify-center text-white font-black">
                    {selected.picture ? (
                      <img
                        src={selected.picture}
                        alt={selected.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      selected.name?.[0]?.toUpperCase() || '?'
                    )}
                  </div>

                  <div>
                    <div className="font-bold text-xl text-white">{selected.name}</div>
                    <div className={selected.online ? 'text-xs text-green-400' : 'text-xs text-muted'}>
  {selected.online ? 'Online' : 'Offline'}
</div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {messages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-muted text-sm">
                      No messages yet. Start the conversation.
                    </div>
                  )}

                  {messages.map((msg) => {
                    const fromFriend = msg.from_user_id === selected.id;

                    return (
                      <div
                        key={msg.id}
                        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          fromFriend
                            ? 'bg-white/10 text-white'
                            : 'gradient-accent text-white ml-auto shadow-lg shadow-accent/20'
                        }`}
                      >
                        <p>{msg.text}</p>

                        <div
                          className={`mt-1 text-[10px] flex items-center gap-2 ${
                            fromFriend ? 'text-muted' : 'text-white/70 justify-end'
                          }`}
                        >
                          <span>{formatTime(msg.created_at)}</span>

                          {!fromFriend && (
                            <span>{msg.read_at ? 'Read' : 'Sent'}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-white/10 flex gap-3">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-accent/50 transition"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendMessage();
                    }}
                  />

                  <button
                    onClick={sendMessage}
                    disabled={!text.trim()}
                    className="gradient-accent rounded-2xl px-5 flex items-center justify-center text-white disabled:opacity-40 active:scale-95 transition"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}