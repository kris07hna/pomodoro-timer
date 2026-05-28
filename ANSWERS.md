# Answers

## 1. How to run

```bash
git clone <repo-url>
cd pomodoro-timer
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 2. Stack & design choices

**Stack:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript. I chose this stack because it gives me server-side rendering defaults, built-in routing, and a modern CSS pipeline with minimal configuration. The Tailwind v4 `@import "tailwindcss"` approach avoids the old `tailwind.config.js` ceremony.

**Visual decision — glassmorphism cards with backdrop-filter:** I used semi-transparent dark cards (`rgba(6, 8, 15, 0.55)`) with `backdrop-filter: blur(12px)` over a full-bleed background image. This creates visual depth without heavy box shadows or borders, letting the background image breathe through the UI. The effect is applied to every `.glass-card` instance (main timer, settings, history), giving the whole app a consistent frosted-glass feel. I added `::before` and `::after` pseudo-elements for a subtle edge highlight and left-edge light streak that reinforces the glass illusion.

**Interaction decision — flash-invert on cycle completion:** When a focus or break session ends, the entire viewport briefly inverts colors for 4 seconds (via a `.flash-overlay` div with CSS `filter: invert(1) hue-rotate(180deg)`). This is an unmistakable visual signal that a cycle finished, even if the user is looking away from the timer. I chose a full-screen overlay over a localized animation because the flash is more noticeable peripherally and works as a notification even when the tab isn't in focus. The overlay uses a CSS `animation: flash-fade` that fades opacity to 0, so no JS timeout is needed to remove the DOM element — the browser handles the transition natively.

## 3. Responsive & accessibility

**Responsive behavior:** On a 360px phone, the layout collapses from a two-column grid (`77fr 23fr`) to a single stacked column. The timer font scales down via `clamp(2.8rem, 13vw, 3.8rem)` to fit narrow screens. Settings and history cards stack vertically below the main timer. On a 1440px laptop, the two-column layout gives the timer dominant visual weight (77% of width) while settings sit in a compact sidebar.

**Accessibility handled — keyboard navigation:** The entire timer is operable via keyboard: `Space` starts/pauses/resumes, `R` resets. The keyboard handler ignores events when focus is on `<input>` or `<button>` elements to avoid conflicts with native browser behavior. All interactive buttons have `aria-label` attributes (`"Start timer"`, `"Pause timer"`, `"Reset timer"`). The cycle meter uses `role="group"` with `aria-label="Cycle meter"`, and each dot has `role="img"` with an individual label like `"Cycle 1 of 4: completed"`.

**Accessibility skipped — motion preference:** I did not implement `prefers-reduced-motion` media query for the flash overlay or the snowfall animation. The flash effect is only 4 seconds and happens infrequently (every 25 minutes), so I judged the impact as low, but a production app should respect `prefers-reduced-motion` by skipping the flash animation for users who have reduced motion enabled.

## 4. AI usage

- **GitHub Copilot / Claude (via opencode):** I used AI to perform a comprehensive code review of the initial implementation. I prompted it with the full codebase and asked for a severity-ranked audit of functional bugs, architectural issues, and cosmetic problems. The AI identified 15 issues across three severity tiers.
- **AI-generated code review fixes:** I then asked the AI to implement fixes for all identified issues. For the stale closure guard (#1), the AI suggested using a monotonic counter ref, but I changed this to a simpler boolean `cycleHandledRef` because the dedup only needs to prevent double-processing within a single cycle — a counter was over-engineered. For the flash effect (#3), the AI proposed using React portals, but I chose a simpler inline `<div>` with CSS animation instead, since the flash is a global visual effect and doesn't need DOM isolation.
- **ANSWERS.md:** I used AI to help structure and draft this answers document based on the actual code changes made.

## 5. Honest gap

**State synchronization between `timeLeft` and `endRef`:** The timer has two sources of truth for the remaining time: `timeLeft` state (used for rendering) and `endRef.current` (the absolute end timestamp). These are kept in sync manually — `endRef` drives the interval, and `timeLeft` is derived from it via `syncTime()`, but `timeLeft` is also set directly during pause, reset, and restore. If a visibility change races with a pause, the two could briefly diverge. With another day, I would refactor to a single-source model where `endRef` is the only truth and `timeLeft` is always computed (via `useMemo` or in the render), eliminating the synchronization burden entirely.
