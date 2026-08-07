import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

const AVATARS = ['😀', '😎', '🤩', '😊', '🎮', '🎬', '🍿', '🎵', '🚀', '⭐', '🎯', '🎨'];

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);

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
      setUsername(data.user.username);
      setEmail(data.user.email);
      setAvatar(data.user.avatar);
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

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('رمزهای عبور جدید مطابقت ندارند');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError('رمز عبور جدید باید حداقل ۶ کاراکتر باشد');
      return;
    }

    setSaving(true);

    try {
      const body = { username, email, avatar };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطا در به‌روزرسانی');
      }

      setUser(data.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      setSuccess('پروفایل با موفقیت به‌روزرسانی شد');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
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
          <h1 className="text-2xl font-bold text-white mb-6 text-center">ویرایش پروفایل</h1>

          <form onSubmit={handleSave} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* Avatar Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">آواتار</label>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`text-3xl p-2 rounded-lg transition ${
                      avatar === a
                        ? 'bg-[#8b5cf6]/30 border-2 border-[#8b5cf6]'
                        : 'bg-[#0f0f23] border border-[#2d2d44] hover:border-[#8b5cf6]'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">نام کاربری</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-[#0f0f23] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">ایمیل</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                className="w-full bg-[#0f0f23] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition text-left"
              />
            </div>

            {/* Password Section */}
            <div className="border-t border-[#2d2d44] pt-6">
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-[#8b5cf6] hover:text-[#7c3aed] transition text-sm"
              >
                {showPasswordSection ? 'مخفی کردن تغییر رمز' : 'تغییر رمز عبور'}
              </button>

              {showPasswordSection && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">رمز عبور فعلی</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#0f0f23] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition"
                      placeholder="برای تغییر رمز، رمز فعلی را وارد کنید"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">رمز عبور جدید</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#0f0f23] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition"
                      placeholder="حداقل ۶ کاراکتر"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">تکرار رمز جدید</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#0f0f23] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition"
                      placeholder="رمز جدید را دوباره وارد کنید"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-[#0f0f23] rounded-lg p-4 text-sm text-gray-400">
              <p>تاریخ عضویت: {user?.created_at ? new Date(user.created_at).toLocaleDateString('fa-IR') : '-'}</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 btn-gradient py-3 rounded-lg text-white font-bold disabled:opacity-50"
              >
                {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
