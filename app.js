(() => {
  "use strict";

  const STORAGE_KEY = "myCommandCenter.v1";
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
  let lastRenderedDateKey = getTodayKey();

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
      "quickAddExerciseButton", "quickAssignDays", "quickWorkoutStatus"
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
    state.version = 2;
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

    getTodayRecord();
    saveState();
  }

  function createInitialState() {
    return {
      version: 2,
      settings: structuredCloneSafe(DEFAULT_SETTINGS),
      daily: {},
      quotes: {},
      customWorkouts: {}
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

    const list = document.createElement("ul");
    details.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
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

  function renderSchedule() {
    elements.cycleStartDate.value = state.settings.cycleStartDate;
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

  function renderHistory() {
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

      toggle.addEventListener("click", () => {
        const open = details.hidden;
        details.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
      });

      item.append(toggle, details);
      elements.historyList.appendChild(item);
    });
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

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : createInitialState();
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
