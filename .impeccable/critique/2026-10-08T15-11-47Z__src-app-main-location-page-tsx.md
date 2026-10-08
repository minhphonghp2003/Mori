---
target_identity: "file:D:\\Projects\\Work Project\\Mori\\src\\app\\(main)\\location\\page.tsx"
target_fingerprint: "sha256:b6abee60e9a31645b00129b72b3ac02dc06bb2a4be4c0fe1581eb88b1776ba04"
target_path: "D:\\Projects\\Work Project\\Mori\\src\\app\\(main)\\location\\page.tsx"
timestamp: 2026-10-08T15-11-47Z
slug: src-app-main-location-page-tsx
---
Method: dual-agent (A: inline-fallback · B: inline-fallback)
Target: `src/app/(main)/location/page.tsx` → `src/components/map/LocationView.tsx` + `MarkerDetailDialog.tsx`
Mode: Operate (on-the-go discovery task, mobile portrait PWA)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Live GPS + denied card + fallback tiles good; no filter counts, no loading for friendship refetch |
| 2 | Match System / Real World | 3 | Natural Vietnamese + map metaphors; fallback leaks `NEXT_PUBLIC_MAP_STYLE_URL` to users |
| 3 | User Control and Freedom | 2 | Center-once + persist view good; visibility broadcast instant, no undo |
| 4 | Consistency and Standards | 2 | Emerald system coherent; tier 1 = tier 4 emerald duplicate, `confirm()` breaks visual language |
| 5 | Error Prevention | 2 | Stealth tier exists; one tap can go Public, marker tap targets 40px overlap |
| 6 | Recognition Rather Than Recall | 2 | Filters visible; ring-color legend missing, status-edit hidden behind self-marker tap |
| 7 | Flexibility and Efficiency | 2 | No search/list alternative, no shortcuts, zoom-only controls |
| 8 | Aesthetic and Minimalist Design | 2 | Every marker carries a status bubble — 100 seeded users = wall of pills |
| 9 | Error Recovery | 2 | Denied-card retry + fallback style good; native `confirm()` for unfriend, silent empty-status save |
| 10 | Help and Documentation | 2 | Denied card is good contextual help; no marker legend, no gesture hint, no empty-filter guidance |
| **Total** | | **22/40** | **Acceptable** |

## Design Specificity Verdict

**Start here.** Authored for Mori's togetherness job, not interchangeable — live presence + Vietnamese status bubbles + 5-tier Vietnamese privacy + relationship rings (lover/best-friend) + marker → moments/timelines profile sheet is product-specific.

**LLM assessment**: Coherence is strong around emerald presence + bottom-nav map FAB. Structural sameness risk is low; few social apps fuse map + friendship-type picker + date-scoped timelines in one sheet. Category-interchangeable choices: generic MapLibre canvas with default positron fallback, generic pill tabs (Tất cả/Bạn bè/Người lạ), generic +/- zoom stack. Missed character: no journey/meetup cue on the map itself — discovery does not point at togetherness (no meetup CTA, no timeline hint until you open a marker).

**Deterministic scan**: `impeccable detect --json` on `page.tsx`, `LocationView.tsx`, `MarkerDetailDialog.tsx`, `BottomNav.tsx` → `[]` (exit 0, clean). No mechanical a11y/contrast/structure hits to confirm or rebut. Browser overlay not run — no browser automation exposed in this session, so no `[Human]` tab overlays; fallback signal is code inspection only.

## Overall Impression

Thoughtful plumbing (center-once, persist view, batched GPS, stealth tier, denied-card retry) let down by trust-critical visual encoding and marker overload. Single biggest opportunity: make Public vs Friends unmistakable and declutter the canvas — everything else is polish until that is safe.

## What's Working

- **Presence with control, close at hand**: top-right visibility badge + shield on self-avatar + in-map privacy modal mirrors Settings (`VISIBILITY_OPTIONS`). Fast path to check/change who sees you without leaving the map.
- **Anti-yank map behavior**: `centeredOnceRef` + `MAP_VIEW_KEY` persist + `reuseMaps` + fallback Carto style. Revisits resume where you left, GPS updates do not drag the canvas.
- **Denied → action, not dead-end**: `locationDenied` card explains why ("Cho phép quyền vị trí để hiển thị bạn…") with one-tap `Bật quyền` dispatching `LOCATION_RETRY_EVENT`. Correct Operate pattern for a permission-gated surface.

