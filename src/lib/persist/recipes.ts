import type { Recipe, StoredRecipe } from '$lib/brewing/types';
import { emptyRecipe, newId, salts } from '$lib/brewing/recipes';
import { EMPTY_SALTS } from '$lib/brewing/water';
import { STORE_META, STORE_RECIPES, idb, storageAvailable } from './db';

export const SCHEMA_VERSION = 1;
const AUTOSAVE_KEY = 'active-brew';

/* -------------------------------------------------------------------------- */
/* Migration                                                                  */
/* -------------------------------------------------------------------------- */

type UnknownRecord = Record<string, unknown>;

/**
 * Bring a stored or imported recipe up to the current schema.
 *
 * Version 0 is "anything written before the schema version existed". Every
 * future version gets its own step here, and the steps run in order.
 */
export function migrateStored(input: unknown): StoredRecipe {
	const raw = (typeof input === 'object' && input !== null ? input : {}) as UnknownRecord;
	const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
	const now = new Date().toISOString();

	const recipe = normaliseRecipe(raw.recipe ?? raw);

	const stored: StoredRecipe = {
		schemaVersion: SCHEMA_VERSION,
		id: typeof raw.id === 'string' && raw.id ? raw.id : newId('r'),
		name: typeof raw.name === 'string' && raw.name ? raw.name : recipe.name,
		createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
		updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
		recipe
	};

	if (version > SCHEMA_VERSION) {
		// Written by a newer build. Keep what we understand rather than refusing.
		stored.schemaVersion = SCHEMA_VERSION;
	}
	return stored;
}

/** Fill in anything a stored or hand-edited recipe is missing. */
export function normaliseRecipe(input: unknown): Recipe {
	const base = emptyRecipe();
	if (typeof input !== 'object' || input === null) return base;
	const raw = input as UnknownRecord;

	const num = (value: unknown, fallback: number): number =>
		typeof value === 'number' && Number.isFinite(value) ? value : fallback;

	const water = (raw.water ?? {}) as UnknownRecord;
	const fermentation = (raw.fermentation ?? {}) as UnknownRecord;
	const chill = (raw.chill ?? {}) as UnknownRecord;
	const conditioning = (raw.conditioning ?? {}) as UnknownRecord;
	const mash = (raw.mash ?? {}) as UnknownRecord;

	return {
		name: typeof raw.name === 'string' ? raw.name : base.name,
		batchVolumeL: num(raw.batchVolumeL, base.batchVolumeL),
		preBoilVolumeL: num(raw.preBoilVolumeL, base.preBoilVolumeL),
		boilTimeMin: num(raw.boilTimeMin, base.boilTimeMin),
		efficiencyPct: num(raw.efficiencyPct, base.efficiencyPct),
		water: {
			profileId: typeof water.profileId === 'string' ? water.profileId : base.water.profileId,
			custom: water.custom as Recipe['water']['custom'],
			salts: {
				...EMPTY_SALTS,
				...(typeof water.salts === 'object' && water.salts ? water.salts : {})
			},
			lacticAcidMl: num(water.lacticAcidMl, 0)
		},
		fermentables: Array.isArray(raw.fermentables)
			? raw.fermentables
					.filter((f): f is UnknownRecord => typeof f === 'object' && f !== null)
					.map((f) => ({
						id: typeof f.id === 'string' ? f.id : newId('f'),
						fermentableId: String(f.fermentableId ?? ''),
						weightKg: num(f.weightKg, 0)
					}))
					.filter((f) => f.fermentableId)
			: base.fermentables,
		mash: {
			thicknessLPerKg: num(mash.thicknessLPerKg, base.mash.thicknessLPerKg),
			steps: Array.isArray(mash.steps)
				? mash.steps
						.filter((s): s is UnknownRecord => typeof s === 'object' && s !== null)
						.map((s) => ({
							id: typeof s.id === 'string' ? s.id : newId('m'),
							kind: (s.kind as Recipe['mash']['steps'][number]['kind']) ?? 'alpha',
							tempC: num(s.tempC, 66),
							minutes: num(s.minutes, 60)
						}))
				: base.mash.steps
		},
		hops: Array.isArray(raw.hops)
			? raw.hops
					.filter((h): h is UnknownRecord => typeof h === 'object' && h !== null)
					.map((h) => ({
						id: typeof h.id === 'string' ? h.id : newId('h'),
						hopId: String(h.hopId ?? ''),
						use: (h.use as Recipe['hops'][number]['use']) ?? 'boil',
						grams: num(h.grams, 0),
						time: num(h.time, 60),
						tempC: typeof h.tempC === 'number' ? h.tempC : undefined,
						day: typeof h.day === 'number' ? h.day : undefined
					}))
					.filter((h) => h.hopId)
			: base.hops,
		fermentation: {
			yeastId:
				typeof fermentation.yeastId === 'string' ? fermentation.yeastId : base.fermentation.yeastId,
			pitchRate: (fermentation.pitchRate as Recipe['fermentation']['pitchRate']) ?? 'standard',
			coldCrash: fermentation.coldCrash === true,
			steps: Array.isArray(fermentation.steps)
				? fermentation.steps
						.filter((s): s is UnknownRecord => typeof s === 'object' && s !== null)
						.map((s) => ({
							id: typeof s.id === 'string' ? s.id : newId('s'),
							label: typeof s.label === 'string' ? s.label : 'Primary',
							tempC: num(s.tempC, 19),
							days: num(s.days, 14)
						}))
				: base.fermentation.steps
		},
		chill: {
			minutes: num(chill.minutes, base.chill.minutes),
			pitchTempC: num(chill.pitchTempC, base.chill.pitchTempC),
			transferQuality: (chill.transferQuality as Recipe['chill']['transferQuality']) ?? 'normal'
		},
		conditioning: {
			days: num(conditioning.days, base.conditioning.days),
			tempC: num(conditioning.tempC, base.conditioning.tempC),
			co2Volumes: num(conditioning.co2Volumes, base.conditioning.co2Volumes)
		},
		targetStyleId: typeof raw.targetStyleId === 'string' ? raw.targetStyleId : undefined,
		notes: typeof raw.notes === 'string' ? raw.notes : undefined
	};
}

