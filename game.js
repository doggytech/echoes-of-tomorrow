/**
 * Echoes of Tomorrow - Core Game Engine
 * Procedural storytelling RPG with AI integration
 */

// Game State
const GameState = {
    player: {
        name: '',
        health: 100,
        memory: 0,
        reputation: 0,
        inventory: [],
        wounds: [],
        traits: []
    },
    world: {
        currentLocation: 'void',
        visitedLocations: [],
        knownCharacters: [],
        knownFactions: [],
        factionStandings: {},
        relationships: {},
        storyBranch: 'awakening',
        turn: 0,
        currentArc: null,
        currentQuest: null
    },
    story: {
        history: [],
        currentScene: null,
        pendingChoices: [],
        latestOutcome: null
    },
    sessionId: null,
    aiEnabled: false,
    recentSaves: []
};

// Generate session ID
function generateSessionId() {
    return 'echo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Story Templates - Procedural content generators
const StoryTemplates = {
    openings: [
        {
            id: 'void_awakening',
            title: 'The Void Between',
            text: `You awaken floating in a space that is neither dark nor light. Around you, fragments of reality drift like broken glass—scenes from lives you don't remember living.

A voice echoes, neither male nor female: *"The fracture spreads. You are the echo that can mend it... or widen it."*

Before you, three paths materialize from the void, each humming with a different resonance.`,
            choices: [
                { id: 'path_memory', text: 'Follow the path of golden light — it feels like forgotten memories', trait: 'empathic' },
                { id: 'path_logic', text: 'Take the crystalline bridge — its structure promises understanding', trait: 'analytical' },
                { id: 'path_chaos', text: 'Step into the swirling shadows — where unpredictability beckons', trait: 'adaptable' }
            ]
        },
        {
            id: 'ruined_city',
            title: 'The City That Was',
            text: `You open your eyes to rain falling upward. The city around you exists in multiple states simultaneously—some buildings pristine, others crumbling, some both at once.

A figure in a tattered coat approaches. Their face shifts between young and old as they speak: *"Another wanderer. Tell me—do you remember your name, or has the fracture taken that too?"*`,
            choices: [
                { id: 'name_truth', text: 'Admit you remember nothing', trait: 'honest' },
                { id: 'name_lie', text: 'Give a false name — trust is dangerous here', trait: 'cautious' },
                { id: 'name_deflect', text: 'Ask who they are first', trait: 'strategic' }
            ]
        },
        {
            id: 'time_merchant',
            title: 'The Merchant of Moments',
            text: `You find yourself in a bustling market where merchants trade in memories, years, and forgotten dreams. The air shimmers with temporal distortion.

A vendor with eyes like hourglasses beckons you: *"Fresh arrival! Everyone starts with one memory. Trade wisely—some moments are worth more than others."*

They display three glowing orbs, each containing a different memory.`,
            choices: [
                { id: 'memory_love', text: 'Choose the warm golden memory — love, laughter, connection', trait: 'heart' },
                { id: 'memory_knowledge', text: 'Select the silver memory — skills, languages, understanding', trait: 'mind' },
                { id: 'memory_power', text: 'Grasp the dark red memory — strength, survival, will', trait: 'force' }
            ]
        }
    ],
    
    locations: {
        memory_gardens: {
            name: 'The Memory Gardens',
            description: 'Paths of crystallized recollections wind through flowers that bloom with forgotten moments.',
            encounters: ['memory_keeper', 'lost_child', 'time_thief'],
            items: ['echo_flower', 'remembrance_seed', 'chronicle_bark']
        },
        clockwork_city: {
            name: 'Clockwork City',
            description: 'Gears the size of buildings turn, powered by captured moments. The air smells of copper and nostalgia.',
            encounters: ['gear_master', 'temporal_refugee', 'moment_miner'],
            items: ['brass_key', 'compressed_hour', 'mechanical_heart']
        },
        fracture_sea: {
            name: 'The Fracture Sea',
            description: 'Waters that flow in all directions simultaneously. Ships sail on waves of possibility.',
            encounters: ['possibility_pirate', 'temporal_fisher', 'echo_captain'],
            items: ['wave_crystal', 'anchor_of_certainty', 'compass_of_maybes']
        }
    },
    
    characters: {
        memory_keeper: {
            name: 'The Archivist',
            description: 'A being composed of scrolls and whispers, cataloging all that was and might be.',
            personality: 'wise, cryptic, protective',
            quests: ['recover_lost_memory', 'catalog_new_branch', 'seal_dangerous_recall']
        },
        time_thief: {
            name: 'Kael the Moment-Stolen',
            description: 'A rogue who trades in years—yours for theirs, futures for pasts.',
            personality: 'charming, dangerous, haunted',
            quests: ['steal_from_the_archivist', 'escape_temporal_prison', 'find_original_self']
        }
    }
};

function getRecentHistory(history, limit = 3) {
    return history.slice(-limit).map((entry) => `Turn ${entry.turn}: ${entry.choiceText}`);
}

function formatStoryLabel(value, fallback = 'Unknown') {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return fallback;
    }

    return normalized
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const BRANCH_VISUAL_THEMES = {
    awakening: {
        id: 'awakening',
        label: 'Awakening Pulse',
        accent: 'Rose',
        mood: 'Reality is still introducing itself, and each choice defines what kind of Echo you are becoming.'
    },
    investigation: {
        id: 'investigation',
        label: 'Investigative Pressure',
        accent: 'Cyan',
        mood: 'Patterns sharpen, hidden structures surface, and every clue suggests a larger machine behind the fracture.'
    },
    survival: {
        id: 'survival',
        label: 'Fracture Survival',
        accent: 'Amber',
        mood: 'The world is unstable, resources are thin, and every calm decision buys you one more turn to endure.'
    },
    diplomacy: {
        id: 'diplomacy',
        label: 'Diplomatic Tension',
        accent: 'Gold',
        mood: 'Trust, reputation, and emotional leverage matter as much as any relic or weapon you could carry.'
    },
    momentum: {
        id: 'momentum',
        label: 'Momentum Surge',
        accent: 'Violet',
        mood: 'Events accelerate, pressure compounds, and decisive action can seize the future before rivals react.'
    }
};

function getBranchVisualTheme(worldState = {}) {
    const branch = String(worldState.storyBranch || 'awakening').trim().toLowerCase();
    return BRANCH_VISUAL_THEMES[branch] || BRANCH_VISUAL_THEMES.awakening;
}

function describeChoicePresentation(choice = {}) {
    const branch = deriveStoryBranchFromChoice(choice, 'awakening');

    if (branch === 'investigation') {
        return {
            icon: '🔎',
            approach: 'Investigate',
            posture: 'Slow, precise read',
            risk: 'Lower immediate risk',
            payoff: 'High information gain',
            hint: 'Trade speed for clarity and expose how this scene really works.',
            toneClass: 'choice-investigation'
        };
    }

    if (branch === 'survival') {
        return {
            icon: '🛡️',
            approach: 'Stabilize',
            posture: 'Defensive stabilization',
            risk: 'Safer, lower upside',
            payoff: 'Protect health and position',
            hint: 'Reduce immediate risk and protect your ability to keep moving.',
            toneClass: 'choice-survival'
        };
    }

    if (branch === 'diplomacy') {
        return {
            icon: '🤝',
            approach: 'Connect',
            posture: 'Social leverage',
            risk: 'Trust must land',
            payoff: 'Bonds and reputation',
            hint: 'Invest in trust, perception, and the people who may shape what happens next.',
            toneClass: 'choice-diplomacy'
        };
    }

    if (branch === 'momentum') {
        return {
            icon: '⚔️',
            approach: 'Commit',
            posture: 'Aggressive advance',
            risk: 'Higher immediate danger',
            payoff: 'Fast progress and pressure',
            hint: 'Press forward fast and accept that bold action may create new instability.',
            toneClass: 'choice-momentum'
        };
    }

    return {
        icon: '✨',
        approach: 'Awaken',
        posture: 'Exploratory discovery',
        risk: 'Uncertain outcome',
        payoff: 'Identity and direction',
        hint: 'Test the shape of this world and discover what kind of Echo you are becoming.',
        toneClass: 'choice-awakening'
    };
}

function getOutcomeSpotlight(outcome = null) {
    if (!outcome) {
        return {
            label: 'No major consequence yet',
            tone: 'spotlight-neutral',
            detail: 'Your next decision will establish the first real pressure on this timeline.'
        };
    }

    const relationshipShift = Object.values(outcome.relationshipChanges || {}).reduce((sum, value) => sum + value, 0);
    const totalDelta = (outcome.healthDelta || 0) + (outcome.memoryDelta || 0) + (outcome.reputationDelta || 0);
    const woundsAdded = (outcome.woundsAdded || []).length;
    const woundsRemoved = (outcome.woundsRemoved || []).length;

    if (woundsAdded > 0 || (outcome.healthDelta || 0) < 0) {
        return {
            label: 'Aftershock',
            tone: 'spotlight-danger',
            detail: 'The fracture pushed back. The next move should account for immediate instability.'
        };
    }

    if (outcome.itemGained || (outcome.memoryDelta || 0) > 0) {
        return {
            label: 'Breakthrough',
            tone: 'spotlight-insight',
            detail: 'You pulled something useful from the scene. Press that advantage before it cools.'
        };
    }

    if (relationshipShift > 0 || (outcome.reputationDelta || 0) > 0) {
        return {
            label: 'Trust Shift',
            tone: 'spotlight-bond',
            detail: 'Someone is leaning closer to your side. Social leverage is on the table right now.'
        };
    }

    if (woundsRemoved > 0 || (outcome.healthDelta || 0) > 0) {
        return {
            label: 'Stabilized',
            tone: 'spotlight-recovery',
            detail: 'You bought breathing room. This is a good window to consolidate or reposition.'
        };
    }

    if (totalDelta > 0) {
        return {
            label: 'Advantage',
            tone: 'spotlight-insight',
            detail: 'The scene tilted in your favor. Decide whether to deepen that edge or cash it in.'
        };
    }

    return {
        label: 'Ripple Effect',
        tone: 'spotlight-neutral',
        detail: 'The change is subtle, but the timeline has shifted. Watch what it enables next.'
    };
}

const CHARACTER_DISCOVERY_RULES = [
    { name: 'The Archivist', patterns: ['the archivist', 'archivist', 'memory keeper'] },
    { name: 'Kael the Moment-Stolen', patterns: ['kael', 'moment-stolen', 'time thief'] },
    { name: 'The Child of Light', patterns: ['child made of light', 'child of light'] },
    { name: 'The Hourglass Vendor', patterns: ['vendor with eyes like hourglasses', 'hourglass vendor'] },
    { name: 'The Ledger Merchant', patterns: ['merchant with abacus eyes', 'abacus eyes'] }
];

const FACTION_DISCOVERY_RULES = [
    { name: 'Gardeners of Remembrance', patterns: ['gardeners of remembrance', 'memory gardens', 'sealed memories'] },
    { name: 'Clockwork Syndicate', patterns: ['clockwork syndicate', 'clockwork city', 'city of gears', 'merchant with abacus eyes'] },
    { name: 'Court of Shattered Crowns', patterns: ['court of shattered crowns', 'throne room', 'chaos-walker'] }
];

const QUEST_TEMPLATES = {
    gearwright_mystery: {
        id: 'gearwright_mystery',
        title: 'The Gearwright Mystery',
        stages: [
            {
                stageLabel: 'Trace the Syndicate Signal',
                objective: 'Find out where the Clockwork Syndicate is directing the stolen resonance.'
            },
            {
                stageLabel: 'Expose the Hidden Relay',
                objective: 'Map the relay network before the Syndicate moves the fracture engine.'
            },
            {
                stageLabel: 'Confront the Gearwrights',
                objective: 'Reach the heart of the machine and decide what to do with the engine behind the fracture.'
            }
        ]
    },
    garden_accord: {
        id: 'garden_accord',
        title: 'The Garden Accord',
        stages: [
            {
                stageLabel: 'Win the Gardeners\' Trust',
                objective: 'Show the Gardeners of Remembrance that you can protect what they guard.'
            },
            {
                stageLabel: 'Calm the Sealed Echoes',
                objective: 'Help the Gardeners contain the dangerous memories breaking loose among the blooms.'
            },
            {
                stageLabel: 'Broker the Accord',
                objective: 'Secure a lasting pact before fear turns the garden against outsiders forever.'
            }
        ]
    },
    fracture_line: {
        id: 'fracture_line',
        title: 'Holding the Fracture Line',
        stages: [
            {
                stageLabel: 'Hold the Breach',
                objective: 'Contain the immediate rupture before it swallows the district.'
            },
            {
                stageLabel: 'Stabilize the Fault',
                objective: 'Find a way to keep the fracture from tearing the area apart again.'
            },
            {
                stageLabel: 'Seal the Surge',
                objective: 'Finish the emergency work before the next wave of instability hits.'
            }
        ]
    },
    shaping_tomorrow: {
        id: 'shaping_tomorrow',
        title: 'The Shaping of Tomorrow',
        stages: [
            {
                stageLabel: 'Press the Advantage',
                objective: 'Use the fracture\'s momentum before your rivals can reposition.'
            },
            {
                stageLabel: 'Break the Stalemate',
                objective: 'Turn your recent gains into leverage over the forces shaping this reality fragment.'
            },
            {
                stageLabel: 'Claim the Future',
                objective: 'Make the decisive move that defines what this timeline becomes next.'
            }
        ]
    },
    first_resonance: {
        id: 'first_resonance',
        title: 'The First Resonance',
        stages: [
            {
                stageLabel: 'Find Your Bearing',
                objective: 'Learn what kind of Echo you are and what this first fragment wants from you.'
            },
            {
                stageLabel: 'Follow the Pull',
                objective: 'Choose which thread of the fracture deserves your attention first.'
            },
            {
                stageLabel: 'Commit to a Path',
                objective: 'Take the action that transforms curiosity into a real direction.'
            }
        ]
    }
};

const WOUND_LIBRARY = {
    fracture_burn: {
        id: 'fracture_burn',
        name: 'Fracture Burn',
        severity: 'moderate'
    }
};

function mergeUniqueStrings(existing = [], additions = []) {
    return [...new Set([...(existing || []), ...(additions || [])].filter(Boolean))];
}

function normalizeInventoryItem(item) {
    if (!item) {
        return null;
    }

    if (typeof item === 'string') {
        return {
            id: item.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            name: formatStoryLabel(item, item)
        };
    }

    const id = String(item.id || item.name || '').trim();
    const name = String(item.name || formatStoryLabel(id, 'Unknown item')).trim();
    if (!id || !name) {
        return null;
    }

    return {
        id,
        name,
        ...(item.description ? { description: item.description } : {})
    };
}

function normalizeWound(wound) {
    if (!wound) {
        return null;
    }

    if (typeof wound === 'string') {
        return WOUND_LIBRARY[wound] || {
            id: wound,
            name: formatStoryLabel(wound, wound),
            severity: 'moderate'
        };
    }

    return {
        id: wound.id,
        name: wound.name || formatStoryLabel(wound.id, 'Unknown wound'),
        severity: wound.severity || 'moderate'
    };
}

function getInventoryItems(playerState = {}) {
    return (Array.isArray(playerState.inventory) ? playerState.inventory : [])
        .map(normalizeInventoryItem)
        .filter(Boolean);
}

function getInventoryIds(playerState = {}) {
    return new Set(getInventoryItems(playerState).map((item) => item.id));
}

function getActiveWounds(playerState = {}) {
    return (Array.isArray(playerState.wounds) ? playerState.wounds : [])
        .map(normalizeWound)
        .filter(Boolean);
}

function discoverWorldEntities(sceneText, currentWorld = {}) {
    const text = String(sceneText || '').toLowerCase();
    const discoveredCharacters = CHARACTER_DISCOVERY_RULES
        .filter(({ patterns }) => patterns.some((pattern) => text.includes(pattern)))
        .map(({ name }) => name);
    const discoveredFactions = FACTION_DISCOVERY_RULES
        .filter(({ patterns }) => patterns.some((pattern) => text.includes(pattern)))
        .map(({ name }) => name);

    return {
        knownCharacters: mergeUniqueStrings(currentWorld.knownCharacters, discoveredCharacters),
        knownFactions: mergeUniqueStrings(currentWorld.knownFactions, discoveredFactions)
    };
}

function getChoiceOutcome(choice, { playerState = {}, worldState = {} } = {}) {
    const branch = deriveStoryBranchFromChoice(choice, worldState.storyBranch || 'awakening');
    const activeWounds = getActiveWounds(playerState);

    if (branch === 'investigation') {
        return {
            healthDelta: 0,
            memoryDelta: 1,
            reputationDelta: 0,
            woundsAdded: [],
            woundsRemoved: [],
            summary: 'You recover a useful fragment of understanding from the fracture.'
        };
    }

    if (branch === 'survival') {
        if (activeWounds.length > 0) {
            return {
                healthDelta: 8,
                memoryDelta: 0,
                reputationDelta: 0,
                woundsAdded: [],
                woundsRemoved: activeWounds.map((wound) => wound.id),
                summary: `You tend to the ${activeWounds[0].name.toLowerCase()} and steady yourself before the fracture can bite deeper.`
            };
        }

        return {
            healthDelta: 5,
            memoryDelta: 0,
            reputationDelta: 0,
            woundsAdded: [],
            woundsRemoved: [],
            summary: 'Your caution steadies your body before the fracture can bite deeper.'
        };
    }

    if (branch === 'diplomacy') {
        return {
            healthDelta: 0,
            memoryDelta: 0,
            reputationDelta: 1,
            woundsAdded: [],
            woundsRemoved: [],
            summary: 'Someone in this fractured world is more willing to trust you now.'
        };
    }

    if (branch === 'momentum') {
        const woundsAdded = activeWounds.some((wound) => wound.id === 'fracture_burn')
            ? []
            : [WOUND_LIBRARY.fracture_burn];
        return {
            healthDelta: -5,
            memoryDelta: 0,
            reputationDelta: 1,
            woundsAdded,
            woundsRemoved: [],
            summary: woundsAdded.length > 0
                ? 'You force the story forward, but the fracture leaves a burning mark behind.'
                : 'You force the story forward, even if the fracture leaves a mark.'
        };
    }

    return {
        healthDelta: 0,
        memoryDelta: 0,
        reputationDelta: 0,
        woundsAdded: [],
        woundsRemoved: [],
        summary: 'The fracture shifts, but its meaning is not clear yet.'
    };
}

function getQuestTemplate(worldState = {}) {
    const branch = worldState.storyBranch || 'awakening';
    const location = worldState.currentLocation || 'void';
    const factions = Array.isArray(worldState.knownFactions) ? worldState.knownFactions : [];

    if (branch === 'investigation' && location === 'clockwork_city' && factions.includes('Clockwork Syndicate')) {
        return QUEST_TEMPLATES.gearwright_mystery;
    }

    if (branch === 'diplomacy' && location === 'memory_gardens' && factions.includes('Gardeners of Remembrance')) {
        return QUEST_TEMPLATES.garden_accord;
    }

    if (branch === 'survival') {
        return QUEST_TEMPLATES.fracture_line;
    }

    if (branch === 'momentum') {
        return QUEST_TEMPLATES.shaping_tomorrow;
    }

    return QUEST_TEMPLATES.first_resonance;
}

function buildQuestSnapshot(template, progress = 1) {
    if (!template) {
        return null;
    }

    const totalStages = template.stages.length;
    const clampedProgress = Math.min(Math.max(progress, 1), totalStages);
    const activeStage = template.stages[clampedProgress - 1];

    return {
        id: template.id,
        title: template.title,
        stageLabel: activeStage.stageLabel,
        objective: activeStage.objective,
        progress: clampedProgress,
        totalStages,
        status: clampedProgress >= totalStages ? 'completed' : 'active'
    };
}

function deriveQuestState(previousWorldState = {}, nextWorldState = {}) {
    const template = getQuestTemplate(nextWorldState);
    const previousQuest = previousWorldState.currentQuest;
    const nextProgress = previousQuest?.id === template.id
        ? Math.min((previousQuest.progress || 1) + 1, template.stages.length)
        : 1;

    return buildQuestSnapshot(template, nextProgress);
}

function getFactionStandingChanges(nextWorldState = {}) {
    const updates = {};
    const factions = Array.isArray(nextWorldState.knownFactions) ? nextWorldState.knownFactions : [];

    if (nextWorldState.storyBranch === 'investigation' && nextWorldState.currentLocation === 'clockwork_city' && factions.includes('Clockwork Syndicate')) {
        updates['Clockwork Syndicate'] = 1;
    }

    if (nextWorldState.storyBranch === 'diplomacy' && nextWorldState.currentLocation === 'memory_gardens' && factions.includes('Gardeners of Remembrance')) {
        updates['Gardeners of Remembrance'] = 1;
    }

    if (nextWorldState.storyBranch === 'momentum' && factions.includes('Court of Shattered Crowns')) {
        updates['Court of Shattered Crowns'] = 1;
    }

    return updates;
}

function mergeFactionStandings(existing = {}, updates = {}) {
    const merged = { ...(existing || {}) };

    for (const [name, delta] of Object.entries(updates)) {
        if (!delta) {
            continue;
        }

        merged[name] = (merged[name] || 0) + delta;
    }

    return merged;
}

function getRelationshipChanges(nextWorldState = {}) {
    const updates = {};
    const characters = Array.isArray(nextWorldState.knownCharacters) ? nextWorldState.knownCharacters : [];

    if (nextWorldState.storyBranch === 'diplomacy' && characters.includes('The Archivist')) {
        updates['The Archivist'] = 1;
    }

    if (nextWorldState.storyBranch === 'investigation' && characters.includes('The Ledger Merchant')) {
        updates['The Ledger Merchant'] = 1;
    }

    if (nextWorldState.storyBranch === 'momentum' && characters.includes('Kael the Moment-Stolen')) {
        updates['Kael the Moment-Stolen'] = 1;
    }

    return updates;
}

function mergeRelationships(existing = {}, updates = {}) {
    const merged = { ...(existing || {}) };

    for (const [name, delta] of Object.entries(updates)) {
        if (!delta) {
            continue;
        }

        merged[name] = (merged[name] || 0) + delta;
    }

    return merged;
}

function getInventoryReward(playerState = {}, worldState = {}) {
    const inventoryIds = getInventoryIds(playerState);
    const rewards = [
        {
            id: 'brass_key',
            name: 'Brass Key',
            description: 'A Syndicate-forged key that opens sealed relay housings.',
            condition: worldState.storyBranch === 'investigation' && worldState.currentLocation === 'clockwork_city'
        },
        {
            id: 'remembrance_seed',
            name: 'Remembrance Seed',
            description: 'A living memory-seed that can calm unstable blooms.',
            condition: worldState.storyBranch === 'diplomacy' && worldState.currentLocation === 'memory_gardens'
        }
    ];

    return rewards.find((reward) => reward.condition && !inventoryIds.has(reward.id)) || null;
}

function buildRelationshipSummary(relationships = {}) {
    return Object.entries(relationships)
        .filter(([, value]) => Number.isFinite(value) && value !== 0)
        .sort((left, right) => right[1] - left[1])
        .map(([name, value]) => `${name} (${value})`);
}

function enhanceSceneChoices(sceneData, playerState = {}, worldState = {}) {
    const baseChoices = Array.isArray(sceneData?.choices) ? sceneData.choices : [];
    const text = String(sceneData?.text || '').toLowerCase();
    const inventoryIds = getInventoryIds(playerState);
    const wounds = getActiveWounds(playerState);
    const relationships = worldState.relationships && typeof worldState.relationships === 'object'
        ? worldState.relationships
        : {};
    const unlockedChoices = [];

    if (inventoryIds.has('brass_key') && /(sealed|relay|gate|hatch)/.test(text)) {
        unlockedChoices.push({
            id: `inventory_brass_key_${Date.now()}`,
            text: 'Use the Brass Key to unlock the sealed relay gate',
            trait: 'investigation',
            source: 'inventory'
        });
    }

    if (inventoryIds.has('remembrance_seed') && /(memory|garden|bloom)/.test(text)) {
        unlockedChoices.push({
            id: `inventory_seed_${Date.now()}`,
            text: 'Plant the Remembrance Seed to calm the unstable bloom',
            trait: 'caution',
            source: 'inventory'
        });
    }

    if ((relationships['The Archivist'] || 0) >= 2 && /(archivist|memory|garden|ritual)/.test(text)) {
        unlockedChoices.push({
            id: `relationship_archivist_${Date.now()}`,
            text: 'Ask the Archivist to vouch for you before the ritual breaks',
            trait: 'empathic',
            source: 'relationship'
        });
    }

    if (wounds.length > 0) {
        const primaryWound = wounds[0];
        unlockedChoices.push({
            id: `recovery_${primaryWound.id}_${Date.now()}`,
            text: `Treat your ${primaryWound.name} before it worsens`,
            trait: 'caution',
            source: 'recovery'
        });
    }

    const dedupedChoices = [...unlockedChoices, ...baseChoices].filter((choice, index, allChoices) => {
        const textKey = String(choice?.text || '').trim().toLowerCase();
        return textKey && allChoices.findIndex((candidate) => String(candidate?.text || '').trim().toLowerCase() === textKey) === index;
    });

    return {
        ...sceneData,
        choices: dedupedChoices
    };
}

function getBranchSceneGuidance(worldState = {}, latestOutcome = null) {
    const branch = worldState.storyBranch || 'awakening';
    const baseGuidanceByBranch = {
        investigation: 'Investigation scenes should reward pattern-recognition, hidden machinery, and consequential discoveries.',
        survival: 'Survival scenes should revolve around immediate danger, scarce stability, and costly protection.',
        diplomacy: 'Diplomacy scenes should revolve around negotiation, trust, and emotional stakes.',
        momentum: 'Momentum scenes should reward decisive action, leverage, and unstable opportunities.',
        awakening: 'Awakening scenes should emphasize discovery, uncertainty, and identity-forming choices.'
    };
    const factionPressure = Object.entries(worldState.factionStandings || {})
        .filter(([, standing]) => Number.isFinite(standing) && standing !== 0)
        .sort((left, right) => right[1] - left[1])
        .map(([name, standing]) => `${name} (standing ${standing})`)
        .join(', ');

    return [
        baseGuidanceByBranch[branch] || baseGuidanceByBranch.awakening,
        worldState.currentQuest ? `Active quest: ${worldState.currentQuest.title} — ${worldState.currentQuest.stageLabel}. Objective: ${worldState.currentQuest.objective}` : null,
        factionPressure ? `Faction pressure: ${factionPressure}` : null,
        latestOutcome?.summary ? `Latest consequence: ${latestOutcome.summary}` : null
    ].filter(Boolean).join(' ');
}

function getCurrentStoryArc(worldState = {}) {
    const branch = worldState.storyBranch || 'awakening';
    const location = worldState.currentLocation || 'void';
    const factions = Array.isArray(worldState.knownFactions) ? worldState.knownFactions : [];

    if (branch === 'investigation' && location === 'clockwork_city' && factions.includes('Clockwork Syndicate')) {
        return {
            title: 'The Gearwright Mystery',
            objective: 'Follow the Clockwork Syndicate and learn what they are building inside the fracture.'
        };
    }

    if (branch === 'diplomacy' && location === 'memory_gardens' && factions.includes('Gardeners of Remembrance')) {
        return {
            title: 'The Garden Accord',
            objective: 'Earn the trust of the Gardeners of Remembrance before the sealed memories turn hostile.'
        };
    }

    if (branch === 'survival') {
        return {
            title: 'Holding the Fracture Line',
            objective: 'Stabilize the danger around you before the fracture gets worse.'
        };
    }

    if (branch === 'diplomacy') {
        return {
            title: 'Echoes in Alliance',
            objective: 'Build trust with the people shaped by this fracture.'
        };
    }

    if (branch === 'momentum') {
        return {
            title: 'The Shaping of Tomorrow',
            objective: 'Push forward and reshape the fracture before it traps you.'
        };
    }

    if (branch === 'investigation') {
        return {
            title: 'Threads of Inquiry',
            objective: 'Uncover how this fragment of reality fits into the larger fracture.'
        };
    }

    return {
        title: 'The First Resonance',
        objective: 'Orient yourself and discover what kind of Echo you will become.'
    };
}

function getJournalEntries(history, limit = 4) {
    return history
        .slice(-limit)
        .reverse()
        .map((entry) => ({
            turn: entry.turn,
            choiceText: entry.choiceText || 'Unknown choice',
            traitLabel: formatStoryLabel(entry.trait),
            ...(entry.outcomeSummary ? { outcomeSummary: entry.outcomeSummary } : {})
        }));
}

function getCurrentObjective(worldState = {}) {
    return getCurrentStoryArc(worldState).objective;
}

function formatSaveTimestamp(timestamp) {
    if (!timestamp) {
        return 'Unknown save time';
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return 'Unknown save time';
    }

    return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function formatOutcomeDelta(label, value) {
    if (!value) {
        return null;
    }

    return `${value > 0 ? '+' : ''}${value} ${label}`;
}

function inferLocationFromSceneText(sceneText, currentLocation = 'void') {
    const text = String(sceneText || '').toLowerCase();
    const locationPatterns = [
        { location: 'clockwork_city', patterns: ['clockwork city', 'city of gears', 'copper streets', 'clocktower', 'gear'] },
        { location: 'memory_gardens', patterns: ['memory gardens', 'garden', 'flowers bloom', 'archivist', 'memory keeper'] },
        { location: 'fracture_sea', patterns: ['fracture sea', 'ships sail', 'waves of possibility', 'anchor of certainty', 'temporal fisher'] }
    ];

    for (const { location, patterns } of locationPatterns) {
        if (patterns.some((pattern) => text.includes(pattern))) {
            return location;
        }
    }

    return currentLocation || 'void';
}

function deriveStoryBranchFromChoice(choice, currentBranch = 'awakening') {
    const trait = String(choice?.trait || '').toLowerCase();

    if (['curious', 'analytical', 'strategic', 'mind', 'focused', 'investigation'].includes(trait)) {
        return 'investigation';
    }

    if (['careful', 'cautious', 'wary', 'practical', 'grounded', 'caution'].includes(trait)) {
        return 'survival';
    }

    if (['social', 'empathic', 'generous', 'honest', 'heart'].includes(trait)) {
        return 'diplomacy';
    }

    if (['bold', 'adaptable', 'ambitious', 'force', 'determined', 'independent', 'pragmatic', 'shrewd', 'decisive'].includes(trait)) {
        return 'momentum';
    }

    return currentBranch;
}

function deriveNextWorldState(worldState, choice, nextSceneText) {
    const nextLocation = inferLocationFromSceneText(nextSceneText, worldState.currentLocation);
    const visitedLocations = worldState.visitedLocations.includes(nextLocation)
        ? worldState.visitedLocations
        : [...worldState.visitedLocations, nextLocation];
    const storyBranch = deriveStoryBranchFromChoice(choice, worldState.storyBranch);
    const discoveredEntities = discoverWorldEntities(nextSceneText, worldState);
    const nextWorldState = {
        ...worldState,
        currentLocation: nextLocation,
        visitedLocations,
        knownCharacters: discoveredEntities.knownCharacters,
        knownFactions: discoveredEntities.knownFactions,
        storyBranch,
        turn: worldState.turn + 1
    };
    const factionStandings = mergeFactionStandings(
        worldState.factionStandings,
        getFactionStandingChanges(nextWorldState)
    );
    const relationships = mergeRelationships(
        worldState.relationships,
        getRelationshipChanges(nextWorldState)
    );
    const worldWithFactions = {
        ...nextWorldState,
        factionStandings,
        relationships
    };

    return {
        ...worldWithFactions,
        currentArc: getCurrentStoryArc(worldWithFactions),
        currentQuest: deriveQuestState(worldState, worldWithFactions)
    };
}

// AI Story Generation
async function generateAIStory(choice) {
    showLoading();
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                context: {
                    location: GameState.world.currentLocation,
                    previousChoice: choice?.text,
                    storyBranch: GameState.world.storyBranch,
                    currentArc: GameState.world.currentArc,
                    currentQuest: GameState.world.currentQuest,
                    visitedLocations: GameState.world.visitedLocations,
                    knownCharacters: GameState.world.knownCharacters,
                    knownFactions: GameState.world.knownFactions,
                    factionStandings: GameState.world.factionStandings,
                    relationships: GameState.world.relationships,
                    branchSceneGuidance: getBranchSceneGuidance(GameState.world, GameState.story.latestOutcome),
                    unlockedChoiceHints: enhanceSceneChoices({
                        text: GameState.story.currentScene?.text,
                        choices: []
                    }, GameState.player, GameState.world).choices.map((choiceData) => choiceData.text),
                    recentHistory: getRecentHistory(GameState.story.history),
                    currentSceneText: GameState.story.currentScene?.text
                },
                playerState: {
                    traits: GameState.player.traits,
                    turn: GameState.world.turn,
                    health: GameState.player.health,
                    memory: GameState.player.memory,
                    reputation: GameState.player.reputation,
                    inventory: getInventoryItems(GameState.player).map((item) => item.name),
                    wounds: getActiveWounds(GameState.player).map((wound) => wound.name)
                },
                prompt: choice ? `The player chose: "${choice.text}". Continue the story.` : null
            })
        });
        
        if (!response.ok) throw new Error('Failed to generate story');
        
        const data = await response.json();
        GameState.aiEnabled = data.ai;
        
        return {
            text: data.text,
            choices: data.choices.map((c, i) => ({
                id: `ai_choice_${Date.now()}_${i}`,
                text: c.text,
                trait: c.trait
            }))
        };
    } catch (error) {
        console.error('AI generation failed:', error);
        return generateFallbackScene(choice, GameState.world, GameState.story.latestOutcome);
    }
}

