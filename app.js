(() => {
  "use strict";

  const STORAGE_KEY = "myCommandCenter.v1";
  const BACKUP_STORAGE_KEY = "myCommandCenter.lastKnownGood";
  const DEFAULT_QUOTE =
    "The secret of all victory lies in the organization of the non-obvious.";

  const DEFAULT_SETTINGS = {
    proteinGoal: 170,
    cycleStartDate: formatDateKey(new Date()),
    mindTemplates: [
      "Read 20 pages",
      "Master’s coursework",
      "Spanish lesson",
      "Chess study",
      "New skill"
    ],
    spiritTemplates: [
      "Read Bible",
      "Journal and reflect",
      "Wife time",
      "Three gratitudes",
      "AAR/EXO"
    ],
    schedule: [
      "MMA",
      "Strength B",
      "Easy conditioning",
      "Rest",
      "HIC",
      "Strength A",
      "MMA",
      "Rest",
      "HIC",
      "Strength B",
      "MMA",
      "Easy conditioning",
      "Rest",
      "HIC"
    ]
  };

  const ACTIVITY_METRIC_PRESETS = {
    MMA: [
      { name: "Training time", unit: "min" },
      { name: "Rounds", unit: "rounds" },
      { name: "Sparring rounds", unit: "rounds" },
      { name: "Performance", unit: "/10" }
    ],
    BJJ: [
      { name: "Training time", unit: "min" },
      { name: "Rolling rounds", unit: "rounds" },
      { name: "Submissions", unit: "subs" },
      { name: "Performance", unit: "/10" }
    ],
    Boxing: [
      { name: "Training time", unit: "min" },
      { name: "Rounds", unit: "rounds" },
      { name: "Sparring rounds", unit: "rounds" },
      { name: "Performance", unit: "/10" }
    ],
    Running: [
      { name: "Distance", unit: "mi" },
      { name: "Time", unit: "min" },
      { name: "Pace", unit: "min/mi" },
      { name: "Heart rate", unit: "bpm" }
    ],
    Ruck: [
      { name: "Distance", unit: "mi" },
      { name: "Time", unit: "min" },
      { name: "Load", unit: "lb" },
      { name: "Pace", unit: "min/mi" }
    ],
    Swimming: [
      { name: "Distance", unit: "yd" },
      { name: "Time", unit: "min" },
      { name: "Pace", unit: "min/100yd" }
    ],
    Surfing: [
      { name: "Session time", unit: "min" },
      { name: "Waves caught", unit: "waves" },
      { name: "Best wave", unit: "/10" }
    ],
    Chess: [
      { name: "Rating", unit: "Elo" },
      { name: "Games", unit: "games" },
      { name: "Wins", unit: "wins" },
      { name: "Study time", unit: "min" }
    ],
    Reading: [
      { name: "Pages", unit: "pages" },
      { name: "Study time", unit: "min" }
    ],
    "Body Weight": [
      { name: "Body weight", unit: "lb" }
    ]
  };

  const DEFAULT_WORKOUTS = {
    "Strength A": ["Zercher squat", "Incline bench", "Weighted pull-ups"],
    "Strength B": ["Trap-bar deadlift", "Overhead press", "Chest-supported row"],
    "HIC": ["Assault bike", "Intervals", "Kettlebell swings", "Burpees"],
    "Easy conditioning": ["Easy run", "Swimming", "Bike"],
    "MMA": ["MMA practice, drilling, sparring, or class"],
    "Rest": ["Recovery, mobility, walking, and sleep"]
  };

  let state = loadState();
  let activeView = "today";
  let taskDialogCategory = null;
  let scheduleDialogIndex = null;
  let editingWorkoutName = null;
  let loggingExerciseName = null;
  let loggingPastEntry = false;
  let lastRenderedDateKey = getTodayKey();
  let editingAarDateKey = null;
  let editingOperationId = null;
  let archiveCalendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);

  const elements = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    ensureStateShape();
    bindEvents();
    initializeCollapsibleSections();
    renderAll();
    registerServiceWorker();
  }

  function cacheElements() {
    [
      "storageAlert", "currentDate", "cycleDayHeader", "overallPercentHeader",
      "quoteDisplay", "quoteEditor", "quoteInput", "editQuoteButton",
      "saveQuoteButton", "cancelQuoteButton", "overallPercent", "mindPercent",
      "bodyPercent", "spiritPercent", "mindTasks", "spiritTasks",
      "workoutComplete", "todayWorkoutName", "toggleWorkoutDetails",
      "workoutDetails", "proteinValue", "proteinPercent", "proteinSlider",
      "proteinMidpoint", "proteinGoalLabel", "resetProteinButton",
      "aarForm", "aarWentWell", "aarImprove", "aarLesson", "aarPriority",
      "aarRating", "aarRatingOutput", "aarSavedStatus", "cycleDaySchedule",
      "cycleStartDate", "scheduleList", "trainingReference",
      "historyDaysLogged", "historyAverage", "historyProteinAverage",
      "historyList", "emptyHistory", "proteinGoalInput",
      "saveSettingsButton", "settingsSavedStatus", "mindTemplateEditor",
      "spiritTemplateEditor", "exportDataButton", "importDataInput",
      "resetTodayButton", "deleteAllDataButton", "taskDialog",
      "taskDialogForm", "taskDialogTitle", "taskDialogInput",
      "scheduleDialog", "scheduleDialogForm", "scheduleDialogInput",
      "workoutLibrary", "addWorkoutButton", "workoutDialog",
      "workoutDialogForm", "workoutDialogTitle", "workoutNameInput",
      "exerciseEditor", "addExerciseRowButton", "workoutDialogStatus",
      "quickWorkoutForm", "quickWorkoutName", "quickExerciseEditor",
      "quickAddExerciseButton", "quickAssignDays", "quickWorkoutStatus",
      "toggleScheduleButton", "schedulePanel", "taskDialogCancel",
      "scheduleDialogCancel", "workoutDialogCancel", "exerciseLogDialog",
      "exerciseLogForm", "exerciseLogName", "exerciseSelectField",
      "exerciseNameInput", "exerciseNameOptions", "exerciseDateInput", "exerciseWeightInput",
      "exerciseRepsInput", "exerciseSetsInput", "exerciseLogNote",
      "exerciseLogStatus", "exerciseLogCancel", "progressExerciseSelect",
      "addPastLiftButton", "manualStrengthEntryButton", "progressChart", "progressChartEmpty", "progressLogList",
      "activityDomainTabs", "addActivityTrackerButton", "weightliftingProgressSection", "activityProgressSection",
      "activityProgressHeading", "activityMetricSelect", "addActivityEntryButton", "activityProgressChart",
      "activityProgressEmpty", "activityProgressLogList", "activityTrackerDialog", "activityTrackerForm",
      "activityTrackerName", "activityTrackerStatus", "activityTrackerCancel", "activityEntryDialog",
      "activityEntryForm", "activityEntryDomain", "activityEntryDate", "activityEntryMetric", "activityEntryValue",
      "activityEntryUnit", "activityEntryNote", "activityEntryStatus", "activityEntryCancel", "editAarDialog",
      "editAarForm", "editAarDate", "editAarWentWell", "editAarImprove", "editAarLesson", "editAarPriority",
      "editAarRating", "editAarStatus", "editAarCancel", "newOperationButton", "currentOperationCard",
      "operationCycleStrip", "operationsList", "operationDialog", "operationForm", "operationDialogTitle",
      "operationTimingNote", "operationName", "operationIntent", "operationMission", "operationDialogStatus",
      "operationDialogCancel", "operationTrendSummary", "operationObjectives", "operationsYearSelect", "operationsYearTimeline",
      "intelRange", "intelMetricGrid", "intelFindings", "intelExecutionChart", "intelProteinChart", "intelRatingChart", "intelActivitySummary",
      "activityTrackerMetrics", "activityMetricSuggestions", "archiveCalendarPrev", "archiveCalendarNext", "archiveCalendarToday",
      "archiveCalendarMonth", "archiveCalendarGrid", "editAarTitle", "editAarOperationContext"
    ].forEach((id) => {
      elements[id] = document.getElementById(id);
    });
  }

  function initializeCollapsibleSections() {
    document.querySelectorAll("[data-collapsible-key]").forEach((section) => {
      const key = section.dataset.collapsibleKey;
      if (!key || section.dataset.collapseReady === "true") return;

      let heading = section.querySelector(":scope > .section-heading");
      if (!heading) {
        const firstHeading = section.querySelector(":scope > h3, :scope > h2");
        if (firstHeading) {
          heading = document.createElement("div");
          heading.className = "section-heading generated-collapse-heading";
          firstHeading.before(heading);
          heading.appendChild(firstHeading);
        }
      }
      if (!heading) return;

      const body = document.createElement("div");
      body.className = "collapsible-section-body";

      [...section.children].forEach((child) => {
        if (child !== heading) body.appendChild(child);
      });
      section.appendChild(body);

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "section-collapse-button";
      toggle.setAttribute("aria-controls", `collapse-${key}`);
      body.id = `collapse-${key}`;

      const initiallyCollapsed = Boolean(state.settings.collapsedSections?.[key]);
      body.hidden = initiallyCollapsed;
      toggle.setAttribute("aria-expanded", String(!initiallyCollapsed));
      toggle.textContent = initiallyCollapsed ? "Show" : "Hide";

      toggle.addEventListener("click", () => {
        const collapsed = !body.hidden;
        body.hidden = collapsed;
        toggle.setAttribute("aria-expanded", String(!collapsed));
        toggle.textContent = collapsed ? "Show" : "Hide";
        state.settings.collapsedSections[key] = collapsed;
        saveState();
      });

      const existingAction = heading.querySelector(":scope > .compact-action, :scope > button");
      if (existingAction) {
        const controls = document.createElement("div");
        controls.className = "section-heading-controls";
        existingAction.before(controls);
        controls.append(existingAction, toggle);
      } else {
        heading.appendChild(toggle);
      }

      section.dataset.collapseReady = "true";
    });
  }

  function bindEvents() {
    document.querySelectorAll(".nav-button").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.target));
    });

    elements.archiveCalendarPrev.addEventListener("click", () => {
      archiveCalendarCursor = new Date(
        archiveCalendarCursor.getFullYear(),
        archiveCalendarCursor.getMonth() - 1,
        1,
        12
      );
      renderArchiveCalendar();
    });
    elements.archiveCalendarNext.addEventListener("click", () => {
      archiveCalendarCursor = new Date(
        archiveCalendarCursor.getFullYear(),
        archiveCalendarCursor.getMonth() + 1,
        1,
        12
      );
      renderArchiveCalendar();
    });
    elements.archiveCalendarToday.addEventListener("click", () => {
      const today = new Date();
      archiveCalendarCursor = new Date(today.getFullYear(), today.getMonth(), 1, 12);
      renderArchiveCalendar();
    });

    elements.editQuoteButton.addEventListener("click", openQuoteEditor);
    elements.saveQuoteButton.addEventListener("click", saveQuote);
    elements.cancelQuoteButton.addEventListener("click", closeQuoteEditor);

    elements.workoutComplete.addEventListener("change", () => {
      const day = getTodayRecord();
      day.workoutComplete = elements.workoutComplete.checked;
      saveAndRender();
    });

    elements.toggleWorkoutDetails.addEventListener("click", toggleWorkoutDetails);

    elements.proteinSlider.addEventListener("input", () => {
      setProtein(Number(elements.proteinSlider.value), false);
    });
    elements.proteinSlider.addEventListener("change", () => saveAndRender());

    document.querySelectorAll(".protein-adjust").forEach((button) => {
      button.addEventListener("click", () => {
        const day = getTodayRecord();
        setProtein(day.protein + Number(button.dataset.change), true);
      });
    });

    elements.resetProteinButton.addEventListener("click", () => {
      if (confirm("Reset today’s protein log to 0 grams?")) {
        setProtein(0, true);
      }
    });

    document.querySelectorAll(".add-task-button").forEach((button) => {
      button.addEventListener("click", () => openTaskDialog(button.dataset.category));
    });

    elements.taskDialogForm.addEventListener("submit", handleTaskDialogSubmit);
    elements.scheduleDialogForm.addEventListener("submit", handleScheduleDialogSubmit);
    elements.addWorkoutButton.addEventListener("click", () => openWorkoutDialog());
    elements.addExerciseRowButton.addEventListener("click", () => addExerciseEditorRow(""));
    elements.workoutDialogForm.addEventListener("submit", handleWorkoutDialogSubmit);
    elements.quickAddExerciseButton.addEventListener("click", () => addQuickExerciseRow(""));
    elements.quickWorkoutForm.addEventListener("submit", handleQuickWorkoutSubmit);

    elements.toggleScheduleButton.addEventListener("click", toggleScheduleVisibility);
    elements.taskDialogCancel.addEventListener("click", () => elements.taskDialog.close());
    elements.scheduleDialogCancel.addEventListener("click", () => elements.scheduleDialog.close());
    elements.workoutDialogCancel.addEventListener("click", () => elements.workoutDialog.close());
    elements.exerciseLogCancel.addEventListener("click", () => elements.exerciseLogDialog.close());
    elements.exerciseLogForm.addEventListener("submit", saveExerciseLog);
    elements.progressExerciseSelect.addEventListener("change", () => {
      state.settings.progressExercise = elements.progressExerciseSelect.value;
      saveState();
      renderProgressChart();
    });
    elements.addPastLiftButton.addEventListener("click", openPastExerciseLogDialog);
    elements.manualStrengthEntryButton.addEventListener("click", openPastExerciseLogDialog);
    elements.addActivityTrackerButton.addEventListener("click", openActivityTrackerDialog);
    elements.activityTrackerCancel.addEventListener("click", () => elements.activityTrackerDialog.close());
    elements.activityTrackerForm.addEventListener("submit", saveActivityTracker);
    elements.activityTrackerName.addEventListener("input", () => {
      const metrics = inferActivityMetrics(elements.activityTrackerName.value);
      if (metrics.length) {
        elements.activityTrackerMetrics.value = metrics.map((metric) => `${metric.name} | ${metric.unit}`).join("\n");
      }
    });
    elements.intelRange.addEventListener("change", () => {
      state.settings.intelRange = elements.intelRange.value;
      saveState();
      renderIntel();
    });
    elements.operationsYearSelect.addEventListener("change", renderOperationsYearTimeline);
    elements.addActivityEntryButton.addEventListener("click", openActivityEntryDialog);
    elements.activityEntryCancel.addEventListener("click", () => elements.activityEntryDialog.close());
    elements.activityEntryForm.addEventListener("submit", saveActivityEntry);
    elements.activityMetricSelect.addEventListener("change", renderActivityProgress);
    elements.editAarCancel.addEventListener("click", () => elements.editAarDialog.close());
    elements.editAarForm.addEventListener("submit", saveArchivedAar);
    elements.newOperationButton.addEventListener("click", () => openOperationDialog());
    elements.operationDialogCancel.addEventListener("click", () => elements.operationDialog.close());
    elements.operationForm.addEventListener("submit", saveOperation);
    [elements.taskDialog, elements.scheduleDialog, elements.workoutDialog, elements.exerciseLogDialog, elements.activityTrackerDialog, elements.activityEntryDialog, elements.editAarDialog, elements.operationDialog].forEach((dialog) => {
      dialog.addEventListener("cancel", (event) => { event.preventDefault(); dialog.close(); });
      dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    });

    elements.aarRating.addEventListener("input", () => {
      elements.aarRatingOutput.value = elements.aarRating.value;
      saveAarDraft();
    });
    [
      elements.aarWentWell,
      elements.aarImprove,
      elements.aarLesson,
      elements.aarPriority
    ].forEach((field) => field.addEventListener("input", saveAarDraft));
    elements.aarForm.addEventListener("submit", saveAar);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshForNewDate();
    });
    window.addEventListener("focus", refreshForNewDate);
    window.setInterval(refreshForNewDate, 60_000);

    elements.cycleStartDate.addEventListener("change", () => {
      if (!elements.cycleStartDate.value) return;
      state.settings.cycleStartDate = elements.cycleStartDate.value;
      saveAndRender();
    });

    elements.saveSettingsButton.addEventListener("click", saveSettings);

    document.querySelectorAll(".template-add").forEach((button) => {
      button.addEventListener("click", () => addTemplate(button.dataset.category));
    });

    elements.exportDataButton.addEventListener("click", exportData);
    elements.importDataInput.addEventListener("change", importData);
    elements.resetTodayButton.addEventListener("click", resetToday);
    elements.deleteAllDataButton.addEventListener("click", deleteAllData);
  }

  function ensureStateShape() {
    if (!state || typeof state !== "object") state = createInitialState();
    state.version = 7;
    state.settings = { ...DEFAULT_SETTINGS, ...(state.settings || {}) };

    if (!Array.isArray(state.settings.mindTemplates)) {
      state.settings.mindTemplates = [...DEFAULT_SETTINGS.mindTemplates];
    }
    if (!Array.isArray(state.settings.spiritTemplates)) {
      state.settings.spiritTemplates = [...DEFAULT_SETTINGS.spiritTemplates];
    }
    if (!Array.isArray(state.settings.schedule)) {
      state.settings.schedule = [...DEFAULT_SETTINGS.schedule];
    } else {
      state.settings.schedule = [...state.settings.schedule.slice(0, 14)];
      while (state.settings.schedule.length < 14) {
        state.settings.schedule.push(DEFAULT_SETTINGS.schedule[state.settings.schedule.length] || "Rest");
      }
    }

    if (!state.daily || typeof state.daily !== "object") state.daily = {};
    if (!state.quotes || typeof state.quotes !== "object") state.quotes = {};
    if (!state.customWorkouts || typeof state.customWorkouts !== "object" || Array.isArray(state.customWorkouts)) {
      state.customWorkouts = {};
    }
    if (!state.exerciseLogs || typeof state.exerciseLogs !== "object" || Array.isArray(state.exerciseLogs)) {
      state.exerciseLogs = {};
    }
    if (!state.activityTrackers || typeof state.activityTrackers !== "object" || Array.isArray(state.activityTrackers)) {
      state.activityTrackers = {};
    }
    if (!state.activityTrackers.MMA) {
      state.activityTrackers.MMA = { name: "MMA", entries: [], metrics: structuredCloneSafe(ACTIVITY_METRIC_PRESETS.MMA) };
    }
    Object.values(state.activityTrackers).forEach((tracker) => {
      if (!Array.isArray(tracker.entries)) tracker.entries = [];
      if (!Array.isArray(tracker.metrics) || !tracker.metrics.length) {
        tracker.metrics = inferActivityMetrics(tracker.name);
      }
    });
    if (!state.settings.intelRange) state.settings.intelRange = "365";
    if (!state.settings.archiveDomain) state.settings.archiveDomain = "Weightlifting";
    if (typeof state.settings.progressExercise !== "string") state.settings.progressExercise = "";
    if (typeof state.settings.scheduleCollapsed !== "boolean") state.settings.scheduleCollapsed = false;
    if (!state.settings.collapsedSections || typeof state.settings.collapsedSections !== "object" || Array.isArray(state.settings.collapsedSections)) {
      state.settings.collapsedSections = {};
    }
    ensureOperationsShape();
    syncOperationCycles();

    getTodayRecord();
    saveState();
  }

  function createInitialState() {
    return {
      version: 7,
      settings: structuredCloneSafe(DEFAULT_SETTINGS),
      daily: {},
      quotes: {},
      customWorkouts: {},
      exerciseLogs: {},
      activityTrackers: { MMA: { name: "MMA", entries: [], metrics: structuredCloneSafe(ACTIVITY_METRIC_PRESETS.MMA) } },
      operations: { items: [], cycles: [], activeOperationId: null }
    };
  }

  function createDailyRecord(dateKey) {
    return {
      date: dateKey,
      mindTasks: state.settings.mindTemplates.map((text) => createTask(text)),
      spiritTasks: state.settings.spiritTemplates.map((text) => createTask(text)),
      workoutComplete: false,
      protein: 0,
      aar: {
        wentWell: "",
        improve: "",
        lesson: "",
        priority: "",
        rating: 5,
        savedAt: null
      },
      updatedAt: new Date().toISOString()
    };
  }

  function createTask(text) {
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      completed: false
    };
  }

  function getTodayKey() {
    return formatDateKey(new Date());
  }

  function getTodayRecord() {
    const key = getTodayKey();
    if (!state.daily[key]) {
      state.daily[key] = createDailyRecord(key);
    }
    return state.daily[key];
  }

  function renderAll() {
    lastRenderedDateKey = getTodayKey();
    renderHeader();
    renderToday();
    renderSchedule();
    renderHistory();
    renderIntel();
    renderSettings();
  }

  function renderHeader() {
    const now = new Date();
    const cycleDay = calculateCycleDay(now);
    const completion = calculateCompletion(getTodayRecord());

    elements.currentDate.textContent = now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    elements.cycleDayHeader.textContent = `DAY ${cycleDay} / 14`;
    elements.cycleDaySchedule.textContent = `DAY ${cycleDay}`;
    elements.overallPercentHeader.textContent = `${completion.overall}%`;

    const quote = state.quotes[getTodayKey()] || DEFAULT_QUOTE;
    elements.quoteDisplay.textContent = `“${quote}”`;
  }

  function renderToday() {
    const day = getTodayRecord();
    const cycleDay = calculateCycleDay(new Date());
    const workout = state.settings.schedule[cycleDay - 1];

    renderTaskList("mind", day.mindTasks, elements.mindTasks);
    renderTaskList("spirit", day.spiritTasks, elements.spiritTasks);

    elements.workoutComplete.checked = Boolean(day.workoutComplete);
    elements.todayWorkoutName.textContent = workout;
    renderWorkoutDetails(workout);

    const goal = normalizeProteinGoal(state.settings.proteinGoal);
    day.protein = clamp(Number(day.protein) || 0, 0, goal);
    elements.proteinSlider.max = String(goal);
    elements.proteinSlider.value = String(day.protein);
    elements.proteinValue.textContent = `${day.protein} / ${goal} g`;
    elements.proteinPercent.textContent = `${Math.round((day.protein / goal) * 100)}%`;
    elements.proteinMidpoint.textContent = String(Math.round(goal / 2));
    elements.proteinGoalLabel.textContent = `${goal} g`;

    populateAar(day.aar);

    const completion = calculateCompletion(day);
    elements.mindPercent.textContent = `${completion.mind}%`;
    elements.bodyPercent.textContent = `${completion.body}%`;
    elements.spiritPercent.textContent = `${completion.spirit}%`;
    elements.overallPercent.textContent = `${completion.overall}%`;
    elements.overallPercentHeader.textContent = `${completion.overall}%`;
    elements.aarSavedStatus.textContent = day.aar.savedAt ? "Saved" : "";
  }

  function renderTaskList(category, tasks, container) {
    container.replaceChildren();

    tasks.forEach((task) => {
      const label = document.createElement("label");
      label.className = `task-item${task.completed ? " completed" : ""}`;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(task.completed);
      checkbox.setAttribute("aria-label", task.text);
      checkbox.addEventListener("change", () => {
        task.completed = checkbox.checked;
        getTodayRecord().updatedAt = new Date().toISOString();
        saveAndRender();
      });

      const custom = document.createElement("span");
      custom.className = "custom-checkbox";
      custom.setAttribute("aria-hidden", "true");

      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;

      const remove = document.createElement("button");
      remove.className = "task-remove";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${task.text}`);
      remove.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!confirm(`Remove “${task.text}” from today?`)) return;
        const day = getTodayRecord();
        const list = category === "mind" ? day.mindTasks : day.spiritTasks;
        const index = list.findIndex((item) => item.id === task.id);
        if (index >= 0) list.splice(index, 1);
        saveAndRender();
      });

      label.append(checkbox, custom, text, remove);
      container.appendChild(label);
    });
  }

  function renderWorkoutDetails(workoutName) {
    const details = getWorkoutDetails(workoutName);
    elements.workoutDetails.replaceChildren();
    const list = document.createElement("div");
    list.className = "today-exercise-list";
    details.forEach((item) => {
      const row = document.createElement("div");
      row.className = "today-exercise-row";
      const copy = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = item;
      const latest = getLatestExerciseLog(item);
      const sub = document.createElement("small");
      sub.textContent = latest ? `Last: ${formatWeight(latest.weight)} × ${latest.reps} reps · ${formatShortDate(latest.date)}` : "No weight logged yet";
      copy.append(name, sub);
      const logButton = document.createElement("button");
      logButton.type = "button";
      logButton.className = "button secondary log-set-button";
      logButton.textContent = "Log";
      logButton.addEventListener("click", () => openExerciseLogDialog(item));
      row.append(copy, logButton);
      list.appendChild(row);
    });
    elements.workoutDetails.appendChild(list);
  }

  function toggleWorkoutDetails() {
    const isHidden = elements.workoutDetails.hidden;
    elements.workoutDetails.hidden = !isHidden;
    elements.toggleWorkoutDetails.setAttribute("aria-expanded", String(isHidden));
    elements.toggleWorkoutDetails.textContent = isHidden
      ? "Hide workout details"
      : "View workout details";
  }

  function toggleScheduleVisibility() {
    state.settings.scheduleCollapsed = !state.settings.scheduleCollapsed;
    saveState();
    applyScheduleVisibility();
  }

  function applyScheduleVisibility() {
    const collapsed = Boolean(state.settings.scheduleCollapsed);
    elements.schedulePanel.hidden = collapsed;
    elements.toggleScheduleButton.textContent = collapsed ? "Show schedule" : "Hide schedule";
    elements.toggleScheduleButton.setAttribute("aria-expanded", String(!collapsed));
  }

  function renderSchedule() {
    elements.cycleStartDate.value = state.settings.cycleStartDate;
    applyScheduleVisibility();
    const currentDay = calculateCycleDay(new Date());
    elements.scheduleList.replaceChildren();

    state.settings.schedule.forEach((assignment, index) => {
      const item = document.createElement("article");
      item.className = `schedule-item${index + 1 === currentDay ? " today" : ""}`;

      const top = document.createElement("div");
      top.className = "schedule-top";

      const dayBlock = document.createElement("div");
      dayBlock.className = "schedule-day";

      const number = document.createElement("span");
      number.className = "day-number";
      number.textContent = String(index + 1);

      const label = document.createElement("div");
      label.className = "schedule-copy";
      const small = document.createElement("span");
      small.className = "data-label";
      small.textContent = index + 1 === currentDay ? "TODAY" : `DAY ${index + 1}`;
      const strong = document.createElement("strong");
      strong.textContent = assignment;
      label.append(small, strong);

      const edit = document.createElement("button");
      edit.className = "schedule-edit";
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => openScheduleDialog(index));

      dayBlock.append(number, label);
      top.append(dayBlock, edit);
      item.appendChild(top);
      elements.scheduleList.appendChild(item);
    });

    renderWorkoutLibrary();
    renderQuickWorkoutBuilder();

    elements.trainingReference.innerHTML = "";
    Object.entries(getWorkoutLibrary()).forEach(([name, details]) => {
      const disclosure = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = name;
      const list = document.createElement("ul");
      details.forEach((detail) => {
        const li = document.createElement("li");
        li.textContent = detail;
        list.appendChild(li);
      });
      disclosure.append(summary, list);
      elements.trainingReference.appendChild(disclosure);
    });
  }


  function renderQuickWorkoutBuilder() {
    if (!elements.quickExerciseEditor.children.length) {
      addQuickExerciseRow("");
      addQuickExerciseRow("");
    }

    elements.quickAssignDays.replaceChildren();
    state.settings.schedule.forEach((assignment, index) => {
      const label = document.createElement("label");
      label.className = "assign-day-option";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = String(index);

      const dayText = document.createElement("span");
      dayText.innerHTML = `<strong>DAY ${index + 1}</strong><small>${escapeHtml(assignment)}</small>`;

      label.append(checkbox, dayText);
      elements.quickAssignDays.appendChild(label);
    });
  }

  function addQuickExerciseRow(value = "") {
    const row = document.createElement("div");
    row.className = "exercise-editor-row";

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 120;
    input.placeholder = "Exercise name";
    input.value = value;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Remove exercise");
    remove.addEventListener("click", () => {
      if (elements.quickExerciseEditor.children.length === 1) {
        input.value = "";
        input.focus();
      } else {
        row.remove();
      }
    });

    row.append(input, remove);
    elements.quickExerciseEditor.appendChild(row);
  }

  function handleQuickWorkoutSubmit(event) {
    event.preventDefault();
    const name = elements.quickWorkoutName.value.trim();
    const exercises = [...elements.quickExerciseEditor.querySelectorAll("input")]
      .map((input) => input.value.trim())
      .filter(Boolean);

    if (!name || !exercises.length) {
      elements.quickWorkoutStatus.textContent = "Enter a workout name and at least one exercise.";
      return;
    }
    if (DEFAULT_WORKOUTS[name] || state.customWorkouts[name]) {
      elements.quickWorkoutStatus.textContent = "That workout name already exists. Choose another name or edit it in the library.";
      return;
    }

    state.customWorkouts[name] = exercises;
    [...elements.quickAssignDays.querySelectorAll('input[type="checkbox"]:checked')]
      .forEach((checkbox) => {
        state.settings.schedule[Number(checkbox.value)] = name;
      });

    elements.quickWorkoutName.value = "";
    elements.quickExerciseEditor.replaceChildren();
    addQuickExerciseRow("");
    addQuickExerciseRow("");
    elements.quickWorkoutStatus.textContent = `${name} saved and assigned.`;
    saveAndRender();
  }

  function getWorkoutLibrary() {
    return { ...DEFAULT_WORKOUTS, ...(state.customWorkouts || {}) };
  }

  function getWorkoutDetails(workoutName) {
    const library = getWorkoutLibrary();
    return Array.isArray(library[workoutName]) && library[workoutName].length
      ? library[workoutName]
      : ["Follow today’s programmed session."];
  }

  function renderWorkoutLibrary() {
    elements.workoutLibrary.replaceChildren();

    const originalHeading = document.createElement("p");
    originalHeading.className = "category-kicker library-heading";
    originalHeading.textContent = "ORIGINAL TEMPLATES";
    elements.workoutLibrary.appendChild(originalHeading);

    Object.entries(DEFAULT_WORKOUTS).forEach(([name, exercises]) => {
      elements.workoutLibrary.appendChild(createWorkoutLibraryItem(name, exercises, true));
    });

    const customHeading = document.createElement("p");
    customHeading.className = "category-kicker library-heading custom-heading";
    customHeading.textContent = "CUSTOM PROTOCOLS";
    elements.workoutLibrary.appendChild(customHeading);

    const customEntries = Object.entries(state.customWorkouts || {});
    if (!customEntries.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No custom workouts yet.";
      elements.workoutLibrary.appendChild(empty);
      return;
    }

    customEntries.forEach(([name, exercises]) => {
      elements.workoutLibrary.appendChild(createWorkoutLibraryItem(name, exercises, false));
    });
  }

  function createWorkoutLibraryItem(name, exercises, isOriginal) {
    const item = document.createElement("article");
    item.className = "workout-library-item";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = name;
    const count = document.createElement("span");
    count.className = "helper-text";
    count.textContent = `${exercises.length} exercise${exercises.length === 1 ? "" : "s"}`;
    info.append(title, count);

    const actions = document.createElement("div");
    actions.className = "library-actions";

    const duplicate = document.createElement("button");
    duplicate.className = "schedule-edit";
    duplicate.type = "button";
    duplicate.textContent = "Duplicate";
    duplicate.addEventListener("click", () => duplicateWorkout(name));
    actions.appendChild(duplicate);

    if (!isOriginal) {
      const edit = document.createElement("button");
      edit.className = "schedule-edit";
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => openWorkoutDialog(name));

      const remove = document.createElement("button");
      remove.className = "schedule-edit danger-edit";
      remove.type = "button";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => deleteCustomWorkout(name));
      actions.append(edit, remove);
    }

    item.append(info, actions);
    return item;
  }

  function openWorkoutDialog(workoutName = null) {
    editingWorkoutName = workoutName;
    const exercises = workoutName ? [...getWorkoutDetails(workoutName)] : [""];
    elements.workoutDialogTitle.textContent = workoutName ? "Edit workout" : "Create workout";
    elements.workoutNameInput.value = workoutName || "";
    elements.workoutNameInput.disabled = Boolean(workoutName);
    elements.workoutDialogStatus.textContent = "";
    elements.exerciseEditor.replaceChildren();
    exercises.forEach(addExerciseEditorRow);
    elements.workoutDialog.showModal();
    setTimeout(() => (workoutName ? elements.exerciseEditor.querySelector("input") : elements.workoutNameInput)?.focus(), 0);
  }

  function addExerciseEditorRow(value = "") {
    const row = document.createElement("div");
    row.className = "exercise-editor-row";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 120;
    input.placeholder = "Exercise name";
    input.value = value;
    input.required = true;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Remove exercise");
    remove.addEventListener("click", () => {
      if (elements.exerciseEditor.children.length === 1) {
        input.value = "";
        input.focus();
      } else {
        row.remove();
      }
    });
    row.append(input, remove);
    elements.exerciseEditor.appendChild(row);
  }

  function handleWorkoutDialogSubmit(event) {
    event.preventDefault();
    if (event.submitter?.value !== "save") {
      elements.workoutDialog.close();
      return;
    }

    const name = elements.workoutNameInput.value.trim();
    const exercises = [...elements.exerciseEditor.querySelectorAll("input")]
      .map((input) => input.value.trim())
      .filter(Boolean);

    if (!name || !exercises.length) {
      elements.workoutDialogStatus.textContent = "Enter a name and at least one exercise.";
      return;
    }
    if (!editingWorkoutName && (DEFAULT_WORKOUTS[name] || state.customWorkouts[name])) {
      elements.workoutDialogStatus.textContent = "That workout name already exists.";
      return;
    }

    state.customWorkouts[editingWorkoutName || name] = exercises;
    elements.workoutDialog.close();
    saveAndRender();
  }

  function duplicateWorkout(sourceName) {
    const baseName = `${sourceName} Copy`;
    let name = baseName;
    let number = 2;
    while (DEFAULT_WORKOUTS[name] || state.customWorkouts[name]) {
      name = `${baseName} ${number++}`;
    }
    state.customWorkouts[name] = [...getWorkoutDetails(sourceName)];
    saveAndRender();
    openWorkoutDialog(name);
  }

  function deleteCustomWorkout(name) {
    const assignedDays = state.settings.schedule
      .map((workout, index) => workout === name ? index + 1 : null)
      .filter(Boolean);
    const message = assignedDays.length
      ? `“${name}” is assigned to day${assignedDays.length > 1 ? "s" : ""} ${assignedDays.join(", ")}. Delete it and change those days to Rest?`
      : `Delete “${name}”?`;
    if (!confirm(message)) return;
    delete state.customWorkouts[name];
    state.settings.schedule = state.settings.schedule.map((workout) => workout === name ? "Rest" : workout);
    saveAndRender();
  }

  function openExerciseLogDialog(exerciseName) {
    loggingPastEntry = false;
    loggingExerciseName = exerciseName;
    const latest = getLatestExerciseLog(exerciseName);
    elements.exerciseLogName.textContent = exerciseName;
    elements.exerciseSelectField.hidden = true;
    elements.exerciseDateInput.value = getTodayKey();
    elements.exerciseWeightInput.value = latest ? String(latest.weight) : "";
    elements.exerciseRepsInput.value = latest ? String(latest.reps) : "";
    elements.exerciseSetsInput.value = latest ? String(latest.sets || 1) : "1";
    elements.exerciseLogNote.value = "";
    elements.exerciseLogStatus.textContent = "";
    elements.exerciseLogDialog.showModal();
    setTimeout(() => elements.exerciseWeightInput.focus(), 0);
  }

  function openPastExerciseLogDialog() {
    loggingPastEntry = true;
    loggingExerciseName = null;
    elements.exerciseLogName.textContent = "Historical strength entry";
    elements.exerciseSelectField.hidden = false;
    populateExerciseNameSelect();
    elements.exerciseNameInput.value = elements.progressExerciseSelect.value || "";
    elements.exerciseDateInput.value = getTodayKey();
    elements.exerciseWeightInput.value = "";
    elements.exerciseRepsInput.value = "";
    elements.exerciseSetsInput.value = "1";
    elements.exerciseLogNote.value = "";
    elements.exerciseLogStatus.textContent = "";
    elements.exerciseLogDialog.showModal();
    setTimeout(() => elements.exerciseNameInput.focus(), 0);
  }

  function populateExerciseNameSelect() {
    const names = new Set(Object.keys(state.exerciseLogs || {}));
    Object.values(DEFAULT_WORKOUTS).flat().forEach((name) => names.add(name));
    Object.values(state.customWorkouts || {}).flat().forEach((name) => names.add(name));
    const sorted = [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
    elements.exerciseNameOptions.replaceChildren();
    sorted.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      elements.exerciseNameOptions.appendChild(option);
    });
    const selected = elements.progressExerciseSelect.value;
    elements.exerciseNameInput.value = selected || "";
  }

  function saveExerciseLog(event) {
    event.preventDefault();
    const exerciseName = loggingPastEntry ? elements.exerciseNameInput.value.trim() : loggingExerciseName;
    const dateKey = elements.exerciseDateInput.value;
    const weight = Number(elements.exerciseWeightInput.value);
    const reps = Number(elements.exerciseRepsInput.value);
    const sets = Number(elements.exerciseSetsInput.value);
    if (!exerciseName || !dateKey || !Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps < 1 || !Number.isInteger(sets) || sets < 1) {
      elements.exerciseLogStatus.textContent = "Choose an exercise and date, then enter valid weight, reps, and sets.";
      return;
    }
    const selectedDate = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(selectedDate.getTime())) {
      elements.exerciseLogStatus.textContent = "Choose a valid workout date.";
      return;
    }
    const log = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, date: selectedDate.toISOString(), weight, reps, sets, note: elements.exerciseLogNote.value.trim(), workout: state.settings.schedule[calculateCycleDay(selectedDate) - 1] };
    if (!Array.isArray(state.exerciseLogs[exerciseName])) state.exerciseLogs[exerciseName] = [];
    state.exerciseLogs[exerciseName].push(log);
    saveState();
    elements.exerciseLogDialog.close();
    loggingPastEntry = false;
    loggingExerciseName = null;
    renderWorkoutDetails(state.settings.schedule[calculateCycleDay(new Date()) - 1]);
    renderHistory();
    if (exerciseName) {
      elements.progressExerciseSelect.value = exerciseName;
      renderProgressChart();
    }
  }

  function getLatestExerciseLog(exerciseName) {
    const logs = state.exerciseLogs?.[exerciseName];
    return Array.isArray(logs) && logs.length ? [...logs].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
  }

  function renderProgressChart() {
    const exercise = elements.progressExerciseSelect.value;
    const logs = exercise && Array.isArray(state.exerciseLogs[exercise]) ? [...state.exerciseLogs[exercise]].sort((a, b) => a.date.localeCompare(b.date)) : [];
    elements.progressChartEmpty.hidden = logs.length > 0;
    elements.progressChart.hidden = logs.length === 0;
    elements.progressLogList.replaceChildren();
    [...logs].reverse().slice(0, 8).forEach((log) => {
      const row = document.createElement("div");
      row.className = "progress-log-row";
      row.innerHTML = `<span>${escapeHtml(formatShortDate(log.date))}</span><strong>${escapeHtml(formatWeight(log.weight))} × ${log.reps}</strong><small>${log.sets || 1} set${(log.sets || 1) === 1 ? "" : "s"}${log.note ? ` · ${escapeHtml(log.note)}` : ""}</small>`;
      elements.progressLogList.appendChild(row);
    });
    if (logs.length) drawProgressChart(logs);
  }

  function drawProgressChart(logs) {
    const canvas = elements.progressChart;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.floor(rect.width || 720));
    const height = Math.max(220, Math.floor(rect.height || 360));
    canvas.width = width * dpr; canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height);
    const pad = { left: 48, right: 18, top: 24, bottom: 38 };
    const values = logs.map((log) => Number(log.weight) || 0);
    let min = Math.min(...values), max = Math.max(...values);
    if (min === max) { min = Math.max(0, min - 10); max += 10; }
    const range = max - min || 1;
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.strokeStyle = "rgba(150,150,165,.28)"; ctx.fillStyle = "#9696a5"; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + ((height - pad.top - pad.bottom) * i / 4);
      const value = max - range * i / 4;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
      ctx.fillText(`${Math.round(value * 10) / 10}`, 4, y + 4);
    }
    const xFor = (i) => logs.length === 1 ? (pad.left + width - pad.right) / 2 : pad.left + (width - pad.left - pad.right) * i / (logs.length - 1);
    const yFor = (v) => pad.top + (height - pad.top - pad.bottom) * (max - v) / range;
    ctx.strokeStyle = "#f34f58"; ctx.lineWidth = 3; ctx.beginPath();
    logs.forEach((log, i) => { const x=xFor(i), y=yFor(Number(log.weight)||0); i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); }); ctx.stroke();
    ctx.fillStyle = "#f34f58";
    logs.forEach((log, i) => { const x=xFor(i), y=yFor(Number(log.weight)||0); ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill(); });
    ctx.fillStyle = "#9696a5";
    const first = formatShortDate(logs[0].date), last = formatShortDate(logs[logs.length-1].date);
    ctx.fillText(first, pad.left, height - 12);
    ctx.fillText(last, width - pad.right - ctx.measureText(last).width, height - 12);
  }

  function formatWeight(weight) {
    const n = Number(weight);
    return `${Number.isInteger(n) ? n : n.toFixed(1)} lb`;
  }

  function formatShortDate(value) {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }


  function ensureOperationsShape() {
    if (!state.operations || typeof state.operations !== "object" || Array.isArray(state.operations)) {
      state.operations = { items: [], cycles: [], activeOperationId: null };
    }
    if (!Array.isArray(state.operations.items)) state.operations.items = [];
    if (!Array.isArray(state.operations.cycles)) state.operations.cycles = [];

    state.operations.items.forEach((operation) => {
      if (!operation.id) operation.id = `op-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      if (!operation.name) operation.name = "Untitled Operation";
      if (typeof operation.intent !== "string") operation.intent = "";
      if (typeof operation.mission !== "string") operation.mission = "";
      if (!Number.isInteger(operation.startCycleIndex)) operation.startCycleIndex = 0;
      if (operation.endCycleIndex !== null && !Number.isInteger(operation.endCycleIndex)) operation.endCycleIndex = null;
      if (!operation.status) operation.status = operation.endCycleIndex === null ? "active" : "complete";
      if (!Array.isArray(operation.objectives)) operation.objectives = [];
      operation.objectives = operation.objectives.map((objective) => {
        if (typeof objective === "string") {
          return { id: `obj-${Date.now()}-${Math.random().toString(16).slice(2)}`, text: objective, completed: false, completedAt: null };
        }
        return {
          id: objective.id || `obj-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          text: String(objective.text || ""),
          completed: Boolean(objective.completed),
          completedAt: objective.completedAt || null
        };
      }).filter((objective) => objective.text.trim());
      if (typeof operation.overallSummary !== "string") operation.overallSummary = "";
    });

    if (!state.operations.items.length) {
      const operation = {
        id: `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: "Operation Arete",
        intent: "",
        mission: "",
        startCycleIndex: 0,
        endCycleIndex: null,
        status: "active",
        objectives: [],
        overallSummary: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.operations.items.push(operation);
      state.operations.activeOperationId = operation.id;
    }
  }

  function getCycleIndexForDate(date) {
    const start = parseLocalDate(state.settings.cycleStartDate);
    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const targetUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.floor((targetUtc - startUtc) / (14 * 86400000));
  }

  function getCycleBounds(cycleIndex) {
    const base = parseLocalDate(state.settings.cycleStartDate);
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() + cycleIndex * 14, 12);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 13, 12);
    return { start, end, startKey: formatDateKey(start), endKey: formatDateKey(end) };
  }

  function operationForCycle(cycleIndex) {
    return state.operations.items
      .filter((operation) => operation.startCycleIndex <= cycleIndex && (operation.endCycleIndex === null || cycleIndex <= operation.endCycleIndex))
      .sort((a, b) => b.startCycleIndex - a.startCycleIndex)[0] || null;
  }

  function syncOperationCycles() {
    ensureOperationsShape();
    const currentIndex = getCycleIndexForDate(new Date());
    if (currentIndex < 0) return;

    state.operations.items.forEach((operation) => {
      if (operation.status === "planned" && operation.startCycleIndex <= currentIndex) {
        operation.status = "active";
        state.operations.activeOperationId = operation.id;
      }
      if (operation.endCycleIndex !== null && currentIndex > operation.endCycleIndex && operation.status !== "planned") {
        operation.status = "complete";
        if (state.operations.activeOperationId === operation.id) state.operations.activeOperationId = null;
      }
    });

    const currentOperation = operationForCycle(currentIndex);
    if (currentOperation && currentOperation.status !== "planned") {
      currentOperation.status = "active";
      state.operations.activeOperationId = currentOperation.id;
    }

    const byIndex = new Map(state.operations.cycles.map((cycle) => [cycle.cycleIndex, cycle]));
    for (let i = 0; i <= currentIndex; i += 1) {
      const bounds = getCycleBounds(i);
      const operation = operationForCycle(i);
      let cycle = byIndex.get(i);
      if (!cycle) {
        cycle = {
          id: `cycle-${i}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          cycleIndex: i,
          startDate: bounds.startKey,
          endDate: bounds.endKey,
          operationId: operation?.id || null,
          status: i < currentIndex ? "complete" : "active",
          summary: "",
          createdAt: new Date().toISOString()
        };
        state.operations.cycles.push(cycle);
      } else {
        cycle.startDate = bounds.startKey;
        cycle.endDate = bounds.endKey;
        cycle.status = i < currentIndex ? "complete" : "active";
        if (!cycle.operationId && operation) cycle.operationId = operation.id;
        if (typeof cycle.summary !== "string") cycle.summary = "";
      }
    }
  }

  function recordsBetween(startKey, endKey) {
    return Object.values(state.daily || {})
      .filter((day) => day?.date >= startKey && day?.date <= endKey && hasMeaningfulData(day));
  }

  function cycleStats(cycleIndex) {
    const bounds = getCycleBounds(cycleIndex);
    const records = recordsBetween(bounds.startKey, bounds.endKey);
    const execution = records.length
      ? Math.round(records.reduce((sum, day) => sum + calculateCompletion(day).overall, 0) / records.length)
      : 0;
    const protein = records.length
      ? Math.round(records.reduce((sum, day) => sum + (Number(day.protein) || 0), 0) / records.length)
      : 0;
    const ratings = records.map((day) => Number(day.aar?.rating)).filter(Number.isFinite);
    const rating = ratings.length ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10 : 0;
    let liftEntries = 0;
    Object.values(state.exerciseLogs || {}).forEach((logs) => {
      (Array.isArray(logs) ? logs : []).forEach((log) => {
        const key = String(log.date || "").slice(0, 10);
        if (key >= bounds.startKey && key <= bounds.endKey) liftEntries += 1;
      });
    });
    return { records: records.length, execution, protein, rating, liftEntries };
  }

  function operationStats(operation) {
    const currentIndex = Math.max(0, getCycleIndexForDate(new Date()));
    const finalIndex = operation.endCycleIndex === null ? currentIndex : Math.min(operation.endCycleIndex, currentIndex);
    const cycleCount = Math.max(0, finalIndex - operation.startCycleIndex + 1);
    const startBounds = getCycleBounds(operation.startCycleIndex);
    const endBounds = getCycleBounds(finalIndex);
    const records = cycleCount ? recordsBetween(startBounds.startKey, endBounds.endKey) : [];
    const execution = records.length ? Math.round(records.reduce((sum, day) => sum + calculateCompletion(day).overall, 0) / records.length) : 0;
    const protein = records.length ? Math.round(records.reduce((sum, day) => sum + (Number(day.protein) || 0), 0) / records.length) : 0;
    return { cycleCount, daysLogged: records.length, execution, protein };
  }

  function getCurrentOperation() {
    const currentIndex = getCycleIndexForDate(new Date());
    return operationForCycle(currentIndex);
  }

  function getPlannedOperation() {
    return state.operations.items.find((operation) => operation.status === "planned") || null;
  }

  function intelRecordsForRange() {
    const value = state.settings.intelRange || "365";
    const records = Object.values(state.daily || {}).filter(hasMeaningfulData).sort((a, b) => a.date.localeCompare(b.date));
    if (value === "all") return records;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(value) + 1);
    const cutoffKey = formatDateKey(cutoff);
    return records.filter((day) => day.date >= cutoffKey);
  }

  function averageNumbers(values) {
    const valid = values.map(Number).filter(Number.isFinite);
    return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
  }

  function renderMiniLineChart(container, points, suffix = "") {
    container.replaceChildren();
    if (!points.length) {
      container.innerHTML = `<p class="empty-state">Not enough data yet.</p>`;
      return;
    }
    const values = points.map((point) => Number(point.value)).filter(Number.isFinite);
    if (!values.length) return;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 600, height = 150, pad = 12;
    const coords = points.map((point, i) => ({
      x: points.length === 1 ? width / 2 : pad + (i / (points.length - 1)) * (width - pad * 2),
      y: height - pad - ((Number(point.value) - min) / range) * (height - pad * 2)
    }));
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Trend from ${points[0].value}${suffix} to ${points.at(-1).value}${suffix}`);
    const grid = document.createElementNS(svg.namespaceURI, "line");
    grid.setAttribute("x1", pad); grid.setAttribute("x2", width-pad); grid.setAttribute("y1", height/2); grid.setAttribute("y2", height/2); grid.setAttribute("class", "intel-chart-gridline");
    svg.appendChild(grid);
    const path = document.createElementNS(svg.namespaceURI, "polyline");
    path.setAttribute("points", coords.map((p) => `${p.x},${p.y}`).join(" "));
    path.setAttribute("class", "intel-chart-line");
    svg.appendChild(path);
    coords.forEach((p) => {
      const dot = document.createElementNS(svg.namespaceURI, "circle");
      dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y); dot.setAttribute("r", 3); dot.setAttribute("class", "intel-chart-dot");
      svg.appendChild(dot);
    });
    container.appendChild(svg);
    const footer = document.createElement("div");
    footer.className = "intel-chart-footer";
    footer.innerHTML = `<span>${escapeHtml(points[0].label)}</span><strong>${escapeHtml(String(points.at(-1).value))}${escapeHtml(suffix)}</strong><span>${escapeHtml(points.at(-1).label)}</span>`;
    container.appendChild(footer);
  }

  function renderIntel() {
    if (!elements.intelMetricGrid) return;
    elements.intelRange.value = state.settings.intelRange || "365";
    const records = intelRecordsForRange();
    const execution = records.map((day) => calculateCompletion(day).overall);
    const protein = records.map((day) => Number(day.protein) || 0);
    const ratings = records.filter((day) => aarHasContent(day)).map((day) => Number(day.aar?.rating)).filter(Number.isFinite);

    const allLiftLogs = Object.entries(state.exerciseLogs || {}).flatMap(([exercise, logs]) =>
      (Array.isArray(logs) ? logs : []).map((log) => ({ ...log, exercise }))
    );
    const rangeStart = records[0]?.date || "";
    const liftLogs = rangeStart ? allLiftLogs.filter((log) => String(log.date || "").slice(0, 10) >= rangeStart) : allLiftLogs;

    const metrics = [
      ["AVG EXECUTION", `${Math.round(averageNumbers(execution))}%`],
      ["AVG PROTEIN", `${Math.round(averageNumbers(protein))} g`],
      ["AVG AAR", ratings.length ? `${averageNumbers(ratings).toFixed(1)}/10` : "—"],
      ["DAYS LOGGED", String(records.length)],
      ["LIFT ENTRIES", String(liftLogs.length)],
      ["OPERATIONS", String(state.operations.items.length)]
    ];
    elements.intelMetricGrid.replaceChildren();
    metrics.forEach(([label, value]) => {
      const card = document.createElement("div");
      card.className = "intel-metric";
      card.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      elements.intelMetricGrid.appendChild(card);
    });

    const findings = [];
    if (records.length >= 8) {
      const latest = records.slice(-7);
      const previous = records.slice(-14, -7);
      if (previous.length) {
        const execDelta = Math.round(averageNumbers(latest.map((d) => calculateCompletion(d).overall)) - averageNumbers(previous.map((d) => calculateCompletion(d).overall)));
        findings.push(`Recent 7-day execution is ${formatSignedDelta(execDelta, " pp")} vs the prior period.`);
        const proteinDelta = Math.round(averageNumbers(latest.map((d) => d.protein || 0)) - averageNumbers(previous.map((d) => d.protein || 0)));
        findings.push(`Recent protein average is ${formatSignedDelta(proteinDelta, " g")} vs the prior period.`);
      }
    }
    if (records.length) {
      const weekday = new Map();
      records.forEach((day) => {
        const name = parseLocalDate(day.date).toLocaleDateString(undefined, { weekday: "short" });
        const bucket = weekday.get(name) || [];
        bucket.push(calculateCompletion(day).overall);
        weekday.set(name, bucket);
      });
      const ranked = [...weekday.entries()].map(([name, values]) => [name, averageNumbers(values)]).sort((a,b)=>b[1]-a[1]);
      if (ranked[0]) findings.push(`${ranked[0][0]} is your strongest execution day at ${Math.round(ranked[0][1])}% average.`);
      if (ranked.at(-1)) findings.push(`${ranked.at(-1)[0]} is your lowest execution day at ${Math.round(ranked.at(-1)[1])}% average.`);
    }
    elements.intelFindings.innerHTML = `<h4>KEY FINDINGS</h4>${findings.length ? `<ul>${findings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join("")}</ul>` : `<p class="empty-state">Log more days to generate trend findings.</p>`}`;

    const pointify = (selector) => records.map((day) => ({ label: formatShortDate(day.date), value: selector(day) }));
    renderMiniLineChart(elements.intelExecutionChart, pointify((day) => calculateCompletion(day).overall), "%");
    renderMiniLineChart(elements.intelProteinChart, pointify((day) => Number(day.protein) || 0), " g");
    renderMiniLineChart(elements.intelRatingChart, records.filter(aarHasContent).map((day) => ({ label: formatShortDate(day.date), value: Number(day.aar?.rating) || 0 })), "/10");

    elements.intelActivitySummary.replaceChildren();
    Object.entries(state.activityTrackers || {}).forEach(([name, tracker]) => {
      const card = document.createElement("div");
      card.className = "intel-activity-card";
      const entries = tracker.entries || [];
      const recent = rangeStart ? entries.filter((entry) => String(entry.date || "").slice(0, 10) >= rangeStart) : entries;
      const metricNames = [...new Set(recent.map((entry) => entry.metric).filter(Boolean))];
      card.innerHTML = `<strong>${escapeHtml(name)}</strong><span>${recent.length} entries</span><small>${escapeHtml(metricNames.slice(0,4).join(" · ") || "No metrics logged")}</small>`;
      elements.intelActivitySummary.appendChild(card);
    });
  }

  function cycleRecords(cycleIndex) {
    const bounds = getCycleBounds(cycleIndex);
    return Object.values(state.daily || {})
      .filter((day) => day?.date >= bounds.startKey && day?.date <= bounds.endKey && hasMeaningfulData(day))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function cycleAarCount(cycleIndex) {
    return cycleRecords(cycleIndex).filter((day) => aarHasContent(day)).length;
  }

  function operationCycleIndexes(operation) {
    const currentIndex = Math.max(0, getCycleIndexForDate(new Date()));
    const finalIndex = operation.endCycleIndex === null
      ? currentIndex
      : Math.min(operation.endCycleIndex, currentIndex);
    if (finalIndex < operation.startCycleIndex) return [];
    return Array.from(
      { length: finalIndex - operation.startCycleIndex + 1 },
      (_, offset) => operation.startCycleIndex + offset
    );
  }

  function formatSignedDelta(value, suffix = "") {
    if (!Number.isFinite(value)) return "—";
    if (value === 0) return `0${suffix}`;
    return `${value > 0 ? "+" : ""}${value}${suffix}`;
  }

  function operationTrendData(operation) {
    const indexes = operationCycleIndexes(operation);
    const blocks = indexes.map((cycleIndex) => ({
      cycleIndex,
      ...cycleStats(cycleIndex),
      aarCount: cycleAarCount(cycleIndex)
    }));
    const first = blocks[0] || null;
    const latest = blocks[blocks.length - 1] || null;
    const totalAars = blocks.reduce((sum, block) => sum + block.aarCount, 0);
    const totalLifts = blocks.reduce((sum, block) => sum + block.liftEntries, 0);
    const daysPossible = blocks.length * 14;
    const daysLogged = blocks.reduce((sum, block) => sum + block.records, 0);

    return {
      blocks,
      first,
      latest,
      totalAars,
      totalLifts,
      consistency: daysPossible ? Math.round((daysLogged / daysPossible) * 100) : 0,
      executionDelta: first && latest ? latest.execution - first.execution : 0,
      ratingDelta: first && latest ? Math.round((latest.rating - first.rating) * 10) / 10 : 0,
      proteinDelta: first && latest ? latest.protein - first.protein : 0
    };
  }

  function renderOperationTrendSummary(operation) {
    if (!elements.operationTrendSummary) return;
    elements.operationTrendSummary.replaceChildren();
    if (!operation) return;

    const trend = operationTrendData(operation);
    if (!trend.blocks.length) {
      elements.operationTrendSummary.innerHTML = `<p class="empty-state">Complete daily records to begin Operation trend analysis.</p>`;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "operation-analysis-grid";
    const metrics = [
      ["EXECUTION TREND", formatSignedDelta(trend.executionDelta, " pp"), "first block → latest"],
      ["RATING TREND", formatSignedDelta(trend.ratingDelta), "average AAR rating"],
      ["PROTEIN TREND", formatSignedDelta(trend.proteinDelta, " g"), "first block → latest"],
      ["CONSISTENCY", `${trend.consistency}%`, "days logged across blocks"],
      ["AARs", String(trend.totalAars), "reviews captured"],
      ["LIFT LOGS", String(trend.totalLifts), "strength entries"]
    ];
    metrics.forEach(([label, value, note]) => {
      const card = document.createElement("div");
      card.className = "operation-analysis-metric";
      card.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small>`;
      grid.appendChild(card);
    });
    elements.operationTrendSummary.appendChild(grid);

    if (trend.blocks.length > 1) {
      const trendRows = document.createElement("div");
      trendRows.className = "operation-block-trend-bars";
      trend.blocks.forEach((block, idx) => {
        const row = document.createElement("div");
        row.className = "operation-trend-row";
        row.innerHTML = `
          <span>B${idx + 1}</span>
          <div class="operation-trend-track"><i style="width:${Math.max(2, Math.min(100, block.execution))}%"></i></div>
          <strong>${block.execution}%</strong>
        `;
        trendRows.appendChild(row);
      });
      elements.operationTrendSummary.appendChild(trendRows);
    }
  }

  function getOperationCycleRecord(cycleIndex) {
    return state.operations.cycles.find((cycle) => cycle.cycleIndex === cycleIndex) || null;
  }

  function generateBlockSummary(cycleIndex, previousCycleIndex = null) {
    const stats = cycleStats(cycleIndex);
    const aars = cycleAarCount(cycleIndex);
    const previous = Number.isInteger(previousCycleIndex) ? cycleStats(previousCycleIndex) : null;
    const executionTrend = previous ? stats.execution - previous.execution : null;
    const ratingTrend = previous ? Math.round((stats.rating - previous.rating) * 10) / 10 : null;
    return [
      `${stats.records}/14 days logged with ${stats.execution}% average execution.`,
      `${aars} AARs captured; average rating ${stats.rating || "—"}/10.`,
      `${stats.protein} g average protein and ${stats.liftEntries} strength log entries.`,
      previous ? `Vs prior block: execution ${formatSignedDelta(executionTrend, " pp")}, rating ${formatSignedDelta(ratingTrend)}.` : "Baseline block for this Operation."
    ].join(" ");
  }

  function editBlockSummary(cycleIndex) {
    const cycle = getOperationCycleRecord(cycleIndex);
    if (!cycle) return;
    const defaultText = cycle.summary || generateBlockSummary(cycleIndex, cycleIndex - 1);
    const next = prompt("Block Commander Summary", defaultText);
    if (next === null) return;
    cycle.summary = next.trim();
    saveState();
    renderOperations();
  }

  function generateOperationSummary(operation) {
    const trend = operationTrendData(operation);
    const stats = operationStats(operation);
    const complete = (operation.objectives || []).filter((objective) => objective.completed).length;
    const total = (operation.objectives || []).length;
    return `${operation.name}: ${stats.cycleCount} blocks, ${stats.daysLogged} logged days, ${stats.execution}% average execution, ${stats.protein} g average protein. ` +
      `${trend.totalAars} AARs and ${trend.totalLifts} lift logs captured. ` +
      `Objectives completed: ${complete}/${total || 0}. ` +
      `Execution moved ${formatSignedDelta(trend.executionDelta, " pp")} from first to latest block.`;
  }

  function editOperationOverallSummary(operationId) {
    const operation = state.operations.items.find((item) => item.id === operationId);
    if (!operation) return;
    const next = prompt("Overall Operation Summary", operation.overallSummary || generateOperationSummary(operation));
    if (next === null) return;
    operation.overallSummary = next.trim();
    operation.updatedAt = new Date().toISOString();
    saveState();
    renderOperations();
  }

  function buildBlockDeepDive(cycleIndex, operation, blockNumber) {
    const stats = cycleStats(cycleIndex);
    const records = cycleRecords(cycleIndex);
    const bounds = getCycleBounds(cycleIndex);
    const detail = document.createElement("details");
    detail.className = "operation-block-detail";

    const aarCount = records.filter((day) => aarHasContent(day)).length;
    const summary = document.createElement("summary");
    summary.innerHTML = `
      <span class="block-summary-main">
        <small>BLOCK ${blockNumber} · ${escapeHtml(formatDisplayDate(bounds.start))} – ${escapeHtml(formatDisplayDate(bounds.end))}</small>
        <strong>${stats.execution}% execution</strong>
      </span>
      <span class="block-summary-stats">${records.length}/14 days · ${aarCount} AAR · ${stats.rating || "—"}/10</span>
    `;
    detail.appendChild(summary);

    const body = document.createElement("div");
    body.className = "operation-block-body";

    const metrics = document.createElement("div");
    metrics.className = "operation-metrics operation-block-metrics";
    metrics.innerHTML = `
      <span>${stats.protein} g avg protein</span>
      <span>${stats.liftEntries} lift logs</span>
      <span>${aarCount} AARs</span>
      <span>${stats.rating || "—"}/10 avg rating</span>
    `;
    body.appendChild(metrics);

    const cycleRecord = getOperationCycleRecord(cycleIndex);
    const commanderSummary = document.createElement("div");
    commanderSummary.className = "block-commander-summary";
    const autoSummary = generateBlockSummary(cycleIndex, blockNumber > 1 ? cycleIndex - 1 : null);
    commanderSummary.innerHTML = `
      <small>BLOCK SUMMARY</small>
      <p>${escapeHtml(cycleRecord?.summary || autoSummary)}</p>
    `;
    const editSummary = document.createElement("button");
    editSummary.type = "button";
    editSummary.className = "text-button";
    editSummary.textContent = cycleRecord?.summary ? "Edit block summary" : "Add commander note";
    editSummary.addEventListener("click", () => editBlockSummary(cycleIndex));
    commanderSummary.appendChild(editSummary);
    body.appendChild(commanderSummary);

    const aarList = document.createElement("div");
    aarList.className = "block-aar-list";

    if (!records.length) {
      aarList.innerHTML = `<p class="empty-state">No daily records were logged during this block.</p>`;
    } else {
      records.forEach((day) => {
        const completion = calculateCompletion(day);
        const hasAar = aarHasContent(day);
        const row = document.createElement("article");
        row.className = `block-aar-row${hasAar ? " has-aar" : ""}`;

        const top = document.createElement("div");
        top.className = "block-aar-top";
        const date = parseLocalDate(day.date);
        top.innerHTML = `
          <span><strong>${escapeHtml(date.toLocaleDateString(undefined, { month: "short", day: "numeric" }))}</strong><small>${completion.overall}% execution · ${Number(day.aar?.rating || 5)}/10</small></span>
          <span>${hasAar ? "AAR" : "NO AAR"}</span>
        `;
        row.appendChild(top);

        if (hasAar) {
          const review = document.createElement("div");
          review.className = "block-aar-copy";
          review.innerHTML = `
            <p><strong>Went well:</strong> ${escapeHtml(day.aar?.wentWell || "—")}</p>
            <p><strong>Improve:</strong> ${escapeHtml(day.aar?.improve || "—")}</p>
            <p><strong>Lesson:</strong> ${escapeHtml(day.aar?.lesson || "—")}</p>
            <p><strong>Next priority:</strong> ${escapeHtml(day.aar?.priority || "—")}</p>
          `;
          row.appendChild(review);
        }

        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "text-button block-aar-edit";
        edit.textContent = hasAar ? "Edit AAR" : "Add AAR";
        edit.addEventListener("click", () => openArchivedAarEditor(day.date));
        row.appendChild(edit);
        aarList.appendChild(row);
      });
    }

    body.appendChild(aarList);
    detail.appendChild(body);
    return detail;
  }

  function renderOperations() {
    if (!elements.currentOperationCard || !elements.operationCycleStrip || !elements.operationsList) return;
    syncOperationCycles();
    const currentIndex = Math.max(0, getCycleIndexForDate(new Date()));
    const current = operationForCycle(currentIndex);
    const planned = getPlannedOperation();

    elements.currentOperationCard.replaceChildren();
    if (current) {
      const stats = operationStats(current);
      const bounds = getCycleBounds(currentIndex);
      const wrapper = document.createElement("div");
      wrapper.innerHTML = `
        <div class="operation-status-row">
          <span class="operation-status">ACTIVE OPERATION</span>
          <span>Block ${currentIndex - current.startCycleIndex + 1}</span>
        </div>
        <h4>${escapeHtml(current.name)}</h4>
        <div class="operation-intent-mission">
          <div><small>COMMANDER'S INTENT</small><p>${escapeHtml(current.intent || "Not set yet")}</p></div>
          <div><small>MISSION</small><p>${escapeHtml(current.mission || "Not set yet")}</p></div>
        </div>
        <p class="helper-text">Current 14-day block: ${escapeHtml(formatDisplayDate(bounds.start))} – ${escapeHtml(formatDisplayDate(bounds.end))}</p>
        <div class="operation-metrics">
          <span>${stats.cycleCount} blocks</span>
          <span>${stats.daysLogged} days logged</span>
          <span>${stats.execution}% execution</span>
          <span>${stats.protein} g avg protein</span>
        </div>
      `;
      const objectives = document.createElement("div");
      objectives.className = "operation-objectives";
      objectives.innerHTML = `<div class="operation-objectives-heading"><small>OBJECTIVES</small><strong>${(current.objectives || []).filter((objective) => objective.completed).length}/${(current.objectives || []).length} COMPLETE</strong></div>`;
      if (!(current.objectives || []).length) {
        objectives.innerHTML += `<p class="helper-text">No objectives set. Use Edit operation to add measurable objectives.</p>`;
      } else {
        current.objectives.forEach((objective) => {
          const label = document.createElement("label");
          label.className = `operation-objective${objective.completed ? " complete" : ""}`;
          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = Boolean(objective.completed);
          input.addEventListener("change", () => toggleOperationObjective(current.id, objective.id));
          const copy = document.createElement("span");
          copy.innerHTML = `<strong>${escapeHtml(objective.text)}</strong>${objective.completedAt ? `<small>Victory · ${escapeHtml(formatShortDate(objective.completedAt))}</small>` : ""}`;
          label.append(input, copy);
          objectives.appendChild(label);
        });
      }
      wrapper.appendChild(objectives);

      const actions = document.createElement("div");
      actions.className = "button-row operation-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "button secondary";
      edit.textContent = "Edit operation";
      edit.addEventListener("click", () => openOperationDialog(current.id));
      const next = document.createElement("button");
      next.type = "button";
      next.className = "button primary";
      next.textContent = planned ? "Edit next operation" : "Plan next operation";
      next.addEventListener("click", () => openOperationDialog(planned?.id || null));
      actions.append(edit, next);
      wrapper.appendChild(actions);
      elements.currentOperationCard.appendChild(wrapper);
    } else {
      elements.currentOperationCard.innerHTML = `<p class="empty-state">No operation is assigned to the current 14-day block.</p>`;
    }

    if (planned) {
      const bounds = getCycleBounds(planned.startCycleIndex);
      const plannedCard = document.createElement("div");
      plannedCard.className = "planned-operation-note";
      plannedCard.innerHTML = `<strong>NEXT: ${escapeHtml(planned.name)}</strong><span>Begins ${escapeHtml(formatDisplayDate(bounds.start))}</span>`;
      elements.currentOperationCard.appendChild(plannedCard);
    }

    renderOperationTrendSummary(current);

    // Current Operation block deep dive.
    elements.operationCycleStrip.replaceChildren();
    if (current) {
      const indexes = operationCycleIndexes(current);
      indexes.forEach((cycleIndex, offset) => {
        elements.operationCycleStrip.appendChild(buildBlockDeepDive(cycleIndex, current, offset + 1));
      });
    } else {
      elements.operationCycleStrip.innerHTML = `<p class="empty-state">Assign an Operation to begin block analysis.</p>`;
    }

    // Operation archive with nested block analysis.
    elements.operationsList.replaceChildren();
    [...state.operations.items]
      .sort((a, b) => b.startCycleIndex - a.startCycleIndex)
      .forEach((operation) => {
        const stats = operationStats(operation);
        const trend = operationTrendData(operation);
        const startDate = getCycleBounds(operation.startCycleIndex).start;
        const endIndex = operation.endCycleIndex === null ? currentIndex : operation.endCycleIndex;
        const endDate = getCycleBounds(Math.max(operation.startCycleIndex, endIndex)).end;

        const item = document.createElement("details");
        item.className = "operation-history-item";
        if (current?.id === operation.id) item.open = true;

        const status = operation.status === "planned"
          ? "PLANNED"
          : operation.status === "complete"
            ? "COMPLETE"
            : "ACTIVE";

        const summary = document.createElement("summary");
        summary.innerHTML = `
          <span>
            <small>${status}</small>
            <strong>${escapeHtml(operation.name)}</strong>
          </span>
          <span>${stats.cycleCount} blocks · ${stats.execution}%</span>
        `;
        item.appendChild(summary);

        const body = document.createElement("div");
        body.className = "operation-history-body";
        body.innerHTML = `
          <p>${escapeHtml(formatDisplayDate(startDate))} – ${escapeHtml(formatDisplayDate(endDate))}</p>
          <div class="operation-intent-mission compact">
            <div><small>INTENT</small><p>${escapeHtml(operation.intent || "—")}</p></div>
            <div><small>MISSION</small><p>${escapeHtml(operation.mission || "—")}</p></div>
          </div>
          <div class="operation-metrics">
            <span>${stats.daysLogged} days</span>
            <span>${stats.execution}% execution</span>
            <span>${stats.protein} g avg protein</span>
            <span>${trend.totalAars} AARs</span>
          </div>
          <div class="operation-history-trend">
            <span>Execution ${escapeHtml(formatSignedDelta(trend.executionDelta, " pp"))}</span>
            <span>Rating ${escapeHtml(formatSignedDelta(trend.ratingDelta))}</span>
            <span>Consistency ${trend.consistency}%</span>
            <span>${trend.totalLifts} lift logs</span>
          </div>
        `;

        if (operation.status === "complete") {
          const overall = document.createElement("div");
          overall.className = "operation-overall-summary";
          overall.innerHTML = `<small>FINAL OPERATION SUMMARY</small><p>${escapeHtml(operation.overallSummary || generateOperationSummary(operation))}</p>`;
          const editOverall = document.createElement("button");
          editOverall.type = "button";
          editOverall.className = "text-button";
          editOverall.textContent = operation.overallSummary ? "Edit final summary" : "Add commander summary";
          editOverall.addEventListener("click", () => editOperationOverallSummary(operation.id));
          overall.appendChild(editOverall);
          body.appendChild(overall);
        }

        const blocksHeading = document.createElement("h5");
        blocksHeading.className = "operation-blocks-heading";
        blocksHeading.textContent = "14-DAY BLOCKS";
        body.appendChild(blocksHeading);

        const blocks = document.createElement("div");
        blocks.className = "operation-history-blocks";
        operationCycleIndexes(operation).forEach((cycleIndex, offset) => {
          blocks.appendChild(buildBlockDeepDive(cycleIndex, operation, offset + 1));
        });
        if (!blocks.children.length) {
          blocks.innerHTML = `<p class="empty-state">This Operation has not begun yet.</p>`;
        }
        body.appendChild(blocks);

        item.appendChild(body);
        elements.operationsList.appendChild(item);
      });

    renderOperationsYearTimeline();
    initializeCollapsibleSections();
  }

  function operationDateRange(operation) {
    const currentIndex = Math.max(0, getCycleIndexForDate(new Date()));
    const start = getCycleBounds(operation.startCycleIndex).start;
    const endIndex = operation.endCycleIndex === null ? currentIndex : operation.endCycleIndex;
    const end = getCycleBounds(Math.max(operation.startCycleIndex, endIndex)).end;
    return { start, end };
  }

  function renderOperationsYearTimeline() {
    if (!elements.operationsYearSelect || !elements.operationsYearTimeline) return;
    const years = new Set([new Date().getFullYear()]);
    state.operations.items.forEach((operation) => {
      const range = operationDateRange(operation);
      years.add(range.start.getFullYear());
      years.add(range.end.getFullYear());
      (operation.objectives || []).forEach((objective) => {
        if (objective.completedAt) years.add(new Date(objective.completedAt).getFullYear());
      });
    });
    const sortedYears = [...years].sort((a, b) => b - a);
    const previous = Number(elements.operationsYearSelect.value) || new Date().getFullYear();
    elements.operationsYearSelect.replaceChildren();
    sortedYears.forEach((year) => {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      elements.operationsYearSelect.appendChild(option);
    });
    elements.operationsYearSelect.value = sortedYears.includes(previous) ? String(previous) : String(sortedYears[0]);
    const year = Number(elements.operationsYearSelect.value);

    const yearStart = new Date(year, 0, 1, 12);
    const yearEnd = new Date(year, 11, 31, 12);
    const yearDays = Math.max(1, Math.round((yearEnd - yearStart) / 86400000) + 1);
    const pos = (date) => clamp(Math.round(((date - yearStart) / 86400000) / yearDays * 100), 0, 100);

    elements.operationsYearTimeline.replaceChildren();
    const months = document.createElement("div");
    months.className = "timeline-months";
    ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"].forEach((month) => {
      const span = document.createElement("span");
      span.textContent = month;
      months.appendChild(span);
    });
    elements.operationsYearTimeline.appendChild(months);

    const track = document.createElement("div");
    track.className = "year-timeline-track";

    state.operations.items.forEach((operation) => {
      const range = operationDateRange(operation);
      if (range.end < yearStart || range.start > yearEnd) return;
      const start = range.start < yearStart ? yearStart : range.start;
      const end = range.end > yearEnd ? yearEnd : range.end;
      const bar = document.createElement("button");
      bar.type = "button";
      bar.className = "timeline-operation-bar";
      bar.style.left = `${pos(start)}%`;
      bar.style.width = `${Math.max(3, pos(end) - pos(start) + 1)}%`;
      bar.textContent = operation.name.replace(/^Operation\\s+/i, "");
      bar.title = `${operation.name}: ${formatDisplayDate(range.start)} – ${formatDisplayDate(range.end)}`;
      bar.addEventListener("click", () => openOperationDialog(operation.id));
      track.appendChild(bar);

      (operation.objectives || []).filter((objective) => objective.completed && objective.completedAt).forEach((objective) => {
        const date = new Date(objective.completedAt);
        if (date.getFullYear() !== year) return;
        const flag = document.createElement("button");
        flag.type = "button";
        flag.className = "timeline-victory-flag";
        flag.style.left = `${pos(date)}%`;
        flag.textContent = "⚑";
        flag.title = `${objective.text} · ${formatDisplayDate(date)}`;
        flag.setAttribute("aria-label", `Victory milestone: ${objective.text}`);
        track.appendChild(flag);
      });
    });

    elements.operationsYearTimeline.appendChild(track);

    const milestones = document.createElement("div");
    milestones.className = "timeline-milestones";
    const wins = [];
    state.operations.items.forEach((operation) => {
      (operation.objectives || []).forEach((objective) => {
        if (!objective.completedAt) return;
        const date = new Date(objective.completedAt);
        if (date.getFullYear() === year) wins.push({ operation, objective, date });
      });
    });
    wins.sort((a, b) => a.date - b.date).forEach(({ operation, objective, date }) => {
      const row = document.createElement("div");
      row.innerHTML = `<span>⚑</span><div><strong>${escapeHtml(objective.text)}</strong><small>${escapeHtml(operation.name)} · ${escapeHtml(formatDisplayDate(date))}</small></div>`;
      milestones.appendChild(row);
    });
    if (!wins.length) milestones.innerHTML = `<p class="empty-state">Complete Operation objectives to place victory flags on the yearly timeline.</p>`;
    elements.operationsYearTimeline.appendChild(milestones);
  }

  function formatDisplayDate(date) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function openOperationDialog(operationId = null) {
    syncOperationCycles();
    const currentIndex = Math.max(0, getCycleIndexForDate(new Date()));
    const existing = operationId ? state.operations.items.find((operation) => operation.id === operationId) : null;
    editingOperationId = existing?.id || null;
    elements.operationDialogStatus.textContent = "";

    if (existing) {
      elements.operationDialogTitle.textContent = existing.status === "planned" ? "Edit next operation" : "Edit operation";
      elements.operationName.value = existing.name;
      elements.operationIntent.value = existing.intent || "";
      elements.operationMission.value = existing.mission || "";
      elements.operationObjectives.value = (existing.objectives || []).map((objective) => objective.text).join("\n");
      const bounds = getCycleBounds(existing.startCycleIndex);
      elements.operationTimingNote.textContent = `${existing.status === "planned" ? "Begins" : "Started"} ${formatDisplayDate(bounds.start)}. Existing daily data is not changed.`;
    } else {
      const planned = getPlannedOperation();
      if (planned) {
        openOperationDialog(planned.id);
        return;
      }
      const current = operationForCycle(currentIndex);
      const startIndex = current ? currentIndex + 1 : currentIndex;
      const bounds = getCycleBounds(startIndex);
      elements.operationDialogTitle.textContent = "Plan next operation";
      elements.operationName.value = "";
      elements.operationIntent.value = "";
      elements.operationMission.value = "";
      elements.operationObjectives.value = "";
      elements.operationTimingNote.textContent = current
        ? `The current operation keeps this 14-day block. The new operation begins ${formatDisplayDate(bounds.start)} and receives future 14-day blocks until you plan another.`
        : `This operation begins ${formatDisplayDate(bounds.start)}.`;
    }
    elements.operationDialog.showModal();
    setTimeout(() => elements.operationName.focus(), 0);
  }

  function mergeOperationObjectives(existingObjectives, objectiveText) {
    const existing = Array.isArray(existingObjectives) ? existingObjectives : [];
    const byText = new Map(existing.map((objective) => [String(objective.text || "").trim().toLowerCase(), objective]));
    return String(objectiveText || "")
      .split(/\n+/)
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => {
        const old = byText.get(text.toLowerCase());
        return old ? { ...old, text } : {
          id: `obj-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          text,
          completed: false,
          completedAt: null
        };
      });
  }

  function toggleOperationObjective(operationId, objectiveId) {
    const operation = state.operations.items.find((item) => item.id === operationId);
    const objective = operation?.objectives?.find((item) => item.id === objectiveId);
    if (!objective) return;
    objective.completed = !objective.completed;
    objective.completedAt = objective.completed ? new Date().toISOString() : null;
    operation.updatedAt = new Date().toISOString();
    saveState();
    renderOperations();
    renderIntel();
  }

  function saveOperation(event) {
    event.preventDefault();
    const name = elements.operationName.value.trim();
    if (!name) {
      elements.operationDialogStatus.textContent = "Enter an operation name.";
      return;
    }
    const currentIndex = Math.max(0, getCycleIndexForDate(new Date()));
    const existing = editingOperationId ? state.operations.items.find((operation) => operation.id === editingOperationId) : null;

    if (existing) {
      existing.name = name;
      existing.intent = elements.operationIntent.value.trim();
      existing.mission = elements.operationMission.value.trim();
      existing.objectives = mergeOperationObjectives(existing.objectives, elements.operationObjectives.value);
      existing.updatedAt = new Date().toISOString();
    } else {
      const current = operationForCycle(currentIndex);
      const startCycleIndex = current ? currentIndex + 1 : currentIndex;
      if (current && (current.endCycleIndex === null || current.endCycleIndex > currentIndex)) {
        current.endCycleIndex = currentIndex;
        current.status = "active";
        current.updatedAt = new Date().toISOString();
      }
      const operation = {
        id: `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        intent: elements.operationIntent.value.trim(),
        mission: elements.operationMission.value.trim(),
        objectives: mergeOperationObjectives([], elements.operationObjectives.value),
        overallSummary: "",
        startCycleIndex,
        endCycleIndex: null,
        status: startCycleIndex > currentIndex ? "planned" : "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.operations.items.push(operation);
      if (operation.status === "active") state.operations.activeOperationId = operation.id;
    }

    syncOperationCycles();
    saveState();
    elements.operationDialog.close();
    editingOperationId = null;
    renderOperations();
    if (activeView === "history") renderHistory();
  }

  function renderHistory() {
    syncOperationCycles();
    renderOperations();
    renderArchiveCalendar();
    const exercises = Object.keys(state.exerciseLogs || {}).filter((name) => Array.isArray(state.exerciseLogs[name]) && state.exerciseLogs[name].length).sort();
    const previous = state.settings.progressExercise || elements.progressExerciseSelect.value;
    elements.progressExerciseSelect.replaceChildren();
    if (!exercises.length) {
      const option = document.createElement("option");
      option.value = ""; option.textContent = "No exercises logged";
      elements.progressExerciseSelect.appendChild(option);
      elements.progressExerciseSelect.disabled = true;
    } else {
      elements.progressExerciseSelect.disabled = false;
      exercises.forEach((name) => {
        const option = document.createElement("option");
        option.value = name; option.textContent = name;
        elements.progressExerciseSelect.appendChild(option);
      });
      elements.progressExerciseSelect.value = exercises.includes(previous) ? previous : exercises[0];
      state.settings.progressExercise = elements.progressExerciseSelect.value;
    }
    renderProgressDomains();
    renderProgressChart();

    const records = Object.values(state.daily)
      .filter(hasMeaningfulData)
      .sort((a, b) => b.date.localeCompare(a.date));

    elements.historyDaysLogged.textContent = String(records.length);

    const average = records.length
      ? Math.round(records.reduce((sum, day) => sum + calculateCompletion(day).overall, 0) / records.length)
      : 0;
    elements.historyAverage.textContent = `${average}%`;

    const proteinAverage = records.length
      ? Math.round(records.reduce((sum, day) => sum + (Number(day.protein) || 0), 0) / records.length)
      : 0;
    elements.historyProteinAverage.textContent = `${proteinAverage} g`;

    elements.historyList.replaceChildren();
    elements.emptyHistory.hidden = records.length > 0;

    records.forEach((day) => {
      const completion = calculateCompletion(day);
      const item = document.createElement("article");
      item.className = "history-item";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.setAttribute("aria-expanded", "false");

      const top = document.createElement("div");
      top.className = "history-top";

      const dateBlock = document.createElement("div");
      const date = new Date(`${day.date}T12:00:00`);
      const strongDate = document.createElement("strong");
      strongDate.textContent = date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });
      const sub = document.createElement("p");
      sub.className = "helper-text";
      sub.textContent = `${day.protein || 0} g protein · Rating ${day.aar?.rating || 5}/10`;

      const archiveContext = operationContextForDateKey(day.date);
      const operationTag = document.createElement("span");
      operationTag.className = "history-operation-tag";
      operationTag.textContent = archiveContext.operation?.name
        ? `${archiveContext.operation.name} · Day ${archiveContext.dayInCycle || "—"}/14`
        : `Unassigned operation · Day ${archiveContext.dayInCycle || "—"}/14`;

      dateBlock.append(strongDate, sub, operationTag);

      const score = document.createElement("span");
      score.className = "history-score";
      score.textContent = `${completion.overall}%`;

      top.append(dateBlock, score);
      toggle.appendChild(top);

      const details = document.createElement("div");
      details.className = "history-details";
      details.hidden = true;
      details.innerHTML = `
        <div><strong>Mind:</strong> ${completion.mind}%</div>
        <div><strong>Body:</strong> ${completion.body}%</div>
        <div><strong>Spirit:</strong> ${completion.spirit}%</div>
        <div><strong>Went well:</strong> ${escapeHtml(day.aar?.wentWell || "—")}</div>
        <div><strong>Improve:</strong> ${escapeHtml(day.aar?.improve || "—")}</div>
        <div><strong>Lesson:</strong> ${escapeHtml(day.aar?.lesson || "—")}</div>
        <div><strong>Tomorrow:</strong> ${escapeHtml(day.aar?.priority || "—")}</div>
      `;
      const historyActions = document.createElement("div");
      historyActions.className = "history-actions";
      historyActions.hidden = true;

      const editAarButton = document.createElement("button");
      editAarButton.type = "button";
      editAarButton.className = "button primary edit-aar-button history-action-button";
      editAarButton.textContent = aarHasContent(day) ? "Edit AAR" : "Add AAR";
      editAarButton.addEventListener("click", () => openArchivedAarEditor(day.date));

      const collapseButton = document.createElement("button");
      collapseButton.type = "button";
      collapseButton.className = "button secondary history-action-button";
      collapseButton.textContent = "Collapse";
      collapseButton.addEventListener("click", () => {
        details.hidden = true;
        historyActions.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
      });

      historyActions.append(editAarButton, collapseButton);

      toggle.addEventListener("click", () => {
        const open = details.hidden;
        details.hidden = !open;
        historyActions.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
      });

      item.append(toggle, details, historyActions);
      elements.historyList.appendChild(item);
    });
    initializeCollapsibleSections();
  }

  function renderProgressDomains() {
    const domains = ["Weightlifting", ...Object.keys(state.activityTrackers || {}).sort((a, b) => a.localeCompare(b))];
    if (!domains.includes(state.settings.archiveDomain)) state.settings.archiveDomain = "Weightlifting";
    elements.activityDomainTabs.replaceChildren();
    domains.forEach((name) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `activity-domain-button${state.settings.archiveDomain === name ? " active" : ""}`;
      button.textContent = name;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(state.settings.archiveDomain === name));
      button.addEventListener("click", () => {
        state.settings.archiveDomain = name;
        saveState();
        renderProgressDomains();
      });
      elements.activityDomainTabs.appendChild(button);
    });
    const weightlifting = state.settings.archiveDomain === "Weightlifting";
    elements.weightliftingProgressSection.hidden = !weightlifting;
    elements.activityProgressSection.hidden = weightlifting;
    if (!weightlifting) renderActivityProgress();
  }

  function openActivityTrackerDialog() {
    elements.activityTrackerName.value = "";
    elements.activityTrackerStatus.textContent = "";
    elements.activityTrackerDialog.showModal();
    setTimeout(() => elements.activityTrackerName.focus(), 0);
  }

  function inferActivityMetrics(name) {
    const normalized = String(name || "").trim().toLowerCase();
    const match = Object.entries(ACTIVITY_METRIC_PRESETS).find(([preset]) => {
      const p = preset.toLowerCase();
      return normalized === p || normalized.includes(p) || p.includes(normalized);
    });
    return structuredCloneSafe(match?.[1] || [
      { name: "Sessions", unit: "sessions" },
      { name: "Training time", unit: "min" },
      { name: "Performance", unit: "/10" }
    ]);
  }

  function parseTrackerMetrics(text, fallbackName) {
    const parsed = String(text || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, unit = ""] = line.split("|").map((part) => part.trim());
        return { name, unit };
      })
      .filter((metric) => metric.name);
    return parsed.length ? parsed : inferActivityMetrics(fallbackName);
  }

  function saveActivityTracker(event) {
    event.preventDefault();
    const name = elements.activityTrackerName.value.trim();
    if (!name) return;
    if (name.toLowerCase() === "weightlifting" || Object.keys(state.activityTrackers).some((key) => key.toLowerCase() === name.toLowerCase())) {
      elements.activityTrackerStatus.textContent = "That progress folder already exists.";
      return;
    }
    state.activityTrackers[name] = {
      name,
      entries: [],
      metrics: parseTrackerMetrics(elements.activityTrackerMetrics.value, name)
    };
    state.settings.archiveDomain = name;
    saveState();
    elements.activityTrackerDialog.close();
    renderHistory();
  }

  function openActivityEntryDialog() {
    const domain = state.settings.archiveDomain;
    if (!domain || domain === "Weightlifting") return;
    const tracker = state.activityTrackers?.[domain];
    elements.activityEntryDomain.textContent = domain;
    elements.activityEntryDate.value = getTodayKey();
    elements.activityEntryMetric.value = elements.activityMetricSelect.value || "";
    elements.activityEntryValue.value = "";
    elements.activityEntryUnit.value = "";
    elements.activityEntryNote.value = "";
    elements.activityEntryStatus.textContent = "";
    elements.activityMetricSuggestions.replaceChildren();

    const metrics = Array.isArray(tracker?.metrics) && tracker.metrics.length ? tracker.metrics : inferActivityMetrics(domain);
    metrics.forEach((metric) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "metric-suggestion";
      button.textContent = metric.name;
      button.addEventListener("click", () => {
        elements.activityEntryMetric.value = metric.name;
        elements.activityEntryUnit.value = metric.unit || "";
      });
      elements.activityMetricSuggestions.appendChild(button);
    });

    const selectedMetric = metrics.find((metric) => metric.name === elements.activityEntryMetric.value);
    if (selectedMetric) elements.activityEntryUnit.value = selectedMetric.unit || "";
    elements.activityEntryDialog.showModal();
  }

  function saveActivityEntry(event) {
    event.preventDefault();
    const domain = state.settings.archiveDomain;
    const tracker = state.activityTrackers?.[domain];
    if (!tracker) return;
    const dateKey = elements.activityEntryDate.value;
    const metric = elements.activityEntryMetric.value.trim();
    const value = Number(elements.activityEntryValue.value);
    if (!dateKey || !metric || !Number.isFinite(value)) {
      elements.activityEntryStatus.textContent = "Enter a date, metric, and numeric value.";
      return;
    }
    tracker.entries.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: new Date(`${dateKey}T12:00:00`).toISOString(),
      metric,
      value,
      unit: elements.activityEntryUnit.value.trim(),
      note: elements.activityEntryNote.value.trim()
    });
    saveState();
    elements.activityEntryDialog.close();
    renderHistory();
    elements.activityMetricSelect.value = metric;
    renderActivityProgress();
  }

  function renderActivityProgress() {
    const domain = state.settings.archiveDomain;
    if (!domain || domain === "Weightlifting") return;
    const tracker = state.activityTrackers?.[domain] || { entries: [] };
    elements.activityProgressHeading.textContent = `${domain} progress`;
    const metrics = [...new Set(tracker.entries.map((entry) => entry.metric).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const previous = elements.activityMetricSelect.value;
    elements.activityMetricSelect.replaceChildren();
    if (!metrics.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No metrics logged";
      elements.activityMetricSelect.appendChild(option);
      elements.activityMetricSelect.disabled = true;
    } else {
      elements.activityMetricSelect.disabled = false;
      metrics.forEach((metric) => {
        const option = document.createElement("option");
        option.value = metric;
        option.textContent = metric;
        elements.activityMetricSelect.appendChild(option);
      });
      elements.activityMetricSelect.value = metrics.includes(previous) ? previous : metrics[0];
    }
    const metric = elements.activityMetricSelect.value;
    const logs = tracker.entries.filter((entry) => entry.metric === metric).sort((a, b) => a.date.localeCompare(b.date));
    elements.activityProgressEmpty.hidden = logs.length > 0;
    elements.activityProgressChart.hidden = logs.length === 0;
    elements.activityProgressLogList.replaceChildren();
    [...logs].reverse().slice(0, 10).forEach((log) => {
      const row = document.createElement("div");
      row.className = "progress-log-row";
      row.innerHTML = `<span>${escapeHtml(formatShortDate(log.date))}</span><strong>${escapeHtml(String(log.value))}${log.unit ? ` ${escapeHtml(log.unit)}` : ""}</strong><small>${log.note ? escapeHtml(log.note) : escapeHtml(log.metric)}</small>`;
      elements.activityProgressLogList.appendChild(row);
    });
    if (logs.length) drawActivityChart(logs);
  }

  function drawActivityChart(logs) {
    const canvas = elements.activityProgressChart;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.floor(rect.width || 720));
    const height = Math.max(220, Math.floor(rect.height || 360));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const pad = { left: 48, right: 18, top: 24, bottom: 38 };
    const values = logs.map((log) => Number(log.value) || 0);
    let min = Math.min(...values), max = Math.max(...values);
    if (min === max) { min -= Math.max(1, Math.abs(min) * .05); max += Math.max(1, Math.abs(max) * .05); }
    const range = max - min || 1;
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.strokeStyle = "rgba(150,150,165,.28)";
    ctx.fillStyle = "#9696a5";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + ((height - pad.top - pad.bottom) * i / 4);
      const value = max - range * i / 4;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
      ctx.fillText(`${Math.round(value * 100) / 100}`, 4, y + 4);
    }
    const xFor = (i) => logs.length === 1 ? (pad.left + width - pad.right) / 2 : pad.left + (width - pad.left - pad.right) * i / (logs.length - 1);
    const yFor = (value) => pad.top + (height - pad.top - pad.bottom) * (max - value) / range;
    ctx.strokeStyle = "#f34f58";
    ctx.lineWidth = 3;
    ctx.beginPath();
    logs.forEach((log, i) => { const x = xFor(i), y = yFor(Number(log.value) || 0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    ctx.fillStyle = "#f34f58";
    logs.forEach((log, i) => { const x = xFor(i), y = yFor(Number(log.value) || 0); ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "#9696a5";
    const first = formatShortDate(logs[0].date), last = formatShortDate(logs[logs.length - 1].date);
    ctx.fillText(first, pad.left, height - 12);
    ctx.fillText(last, width - pad.right - ctx.measureText(last).width, height - 12);
  }

  function aarHasContent(day) {
    const aar = day?.aar;
    if (!aar || typeof aar !== "object") return false;
    return Boolean(
      aar.savedAt ||
      String(aar.wentWell || "").trim() ||
      String(aar.improve || "").trim() ||
      String(aar.lesson || "").trim() ||
      String(aar.priority || "").trim()
    );
  }

  function operationContextForDateKey(dateKey) {
    const date = parseLocalDate(dateKey);
    const cycleIndex = getCycleIndexForDate(date);
    const operation = cycleIndex >= 0 ? operationForCycle(cycleIndex) : null;
    const bounds = cycleIndex >= 0 ? getCycleBounds(cycleIndex) : null;
    const dayInCycle = cycleIndex >= 0 && bounds
      ? Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
          Date.UTC(bounds.start.getFullYear(), bounds.start.getMonth(), bounds.start.getDate())) / 86400000) + 1
      : null;
    return { cycleIndex, operation, bounds, dayInCycle };
  }

  function renderArchiveCalendar() {
    if (!elements.archiveCalendarGrid || !elements.archiveCalendarMonth) return;

    const year = archiveCalendarCursor.getFullYear();
    const month = archiveCalendarCursor.getMonth();
    const first = new Date(year, month, 1, 12);
    const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
    const firstWeekday = first.getDay();
    const todayKey = getTodayKey();

    elements.archiveCalendarMonth.textContent = first.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    });
    elements.archiveCalendarGrid.replaceChildren();

    for (let i = 0; i < firstWeekday; i += 1) {
      const spacer = document.createElement("span");
      spacer.className = "calendar-day-spacer";
      spacer.setAttribute("aria-hidden", "true");
      elements.archiveCalendarGrid.appendChild(spacer);
    }

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const date = new Date(year, month, dayNumber, 12);
      const dateKey = formatDateKey(date);
      const record = state.daily?.[dateKey];
      const meaningful = Boolean(record && hasMeaningfulData(record));
      const hasAar = aarHasContent(record);
      const context = operationContextForDateKey(dateKey);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-day";
      button.dataset.date = dateKey;
      button.setAttribute("role", "gridcell");

      if (dateKey === todayKey) button.classList.add("is-today");
      if (meaningful) button.classList.add("has-day");
      if (hasAar) button.classList.add("has-aar");

      const dayLabel = document.createElement("span");
      dayLabel.className = "calendar-day-number";
      dayLabel.textContent = String(dayNumber);

      const meta = document.createElement("span");
      meta.className = "calendar-day-meta";
      if (hasAar) {
        meta.textContent = "AAR";
      } else if (meaningful) {
        meta.textContent = "LOG";
      } else if (context.dayInCycle) {
        meta.textContent = `D${context.dayInCycle}`;
      } else {
        meta.textContent = "";
      }

      const op = document.createElement("span");
      op.className = "calendar-day-operation";
      op.textContent = context.operation?.name
        ? context.operation.name.replace(/^Operation\s+/i, "").slice(0, 8)
        : "";

      button.append(dayLabel, meta, op);
      button.setAttribute(
        "aria-label",
        `${date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}. ` +
        `${hasAar ? "AAR saved. " : meaningful ? "Day logged. " : "No AAR yet. "}` +
        `${context.operation?.name ? context.operation.name + ". " : ""}Tap to edit.`
      );
      button.addEventListener("click", () => openArchivedAarEditor(dateKey));
      elements.archiveCalendarGrid.appendChild(button);
    }
  }

  function openArchivedAarEditor(dateKey) {
    if (!state.daily[dateKey]) {
      state.daily[dateKey] = createDailyRecord(dateKey);
    }
    const day = state.daily[dateKey];
    if (!day.aar || typeof day.aar !== "object") {
      day.aar = { wentWell: "", improve: "", lesson: "", priority: "", rating: 5, savedAt: null };
    }
    editingAarDateKey = dateKey;
    const date = new Date(`${dateKey}T12:00:00`);
    const hasExistingAar = aarHasContent(day);
    const context = operationContextForDateKey(dateKey);
    elements.editAarTitle.textContent = hasExistingAar ? "Edit archived AAR" : "Add archived AAR";
    elements.editAarDate.textContent = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const operationName = context.operation?.name || "No operation assigned";
    const blockNumber = context.operation && context.cycleIndex >= context.operation.startCycleIndex
      ? context.cycleIndex - context.operation.startCycleIndex + 1
      : null;
    elements.editAarOperationContext.textContent =
      `${operationName}` +
      `${blockNumber ? ` · Block ${blockNumber}` : ""}` +
      `${context.dayInCycle ? ` · Day ${context.dayInCycle}/14` : ""}`;
    elements.editAarWentWell.value = day.aar?.wentWell || "";
    elements.editAarImprove.value = day.aar?.improve || "";
    elements.editAarLesson.value = day.aar?.lesson || "";
    elements.editAarPriority.value = day.aar?.priority || "";
    elements.editAarRating.value = String(day.aar?.rating || 5);
    elements.editAarStatus.textContent = "";
    elements.editAarDialog.showModal();
  }

  function saveArchivedAar(event) {
    event.preventDefault();
    const day = editingAarDateKey ? state.daily?.[editingAarDateKey] : null;
    if (!day) return;
    const rating = Math.max(1, Math.min(10, Number(elements.editAarRating.value) || 5));
    day.aar = {
      ...day.aar,
      wentWell: elements.editAarWentWell.value.trim(),
      improve: elements.editAarImprove.value.trim(),
      lesson: elements.editAarLesson.value.trim(),
      priority: elements.editAarPriority.value.trim(),
      rating,
      savedAt: new Date().toISOString()
    };
    day.updatedAt = new Date().toISOString();
    saveState();
    elements.editAarDialog.close();
    editingAarDateKey = null;
    renderHistory();
    renderOperations();
  }

  function renderSettings() {
    elements.proteinGoalInput.value = String(normalizeProteinGoal(state.settings.proteinGoal));
    renderTemplateEditor("mind", state.settings.mindTemplates, elements.mindTemplateEditor);
    renderTemplateEditor("spirit", state.settings.spiritTemplates, elements.spiritTemplateEditor);
  }

  function renderTemplateEditor(category, templates, container) {
    container.replaceChildren();

    const heading = document.createElement("p");
    heading.className = "category-kicker";
    heading.textContent = category.toUpperCase();
    container.appendChild(heading);

    templates.forEach((text, index) => {
      const row = document.createElement("div");
      row.className = "template-row";

      const input = document.createElement("input");
      input.type = "text";
      input.value = text;
      input.maxLength = 120;
      input.setAttribute("aria-label", `${category} task template ${index + 1}`);
      input.addEventListener("change", () => {
        const value = input.value.trim();
        if (value) {
          templates[index] = value;
          saveState();
        } else {
          input.value = templates[index];
        }
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${text} template`);
      remove.addEventListener("click", () => {
        if (!confirm(`Remove “${templates[index]}” from future days?`)) return;
        templates.splice(index, 1);
        saveAndRender();
      });

      row.append(input, remove);
      container.appendChild(row);
    });
  }

  function openQuoteEditor() {
    elements.quoteInput.value = state.quotes[getTodayKey()] || DEFAULT_QUOTE;
    elements.quoteEditor.hidden = false;
    elements.quoteInput.focus();
  }

  function closeQuoteEditor() {
    elements.quoteEditor.hidden = true;
  }

  function saveQuote() {
    const value = elements.quoteInput.value.trim();
    if (!value) {
      alert("Enter a quote before saving.");
      return;
    }
    state.quotes[getTodayKey()] = value;
    closeQuoteEditor();
    saveAndRender();
  }

  function openTaskDialog(category) {
    taskDialogCategory = category;
    elements.taskDialogTitle.textContent = `Add ${category} task`;
    elements.taskDialogInput.value = "";
    elements.taskDialog.showModal();
    setTimeout(() => elements.taskDialogInput.focus(), 0);
  }

  function handleTaskDialogSubmit(event) {
    event.preventDefault();
    const submitterValue = event.submitter?.value;
    if (submitterValue !== "save") {
      elements.taskDialog.close();
      return;
    }

    const text = elements.taskDialogInput.value.trim();
    if (!text) return;

    const day = getTodayRecord();
    const list = taskDialogCategory === "mind" ? day.mindTasks : day.spiritTasks;
    list.push(createTask(text));
    day.updatedAt = new Date().toISOString();

    elements.taskDialog.close();
    saveAndRender();
  }

  function openScheduleDialog(index) {
    scheduleDialogIndex = index;
    elements.scheduleDialogInput.replaceChildren();
    const current = state.settings.schedule[index];
    const names = Object.keys(getWorkoutLibrary());
    if (current && !names.includes(current)) names.push(current);
    names.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      option.selected = name === current;
      elements.scheduleDialogInput.appendChild(option);
    });
    elements.scheduleDialog.showModal();
    setTimeout(() => elements.scheduleDialogInput.focus(), 0);
  }

  function handleScheduleDialogSubmit(event) {
    event.preventDefault();
    const submitterValue = event.submitter?.value;
    if (submitterValue !== "save") {
      elements.scheduleDialog.close();
      return;
    }

    const value = elements.scheduleDialogInput.value.trim();
    if (!value) return;

    state.settings.schedule[scheduleDialogIndex] = value;
    elements.scheduleDialog.close();
    saveAndRender();
  }

  function setProtein(value, persist) {
    const day = getTodayRecord();
    const goal = normalizeProteinGoal(state.settings.proteinGoal);
    day.protein = clamp(Math.round(value / 5) * 5, 0, goal);
    day.updatedAt = new Date().toISOString();

    elements.proteinSlider.value = String(day.protein);
    elements.proteinValue.textContent = `${day.protein} / ${goal} g`;
    elements.proteinPercent.textContent = `${Math.round((day.protein / goal) * 100)}%`;

    const completion = calculateCompletion(day);
    elements.bodyPercent.textContent = `${completion.body}%`;
    elements.overallPercent.textContent = `${completion.overall}%`;
    elements.overallPercentHeader.textContent = `${completion.overall}%`;

    if (persist) saveState();
  }

  function populateAar(aar = {}) {
    elements.aarWentWell.value = aar.wentWell || "";
    elements.aarImprove.value = aar.improve || "";
    elements.aarLesson.value = aar.lesson || "";
    elements.aarPriority.value = aar.priority || "";
    elements.aarRating.value = String(aar.rating || 5);
    elements.aarRatingOutput.value = String(aar.rating || 5);
  }

  function saveAarDraft() {
    const day = getTodayRecord();
    day.aar = {
      ...day.aar,
      wentWell: elements.aarWentWell.value,
      improve: elements.aarImprove.value,
      lesson: elements.aarLesson.value,
      priority: elements.aarPriority.value,
      rating: Number(elements.aarRating.value)
    };
    day.updatedAt = new Date().toISOString();
    saveState();
  }

  function saveAar(event) {
    event.preventDefault();
    const day = getTodayRecord();

    day.aar = {
      wentWell: elements.aarWentWell.value.trim(),
      improve: elements.aarImprove.value.trim(),
      lesson: elements.aarLesson.value.trim(),
      priority: elements.aarPriority.value.trim(),
      rating: Number(elements.aarRating.value),
      savedAt: new Date().toISOString()
    };
    day.updatedAt = new Date().toISOString();

    saveState();
    elements.aarSavedStatus.textContent = "Saved";
    renderHistory();

    setTimeout(() => {
      if (elements.aarSavedStatus.textContent === "Saved") {
        elements.aarSavedStatus.textContent = "";
      }
    }, 2200);
  }

  function saveSettings() {
    const goal = normalizeProteinGoal(elements.proteinGoalInput.value);
    state.settings.proteinGoal = goal;

    const day = getTodayRecord();
    day.protein = clamp(day.protein, 0, goal);

    saveAndRender();
    elements.settingsSavedStatus.textContent = "Settings saved.";
    setTimeout(() => {
      elements.settingsSavedStatus.textContent = "";
    }, 2200);
  }

  function addTemplate(category) {
    const label = category === "mind" ? "mind" : "spirit";
    const value = prompt(`Enter a new ${label} task template:`);
    if (!value || !value.trim()) return;

    const templates = category === "mind"
      ? state.settings.mindTemplates
      : state.settings.spiritTemplates;
    templates.push(value.trim());
    saveAndRender();
  }

  function resetToday() {
    const key = getTodayKey();
    if (!confirm("Reset all of today’s checkboxes, protein, tasks, and AAR? This cannot be undone unless you exported a backup.")) {
      return;
    }
    state.daily[key] = createDailyRecord(key);
    saveAndRender();
    switchView("today");
  }

  function deleteAllData() {
    const first = confirm("Delete every stored Command Center record and setting from this browser?");
    if (!first) return;
    const second = confirm("This is permanent unless you exported a backup. Delete all data now?");
    if (!second) return;

    localStorage.removeItem(BACKUP_STORAGE_KEY);
    state = createInitialState();
    saveAndRender();
    switchView("today");
  }

  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: "My Command Center",
      data: state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `command-center-backup-${getTodayKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const incoming = parsed.data || parsed;

        if (!incoming || typeof incoming !== "object" || !incoming.settings || !incoming.daily) {
          throw new Error("This file is not a valid Command Center backup.");
        }

        if (!confirm("Import this backup? It will replace the data currently stored in this browser.")) {
          return;
        }

        state = incoming;
        ensureStateShape();
        saveAndRender();
        switchView("today");
        alert("Backup imported successfully.");
      } catch (error) {
        alert(error.message || "The backup could not be imported.");
      } finally {
        elements.importDataInput.value = "";
      }
    };
    reader.onerror = () => {
      alert("The selected file could not be read.");
      elements.importDataInput.value = "";
    };
    reader.readAsText(file);
  }

  function switchView(target) {
    activeView = target;

    document.querySelectorAll(".view").forEach((view) => {
      const active = view.dataset.view === target;
      view.hidden = !active;
      view.classList.toggle("active", active);
    });

    document.querySelectorAll(".nav-button").forEach((button) => {
      const active = button.dataset.target === target;
      button.classList.toggle("active", active);
      if (active) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    if (target === "history") renderHistory();
    if (target === "intel") renderIntel();
    if (target === "operations") renderOperations();
    if (target === "schedule") renderSchedule();
    if (target === "settings") renderSettings();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function calculateCycleDay(date) {
    const start = parseLocalDate(state.settings.cycleStartDate);
    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const targetUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const difference = Math.round((targetUtc - startUtc) / 86400000);
    return modulo(difference, 14) + 1;
  }

  function calculateCompletion(day) {
    const mind = percentageCompleted(day.mindTasks);
    const spirit = percentageCompleted(day.spiritTasks);

    const goal = normalizeProteinGoal(state.settings.proteinGoal);
    const proteinRatio = clamp((Number(day.protein) || 0) / goal, 0, 1);
    const workoutRatio = day.workoutComplete ? 1 : 0;
    const body = Math.round(((proteinRatio + workoutRatio) / 2) * 100);

    const overall = Math.round((mind + body + spirit) / 3);
    return { mind, body, spirit, overall };
  }

  function percentageCompleted(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) return 0;
    const complete = tasks.filter((task) => task.completed).length;
    return Math.round((complete / tasks.length) * 100);
  }

  function hasMeaningfulData(day) {
    const taskTouched = [...(day.mindTasks || []), ...(day.spiritTasks || [])]
      .some((task) => task.completed);
    const aarTouched = day.aar && (
      day.aar.savedAt ||
      day.aar.wentWell ||
      day.aar.improve ||
      day.aar.lesson ||
      day.aar.priority
    );
    return taskTouched || day.workoutComplete || Number(day.protein) > 0 || aarTouched;
  }

  function parseStoredState(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function mergeUniqueEntries(a = [], b = []) {
    const result = [];
    const seen = new Set();
    [...a, ...b].forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const key = entry.id || JSON.stringify([
        entry.date || "",
        entry.weight ?? "",
        entry.reps ?? "",
        entry.sets ?? "",
        entry.metric || "",
        entry.value ?? "",
        entry.note || ""
      ]);
      if (seen.has(key)) return;
      seen.add(key);
      result.push(structuredCloneSafe(entry));
    });
    return result;
  }

  function mergeAar(primary = {}, backup = {}) {
    const result = { ...backup, ...primary };
    ["wentWell", "improve", "lesson", "priority"].forEach((field) => {
      if (!String(primary?.[field] || "").trim() && String(backup?.[field] || "").trim()) {
        result[field] = backup[field];
      }
    });
    if (!primary?.savedAt && backup?.savedAt) result.savedAt = backup.savedAt;
    if ((!Number.isFinite(Number(primary?.rating)) || Number(primary?.rating) === 5) && Number.isFinite(Number(backup?.rating))) {
      result.rating = Number(backup.rating);
    }
    return result;
  }

  function mergeDailyRecord(primary, backup) {
    if (!primary) return structuredCloneSafe(backup);
    if (!backup) return structuredCloneSafe(primary);
    const result = { ...backup, ...primary };
    result.aar = mergeAar(primary.aar, backup.aar);

    ["mindTasks", "spiritTasks"].forEach((field) => {
      const p = Array.isArray(primary[field]) ? primary[field] : [];
      const b = Array.isArray(backup[field]) ? backup[field] : [];
      const byId = new Map();
      [...b, ...p].forEach((task) => {
        if (!task) return;
        const key = task.id || task.text;
        const existing = byId.get(key);
        byId.set(key, existing ? { ...existing, ...task } : structuredCloneSafe(task));
      });
      result[field] = [...byId.values()];
    });

    if ((Number(primary.protein) || 0) === 0 && (Number(backup.protein) || 0) > 0) result.protein = backup.protein;
    if (!primary.workoutComplete && backup.workoutComplete) result.workoutComplete = true;
    return result;
  }

  function mergeCommandCenterStates(primary, backup) {
    if (!primary) return backup ? structuredCloneSafe(backup) : null;
    if (!backup) return structuredCloneSafe(primary);

    const merged = structuredCloneSafe(primary);
    merged.settings = { ...(backup.settings || {}), ...(primary.settings || {}) };
    merged.daily = {};
    const dates = new Set([...Object.keys(backup.daily || {}), ...Object.keys(primary.daily || {})]);
    dates.forEach((dateKey) => {
      merged.daily[dateKey] = mergeDailyRecord(primary.daily?.[dateKey], backup.daily?.[dateKey]);
    });

    merged.quotes = { ...(backup.quotes || {}), ...(primary.quotes || {}) };
    merged.customWorkouts = { ...(backup.customWorkouts || {}), ...(primary.customWorkouts || {}) };

    merged.exerciseLogs = {};
    const exercises = new Set([...Object.keys(backup.exerciseLogs || {}), ...Object.keys(primary.exerciseLogs || {})]);
    exercises.forEach((name) => {
      merged.exerciseLogs[name] = mergeUniqueEntries(primary.exerciseLogs?.[name], backup.exerciseLogs?.[name]);
    });

    merged.activityTrackers = {};
    const trackers = new Set([...Object.keys(backup.activityTrackers || {}), ...Object.keys(primary.activityTrackers || {})]);
    trackers.forEach((name) => {
      const p = primary.activityTrackers?.[name] || {};
      const b = backup.activityTrackers?.[name] || {};
      merged.activityTrackers[name] = {
        ...b,
        ...p,
        name: p.name || b.name || name,
        metrics: Array.isArray(p.metrics) && p.metrics.length ? structuredCloneSafe(p.metrics) : structuredCloneSafe(b.metrics || []),
        entries: mergeUniqueEntries(p.entries, b.entries)
      };
    });

    const pOps = primary.operations || {};
    const bOps = backup.operations || {};
    const opMap = new Map();
    [...(bOps.items || []), ...(pOps.items || [])].forEach((op) => {
      if (!op) return;
      const key = op.id || `${op.name}-${op.startCycleIndex}`;
      const existing = opMap.get(key);
      if (!existing) {
        opMap.set(key, structuredCloneSafe(op));
      } else {
        const newest = { ...existing, ...op };
        const oldObjectives = Array.isArray(existing.objectives) ? existing.objectives : [];
        const newObjectives = Array.isArray(op.objectives) ? op.objectives : [];
        const objectiveMap = new Map();
        [...oldObjectives, ...newObjectives].forEach((objective) => {
          const obj = typeof objective === "string" ? { text: objective } : objective;
          if (!obj?.text) return;
          const objKey = obj.id || obj.text.trim().toLowerCase();
          objectiveMap.set(objKey, { ...(objectiveMap.get(objKey) || {}), ...obj });
        });
        newest.objectives = [...objectiveMap.values()];
        if (!String(newest.overallSummary || "").trim() && String(existing.overallSummary || "").trim()) {
          newest.overallSummary = existing.overallSummary;
        }
        opMap.set(key, newest);
      }
    });

    const cycleMap = new Map();
    [...(bOps.cycles || []), ...(pOps.cycles || [])].forEach((cycle) => {
      if (!cycle || !Number.isInteger(cycle.cycleIndex)) return;
      const existing = cycleMap.get(cycle.cycleIndex);
      cycleMap.set(cycle.cycleIndex, existing ? {
        ...existing,
        ...cycle,
        summary: String(cycle.summary || existing.summary || "")
      } : structuredCloneSafe(cycle));
    });

    merged.operations = {
      ...bOps,
      ...pOps,
      items: [...opMap.values()],
      cycles: [...cycleMap.values()].sort((a, b) => a.cycleIndex - b.cycleIndex),
      activeOperationId: pOps.activeOperationId || bOps.activeOperationId || null
    };

    return merged;
  }

  function loadState() {
    try {
      const primary = parseStoredState(localStorage.getItem(STORAGE_KEY));
      const backup = parseStoredState(localStorage.getItem(BACKUP_STORAGE_KEY));
      const merged = mergeCommandCenterStates(primary, backup);
      if (merged) {
        if (primary && backup) console.info("Merged primary and backup Command Center data without discarding unique records.");
        return merged;
      }
      return createInitialState();
    } catch (error) {
      console.error("Could not load local data:", error);
      setTimeout(() => {
        const alertBox = document.getElementById("storageAlert");
        if (alertBox) alertBox.hidden = false;
      }, 0);
      return createInitialState();
    }
  }

  function saveState() {
    try {
      const serialized = JSON.stringify(state);
      const previousRaw = localStorage.getItem(STORAGE_KEY);

      // Snapshot the complete previous state before every write. We never choose a
      // "richer" snapshot over current data; loadState merges both non-destructively.
      if (previousRaw && previousRaw !== serialized) {
        localStorage.setItem(BACKUP_STORAGE_KEY, previousRaw);
      }
      localStorage.setItem(STORAGE_KEY, serialized);

      if (elements.storageAlert) elements.storageAlert.hidden = true;
      return true;
    } catch (error) {
      console.error("Could not save local data:", error);
      if (elements.storageAlert) elements.storageAlert.hidden = false;
      return false;
    }
  }

  function saveAndRender() {
    saveState();
    renderAll();
  }

  function refreshForNewDate() {
    const currentDateKey = getTodayKey();
    if (currentDateKey === lastRenderedDateKey) return;

    getTodayRecord();
    renderAll();
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
    });
  }

  function normalizeProteinGoal(value) {
    const number = Number(value);
    return clamp(Number.isFinite(number) ? Math.round(number / 5) * 5 : 170, 50, 400);
  }

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseLocalDate(dateKey) {
    const [year, month, day] = String(dateKey).split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime())
      ? new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
      : date;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function modulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }
})();