## Priority Issues

- **[P1] What**: Wall of status bubbles, zero declutter.
  **Why it matters**: Seed is `take: 100`; every marker renders `-top-9 whitespace-nowrap` bubble. At zoom 12.5 bubbles collide, hide the map, and force pan/zoom hunting. Users miss nearby friends.
  **Fix**: Cluster or cap bubbles: show bubbles only ≥ zoom 14 or for ≤8 in viewport, otherwise avatar-only + count badge. Add filter counts (`Bạn bè (12)`).
  **Suggested command**: /impeccable layout

- **[P1] What**: Public and Friends share identical emerald badge/ring.
  **Why it matters**: `getVisibilityInfo(1)` and `(4)` return the same `badgeClass`/`dotClass` emerald; marker `ring-emerald-500` for both friend and stranger. High-stakes privacy state looks identical to safe state — user can broadcast publicly believing they are friends-only.
  **Fix**: Unique Public treatment (e.g., slate/indigo globe + striped ring), unique stranger ring (slate), keep emerald for friends only. Add legend row in privacy modal.
  **Suggested command**: /impeccable colorize

- **[P1] What**: One-tap instant broadcast, no confirm/undo.
  **Why it matters**: `updateVisibility(opt.value)` fires on tap + closes modal. A mis-tap to Công khai is live immediately with no "You are now visible to strangers" confirm or 5s undo.
  **Fix**: Two-step for tier escalation (0→4, 1→4): inline confirm row + toast with Hoàn tác. De-escalation stays instant.
  **Suggested command**: /impeccable harden

- **[P2] What**: Hidden + pointer-only editing.
  **Why it matters**: Status edit lives behind self-marker `div onClick` with no role/tabIndex/label; shield badge uses nested `onClick + stopPropagation`; markers are `div` inside MapLibre, unreachable by keyboard/screen-reader; modal closes `w-7 h-7` (28px) and sheet X `w-8 h-8` miss 44px. Sam cannot complete the primary flow keyboard-only.
  **Fix**: Real `<button>` markers or list alternative, `aria-label` per user, Esc to close, focus trap, 44px close targets, visible "Đổi trạng thái" affordance.
  **Suggested command**: /impeccable audit

## Persona Red Flags

**Casey (Distracted Mobile, one-handed, portrait PWA)**: Top bar crowds 360px — 3 tabs + visibility pill in `inset-x-3` truncate; right-rail zoom stack sits `bottom-6` above BottomNav but within thumb-stretch; marker avatars 40px with overlapping bubbles cause mis-taps while walking. No state-resume hint after interruption beyond map-view persist.
**Jordan (First-Timer)**: First 5 seconds show map + 3 filters with no counts and no "tap avatar → profile → Nhắn tin/Kết bạn" cue; permission rationale appears only *after* denial; fallback "Thiếu NEXT_PUBLIC_MAP_STYLE_URL" is developer jargon. Will stall at "what do I tap?".
**Sam (Keyboard/Screen-reader)**: Markers, status bubble, shield badge all pointer-only `div/onClick`; no focus indicators; `confirm()` for Hủy kết bạn breaks SR flow; relationship segmented control has no `aria-pressed`; images have `alt=name` but bubbles convey status via color + tiny text with no accessible name.

## Minor Observations

- Dead icon spans in other-user bubbles (`isLover/isBestFriend/isStranger` render empty `<span/>`) — remove or restore heart/star/globe cue.
- Duplicate destructive affordance on timeline cards (overlay trash + footer Xóa) in the same card.
- `confirm()` for unfriend breaks dark-mode visual language; replace with in-sheet destructive confirm.
- Privacy modal option rows truncate `desc` (`truncate`) — full sentence never readable.
- Status quick chips (`Đang cafe…`) good, but 45-char counter has no over-limit prevention message.
- `w-13 h-13`, `w-15 h-15`, `scale-108`, `ring-3` are non-standard Tailwind values — verify they resolve or replace with scale.

## Questions to Consider

- What if Public looked dangerous and Friends looked safe, instead of both emerald?
- Does the map need to show 100 statuses at once, or 8 that matter near me?
- What would a confident first 5 seconds say: "12 bạn gần bạn — chạm avatar để nhắn tin"?
