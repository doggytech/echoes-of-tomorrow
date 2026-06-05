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

function normalizePlayerId(playerId) {
    return playerId ? String(playerId).trim() : '';
}

function isOwnedByPlayer(save, playerId) {
    const normalizedPlayerId = normalizePlayerId(playerId);
    if (!normalizedPlayerId) {
        return false;
    }

    return normalizePlayerId(save?.playerId) === normalizedPlayerId;
}

function assertPlayerOwnsSave(existingSave, sessionId, playerId) {
    if (existingSave && !isOwnedByPlayer(existingSave, playerId)) {
        const error = new Error(`Session ${sessionId} belongs to a different player`);
        error.code = 'SAVE_OWNERSHIP_MISMATCH';
        throw error;
    }
}

function normalizeLegacySave(save = {}) {
    return {
        ...save,
        playerId: normalizePlayerId(save?.playerId) || 'legacy-public'
    };
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
        return new Map(Object.entries(data).map(([sessionId, save]) => [sessionId, normalizeLegacySave(save)]));
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
        async saveGame(sessionId, state, savedAt = new Date().toISOString(), playerId) {
            const normalizedPlayerId = normalizePlayerId(playerId);
            if (!normalizedPlayerId) {
                throw new Error('File storage saveGame requires playerId');
            }

            assertPlayerOwnsSave(saves.get(sessionId), sessionId, normalizedPlayerId);
            saves.set(sessionId, { state, savedAt, playerId: normalizedPlayerId });
            fs.writeFileSync(savesFile, JSON.stringify(Object.fromEntries(saves), null, 2));
            return { sessionId, savedAt };
        },
        async loadGame(sessionId, playerId) {
            const save = saves.get(sessionId);
            return isOwnedByPlayer(save, playerId) ? save : null;
        },
        async listRecentSaves(limit = 6, playerId) {
            const filteredSaves = new Map(
                [...saves.entries()].filter(([, save]) => isOwnedByPlayer(save, playerId))
            );
            return listRecentSaves(filteredSaves, limit);
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

        const columnsResult = await client.execute('PRAGMA table_info(saves)');
        const hasPlayerId = columnsResult.rows.some((row) => row.name === 'player_id');
        if (!hasPlayerId) {
            await client.execute("ALTER TABLE saves ADD COLUMN player_id TEXT NOT NULL DEFAULT 'legacy-public'");
        }

        await client.execute('CREATE INDEX IF NOT EXISTS idx_saves_player_saved_at ON saves (player_id, saved_at DESC)');
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
            await saveGame(sessionId, save.state, save.savedAt, save.playerId);
        }
    }

    async function saveGame(sessionId, state, savedAt = new Date().toISOString(), playerId) {
        const normalizedPlayerId = normalizePlayerId(playerId);
        if (!normalizedPlayerId) {
            throw new Error('Turso storage saveGame requires playerId');
        }

        const existingSave = await client.execute({
            sql: 'SELECT player_id FROM saves WHERE session_id = ?',
            args: [sessionId]
        });
        assertPlayerOwnsSave(existingSave.rows?.[0] ? { playerId: existingSave.rows[0].player_id } : null, sessionId, normalizedPlayerId);

        const summary = summarizeSave(sessionId, { state, savedAt });
        await client.execute({
            sql: `
                INSERT INTO saves (
                    session_id,
                    player_id,
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
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    player_id = excluded.player_id,
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
                normalizedPlayerId,
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
        async loadGame(sessionId, playerId) {
            const result = await client.execute({
                sql: 'SELECT saved_at, state_json, player_id FROM saves WHERE session_id = ? AND player_id = ?',
                args: [sessionId, normalizePlayerId(playerId)]
            });

            const row = result.rows?.[0];
            if (!row) {
                return null;
            }

            return {
                savedAt: row.saved_at,
                state: JSON.parse(row.state_json),
                playerId: row.player_id
            };
        },
        async listRecentSaves(limit = 6, playerId) {
            const result = await client.execute({
                sql: `
                    SELECT session_id, saved_at, turn, location, story_branch, trait_count,
                           arc_title, quest_title, inventory_count, wound_count
                    FROM saves
                    WHERE player_id = ?
                    ORDER BY datetime(saved_at) DESC
                    LIMIT ?
                `,
                args: [normalizePlayerId(playerId), limit]
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
    normalizePlayerId,
    isOwnedByPlayer,
    getStorageConfig,
    createStorage,
    createFileStorage,
    createTursoStorage
};