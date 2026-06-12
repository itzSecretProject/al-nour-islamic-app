// Tiny IndexedDB bridge for prayer logs that the Service Worker writes when the
// user taps "I prayed / not yet" on a push notification while the app is closed.
// The SW (public/sw.js) writes to the SAME db/store name with vanilla JS, and the
// client drains them here on load / focus and merges them into the salah log.

export const IDB_NAME = 'al-nour-db';
export const IDB_VERSION = 1;
export const IDB_STORE_PENDING = 'pendingPrayerLogs';

export type PrayerStatus = 'prayed' | 'missed';
export interface PendingPrayerLog {
  date: string; // YYYY-MM-DD (local)
  prayer: string;
  status: PrayerStatus;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_PENDING)) {
        db.createObjectStore(IDB_STORE_PENDING, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Read every pending log, then wipe the store. Returns [] on any failure.
export async function drainPendingPrayerLogs(): Promise<PendingPrayerLog[]> {
  try {
    const db = await openDb();
    return await new Promise<PendingPrayerLog[]>((resolve) => {
      const tx = db.transaction(IDB_STORE_PENDING, 'readwrite');
      const store = tx.objectStore(IDB_STORE_PENDING);
      const getAll = store.getAll();
      getAll.onsuccess = () => {
        const rows = (getAll.result || []) as PendingPrayerLog[];
        store.clear();
        tx.oncomplete = () => {
          db.close();
          resolve(rows);
        };
      };
      getAll.onerror = () => {
        db.close();
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}
