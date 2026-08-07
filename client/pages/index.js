import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import CreateRoomModal from '../components/CreateRoomModal';

export default function Home() {
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchRooms();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.log('Not authenticated');
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout user={user} onLogout={handleLogout}>
      <Head>
        <title>WatchParty - تماشای گروهی ویدیو</title>
      </Head>

      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-l from-[#8b5cf6] to-[#06b6d4] bg-clip-text text-transparent">
            WatchParty
          </span>
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          با دوستانتان ویدیو تماشا کنید، چت کنید و لذت ببرید!
        </p>

        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-gradient px-8 py-3 rounded-xl text-white font-bold text-lg"
          >
            + ساخت اتاق جدید
          </button>
        )}
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="جستجوی اتاق..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a2e] border border-[#2d2d44] rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition"
          />
          <svg
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Rooms List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#8b5cf6] border-t-transparent"></div>
          <p className="text-gray-400 mt-4">در حال بارگذاری...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-12 bg-[#1a1a2e] rounded-2xl border border-[#2d2d44]">
          <span className="text-6xl mb-4 block">🎬</span>
          <h3 className="text-xl font-bold text-gray-300 mb-2">
            {searchQuery ? 'اتاقی یافت نشد' : 'هنوز اتاقی وجود ندارد'}
          </h3>
          <p className="text-gray-500">
            {searchQuery ? 'با کلمه دیگری جستجو کنید' : 'اولین اتاق را بسازید!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <Link key={room.id} href={`/room/?id=${room.id}`}>
              <div className="card p-6 cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-white truncate">{room.name}</h3>
                  <span className="bg-[#8b5cf6]/20 text-[#8b5cf6] text-xs px-2 py-1 rounded-full">
                    {room.id}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                  <span>👤</span>
                  <span>{room.creator_name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    فعال
                  </span>
                  <span>{new Date(room.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateRoomModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onRoomCreated={(room) => {
            setRooms([room, ...rooms]);
            setShowCreateModal(false);
          }}
        />
      )}
    </Layout>
  );
}