// Fallback scene generator
function generateFallbackScene(choice, worldState = GameState.world, latestOutcome = GameState.story.latestOutcome) {
    const branch = worldState?.storyBranch || deriveStoryBranchFromChoice(choice, 'awakening');
    const quest = worldState?.currentQuest;
    const factionPressure = Object.entries(worldState?.factionStandings || {})
        .sort((left, right) => right[1] - left[1])[0];
    const pressureText = factionPressure ? `${factionPressure[0]} is watching your next move.` : 'The fracture itself seems to be waiting for your decision.';
    const latestSummary = latestOutcome?.summary ? ` ${latestOutcome.summary}` : '';
    const branchTemplates = {
        investigation: {
            text: `You follow the freshest pattern in the fracture until it opens into a humming chamber of brass relays and mirrored gears. Every vibration suggests that someone has been routing time itself through this place.${latestSummary}\n\n${quest ? `Your quest, ${quest.title}, presses forward at stage "${quest.stageLabel}."` : 'A deeper mystery is taking shape before you.'} ${pressureText}`,
            choices: [
                { id: `investigate_relay_${Date.now()}`, text: 'Decode the relay pattern before it changes again', trait: 'investigation' },
                { id: `secure_route_${Date.now()}`, text: 'Stabilize the chamber before the machinery overloads', trait: 'caution' },
                { id: `seize_blueprint_${Date.now()}`, text: 'Grab the blueprint core and force the mystery into the open', trait: 'decisive' }
            ]
        },
        diplomacy: {
            text: `Lantern-light passes through drifting petals as voices gather around a fragile negotiation circle. Every memory shared here feels like both a gift and a weapon.${latestSummary}\n\n${quest ? `Your quest, ${quest.title}, now hinges on "${quest.stageLabel}."` : 'Trust is the rarest resource in this fragment.'} ${pressureText}`,
            choices: [
                { id: `broker_truth_${Date.now()}`, text: 'Ask each side to reveal what they fear losing most', trait: 'investigation' },
                { id: `protect_ritual_${Date.now()}`, text: 'Keep the peace while the ritual circle holds', trait: 'caution' },
                { id: `offer_bond_${Date.now()}`, text: 'Offer a binding promise to move the accord forward now', trait: 'decisive' }
            ]
        },
        survival: {
            text: `The fracture convulses without warning, cracking light across the ground and filling the air with razor-thin echoes. Every second you delay makes the next rupture harder to contain.${latestSummary}\n\n${quest ? `Your quest, ${quest.title}, demands progress on "${quest.stageLabel}."` : 'Survival has become the only immediate objective.'} ${pressureText}`,
            choices: [
                { id: `scan_fault_${Date.now()}`, text: 'Study the fault line for the safest place to intervene', trait: 'investigation' },
                { id: `brace_barrier_${Date.now()}`, text: 'Reinforce the failing barrier before anyone else is hit', trait: 'caution' },
                { id: `cut_power_${Date.now()}`, text: 'Shut the rupture down with a risky decisive strike', trait: 'decisive' }
            ]
        },
        momentum: {
            text: `Opportunity flashes through the chaos like a blade catching starlight. Rivals hesitate for a heartbeat, and that single heartbeat could decide the shape of tomorrow.${latestSummary}\n\n${quest ? `Your quest, ${quest.title}, is poised on "${quest.stageLabel}."` : 'This is the moment to force the future to choose a side.'} ${pressureText}`,
            choices: [
                { id: `read_opening_${Date.now()}`, text: 'Read the shifting battlefield before anyone else commits', trait: 'investigation' },
                { id: `guard_gain_${Date.now()}`, text: 'Secure what you have before pushing any farther', trait: 'caution' },
                { id: `press_assault_${Date.now()}`, text: 'Exploit the opening with a bold irreversible move', trait: 'decisive' }
            ]
        }
    };
    const openingTemplates = {
        path_memory: {
            text: `The golden path envelops you in warmth. Memories that aren't yours flood your mind—laughter at a birthday party, tears at a funeral, the quiet contentment of an ordinary Tuesday. You emerge in a garden where flowers bloom with faces you almost recognize.\n\nA child made of light approaches. "You're new," they observe. "Most echoes forget themselves immediately. You must be strong... or stubborn."`,
            choices: [
                { id: 'ask_child', text: 'Ask who they are', trait: 'curious' },
                { id: 'ask_location', text: 'Ask where you are', trait: 'practical' },
                { id: 'share_memory', text: 'Offer to trade a memory', trait: 'generous' }
            ]
        },
        path_logic: {
            text: `The crystalline bridge resonates with mathematical precision. As you walk, equations and patterns etch themselves into your understanding. You arrive at a city of gears and measurements, where time is literally money.\n\nA merchant with abacus eyes calculates your worth in seconds. "New arrival. Unregistered. Interesting." They tap their ledger. "I can give you directions. For a price."`,
            choices: [
                { id: 'pay_time', text: 'Offer five minutes of your life', trait: 'pragmatic' },
                { id: 'negotiate', text: 'Negotiate for information', trait: 'shrewd' },
                { id: 'refuse', text: 'Refuse and explore on your own', trait: 'independent' }
            ]
        },
        path_chaos: {
            text: `The shadows embrace you like old friends. Reality bends, stretches, folds. You emerge somewhere that might be a tavern, might be a throne room, might be both. Patrons with impossible geometries raise glasses to you.\n\nA being with seven eyes and a smile like a knife scar leans close. "Chaos-walker. Bold. Most don't survive their first step into uncertainty. What do you seek?"`,
            choices: [
                { id: 'seek_power', text: 'Power to control the chaos', trait: 'ambitious' },
                { id: 'seek_truth', text: 'The truth behind this fractured world', trait: 'determined' },
                { id: 'seek_escape', text: 'A way back to normal reality', trait: 'grounded' }
            ]
        }
    };

    return openingTemplates[choice?.id] || branchTemplates[branch] || generateRandomScene();
}

