# Deployment Notes

This repo is set up so **development/test config stays local** and **production secrets stay in Render**.

## Commit-safe config files

These files are safe to commit:

- `.env.example`
- `.env.development.example`
- `.env.test.example`
- `.env.production.example`
- `render.yaml`

These files should never be committed:

- `.env`
- any other `.env.*` file containing real credentials

## Local-only environments

### Development

```bash
cp .env.development.example .env
npm run dev
```

Intended for:
- local Ollama
- local testing against Turso or file storage
- experimentation on your machine only

### Test

```bash
cp .env.test.example .env
npm test
```

Intended for:
- safe local test defaults
- no production credentials
- reproducible local verification

## Production / Render

Do **not** upload `.env` to GitHub.

Instead:
1. keep your local `.env` only on your machine
2. push the repo with the example files and `render.yaml`
3. create the Render service from the repo
4. enter real secrets in the Render dashboard

### Recommended production values

Use `.env.production.example` as the reference.

Important production choices:
- `NODE_ENV=production`
- `STORAGE_PROVIDER=turso`
- `AI_PROVIDER=openrouter`
- `TURSO_DATABASE_URL` set in Render
- `TURSO_AUTH_TOKEN` set in Render
- `OPENROUTER_API_KEY` set in Render
- `SITE_URL` set to the real Render service URL
- `AI_REQUEST_TIMEOUT_MS` set high enough for your chosen OpenRouter model (default here: `60000`)

### Why Ollama is local-only here

Your current Ollama endpoint is on a private/local network. That is good for dev/test, but it should not be used as the default production path on Render unless you intentionally expose and secure a public inference endpoint.

## Docker secret safety

`.dockerignore` excludes `.env*`, so your local secret files are not copied into the Docker build context.

## Render blueprint

`render.yaml` is included as a convenience blueprint.

It intentionally:
- commits only non-secret defaults
- marks secret values with `sync: false`
- keeps production on Turso + OpenRouter

You can still set everything manually in Render if you prefer.

## Pre-push checklist

Before pushing to GitHub:

- confirm `.env` is not staged
- confirm no real tokens were pasted into `*.example`
- confirm Render secrets exist only in the Render dashboard
- confirm local/private Ollama URLs are only in local `.env`, not production templates

## First production boot checklist

After Render deploys:

- check `/api/health`
- confirm `storageProvider` is `turso`
- confirm AI provider is `openrouter`
- create a smoke-test save
- load it back
- verify recent saves appear in `/api/saves`
