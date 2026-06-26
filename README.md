# Al Nour — Islamic Companion App

A full-featured Progressive Web App built for Muslims who want a clean, modern, and offline-capable Islamic companion on any device.

## Features

- **Prayer Times** — Auto-detected location, accurate calculation methods, adhan notifications
- **Quran** — Full Quran with word-by-word translation and memorization mode
- **Qibla Compass** — Real-time direction using device magnetometer and Leaflet maps
- **Adhkar & Duas** — Morning/evening adhkar, post-prayer duas, and curated dua collections
- **Tasbih Counter** — Digital counter with haptic feedback
- **Hijri Calendar** — Full Hijri/Gregorian calendar with Islamic events
- **Prayer Tracker** — Log and track your daily salah consistency
- **99 Names of Allah** — Full list with meanings and pronunciation
- **Hajj & Umrah Guide** — Step-by-step ritual guide
- **Khatmah** — Group Quran completion tracking
- **Learn to Pray** — Beginner-friendly prayer tutorial
- **Monthly Timetable** — Printable prayer schedule
- **Community** — Shared goals and group features via Supabase
- **Push Notifications** — Background prayer reminders (PWA)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 |
| Animation | Motion (Framer) |
| Backend | Supabase (auth + realtime DB) |
| Maps | Leaflet |
| Notifications | Web Push API |
| Deployment | Vercel |

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your GEMINI_API_KEY and Supabase credentials to .env.local

# Start dev server
npm run dev
```

App runs at `http://localhost:3000`

## Environment Variables

```
GEMINI_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

## Deployment

Configured for Vercel out of the box via `vercel.json`. Push to your connected branch and it deploys automatically.

```bash
npm run build    # production build
npm run preview  # preview production build locally
```

## License

Copyright (c) 2025 itzSecretProject. All rights reserved.

This source code is provided for viewing purposes only. No part of this project — including its source code, design, assets, or concepts — may be copied, modified, distributed, sublicensed, or used in any form without explicit written permission from the author.

See [LICENSE](./LICENSE) for full terms.
