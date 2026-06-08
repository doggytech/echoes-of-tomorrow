# Echoes of Tomorrow UI Refresh Plan

**Goal:** Increase player engagement by making each turn feel more dramatic, improving choice readability, and pushing secondary progression systems out of the story’s way without removing useful state visibility.

**Architecture:** Keep the app as a lightweight vanilla HTML/CSS/JS single-page experience. Implement the refresh by updating inline styles in `index.html` and restructuring `renderGame()` / `renderStartScreen()` output in `game.js`, with small helper functions for branch-aware theming, choice-card metadata, and layout-safe state summaries.

**Tech Stack:** Node.js, Express, vanilla JavaScript, node:test.

---

## Current UX problems observed
1. **Story comes too late** — the player sees multiple admin panels before the scene and choices.
2. **Choice buttons are flat** — they are clickable, but they do not communicate tone, risk, or likely payoff.
3. **Panels have equal weight** — quest, factions, inventory, wounds, journal, and story all use similar visual treatment, so hierarchy is weak.
4. **The landing screen undersells the game** — it explains the premise clearly but lacks a stronger “begin play now” energy.

---

## Acceptance criteria
- Story scene and choices appear above most meta-state panels.
- Choices render as richer cards with trait/tone metadata and a small strategic hint.
- The current scene gets a stronger hero treatment tied to story branch.
- Secondary systems are reorganized into a lower-priority grid so the story remains the primary focus.
- The landing screen better sells tone, stakes, and the resume flow.
- `npm test` still passes.
- The refreshed UI is verified live in the browser.

---

## Task 1: Strengthen the landing screen

**Files:**
- Modify: `index.html`
- Modify: `game.js`

**Implementation notes:**
- Add a more cinematic landing card treatment with stronger framing around the hook text.
- Add a compact feature strip (procedural storytelling, persistent state, AI-assisted scenes).
- Improve the start button prominence.
- Keep recent saves visible, but style them as supporting content rather than the primary call to action.

**Verification:**
- Load `/`
- Confirm the start screen feels more intentional and the CTA is visually dominant.

---

## Task 2: Promote the story scene into a hero panel

**Files:**
- Modify: `index.html`
- Modify: `game.js`

**Implementation notes:**
- Move the story scene above quest/faction/resource panels.
- Add branch-aware scene styling (investigation / survival / diplomacy / momentum / awakening).
- Add a scene header showing branch, location, arc, and AI/fallback status.
- Keep the core scene text highly readable with stronger spacing and contrast.

**Verification:**
- Start a run
- Confirm the scene is the first major panel after lightweight summary stats.

---

## Task 3: Replace flat buttons with choice cards

**Files:**
- Modify: `index.html`
- Modify: `game.js`

**Implementation notes:**
- Replace the plain button list with choice cards.
- Each card should show:
  - a trait / approach label
  - a tone or posture hint
  - a short strategic hint derived from the choice text / trait
- Preserve the existing click handling via `data-choice-id`.
- Maintain accessibility and mobile readability.

**Verification:**
- Start a run
- Confirm all available choices render as distinct cards and remain clickable.

---

## Task 4: Reorganize secondary systems into a lower-priority command deck

**Files:**
- Modify: `index.html`
- Modify: `game.js`

**Implementation notes:**
- Keep the top stat strip compact.
- Keep the current objective and quest visible, but lighter than the story panel.
- Group faction reactions, inventory, bonds, wounds, threads, and journal into a secondary grid below choices.
- Use clearer card headings and more compact spacing so state remains useful without dominating the screen.

**Verification:**
- Start a run
- Confirm secondary systems remain visible but no longer overshadow the scene/choices.

---

## Task 5: Polish feedback and regression check

**Files:**
- Modify: `index.html`
- Modify: `game.js`
- Optional: `CHANGELOG.md`

**Implementation notes:**
- Improve the loading state so transitions feel more deliberate.
- Tighten spacing, chip styles, and section titles for hierarchy.
- Run the full test suite and live browser verification.
- If the implementation is stable, log the UI refresh in `CHANGELOG.md`.

**Commands:**
- `npm test`
- `npm start`
- verify `http://127.0.0.1:3000`

**Expected results:**
- All tests pass.
- Landing screen has stronger dramatic framing.
- Story scene and choices are clearly the center of attention.
- Secondary state panels remain helpful but visually subordinate.
- The game feels more like an unfolding narrative and less like a debug dashboard.
