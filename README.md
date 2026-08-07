# 🎬 WatchParty

پلتفرم تماشای گروهی ویدیو با امکانات چت متنی، ویس چت و ریکشن.

## امکانات

- ✅ ثبت نام و ورود با ایمیل
- ✅ ساخت اتاق تماشا با لینک YouTube/Dailymotion
- ✅ همگام‌سازی پخش ویدیو بین کاربران
- ✅ چت متنی real-time
- ✅ ریکشن‌های شناور
- ✅ ویس چت با WebRTC (PeerJS)
- ✅ ریسپانسیو (موبایل و دسکتاپ)
- ✅ تم تاریک زیبا

## نصب و اجرا

```bash
# نصب dependency ها
npm install

# اجرا در حالت توسعه
npm run dev

# یا اجرا در حالت production
npm run build
npm start
```

## متغیرهای محیطی

- `PORT` - پورت سرور (پیش‌فرض: 3000)
- `JWT_SECRET` - رمز مخفی برای JWT
- `DATABASE_URL` - مسیر فایل دیتابیس SQLite

## استک فنی

- Frontend: Next.js 14 + Tailwind CSS
- Backend: Express.js + Socket.io
- Database: SQLite (better-sqlite3)
- Auth: JWT + bcryptjs
- Voice: PeerJS (WebRTC)

## هاست Railway

```bash
railway up
```

---

ساخته شده با ❤️
