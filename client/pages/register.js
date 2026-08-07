import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('رمزهای عبور مطابقت ندارند');
      return;
    }

    if (password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطا در ثبت نام');
      }

      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>ثبت نام - WatchParty</title>
      </Head>

      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="card p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-5xl block mb-4">🎬</span>
            <h1 className="text-2xl font-bold text-white">ثبت نام در WatchParty</h1>
            <p className="text-gray-400 mt-2">به جمع ما بپیوندید!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                نام کاربری
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-[#0f0f23] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition"
                placeholder="نام کاربری خود را انتخاب کنید"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ایمیل
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#0f0f23] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition"
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                رمز عبور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#0f0f23] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition"
                placeholder="حداقل ۶ کاراکتر"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                تکرار رمز عبور
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-[#0f0f23] border border-[#2d2d44] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition"
                placeholder="رمز عبور را دوباره وارد کنید"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gradient py-3 rounded-lg text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'در حال ثبت نام...' : 'ثبت نام'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              قبلا ثبت نام کرده‌اید؟{' '}
              <Link href="/login" className="text-[#8b5cf6] hover:text-[#7c3aed] transition">
                وارد شوید
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
