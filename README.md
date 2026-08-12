# Calorie Tracker

A first [Cursor](https://cursor.com) project — learning the tool by shipping something I’d actually use.

## Why

MyFitnessPal works, but it’s crowded: ads, endless features, friction for a simple job.

This app is the opposite. A **PWA** first (install on iPhone from Safari, no App Store). Track calories and macros without the noise. Lean UI, private data on device, nothing else in the way.

## What’s in place

- **Home calendar** — days colored green / yellow / red from calorie band *and* protein target (too low or too high both matter)
- **Day journal** — breakfast, lunch, dinner by default; add named snacks
- **Food logging** — Open Food Facts search (FR-friendly) + manual entry + saved custom foods
- **Label photo (optional)** — take a nutrition-label photo → Mistral OCR prefills the manual form (**BYOK**: paste your own Mistral API key in Settings; stored on-device only)
- **Calories + macros only** — protein, carbs, fat
- **Settings** — Mifflin–St Jeor profile, daily calorie goal, protein g/kg, optional Mistral key
- **FR / EN** — language switch for demos (kept secondary in settings)
- **Backup** — export / import JSON (IndexedDB is local to the device; API keys are never exported)
- **Deployed** as a Vercel PWA

## Label photo (BYOK)

1. Create a Mistral API key
2. In the app: **Settings → Mistral API key** → paste once (persists on this device)
3. Add food → **Manual** → **Label photo** → Extract → review fields → Add

No server-side Mistral key. Each user pays their own quota. Without a key, the rest of the app still works; photo controls stay hidden.

## Likely next

- Barcode scan
- Sync across devices (optional cloud)
- MyFitnessPal import
- Cleaner custom domain
- Stronger offline / install polish
- Macro goals beyond protein (if they stay useful, not clutter)

## Stack

Next.js · TypeScript · Dexie (IndexedDB) · Open Food Facts · Mistral OCR (optional) · Vercel

## Run locally

```bash
npm install
npm run dev
```

## Install on iPhone

Open the deployed URL in Safari → Share → **Add to Home Screen**.
