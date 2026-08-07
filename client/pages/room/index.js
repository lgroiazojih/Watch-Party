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
  
  // Password verification
  const [needsPassword, setNeedsPassword] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  // Control access
  const [hasControl, setHasControl] = useState(false);
  const [controlUsers, setControlUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showControlModal, setShowControlModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    checkAuth();
    fetchRoom();
  }, [id]);

  useEffect(() => {
    if (!id || !user || needsPassword) return;

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

    // Listen for control updates
    newSocket.on('control-updated', (data) => {
      if (data.userId === user.id) {
        setHasControl(data.granted);
      }
      fetchControlUsers();
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave-room', id);
      newSocket.disconnect();
    };
  }, [id, user, needsPassword]);

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
      
      if (data.room.is_private) {
        setNeedsPassword(true);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const verifyPassword = async () => {
    setVerifying(true);
    setPasswordError('');
    
    try {
      const res = await fetch(`/api/rooms/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: roomPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'رمز عبور اشتباه است');
      }

      setNeedsPassword(false);
      fetchControlUsers();
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const fetchControlUsers = async () => {
    try {
      const res = await fetch(`/api/rooms/${id}/controls`);
      const data = await res.json();
      setControlUsers(data.controls || []);
      
      // Check if current user has control
      if (user) {
        const isCreator = room?.creator_id === user.id;
        const hasAccess = data.controls?.some(c => c.user_id === user.id);
        setHasControl(isCreator || hasAccess);
      }
    } catch (err) {
      console.error('Error fetching controls:', err);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setAllUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const grantControl = async (userId) => {
    try {
      const res = await fetch(`/api/rooms/${id}/grant-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        socket?.emit('control-granted', { roomId: id, userId });
        fetchControlUsers();
      }
    } catch (err) {
      console.error('Error granting control:', err);
    }
  };

  const revokeControl = async (userId) => {
    try {
      const res = await fetch(`/api/rooms/${id}/revoke-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        socket?.emit('control-revoked', { roomId: id, userId });
        fetchControlUsers();
      }
    } catch (err) {
      console.error('Error revoking control:', err);
    }
  };

  const openControlModal = () => {
    fetchAllUsers();
    setShowControlModal(true);
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/room/?id=${id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Password verification screen
  if (needsPassword && !loading) {
    return (
      <Layout user={user} onLogout={handleLogout}>
        <Head>
          <title>ورود به اتاق خصوصی - WatchParty</title>
        </Head>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="card p-8 w-full max-w-md text-center">
            <span className="text-6xl block mb-4">🔒</span>
            <h1 className="text-2xl font-bold text-white mb-2">اتاق خصوصی</h1>
            <p className="text-gray-400 mb-6">برای ورود رمز عبور را وارد کنید</p>
            
            {passwordError && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                {passwordError}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="password"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                className="w-full bg-[#0f0f23] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition"
                placeholder="رمز عبور اتاق"
                onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
              />
              <button
                onClick={verifyPassword}
                disabled={verifying || !roomPassword}
                className="w-full btn-gradient py-3 rounded-lg text-white font-bold disabled:opacity-50"
              >
                {verifying ? 'در حال بررسی...' : 'ورود'}
              </button>
              <button
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white transition text-sm"
              >
                بازگشت به خانه
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

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
  const canControl = isCreator || hasControl;

  return (
    <Layout user={user} onLogout={handleLogout}>
      <Head>
        <title>{room.name} - WatchParty</title>
      </Head>

      <div className="max-w-7xl mx-auto">
        {/* Room Header */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {room.name}
              {room.is_private && <span title="اتاق خصوصی">🔒</span>}
            </h1>
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

            {/* Control Access (Creator only) */}
            {isCreator && (
              <button
                onClick={openControlModal}
                className="flex items-center gap-2 bg-[#1a1a2e] px-3 py-2 rounded-lg border border-[#2d2d44] hover:border-[#06b6d4] transition"
              >
                <span className="text-sm text-gray-300">🎮 مدیریت کنترل</span>
              </button>
            )}

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
                isCreator={canControl}
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

            {/* Creator/Control Notice */}
            {isCreator && (
              <div className="mt-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-xl p-3 text-center">
                <p className="text-sm text-[#8b5cf6]">
                  🎬 شما سازنده این اتاق هستید. کنترل پخش ویدیو در دست شماست.
                </p>
              </div>
            )}
            {hasControl && !isCreator && (
              <div className="mt-3 bg-[#06b6d4]/10 border border-[#06b6d4]/30 rounded-xl p-3 text-center">
                <p className="text-sm text-[#06b6d4]">
                  🎮 شما اجازه کنترل پخش ویدیو را دارید.
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

      {/* Control Management Modal */}
      {showControlModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">🎮 مدیریت کنترل</h2>
              <button
                onClick={() => setShowControlModal(false)}
                className="text-gray-400 hover:text-white transition p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              به کاربران اجازه دهید پخش ویدیو را کنترل کنند
            </p>

            {/* Users with control */}
            {controlUsers.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">کاربران با دسترسی کنترل:</h3>
                <div className="space-y-2">
                  {controlUsers.map((cu) => (
                    <div key={cu.user_id} className="flex items-center justify-between bg-[#0f0f23] p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cu.avatar}</span>
                        <span className="text-white text-sm">{cu.username}</span>
                      </div>
                      <button
                        onClick={() => revokeControl(cu.user_id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded"
                      >
                        لغو دسترسی
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All users */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">دادن دسترسی به:</h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {allUsers.filter(u => !controlUsers.some(cu => cu.user_id === u.id)).map((u) => (
                  <div key={u.id} className="flex items-center justify-between bg-[#0f0f23] p-2 rounded-lg hover:bg-[#1a1a2e] transition">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{u.avatar}</span>
                      <span className="text-white text-sm">{u.username}</span>
                    </div>
                    <button
                      onClick={() => grantControl(u.id)}
                      className="text-[#06b6d4] hover:text-[#0891b2] text-xs px-2 py-1 rounded"
                    >
                      دادن دسترسی
                    </button>
                  </div>
                ))}
                {allUsers.filter(u => !controlUsers.some(cu => cu.user_id === u.id)).length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">هیچ کاربر دیگری آنلاین نیست</p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#2d2d44]">
              <button
                onClick={() => setShowControlModal(false)}
                className="w-full bg-[#2d2d44] text-gray-300 py-2 rounded-lg hover:bg-[#3d3d54] transition"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
