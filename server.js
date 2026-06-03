require('dotenv').config();

const express = require('express');
const path = require('path');
const {
    createStorage,
    getStorageConfig,
    listRecentSaves
} = require('./storage');
const app = express();
const PORT = process.env.PORT || 3000;
const storageConfig = getStorageConfig(process.env, __dirname);
const storage = createStorage(storageConfig);

// Middleware
app.disable('x-powered-by');
app.use(express.json());

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/game.js', (_req, res) => {
    res.sendFile(path.join(__dirname, 'game.js'));
});

function getAiConfig(env = process.env) {
    const provider = String(env.AI_PROVIDER || 'ollama').trim().toLowerCase();

    return {
        provider,
        model: provider === 'openrouter'
            ? (env.OPENROUTER_MODEL || 'openai/gpt-4o-mini')
            : (env.OLLAMA_MODEL || 'llama3.2'),
        ollamaUrl: env.OLLAMA_URL || 'http://localhost:11434',
        openRouterUrl: env.OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: env.OPENROUTER_API_KEY || '',
        siteUrl: env.SITE_URL || 'http://localhost:3000',
        siteName: env.SITE_NAME || 'Echoes of Tomorrow',
        requestTimeoutMs: Number.parseInt(env.AI_REQUEST_TIMEOUT_MS || '60000', 10) || 60000
    };
}

const aiConfig = getAiConfig();

// Ollama client
async function generateWithOllama(config, prompt, context = '', fetchImpl = fetch) {
    try {
        const response = await fetchImpl(`${config.ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(config.requestTimeoutMs),
            body: JSON.stringify({
                model: config.model,
                prompt: context ? `${context}\n\n${prompt}` : prompt,
                stream: false,
                options: {
                    temperature: 0.2,
                    num_predict: 120
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama returned ${response.status}`);
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Ollama error:', error.message);
        return null;
    }
}

async function generateWithOpenRouter(config, prompt, context = '', fetchImpl = fetch) {
    try {
        const combinedPrompt = context ? `${context}\n\n${prompt}` : prompt;
        const response = await fetchImpl(config.openRouterUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                'HTTP-Referer': config.siteUrl,
                'X-Title': config.siteName
            },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: 'user',
                        content: combinedPrompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data?.choices?.[0]?.message?.content || null;
    } catch (error) {
        console.error('OpenRouter error:', error.message);
        return null;
    }
}

async function generateStory(config, prompt, context = '', fetchImpl = fetch) {
    if (config.provider === 'openrouter') {
        return generateWithOpenRouter(config, prompt, context, fetchImpl);
    }

    return generateWithOllama(config, prompt, context, fetchImpl);
}

function parseAiStoryResponse(aiResponse) {
    const storyMatch = aiResponse.match(/STORY:\s*([\s\S]*?)(?=CHOICE1:|$)/i);
    const choiceMatches = [...aiResponse.matchAll(/CHOICE\d+:\s*([^|\n]+?)\s*\|\s*TRAIT:\s*([^\n|]+)/gi)];

    const choices = choiceMatches.map((match) => ({
        text: match[1].trim(),
        trait: match[2].trim().toLowerCase().replace(/\s+/g, '_')
    }));

    return {
        story: storyMatch ? storyMatch[1].trim() : aiResponse.trim(),
        choices
    };
}

const DEFAULT_CHOICE_BLUEPRINT = [
    { text: 'Investigate further', trait: 'curious' },
    { text: 'Proceed with caution', trait: 'careful' },
    { text: 'Change direction', trait: 'adaptable' }
];

function ensureThreeChoices(choices) {
    const seenTraits = new Set();
    const normalizedChoices = [];

    for (const choice of choices) {
        if (!choice?.text || !choice?.trait) {
            continue;
        }

        const normalizedTrait = String(choice.trait).trim().toLowerCase().replace(/\s+/g, '_');
        if (seenTraits.has(normalizedTrait)) {
            continue;
        }

        seenTraits.add(normalizedTrait);
        normalizedChoices.push({
            text: String(choice.text).trim(),
            trait: normalizedTrait
        });
    }

    for (const fallbackChoice of DEFAULT_CHOICE_BLUEPRINT) {
        if (normalizedChoices.length >= 3) break;
        if (seenTraits.has(fallbackChoice.trait)) continue;

        seenTraits.add(fallbackChoice.trait);
        normalizedChoices.push(fallbackChoice);
    }

    return normalizedChoices.slice(0, 3);
}

