const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

function getArcTitleForWorld(world = {}) {
    switch (world?.storyBranch) {
    case 'investigation':
        return 'Threads of Inquiry';
    case 'survival':
        return 'Holding the Fracture Line';
    case 'diplomacy':
        return 'Echoes in Alliance';
    case 'momentum':
        return 'The Shaping of Tomorrow';
    default:
        return 'The First Resonance';
    }
}

function summarizeSave(sessionId, save = {}) {
    return {
        sessionId,
        savedAt: save?.savedAt || null,
        turn: save?.state?.world?.turn ?? 0,
        location: save?.state?.world?.currentLocation || 'void',
        storyBranch: save?.state?.world?.storyBranch || 'awakening',
        traitCount: Array.isArray(save?.state?.player?.traits) ? save.state.player.traits.length : 0,
        arcTitle: save?.state?.world?.currentArc?.title || getArcTitleForWorld(save?.state?.world),
        questTitle: save?.state?.world?.currentQuest?.title || save?.state?.world?.currentQuest?.stageLabel || null,
        inventoryCount: Array.isArray(save?.state?.player?.inventory) ? save.state.player.inventory.length : 0,
        woundCount: Array.isArray(save?.state?.player?.wounds) ? save.state.player.wounds.length : 0
    };
}

function listRecentSaves(source, limit = 6) {
    const entries = source instanceof Map
        ? [...source.entries()]
        : Array.isArray(source)
            ? source
            : [];

    return entries
        .map(([sessionId, save]) => summarizeSave(sessionId, save))
        .sort((left, right) => new Date(right.savedAt || 0) - new Date(left.savedAt || 0))
        .slice(0, limit);
}

function getStorageConfig(env = process.env, baseDir = __dirname) {
    const saveDir = env.SAVE_DIR || path.join(baseDir, 'data');

    return {
        provider: String(env.STORAGE_PROVIDER || (env.TURSO_DATABASE_URL ? 'turso' : 'file')).trim().toLowerCase(),
        saveDir,
        legacySavesFile: env.LEGACY_SAVES_FILE || path.join(saveDir, 'saves.json'),
        databaseUrl: env.TURSO_DATABASE_URL || '',
        authToken: env.TURSO_AUTH_TOKEN || '',
        importLegacyFileSaves: String(env.IMPORT_LEGACY_FILE_SAVES || 'true').trim().toLowerCase() !== 'false'
    };
}

function readLegacySaves(legacySavesFile) {
    if (!legacySavesFile || !fs.existsSync(legacySavesFile)) {
        return new Map();
    }

    try {
        const data = JSON.parse(fs.readFileSync(legacySavesFile, 'utf8'));
        return new Map(Object.entries(data));
    } catch (error) {
        console.error('Failed to load legacy saves:', error.message);
        return new Map();
    }
}

function createFileStorage(config) {
    const saves = new Map();
    const saveDir = config.saveDir;
    const savesFile = config.legacySavesFile || path.join(saveDir, 'saves.json');

    return {
        async init() {
            if (!fs.existsSync(saveDir)) {
                fs.mkdirSync(saveDir, { recursive: true });
            }

            const loadedSaves = readLegacySaves(savesFile);
            for (const [sessionId, save] of loadedSaves.entries()) {
                saves.set(sessionId, save);
            }
        },
        async saveGame(sessionId, state, savedAt = new Date().toISOString()) {
            saves.set(sessionId, { state, savedAt });
            fs.writeFileSync(savesFile, JSON.stringify(Object.fromEntries(saves), null, 2));
            return { sessionId, savedAt };
        },
        async loadGame(sessionId) {
            return saves.get(sessionId) || null;
        },
        async listRecentSaves(limit = 6) {
            return listRecentSaves(saves, limit);
        },
        async countSaves() {
            return saves.size;
        },
        async close() {
            return undefined;
        },
        getProvider() {
            return 'file';
        }
    };
}

