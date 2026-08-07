import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#8b5cf6] border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      <Head>
        <title>پروفایل - WatchParty</title>
      </Head>

      <div className="max-w-2xl mx-auto">
        <div className="card p-8">
          <div className="text-center">
            <div className="text-8xl mb-4">{user?.avatar || '😀'}</div>
            <h1 className="text-2xl font-bold text-white mb-2">{user?.username}</h1>
            <p className="text-gray-400" dir="ltr">{user?.email}</p>
          </div>

          <div className="mt-8 pt-6 border-t border-[#2d2d44]">
            <div className="flex justify-between text-sm text-gray-400">
              <span>تاریخ عضویت:</span>
              <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString('fa-IR') : '-'}</span>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={handleLogout}
              className="bg-red-500/20 text-red-400 px-6 py-2 rounded-lg hover:bg-red-500/30 transition"
            >
              خروج از حساب
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
