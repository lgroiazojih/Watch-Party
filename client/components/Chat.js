import { useState, useEffect, useRef } from 'react';

const EMOJI_LIST = ['😀', '😂', '❤️', '👍', '👏', '🔥', '🎉', '😍', '🤔', '😎', '🍿', '🎬'];

export default function Chat({ socket, roomId, user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    socket.on('chat-message', handleMessage);

    return () => {
      socket.off('chat-message', handleMessage);
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !user) return;

    const message = {
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    socket.emit('chat-message', { roomId, message });
    setNewMessage('');
    setShowEmojis(false);
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col bg-[#1a1a2e] rounded-xl border border-[#2d2d44] ${isCollapsed ? 'h-12' : 'h-full'}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d44] cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="font-medium text-white">چت</span>
          <span className="text-xs text-gray-500">({messages.length})</span>
        </div>
        <button className="text-gray-400 hover:text-white transition md:hidden">
          {isCollapsed ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scroll">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <span className="text-4xl block mb-2">💬</span>
                <p>هنوز پیامی نیست</p>
                <p className="text-sm mt-1">اولین پیام را بفرستید!</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className="flex gap-2">
                  <div className="text-2xl">{msg.avatar || '😀'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white text-sm">{msg.username}</span>
                      <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
                    </div>
                    <p className="text-gray-300 text-sm break-words">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Emoji Picker */}
          {showEmojis && (
            <div className="px-4 py-2 border-t border-[#2d2d44] bg-[#0f0f23]">
              <div className="flex flex-wrap gap-2">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="text-2xl hover:scale-125 transition p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          {user && (
            <form onSubmit={handleSend} className="p-3 border-t border-[#2d2d44]">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmojis(!showEmojis)}
                  className="text-2xl hover:scale-110 transition p-1"
                >
                  😀
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="پیام بنویسید..."
                  className="flex-1 bg-[#0f0f23] border border-[#2d2d44] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="btn-gradient px-4 py-2 rounded-lg text-white text-sm disabled:opacity-50"
                >
                  ارسال
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
