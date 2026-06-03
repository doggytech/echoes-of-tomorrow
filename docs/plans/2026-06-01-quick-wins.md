# Echoes of Tomorrow Quick Wins Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Ship a first batch of high-value UX and progression improvements that make Echoes of Tomorrow feel more like a persistent narrative game.

**Architecture:** Keep the game as a single-page vanilla JS app with a small Express backend. Add one backend endpoint for listing recent saves, then expand the frontend with reusable pure helpers for objective text, journal entries, and save summaries so the new UI can be tested without a browser harness.

**Tech Stack:** Node.js, Express, vanilla JavaScript, node:test.

---

## Selected quick-win features
1. **Journal / Timeline panel** — surface recent choices and the current journey arc.
2. **Visible world-state badges** — show location, branch, and current objective.
3. **Save / Resume UI** — list recent runs on the start screen and allow resuming them.
4. **Trait normalization for branch progression** — recognize the newer AI traits (`investigation`, `caution`, `decisive`) so visible branch state stays truthful.

---

### Task 1: Add failing backend tests for recent-save summaries

**Objective:** Define the save-list payload before implementing the endpoint.

**Files:**
- Modify: `server.test.js`
- Modify: `server.js`

**Step 1: Write failing tests**
Add tests for a pure helper that:
- accepts a saves map
- returns recent saves sorted newest-first
- includes `sessionId`, `savedAt`, `turn`, `location`, `storyBranch`, and `traitCount`

**Step 2: Run test to verify failure**
Run: `node --test server.test.js`
Expected: FAIL — helper does not exist.

**Step 3: Write minimal implementation**
- Add a pure `listRecentSaves()` helper in `server.js`
- Add `GET /api/saves` that returns the helper output

**Step 4: Run tests to verify pass**
Run: `node --test server.test.js`
Expected: PASS

---

### Task 2: Add failing frontend tests for branch normalization and journal/objective helpers

**Objective:** Lock behavior for the new progression and UI-summary helpers before touching production code.

**Files:**
- Modify: `game.test.js`
- Modify: `game.js`

**Step 1: Write failing tests**
Add tests for:
- `deriveStoryBranchFromChoice()` recognizing `investigation`, `caution`, and `decisive`
- `getJournalEntries()` returning recent choices newest-first with readable labels
- `getCurrentObjective()` returning branch-specific player-facing text

**Step 2: Run test to verify failure**
Run: `node --test game.test.js`
Expected: FAIL — new helpers/behavior missing.

**Step 3: Write minimal implementation**
- Expand trait mapping in `deriveStoryBranchFromChoice()`
- Add pure helpers for journal entries and objective text

**Step 4: Run tests to verify pass**
Run: `node --test game.test.js`
Expected: PASS

---

### Task 3: Implement Journal / Timeline and world-state badges in the UI

**Objective:** Make the current run legible inside the main game screen.

**Files:**
- Modify: `game.js`
- Modify: `index.html`

**Implementation notes:**
- Show chips or badges for `currentLocation`, `storyBranch`, and the current objective
- Add a journal panel under the story that shows the last few choices with turn numbers and trait labels
- Reuse the pure helper output from Task 2 instead of duplicating formatting logic inline

**Verification:**
- Start a run in the browser
- Make at least one choice
- Confirm the new panels render useful state instead of placeholders

---

### Task 4: Implement Save / Resume UI

**Objective:** Let players continue prior runs from the start screen.

**Files:**
- Modify: `game.js`
- Modify: `server.js`
- Modify: `index.html`

**Implementation notes:**
- Fetch `/api/saves` on load
- Render a “Resume a recent echo” section on the start screen
- Add resume buttons that call `loadGame(sessionId)` and then `renderGame()`
- Keep empty-state messaging when there are no saves

**Verification:**
- Open the app start screen
- Confirm recent saves appear
- Resume one and verify the story, stats, and history restore correctly

---

### Task 5: Regression and live verification

**Objective:** Prove the feature batch works end-to-end.

**Files:**
- No additional source files required unless fixes are discovered

**Commands:**
- `npm test`
- restart server if needed
- verify `/api/saves`
- verify `/api/health`
- verify UI in browser

**Expected results:**
- All tests pass
- start screen shows recent runs
- resumed run loads successfully
- in-game journal and state badges appear after loading or starting a story
