(() => {
  "use strict";

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function parse(raw) {
    if (!raw) return null;
    try {
      const value = JSON.parse(raw);
      return value && typeof value === "object" ? value : null;
    } catch (_) {
      return null;
    }
  }

  function stableEntryKey(entry) {
    if (!entry || typeof entry !== "object") return "";
    if (entry.id) return `id:${entry.id}`;
    return JSON.stringify([
      entry.date || "",
      entry.exercise || "",
      entry.weight ?? "",
      entry.reps ?? "",
      entry.sets ?? "",
      entry.metric || "",
      entry.value ?? "",
      entry.unit || "",
      entry.note || ""
    ]);
  }

  function mergeUniqueEntries(a = [], b = []) {
    const result = [];
    const seen = new Set();
    [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const key = stableEntryKey(entry);
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push(clone(entry));
    });
    return result;
  }

  function mergeAar(primary = {}, backup = {}) {
    const p = primary && typeof primary === "object" ? primary : {};
    const b = backup && typeof backup === "object" ? backup : {};
    const result = { ...b, ...p };

    ["wentWell", "improve", "lesson", "priority"].forEach((field) => {
      if (!String(p[field] || "").trim() && String(b[field] || "").trim()) {
        result[field] = b[field];
      }
    });

    if (!p.savedAt && b.savedAt) result.savedAt = b.savedAt;

    const pRating = Number(p.rating);
    const bRating = Number(b.rating);
    if ((!Number.isFinite(pRating) || (pRating === 5 && !p.savedAt)) && Number.isFinite(bRating)) {
      result.rating = bRating;
    }

    return result;
  }

  function mergeTasks(primary = [], backup = []) {
    const map = new Map();
    [...(Array.isArray(backup) ? backup : []), ...(Array.isArray(primary) ? primary : [])].forEach((task) => {
      if (!task || typeof task !== "object") return;
      const key = task.id || String(task.text || "").trim().toLowerCase();
      if (!key) return;
      const previous = map.get(key);
      map.set(key, previous ? { ...previous, ...task } : clone(task));
    });
    return [...map.values()];
  }

  function mergeDailyRecord(primary, backup) {
    if (!primary) return clone(backup);
    if (!backup) return clone(primary);

    const result = { ...backup, ...primary };
    result.aar = mergeAar(primary.aar, backup.aar);
    result.mindTasks = mergeTasks(primary.mindTasks, backup.mindTasks);
    result.spiritTasks = mergeTasks(primary.spiritTasks, backup.spiritTasks);

    if ((Number(primary.protein) || 0) === 0 && (Number(backup.protein) || 0) > 0) {
      result.protein = backup.protein;
    }
    if (!primary.workoutComplete && backup.workoutComplete) {
      result.workoutComplete = true;
    }

    return result;
  }

  function mergeOperations(primaryOps = {}, backupOps = {}) {
    const opMap = new Map();

    [...(backupOps.items || []), ...(primaryOps.items || [])].forEach((operation) => {
      if (!operation || typeof operation !== "object") return;
      const key = operation.id || `${operation.name || "operation"}:${operation.startCycleIndex ?? 0}`;
      const existing = opMap.get(key);

      if (!existing) {
        opMap.set(key, clone(operation));
        return;
      }

      const merged = { ...existing, ...operation };

      const objectiveMap = new Map();
      [...(existing.objectives || []), ...(operation.objectives || [])].forEach((objective) => {
        const item = typeof objective === "string" ? { text: objective } : objective;
        if (!item || !String(item.text || "").trim()) return;
        const objectiveKey = item.id || String(item.text).trim().toLowerCase();
        objectiveMap.set(objectiveKey, {
          ...(objectiveMap.get(objectiveKey) || {}),
          ...item
        });
      });
      merged.objectives = [...objectiveMap.values()];

      if (!String(merged.overallSummary || "").trim() && String(existing.overallSummary || "").trim()) {
        merged.overallSummary = existing.overallSummary;
      }

      opMap.set(key, merged);
    });

    const cycleMap = new Map();
    [...(backupOps.cycles || []), ...(primaryOps.cycles || [])].forEach((cycle) => {
      if (!cycle || !Number.isInteger(cycle.cycleIndex)) return;
      const existing = cycleMap.get(cycle.cycleIndex);
      cycleMap.set(
        cycle.cycleIndex,
        existing
          ? { ...existing, ...cycle, summary: String(cycle.summary || existing.summary || "") }
          : clone(cycle)
      );
    });

    return {
      ...backupOps,
      ...primaryOps,
      items: [...opMap.values()],
      cycles: [...cycleMap.values()].sort((a, b) => a.cycleIndex - b.cycleIndex),
      activeOperationId: primaryOps.activeOperationId || backupOps.activeOperationId || null
    };
  }

  function mergeStates(primary, backup) {
    if (!primary) return backup ? clone(backup) : null;
    if (!backup) return clone(primary);

    const merged = clone(primary);
    merged.settings = { ...(backup.settings || {}), ...(primary.settings || {}) };

    merged.daily = {};
    const dates = new Set([...Object.keys(backup.daily || {}), ...Object.keys(primary.daily || {})]);
    dates.forEach((dateKey) => {
      merged.daily[dateKey] = mergeDailyRecord(primary.daily?.[dateKey], backup.daily?.[dateKey]);
    });

    merged.quotes = { ...(backup.quotes || {}), ...(primary.quotes || {}) };
    merged.customWorkouts = { ...(backup.customWorkouts || {}), ...(primary.customWorkouts || {}) };

    merged.exerciseLogs = {};
    const exercises = new Set([
      ...Object.keys(backup.exerciseLogs || {}),
      ...Object.keys(primary.exerciseLogs || {})
    ]);
    exercises.forEach((exercise) => {
      merged.exerciseLogs[exercise] = mergeUniqueEntries(
        primary.exerciseLogs?.[exercise],
        backup.exerciseLogs?.[exercise]
      );
    });

    merged.activityTrackers = {};
    const trackerNames = new Set([
      ...Object.keys(backup.activityTrackers || {}),
      ...Object.keys(primary.activityTrackers || {})
    ]);
    trackerNames.forEach((name) => {
      const p = primary.activityTrackers?.[name] || {};
      const b = backup.activityTrackers?.[name] || {};
      merged.activityTrackers[name] = {
        ...b,
        ...p,
        name: p.name || b.name || name,
        metrics:
          Array.isArray(p.metrics) && p.metrics.length
            ? clone(p.metrics)
            : clone(b.metrics || []),
        entries: mergeUniqueEntries(p.entries, b.entries)
      };
    });

    merged.operations = mergeOperations(primary.operations || {}, backup.operations || {});
    merged.version = Math.max(Number(primary.version) || 0, Number(backup.version) || 0);

    return merged;
  }

  function counts(state) {
    const daily = Object.keys(state?.daily || {}).length;
    const aars = Object.values(state?.daily || {}).filter((day) => {
      const aar = day?.aar;
      return Boolean(
        aar?.savedAt ||
        String(aar?.wentWell || "").trim() ||
        String(aar?.improve || "").trim() ||
        String(aar?.lesson || "").trim() ||
        String(aar?.priority || "").trim()
      );
    }).length;
    const lifts = Object.values(state?.exerciseLogs || {}).reduce(
      (sum, logs) => sum + (Array.isArray(logs) ? logs.length : 0),
      0
    );
    const activities = Object.values(state?.activityTrackers || {}).reduce(
      (sum, tracker) => sum + (Array.isArray(tracker?.entries) ? tracker.entries.length : 0),
      0
    );
    const operations = Array.isArray(state?.operations?.items) ? state.operations.items.length : 0;

    return { daily, aars, lifts, activities, operations };
  }

  function fingerprint(state) {
    const c = counts(state);
    return `${c.daily}:${c.aars}:${c.lifts}:${c.activities}:${c.operations}`;
  }

  function wouldLoseData(previous, next) {
    const a = counts(previous);
    const b = counts(next);
    return (
      b.daily < a.daily ||
      b.aars < a.aars ||
      b.lifts < a.lifts ||
      b.activities < a.activities ||
      b.operations < a.operations
    );
  }

  window.CCData = {
    clone,
    parse,
    mergeUniqueEntries,
    mergeStates,
    counts,
    fingerprint,
    wouldLoseData
  };
})();