// Random Scene Generator
function generateRandomScene() {
    const locations = Object.values(StoryTemplates.locations);
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    const encounters = Object.values(StoryTemplates.characters);
    const encounter = encounters[Math.floor(Math.random() * encounters.length)];
    
    return {
        text: `You find yourself in ${location.name}. ${location.description}\n\nBefore you stands ${encounter.name}. ${encounter.description}\n\n"${generateDialogue(encounter)}"`,
        choices: [
            { id: `talk_${Date.now()}`, text: `Talk with ${encounter.name}`, trait: 'social' },
            { id: `trade_${Date.now()}`, text: 'Offer a trade', trait: 'mercantile' },
            { id: `leave_${Date.now()}`, text: 'Leave and explore elsewhere', trait: 'wary' }
        ]
    };
}

// Dialogue Generator
function generateDialogue(character) {
    const dialogues = {
        'The Archivist': [
            "The records show you shouldn't exist here. Fascinating.",
            "Every choice creates a branch. You're making quite the tree.",
            "Some memories are dangerous. Yours might be one of them."
        ],
        'Kael the Moment-Stolen': [
            "Care to trade? I've got centuries, if you've got courage.",
            "You look like someone with secrets worth stealing.",
            "The past is a commodity. The future? That's priceless."
        ]
    };
    
    const options = dialogues[character.name] || ["What brings you here, wanderer?"];
    return options[Math.floor(Math.random() * options.length)];
}

