(() => {
  "use strict";

  const C = window.CCConfig;
  const D = window.CCData;

  function getLocalSnapshotKeys() {
    const raw = localStorage.getItem(C.snapshotIndexKey);
    try {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function setLocalSnapshotKeys(keys) {
    localStorage.setItem(C.snapshotIndexKey, JSON.stringify(keys.slice(0, C.maxLocalSnapshots)));
  }

  function createLocalSnapshot(raw, label = "auto") {
    if (!raw) return null;
    const key = `myCommandCenter.snapshot.v8.${Date.now()}`;
    try {
      localStorage.setItem(key, raw);
      const keys = [key, ...getLocalSnapshotKeys().filter((item) => item !== key)];
      const keep = keys.slice(0, C.maxLocalSnapshots);
      keys.slice(C.maxLocalSnapshots).forEach((oldKey) => localStorage.removeItem(oldKey));
      setLocalSnapshotKeys(keep);
      return { key, label, createdAt: new Date().toISOString() };
    } catch (error) {
      console.warn("Local snapshot could not be created:", error);
      return null;
    }
  }

  function localCandidates() {
    const candidates = [];
    const add = (raw, source) => {
      const parsed = D.parse(raw);
      if (parsed) candidates.push({ state: parsed, source });
    };

    add(localStorage.getItem(C.storageKey), "primary");
    add(localStorage.getItem(C.shadowKey), "shadow");
    getLocalSnapshotKeys().forEach((key) => add(localStorage.getItem(key), key));
    // Legacy backup retained for migration/recovery.
    add(localStorage.getItem("myCommandCenter.lastKnownGood"), "legacy-backup");

    return candidates;
  }

  function mergeCandidates(candidates) {
    return candidates.reduce((merged, item) => D.mergeStates(merged, item.state), null);
  }

  function loadSync(defaultFactory) {
    try {
      const candidates = localCandidates();
      const merged = mergeCandidates(candidates);
      return merged || defaultFactory();
    } catch (error) {
      console.error("Synchronous recovery failed:", error);
      return defaultFactory();
    }
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB is unavailable."));
        return;
      }

      const request = indexedDB.open(C.indexedDbName, C.indexedDbVersion);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(C.indexedDbStore)) {
          const store = db.createObjectStore(C.indexedDbStore, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open IndexedDB."));
    });
  }

  async function writeIndexedSnapshot(state, reason = "auto") {
    try {
      const db = await openDb();
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const record = {
        id,
        createdAt: new Date().toISOString(),
        reason,
        fingerprint: D.fingerprint(state),
        state: D.clone(state)
      };

      await new Promise((resolve, reject) => {
        const tx = db.transaction(C.indexedDbStore, "readwrite");
        tx.objectStore(C.indexedDbStore).put(record);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });

      const records = await readIndexedSnapshots();
      if (records.length > C.maxIndexedDbSnapshots) {
        const remove = records.slice(C.maxIndexedDbSnapshots);
        await new Promise((resolve, reject) => {
          const tx = db.transaction(C.indexedDbStore, "readwrite");
          const store = tx.objectStore(C.indexedDbStore);
          remove.forEach((item) => store.delete(item.id));
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
      }
      db.close();
      return record;
    } catch (error) {
      console.warn("IndexedDB snapshot failed:", error);
      return null;
    }
  }

  async function readIndexedSnapshots() {
    try {
      const db = await openDb();
      const records = await new Promise((resolve, reject) => {
        const tx = db.transaction(C.indexedDbStore, "readonly");
        const request = tx.objectStore(C.indexedDbStore).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return records.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    } catch (error) {
      console.warn("Could not read IndexedDB snapshots:", error);
      return [];
    }
  }

  async function reconcileWithIndexedDb(currentState) {
    const records = await readIndexedSnapshots();
    if (!records.length) return currentState;
    let merged = D.clone(currentState);
    records.slice(0, 3).forEach((record) => {
      merged = D.mergeStates(merged, record.state);
    });
    return merged;
  }

  function save(state, reason = "save") {
    try {
      const serialized = JSON.stringify(state);
      const previousRaw = localStorage.getItem(C.storageKey);
      const previous = D.parse(previousRaw);

      if (previousRaw && previousRaw !== serialized) {
        createLocalSnapshot(previousRaw, reason);
      }

      if (previous && D.wouldLoseData(previous, state)) {
        // Preserve previous state as shadow and merge instead of allowing a destructive write.
        const repaired = D.mergeStates(state, previous);
        const repairedRaw = JSON.stringify(repaired);
        localStorage.setItem(C.shadowKey, previousRaw);
        localStorage.setItem(C.storageKey, repairedRaw);
        writeIndexedSnapshot(repaired, "destructive-write-blocked");
        return { ok: true, state: repaired, repaired: true };
      }

      if (previousRaw) localStorage.setItem(C.shadowKey, previousRaw);
      localStorage.setItem(C.storageKey, serialized);
      writeIndexedSnapshot(state, reason);
      return { ok: true, state, repaired: false };
    } catch (error) {
      console.error("Could not save Command Center data:", error);
      return { ok: false, state, repaired: false, error };
    }
  }

  async function manualSnapshot(state, reason = "manual") {
    try {
      const raw = JSON.stringify(state);
      createLocalSnapshot(raw, reason);
      const indexed = await writeIndexedSnapshot(state, reason);
      return Boolean(indexed || raw);
    } catch (_) {
      return false;
    }
  }

  async function latestIndexedSnapshot() {
    const records = await readIndexedSnapshots();
    return records[0] || null;
  }

  async function recoverLatest(currentState) {
    const latest = await latestIndexedSnapshot();
    if (!latest?.state) return { state: currentState, recovered: false };
    const merged = D.mergeStates(currentState, latest.state);
    const result = save(merged, "manual-recovery");
    return { state: result.state, recovered: true, snapshot: latest };
  }

  function status(state) {
    return {
      counts: D.counts(state),
      localSnapshots: getLocalSnapshotKeys().length
    };
  }

  window.CCStorage = {
    loadSync,
    save,
    manualSnapshot,
    reconcileWithIndexedDb,
    readIndexedSnapshots,
    recoverLatest,
    status
  };
})();