function createTursoStorage(config) {
    if (!config.databaseUrl) {
        throw new Error('Turso storage requires TURSO_DATABASE_URL');
    }

    const client = createClient({
        url: config.databaseUrl,
        authToken: config.authToken || undefined
    });

    async function createSchema() {
        await client.execute(`
            CREATE TABLE IF NOT EXISTS saves (
                session_id TEXT PRIMARY KEY,
                saved_at TEXT NOT NULL,
                state_json TEXT NOT NULL,
                turn INTEGER NOT NULL DEFAULT 0,
                location TEXT NOT NULL DEFAULT 'void',
                story_branch TEXT NOT NULL DEFAULT 'awakening',
                trait_count INTEGER NOT NULL DEFAULT 0,
                arc_title TEXT,
                quest_title TEXT,
                inventory_count INTEGER NOT NULL DEFAULT 0,
                wound_count INTEGER NOT NULL DEFAULT 0
            )
        `);
    }

    async function importLegacySavesIfNeeded() {
        if (config.importLegacyFileSaves === false) {
            return;
        }

        const countResult = await client.execute('SELECT COUNT(*) AS count FROM saves');
        const existingCount = Number(countResult.rows?.[0]?.count || 0);
        if (existingCount > 0) {
            return;
        }

        const legacySaves = readLegacySaves(config.legacySavesFile);
        for (const [sessionId, save] of legacySaves.entries()) {
            await saveGame(sessionId, save.state, save.savedAt);
        }
    }

    async function saveGame(sessionId, state, savedAt = new Date().toISOString()) {
        const summary = summarizeSave(sessionId, { state, savedAt });
        await client.execute({
            sql: `
                INSERT INTO saves (
                    session_id,
                    saved_at,
                    state_json,
                    turn,
                    location,
                    story_branch,
                    trait_count,
                    arc_title,
                    quest_title,
                    inventory_count,
                    wound_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    saved_at = excluded.saved_at,
                    state_json = excluded.state_json,
                    turn = excluded.turn,
                    location = excluded.location,
                    story_branch = excluded.story_branch,
                    trait_count = excluded.trait_count,
                    arc_title = excluded.arc_title,
                    quest_title = excluded.quest_title,
                    inventory_count = excluded.inventory_count,
                    wound_count = excluded.wound_count
            `,
            args: [
                sessionId,
                savedAt,
                JSON.stringify(state),
                summary.turn,
                summary.location,
                summary.storyBranch,
                summary.traitCount,
                summary.arcTitle,
                summary.questTitle,
                summary.inventoryCount,
                summary.woundCount
            ]
        });

        return { sessionId, savedAt };
    }

    return {
        async init() {
            await createSchema();
            await importLegacySavesIfNeeded();
        },
        saveGame,
        async loadGame(sessionId) {
            const result = await client.execute({
                sql: 'SELECT saved_at, state_json FROM saves WHERE session_id = ?',
                args: [sessionId]
            });

            const row = result.rows?.[0];
            if (!row) {
                return null;
            }

            return {
                savedAt: row.saved_at,
                state: JSON.parse(row.state_json)
            };
        },
        async listRecentSaves(limit = 6) {
            const result = await client.execute({
                sql: `
                    SELECT session_id, saved_at, turn, location, story_branch, trait_count,
                           arc_title, quest_title, inventory_count, wound_count
                    FROM saves
                    ORDER BY datetime(saved_at) DESC
                    LIMIT ?
                `,
                args: [limit]
            });

            return result.rows.map((row) => ({
                sessionId: row.session_id,
                savedAt: row.saved_at,
                turn: Number(row.turn || 0),
                location: row.location || 'void',
                storyBranch: row.story_branch || 'awakening',
                traitCount: Number(row.trait_count || 0),
                arcTitle: row.arc_title || getArcTitleForWorld({ storyBranch: row.story_branch }),
                questTitle: row.quest_title || null,
                inventoryCount: Number(row.inventory_count || 0),
                woundCount: Number(row.wound_count || 0)
            }));
        },
        async countSaves() {
            const result = await client.execute('SELECT COUNT(*) AS count FROM saves');
            return Number(result.rows?.[0]?.count || 0);
        },
        async close() {
            await client.close();
        },
        getProvider() {
            return 'turso';
        }
    };
}

function createStorage(config = getStorageConfig()) {
    if (config.provider === 'turso') {
        return createTursoStorage(config);
    }

    return createFileStorage(config);
}

module.exports = {
    getArcTitleForWorld,
    summarizeSave,
    listRecentSaves,
    getStorageConfig,
    createStorage,
    createFileStorage,
    createTursoStorage
};
