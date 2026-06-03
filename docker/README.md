# Echoes of Tomorrow - Docker Setup

A procedural storytelling RPG with local AI integration via Ollama.

## Quick Start

```bash
# Start everything (app + Ollama with model)
docker-compose up -d

# Wait for Ollama to download the model (first time only)
docker-compose logs -f ollama

# Open the game
open http://localhost:3000
```

## What's Included

- **App**: Node.js/Express server serving the game
- **Ollama**: Local LLM server with llama3.2 model pre-loaded
- **Volume**: Persistent storage for Ollama models

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │──────▶  Node.js    │──────▶   Ollama    │
│             │◀─────│   Express   │◀─────│  (llama3.2) │
└─────────────┘      └─────────────┘      └─────────────┘
```

## API Endpoints

- `GET /` - Game UI
- `POST /api/generate` - AI story generation (now uses Ollama!)
- `POST /api/save` - Save game state
- `GET /api/load/:id` - Load game state
- `GET /api/health` - Health check

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | App server port |
| `OLLAMA_URL` | http://ollama:11434 | Ollama API URL |
| `OLLAMA_MODEL` | llama3.2 | Model to use |

## Development

```bash
# Rebuild after code changes
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Stop everything
docker-compose down

# Stop and remove volumes (clears Ollama models)
docker-compose down -v
```

## Model Options

Edit `docker-compose.yml` to change the model:

- `llama3.2` - Fast, good for storytelling (default)
- `mistral` - Creative writing focused
- `phi4` - Microsoft's model, good quality
- `qwen2.5` - Alibaba's model, excellent at following instructions

## Troubleshooting

**First startup is slow**: Ollama downloads ~2GB model on first run. Check progress with `docker-compose logs -f ollama`.

**Out of memory**: The model needs ~4GB RAM. Use a smaller model like `phi3` or `tinyllama` if needed.

**Port conflicts**: Change `PORT` in `.env` or `docker-compose.yml` if 3000 is taken.
