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

function openDb(): Promise<IDBDatabase> {
	if (!storageAvailable()) return Promise.reject(new Error('IndexedDB is not available'));
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
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
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
		request.onblocked = () => reject(new Error('The database is blocked by another tab'));
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

/** Wipe everything BrewLab has stored on this machine. */
export async function deleteAllLocalData(): Promise<void> {
	if (!storageAvailable()) return;
	await idb.clear(STORE_RECIPES);
	await idb.clear(STORE_META);
	try {
		localStorage.removeItem('brewlab:prefs');
	} catch {
		// Private browsing can refuse this; there is nothing useful to do about it.
	}
}