function buildStoryPrompt({ context = {}, prompt, playerState = {} } = {}) {
    const recentHistory = Array.isArray(context.recentHistory) && context.recentHistory.length > 0
        ? context.recentHistory.join('\n')
        : 'none yet';
    const visitedLocations = Array.isArray(context.visitedLocations) && context.visitedLocations.length > 0
        ? context.visitedLocations.join(', ')
        : 'none yet';
    const knownCharacters = Array.isArray(context.knownCharacters) && context.knownCharacters.length > 0
        ? context.knownCharacters.join(', ')
        : 'none yet';
    const knownFactions = Array.isArray(context.knownFactions) && context.knownFactions.length > 0
        ? context.knownFactions.join(', ')
        : 'none yet';
    const factionStandings = context.factionStandings && typeof context.factionStandings === 'object'
        ? Object.entries(context.factionStandings)
            .filter(([, standing]) => Number.isFinite(standing) && standing !== 0)
            .map(([name, standing]) => `${name} (${standing})`)
            .join(', ')
        : '';
    const relationships = context.relationships && typeof context.relationships === 'object'
        ? Object.entries(context.relationships)
            .filter(([, value]) => Number.isFinite(value) && value !== 0)
            .map(([name, value]) => `${name} (${value})`)
            .join(', ')
        : '';
    const inventory = Array.isArray(playerState.inventory) && playerState.inventory.length > 0
        ? playerState.inventory.join(', ')
        : 'none yet';
    const wounds = Array.isArray(playerState.wounds) && playerState.wounds.length > 0
        ? playerState.wounds.join(', ')
        : 'none';
    const unlockedChoiceHints = Array.isArray(context.unlockedChoiceHints) && context.unlockedChoiceHints.length > 0
        ? context.unlockedChoiceHints.join('\n- ')
        : 'none yet';
    const currentArc = context.currentArc?.title || 'none yet';
    const arcObjective = context.currentArc?.objective || 'none yet';
    const activeQuestTitle = context.currentQuest?.title || 'none yet';
    const activeQuestStage = context.currentQuest?.stageLabel
        ? `${context.currentQuest.stageLabel} (${context.currentQuest.progress || 1}/${context.currentQuest.totalStages || 1})`
        : 'none yet';
    const activeQuestObjective = context.currentQuest?.objective || 'none yet';
    const branchSceneGuidance = context.branchSceneGuidance || 'No special branch guidance yet.';
    const sceneSnapshot = context.currentSceneText || 'No prior scene snapshot available.';

    const storyContext = `You are a creative storyteller for "Echoes of Tomorrow," a procedural RPG about a world fractured by time.
The player is an "Echo" who can move between fragments of reality.
Keep responses atmospheric, mysterious, and engaging. Write 2-3 paragraphs maximum.

Player traits: ${playerState?.traits?.join(', ') || 'none yet'}
Player health: ${playerState?.health ?? 100}
Player memory: ${playerState?.memory ?? 0}
Player reputation: ${playerState?.reputation ?? 0}
Inventory: ${inventory}
Active wounds: ${wounds}
Current turn: ${playerState?.turn || 0}
Current location: ${context.location || 'mysterious place'}
Current story branch: ${context.storyBranch || 'awakening'}
Current story arc: ${currentArc}
Current objective: ${arcObjective}
Active quest: ${activeQuestTitle}
Quest stage: ${activeQuestStage}
Quest objective: ${activeQuestObjective}
Previous choice: ${context.previousChoice || 'none yet'}
Visited locations: ${visitedLocations}
Known characters: ${knownCharacters}
Known factions: ${knownFactions}
Faction standings: ${factionStandings || 'none yet'}
Relationships: ${relationships || 'none yet'}
Branch scene guidance: ${branchSceneGuidance}
Unlocked choice opportunities:
- ${unlockedChoiceHints}
Recent choice history:
${recentHistory}
Current scene snapshot: ${sceneSnapshot}`;

    const fullPrompt = `${prompt || `Continue the story. The player is in a ${context?.location || 'mysterious place'}.`}

Generate:
1. A narrative response (2-3 paragraphs)
2. Three meaningful choices for what the player can do next

Requirements:
- Each choice must represent a meaningfully different approach.
- The three traits must be different from each other.
- Let the player's current health, memory, and reputation shape the scene and stakes.
- Let the active quest and faction standings influence who helps, obstructs, or demands something from the player.
- Honor important inventory items, relationships, and wounds when deciding who can help or what becomes possible.
- If the context suggests an unlocked item, social leverage, or recovery action, make at least one choice reflect it.
- CHOICE1 should prioritize investigation or understanding.
- CHOICE2 should prioritize caution, protection, or risk reduction.
- CHOICE3 should prioritize decisive action, leverage, or change.
- Make the options respond to the latest scene and recent history instead of repeating generic exploration verbs.

Return ONLY in this exact format:
STORY: [your narrative here]
CHOICE1: [first choice] | TRAIT: [trait name]
CHOICE2: [second choice] | TRAIT: [trait name]
CHOICE3: [third choice] | TRAIT: [trait name]
Do not include explanations, markdown, or extra headings.`;

    return { storyContext, fullPrompt };
}

