# Echoes of Tomorrow UI Polish Pass 2

**Goal:** Build on the first hierarchy refresh by making turn-to-turn feedback feel more dramatic, sharpening branch-specific choice identity, and improving readability on smaller screens without changing the core lightweight architecture.

**Architecture:** Keep the app vanilla HTML/CSS/JS. Add small pure helpers in `game.js` for consequence spotlighting and richer choice metadata, then thread those helpers into `renderGame()` and `showLoading()`. Extend inline CSS in `index.html` for stronger motion, accent rails, and tighter mobile behavior.

**Tech Stack:** Node.js, Express, vanilla JavaScript, node:test.

---

## Current polish gaps
1. **Choice cards are clearer, but still too similar** — they need stronger branch-specific differentiation and a faster read on risk/reward.
2. **Consequences are visible but not dramatic enough** — the latest outcome should read like a story beat, not just a changelog.
3. **Transitions are functional, not atmospheric** — loading feels static instead of like the world is resolving the next scene.
4. **Mobile layout is safe, not elegant** — the hierarchy survives, but card density and spacing can still improve.

---

## Acceptance criteria
- Choice cards show stronger branch-specific identity with clearer strategic framing.
- The latest outcome is promoted into a more dramatic “impact spotlight” near the story and decisions.
- The loading state feels intentional and thematic instead of placeholder.
- Small-screen layout becomes tighter and easier to scan.
- `npm test` passes.
- The updated build is verified live in the browser.

---

## Task 1: Strengthen choice-card strategic readability

**Files:**
- Modify: `game.js`
- Modify: `index.html`
- Modify: `game.test.js`

**Implementation notes:**
- Extend `describeChoicePresentation()` with posture / risk / payoff metadata.
- Surface that metadata directly on each choice card as compact tactical tags and a “best when…” line.
- Keep the existing click target and accessibility behavior intact.

**Verification:**
- Start a run and confirm each choice reads as mechanically distinct at a glance.

---

## Task 2: Add an impact spotlight for the latest consequence

**Files:**
- Modify: `game.js`
- Modify: `index.html`
- Modify: `game.test.js`

**Implementation notes:**
- Add a pure helper that categorizes the most recent outcome into a stronger player-facing spotlight.
- Render that spotlight above the choice deck so the player sees what just changed before deciding what to do next.
- Highlight stat shifts, wounds, trust changes, or item gains in a more cinematic block.

**Verification:**
- Make at least one choice and confirm the follow-up screen clearly emphasizes the consequence before the next decision.

---

## Task 3: Upgrade transition feedback and small-screen polish

**Files:**
- Modify: `game.js`
- Modify: `index.html`
- Optional: `CHANGELOG.md`

**Implementation notes:**
- Replace the plain loading state with a richer animated transition panel.
- Tighten mobile spacing, reduce crowded card width assumptions, and keep the hero / choice hierarchy intact below 780px.
- Add concise section framing around the decision area so the “next move” reads more intentionally.

**Verification:**
- Run the app, trigger a choice, and check both desktop-width and narrow-width layout behavior in the browser.

---

## Commands
- `npm test`
- `npm start`
- verify `http://127.0.0.1:3000`

## Expected results
- The story flow feels more dramatic between turns.
- Choice cards communicate different strategic postures immediately.
- Consequences are easier to feel, not just read.
- Mobile readability is stronger without re-architecting the app.
