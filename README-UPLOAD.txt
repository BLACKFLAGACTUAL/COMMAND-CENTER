MY COMMAND CENTER — V7 DATA-SAFE + INTEL + OPERATIONS UPDATE

UPLOAD / REPLACE:
- index.html
- styles.css
- app.js
- service-worker.js

KEEP:
- manifest.json
- all icon files

IMPORTANT DATA FIX
This version removes the previous "pick the richer state" recovery behavior.
That approach could restore an older backup and make newer AARs or lift entries appear deleted.

V7 now:
- Loads the current state AND last-known-good backup.
- Non-destructively merges unique daily records, AAR text, lift logs, activity logs,
  workouts, Operations, objectives, and block summaries.
- Uses the same localStorage key as previous versions.
- Snapshots the prior complete state before each write.
- Migrates settings additively instead of resetting a custom 14-day schedule.
- May recover AARs/lifts that still exist in myCommandCenter.lastKnownGood.

NEW FEATURES
1. INTEL tab
   - Dedicated performance intelligence page.
   - 30-day / 90-day / yearly / all-time views.
   - Execution, protein, AAR rating trend charts.
   - Key findings and activity-domain summaries.

2. OPERATION SUMMARIES
   - Every 14-day block has an automatic block summary.
   - Optional Commander note can be saved for each block.
   - Completed Operations receive an overall summary with editable Commander summary.

3. YEAR TIMELINE
   - Operations appear across a yearly timeline.
   - Completed objectives create victory flags/milestones.

4. OPERATION OBJECTIVES
   - Add/edit objectives from the Operation editor.
   - Check objectives complete while the Operation is active.
   - Completion date is preserved and feeds the yearly timeline.

5. ACTIVITY-SPECIFIC METRICS
   Recommended metrics are included for:
   MMA, BJJ, Boxing, Running, Ruck, Swimming, Surfing, Chess, Reading, Body Weight.
   Custom folders can define their own Metric | unit list.

BACKUP RECOMMENDATION
Before uploading this release, export your current JSON backup from System if possible.
V7 is designed to preserve and merge existing local data, but an exported JSON remains the
safest protection against Safari website-data deletion.

AFTER DEPLOYMENT
1. Wait for GitHub Pages to deploy.
2. Open the normal site in Safari and refresh.
3. Fully close the Home Screen app.
4. Reopen it.
