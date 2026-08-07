import { useState, useEffect } from 'react';

const REACTIONS = [
  { emoji: '❤️', label: 'قلب' },
  { emoji: '👍', label: 'لایک' },
  { emoji: '😂', label: 'خنده' },
  { emoji: '👏', label: 'تشویق' },
  { emoji: '🔥', label: 'آتش' },
];

export default function Reactions({ socket, roomId, user }) {
  const [floatingReactions, setFloatingReactions] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleReaction = (data) => {
      const id = Date.now() + Math.random();
      const reaction = {
        id,
        emoji: data.emoji,
        x: Math.random() * 80 + 10,
        user: data.user,
      };

      setFloatingReactions((prev) => [...prev, reaction]);

      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2000);
    };

    socket.on('reaction', handleReaction);

    return () => {
      socket.off('reaction', handleReaction);
    };
  }, [socket]);

  const handleReaction = (emoji) => {
    if (!socket || !user) return;

    socket.emit('reaction', { roomId, emoji });

    const id = Date.now();
    setFloatingReactions((prev) => [
      ...prev,
      { id, emoji, x: Math.random() * 80 + 10, user },
    ]);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  return (
    <div className="relative">
      {/* Floating Reactions */}
      <div className="absolute bottom-16 left-0 right-0 h-40 pointer-events-none overflow-hidden">
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="reaction-float absolute bottom-0"
            style={{ left: `${reaction.x}%` }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      {/* Reaction Buttons */}
      <div className="flex items-center justify-center gap-2 md:gap-3 py-3">
        {REACTIONS.map(({ emoji, label }) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="text-2xl md:text-3xl hover:scale-125 active:scale-95 transition-transform p-2 rounded-lg hover:bg-[#2d2d44]"
            title={label}
            disabled={!user}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
