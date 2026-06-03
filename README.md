# Echoes of Tomorrow

A procedural storytelling RPG where every playthrough creates a unique narrative shaped by player choice, evolving world state, relationships, faction standing, inventory, wounds, and AI-assisted scene generation.

## Current Project Status

Echoes of Tomorrow is currently a working Node/Express web app with:
- a browser-based single-page game UI
- save/load support through pluggable persistence:
  - local JSON file storage for simple local runs
  - Turso / libSQL-compatible storage for durable deployment-ready saves
- Phase 4 progression systems, including:
  - inventory
  - bonds / relationships
  - wounds and recovery
  - richer consequences
  - improved resume cards
- support for either:
  - **OpenRouter** for cloud-hosted AI generation
  - **Ollama** for local AI generation
- deterministic fallback story generation when the configured AI provider is unavailable

Recent verification status:
- `npm test` passing (`29/29`)
- `/api/health` reports live AI/provider readiness
- app verified running locally on port `3000`

## Architecture

```text
┌─────────────┐      ┌─────────────┐      ┌──────────────────────────┐
│   Browser   │◀────▶│  Node.js    │◀────▶│ AI Provider              │
│  Game UI    │      │  Express    │      │ - OpenRouter (cloud)     │
│             │      │  API + Save │      │ - Ollama (local)         │
└─────────────┘      └─────────────┘      └──────────────────────────┘
                               │
                               ▼
                    Save storage abstraction
                - file JSON (`data/saves.json`)
                - Turso / libSQL database
```

### Stack
- **Frontend:** vanilla HTML/CSS/JS
- **Backend:** Node.js + Express
- **AI providers:** OpenRouter or Ollama
- **Persistence:** file storage or Turso / libSQL
- **Tests:** Node built-in test runner (`node --test`)

## Features

### Story and progression
- procedural narrative generation
- branching story arcs
- active quests and stage progression
- multiple world branches like investigation, survival, diplomacy, and momentum

### Character state
- player traits
- health, memory, reputation
- inventory tracking
- wounds and recovery
- relationship / bond tracking
- faction standing changes

### Session continuity
- save game endpoint
- load game endpoint
- recent saves resume UI
- compact save summaries with quest and state metadata

### Resilience
- AI health visibility via `/api/health`
- fallback narrative generation when AI is unavailable
- duplicate-choice normalization and three-choice enforcement

## Quick Start

## Option 1: Local development

```bash
git clone <repo>
cd echoes-of-tomorrow
npm install
cp .env.development.example .env
npm run dev
```

Open:
- `http://localhost:3000`

## Option 2: Production-style local run

```bash
npm install
cp .env.production.example .env
npm start
```

## Option 3: Docker

```bash
git clone <repo>
cd echoes-of-tomorrow
cp .env.development.example .env
docker-compose up -d
```

Then open:
- `http://localhost:3000`

## Configuration

Environment variables are defined in these commit-safe templates:

- `.env.example` — neutral base reference
- `.env.development.example` — local development defaults
- `.env.test.example` — local test defaults
- `.env.production.example` — production / Render reference

Create a real local `.env` by copying one of the example files. Do not commit the real `.env`.

```bash
cp .env.development.example .env
```

Secrets are intentionally kept out of git:

- `.env` and `.env.*` are gitignored
- only `*.example` templates are meant to be committed
- Docker build context excludes `.env*` so local secrets are not baked into an image

### Core app config
- `PORT` — app port, defaults to `3000`
- `STORAGE_PROVIDER` — `file` or `turso`
- `SAVE_DIR` — optional override for local JSON save location
- `LEGACY_SAVES_FILE` — optional override for the JSON file imported into an empty Turso database
- `IMPORT_LEGACY_FILE_SAVES` — set to `false` to skip first-run import into Turso
- `AI_REQUEST_TIMEOUT_MS` — timeout for AI requests

### Turso / libSQL config
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

If `STORAGE_PROVIDER` is not set but `TURSO_DATABASE_URL` is present, the app automatically uses Turso storage.

### AI provider selection
- `AI_PROVIDER=ollama`
- `AI_PROVIDER=openrouter`

### OpenRouter config
- `OPENROUTER_URL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `SITE_URL`
- `SITE_NAME`

### Ollama config
- `OLLAMA_URL`
- `OLLAMA_MODEL`

## AI Modes

### OpenRouter mode
Use this when you want cloud-hosted model access.

Example:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openai/gpt-oss-120b:free
SITE_URL=http://localhost:3000
SITE_NAME=Echoes of Tomorrow
```

