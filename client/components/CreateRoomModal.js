import { useState } from 'react';
import { useRouter } from 'next/router';

export default function CreateRoomModal({ user, onClose, onRoomCreated }) {
  const [name, setName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, video_url: videoUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطا در ساخت اتاق');
      }

      onRoomCreated(data.room);
      router.push(`/room/${data.room.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">ساخت اتاق جدید</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              نام اتاق
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#0f0f23] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition"
              placeholder="مثال: فیلم شب با دوستان"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              لینک ویدیو
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              required
              className="w-full bg-[#0f0f23] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition text-left"
              placeholder="https://www.youtube.com/watch?v=..."
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-1">
              از YouTube یا Dailymotion پشتیبانی می‌شود
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#2d2d44] text-gray-300 py-3 rounded-lg hover:bg-[#3d3d54] transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-gradient py-3 rounded-lg text-white font-bold disabled:opacity-50"
            >
              {loading ? 'در حال ساخت...' : 'ساخت اتاق'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
