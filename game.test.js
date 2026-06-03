const test = require('node:test');
const assert = require('node:assert/strict');
const {
    deriveNextWorldState,
    deriveStoryBranchFromChoice,
    getJournalEntries,
    getCurrentObjective,
    getChoiceOutcome,
    getCurrentStoryArc,
    getBranchSceneGuidance,
    enhanceSceneChoices
} = require('./game');

test('deriveNextWorldState advances branch and location based on the chosen path and next scene', () => {
    const nextWorld = deriveNextWorldState(
        {
            currentLocation: 'void',
            visitedLocations: ['void'],
            knownCharacters: [],
            knownFactions: [],
            factionStandings: {},
            storyBranch: 'awakening',
            turn: 0,
            currentQuest: null
        },
        {
            text: 'Take the crystalline bridge — its structure promises understanding',
            trait: 'analytical'
        },
        'You arrive in Clockwork City, where gears the size of towers turn above copper streets.'
    );

    assert.deepEqual(nextWorld, {
        currentLocation: 'clockwork_city',
        visitedLocations: ['void', 'clockwork_city'],
        knownCharacters: [],
        knownFactions: ['Clockwork Syndicate'],
        factionStandings: {
            'Clockwork Syndicate': 1
        },
        relationships: {},
        storyBranch: 'investigation',
        turn: 1,
        currentArc: {
            title: 'The Gearwright Mystery',
            objective: 'Follow the Clockwork Syndicate and learn what they are building inside the fracture.'
        },
        currentQuest: {
            id: 'gearwright_mystery',
            title: 'The Gearwright Mystery',
            stageLabel: 'Trace the Syndicate Signal',
            objective: 'Find out where the Clockwork Syndicate is directing the stolen resonance.',
            progress: 1,
            totalStages: 3,
            status: 'active'
        }
    });
});

test('deriveNextWorldState preserves discovered location and shifts to risk when a careful choice is made', () => {
    const nextWorld = deriveNextWorldState(
        {
            currentLocation: 'clockwork_city',
            visitedLocations: ['void', 'clockwork_city'],
            knownCharacters: [],
            knownFactions: [],
            factionStandings: {},
            storyBranch: 'investigation',
            turn: 3,
            currentQuest: null
        },
        {
            text: 'Seal the corridor before the fracture widens',
            trait: 'careful'
        },
        'The same clockwork passages shudder, but no new district reveals itself.'
    );

    assert.deepEqual(nextWorld, {
        currentLocation: 'clockwork_city',
        visitedLocations: ['void', 'clockwork_city'],
        knownCharacters: [],
        knownFactions: [],
        factionStandings: {},
        relationships: {},
        storyBranch: 'survival',
        turn: 4,
        currentArc: {
            title: 'Holding the Fracture Line',
            objective: 'Stabilize the danger around you before the fracture gets worse.'
        },
        currentQuest: {
            id: 'fracture_line',
            title: 'Holding the Fracture Line',
            stageLabel: 'Hold the Breach',
            objective: 'Contain the immediate rupture before it swallows the district.',
            progress: 1,
            totalStages: 3,
            status: 'active'
        }
    });
});

test('deriveStoryBranchFromChoice recognizes the newer AI trait labels used by live generations', () => {
    assert.equal(deriveStoryBranchFromChoice({ trait: 'investigation' }, 'awakening'), 'investigation');
    assert.equal(deriveStoryBranchFromChoice({ trait: 'caution' }, 'awakening'), 'survival');
    assert.equal(deriveStoryBranchFromChoice({ trait: 'decisive' }, 'awakening'), 'momentum');
});

test('getJournalEntries returns the most recent choices first with readable labels', () => {
    const entries = getJournalEntries([
        { turn: 0, choiceText: 'Follow the golden path', trait: 'empathic' },
        { turn: 1, choiceText: 'Inspect the clocktower gears', trait: 'investigation' },
        { turn: 2, choiceText: 'Seal the sparking doorway', trait: 'caution' }
    ], 2);

    assert.deepEqual(entries, [
        { turn: 2, choiceText: 'Seal the sparking doorway', traitLabel: 'Caution' },
        { turn: 1, choiceText: 'Inspect the clocktower gears', traitLabel: 'Investigation' }
    ]);
});

