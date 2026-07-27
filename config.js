(() => {
  "use strict";

  window.CCConfig = Object.freeze({
    schemaVersion: 8,
    storageKey: "myCommandCenter.v1",
    shadowKey: "myCommandCenter.shadow.v8",
    snapshotIndexKey: "myCommandCenter.snapshotIndex.v8",
    maxLocalSnapshots: 4,
    maxIndexedDbSnapshots: 12,
    indexedDbName: "myCommandCenterDB",
    indexedDbVersion: 1,
    indexedDbStore: "snapshots"
  });
})();