// Scene Generator
function generateScene(template, context = {}) {
    const scene = {
        id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: template.text,
        choices: template.choices.map(c => ({
            ...c,
            sceneId: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }))
    };
    
    // Add procedural variations based on player state
    if (GameState.player.traits.length > 0) {
        const trait = GameState.player.traits[GameState.player.traits.length - 1];
        scene.text += `\n\n[Your ${trait} nature resonates with this place...]`;
    }
    
    return scene;
}

// Choice Handler
async function handleChoice(choiceId) {
    const choice = GameState.story.currentScene.choices.find(c => c.id === choiceId);
    if (!choice) return;
    const choiceOutcome = getChoiceOutcome(choice, {
        playerState: GameState.player,
        worldState: GameState.world
    });
    
    // Record history
    GameState.story.history.push({
        scene: GameState.story.currentScene.id,
        choice: choiceId,
        choiceText: choice.text,
        trait: choice.trait,
        turn: GameState.world.turn,
        outcomeSummary: choiceOutcome.summary
    });
    
    // Apply trait
    if (choice.trait && !GameState.player.traits.includes(choice.trait)) {
        GameState.player.traits.push(choice.trait);
    }

    GameState.player.health = Math.max(0, GameState.player.health + choiceOutcome.healthDelta);
    GameState.player.memory = Math.max(0, GameState.player.memory + choiceOutcome.memoryDelta);
    GameState.player.reputation = Math.max(0, GameState.player.reputation + choiceOutcome.reputationDelta);
    GameState.player.wounds = getActiveWounds(GameState.player)
        .filter((wound) => !(choiceOutcome.woundsRemoved || []).includes(wound.id));
    for (const wound of choiceOutcome.woundsAdded || []) {
        if (!GameState.player.wounds.some((existing) => existing.id === wound.id)) {
            GameState.player.wounds.push(normalizeWound(wound));
        }
    }
    GameState.story.latestOutcome = {
        ...choiceOutcome,
        woundsAdded: (choiceOutcome.woundsAdded || []).map(normalizeWound),
        woundsRemoved: choiceOutcome.woundsRemoved || []
    };
    
    // Generate next scene (AI or procedural)
    const nextSceneData = await generateAIStory(choice);
    const previousRelationships = { ...(GameState.world.relationships || {}) };
    GameState.world = deriveNextWorldState(GameState.world, choice, nextSceneData.text);
    const relationshipChanges = Object.fromEntries(
        Object.entries(GameState.world.relationships || {}).filter(([name, value]) => value !== (previousRelationships[name] || 0))
            .map(([name, value]) => [name, value - (previousRelationships[name] || 0)])
    );
    if (Object.keys(relationshipChanges).length > 0) {
        GameState.story.latestOutcome.relationshipChanges = relationshipChanges;
    }
    const inventoryReward = getInventoryReward(GameState.player, GameState.world);
    if (inventoryReward) {
        GameState.player.inventory = [...getInventoryItems(GameState.player), inventoryReward];
        GameState.story.latestOutcome.itemGained = inventoryReward;
        GameState.story.latestOutcome.summary = `${GameState.story.latestOutcome.summary} You secure the ${inventoryReward.name}.`;
    } else {
        GameState.player.inventory = getInventoryItems(GameState.player);
    }
    GameState.story.currentScene = enhanceSceneChoices(generateScene(nextSceneData), GameState.player, GameState.world);
    
    // Auto-save
    await saveGame();
    
    // Render
    renderGame();
}

