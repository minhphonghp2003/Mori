---
target_identity: "file:D:\\Projects\\Work Project\\Mori\\src\\app\\(main)\\moments\\page.tsx"
target_fingerprint: "sha256:c259215654b92df99ce26669e3cbf4516334ac793b14ebdb9e16eab8c7fbdf3b"
target_path: "D:\\Projects\\Work Project\\Mori\\src\\app\\(main)\\moments\\page.tsx"
timestamp: 2026-10-08T15-01-19Z
slug: src-app-main-moments-page-tsx
---
Method: dual-agent (A: n/a · B: n/a)
⚠️ DEGRADED: single-context (no sub-agent tool exposed)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Most states covered (loading/error/empty/processing/paging/recording); no feed position, immersive/nav state invisible |
| 2 | Match System / Real World | 2 | Good Vietnamese copy, but tap-toggles-UI + double-tap swallowed breaks TikTok/IG muscle memory |
| 3 | User Control and Freedom | 2 | Esc/back/cancel exist; Hide is irreversible, no draft recovery, snap-mandatory traps scroll |
| 4 | Consistency and Standards | 2 | Own (emoji stack) vs others (heart) = two patterns for same object; 3 create affordances, mixed button styles |
| 5 | Error Prevention | 2 | Camera retry, 10-image/15s caps, delete confirms good; caption 2000 with no counter, accidental overlay toggles |
| 6 | Recognition Rather Than Recall | 2 | Long-press heart, swipe-only dots, tap-to-immerse all undiscoverable (title-tooltip only) |
| 7 | Flexibility and Efficiency | 1 | No shortcuts, no bulk/jump, one-at-a-time reels; tab-retap scroll-top is hidden |
| 8 | Aesthetic and Minimalist Design | 3 | Strong cinematic black full-bleed; right rail 5 actions + editor sheet crowd the media |
| 9 | Error Recovery | 2 | Retry states + keep-editor-open on publish fail; generic copy, deep-link 404 silent |
| 10 | Help and Documentation | 1 | No gesture coach marks; title tooltips invisible on touch |
| **Total** | | **20/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: Competent TikTok clone, not yet Mori. Black full-bleed snap feed, right action rail, bottom info overlay — an unrelated short-video product could ship this unchanged. Mori's non-copyable core (find friends + share journeys together) appears only as one small emerald timeline pill next to the location badge. No map presence warmth, no togetherness character, no Vietnamese social texture beyond copy. Missed opportunity: moments should feel date-scoped and journey-bound (Product Principle 4), not infinite anonymous reels.

**Deterministic scan**: `impeccable detect --json` over `src/app/(main)/moments/page.tsx` + `src/components/moments` returned `[]` — 0 findings, exit clean. No mechanical violations to corroborate or dispute; all issues below are heuristic/cognitive, not token/a11y-lint failures. No false positives to flag.

**Visual overlays**: No reliable user-visible overlay available. No browser automation tool is exposed in this session, so live-server injection was not attempted (fresh-tab + `document.title` mutation preflight impossible). Fallback signal is code review of `MomentsView.tsx`, `MomentReelCard.tsx` (1033 lines), `CreateMomentModal.tsx` (1052 lines), `MomentViewerModal.tsx`.

## Overall Impression

The engineering is careful (autoplay sound policy, camera swap-without-blackout, every state handled) but the UX reads as generic reels with heavy chrome. Single biggest opportunity: make posting and journey-assembly unmissable — shrink the rail, elevate Đăng + timeline binding, teach the three hidden gestures.

## What's Working

1. **Video autoplay/sound policy is genuinely thoughtful.** First activation muted, scroll-in attempts with sound + muted fallback, `playGenRef` invalidates stale play promises on fast scroll, tab-hidden pauses, tap enables sound going forward. Prevents surprise audio without dead videos.
2. **Every feed state exists.** Initial `LogoLoader`, `momentsError` retry, empty-state CTA, `processingMomentIds` pill, cursor paging indicator, camera permission retry instead of black viewport. Few social feeds handle this many edges.
3. **Capture flow is resilient.** Camera flip keeps old stream up until new acquired, 10-image cap with append-not-wipe, 15s recording cap, publish failure keeps editor open for retry, `sourceToBlob` errors preserve capture.

## Priority Issues

- **[P1] What**: Primary create (`Đăng` — `px-3.5 py-1.5 text-xs` white/20 over video, top-right) is the smallest, lowest-contrast element on screen.
  **Why it matters**: Posting is the core job (Principle 1: discovery → togetherness). On a bright video frame the glass pill washes out; thumb-reach top-right is worst for one-handed portrait PWA.
  **Fix**: Promote to bottom-center FAB (56px, emerald-600, Camera+Plus, `aria-label="Tạo khoảnh khắc"`), keep top button as secondary. Add safe-area padding, 3:1 contrast minimum over media with scrim.
  **Suggested command**: `/impeccable layout`