### Ollama mode
Use this when you want local/private model execution.

Example:

```env
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

If the selected provider is unavailable, the app falls back to procedural responses instead of failing hard.

## Running Tests

```bash
npm test
```

This runs the Node test suite with `node --test`.

## API Endpoints

- `GET /` — main game UI
- `GET /game.js` — frontend game client
- `POST /api/generate` — generate the next narrative scene and choices
- `POST /api/save` — save a game session
- `GET /api/load/:sessionId` — load a saved session
- `GET /api/saves` — list recent saves for the resume UI
- `GET /api/health` — server + AI/provider status

## Save System Notes

The app supports two save backends:
- `STORAGE_PROVIDER=file` → local JSON saves in `data/saves.json`
- `STORAGE_PROVIDER=turso` → Turso / libSQL database saves

When Turso storage starts against an empty database, it will automatically import any existing legacy JSON saves from `data/saves.json` unless `IMPORT_LEGACY_FILE_SAVES=false`.

File storage is still useful for local development and quick demos, but for public deployment you should assume file-based saves are not durable unless you attach persistent storage.

## Deployment Notes

### Render recommendation
For the current architecture, **Render Web Service** is the best fit among common free-tier options because the app is a standard long-running Node/Express server and already has a Dockerfile.

Recommended first deploy path:
- deploy as a **Render Web Service**
- use **OpenRouter** as the AI backend
- set Render environment variables from `.env.production.example`
- treat the first public version as a **demo / alpha**

Important caveat:
- cloud deployments should use `STORAGE_PROVIDER=turso`
- set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Render
- the app will import legacy JSON saves into an empty Turso database on first boot
- do **not** deploy local dev/test `.env` files to Render
- do **not** push real secrets to GitHub; set them only in the Render dashboard

Recommended production posture:
- keep local Ollama and dev/test credentials for local-only workflows
- use `AI_PROVIDER=openrouter` in production unless you intentionally expose a remote Ollama endpoint
- commit only `render.yaml`, `*.example`, and docs — never real tokens or passwords

See also:
- `render.yaml` — Render blueprint with secret placeholders (`sync: false`)
- `.env.production.example` — production env template with safe placeholder values
- `DEPLOYMENT.md` — step-by-step production setup notes

Recommended long-term improvement:
- keep Turso as the durable save store while the existing Node/Express API remains the owner of save/load logic

## Docker

The repo includes:
- `Dockerfile` for the app container
- `docker-compose.yml` for local multi-service orchestration

The Docker setup is mainly aimed at local/dev workflows. For hosted deployment, the app can be deployed directly as a web service using the existing Node entrypoint or Docker image.

## Project Structure

```text
echoes-of-tomorrow/
├── index.html          # Main browser UI
├── game.js             # Frontend game logic
├── server.js           # Express app and API
├── storage.js          # Save storage abstraction (file + Turso/libSQL)
├── game.test.js        # Game logic tests
├── server.test.js      # Server and AI integration tests
├── storage.test.js     # Persistence tests
├── package.json        # Scripts and dependencies
├── Dockerfile          # App container definition
├── docker-compose.yml  # Local multi-service stack
├── .env.example        # Base environment template
├── .env.development.example # Local dev template
├── .env.test.example   # Local test template
├── .env.production.example # Production / Render template
├── render.yaml         # Render blueprint (no secrets committed)
├── .dockerignore       # Docker build exclusions
├── data/               # Runtime save storage
└── docs/plans/         # Implementation plans and notes
```

## Development Commands

```bash
# install deps
npm install

# run dev server with reload
npm run dev

# run production-style server
npm start

# run tests
npm test
```

## Troubleshooting

### Port already in use
Change:
- `PORT` in `.env`

### AI requests are falling back unexpectedly
Check:
- `AI_PROVIDER`
- `OPENROUTER_API_KEY` if using OpenRouter
- `OPENROUTER_MODEL`
- `OLLAMA_URL` and `OLLAMA_MODEL` if using Ollama
- `GET /api/health` for readiness status

### Saves are missing
Check:
- whether `STORAGE_PROVIDER` is set the way you expect
- whether `SAVE_DIR` points to a writable directory when using file storage
- whether `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set when using Turso
- whether you are running in an ephemeral container environment without Turso enabled

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for documentation updates and project-history notes.

## License

MIT

---

*"Every choice echoes across time."*