// Save game
async function saveGame() {
    try {
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: GameState.sessionId,
                state: GameState
            })
        });
        await fetchRecentSaves();
    } catch (error) {
        console.error('Save failed:', error);
    }
}

// Load game
async function loadGame(sessionId) {
    try {
        const response = await fetch(`/api/load/${sessionId}`);
        if (response.ok) {
            const data = await response.json();
            Object.assign(GameState, data.state);
            GameState.player.inventory = getInventoryItems(GameState.player);
            GameState.player.wounds = getActiveWounds(GameState.player);
            GameState.player.traits = Array.isArray(GameState.player.traits) ? GameState.player.traits : [];
            GameState.world.visitedLocations = Array.isArray(GameState.world.visitedLocations) ? GameState.world.visitedLocations : [];
            GameState.world.knownCharacters = Array.isArray(GameState.world.knownCharacters) ? GameState.world.knownCharacters : [];
            GameState.world.knownFactions = Array.isArray(GameState.world.knownFactions) ? GameState.world.knownFactions : [];
            GameState.world.factionStandings = GameState.world.factionStandings && typeof GameState.world.factionStandings === 'object' ? GameState.world.factionStandings : {};
            GameState.world.relationships = GameState.world.relationships && typeof GameState.world.relationships === 'object' ? GameState.world.relationships : {};
            GameState.story.history = Array.isArray(GameState.story.history) ? GameState.story.history : [];
            GameState.story.pendingChoices = Array.isArray(GameState.story.pendingChoices) ? GameState.story.pendingChoices : [];
            GameState.world.currentArc = GameState.world.currentArc || getCurrentStoryArc(GameState.world);
            GameState.world.currentQuest = GameState.world.currentQuest || buildQuestSnapshot(getQuestTemplate(GameState.world), 1);
            GameState.story.latestOutcome = GameState.story.latestOutcome || null;
            return true;
        }
    } catch (error) {
        console.error('Load failed:', error);
    }
    return false;
}

