import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import Layout from '../../components/Layout';
import VideoPlayer from '../../components/VideoPlayer';
import Chat from '../../components/Chat';
import VoiceChat from '../../components/VoiceChat';
import Reactions from '../../components/Reactions';

export default function RoomPage() {
  const router = useRouter();
  const { id } = router.query;
  const [room, setRoom] = useState(null);
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    
    checkAuth();
    fetchRoom();
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;

    const socketUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3000';

    const newSocket = io(socketUrl, {
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      newSocket.emit('join-room', { roomId: id, user });
    });

    newSocket.on('room-users', (users) => {
      setOnlineUsers(users);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave-room', id);
      newSocket.disconnect();
    };
  }, [id, user]);

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

  const fetchRoom = async () => {
    try {
      const res = await fetch(`/api/rooms/${id}`);
      if (!res.ok) {
        throw new Error('اتاق یافت نشد');
      }
      const data = await res.json();
      setRoom(data.room);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/room/${id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-[#8b5cf6] border-t-transparent mb-4"></div>
            <p className="text-gray-400">در حال بارگذاری اتاق...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !room) {
    return (
      <Layout user={user} onLogout={handleLogout}>
        <Head>
          <title>خطا - WatchParty</title>
        </Head>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="card p-8 text-center">
            <span className="text-6xl block mb-4">😔</span>
            <h1 className="text-2xl font-bold text-white mb-2">{error || 'اتاق یافت نشد'}</h1>
            <p className="text-gray-400 mb-6">ممکن است اتاق حذف شده باشد یا لینک نادرست باشد.</p>
            <button
              onClick={() => router.push('/')}
              className="btn-gradient px-6 py-3 rounded-lg text-white font-bold"
            >
              بازگشت به خانه
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const isCreator = user && room.creator_id === user.id;

  return (
    <Layout user={user} onLogout={handleLogout}>
      <Head>
        <title>{room.name} - WatchParty</title>
      </Head>

      <div className="max-w-7xl mx-auto">
        {/* Room Header */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{room.name}</h1>
            <p className="text-gray-400 text-sm">
              ساخته شده توسط {room.creator_name}
              {isCreator && <span className="text-[#8b5cf6] mr-2">(شما)</span>}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Online Users */}
            <div className="flex items-center gap-2 bg-[#1a1a2e] px-3 py-2 rounded-lg border border-[#2d2d44]">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-gray-300">{onlineUsers.length} نفر آنلاین</span>
            </div>

            {/* Copy Invite */}
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-2 bg-[#1a1a2e] px-3 py-2 rounded-lg border border-[#2d2d44] hover:border-[#8b5cf6] transition"
            >
              <span className="text-sm text-gray-300">
                {copied ? 'کپی شد!' : 'کپی لینک دعوت'}
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content - Desktop */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Video Section */}
          <div className="flex-1 lg:w-[70%]">
            {/* Video Player */}
            <div className="bg-[#1a1a2e] rounded-xl border border-[#2d2d44] overflow-hidden p-2">
              <VideoPlayer
                videoUrl={room.video_url}
                isCreator={isCreator}
                socket={socket}
                roomId={id}
              />
            </div>

            {/* Voice Chat Controls */}
            {user && (
              <div className="mt-3 bg-[#1a1a2e] rounded-xl border border-[#2d2d44] p-3">
                <VoiceChat socket={socket} roomId={id} user={user} />
              </div>
            )}

            {/* Reactions */}
            <div className="mt-3 bg-[#1a1a2e] rounded-xl border border-[#2d2d44]">
              <Reactions socket={socket} roomId={id} user={user} />
            </div>

            {/* Creator Notice */}
            {isCreator && (
              <div className="mt-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-xl p-3 text-center">
                <p className="text-sm text-[#8b5cf6]">
                  🎬 شما سازنده این اتاق هستید. کنترل پخش ویدیو در دست شماست.
                </p>
              </div>
            )}
          </div>

          {/* Chat Section */}
          <div className="lg:w-[30%] lg:min-h-[500px]">
            <Chat socket={socket} roomId={id} user={user} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
