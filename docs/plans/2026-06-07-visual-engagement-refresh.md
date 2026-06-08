# Echoes of Tomorrow Visual Engagement Refresh Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Increase player session engagement by making the story scene visually dominant, making choices feel more consequential, and reducing dashboard-like clutter during play.

**Architecture:** Keep the app as a single-page vanilla JS experience. Add a small set of pure presentation helpers in `game.js` for branch theming and richer choice summaries so the most important UI behavior is testable without a browser harness. Rework the in-game layout so the story and choices appear before secondary systems, then move low-frequency systems into collapsible detail panels.

**Tech Stack:** Node.js, vanilla JavaScript, inline CSS in `index.html`, node:test.

---

## Selected UI improvements
1. **Scene-first layout** — move the current scene and active choices above low-priority state panels.
2. **Branch-aware visual theming** — tint the active run based on story branch so each mode feels distinct.
3. **Richer choice cards** — add approach labels, icons, and short consequence framing for each choice.
4. **Reduced cognitive load** — compress inventory, bonds, wounds, factions, threads, and timeline into collapsible detail panels.

---

### Task 1: Add failing tests for new presentation helpers

**Objective:** Lock the new presentation rules before changing the rendering.

**Files:**
- Modify: `game.test.js`
- Modify: `game.js`

**Step 1: Write failing tests**
Add tests for:
- `getBranchVisualTheme()` returning different labels/moods for investigation, survival, diplomacy, momentum, and awakening
- `describeChoicePresentation()` returning icon, approach label, and outcome hint for a choice trait

**Step 2: Run test to verify failure**
Run: `node --test game.test.js`
Expected: FAIL — new helpers do not exist.

**Step 3: Write minimal implementation**
- Add pure helper objects/functions in `game.js`
- Export them for tests

**Step 4: Run tests to verify pass**
Run: `node --test game.test.js`
Expected: PASS

---

### Task 2: Rebuild the in-game layout around the scene

**Objective:** Make the current scene and choices the visual center of gravity.

**Files:**
- Modify: `game.js`
- Modify: `index.html`

**Implementation notes:**
- Keep a compact stats strip at the top
- Add a cinematic `scene-panel` with branch/location chips, objective, mood copy, and story body
- Render the choice cards immediately below the scene panel
- Move quest/objective support below the choice cards instead of above them

**Verification:**
- Open the app in the browser
- Start a run
- Confirm the first visible gameplay block is the scene, not the admin panels

---

### Task 3: Turn the choice buttons into choice cards

**Objective:** Make each decision feel strategically different instead of visually interchangeable.

**Files:**
- Modify: `game.js`
- Modify: `index.html`

**Implementation notes:**
- Replace the plain button body with a card layout
- Show an icon, approach label, and one-line hint above/below the choice text
- Keep the buttons simple and semantic; no new dependencies

**Verification:**
- Start a run
- Confirm each choice exposes a different approach treatment and is still clickable

---

### Task 4: Collapse low-frequency systems into a command ledger

**Objective:** Reduce visual clutter while preserving access to progression state.

**Files:**
- Modify: `game.js`
- Modify: `index.html`

**Implementation notes:**
- Keep one or two high-priority progress cards always open
- Move faction reactions, inventory, bonds, wounds, threads, and timeline into collapsible sections
- Use concise section summaries so players know what changed without reading every panel

**Verification:**
- Confirm the detail sections render with readable collapsed summaries
- Expand each section once to verify data still appears

---

### Task 5: Regression and live verification

**Objective:** Prove the refresh works technically and visually.

**Files:**
- Modify: none (verification only)

**Run:**
- `npm test`
- `npm start`
- Open `http://127.0.0.1:3000`

**Check:**
- tests stay green
- story-first layout is visible
- branch-aware styling changes are present during play
- choices remain functional
- collapsed details reduce clutter without hiding critical information
