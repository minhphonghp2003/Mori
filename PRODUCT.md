# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: strangers seeking friends, couples, nearby meetup groups, event-goers, and travellers — on mobile, in Vietnam (UI language `vi`).

Situation and job: on-the-go discovery and togetherness — find nearby people, meet up, keep chatting, share live location, post moments, and assemble shared journeys (timelines), with 1:1 voice/video calls for close contacts.

## Product Purpose

Mori is a mobile-first social app for real-time location sharing, nearby discovery, chat, moments, timelines, and 1:1 voice/video calls — rebuilt as a Next.js 16 App Router app on the previous production stack (Redux Toolkit, axios interceptors, single SignalR hub, FCM/PWA).

Success means a stranger becomes a friend met nearby, then stays connected through live presence, chat, moments, and shared timelines — not a one-off map view.

## Positioning

The non-copyable core: ability to find friends and share journeys together in one place.

Instead of Zalo/Messenger/Instagram + Maps used separately, Mori fuses nearby/people discovery + live location presence + chat + date-scoped moments with partners into shareable timelines, delivered as a lightweight installable PWA with offline resilience and push.

## Operating Context

Mobile portrait standalone PWA (`display: standalone`, `orientation: portrait`, `lang: vi`), entry `/` resumes `last_page` or `/location`.

Routes: `/init`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `auth/callback`, guarded `(main)` (`/nearby`, `/location`, `/moments`, `/chat`, `/chat/[id]`, `/settings`, `/timelines/[id]`), `/offline`.

Providers: `auth`, `chat-sync` (SignalR hub lifecycle owner + global chat subs + reconnect re-join), `location-provider` (GPS batching), `call-provider` (WebRTC), `push-listener` (SW to app bridge via `postMessage` `PUSH_DATA` / `NAVIGATE_TO_DEEP_LINK`), offline and SW-update banners.

Services: REST per backend contract (`/Moment`, `/Timeline`, `/Friendship`, `/User`, `/Upload` presigned buckets `Profile|Moment|Chat`).

Backend: `Mori` ASP.NET repo (separate), contract `Mori/API-DOCUMENTATION.md`, reachable at `NEXT_PUBLIC_API_URL`. Geolocation / service-worker / FCM require a trusted cert — self-signed `phongpc.local` certs must be accepted once.

## Capabilities and Constraints

Confirmed capabilities: nearby discovery, live location sharing with visibility toggle, chat text/media/moment-share with typing, reactions, read receipts, failed-send retry and reconnect resume; moments create (≤10 images / 1 video) with visibility and live reactions; timelines create with date-scoped moments + partners, detail journey, share link, owner delete; 1:1 audio/video calls with reject/cancel/end and busy auto-reject; PWA install prompt, offline page, offline queue with reconnect sync toast, update banner.

Durable technical constraints: separate ASP.NET backend; calls are STUN-only (symmetric-NAT may fail); moment reactions are add-only (unique moment+user+emoji, no DELETE); friendship/call mutations run behind a distributed lock (`409` = transient retry, `400` = re-fetch); rate limit surfaces as HTTP 200 + empty body → `ERR_RATE_LIMITED`; call signaling routes by target user id (server mints callId, broadcasts `{userId, userName, type, payload}`); `GET /Moment/available` requires both dates; `POST /User/me/avatar` takes a presigned `Profile` `fileId`; push is data-only FCM rendered by the SW; profile `bio` is local-only (no API field); timeline `description`/dates are derived client-side (caption-only API).

Terminology: moments (media posts), timelines (date-scoped journeys with partners), nearby/location (live map presence), chat (1:1 conversations).

Open decisions: moderation/safety and reporting/blocking expectations for stranger discovery; timeline sharing visibility defaults — recorded as undecided, do not invent.

## Brand Commitments

Name: Mori (`MoriDev` manifest name, `Mori` short name, `NEXT_PUBLIC_APP_NAME ?? Mori`).

Voice: Vietnamese. Tagline: "Gần nhau hơn. Gặp gỡ xung quanh. Trò chuyện ngay — mạng xã hội chia sẻ vị trí thời gian thực, khoảnh khắc và hành trình."

Identity constraints on hand: Plus Jakarta Sans (`vietnamese`, `latin`; 400–800; `--font-plus-jakarta`); indigo/slate system — theme `#4f46e5`, light bg `#f8fafc`, dark near-black `#09090b` with slate surfaces shifted toward black; PWA shortcuts Bản đồ `/location`, Khoảnh khắc `/moments`, Nhắn tin `/chat`.

No binding aesthetic direction beyond the incumbent implementation was given during init.

## Evidence on Hand

Paths: `README.md` (stack, routes, contract notes, E2E checklist), `src/app` routes and `layout.tsx` metadata/viewport, `manifest.ts`, `globals.css`, `src/services/*`, `src/providers/*`, `src/context/AppContext.tsx`, `public/icon-192x192.png`, `public/icon-512x512.png`, `public/apple-touch-icon.png`, `public/maskable-icon-*.png`, `public/screenshot-mobile.png`, `public/screenshot-wide.png`, `public/loading.webm`.

Absences future work must not fabricate: no testimonials, customers, benchmarks, pricing, licensing, or deployment claims on hand.

## Product Principles

1. Discovery leads to togetherness — nearby finding is only valuable when it turns into meetups and shared journeys.
2. Live presence with control — real-time location, typing, and call presence are always paired with visibility and permission controls.
3. Lightweight and resilient — installable PWA, offline queue, reconnect resume, and data-only push over app-store weight.
4. Journeys over posts — moments gain meaning when assembled into date-scoped timelines with partners.