async function fetchRecentSaves() {
    try {
        const response = await fetch('/api/saves');
        if (!response.ok) {
            throw new Error('Failed to fetch saves');
        }

        const data = await response.json();
        GameState.recentSaves = Array.isArray(data.saves) ? data.saves : [];
    } catch (error) {
        console.error('Recent saves fetch failed:', error);
        GameState.recentSaves = [];
    }

    return GameState.recentSaves;
}

async function resumeGame(sessionId) {
    const loaded = await loadGame(sessionId);
    if (loaded) {
        renderGame();
    }
}

// Rendering
function renderGame() {
    const container = document.getElementById('game-content');
    
    if (!GameState.story.currentScene) {
        renderStartScreen(container);
        return;
    }

    const branchTheme = getBranchVisualTheme(GameState.world);
    if (typeof document !== 'undefined' && document.body) {
        document.body.dataset.branchTheme = branchTheme.id;
    }

    const aiIndicator = GameState.aiEnabled
        ? '🤖 Live AI scene generation online.'
        : '🧩 Procedural fallback is steering this scene.';
    const journalEntries = getJournalEntries(GameState.story.history);
    const currentArc = GameState.world.currentArc || getCurrentStoryArc(GameState.world);
    const currentObjective = getCurrentObjective(GameState.world);
    const currentQuest = GameState.world.currentQuest || buildQuestSnapshot(getQuestTemplate(GameState.world), 1);
    const stateBadges = [
        `📍 ${formatStoryLabel(GameState.world.currentLocation, 'Void')}`,
        `🧭 ${formatStoryLabel(GameState.world.storyBranch, 'Awakening')}`,
        `✨ ${GameState.player.traits.length} traits awakened`
    ];
    const latestOutcome = GameState.story.latestOutcome;
    const outcomeSpotlight = getOutcomeSpotlight(latestOutcome);
    const outcomeDeltas = latestOutcome
        ? [
            formatOutcomeDelta('Health', latestOutcome.healthDelta),
            formatOutcomeDelta('Memory', latestOutcome.memoryDelta),
            formatOutcomeDelta('Reputation', latestOutcome.reputationDelta)
        ].filter(Boolean)
        : [];
    const knownThreads = [
        ...GameState.world.knownCharacters.map((name) => ({ type: 'Character', name })),
        ...GameState.world.knownFactions.map((name) => ({ type: 'Faction', name }))
    ];
    const factionStandings = Object.entries(GameState.world.factionStandings || {})
        .sort((left, right) => right[1] - left[1]);
    const inventoryItems = getInventoryItems(GameState.player);
    const activeWounds = getActiveWounds(GameState.player);
    const relationshipEntries = Object.entries(GameState.world.relationships || {})
        .filter(([, value]) => Number.isFinite(value) && value !== 0)
        .sort((left, right) => right[1] - left[1]);
    const sceneChoices = GameState.story.currentScene.choices.map((choice) => {
        const presentation = describeChoicePresentation(choice);
        return {
            choice,
            presentation,
            traitLabel: formatStoryLabel(choice.trait || presentation.approach, presentation.approach),
            tone: `${presentation.approach} approach`
        };
    });

    container.innerHTML = `
        <div class="hero-shell">
            <div class="stats-bar">
                <div class="stat">
                    <div class="stat-label">Health</div>
                    <div class="stat-value">${escapeHtml(String(GameState.player.health ?? ''))}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Memory</div>
                    <div class="stat-value">${escapeHtml(String(GameState.player.memory ?? ''))}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Reputation</div>
                    <div class="stat-value">${escapeHtml(String(GameState.player.reputation ?? ''))}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Turn</div>
                    <div class="stat-value">${escapeHtml(String(GameState.world.turn ?? ''))}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Traits</div>
                    <div class="stat-value">${GameState.player.traits.length}</div>
                </div>
            </div>

            <div class="scene-panel scene-${escapeHtml(branchTheme.id)}">
                <div class="scene-frame">
                    <div class="scene-header">
                        <div>
                            <div class="scene-kicker">${escapeHtml(branchTheme.label)}</div>
                            <div class="scene-title">${escapeHtml(currentArc.title)}</div>
                            <div class="scene-mood">${escapeHtml(branchTheme.mood)}</div>
                        </div>
                        <div class="scene-status">${escapeHtml(aiIndicator)}</div>
                    </div>

                    <div class="meta-strip">
                        ${stateBadges.map((badge) => `<span class="meta-pill">${escapeHtml(badge)}</span>`).join('')}
                        <span class="meta-pill arc-badge">Accent: ${escapeHtml(branchTheme.accent)}</span>
                    </div>

                    <div class="story-panel">
                        <div class="story-text narrative">${formatText(GameState.story.currentScene.text)}</div>
                    </div>
                </div>
            </div>

            ${latestOutcome ? `
                <div class="impact-spotlight ${escapeHtml(outcomeSpotlight.tone)}">
                    <div class="impact-header">
                        <div>
                            <div class="panel-title">Latest impact</div>
                            <div class="impact-title">${escapeHtml(outcomeSpotlight.label)}</div>
                        </div>
                        <div class="impact-summary">${escapeHtml(latestOutcome.summary)}</div>
                    </div>
                    <div class="impact-detail">${escapeHtml(outcomeSpotlight.detail)}</div>
                    ${outcomeDeltas.length > 0 ? `<div class="consequence-deltas">${outcomeDeltas.map((delta) => `<span class="journal-trait impact-chip">${escapeHtml(delta)}</span>`).join('')}</div>` : ''}
                    ${(latestOutcome.itemGained || (latestOutcome.woundsAdded || []).length > 0 || (latestOutcome.woundsRemoved || []).length > 0 || (latestOutcome.relationshipChanges && Object.keys(latestOutcome.relationshipChanges).length > 0)) ? `
                        <div class="resource-list consequence-list">
                            ${latestOutcome.itemGained ? `<span class="resource-chip resource-positive">Item gained: ${escapeHtml(latestOutcome.itemGained.name)}</span>` : ''}
                            ${(latestOutcome.woundsAdded || []).map((wound) => `<span class="resource-chip resource-negative">Wound: ${escapeHtml(wound.name)}</span>`).join('')}
                            ${(latestOutcome.woundsRemoved || []).map((woundId) => `<span class="resource-chip resource-positive">Recovered: ${escapeHtml(formatStoryLabel(woundId, woundId))}</span>`).join('')}
                            ${Object.entries(latestOutcome.relationshipChanges || {}).map(([name, delta]) => `<span class="resource-chip ${delta > 0 ? 'resource-positive' : 'resource-negative'}">Bond ${delta > 0 ? 'up' : 'down'}: ${escapeHtml(name)} ${escapeHtml(delta > 0 ? `+${delta}` : String(delta))}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <div class="decision-panel">
                <div class="decision-header">
                    <div>
                        <div class="panel-title">Choose your next move</div>
                        <div class="decision-title">Pick the pressure you want to create.</div>
                    </div>
                    <div class="decision-copy">Each option now signals its posture, risk, and likely reward before you commit.</div>
                </div>

                <div class="choice-grid">
                    ${sceneChoices.map(({ choice, presentation, traitLabel, tone }) => `
                        <button class="choice-card ${escapeHtml(presentation.toneClass)}" data-choice-id="${escapeHtml(String(choice.id ?? ''))}">
                            <div class="choice-accent"></div>
                            <div class="choice-topline">
                                <span class="choice-icon">${escapeHtml(presentation.icon)}</span>
                                <span class="choice-approach">${escapeHtml(traitLabel)}</span>
                            </div>
                            <span class="choice-label">${escapeHtml(String(choice.text ?? ''))}</span>
                            <span class="choice-tone">${escapeHtml(tone)}</span>
                            <div class="choice-tags">
                                <span class="choice-tag">Posture: ${escapeHtml(presentation.posture)}</span>
                                <span class="choice-tag">Risk: ${escapeHtml(presentation.risk)}</span>
                                <span class="choice-tag">Payoff: ${escapeHtml(presentation.payoff)}</span>
                            </div>
                            <span class="choice-hint">${escapeHtml(presentation.hint)}</span>
                            <span class="choice-best-when">Best when you want ${escapeHtml(presentation.payoff.toLowerCase())}.</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="focus-strip">
                <div class="world-panel">
                    <div class="panel-title">Current Pressure</div>
                    <div class="objective-card">
                        <div class="objective-label">Current Objective</div>
                        <div class="objective-text">${escapeHtml(currentObjective)}</div>
                    </div>
                    ${latestOutcome ? `
                        <div class="consequence-panel">
                            <div class="objective-label">Current consequence posture</div>
                            <div class="objective-text">${escapeHtml(outcomeSpotlight.detail)}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="quest-panel">
                    <div class="panel-title">Quest Chain</div>
                    <div class="resume-title">${escapeHtml(currentQuest.title)}</div>
                    <div class="quest-stage">Stage: ${escapeHtml(currentQuest.stageLabel)}</div>
                    <div class="quest-progress">Progress: ${escapeHtml(`${currentQuest.progress}/${currentQuest.totalStages}`)}</div>
                    <div class="objective-text">${escapeHtml(currentQuest.objective)}</div>
                </div>
            </div>

            <div class="system-grid">
                <div class="faction-panel">
                    <div class="panel-title">Faction Reactions</div>
                    ${factionStandings.length > 0
                        ? `<div class="standing-list">${factionStandings.map(([name, standing]) => {
                            const standingClass = standing > 0 ? 'standing-positive' : standing < 0 ? 'standing-negative' : 'standing-neutral';
                            const standingLabel = standing > 0 ? `+${standing}` : `${standing}`;
                            return `<div class="standing-row ${standingClass}"><span>${escapeHtml(name)}</span><span class="standing-value">${escapeHtml(standingLabel)}</span></div>`;
                        }).join('')}</div>`
                        : '<div class="journal-empty">No faction has reacted strongly to you yet.</div>'}
                </div>

                <div class="inventory-panel resource-panel">
                    <div class="panel-title">Inventory</div>
                    ${inventoryItems.length > 0
                        ? `<div class="resource-list">${inventoryItems.map((item) => `<span class="resource-chip resource-positive">${escapeHtml(item.name)}</span>`).join('')}</div>`
                        : '<div class="journal-empty">No meaningful relics secured yet.</div>'}
                </div>

                <div class="relationship-panel resource-panel">
                    <div class="panel-title">Bonds</div>
                    ${relationshipEntries.length > 0
                        ? `<div class="standing-list">${relationshipEntries.map(([name, value]) => {
                            const relationClass = value > 0 ? 'standing-positive' : value < 0 ? 'standing-negative' : 'standing-neutral';
                            const relationLabel = value > 0 ? `+${value}` : `${value}`;
                            return `<div class="standing-row ${relationClass}"><span>${escapeHtml(name)}</span><span class="standing-value">${escapeHtml(relationLabel)}</span></div>`;
                        }).join('')}</div>`
                        : '<div class="journal-empty">No personal bonds have shifted yet.</div>'}
                </div>

                <div class="wounds-panel resource-panel">
                    <div class="panel-title">Wounds & Recovery</div>
                    ${activeWounds.length > 0
                        ? `<div class="standing-list">${activeWounds.map((wound) => `<div class="standing-row standing-negative"><span>${escapeHtml(wound.name)}</span><span class="standing-value">${escapeHtml(formatStoryLabel(wound.severity, 'Moderate'))}</span></div>`).join('')}</div>`
                        : '<div class="journal-empty">You are currently steady enough to avoid lingering wounds.</div>'}
                </div>

                <div class="threads-panel">
                    <div class="panel-title">Echo Threads</div>
                    ${knownThreads.length > 0
                        ? `<div class="thread-list">${knownThreads.map((thread) => `<span class="thread-pill"><strong>${escapeHtml(thread.type)}:</strong> ${escapeHtml(thread.name)}</span>`).join('')}</div>`
                        : '<div class="journal-empty">You have not formed any lasting connections yet.</div>'}
                </div>

                <div class="journal-panel">
                    <div class="panel-title">Journey Timeline</div>
                    ${journalEntries.length > 0
                        ? journalEntries.map((entry) => `
                            <div class="journal-entry">
                                <div class="resume-title">Turn ${escapeHtml(String(entry.turn ?? '?'))}</div>
                                <div class="journal-choice">${escapeHtml(entry.choiceText)}</div>
                                <div class="journal-trait">${escapeHtml(entry.traitLabel)}</div>
                                ${entry.outcomeSummary ? `<div class="journal-outcome">${escapeHtml(entry.outcomeSummary)}</div>` : ''}
                            </div>
                        `).join('')
                        : '<div class="journal-empty">Your first decision will echo here.</div>'}
                </div>
            </div>
        </div>
    `;
}

function showLoading() {
    const container = document.getElementById('game-content');
    container.innerHTML = `
        <div class="loading">
            <div class="loading-orb" aria-hidden="true">
                <span class="loading-ring loading-ring-one"></span>
                <span class="loading-ring loading-ring-two"></span>
                <span class="loading-core">✨</span>
            </div>
            <div class="panel-title" style="margin-bottom: 12px;">Resolving the next echo</div>
            <div class="loading-title">The timeline is folding your last consequence into the next scene.</div>
            <div class="loading-copy">Memory, pressure, and faction response are being rethreaded before your next move appears.</div>
        </div>
    `;
}

// Text Formatter
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatText(text) {
    const safeText = escapeHtml(String(text ?? ''));

    return safeText
        .replace(/\*([^*]+)\*/g, '<span class="thought">$1</span>')
        .replace(/&quot;([\s\S]*?)&quot;/g, '<span class="dialogue">&quot;$1&quot;</span>')
        .replace(/\n/g, '<br>');
}

// Start Screen
function renderStartScreen(container) {
    if (typeof document !== 'undefined' && document.body) {
        document.body.dataset.branchTheme = 'awakening';
    }

    const recentSavesMarkup = GameState.recentSaves.length > 0
        ? `
            <div class="resume-panel">
                <div class="panel-title">Resume a Recent Echo</div>
                <div class="resume-quest">These saves belong to this browser and device.</div>
                <div class="resume-list">
                    ${GameState.recentSaves.map((save) => {
                        const resumeExtras = [
                            Number(save.inventoryCount) > 0 ? `${save.inventoryCount} item${Number(save.inventoryCount) === 1 ? '' : 's'}` : null,
                            Number(save.woundCount) > 0 ? `${save.woundCount} wound${Number(save.woundCount) === 1 ? '' : 's'}` : null
                        ].filter(Boolean);

                        return `
                        <button class="resume-btn" data-session-id="${escapeHtml(String(save.sessionId ?? ''))}">
                            <div class="resume-title">Turn ${escapeHtml(String(save.turn ?? 0))} · ${escapeHtml(formatStoryLabel(save.location, 'Void'))}</div>
                            <div class="resume-meta">${escapeHtml(formatStoryLabel(save.storyBranch, 'Awakening'))} · ${escapeHtml(String(save.traitCount ?? 0))} traits · ${escapeHtml(formatSaveTimestamp(save.savedAt))}</div>
                            ${save.arcTitle ? `<div class="resume-arc">${escapeHtml(save.arcTitle)}</div>` : ''}
                            ${save.questTitle ? `<div class="resume-quest">Quest: ${escapeHtml(save.questTitle)}</div>` : ''}
                            ${resumeExtras.length > 0 ? `<div class="resume-quest">State: ${escapeHtml(resumeExtras.join(' · '))}</div>` : ''}
                        </button>
                    `;
                    }).join('')}
                </div>
            </div>
        `
        : `
            <div class="resume-panel empty">
                <div class="panel-title">Resume a Recent Echo</div>
                <div class="resume-quest">Saves stay with this browser and device for now.</div>
                <div class="journal-empty">No saved echoes yet — begin a journey and the fracture will remember it.</div>
            </div>
        `;

    container.innerHTML = `
        <div class="start-screen">
            <div class="landing-hero">
                <div class="hero-kicker">Fractured narrative command</div>
                <div class="landing-title">Step into a broken timeline and decide what kind of Echo survives it.</div>
                <div class="landing-copy">
                    <p>In a world where time itself has shattered, you move between fragments of reality, shaping factions, relationships, wounds, and hard-won momentum with every turn.</p>
                    <p>Each run blends procedural storytelling, persistent character state, and AI-assisted scene generation into a narrative that reacts to the choices you actually make.</p>
                </div>
                <div class="feature-strip">
                    <span class="feature-pill">⚙️ Procedural scenes</span>
                    <span class="feature-pill">🧠 AI-assisted storytelling</span>
                    <span class="feature-pill">🎒 Persistent inventory, bonds, and wounds</span>
                </div>
                <div class="landing-actions">
                    <button class="start-btn" data-start-game="true">Begin Your Journey</button>
                    <div class="landing-note">Your active echo stays with this browser and device for now, so clearing browser data or switching devices may hide the run.</div>
                </div>
            </div>
            ${recentSavesMarkup}
        </div>
    `;
}

// Game Start
async function startGame() {
    // Reset state
    GameState.sessionId = generateSessionId();
    GameState.player = {
        name: '',
        health: 100,
        memory: 0,
        reputation: 0,
        inventory: [],
        wounds: [],
        traits: []
    };
    GameState.world = {
        currentLocation: 'void',
        visitedLocations: [],
        knownCharacters: [],
        knownFactions: [],
        factionStandings: {},
        relationships: {},
        storyBranch: 'awakening',
        turn: 0,
        currentArc: getCurrentStoryArc({ storyBranch: 'awakening', currentLocation: 'void', knownFactions: [] }),
        currentQuest: buildQuestSnapshot(QUEST_TEMPLATES.first_resonance, 1)
    };
    GameState.story = {
        history: [],
        currentScene: null,
        pendingChoices: [],
        latestOutcome: null
    };
    
    // Select random opening
    const opening = StoryTemplates.openings[Math.floor(Math.random() * StoryTemplates.openings.length)];
    GameState.story.currentScene = generateScene(opening);
    const discoveredEntities = discoverWorldEntities(opening.text, GameState.world);
    GameState.world.knownCharacters = discoveredEntities.knownCharacters;
    GameState.world.knownFactions = discoveredEntities.knownFactions;
    GameState.world.currentArc = getCurrentStoryArc(GameState.world);
    GameState.world.currentQuest = buildQuestSnapshot(getQuestTemplate(GameState.world), 1);
    
    await saveGame();
    renderGame();
}

function attachUiActions() {
    if (typeof document === 'undefined' || document.__echoesActionsBound) {
        return;
    }

    document.addEventListener('click', (event) => {
        const startButton = event.target.closest('[data-start-game="true"]');
        if (startButton) {
            startGame();
            return;
        }

        const choiceButton = event.target.closest('[data-choice-id]');
        if (choiceButton) {
            handleChoice(choiceButton.dataset.choiceId);
            return;
        }

        const resumeButton = event.target.closest('[data-session-id]');
        if (resumeButton) {
            resumeGame(resumeButton.dataset.sessionId);
        }
    });

    document.__echoesActionsBound = true;
}

// Check health on startup
async function checkHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('Server health:', data);
        GameState.aiEnabled = data.configuredModelAvailable === true;
    } catch (error) {
        console.error('Health check failed:', error);
    }
}

// Initialize
if (typeof window !== 'undefined') {
    window.onload = async () => {
        attachUiActions();
        await Promise.allSettled([
            checkHealth(),
            fetchRecentSaves()
        ]);
        renderStartScreen(document.getElementById('game-content'));
    };
}

if (typeof module !== 'undefined') {
    module.exports = {
        deriveNextWorldState,
        deriveStoryBranchFromChoice,
        inferLocationFromSceneText,
        getRecentHistory,
        getJournalEntries,
        getCurrentObjective,
        getChoiceOutcome,
        getCurrentStoryArc,
        discoverWorldEntities,
        getBranchSceneGuidance,
        enhanceSceneChoices,
        getBranchVisualTheme,
        describeChoicePresentation,
        getOutcomeSpotlight
    };
}