test('getCurrentObjective translates the active branch into a player-facing goal', () => {
    assert.equal(getCurrentObjective({ storyBranch: 'investigation' }), 'Uncover how this fragment of reality fits into the larger fracture.');
    assert.equal(getCurrentObjective({ storyBranch: 'survival' }), 'Stabilize the danger around you before the fracture gets worse.');
    assert.equal(getCurrentObjective({ storyBranch: 'awakening' }), 'Orient yourself and discover what kind of Echo you will become.');
});

test('getChoiceOutcome turns investigation traits into visible stat gains and feedback', () => {
    assert.deepEqual(getChoiceOutcome({ trait: 'analytical' }), {
        healthDelta: 0,
        memoryDelta: 1,
        reputationDelta: 0,
        woundsAdded: [],
        woundsRemoved: [],
        summary: 'You recover a useful fragment of understanding from the fracture.'
    });
});

test('deriveNextWorldState discovers recurring characters, factions, and a named arc from the next scene', () => {
    const nextWorld = deriveNextWorldState(
        {
            currentLocation: 'void',
            visitedLocations: ['void'],
            knownCharacters: [],
            knownFactions: [],
            factionStandings: {},
            storyBranch: 'awakening',
            turn: 0,
            currentArc: null,
            currentQuest: null
        },
        {
            text: 'Ask the keeper what the gardens protect',
            trait: 'empathic'
        },
        'In the Memory Gardens, the Archivist waits beside flowers that bloom with lost names. They warn that the Gardeners of Remembrance have begun sealing dangerous echoes.'
    );

    assert.deepEqual(nextWorld, {
        currentLocation: 'memory_gardens',
        visitedLocations: ['void', 'memory_gardens'],
        knownCharacters: ['The Archivist'],
        knownFactions: ['Gardeners of Remembrance'],
        factionStandings: {
            'Gardeners of Remembrance': 1
        },
        storyBranch: 'diplomacy',
        turn: 1,
        currentArc: {
            title: 'The Garden Accord',
            objective: 'Earn the trust of the Gardeners of Remembrance before the sealed memories turn hostile.'
        },
        currentQuest: {
            id: 'garden_accord',
            title: 'The Garden Accord',
            stageLabel: 'Win the Gardeners\' Trust',
            objective: 'Show the Gardeners of Remembrance that you can protect what they guard.',
            progress: 1,
            totalStages: 3,
            status: 'active'
        },
        relationships: {
            'The Archivist': 1
        }
    });
});

test('getCurrentStoryArc names the active arc from the world state', () => {
    assert.deepEqual(getCurrentStoryArc({
        currentLocation: 'clockwork_city',
        storyBranch: 'investigation',
        knownFactions: ['Clockwork Syndicate']
    }), {
        title: 'The Gearwright Mystery',
        objective: 'Follow the Clockwork Syndicate and learn what they are building inside the fracture.'
    });
});

test('deriveNextWorldState progresses an existing quest chain and deepens faction standing on aligned turns', () => {
    const nextWorld = deriveNextWorldState(
        {
            currentLocation: 'clockwork_city',
            visitedLocations: ['void', 'clockwork_city'],
            knownCharacters: [],
            knownFactions: ['Clockwork Syndicate'],
            factionStandings: {
                'Clockwork Syndicate': 1
            },
            storyBranch: 'investigation',
            turn: 1,
            currentArc: {
                title: 'The Gearwright Mystery',
                objective: 'Follow the Clockwork Syndicate and learn what they are building inside the fracture.'
            },
            currentQuest: {
                id: 'gearwright_mystery',
                title: 'The Gearwright Mystery',
                stageLabel: 'Trace the Syndicate Signal',
                objective: 'Find out where the Clockwork Syndicate is directing the stolen resonance.',
                progress: 1,
                totalStages: 3,
                status: 'active'
            }
        },
        {
            text: 'Decode the syndicate ledger before the signal moves',
            trait: 'investigation'
        },
        'Inside Clockwork City, the merchant with abacus eyes reveals a hidden relay used by the Clockwork Syndicate to route unstable time through the district.'
    );

    assert.deepEqual(nextWorld.currentQuest, {
        id: 'gearwright_mystery',
        title: 'The Gearwright Mystery',
        stageLabel: 'Expose the Hidden Relay',
        objective: 'Map the relay network before the Syndicate moves the fracture engine.',
        progress: 2,
        totalStages: 3,
        status: 'active'
    });
    assert.equal(nextWorld.factionStandings['Clockwork Syndicate'], 2);
});