function isConfiguredModelInstalled(installedModels, configuredModel) {
    const normalizedConfiguredModel = String(configuredModel || '').trim().toLowerCase();
    if (!normalizedConfiguredModel) {
        return false;
    }

    const configuredModelBase = normalizedConfiguredModel.split(':')[0];

    return installedModels.some((model) => {
        const normalizedInstalledModel = String(model || '').trim().toLowerCase();
        const installedModelBase = normalizedInstalledModel.split(':')[0];

        return normalizedInstalledModel === normalizedConfiguredModel || installedModelBase === configuredModelBase;
    });
}

// Check if Ollama is available and has the configured model installed
async function getOllamaStatus(config, fetchImpl = fetch) {
    try {
        const response = await fetchImpl(`${config.ollamaUrl}/api/tags`, {
            signal: AbortSignal.timeout(2000)
        });

        if (!response.ok) {
            return {
                reachable: false,
                modelAvailable: false,
                installedModels: []
            };
        }

        const data = await response.json();
        const installedModels = Array.isArray(data.models)
            ? data.models.map((model) => model.name).filter(Boolean)
            : [];

        return {
            reachable: true,
            modelAvailable: isConfiguredModelInstalled(installedModels, config.model),
            installedModels
        };
    } catch {
        return {
            reachable: false,
            modelAvailable: false,
            installedModels: []
        };
    }
}

async function getAiStatus(config = aiConfig, fetchImpl = fetch) {
    if (config.provider === 'openrouter') {
        return {
            provider: 'openrouter',
            reachable: Boolean(config.apiKey),
            modelAvailable: Boolean(config.apiKey && config.model),
            configuredModel: config.model,
            installedModels: []
        };
    }

    const ollamaStatus = await getOllamaStatus(config, fetchImpl);
    return {
        provider: 'ollama',
        reachable: ollamaStatus.reachable,
        modelAvailable: ollamaStatus.modelAvailable,
        configuredModel: config.model,
        installedModels: ollamaStatus.installedModels
    };
}

// Save game state
app.post('/api/save', async (req, res) => {
    const { sessionId, state } = req.body;
    if (!sessionId || !state) {
        return res.status(400).json({ error: 'Missing sessionId or state' });
    }

    try {
        await storage.saveGame(sessionId, state);
        return res.json({ success: true, message: 'Game saved' });
    } catch (error) {
        console.error('Failed to save game:', error);
        return res.status(500).json({ error: 'Failed to save game' });
    }
});

// Load game state
app.get('/api/load/:sessionId', async (req, res) => {
    const { sessionId } = req.params;

    const save = await storage.loadGame(sessionId);
    if (!save) {
        return res.status(404).json({ error: 'Save not found' });
    }

    res.json(save);
});

