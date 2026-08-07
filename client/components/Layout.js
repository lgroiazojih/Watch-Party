import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children, user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0f0f23]">
      {/* Header */}
      <header className="bg-[#1a1a2e] border-b border-[#2d2d44] sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              <span className="text-xl font-bold bg-gradient-to-l from-[#8b5cf6] to-[#06b6d4] bg-clip-text text-transparent">
                WatchParty
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/" className="text-gray-300 hover:text-white transition">
                خانه
              </Link>
              {user ? (
                <>
                  <Link href="/profile" className="text-gray-300 hover:text-white transition">
                    پروفایل
                  </Link>
                  <div className="flex items-center gap-2 bg-[#2d2d44] px-3 py-1.5 rounded-full">
                    <span>{user.avatar}</span>
                    <span className="text-sm">{user.username}</span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="text-gray-400 hover:text-red-400 transition text-sm"
                  >
                    خروج
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-300 hover:text-white transition">
                    ورود
                  </Link>
                  <Link href="/register" className="btn-gradient px-4 py-2 rounded-lg text-white font-medium">
                    ثبت نام
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              className="md:hidden text-white p-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="منو"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {menuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-[#2d2d44] pt-4">
              <div className="flex flex-col gap-3">
                <Link href="/" className="text-gray-300 hover:text-white transition py-2" onClick={() => setMenuOpen(false)}>
                  خانه
                </Link>
                {user ? (
                  <>
                    <Link href="/profile" className="text-gray-300 hover:text-white transition py-2" onClick={() => setMenuOpen(false)}>
                      پروفایل
                    </Link>
                    <div className="flex items-center gap-2 bg-[#2d2d44] px-3 py-2 rounded-lg w-fit">
                      <span>{user.avatar}</span>
                      <span className="text-sm">{user.username}</span>
                    </div>
                    <button
                      onClick={() => { onLogout(); setMenuOpen(false); }}
                      className="text-red-400 hover:text-red-300 transition py-2 text-right"
                    >
                      خروج
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="text-gray-300 hover:text-white transition py-2" onClick={() => setMenuOpen(false)}>
                      ورود
                    </Link>
                    <Link href="/register" className="btn-gradient px-4 py-2 rounded-lg text-white font-medium text-center" onClick={() => setMenuOpen(false)}>
                      ثبت نام
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
