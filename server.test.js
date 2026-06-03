const test = require('node:test');
const assert = require('node:assert/strict');
const {
    parseAiStoryResponse,
    ensureThreeChoices,
    isConfiguredModelInstalled,
    getAiConfig,
    getAiStatus,
    generateWithOllama,
    generateWithOpenRouter,
    buildStoryPrompt,
    listRecentSaves
} = require('./server');

test('parseAiStoryResponse extracts story and all three choices correctly', () => {
    const response = `STORY: The city hums with broken clocks.
CHOICE1: Inspect the clocktower | TRAIT: Curious
CHOICE2: Question the mechanic | TRAIT: Analytical
CHOICE3: Leave before dark | TRAIT: Careful`;

    const parsed = parseAiStoryResponse(response);

    assert.equal(parsed.story, 'The city hums with broken clocks.');
    assert.deepEqual(parsed.choices, [
        { text: 'Inspect the clocktower', trait: 'curious' },
        { text: 'Question the mechanic', trait: 'analytical' },
        { text: 'Leave before dark', trait: 'careful' }
    ]);
});

test('ensureThreeChoices preserves parsed choices and pads missing ones once', () => {
    const completed = ensureThreeChoices([
        { text: 'Trace the signal', trait: 'focused' }
    ]);

    assert.equal(completed.length, 3);
    assert.deepEqual(completed[0], { text: 'Trace the signal', trait: 'focused' });
    assert.deepEqual(completed[1], { text: 'Investigate further', trait: 'curious' });
    assert.deepEqual(completed[2], { text: 'Proceed with caution', trait: 'careful' });
});

test('ensureThreeChoices replaces duplicate traits with distinct fallback approaches', () => {
    const completed = ensureThreeChoices([
        { text: 'Inspect the anomaly closely', trait: 'curious' },
        { text: 'Question the anomaly from another angle', trait: 'curious' },
        { text: 'Touch the anomaly before it fades', trait: 'curious' }
    ]);

    assert.deepEqual(completed, [
        { text: 'Inspect the anomaly closely', trait: 'curious' },
        { text: 'Proceed with caution', trait: 'careful' },
        { text: 'Change direction', trait: 'adaptable' }
    ]);
});

