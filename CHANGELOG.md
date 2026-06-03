# Changelog

All notable project-history notes and documentation refreshes for **Echoes of Tomorrow** should be recorded in this file.

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