- **[P1] What**: Tap toggles all overlays; double-tap is swallowed; multi-image is swipe-only with `pointer-events-none` dots; reaction picker is 380ms long-press with only a `title` hint.
  **Why it matters**: Breaks TikTok/IG muscle memory (double-tap = like, tap = play/pause). First-timers will hide the UI by accident and never discover reactions or that swipe exists.
  **Fix**: Tap toggles play/pause only; dedicated Eye/EyeOff button toggles immersive; double-tap reacts ❤️ with float; add visible chevrons + tappable dots; add one-time gesture hint row ("Giữ ❤️ để chọn cảm xúc · Vuốt để xem thêm ảnh") dismissible.
  **Suggested command**: `/impeccable clarify`

- **[P1] What**: Right rail stacks 5 actions (react, Nhắn tin, Chia sẻ, visibility/Ẩn, Xóa) + counts; own moments swap heart for emoji-stack with no count, others show count.
  **Why it matters**: 5 simultaneous decisions exceeds working memory (≤4); inconsistency forces relearning per author; `max-w-[68px]` visibility label truncates ("Chỉ mình..."?).
  **Fix**: Cap rail to 3 (react, comment/Nhắn tin, Share via sheet). Move Hide/visibility/Delete into a `...` sheet. Unify reaction control: always show stack + count, tap opens viewer, long-press reacts. Full labels, no truncation.
  **Suggested command**: `/impeccable distill`

- **[P2] What**: Hide is irreversible ("không thể hoàn tác"), Delete permanent, immersive + scroll-hide makes bottom nav vanish with no exit cue.
  **Why it matters**: High-stakes destructive action with no undo; users emerging from immersive don't know where nav went (tap-to-restore undiscoverable).
  **Fix**: Hide → Undo toast 5s (client-side filter before server commit); Delete → trash 30d or confirm with typed title; immersive shows transient "Chạm để hiện điều khiển" pill once + persistent 24px grabber; scroll-hide only after 2+ reels, restore on scroll-up affordance.
  **Suggested command**: `/impeccable harden`

## Persona Red Flags

**Casey (Distracted Mobile User — primary, portrait PWA, thumb-only)**: `Đăng` top-right outside thumb zone; top dots `top-14` unreachable; editor bottom sheet forces typing + 5 sections while holding phone one-handed; video seeker `h-1` with `w-2.5` thumb misses 44px target; interruption loses capture (no draft persistence on refresh/modal close).

**Jordan (Confused First-Timer)**: No cue that holding ❤️ opens 6 emojis, dots mean swipe, or tap hides UI. After accidental tap-hide, screen is media-only with zero chrome — Jordan thinks app crashed. Visibility Eye icon + truncated label ("Quyền xem" fallback) doesn't explain tiers; friend-strip allow/block uses check/X badges with strikethrough name — ambiguous.

**Sam (Accessibility-Dependent, keyboard + screen reader)**: Rail buttons rely on `title` (no `aria-label`); emoji picker has no focus trap/arrow-key nav; range inputs tiny with no `aria-valuetext` time announcement; `white/70` over video fails 4.5:1; autoplay/mute state not announced (`aria-live` missing); snap-mandatory keyboard trap — tab order jumps reels with no skip link; `line-clamp-3` caption has no expand.

## Minor Observations

- Video controller offsets (`bottom-11`/`bottom-12` vs info `bottom-5`/`bottom-6`) drift by 1 unit; time labels `text-[10px] font-mono` barely legible.
- Location `max-w-[170px]` + timeline `max-w-[180px]` both truncate on narrow 360px devices; side-by-side wrap pushes caption off-screen.
- Processing pill `top-16` collides with multi-image dots `top-14` on same axis.
- `z-25` (dots) vs `z-20/30/40/50` soup; timeline modal uses `fixed` inside snap container — scroll bleed risk.
- Fallback demo media (`unsplash`, `mixkit-waves`) can leak to production if camera/recorder fails.
- Own moments show no reaction count (only stack); others show count — analytics gap for owners.
- `animate-float-emoji text-7xl` with no `prefers-reduced-motion` guard.
- Caption `maxLength={2000}` with no counter; `role="switch"` rows are `<button>` without `aria-checked` sync on inner state? (checked — present, good).

## Questions to Consider

- What if the timeline badge — not the heart — were the primary action, since journeys (not likes) are Mori's moat?
- Does this need to feel like TikTok at all, or should moments feel like shared journey cards with partners and dates up front?
- What would a confident one-thumb version look like: 3 rail actions, bottom FAB, no top chrome?

## Cognitive Load

6/8 checklist failures = high load. Fails: single focus (rail + badges + controller + Đăng compete), chunking (>4 ungrouped rail items), visual hierarchy (media vs chrome tie), one-thing-at-a-time (editor sheet = caption+location+DM+visibility+friends at once), minimal choices (5 rail + 6 emoji visible), progressive disclosure (everything shown, immersive hidden without teaching). Passes: grouping (info bottom-left, actions right rail). Decision points >4: rail (5), emoji picker (6), friend strip (N). Working-memory bridge: image index + exclusion map must be remembered across sheet scroll.
