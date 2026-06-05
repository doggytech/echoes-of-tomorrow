const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
    createStorage,
    getStorageConfig
} = require('./storage');

function makeTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'echoes-storage-'));
}

test('getStorageConfig defaults to file storage and derives the legacy saves path', () => {
    const tempDir = makeTempDir();
    const config = getStorageConfig({
        SAVE_DIR: tempDir
    });

    assert.equal(config.provider, 'file');
    assert.equal(config.saveDir, tempDir);
    assert.equal(config.legacySavesFile, path.join(tempDir, 'saves.json'));
});

test('file storage keeps saves isolated per anonymous player', async () => {
    const tempDir = makeTempDir();
    const storage = createStorage({
        provider: 'file',
        saveDir: tempDir,
        legacySavesFile: path.join(tempDir, 'saves.json')
    });

    await storage.init();
    await storage.saveGame('echo-alpha', {
        player: { traits: ['curious'] },
        world: { currentLocation: 'void', storyBranch: 'awakening', turn: 1 }
    }, '2026-06-05T04:00:00.000Z', 'player-alpha');
    await storage.saveGame('echo-bravo', {
        player: { traits: ['careful'] },
        world: { currentLocation: 'clockwork_city', storyBranch: 'investigation', turn: 2 }
    }, '2026-06-05T05:00:00.000Z', 'player-bravo');

    assert.equal((await storage.loadGame('echo-alpha', 'player-alpha')).state.world.turn, 1);
    assert.equal(await storage.loadGame('echo-alpha', 'player-bravo'), null);
    assert.deepEqual(await storage.listRecentSaves(5, 'player-alpha'), [{
        sessionId: 'echo-alpha',
        savedAt: '2026-06-05T04:00:00.000Z',
        turn: 1,
        location: 'void',
        storyBranch: 'awakening',
        traitCount: 1,
        arcTitle: 'The First Resonance',
        questTitle: null,
        inventoryCount: 0,
        woundCount: 0
    }]);

    await assert.rejects(
        storage.saveGame('echo-alpha', {
            player: { traits: ['bold'] },
            world: { currentLocation: 'fracture_sea', storyBranch: 'momentum', turn: 3 }
        }, '2026-06-05T06:00:00.000Z', 'player-bravo'),
        /belongs to a different player/
    );

    await storage.close();
});

test('createStorage with turso provider can save, load, list, and count saves using a local libsql database URL', async () => {
    const tempDir = makeTempDir();
    const dbPath = path.join(tempDir, 'echoes-local.db');
    const storage = createStorage({
        provider: 'turso',
        databaseUrl: `file:${dbPath}`,
        authToken: ''
    });

    await storage.init();
    await storage.saveGame('echo-local', {
        player: {
            traits: ['analytical', 'careful'],
            inventory: ['Brass Key'],
            wounds: ['Fracture Burn']
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
    }, '2026-06-02T09:30:00.000Z', 'player-local');

    const loadedSave = await storage.loadGame('echo-local', 'player-local');
    assert.equal(loadedSave.savedAt, '2026-06-02T09:30:00.000Z');
    assert.equal(loadedSave.state.world.currentLocation, 'memory_gardens');

    assert.deepEqual(await storage.listRecentSaves(1, 'player-local'), [{
        sessionId: 'echo-local',
        savedAt: '2026-06-02T09:30:00.000Z',
        turn: 5,
        location: 'memory_gardens',
        storyBranch: 'diplomacy',
        traitCount: 2,
        arcTitle: 'The Garden Accord',
        questTitle: 'Broker the Accord',
        inventoryCount: 1,
        woundCount: 1
    }]);

    assert.equal(await storage.countSaves(), 1);
    await storage.close();
});

test('turso storage keeps saves isolated per anonymous player and hides legacy/public rows', async () => {
    const tempDir = makeTempDir();
    const dbPath = path.join(tempDir, 'echoes-isolated.db');
    const storage = createStorage({
        provider: 'turso',
        databaseUrl: `file:${dbPath}`,
        authToken: ''
    });

    await storage.init();
    await storage.saveGame('echo-one', {
        player: { traits: ['curious'] },
        world: { currentLocation: 'void', storyBranch: 'awakening', turn: 1 }
    }, '2026-06-05T04:00:00.000Z', 'player-one');
    await storage.saveGame('echo-two', {
        player: { traits: ['strategic'] },
        world: { currentLocation: 'clockwork_city', storyBranch: 'investigation', turn: 2 }
    }, '2026-06-05T05:00:00.000Z', 'player-two');

    assert.equal((await storage.loadGame('echo-one', 'player-one')).state.world.turn, 1);
    assert.equal(await storage.loadGame('echo-one', 'player-two'), null);
    assert.deepEqual((await storage.listRecentSaves(5, 'player-one')).map((save) => save.sessionId), ['echo-one']);
    assert.deepEqual(await storage.listRecentSaves(5, 'legacy-public'), []);

    await assert.rejects(
        storage.saveGame('echo-one', {
            player: { traits: ['forceful'] },
            world: { currentLocation: 'fracture_sea', storyBranch: 'momentum', turn: 3 }
        }, '2026-06-05T06:00:00.000Z', 'player-two'),
        /belongs to a different player/
    );

    await storage.close();
});

test('createStorage with turso provider imports legacy file saves into an empty database on first init', async () => {
    const tempDir = makeTempDir();
    const legacySavesFile = path.join(tempDir, 'saves.json');
    fs.writeFileSync(legacySavesFile, JSON.stringify({
        'echo-legacy': {
            savedAt: '2026-06-01T17:00:00.000Z',
            state: {
                player: {
                    traits: ['honest']
                },
                world: {
                    currentLocation: 'void',
                    storyBranch: 'diplomacy',
                    turn: 2
                }
            }
        }
    }, null, 2));

    const storage = createStorage({
        provider: 'turso',
        databaseUrl: `file:${path.join(tempDir, 'echoes-import.db')}`,
        authToken: '',
        legacySavesFile
    });

    await storage.init();

    const importedSave = await storage.loadGame('echo-legacy', 'legacy-public');
    assert.equal(importedSave.savedAt, '2026-06-01T17:00:00.000Z');
    assert.equal(importedSave.state.world.storyBranch, 'diplomacy');
    assert.equal(await storage.countSaves(), 1);
    assert.deepEqual((await storage.listRecentSaves(5, 'legacy-public')).map((save) => save.sessionId), ['echo-legacy']);

    await storage.close();
});
