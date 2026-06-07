# Changelog

All notable project-history notes and documentation refreshes for **Echoes of Tomorrow** should be recorded in this file.

## 2026-06-07

### UI polish pass 2
- added a dramatic impact spotlight that frames the latest consequence before the next decision
- strengthened choice cards with branch-colored accent rails plus posture, risk, and payoff tags
- upgraded the loading transition into an animated timeline-resolution panel
- tightened the mobile layout so decision and consequence cards stay readable on narrower screens

### UI refresh
- added a stronger cinematic landing hero with a clearer call to action and feature strip
- promoted the active story scene into a hero panel with branch-aware framing and clearer hierarchy
- upgraded flat choice buttons into richer choice cards with approach labels and strategic hints
- reorganized objective, quest, and progression systems into a lower-priority support grid below the story and choices

### Verification reference
- `npm test` passing (`36/36`)
- live UI verified locally at `http://127.0.0.1:3000`

## 2026-06-02

### Persistence
- added `storage.js` as a save backend abstraction for both local file storage and **Turso / libSQL**
- added automatic first-run import from legacy `data/saves.json` into an empty Turso database
- added persistence tests for config selection, Turso-backed save/load/list/count behavior, and legacy import
- updated `/api/health` to report the active storage provider
- updated `.env.example` and `README.md` with Turso configuration and rollout notes

### Documentation
- refreshed `README.md` to reflect the current app state rather than the older Ollama-only/local-first framing
- documented current support for both **OpenRouter** and **Ollama**
- added the current feature set, including Phase 4 systems:
  - inventory
  - bonds / relationships
  - wounds and recovery
  - richer save/resume metadata
- updated quick-start instructions for local dev, production-style local run, and Docker
- updated the API endpoint list to include `/api/saves`
- added deployment notes for **Render** as the recommended first public hosting path
- documented the current limitation of file-based save persistence (`data/saves.json`) for cloud deployments

### Verification reference
- project test suite previously verified passing with `npm test`
- live health endpoint verified available at `/api/health`

### Intent
This changelog entry exists so documentation can evolve without losing sight of what changed and why.
