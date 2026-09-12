/**
 * A very small typed wrapper over IndexedDB.
 *
 * Everything BrewLab stores lives in the browser. There is no server, no
 * account and nothing leaves the machine unless the user exports it.
 */

const DB_NAME = 'brewlab';
const DB_VERSION = 1;
export const STORE_RECIPES = 'recipes';
export const STORE_META = 'meta';

export function storageAvailable(): boolean {
	return typeof indexedDB !== 'undefined';
}

let dbPromise: Promise<IDBDatabase> | undefined;

/**
 * How long to wait for the database before giving up on it.
 *
 * IndexedDB can stall indefinitely rather than fail — a delete request pending
 * behind another tab's connection never times out on its own. Without a bound
 * here, every read would hang, the app would never finish starting, and the
 * user would get no error at all.
 */
const OPEN_TIMEOUT_MS = 4000;

/** True once storage has failed or stalled, so the UI can say so once. */
let storageBroken = $state(false);

export function storageUnavailable(): boolean {
	return storageBroken;
}

function openDb(): Promise<IDBDatabase> {
	if (!storageAvailable()) return Promise.reject(new Error('IndexedDB is not available'));
	if (dbPromise) return dbPromise;
	const open = new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_RECIPES)) {
				const store = db.createObjectStore(STORE_RECIPES, { keyPath: 'id' });
				store.createIndex('updatedAt', 'updatedAt');
			}
			if (!db.objectStoreNames.contains(STORE_META)) {
				db.createObjectStore(STORE_META);
			}
		};
		request.onsuccess = () => {
			const db = request.result;
			// Without this, an open tab blocks any delete or upgrade requested
			// elsewhere — including this app's own "delete all local data" in
			// another tab — and the request simply hangs forever.
			db.onversionchange = () => {
				db.close();
				dbPromise = undefined;
			};
			db.onclose = () => {
				dbPromise = undefined;
			};
			resolve(db);
		};
		request.onerror = () => reject(request.error);
		request.onblocked = () => reject(new Error('The database is blocked by another tab'));
	});

	const timeout = new Promise<IDBDatabase>((_, reject) =>
		setTimeout(() => reject(new Error('IndexedDB did not respond')), OPEN_TIMEOUT_MS)
	);

	dbPromise = Promise.race([open, timeout]).catch((error) => {
		storageBroken = true;
		dbPromise = undefined;
		throw error;
	});
	return dbPromise;
}

function run<T>(
	storeName: string,
	mode: IDBTransactionMode,
	work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	return openDb().then(
		(db) =>
			new Promise<T>((resolve, reject) => {
				const tx = db.transaction(storeName, mode);
				const request = work(tx.objectStore(storeName));
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
				tx.onabort = () => reject(tx.error);
			})
	);
}

export const idb = {
	get: <T>(store: string, key: IDBValidKey) =>
		run<T | undefined>(store, 'readonly', (s) => s.get(key)),
	getAll: <T>(store: string) => run<T[]>(store, 'readonly', (s) => s.getAll()),
	put: <T>(store: string, value: T, key?: IDBValidKey) =>
		run<IDBValidKey>(store, 'readwrite', (s) =>
			key === undefined ? s.put(value) : s.put(value, key)
		),
	delete: (store: string, key: IDBValidKey) =>
		run<undefined>(store, 'readwrite', (s) => s.delete(key)),
	clear: (store: string) => run<undefined>(store, 'readwrite', (s) => s.clear())
};

/** Close this tab's connection, so a delete or upgrade elsewhere is not blocked. */
export async function closeDb(): Promise<void> {
	if (!dbPromise) return;
	const db = await dbPromise.catch(() => undefined);
	db?.close();
	dbPromise = undefined;
}

/** Wipe everything BrewLab has stored on this machine. */
export async function deleteAllLocalData(): Promise<void> {
	if (!storageAvailable()) return;
	// Clearing the stores rather than deleting the database avoids the blocked
	// state entirely: another open tab cannot stall it.
	await idb.clear(STORE_RECIPES);
	await idb.clear(STORE_META);
	try {
		localStorage.removeItem('brewlab:prefs');
	} catch {
		// Private browsing can refuse this; there is nothing useful to do about it.
	}
}
