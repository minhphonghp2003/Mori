---
target: home (/nearby) page
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:D:\\Projects\\Work Project\\Mori\\src\\app\\(main)\\nearby\\page.tsx"
target_fingerprint: "sha256:b097e4a8ce921f5b847fb6d7643457ed9a47fc0a9f93cf8fd055d0fbc2767e3e"
target_path: "D:\\Projects\\Work Project\\Mori\\src\\app\\(main)\\nearby\\page.tsx"
timestamp: 2026-10-08T14-52-27Z
slug: src-app-main-nearby-page-tsx
---
⚠️ DEGRADED: single-context (no sub-agent tool exposed — Assessments A and B run sequentially inline)

Method: degraded single-context. Assessment A: inline code review of `src/app/(main)/nearby/page.tsx`, `src/components/home/HomeView.tsx`, `src/components/common/BottomNav.tsx`, `src/components/map/MarkerDetailDialog.tsx`, `src/components/chat/FirstMessageModal.tsx`, `src/components/layout/MobileShell.tsx`. Assessment B: `impeccable detect --json` on `src/components/home` + `BottomNav.tsx` + `FirstMessageModal.tsx`. No browser automation exposed in this session — no live overlay, no console capture.

Mode: Operate (on-the-go nearby discovery → meetup/chat). All 10 heuristics scored. Target: `/nearby` → `src/app/(main)/nearby/page.tsx` → `HomeView.tsx`. Slug: `nearby`.

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Infinite-scroll failure is silent (`console.error` only); no retry, no toast, no result count |
| 2 | Match System / Real World | 2 | Fallback bio `Cốc cốc cốc mở cửa cho anh đê` ships as real content; age 0 silently hidden |
| 3 | User Control and Freedom | 3 | Filter reversible, modal has backdrop/X/Hủy, active-tab scroll-to-top works; minor gaps |
| 4 | Consistency and Standards | 3 | Emerald system coherent; gender pastel dots and 10–11px type weaken the system |
| 5 | Error Prevention | 2 | No guardrails on fetch failure / offline greet; stopPropagation on Nhắn button is the one good guard |
| 6 | Recognition Rather Than Recall | 2 | Distance hidden when null/0 with no explanation; gender icon is title-tooltip only |
| 7 | Flexibility and Efficiency | 2 | Virtualized list is fast but no search/sort, row `div onClick` has no keyboard path |
| 8 | Aesthetic and Minimalist Design | 3 | Compact cards, sticky blur filter bar; weak hierarchy (12px name vs 11px bio) |
| 9 | Error Recovery | 2 | Empty state names the fix ("thử bộ lọc khác") but fetch errors leave stale/blank UI |
| 10 | Help and Documentation | 2 | No inline help for distance/presence/safety; stranger-discovery safety is undecided per PRODUCT.md |
| **Total** | | **23/40** | **Acceptable** (50%+ band; 57.5%) |

#### Design Specificity Verdict

**LLM assessment**: Category-interchangeable social-discovery list. Structure (avatar + name + distance chip + Nhắn button + gender chips) could ship unchanged in any friend-finder. It does not express Mori's non-copyable core from PRODUCT.md — "find friends and share journeys together": no journey/timeline cue, no togetherness cue, no map-presence cue on this home surface. The only authored moments are the emerald system and the BottomNav center map FAB (which lives outside this view). The joke fallback bio actively works against specificity — it reads as placeholder, not voice.

**Deterministic scan**: `detect --json src/components/home` → clean (0 findings). Broader scope (`BottomNav.tsx` + `FirstMessageModal.tsx`) → 2 warnings, both `gray-on-color` in `FirstMessageModal.tsx:86` (`text-slate-600` / `text-slate-300` on `hover:bg-emerald-50`). Real but low-impact: preset-chip hover washes text. No findings in `HomeView.tsx` itself — the detector missed the semantic issues below (fake bio, silent fetch failure, div-click row) because they are product-logic, not markup antipatterns.

**Visual overlays**: No browser automation exposed in this session, so no `[Human]` tab overlay was injected and no `impeccable` console messages were read. Fallback signal is code + detector JSON above. A viewable-target check on a real device (portrait PWA, `max-w-md`, `100dvh`) is still owed — especially 10–11px type and the 10px presence dot at 200% zoom.

#### Overall Impression