app.get('/api/saves', async (_req, res) => {
    try {
        return res.json({ saves: await storage.listRecentSaves() });
    } catch (error) {
        console.error('Failed to list saves:', error);
        return res.status(500).json({ error: 'Failed to list saves' });
    }
});

// AI story generation endpoint
app.post('/api/generate', async (req, res) => {
    const { context, prompt, playerState } = req.body;
    
    // Check if the configured AI provider and model are available
    const aiStatus = await getAiStatus(aiConfig);
    
    if (!aiStatus.reachable || !aiStatus.modelAvailable) {
        // Fallback to procedural responses
        const responses = [
            "The path ahead shifts and warps. You sense something watching from beyond the fracture.",
            "A memory surfaces—unbidden, unfamiliar. It might be yours, or someone else's entirely.",
            "The air grows thick with possibility. In this place, intention shapes reality.",
            "You hear echoes of conversations that haven't happened yet.",
            "Time stutters. For a moment, you exist in multiple places at once."
        ];
        
        return res.json({
            text: responses[Math.floor(Math.random() * responses.length)],
            choices: [
                { text: "Investigate further", trait: "curious" },
                { text: "Proceed with caution", trait: "careful" },
                { text: "Change direction", trait: "adaptable" }
            ],
            ai: false
        });
    }
    
    const { storyContext, fullPrompt } = buildStoryPrompt({
        context,
        prompt,
        playerState
    });

    try {
        const aiResponse = await generateStory(aiConfig, fullPrompt, storyContext);
        
        if (aiResponse) {
            const { story, choices } = parseAiStoryResponse(aiResponse);
            
            return res.json({
                text: story,
                choices: ensureThreeChoices(choices),
                ai: true,
                model: aiConfig.model,
                provider: aiConfig.provider
            });
        }
    } catch (error) {
        console.error('Generation error:', error);
    }
    
    // Final fallback
    res.json({
        text: "The fracture pulses with uncertain energy. Reality bends around you, waiting for your choice.",
        choices: [
            { text: "Embrace the chaos", trait: "adaptable" },
            { text: "Seek patterns in the madness", trait: "analytical" },
            { text: "Reach out to the void", trait: "empathic" }
        ],
        ai: false
    });
});

// Health check
app.get('/api/health', async (req, res) => {
    const aiStatus = await getAiStatus(aiConfig);
    const saveCount = await storage.countSaves();
    
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        aiProvider: aiStatus.provider,
        aiReachable: aiStatus.reachable,
        model: aiStatus.modelAvailable ? aiStatus.configuredModel : null,
        configuredModel: aiStatus.configuredModel,
        configuredModelAvailable: aiStatus.modelAvailable,
        installedModels: aiStatus.installedModels,
        storageProvider: storage.getProvider(),
        saves: saveCount
    });
});

// Start server
let server;

async function startServer() {
    await storage.init();

    return app.listen(PORT, async () => {
        const saveCount = await storage.countSaves();
        console.log(`🎮 Echoes of Tomorrow server running on port ${PORT}`);
        console.log(`📱 Open http://localhost:${PORT} to play`);
        console.log(`💾 Save storage: ${storage.getProvider()} (${saveCount} saves available)`);

        if (aiConfig.provider === 'openrouter') {
            console.log(`☁️ AI Provider: OpenRouter`);
            console.log(`🧠 Model: ${aiConfig.model}`);
        } else {
            console.log(`🤖 Ollama URL: ${aiConfig.ollamaUrl}`);
            console.log(`🧠 Model: ${aiConfig.model}`);
        }
    });
}

if (require.main === module) {
    startServer()
        .then((startedServer) => {
            server = startedServer;
        })
        .catch((error) => {
            console.error('Failed to start server:', error);
            process.exit(1);
        });
}

module.exports = {
    app,
    startServer,
    storage,
    storageConfig,
    getAiConfig,
    getAiStatus,
    generateWithOllama,
    generateWithOpenRouter,
    generateStory,
    parseAiStoryResponse,
    ensureThreeChoices,
    buildStoryPrompt,
    isConfiguredModelInstalled,
    getOllamaStatus,
    listRecentSaves
};