test('buildStoryPrompt injects evolving world context and distinct-choice instructions', () => {
    const { storyContext, fullPrompt } = buildStoryPrompt({
        context: {
            location: 'clockwork_city',
            storyBranch: 'investigation',
            currentArc: {
                title: 'The Gearwright Mystery',
                objective: 'Follow the Clockwork Syndicate and learn what they are building inside the fracture.'
            },
            currentQuest: {
                title: 'The Gearwright Mystery',
                stageLabel: 'Expose the Hidden Relay',
                objective: 'Map the relay network before the Syndicate moves the fracture engine.',
                progress: 2,
                totalStages: 3,
                status: 'active'
            },
            previousChoice: 'Inspect the frozen clocktower gears',
            visitedLocations: ['void', 'clockwork_city'],
            knownFactions: ['Clockwork Syndicate'],
            factionStandings: {
                'Clockwork Syndicate': 2
            },
            branchSceneGuidance: 'Investigation scenes should reward pattern-recognition, hidden machinery, and consequential discoveries.',
            recentHistory: [
                'Turn 0: Follow the path of golden light',
                'Turn 1: Inspect the frozen clocktower gears'
            ],
            currentSceneText: 'Copper rain falls upward over the city of gears.'
        },
        playerState: {
            traits: ['curious', 'analytical'],
            turn: 2,
            health: 100,
            memory: 3,
            reputation: 2
        },
        prompt: 'The player chose: "Inspect the frozen clocktower gears". Continue the story.'
    });

    assert.match(storyContext, /Current location: clockwork_city/);
    assert.match(storyContext, /Current story branch: investigation/);
    assert.match(storyContext, /Player memory: 3/);
    assert.match(storyContext, /Player reputation: 2/);
    assert.match(storyContext, /Visited locations: void, clockwork_city/);
    assert.match(storyContext, /Known factions: Clockwork Syndicate/);
    assert.match(storyContext, /Faction standings: Clockwork Syndicate \(2\)/);
    assert.match(storyContext, /Current story arc: The Gearwright Mystery/);
    assert.match(storyContext, /Active quest: The Gearwright Mystery/);
    assert.match(storyContext, /Quest stage: Expose the Hidden Relay \(2\/3\)/);
    assert.match(storyContext, /Branch scene guidance: Investigation scenes should reward pattern-recognition, hidden machinery, and consequential discoveries\./);
    assert.match(storyContext, /Recent choice history:/);
    assert.match(storyContext, /Current scene snapshot: Copper rain falls upward over the city of gears\./);
    assert.match(fullPrompt, /Each choice must represent a meaningfully different approach/);
    assert.match(fullPrompt, /The three traits must be different from each other/);
    assert.match(fullPrompt, /Let the player's current health, memory, and reputation shape the scene and stakes/);
    assert.match(fullPrompt, /Let the active quest and faction standings influence who helps, obstructs, or demands something from the player/);
    assert.match(fullPrompt, /CHOICE1 should prioritize investigation or understanding/);
    assert.match(fullPrompt, /CHOICE2 should prioritize caution, protection, or risk reduction/);
    assert.match(fullPrompt, /CHOICE3 should prioritize decisive action, leverage, or change/);
});

test('isConfiguredModelInstalled matches bare and tagged Ollama model names', () => {
    assert.equal(isConfiguredModelInstalled(['llama3.2:latest', 'qwen2.5:7b'], 'llama3.2'), true);
    assert.equal(isConfiguredModelInstalled(['llama3.2:latest', 'qwen2.5:7b'], 'qwen2.5:7b'), true);
    assert.equal(isConfiguredModelInstalled(['qwen3.5:latest'], 'llama3.2'), false);
});

test('getAiConfig prefers OpenRouter settings when AI_PROVIDER=openrouter', () => {
    const config = getAiConfig({
        AI_PROVIDER: 'openrouter',
        OPENROUTER_API_KEY: 'test-key',
        OPENROUTER_MODEL: 'openai/gpt-4o-mini',
        OPENROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions',
        SITE_URL: 'http://localhost:3000',
        SITE_NAME: 'Echoes of Tomorrow'
    });

    assert.equal(config.provider, 'openrouter');
    assert.equal(config.model, 'openai/gpt-4o-mini');
    assert.equal(config.apiKey, 'test-key');
    assert.equal(config.siteUrl, 'http://localhost:3000');
    assert.equal(config.siteName, 'Echoes of Tomorrow');
});

test('getAiStatus reports OpenRouter ready when api key and model are configured', async () => {
    const config = getAiConfig({
        AI_PROVIDER: 'openrouter',
        OPENROUTER_API_KEY: 'test-key',
        OPENROUTER_MODEL: 'openai/gpt-4o-mini'
    });

    const status = await getAiStatus(config);

    assert.deepEqual(status, {
        provider: 'openrouter',
        reachable: true,
        modelAvailable: true,
        configuredModel: 'openai/gpt-4o-mini',
        installedModels: []
    });
});

test('generateWithOpenRouter sends OpenRouter-compatible chat completions request', async () => {
    let capturedRequest;
    const config = getAiConfig({
        AI_PROVIDER: 'openrouter',
        OPENROUTER_API_KEY: 'test-key',
        OPENROUTER_MODEL: 'openai/gpt-4o-mini',
        OPENROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions',
        SITE_URL: 'http://localhost:3000',
        SITE_NAME: 'Echoes of Tomorrow'
    });

    const fakeFetch = async (url, options) => {
        capturedRequest = { url, options };
        return {
            ok: true,
            json: async () => ({
                choices: [
                    {
                        message: {
                            content: 'STORY: A cloud-powered vision arrives.\nCHOICE1: Accept it | TRAIT: Bold'
                        }
                    }
                ]
            })
        };
    };

    const result = await generateWithOpenRouter(config, 'Continue the story.', 'System context here.', fakeFetch);

    assert.equal(result, 'STORY: A cloud-powered vision arrives.\nCHOICE1: Accept it | TRAIT: Bold');
    assert.equal(capturedRequest.url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(capturedRequest.options.method, 'POST');
    assert.equal(capturedRequest.options.headers.Authorization, 'Bearer test-key');
    assert.equal(capturedRequest.options.headers['HTTP-Referer'], 'http://localhost:3000');
    assert.equal(capturedRequest.options.headers['X-Title'], 'Echoes of Tomorrow');

    const body = JSON.parse(capturedRequest.options.body);
    assert.equal(body.model, 'openai/gpt-4o-mini');
    assert.equal(body.messages[0].role, 'user');
    assert.match(body.messages[0].content, /System context here\./);
    assert.match(body.messages[0].content, /Continue the story\./);
});

test('generateWithOllama uses configurable timeout and cheaper generation settings for slower remote hosts', async () => {
    const config = getAiConfig({
        AI_PROVIDER: 'ollama',
        OLLAMA_URL: 'http://192.168.20.107:11434',
        OLLAMA_MODEL: 'phi3:mini',
        AI_REQUEST_TIMEOUT_MS: '60000'
    });

    const originalAbortSignal = global.AbortSignal;
    let capturedTimeoutMs;
    let capturedRequest;

    global.AbortSignal = {
        timeout(ms) {
            capturedTimeoutMs = ms;
            return { timeoutMs: ms };
        }
    };

    try {
        const result = await generateWithOllama(config, 'Continue the story.', 'Remote context.', async (url, options) => {
            capturedRequest = { url, options };
            return {
                ok: true,
                json: async () => ({ response: 'STORY: Remote story' })
            };
        });

        assert.equal(result, 'STORY: Remote story');
        assert.equal(capturedTimeoutMs, 60000);
        assert.equal(capturedRequest.url, 'http://192.168.20.107:11434/api/generate');
        const body = JSON.parse(capturedRequest.options.body);
        assert.equal(body.model, 'phi3:mini');
        assert.equal(body.stream, false);
        assert.equal(body.options.temperature, 0.2);
        assert.equal(body.options.num_predict, 120);
    } finally {
        global.AbortSignal = originalAbortSignal;
    }
});

test('listRecentSaves returns newest saves first with run summary fields for resume UI', () => {
    const saves = new Map([
        ['echo-old', {
            savedAt: '2026-05-30T10:00:00.000Z',
            state: {
                player: { traits: ['curious'] },
                world: {
                    currentLocation: 'void',
                    storyBranch: 'awakening',
                    turn: 1,
                    currentArc: {
                        title: 'The First Resonance'
                    },
                    currentQuest: {
                        title: 'Listen to the First Echo'
                    }
                }
            }
        }],
        ['echo-new', {
            savedAt: '2026-06-01T17:00:00.000Z',
            state: {
                player: { traits: ['analytical', 'cautious'] },
                world: {
                    currentLocation: 'clockwork_city',
                    storyBranch: 'investigation',
                    turn: 4,
                    currentArc: {
                        title: 'The Gearwright Mystery'
                    },
                    currentQuest: {
                        title: 'Expose the Hidden Relay'
                    }
                }
            }
        }]
    ]);

    assert.deepEqual(listRecentSaves(saves), [
        {
            sessionId: 'echo-new',
            savedAt: '2026-06-01T17:00:00.000Z',
            turn: 4,
            location: 'clockwork_city',
            storyBranch: 'investigation',
            traitCount: 2,
            arcTitle: 'The Gearwright Mystery',
            questTitle: 'Expose the Hidden Relay',
            inventoryCount: 0,
            woundCount: 0
        },
        {
            sessionId: 'echo-old',
            savedAt: '2026-05-30T10:00:00.000Z',
            turn: 1,
            location: 'void',
            storyBranch: 'awakening',
            traitCount: 1,
            arcTitle: 'The First Resonance',
            questTitle: 'Listen to the First Echo',
            inventoryCount: 0,
            woundCount: 0
        }
    ]);
});

test('listRecentSaves backfills an arc title from story branch when older saves have no stored arc metadata', () => {
    const saves = new Map([
        ['echo-legacy', {
            savedAt: '2026-06-01T17:00:00.000Z',
            state: {
                player: { traits: ['honest'] },
                world: {
                    currentLocation: 'void',
                    storyBranch: 'diplomacy',
                    turn: 2
                }
            }
        }]
    ]);

    assert.deepEqual(listRecentSaves(saves, 1), [{
        sessionId: 'echo-legacy',
        savedAt: '2026-06-01T17:00:00.000Z',
        turn: 2,
        location: 'void',
        storyBranch: 'diplomacy',
        traitCount: 1,
        arcTitle: 'Echoes in Alliance',
        questTitle: null,
        inventoryCount: 0,
        woundCount: 0
    }]);
});

test('buildStoryPrompt includes inventory, relationships, wounds, and unlocked-choice hints for phase 4 state', () => {
    const { storyContext, fullPrompt } = buildStoryPrompt({
        context: {
            location: 'memory_gardens',
            storyBranch: 'diplomacy',
            currentArc: {
                title: 'The Garden Accord',
                objective: 'Earn the trust of the Gardeners of Remembrance before the sealed memories turn hostile.'
            },
            currentQuest: {
                title: 'The Garden Accord',
                stageLabel: 'Broker the Accord',
                objective: 'Secure a lasting pact before fear turns the garden against outsiders forever.',
                progress: 3,
                totalStages: 3,
                status: 'completed'
            },
            previousChoice: 'Ask the Archivist to reveal what the ritual is hiding',
            visitedLocations: ['void', 'memory_gardens'],
            knownCharacters: ['The Archivist'],
            knownFactions: ['Gardeners of Remembrance'],
            factionStandings: {
                'Gardeners of Remembrance': 2
            },
            relationships: {
                'The Archivist': 2
            },
            branchSceneGuidance: 'Diplomacy scenes should revolve around negotiation, trust, and emotional stakes.',
            unlockedChoiceHints: [
                'Brass Key can open sealed relay gates.',
                'The Archivist may vouch for the player in tense negotiations.'
            ],
            recentHistory: [
                'Turn 1: Promise the Archivist you will help calm the sealed blooms'
            ],
            currentSceneText: 'The ritual basin trembles under lantern-light.'
        },
        playerState: {
            traits: ['empathic', 'decisive'],
            turn: 3,
            health: 80,
            memory: 2,
            reputation: 3,
            inventory: ['Brass Key', 'Remembrance Seed'],
            wounds: ['Fracture Burn']
        },
        prompt: 'The player chose: "Ask the Archivist to reveal what the ritual is hiding". Continue the story.'
    });

    assert.match(storyContext, /Inventory: Brass Key, Remembrance Seed/);
    assert.match(storyContext, /Relationships: The Archivist \(2\)/);
    assert.match(storyContext, /Active wounds: Fracture Burn/);
    assert.match(storyContext, /Unlocked choice opportunities:/);
    assert.match(fullPrompt, /Honor important inventory items, relationships, and wounds when deciding who can help or what becomes possible/);
    assert.match(fullPrompt, /If the context suggests an unlocked item, social leverage, or recovery action, make at least one choice reflect it/);
});

test('listRecentSaves includes compact phase 4 inventory and wound metadata for resume UI', () => {
    const saves = new Map([
        ['echo-phase4', {
            savedAt: '2026-06-02T08:00:00.000Z',
            state: {
                player: {
                    traits: ['analytical', 'careful'],
                    inventory: [
                        { id: 'brass_key', name: 'Brass Key' },
                        { id: 'remembrance_seed', name: 'Remembrance Seed' }
                    ],
                    wounds: [
                        { id: 'fracture_burn', name: 'Fracture Burn', severity: 'moderate' }
                    ]
                },
                world: {
                    currentLocation: 'memory_gardens',
                    storyBranch: 'diplomacy',
                    turn: 5,
                    currentArc: {
                        title: 'The Garden Accord'
                    },
                    currentQuest: {
                        title: 'Broker the Accord'
                    }
                }
            }
        }]
    ]);

    assert.deepEqual(listRecentSaves(saves, 1), [{
        sessionId: 'echo-phase4',
        savedAt: '2026-06-02T08:00:00.000Z',
        turn: 5,
        location: 'memory_gardens',
        storyBranch: 'diplomacy',
        traitCount: 2,
        arcTitle: 'The Garden Accord',
        questTitle: 'Broker the Accord',
        inventoryCount: 2,
        woundCount: 1
    }]);
});
