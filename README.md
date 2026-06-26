# Al Nour — Islamic PWA

Progressive Web App for daily Islamic practice. Prayer times calculated locally for any location, a full Quran reader, Qibla compass and background push notifications for each prayer — works offline once installed.

---

## Features

**Prayer times**
- Accurate calculation using latitude/longitude — no external API needed
- Push notification for each prayer, fires in the background even when the app is closed
- Multiple calculation methods (MWL, ISNA, Egypt, Makkah, Karachi...)

**Quran reader**
- Full text with Arabic display
- Verse-by-verse navigation
- Bookmarks persisted in localStorage

**Qibla compass**
- Uses the device magnetometer (`DeviceOrientationEvent`)
- Shows degrees to Mecca and a visual compass

**PWA**
- Installable on iOS and Android
- Offline-first — service worker caches all assets and Quran data
- GDPR compliant cookie consent

---

## Tech stack

| | |
|---|---|
| Framework | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Push notifications | Web Push API + Vercel Edge Functions |
| Storage | localStorage + KV (Vercel KV) |
| Deploy | Vercel |

---

## Getting started

```bash
npm install
npm run dev
```

For push notifications to work locally you need a `.env.local`:

```
VAPI_PUBLIC_KEY=your_vapid_public_key
VAPI_PRIVATE_KEY=your_vapid_private_key
```

---

Built by [itzSecretProject](https://github.com/itzSecretProject)
