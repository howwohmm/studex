const KEY = 'studex-workspace-v1';

export function loadWorkspace() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved?.version === 1 && saved.profile &&
      ['subjects', 'events', 'tasks', 'records', 'files'].every((key) => Array.isArray(saved[key]))) return saved;
  } catch { /* An unavailable store must not prevent opening the workspace. */ }
  return null;
}

export function saveWorkspace(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function openFiles() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('studex-files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onblocked = () => reject(new Error('Close other Studex tabs and try again.'));
  });
}

async function withFiles(mode, run) {
  const db = await openFiles();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('files', mode);
      const req = run(tx.objectStore('files'));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export const putFile = (id, file) => withFiles('readwrite', (store) => store.put(file, id));
export const getFile = (id) => withFiles('readonly', (store) => store.get(id));
const getFileKeys = () => withFiles('readonly', (store) => store.getAllKeys());
export const deleteFile = (id) => withFiles('readwrite', (store) => store.delete(id));
export const clearFiles = () => withFiles('readwrite', (store) => store.clear());

export function withLibraryLock(run) {
  return navigator.locks ? navigator.locks.request('studex-library', run) : run();
}

export function reconcileFileKeys() {
  if (!navigator.locks) return getFileKeys();
  return withLibraryLock(async () => {
    const keys = await getFileKeys();
    const saved = loadWorkspace();
    if (!saved && localStorage.getItem(KEY) !== null) return keys;
    const referenced = new Set((saved?.files ?? []).map((file) => file.id));
    const orphaned = keys.filter((key) => !referenced.has(key));
    if (orphaned.length) await withFiles('readwrite', (store) => {
      for (const key of orphaned) store.delete(key);
      return store.getAllKeys();
    });
    return keys.filter((key) => referenced.has(key));
  });
}
