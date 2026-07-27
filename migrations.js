(() => {
  "use strict";

  const TARGET = window.CCConfig.schemaVersion;

  function ensureObject(value, fallback = {}) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
  }

  function migrate(state, defaultsFactory, activityPresets) {
    const defaults = defaultsFactory();
    const source = window.CCData.clone(state || defaults);

    source.settings = { ...defaults.settings, ...ensureObject(source.settings) };

    if (!Array.isArray(source.settings.mindTemplates)) {
      source.settings.mindTemplates = [...defaults.settings.mindTemplates];
    }
    if (!Array.isArray(source.settings.spiritTemplates)) {
      source.settings.spiritTemplates = [...defaults.settings.spiritTemplates];
    }

    // Preserve existing schedule assignments. Only pad/trim safely.
    if (!Array.isArray(source.settings.schedule)) {
      source.settings.schedule = [...defaults.settings.schedule];
    } else {
      source.settings.schedule = [...source.settings.schedule.slice(0, 14)];
      while (source.settings.schedule.length < 14) {
        source.settings.schedule.push(
          defaults.settings.schedule[source.settings.schedule.length] || "Rest"
        );
      }
    }

    source.daily = ensureObject(source.daily);
    source.quotes = ensureObject(source.quotes);
    source.customWorkouts = ensureObject(source.customWorkouts);
    source.exerciseLogs = ensureObject(source.exerciseLogs);
    source.activityTrackers = ensureObject(source.activityTrackers);
    source.operations = ensureObject(source.operations, { items: [], cycles: [], activeOperationId: null });

    if (!Array.isArray(source.operations.items)) source.operations.items = [];
    if (!Array.isArray(source.operations.cycles)) source.operations.cycles = [];

    source.operations.items.forEach((operation) => {
      if (!Array.isArray(operation.objectives)) operation.objectives = [];
      if (typeof operation.overallSummary !== "string") operation.overallSummary = "";
    });

    source.operations.cycles.forEach((cycle) => {
      if (typeof cycle.summary !== "string") cycle.summary = "";
    });

    const presets = activityPresets || {};
    if (!source.activityTrackers.MMA) {
      source.activityTrackers.MMA = {
        name: "MMA",
        entries: [],
        metrics: window.CCData.clone(presets.MMA || [])
      };
    }

    Object.values(source.activityTrackers).forEach((tracker) => {
      if (!Array.isArray(tracker.entries)) tracker.entries = [];
      if (!Array.isArray(tracker.metrics)) tracker.metrics = [];
    });

    if (!source.settings.collapsedSections || typeof source.settings.collapsedSections !== "object") {
      source.settings.collapsedSections = {};
    }
    if (!source.settings.intelRange) source.settings.intelRange = "365";

    source.version = TARGET;
    source.meta = ensureObject(source.meta);
    source.meta.schemaVersion = TARGET;
    source.meta.lastMigratedAt = new Date().toISOString();

    return source;
  }

  window.CCMigrations = { migrate };
})();