test('getBranchSceneGuidance produces branch-aware scene direction from quest and faction state', () => {
    const guidance = getBranchSceneGuidance({
        currentLocation: 'memory_gardens',
        storyBranch: 'diplomacy',
        knownFactions: ['Gardeners of Remembrance'],
        factionStandings: {
            'Gardeners of Remembrance': 2
        },
        currentQuest: {
            title: 'The Garden Accord',
            stageLabel: 'Win the Gardeners\' Trust',
            objective: 'Show the Gardeners of Remembrance that you can protect what they guard.'
        }
    }, {
        summary: 'Someone in this fractured world is more willing to trust you now.'
    });

    assert.match(guidance, /Diplomacy scenes should revolve around negotiation, trust, and emotional stakes/);
    assert.match(guidance, /Active quest: The Garden Accord/);
    assert.match(guidance, /Faction pressure: Gardeners of Remembrance \(standing 2\)/);
    assert.match(guidance, /Latest consequence: Someone in this fractured world is more willing to trust you now\./);
});

test('deriveNextWorldState tracks named relationship gains in recurring character scenes', () => {
    const nextWorld = deriveNextWorldState(
        {
            currentLocation: 'memory_gardens',
            visitedLocations: ['void', 'memory_gardens'],
            knownCharacters: ['The Archivist'],
            knownFactions: ['Gardeners of Remembrance'],
            factionStandings: {
                'Gardeners of Remembrance': 1
            },
            relationships: {
                'The Archivist': 1
            },
            storyBranch: 'diplomacy',
            turn: 1,
            currentQuest: {
                id: 'garden_accord',
                title: 'The Garden Accord',
                stageLabel: 'Win the Gardeners\' Trust',
                objective: 'Show the Gardeners of Remembrance that you can protect what they guard.',
                progress: 1,
                totalStages: 3,
                status: 'active'
            }
        },
        {
            text: 'Promise the Archivist you will help calm the sealed blooms',
            trait: 'empathic'
        },
        'In the Memory Gardens, the Archivist places a hand over the trembling ritual basin and admits they are beginning to trust you with the Gardeners of Remembrance\' most dangerous memories.'
    );

    assert.equal(nextWorld.relationships['The Archivist'], 2);
});

test('getChoiceOutcome adds a wound on risky momentum turns and clears it during recovery-minded survival turns', () => {
    const riskyOutcome = getChoiceOutcome(
        { trait: 'decisive' },
        {
            playerState: {
                health: 100,
                wounds: []
            }
        }
    );

    assert.deepEqual(riskyOutcome.woundsAdded, [
        {
            id: 'fracture_burn',
            name: 'Fracture Burn',
            severity: 'moderate'
        }
    ]);

    const recoveryOutcome = getChoiceOutcome(
        { trait: 'caution' },
        {
            playerState: {
                health: 75,
                wounds: [
                    {
                        id: 'fracture_burn',
                        name: 'Fracture Burn',
                        severity: 'moderate'
                    }
                ]
            }
        }
    );

    assert.deepEqual(recoveryOutcome.woundsRemoved, ['fracture_burn']);
    assert.match(recoveryOutcome.summary, /tend to the fracture burn/i);
});

test('enhanceSceneChoices adds inventory, relationship, and recovery choices when the current state supports them', () => {
    const enhanced = enhanceSceneChoices({
        text: 'The Archivist stands before a sealed relay gate while the Memory Gardens shake with unstable blooms.',
        choices: [
            { id: 'base_1', text: 'Study the shaking gate', trait: 'investigation' },
            { id: 'base_2', text: 'Shield the ritual circle', trait: 'caution' },
            { id: 'base_3', text: 'Force the way forward', trait: 'decisive' }
        ]
    }, {
        inventory: [
            { id: 'brass_key', name: 'Brass Key' },
            { id: 'remembrance_seed', name: 'Remembrance Seed' }
        ],
        wounds: [
            { id: 'fracture_burn', name: 'Fracture Burn', severity: 'moderate' }
        ]
    }, {
        relationships: {
            'The Archivist': 2
        }
    });

    assert.match(enhanced.choices.map((choice) => choice.text).join('\n'), /Brass Key/);
    assert.match(enhanced.choices.map((choice) => choice.text).join('\n'), /Archivist/);
    assert.match(enhanced.choices.map((choice) => choice.text).join('\n'), /Treat your Fracture Burn/);
});
