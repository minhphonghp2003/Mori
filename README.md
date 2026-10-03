# Mori (Next.js)

Mori is a mobile-first social app — real-time location sharing, chat, moments,
timelines and 1:1 voice/video calls — rebuilt as a **Next.js 16 App Router**
app on the previous production stack (Redux Toolkit, axios interceptors,
single SignalR hub, FCM/PWA), keeping the indigo/slate design system.

Backend: `Mori` (ASP.NET, separate repo). API contract:
`Mori/API-DOCUMENTATION.md`. Refactor plan:
`.claude/plans/clever-hashing-pine.md` (8 phases, all complete).

## Prerequisites

- Node.js 20+ · npm (`.npmrc` sets `legacy-peer-deps=true`)
- Backend reachable at `NEXT_PUBLIC_API_URL` with a trusted cert for the
  browser (self-signed `phongpc.local` certs must be accepted once, otherwise
  geolocation / service-worker / FCM features stay unavailable)

## Setup

```bash
cp .env.example .env   # then fill in values (API URL, Firebase, map style)
npm install
npm run dev            # http://localhost:9000
```

## Scripts

| Command | What |
|---|---|
| `npm run dev` | dev server on :9000 |
| `npm run typecheck` | `tsc --noEmit` — must pass |
| `npm run lint` | ESLint — 0 errors required |
| `npm run test:run` | vitest (single run) |
| `npm run build` | production build (15 routes) |

## Architecture

- `src/app` — routes: `/init /login /register /forgot-password /reset-password`,
  `auth/callback`, `(main)` guard (`/nearby /location /moments /chat… /settings
  /timelines/[id]`), `/offline`, `manifest.ts`
- `src/providers` — `auth`, `chat-sync` (hub lifecycle owner + global chat
  subs + reconnect re-join), `location-provider` (GPS batching), `call-provider`
  (WebRTC), `push-listener` (SW→app push bridge), offline/SW-update banners
- `src/context/AppContext.tsx` — `useApp()` facade: friends, moments,
  timelines, profile, call actions (delegated to the call controller)
- `src/services/*` — REST per API doc (`/Moment`, `/Timeline`, `/Friendship`,
  `/User`, `/Upload` presigned buckets `Profile|Moment|Chat`)
- Design components stay visually intact; data migrated mock → API phase by
  phase (no `mockData.ts` remains)

## Backend contract notes (verified against server source)

- Rate limit = **HTTP 200 + empty body** → treated as `ERR_RATE_LIMITED`
  (interceptor), never as success
- Friendship/call mutations run behind a distributed lock: `409` = transient
  (axios retries), `400` = state changed remotely (re-fetch)
- Moment reactions are **add-only** (unique moment+user+emoji, no DELETE)
- Call signaling routes by **target user id**, never by callId; the server
  mints the callId and broadcasts `{userId, userName, type, payload}`
- `GET /Moment/available` requires both dates and returns your attachable
  moments; `POST /User/me/avatar` takes a presigned `Profile` `fileId`
- Push is data-only FCM; the SW renders notifications and forwards payloads
  to a focused window via postMessage (`PUSH_DATA` / `NAVIGATE_TO_DEEP_LINK`)

## Manual E2E checklist (two browsers, accounts 88/89/90)

1. Login/logout/refresh; forced 401 → silent refresh → replay
2. Chat: send text/media/moment-share, failed-send retry, typing, reactions,
   read receipts; kill network mid-chat → reconnect resumes the stream
3. Map: live movement both sides, visibility change hides marker, denied
   permission shows the re-request card
4. Moments: create (≤10 images / 1 video) → friend sees per visibility;
   reaction appears live; processing pill clears on file success
5. Timelines: create with date-scoped moments + partners; detail journey,
   share link, owner delete
6. Calls: 1:1 audio/video connect; reject / cancel / end on both sides;
   busy auto-reject; background `call.incoming` → tap opens the app
7. PWA: install prompt, offline page, offline queue → reconnect sync toast,
   update banner on new deploy

## Known limitations

- Calls are **STUN-only** (no TURN) — symmetric-NAT networks may fail
  (same limitation as the previous app; server work, not client)
- Profile `bio` is local-only (no API field); timeline `description`/dates are
  derived client-side (caption-only API)
