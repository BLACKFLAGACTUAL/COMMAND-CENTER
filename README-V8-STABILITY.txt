MY COMMAND CENTER — V8 STABILITY RELEASE

PURPOSE
V8 freezes the feature set and focuses on maintainability, migration safety, and data durability.

UPLOAD / REPLACE
- index.html
- styles.css
- service-worker.js
- the entire js/ folder

NEW FOLDER STRUCTURE
js/
  app.js
  core/
    config.js
    data.js
    migrations.js
    storage.js
  features/
    activity-presets.js

KEEP
- manifest.json
- all icon files

IMPORTANT
The old root-level app.js is no longer used. You may delete it from GitHub after uploading the js/ folder.
The new index.html loads js/app.js plus the core modules.

DATA INTEGRITY CHANGES
1. Same primary data key is preserved: myCommandCenter.v1.
2. V8 migrates the existing state in place rather than initializing a fresh state.
3. Existing 14-day schedules are padded/trimmed instead of reset.
4. Current data, shadow data, legacy backup, and local snapshots are merged non-destructively at startup.
5. A second persistence layer now mirrors snapshots into IndexedDB.
6. Before normal writes, the previous complete state is snapshotted.
7. Destructive writes are blocked if they would reduce daily record, AAR, lift, activity, or Operation counts.
8. JSON imports now MERGE with current data instead of replacing it.
9. System now contains Recovery & Snapshots:
   - Create snapshot
   - Recover latest
   - Download backup
10. Intentional Delete All resets active state but retains recovery snapshots.

LIMITATION
Browser-local data can never be made completely indestructible. Clearing Safari Website Data can remove both localStorage and IndexedDB.
For true device-independent durability, a cloud backend is eventually required.
Until then, periodic downloaded JSON backups remain the strongest off-device protection.

DEPLOYMENT
1. Export your existing JSON backup from System before upgrading.
2. Upload index.html, styles.css, service-worker.js, and the full js/ directory.
3. Keep manifest.json and icons.
4. Delete the old root app.js after verifying the new site works.
5. Wait for GitHub Pages deployment.
6. Open the normal site in Safari and refresh once.
7. Fully close and reopen the Home Screen app.
8. Open System → Recovery & snapshots and confirm your AAR/lift counts.

V8 does not intentionally delete or rewrite user-entered AARs, lift logs, activity logs, Operations, objectives, summaries, or archived daily records.