Fast, tidy, forgettable. The virtualized infinite list and sticky 3-chip filter do the job, but the surface over-promises ("Gần bạn") and under-delivers: order is server `userId desc`, not distance; distance chips vanish without explanation; empty bios get a joke string; failures go silent. Single biggest opportunity: make "nearby" feel true — sort/explain distance, replace fake content with honest empties, and surface failure with retry.

#### What's Working

1. **Virtualized infinite scroll with bounded recovery** (`HomeView.tsx:184-190, 104-123`). `estimateSize 72 / overscan 6`, `take=50` cursor + `emptyStreakRef < 4` fresh-shuffle retry. Right call for a 50-per-page roster on low-end mobile — only viewport rows mount.
2. **Sticky filter + active-tab scroll-to-top** (`HomeView.tsx:222, 149-154` + `BottomNav.tsx:31-36`). Filter stays reachable while scrolling; re-tapping `Gần bạn` fires `requestScrollTop()`. Small Operate detail that respects thumb-zone return-to-top.
3. **Presence + distance chips are glanceable** (`HomeView.tsx:293-299, 319-324`). Emerald dot vs slate dot + `formatDistance` (`523 m` / `1.2 km` ceil) gives the one live-presence signal this surface needs. Keep this language.

#### Priority Issues

- **[P1] What**: Fake-bio fallback + suppressed age/distance. `HomeView.tsx:328` renders `'Cốc cốc cốc mở cửa cho anh đê'` when `bio` is empty; `age: 0` hardcoded (`HomeView.tsx:165`) then hidden (`user.age > 0`); `distanceM` hidden when falsy with no reason.
- **Why it matters**: Strangers judge strangers on this line. A joke string reads as the person's words — trust break on first viewport. Hidden age/distance with no explanation reads as broken data ("why does she have no distance?").
- **Fix**: Empty bio → neutral honest empty (`—` or `Chưa có giới thiệu`, styled muted italic), never a joke sentence. If age unknown, omit the slot entirely (current hide is fine, just don't fabricate `0`). If distance hidden, show muted `Vị trí ẩn` with tooltip `Người này đang tắt chia sẻ vị trí` instead of blank.
- **Suggested command**: /impeccable clarify

- **[P1] What**: Silent roster failure. `fetchPage` catch is `console.error` only (`HomeView.tsx:125-126`); `isLoadingMore` spinner just disappears; user left with stale list or permanent "Không có người dùng nào".
- **Why it matters**: On flaky mobile/offline PWA (core PRODUCT.md promise: offline queue + reconnect toast), a failed page looks like "nobody is nearby" — the worst wrong conclusion for a discovery surface.
- **Fix**: Error state with retry: `loadError` string, inline banner above list + empty-state CTA `Thử lại`, wire to existing offline toast pattern. Log stays, UI no longer silent.
- **Suggested command**: /impeccable harden

- **[P1] What**: Row is a `div onClick`, message is the only keyboard path. `HomeView.tsx:282-284` — whole card opens profile via mouse only; no `role/button`, no `tabIndex`, no `Enter/Space`, no `:focus-visible`. 10–11px type (`text-[11px]`, `text-[10px]`), 10px presence dot, gender icon is `title`-only (screen-reader invisible, touch invisible).
- **Why it matters**: Sam (keyboard/screen-reader) cannot open profiles at all. Casey (one-handed, sun glare, 200% zoom) misses the dot and mis-taps the `px-2.5 py-1.5` Nhắn button next to the card tap target.
- **Fix**: Make row a real `<button>`/`<a>` or add `tabIndex=0 + onKeyDown + focus ring`; add `aria-label` with name + distance + online (`Nhắn tin` button already has `title`, promote to `aria-label`); bump name to 13–14px, bio stays 12px max; presence dot to 12px with `ring-2`; gender icon gets `aria-label`, not just `title`.
- **Suggested command**: /impeccable audit

- **[P2] What**: "Gần bạn" is not sorted by nearness. Comment admits it: `Server order (userId desc) — no client sort/filter beyond gender` (`HomeView.tsx:179`). No result count, no sort control, no explanation.
- **Why it matters**: The tab is named proximity but behaves as recency. Users cannot tell if the top row is 50 m or 50 km away when chips are missing — the core job ("find nearby") fails the match-to-world test.
- **Fix**: If API can sort by distance, default to it and show `N người gần bạn · sắp xếp theo khoảng cách`. If not, say so in situ (`Danh sách mới nhất — khoảng cách hiển thị khi có`) and add a client sort toggle (Gần nhất / Mới nhất) once `distanceM` exists. Never leave the promise implicit.
- **Suggested command**: /impeccable layout

- **[P2] What**: Filter bar is 3 lonely chips in a full-width sticky bar. `HomeView.tsx:222-245` — `Tất cả / Nam / Nữ` left-aligned, large empty right half, no search, no online-only toggle, no count.
- **Why it matters**: Extraneous whitespace at the highest-attention sticky position; the one filter users want on a stranger surface (ai đang online / quanh đây) requires scanning the whole infinite list instead.
- **Fix**: Right-align a compact `Online` toggle + result count (`12 online`), keep 3 chips as segmented control. One row, no extra height. Do not add a search field in this pass — count + online covers 80%.
- **Suggested command**: /impeccable layout

#### Persona Red Flags

Auto-selected for mobile stranger-discovery + a11y: Casey (Distracted Mobile), Jordan (First-Timer), Sam (Accessibility). Alex deferred — efficiency matters but trust/safety on first viewport matters more here.

**Casey (Distracted Mobile User — one-handed, portrait PWA, interrupted)**: Primary `Nhắn` is `px-2.5 py-1.5` (~30px tall, below 44pt) and sits 8px from the card-tap area — thumb mis-tap opens profile instead of chat. Presence dot is 10px (`w-2.5 h-2.5`) with no label — unreadable in sunlight. Filter bar has no `Online` shortcut, so Casey scrolls 50-row pages on 3G to find anyone awake. State: `exhaustedRef`/`seenRef` are memory-only — app-switch kill loses shuffle position with no "you left off here" restore.

**Jordan (Confused First-Timer — never used Mori, reads everything literally)**: First viewport has zero orientation — no title, no "đây là ai / vì sao họ ở đây", just chips + cards. Joke fallback bio is taken as the person's real intro ("why is he saying that?"). `Người qua đường` badge (in profile dialog) + hidden distance with no reason reads as rejection ("am I blocked?"). Empty state says "thử bộ lọc khác" but the only filters are gender — Jordan toggles Nam/Nữ pointlessly when the real cause is offline failure or empty roster.

**Sam (Accessibility-Dependent — keyboard-only + NVDA/VoiceOver, 200% zoom)**: Profile open is mouse-only (`div onClick`, no role/tabindex/focus). Gender icon is `aria-hidden` icon inside `title`-only span — announced as nothing. Presence dot is color-only (emerald vs slate) with `title` that AT never reaches on a `span` without role. 10–11px body copy fails WCAG AA at 200% zoom inside `max-w-lg` cards; focus order jumps from filter chips straight past 50 virtualized rows with no skip-link or list landmark (`div.p-3` instead of `ul/li` + `aria-setsize`).

#### Minor Observations

- Dark-mode gender pastels (`bg-blue-100 text-blue-600` etc.) are light-mode values reused in dark — check contrast on `slate-900`; detector's `gray-on-color` twin in `FirstMessageModal:86` is the same class of bug.
- `select-none` on the whole scroll container (`HomeView.tsx:219`) blocks bio copy — users can't copy a Zalo/phone from bio. Scope it to chrome, not content.
- `no-scrollbar` on filter + list hides scroll affordance on desktop PWA — add `overflow-x-auto` hint or edge fade.
- `w-13 h-13` / `scale-108` in `BottomNav.tsx:77-78` are non-default Tailwind values — verify they compile in this Tailwind version or replace with `w-12 h-12` / `scale-105`.
- Profile tabs bug (worth filing): `MarkerDetailDialog.tsx:392-416` compares `activeTab` (profile tab state) against `'moments'` string correctly, but the button active check reads the same `activeTab` variable that shadows outer scope — works, yet `setActiveProfileTab` vs `activeTab` naming invites regression. Rename to `profileTab`.
- `Avatar` fallback palette is all greens (`Avatar.tsx:12-19`) — 6 entries but only 3 unique hues; distinct users collide initials+color. Add slate/amber/rose variance.

#### Questions to Consider

- What if the first viewport answered "ai đang gần + online ngay" instead of "50 người mới nhất"?
- Does an empty bio deserve a joke, or does honesty (`Chưa có giới thiệu`) earn the stranger's tap more?
- What would a confident "Gần bạn" look like if distance were the sort key, not a chip that sometimes vanishes?
- If Casey has 10 seconds one-handed, can she reach one online person and say hello — or does she scroll first?
- Which failure is kinder: "Không có ai" or "Mất kết nối — thử lại" with one tap?

First run for this target, no trend yet.
Wrote `.impeccable/critique/nearby-<timestamp>.md` (path printed by helper).
