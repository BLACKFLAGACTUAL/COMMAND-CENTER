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

  const elements = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    ensureStateShape();
    bindEvents();
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
      "operationDialogCancel"
    ].forEach((id) => {
      elements[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    document.querySelectorAll(".nav-button").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.target));
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
    state.version = 5;
    state.settings = { ...DEFAULT_SETTINGS, ...(state.settings || {}) };

    if (!Array.isArray(state.settings.mindTemplates)) {
      state.settings.mindTemplates = [...DEFAULT_SETTINGS.mindTemplates];
    }
    if (!Array.isArray(state.settings.spiritTemplates)) {
      state.settings.spiritTemplates = [...DEFAULT_SETTINGS.spiritTemplates];
    }
    if (!Array.isArray(state.settings.schedule) || state.settings.schedule.length !== 14) {
      state.settings.schedule = [...DEFAULT_SETTINGS.schedule];
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
      state.activityTrackers = { MMA: { name: "MMA", entries: [] } };
    }
    if (!state.activityTrackers.MMA) state.activityTrackers.MMA = { name: "MMA", entries: [] };
    Object.values(state.activityTrackers).forEach((tracker) => {
      if (!Array.isArray(tracker.entries)) tracker.entries = [];
    });
    if (!state.settings.archiveDomain) state.settings.archiveDomain = "Weightlifting";
    if (typeof state.settings.progressExercise !== "string") state.settings.progressExercise = "";
    if (typeof state.settings.scheduleCollapsed !== "boolean") state.settings.scheduleCollapsed = false;
    ensureOperationsShape();
    syncOperationCycles();

    getTodayRecord();
    saveState();
  }

  function createInitialState() {
    return {
      version: 5,
      settings: structuredCloneSafe(DEFAULT_SETTINGS),
      daily: {},
      quotes: {},
      customWorkouts: {},
      exerciseLogs: {},
      activityTrackers: { MMA: { name: "MMA", entries: [] } },
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
          createdAt: new Date().toISOString()
        };
        state.operations.cycles.push(cycle);
      } else {
        cycle.startDate = bounds.startKey;
        cycle.endDate = bounds.endKey;
        cycle.status = i < currentIndex ? "complete" : "active";
        if (!cycle.operationId && operation) cycle.operationId = operation.id;
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
        <div class="operation-status-row"><span class="operation-status">ACTIVE OPERATION</span><span>Cycle ${currentIndex - current.startCycleIndex + 1}</span></div>
        <h4>${escapeHtml(current.name)}</h4>
        <p><strong>Intent:</strong> ${escapeHtml(current.intent || "Not set yet")}</p>
        <p><strong>Mission:</strong> ${escapeHtml(current.mission || "Not set yet")}</p>
        <p class="helper-text">Current 14-day block: ${escapeHtml(formatDisplayDate(bounds.start))} – ${escapeHtml(formatDisplayDate(bounds.end))}</p>
        <div class="operation-metrics"><span>${stats.cycleCount} blocks</span><span>${stats.daysLogged} days logged</span><span>${stats.execution}% execution</span><span>${stats.protein} g avg protein</span></div>
      `;
      const actions = document.createElement("div");
      actions.className = "button-row operation-actions";
      const edit = document.createElement("button");
      edit.type = "button"; edit.className = "button secondary"; edit.textContent = "Edit operation";
      edit.addEventListener("click", () => openOperationDialog(current.id));
      const next = document.createElement("button");
      next.type = "button"; next.className = "button primary"; next.textContent = planned ? "Edit next operation" : "Plan next operation";
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

    elements.operationCycleStrip.replaceChildren();
    state.operations.cycles
      .filter((cycle) => cycle.cycleIndex >= Math.max(0, currentIndex - 5))
      .sort((a, b) => a.cycleIndex - b.cycleIndex)
      .forEach((cycle) => {
        const operation = state.operations.items.find((item) => item.id === cycle.operationId);
        const stats = cycleStats(cycle.cycleIndex);
        const block = document.createElement("div");
        block.className = `operation-cycle-block${cycle.cycleIndex === currentIndex ? " active" : ""}`;
        block.innerHTML = `<span>BLOCK ${cycle.cycleIndex + 1}</span><strong>${escapeHtml(operation?.name || "Unassigned")}</strong><small>${stats.execution}% · ${stats.records} days</small>`;
        elements.operationCycleStrip.appendChild(block);
      });

    elements.operationsList.replaceChildren();
    [...state.operations.items]
      .sort((a, b) => b.startCycleIndex - a.startCycleIndex)
      .forEach((operation) => {
        const stats = operationStats(operation);
        const start = getCycleBounds(operation.startCycleIndex).start;
        const endIndex = operation.endCycleIndex === null ? currentIndex : operation.endCycleIndex;
        const end = getCycleBounds(Math.max(operation.startCycleIndex, endIndex)).end;
        const item = document.createElement("details");
        item.className = "operation-history-item";
        const status = operation.status === "planned" ? "PLANNED" : operation.status === "complete" ? "COMPLETE" : "ACTIVE";
        item.innerHTML = `<summary><span><small>${status}</small><strong>${escapeHtml(operation.name)}</strong></span><span>${stats.cycleCount} blocks</span></summary>
          <div class="operation-history-body">
            <p>${escapeHtml(formatDisplayDate(start))} – ${escapeHtml(formatDisplayDate(end))}</p>
            <p><strong>Intent:</strong> ${escapeHtml(operation.intent || "—")}</p>
            <p><strong>Mission:</strong> ${escapeHtml(operation.mission || "—")}</p>
            <div class="operation-metrics"><span>${stats.daysLogged} days</span><span>${stats.execution}% execution</span><span>${stats.protein} g avg protein</span></div>
          </div>`;
        elements.operationsList.appendChild(item);
      });
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
      elements.operationTimingNote.textContent = current
        ? `The current operation keeps this 14-day block. The new operation begins ${formatDisplayDate(bounds.start)} and receives future 14-day blocks until you plan another.`
        : `This operation begins ${formatDisplayDate(bounds.start)}.`;
    }
    elements.operationDialog.showModal();
    setTimeout(() => elements.operationName.focus(), 0);
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
      dateBlock.append(strongDate, sub);

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

      const viewAarButton = document.createElement("button");
      viewAarButton.type = "button";
      viewAarButton.className = "button secondary history-action-button";
      viewAarButton.textContent = "View details";
      viewAarButton.addEventListener("click", () => {
        const open = details.hidden;
        details.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        viewAarButton.textContent = open ? "Hide details" : "View details";
      });

      const editAarButton = document.createElement("button");
      editAarButton.type = "button";
      editAarButton.className = "button primary edit-aar-button history-action-button";
      editAarButton.textContent = "Edit AAR";
      editAarButton.addEventListener("click", () => openArchivedAarEditor(day.date));

      historyActions.append(viewAarButton, editAarButton);

      toggle.addEventListener("click", () => {
        const open = details.hidden;
        details.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        viewAarButton.textContent = open ? "Hide details" : "View details";
      });

      item.append(toggle, historyActions, details);
      elements.historyList.appendChild(item);
    });
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

  function saveActivityTracker(event) {
    event.preventDefault();
    const name = elements.activityTrackerName.value.trim();
    if (!name) return;
    if (name.toLowerCase() === "weightlifting" || Object.keys(state.activityTrackers).some((key) => key.toLowerCase() === name.toLowerCase())) {
      elements.activityTrackerStatus.textContent = "That progress folder already exists.";
      return;
    }
    state.activityTrackers[name] = { name, entries: [] };
    state.settings.archiveDomain = name;
    saveState();
    elements.activityTrackerDialog.close();
    renderHistory();
  }

  function openActivityEntryDialog() {
    const domain = state.settings.archiveDomain;
    if (!domain || domain === "Weightlifting") return;
    elements.activityEntryDomain.textContent = domain;
    elements.activityEntryDate.value = getTodayKey();
    elements.activityEntryMetric.value = elements.activityMetricSelect.value || "";
    elements.activityEntryValue.value = "";
    elements.activityEntryUnit.value = "";
    elements.activityEntryNote.value = "";
    elements.activityEntryStatus.textContent = "";
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

  function openArchivedAarEditor(dateKey) {
    const day = state.daily?.[dateKey];
    if (!day) {
      alert("That archived day could not be found.");
      return;
    }
    if (!day.aar || typeof day.aar !== "object") {
      day.aar = { wentWell: "", improve: "", lesson: "", priority: "", rating: 5 };
    }
    editingAarDateKey = dateKey;
    const date = new Date(`${dateKey}T12:00:00`);
    elements.editAarDate.textContent = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
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

  function scoreStoredState(candidate) {
    if (!candidate || typeof candidate !== "object") return -1;
    let score = 0;
    score += Object.keys(candidate.daily || {}).length * 20;
    score += Object.values(candidate.exerciseLogs || {}).reduce((sum, logs) => sum + (Array.isArray(logs) ? logs.length : 0), 0) * 5;
    score += Object.values(candidate.activityTrackers || {}).reduce((sum, tracker) => sum + (Array.isArray(tracker?.entries) ? tracker.entries.length : 0), 0) * 4;
    score += Object.keys(candidate.customWorkouts || {}).length * 2;
    score += Array.isArray(candidate.operations?.items) ? candidate.operations.items.length * 3 : 0;
    return score;
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

  function loadState() {
    try {
      const primaryRaw = localStorage.getItem(STORAGE_KEY);
      const backupRaw = localStorage.getItem(BACKUP_STORAGE_KEY);
      const primary = parseStoredState(primaryRaw);
      const backup = parseStoredState(backupRaw);

      if (primary && backup && scoreStoredState(backup) > scoreStoredState(primary)) {
        console.warn("Restoring richer last-known-good Command Center data.");
        return backup;
      }
      if (primary) return primary;
      if (backup) return backup;
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
      const previous = parseStoredState(previousRaw);
      if (previous && scoreStoredState(previous) >= scoreStoredState(state)) {
        localStorage.setItem(BACKUP_STORAGE_KEY, previousRaw);
      } else if (!localStorage.getItem(BACKUP_STORAGE_KEY) && previousRaw) {
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