/* -------------------------------------------------------------------------- */
/* Stored recipe CRUD                                                         */
/* -------------------------------------------------------------------------- */

export function wrap(recipe: Recipe, existing?: StoredRecipe): StoredRecipe {
	const now = new Date().toISOString();
	return {
		schemaVersion: SCHEMA_VERSION,
		id: existing?.id ?? newId('r'),
		name: recipe.name || 'Untitled brew',
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
		recipe
	};
}

export async function listRecipes(): Promise<StoredRecipe[]> {
	if (!storageAvailable()) return [];
	const all = await idb.getAll<StoredRecipe>(STORE_RECIPES);
	return all.map(migrateStored).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveRecipe(recipe: Recipe, existing?: StoredRecipe): Promise<StoredRecipe> {
	const stored = wrap(recipe, existing);
	if (storageAvailable()) await idb.put(STORE_RECIPES, stored);
	return stored;
}

export async function deleteRecipe(id: string): Promise<void> {
	if (storageAvailable()) await idb.delete(STORE_RECIPES, id);
}

export async function duplicateRecipe(stored: StoredRecipe): Promise<StoredRecipe> {
	const copy: Recipe = { ...structuredClone(stored.recipe), name: `${stored.name} (copy)` };
	return saveRecipe(copy);
}

export async function renameRecipe(stored: StoredRecipe, name: string): Promise<StoredRecipe> {
	return saveRecipe({ ...stored.recipe, name }, stored);
}

/* -------------------------------------------------------------------------- */
/* Autosave and challenge progress                                            */
/* -------------------------------------------------------------------------- */

export async function loadAutosave(): Promise<Recipe | undefined> {
	if (!storageAvailable()) return undefined;
	try {
		const raw = await idb.get<unknown>(STORE_META, AUTOSAVE_KEY);
		return raw ? normaliseRecipe(raw) : undefined;
	} catch {
		return undefined;
	}
}

export async function saveAutosave(recipe: Recipe): Promise<void> {
	if (!storageAvailable()) return;
	try {
		await idb.put(STORE_META, structuredClone(recipe), AUTOSAVE_KEY);
	} catch {
		// Autosave is a convenience, never a requirement.
	}
}

export type StoredProgress = Record<string, { completedAt: string; bestOverall: number }>;

export async function loadProgress(): Promise<StoredProgress> {
	if (!storageAvailable()) return {};
	try {
		return (await idb.get<StoredProgress>(STORE_META, 'challenge-progress')) ?? {};
	} catch {
		return {};
	}
}

export async function saveProgress(progress: StoredProgress): Promise<void> {
	if (!storageAvailable()) return;
	try {
		await idb.put(STORE_META, progress, 'challenge-progress');
	} catch {
		// Progress is local and non-critical.
	}
}

/* -------------------------------------------------------------------------- */
/* JSON import and export                                                     */
/* -------------------------------------------------------------------------- */

export function exportJson(stored: StoredRecipe): string {
	return JSON.stringify(stored, null, 2);
}

export type ImportResult = { ok: true; stored: StoredRecipe } | { ok: false; error: string };

export function importJson(text: string): ImportResult {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return { ok: false, error: 'That is not valid JSON.' };
	}
	try {
		const stored = migrateStored(parsed);
		if (stored.recipe.fermentables.length === 0 && stored.recipe.hops.length === 0) {
			return { ok: false, error: 'The file parsed, but it contains no fermentables or hops.' };
		}
		return { ok: true, stored };
	} catch {
		return { ok: false, error: 'The file could not be read as a BrewLab recipe.' };
	}
}

export { salts };
