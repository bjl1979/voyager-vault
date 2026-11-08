// Voyager Vault – local IndexedDB storage (everything stays on this phone)
const DB_NAME = 'voyager-vault';
const DB_VERSION = 1;
let _db;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('trips')) db.createObjectStore('trips', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('docs')) {
        const s = db.createObjectStore('docs', { keyPath: 'id' });
        s.createIndex('tripId', 'tripId');
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    Promise.resolve(fn(s)).then(r => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

function reqP(r) {
  return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}

const DB = {
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },

  async allTrips() { return tx('trips', 'readonly', s => reqP(s.getAll())); },
  async getTrip(id) { return tx('trips', 'readonly', s => reqP(s.get(id))); },
  async saveTrip(trip) { trip.updated = Date.now(); return tx('trips', 'readwrite', s => reqP(s.put(trip))); },

  async docsFor(tripId) {
    return tx('docs', 'readonly', s => reqP(s.index('tripId').getAll(tripId)));
  },
  async allDocsMeta() {
    // lightweight: returns docs without touching blobs further
    return tx('docs', 'readonly', s => reqP(s.getAll()));
  },
  async getDoc(id) { return tx('docs', 'readonly', s => reqP(s.get(id))); },
  async saveDoc(doc) { return tx('docs', 'readwrite', s => reqP(s.put(doc))); },
  async deleteDoc(id) { return tx('docs', 'readwrite', s => reqP(s.delete(id))); },

  async deleteTrip(tripId) {
    const docs = await this.docsFor(tripId);
    await tx('docs', 'readwrite', s => { docs.forEach(d => s.delete(d.id)); });
    await tx('trips', 'readwrite', s => reqP(s.delete(tripId)));
  },
};

window.DB = DB;
