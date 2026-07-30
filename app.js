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
      { name: "Training time", unit: "min", type: "number" },
      { name: "Rounds", unit: "rounds", type: "number" },
      { name: "Sparring rounds", unit: "rounds", type: "number" },
      { name: "Performance", unit: "/10", type: "number" }
    ],
    BJJ: [
      { name: "Training time", unit: "min", type: "number" },
      { name: "Rolling rounds", unit: "rounds", type: "number" },
      { name: "Submissions", unit: "subs", type: "number" },
      { name: "Performance", unit: "/10", type: "number" }
    ],
    Boxing: [
      { name: "Training time", unit: "min", type: "number" },
      { name: "Rounds", unit: "rounds", type: "number" },
      { name: "Sparring rounds", unit: "rounds", type: "number" },
      { name: "Performance", unit: "/10", type: "number" }
    ],
    Running: [
      { name: "Distance", unit: "mi", type: "number" },
      { name: "Time", unit: "min", type: "number" },
      { name: "Pace", unit: "min/mi", type: "calculated", dependsOn: ["Distance", "Time"] },
      { name: "Effort zone", unit: "zone", type: "effort" }
    ],
    Ruck: [
      { name: "Distance", unit: "mi", type: "number" },
      { name: "Time", unit: "min", type: "number" },
      { name: "Pace", unit: "min/mi", type: "calculated", dependsOn: ["Distance", "Time"] },
      { name: "Load", unit: "lb", type: "number" },
      { name: "Heart rate", unit: "bpm", type: "number" }
    ],
    Swimming: [
      { name: "Distance", unit: "yd", type: "number" },
      { name: "Time", unit: "min", type: "number" },
      { name: "Pace", unit: "min/100yd", type: "calculated", dependsOn: ["Distance", "Time"] }
    ],
    Surfing: [
      { name: "Session time", unit: "min", type: "number" },
      { name: "Waves caught", unit: "waves", type: "number" },
      { name: "Best wave", unit: "/10", type: "number" }
    ],
    Chess: [
      { name: "Rating", unit: "Elo", type: "number" },
      { name: "Games", unit: "games", type: "number" },
      { name: "Wins", unit: "wins", type: "number" },
      { name: "Study time", unit: "min", type: "number" }
    ],
    Reading: [
      { name: "Pages", unit: "pages", type: "number" },
      { name: "Study time", unit: "min", type: "number" }
    ],
    "Body Weight": [
      { name: "Body weight", unit: "lb", type: "number" }
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
  let loggingWorkoutName = null;
  let loggingPastEntry = false;
  let lastRenderedDateKey = getTodayKey();
  let editingAarDateKey = null;
  let editingOperationId = null;
  let archiveCalendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);

  const elements = {};
  const WORK_STORAGE_KEY = "myCommandCenter.work.v1";
  const APP_MODE_KEY = "myCommandCenter.activeMode";
  let appMode = localStorage.getItem(APP_MODE_KEY) === "work" ? "work" : "personal";
  let workTaskFilter = "open";
  let workState = loadWorkState();
  const BACKUP_SCHEMA_VERSION = 13;
  const SAFETY_SNAPSHOT_KEY = "myCommandCenter.preRestoreSnapshot.v13";
  let pendingRestore = null;

  function createInitialWorkState() {
    return {
      version: 1,
      settings: { defaultCategory: "" },
      tasks: [],
      operations: [],
      logs: [],
      activeOperationId: null
    };
  }

  function loadWorkState() {
    try {
      const raw = localStorage.getItem(WORK_STORAGE_KEY);
      if (!raw) return createInitialWorkState();
      const parsed = JSON.parse(raw);
      return {
        ...createInitialWorkState(),
        ...parsed,
        settings: { ...createInitialWorkState().settings, ...(parsed.settings || {}) },
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        operations: Array.isArray(parsed.operations) ? parsed.operations : [],
        logs: Array.isArray(parsed.logs) ? parsed.logs : []
      };
    } catch (error) {
      console.warn("Could not load Work Command data:", error);
      return createInitialWorkState();
    }
  }

  function saveWorkState() {
    try {
      localStorage.setItem(WORK_STORAGE_KEY, JSON.stringify(workState));
      return true;
    } catch (error) {
      console.error("Could not save Work Command data:", error);
      return false;
    }
  }


  window.addEventListener("error", (event) => {
    const box = document.getElementById("storageAlert");
    if (box) {
      box.hidden = false;
      box.textContent = `Startup error: ${event.message || "Unknown error"} · BUILD v24`;
    }
  });

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();

    const runStage = (name, fn) => {
      try { fn(); return true; }
      catch (error) {
        console.error(`Command Center ${name} failed:`, error);
        if (elements.storageAlert) {
          elements.storageAlert.hidden = false;
          elements.storageAlert.textContent =
            `Command Center ${name} failed. Saved data was not intentionally cleared. BUILD v24`;
        }
        return false;
      }
    };

    runStage("state initialization", () => {
      ensureStateShape();
      ensureProfileShape();
    });
    runStage("control binding", bindEvents);
    runStage("collapsible UI setup", initializeCollapsibleSections);
    runStage("data render", renderAll);
    runStage("mode render", applyModeUI);
    runStage("profile render", renderProfileSummary);

    if (elements.buildVersionBadge) {
      elements.buildVersionBadge.textContent = "BUILD v24 · CONTROLS ACTIVE";
    }

    if (shouldShowOnboarding()) showOnboarding(false, false);
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
      "activityTrackerMetrics", "activityMetricSuggestions", "activitySessionFields", "activityEntryActivity",
      "activitySwipeTrack", "activitySwipeDots", "activitySwipePrev", "activitySwipeNext", "activityTrendWindow",
      "activityTrendSummary", "runningHeartRatePanel", "maxHeartRateInput", "heartRateZoneGrid", "heartRateZoneCurrent",
      "archiveCalendarPrev", "archiveCalendarNext", "archiveCalendarToday",
      "archiveCalendarMonth", "archiveCalendarGrid", "editAarTitle", "editAarOperationContext", "systemMenuButton", "systemConfirmDialog", "systemConfirmYes", "systemConfirmCancel", "dashboardDirectivePanel", "sectionIdentityBanner", "sectionIdentityKicker", "sectionIdentityTitle", "brandEyebrow", "brandTitle", "personalNav", "workNav", "commandPersonalMode", "commandWorkMode", "commandGlobalBackup", "commandModeSystemLabel", "workCompletionPercent", "workCurrentOperationName", "workCurrentOperationMission", "workQuickAddTask", "workPriorityTasks", "workPriorityEmpty", "workActiveCount", "workDueTodayCount", "workWaitingCount", "workCompleteCount", "workAddTaskButton", "workTaskList", "workTaskEmpty", "workAddOperationButton", "workOperationList", "workOperationEmpty", "workAddLogButton", "workArchiveList", "workArchiveEmpty", "workIntelTotal", "workIntelComplete", "workIntelOnTime", "workIntelOps", "workIntelStatusBars", "workIntelRecent", "workDefaultCategory", "saveWorkSettings", "workSettingsStatus", "exportWorkDataButton", "resetWorkDataButton", "workTaskDialog", "workTaskForm", "workTaskDialogTitle", "workTaskId", "workTaskTitle", "workTaskPriority", "workTaskStatus", "workTaskDue", "workTaskCategory", "workTaskOperation", "workTaskNotes", "workTaskCancel", "workOperationDialog", "workOperationForm", "workOperationId", "workOperationName", "workOperationIntent", "workOperationMission", "workOperationObjectives", "workOperationCancel", "workLogDialog", "workLogForm", "workLogDate", "workLogCompleted", "workLogIssues", "workLogDecisions", "workLogFollowUp", "workLogNotes", "workLogCancel", "openGlobalRestoreButton", "globalRestoreInput", "backupStatus", "workRestoreInput", "workOpenGlobalRestoreButton", "workBackupStatus", "restorePreviewDialog", "restorePreviewTitle", "restorePreviewMeta", "restorePreviewStats", "restoreConfirmButton", "restoreCancelButton", "aiSitrepCard", "startAiSitrepButton", "aiSitrepDialog", "aiSitrepClose", "aiSitrepProgress", "aiSitrepVoiceStatus", "aiSitrepConversation", "aiSitrepInputArea", "aiSitrepMicButton", "aiSitrepMicLabel", "aiSitrepTextInput", "aiSitrepSendButton", "aiSitrepReview", "aiSitrepChangeCount", "aiSitrepProposalList", "aiSitrepSaveAll", "aiSitrepRestart", "aiSitrepContext", "onboardingScreen", "onboardingStepLabel", "onboardingProgressBar", "onboardingBeginButton", "onboardingTemplateButton", "onboardingRestoreInput", "onboardingSystemName", "onboardingMission", "onboardingPrimaryGoal", "onboardingMindTasks", "onboardingBodyTasks", "onboardingSpiritTasks", "onboardingActivityChoices", "onboardingCustomActivity", "onboardingAddCustomActivity", "onboardingProteinGoal", "onboardingReview", "onboardingCreateButton", "onboardingNavigation", "onboardingBackButton", "onboardingNextButton", "profileSummary", "editPersonalSetupButton", "commandNewCenter", "buildVersionBadge", "onboardingCustomScheduleLengthRow", "onboardingCustomScheduleLength", "scheduleCycleEyebrow", "scheduleCycleHelp", "quickBuilderHelp", "workoutBuilderCard", "genericTemplateChips", "savedTemplateChips", "clearHotSwapSelection", "hotSwapSelection", "hotSwapSelectedName", "hotSwapSelectedDetail", "hotSwapAssignButton", "hotSwapStatus", "hotSwapDayGrid"].forEach((id) => {
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


  let sitrepSession = null;
  let sitrepRecognition = null;
  const ONBOARDING_VERSION = 1;
  let onboardingDraft = null;
  let onboardingStep = 0;

  function createSitrepSession() {
    const day = getTodayRecord();
    const completedMind = day.mindTasks.filter((task) => task.completed).length;
    const completedSpirit = day.spiritTasks.filter((task) => task.completed).length;
    const totalChecks = day.mindTasks.length + day.spiritTasks.length + 1;
    const completedChecks = completedMind + completedSpirit + (day.workoutComplete ? 1 : 0);

    return {
      date: getTodayKey(),
      stepIndex: 0,
      steps: [
        {
          type: "activity",
          question: "Start with training. Tell me what activity or workout you did today. Include lifts, weight and reps, distance and time, or say none."
        },
        {
          type: "aar",
          field: "wentWell",
          question: "What went well today?"
        },
        {
          type: "reflection",
          question: "What needs improvement, and what did you learn from today?"
        },
        {
          type: "aar",
          field: "priority",
          question: "What's tomorrow's main priority?"
        },
        {
          type: "rating",
          question: "Optional: rate the day from 1 to 10, or say skip."
        }
      ],
      proposals: [],
      transcript: [],
      checkboxContext: { completed: completedChecks, total: totalChecks }
    };
  }

  function openAiSitrep() {
    sitrepSession = createSitrepSession();
    elements.aiSitrepConversation.replaceChildren();
    elements.aiSitrepReview.hidden = true;
    elements.aiSitrepInputArea.hidden = false;
    elements.aiSitrepTextInput.value = "";
    elements.aiSitrepContext.textContent =
      `Dashboard checkboxes stay manual · ${sitrepSession.checkboxContext.completed}/${sitrepSession.checkboxContext.total} currently complete`;
    renderSitrepQuestion();
    elements.aiSitrepDialog.showModal();
  }

  function restartAiSitrep() {
    stopSitrepRecognition();
    sitrepSession = createSitrepSession();
    elements.aiSitrepConversation.replaceChildren();
    elements.aiSitrepReview.hidden = true;
    elements.aiSitrepInputArea.hidden = false;
    elements.aiSitrepContext.textContent =
      `Dashboard checkboxes stay manual · ${sitrepSession.checkboxContext.completed}/${sitrepSession.checkboxContext.total} currently complete`;
    renderSitrepQuestion();
  }

  function appendSitrepMessage(role, text) {
    const bubble = document.createElement("div");
    bubble.className = `ai-message ${role}`;
    const label = document.createElement("span");
    label.textContent = role === "assistant" ? "SITREP" : "YOU";
    const copy = document.createElement("p");
    copy.textContent = text;
    bubble.append(label, copy);
    elements.aiSitrepConversation.appendChild(bubble);
    elements.aiSitrepConversation.scrollTop = elements.aiSitrepConversation.scrollHeight;
  }

  function renderSitrepQuestion() {
    if (!sitrepSession) return;
    if (sitrepSession.stepIndex >= sitrepSession.steps.length) {
      finishAiSitrep();
      return;
    }

    const step = sitrepSession.steps[sitrepSession.stepIndex];
    elements.aiSitrepProgress.textContent = `Step ${sitrepSession.stepIndex + 1} / ${sitrepSession.steps.length}`;
    appendSitrepMessage("assistant", step.question);
    speakSitrep(step.question);
    setTimeout(() => elements.aiSitrepTextInput.focus(), 100);
  }

  function getPreferredSitrepVoice() {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    const preferredNames = [
      "Daniel", "Alex", "Tom", "Arthur", "Aaron",
      "Google UK English Male", "Microsoft Guy", "Microsoft David",
      "Microsoft Mark", "Microsoft Ryan"
    ];

    for (const name of preferredNames) {
      const voice = voices.find((item) =>
        String(item.name || "").toLowerCase().includes(name.toLowerCase())
      );
      if (voice) return voice;
    }

    return voices.find((voice) => /^en(-|_)/i.test(voice.lang || "")) || voices[0] || null;
  }

  function speakSitrep(text) {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = getPreferredSitrepVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 1.03;
      utterance.pitch = 0.82;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }

  function startSitrepRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      elements.aiSitrepVoiceStatus.textContent = "Voice unavailable — type instead";
      elements.aiSitrepTextInput.focus();
      return;
    }

    stopSitrepRecognition();
    sitrepRecognition = new Recognition();
    sitrepRecognition.lang = "en-US";
    sitrepRecognition.interimResults = true;
    sitrepRecognition.continuous = false;

    elements.aiSitrepMicButton.classList.add("listening");
    elements.aiSitrepMicLabel.textContent = "LISTENING";
    elements.aiSitrepVoiceStatus.textContent = "Listening…";

    sitrepRecognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      elements.aiSitrepTextInput.value = transcript.trim();
    };

    sitrepRecognition.onerror = () => {
      elements.aiSitrepVoiceStatus.textContent = "Voice stopped — type or try again";
      stopSitrepRecognition();
    };

    sitrepRecognition.onend = () => {
      elements.aiSitrepMicButton.classList.remove("listening");
      elements.aiSitrepMicLabel.textContent = "TALK";
      elements.aiSitrepVoiceStatus.textContent = "Voice ready";
      if (elements.aiSitrepTextInput.value.trim()) submitSitrepAnswer();
    };

    sitrepRecognition.start();
  }

  function stopSitrepRecognition() {
    if (sitrepRecognition) {
      try { sitrepRecognition.stop(); } catch (_) {}
      sitrepRecognition = null;
    }
    if (elements.aiSitrepMicButton) elements.aiSitrepMicButton.classList.remove("listening");
    if (elements.aiSitrepMicLabel) elements.aiSitrepMicLabel.textContent = "TALK";
  }

  function submitSitrepAnswer() {
    if (!sitrepSession) return;
    const answer = elements.aiSitrepTextInput.value.trim();
    if (!answer) return;

    stopSitrepRecognition();
    appendSitrepMessage("user", answer);
    sitrepSession.transcript.push({
      step: sitrepSession.stepIndex,
      answer,
      at: new Date().toISOString()
    });

    const step = sitrepSession.steps[sitrepSession.stepIndex];
    parseSitrepAnswer(step, answer);
    elements.aiSitrepTextInput.value = "";
    sitrepSession.stepIndex += 1;
    setTimeout(renderSitrepQuestion, 220);
  }

  function isAffirmativeAnswer(text) {
    const value = String(text).trim().toLowerCase();
    if (/\b(no|nope|didn't|did not|not today|skip)\b/.test(value)) return false;
    return /\b(yes|yeah|yep|did|done|completed|finished|absolutely|sure)\b/.test(value);
  }

  function isNegativeOrSkip(text) {
    return /\b(no|nope|none|nothing|skip|didn't|did not|not today)\b/i.test(String(text));
  }

  function addSitrepProposal(proposal) {
    sitrepSession.proposals.push({
      id: `sp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      approved: proposal.kind === "activityNote" ? false : true,
      ...proposal
    });
  }

  function splitReflectionAnswer(answer) {
    const text = String(answer || "").trim();
    if (!text) return { improve: "", lesson: "" };

    const parts = text
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    const improveParts = parts.filter((part) =>
      /\b(need|improve|should|could|better|fix|work on|next time|stop|start|earlier|later)\b/i.test(part)
    );
    const lessonParts = parts.filter((part) =>
      /\b(learned|lesson|realized|remember|showed me|takeaway|understand|important)\b/i.test(part)
    );

    return {
      improve: (improveParts.length ? improveParts : [parts[0] || text]).join(" "),
      lesson: (lessonParts.length ? lessonParts : [parts.at(-1) || text]).join(" ")
    };
  }

  function parseSitrepAnswer(step, answer) {
    if (step.type === "activity") {
      if (!isNegativeOrSkip(answer)) parseSmartActivityText(answer);
      return;
    }

    if (step.type === "aar") {
      if (!isNegativeOrSkip(answer) && String(answer).trim()) {
        const labels = {
          wentWell: "AAR · Went well",
          priority: "AAR · Tomorrow priority"
        };
        addSitrepProposal({
          kind: "aar",
          field: step.field,
          title: labels[step.field],
          summary: answer.trim(),
          value: answer.trim()
        });
      }
      return;
    }

    if (step.type === "reflection") {
      if (!isNegativeOrSkip(answer) && String(answer).trim()) {
        const reflection = splitReflectionAnswer(answer);
        if (reflection.improve) {
          addSitrepProposal({
            kind: "aar",
            field: "improve",
            title: "AAR · Improve",
            summary: reflection.improve,
            value: reflection.improve
          });
        }
        if (reflection.lesson) {
          addSitrepProposal({
            kind: "aar",
            field: "lesson",
            title: "AAR · Lesson learned",
            summary: reflection.lesson,
            value: reflection.lesson
          });
        }
      }
      return;
    }

    if (step.type === "rating") {
      if (isNegativeOrSkip(answer)) return;
      const match = String(answer).match(/\b(10|[1-9])\b/);
      if (match) {
        const rating = Number(match[1]);
        addSitrepProposal({
          kind: "rating",
          title: "AAR · Overall rating",
          summary: `${rating}/10`,
          value: rating
        });
      }
    }
  }

  function parseSmartActivityText(text) {
    const raw = String(text || "").trim();
    const lower = raw.toLowerCase();
    let found = false;

    // Running / rucking.
    const distanceMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:mile|miles|mi)\b/);
    const timeMatch = lower.match(/(?:in|time(?: was)?|for)\s*(\d{1,3})(?::(\d{2}))?\s*(?:minutes?|mins?|min)?\b/);

    if (distanceMatch && /\b(run|ran|running|ruck|rucked|rucking)\b/.test(lower)) {
      const domain = /\bruck/.test(lower) ? "Ruck" : "Running";
      const distance = Number(distanceMatch[1]);
      let minutes = null;

      if (timeMatch) {
        minutes = Number(timeMatch[1]) + (timeMatch[2] ? Number(timeMatch[2]) / 60 : 0);
      }

      const effortMap = [
        [1, /\b(very easy|recovery|super easy)\b/],
        [2, /\b(easy|sustainable|comfortable)\b/],
        [3, /\b(moderate|steady|tempo)\b/],
        [4, /\b(hard|tough|threshold)\b/],
        [5, /\b(very hard|max|maximum|all out)\b/]
      ];
      const effort = effortMap.find(([, rx]) => rx.test(lower))?.[0] || null;

      const metrics = [{ metric: "Distance", value: distance, unit: "mi" }];
      if (minutes) {
        metrics.push({ metric: "Time", value: minutes, unit: "min" });
        metrics.push({ metric: "Pace", value: minutes / distance, unit: "min/mi" });
      }
      if (effort && domain === "Running") {
        metrics.push({ metric: "Effort zone", value: effort, unit: "zone" });
      }

      addSitrepProposal({
        kind: "activity",
        title: domain,
        summary: `${distance} mi${minutes ? ` · ${formatPaceMinutes(minutes / distance)}/mi` : ""}${effort ? ` · Zone ${effort}` : ""}`,
        domain,
        metrics,
        note: raw
      });
      found = true;
    }

    // Surfing.
    if (/\b(surf|surfed|surfing)\b/.test(lower)) {
      const minutesMatch = lower.match(/(\d{1,3})\s*(?:minutes?|mins?|min)\b/);
      const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr)\b/);
      const wavesMatch = lower.match(/(?:caught|got)\s+(\d{1,2})\s+waves?\b/);
      const metrics = [];

      if (minutesMatch) metrics.push({ metric: "Session time", value: Number(minutesMatch[1]), unit: "min" });
      else if (hourMatch) metrics.push({ metric: "Session time", value: Number(hourMatch[1]) * 60, unit: "min" });
      if (wavesMatch) metrics.push({ metric: "Waves caught", value: Number(wavesMatch[1]), unit: "waves" });

      if (metrics.length) {
        addSitrepProposal({
          kind: "activity",
          title: "Surfing",
          summary: metrics.map((item) => `${item.value} ${item.unit}`).join(" · "),
          domain: "Surfing",
          metrics,
          note: raw
        });
        found = true;
      }
    }

    // Timed combat / conditioning activities.
    const timedActivities = [
      ["BJJ", /\b(bjj|jiu jitsu|jiu-jitsu)\b/],
      ["MMA", /\bmma\b/],
      ["Boxing", /\b(boxing|boxed)\b/],
      ["Swimming", /\b(swim|swam|swimming)\b/]
    ];

    timedActivities.forEach(([domain, rx]) => {
      if (!rx.test(lower)) return;
      const mins = lower.match(/(\d{1,3})\s*(?:minutes?|mins?|min)\b/);
      const hrs = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr)\b/);
      const duration = mins ? Number(mins[1]) : hrs ? Number(hrs[1]) * 60 : null;
      if (!duration) return;

      addSitrepProposal({
        kind: "activity",
        title: domain,
        summary: `${duration} min`,
        domain,
        metrics: [{ metric: "Training time", value: duration, unit: "min" }],
        note: raw
      });
      found = true;
    });

    // Multiple lift entries from one answer.
    const candidates = raw.split(/[,;]|\band then\b|\bthen\b/i).map((part) => part.trim()).filter(Boolean);
    const seen = new Set();

    candidates.forEach((part) => {
      let match = part.match(/(?:i\s+)?(?:hit|did)?\s*([a-zA-Z][a-zA-Z\s'-]{2,35}?)\s+(\d{2,4})\s*(?:lb|lbs|pounds?)?\s*(?:for|x|×)\s*(\d{1,2})(?:\s*reps?)?/i);
      let exercise, weight, reps;

      if (match) {
        exercise = match[1].trim();
        weight = Number(match[2]);
        reps = Number(match[3]);
      } else {
        match = part.match(/(\d{2,4})\s*(?:lb|lbs|pounds?)?\s*(?:for|x|×)\s*(\d{1,2})\s+(?:on\s+)?([a-zA-Z][a-zA-Z\s'-]{2,35})/i);
        if (match) {
          weight = Number(match[1]);
          reps = Number(match[2]);
          exercise = match[3].trim();
        }
      }

      if (!exercise || !weight || !reps) return;
      exercise = exercise.replace(/\b(today|this morning|after work)\b/gi, "").replace(/\s+/g, " ").trim();
      const key = `${exercise.toLowerCase()}|${weight}|${reps}`;
      if (seen.has(key)) return;
      seen.add(key);

      addSitrepProposal({
        kind: "lift",
        title: `Lift · ${exercise}`,
        summary: `${weight} lb × ${reps}`,
        exercise,
        weight,
        reps,
        sets: 1,
        note: "Logged from AI SITREP"
      });
      found = true;
    });

    // If the parser cannot structure it, surface the note for review but never save it automatically.
    if (!found) {
      addSitrepProposal({
        kind: "activityNote",
        title: "Unstructured activity note",
        summary: raw,
        value: raw
      });
    }
  }

  function finishAiSitrep() {
    elements.aiSitrepProgress.textContent = "Review";
    elements.aiSitrepInputArea.hidden = true;
    elements.aiSitrepReview.hidden = false;
    renderSitrepProposals();
    appendSitrepMessage("assistant", `Debrief complete. I found ${sitrepSession.proposals.length} updates. Review them before saving.`);
    speakSitrep("Debrief complete. Review the proposed updates before saving.");
  }

  function renderSitrepProposals() {
    elements.aiSitrepProposalList.replaceChildren();
    elements.aiSitrepChangeCount.textContent = String(sitrepSession?.proposals.length || 0);

    if (!sitrepSession?.proposals.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No structured updates were identified. You can restart the SITREP and add more detail.";
      elements.aiSitrepProposalList.appendChild(empty);
      elements.aiSitrepSaveAll.disabled = true;
      return;
    }

    elements.aiSitrepSaveAll.disabled = false;
    sitrepSession.proposals.forEach((proposal) => {
      const label = document.createElement("label");
      label.className = "ai-proposal-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = proposal.approved;
      checkbox.addEventListener("change", () => {
        proposal.approved = checkbox.checked;
      });

      const copy = document.createElement("span");
      copy.innerHTML = `<strong>${escapeHtml(proposal.title)}</strong><small>${escapeHtml(proposal.summary)}</small>`;
      label.append(checkbox, copy);
      elements.aiSitrepProposalList.appendChild(label);
    });
  }

  function saveAiSitrep() {
    if (!sitrepSession) return;
    const approved = sitrepSession.proposals.filter((proposal) => proposal.approved);
    if (!approved.length) {
      alert("No SITREP updates are selected.");
      return;
    }

    // Protect current data before a multi-record write.
    try {
      createSafetySnapshot("pre-ai-sitrep-save");
    } catch (_) {}

    const day = getTodayRecord();

    approved.forEach((proposal) => {
      if (proposal.kind === "activityNote") return;

      if (proposal.kind === "task") {
        const list = proposal.category === "mind" ? day.mindTasks : day.spiritTasks;
        const task = list.find((item) => item.id === proposal.taskId);
        if (task) task.completed = Boolean(proposal.value);
      }

      if (proposal.kind === "workout") {
        day.workoutComplete = Boolean(proposal.value);
      }

      if (proposal.kind === "protein") {
        day.protein = proposal.value;
      }

      if (proposal.kind === "aar") {
        day.aar[proposal.field] = proposal.value;
        day.aar.savedAt = new Date().toISOString();
      }

      if (proposal.kind === "rating") {
        day.aar.rating = proposal.value;
        day.aar.savedAt = new Date().toISOString();
      }

      if (proposal.kind === "lift") {
        if (!Array.isArray(state.exerciseLogs[proposal.exercise])) state.exerciseLogs[proposal.exercise] = [];
        state.exerciseLogs[proposal.exercise].push({
          id: `sitrep-lift-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          date: new Date(`${sitrepSession.date}T12:00:00`).toISOString(),
          weight: proposal.weight,
          reps: proposal.reps,
          sets: proposal.sets || 1,
          note: proposal.note || "AI SITREP"
        });
      }

      if (proposal.kind === "activity") {
        if (!state.activityTrackers[proposal.domain]) {
          state.activityTrackers[proposal.domain] = {
            name: proposal.domain,
            entries: [],
            metrics: inferActivityMetrics(proposal.domain)
          };
        }
        const tracker = state.activityTrackers[proposal.domain];
        const sessionId = `sitrep-session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        proposal.metrics.forEach((metric) => {
          tracker.entries.push({
            id: `${sessionId}-${slugifyMetric(metric.metric)}`,
            sessionId,
            date: new Date(`${sitrepSession.date}T12:00:00`).toISOString(),
            metric: metric.metric,
            value: metric.value,
            unit: metric.unit,
            note: proposal.note || "AI SITREP"
          });
        });
      }
    });

    day.updatedAt = new Date().toISOString();
    saveAndRender();
    stopSitrepRecognition();
    elements.aiSitrepDialog.close();
    alert(`${approved.length} SITREP updates saved.`);
    sitrepSession = null;
  }


  const ONBOARDING_ACTIVITIES = ["Weightlifting","Running","Ruck","MMA","BJJ","Boxing","Swimming","Surfing","Chess","Reading","Body Weight"];

  function hasMeaningfulExistingData(candidate = state) {
    const daily = Object.values(candidate?.daily || {});
    const meaningfulDay = daily.some((day) => (day?.protein||0)>0 || day?.workoutComplete || [...(day?.mindTasks||[]),...(day?.spiritTasks||[])].some((t)=>t.completed) || ["wentWell","improve","lesson","priority"].some((f)=>String(day?.aar?.[f]||"").trim()));
    const lifts = Object.values(candidate?.exerciseLogs||{}).some((x)=>Array.isArray(x)&&x.length);
    const acts = Object.values(candidate?.activityTrackers||{}).some((x)=>Array.isArray(x?.entries)&&x.entries.length);
    const ops = Boolean(candidate?.operations?.items?.length);
    return meaningfulDay || lifts || acts || ops;
  }

  function ensureProfileShape() {
    if (!state.profile || typeof state.profile !== "object") state.profile = {};
    if (hasMeaningfulExistingData(state) && !state.profile.onboardingComplete) {
      state.profile = { ...state.profile, onboardingComplete:true, onboardingVersion:ONBOARDING_VERSION, createdAt:state.profile.createdAt||new Date().toISOString(), template:state.profile.template||"existing-installation", systemName:state.profile.systemName||"My Command Center" };
      saveState();
    }
  }

  function shouldShowOnboarding(){ ensureProfileShape(); return !state.profile?.onboardingComplete && !hasMeaningfulExistingData(state); }

  function makeOnboardingDraft(template=false){
    return { editing:false, systemName:"My Command Center", mission:template?"Become stronger, sharper, more disciplined, and more capable.":"", primaryGoal:template?"Execute consistently across Mind, Body, and Spirit.":"", mindTasks:template?[...DEFAULT_SETTINGS.mindTemplates]:["Read","Study"], bodyTasks:template?["Complete scheduled training","Reach protein goal"]:["Train"], spiritTasks:template?[...DEFAULT_SETTINGS.spiritTemplates]:["Reflect"], activities:template?["Weightlifting","Running","Ruck","MMA","Surfing"]:["Weightlifting","Running"], trainingMode:"template", scheduleType:"14day", customScheduleLength:10, proteinGoal:Number(state.settings?.proteinGoal)||170 };
  }

  function showOnboarding(template=false, editing=false){
    onboardingDraft=makeOnboardingDraft(template); onboardingDraft.editing=editing;
    if(editing && state.profile?.onboardingComplete){ onboardingDraft.systemName=state.profile.systemName||"My Command Center"; onboardingDraft.mission=state.profile.mission||""; onboardingDraft.primaryGoal=state.profile.primaryGoal||""; onboardingDraft.mindTasks=(state.settings.mindTemplates||[]).map((x)=>typeof x==="string"?x:x.text); onboardingDraft.spiritTasks=(state.settings.spiritTemplates||[]).map((x)=>typeof x==="string"?x:x.text); onboardingDraft.bodyTasks=[...(state.profile.bodyTasks||["Complete scheduled training","Reach protein goal"])]; onboardingDraft.activities=Array.isArray(state.profile.selectedActivities)&&state.profile.selectedActivities.length?[...state.profile.selectedActivities]:Object.keys(state.activityTrackers||{}); onboardingDraft.trainingMode=state.profile.trainingMode||"template"; onboardingDraft.scheduleType=state.profile.scheduleType||((state.settings.schedule||[]).length===7?"weekly":(state.settings.schedule||[]).length===14?"14day":"custom"); onboardingDraft.customScheduleLength=Number(state.profile.customScheduleLength)||Math.max(1,Math.min(30,(state.settings.schedule||[]).length||10)); }
    onboardingStep=editing?1:0; elements.onboardingScreen.hidden=false; document.body.classList.add("onboarding-active"); renderOnboarding();
  }
  function hideOnboarding(){ elements.onboardingScreen.hidden=true; document.body.classList.remove("onboarding-active"); }

  function renderOnboarding(){
    document.querySelectorAll(".onboarding-step").forEach((s)=>{ const active=Number(s.dataset.onboardingStep)===onboardingStep; s.hidden=!active; });
    elements.onboardingStepLabel.textContent=`Step ${onboardingStep+1} of 6`;
    elements.onboardingProgressBar.style.width=`${(onboardingStep+1)/6*100}%`;
    elements.onboardingNavigation.hidden=onboardingStep===0;
    elements.onboardingBackButton.disabled=false;
    elements.onboardingBackButton.textContent=onboardingStep===1 && onboardingDraft?.editing ? "Cancel" : "Back";
    elements.onboardingNextButton.hidden=onboardingStep===5;
    elements.onboardingNextButton.textContent=onboardingStep===4?"Review":"Next";
    elements.onboardingSystemName.value=onboardingDraft.systemName; elements.onboardingMission.value=onboardingDraft.mission; elements.onboardingPrimaryGoal.value=onboardingDraft.primaryGoal; elements.onboardingProteinGoal.value=String(onboardingDraft.proteinGoal);
    renderOnboardingTasks(); renderOnboardingActivities();
    const radio=document.querySelector(`input[name="onboardingTrainingMode"][value="${onboardingDraft.trainingMode}"]`); if(radio) radio.checked=true;
    const scheduleRadio=document.querySelector(`input[name="onboardingScheduleType"][value="${onboardingDraft.scheduleType||"14day"}"]`); if(scheduleRadio) scheduleRadio.checked=true;
    elements.onboardingCustomScheduleLength.value=String(onboardingDraft.customScheduleLength||10);
    elements.onboardingCustomScheduleLengthRow.hidden=(onboardingDraft.scheduleType!=="custom");
    if(onboardingStep===5) renderOnboardingReview();
  }

  function renderOnboardingTasks(){
    [["mindTasks",elements.onboardingMindTasks],["bodyTasks",elements.onboardingBodyTasks],["spiritTasks",elements.onboardingSpiritTasks]].forEach(([field,box])=>{ box.replaceChildren(); onboardingDraft[field].forEach((text,i)=>{ const row=document.createElement("div"); row.className="onboarding-task-row"; const input=document.createElement("input"); input.value=text; input.maxLength=120; input.addEventListener("input",()=>onboardingDraft[field][i]=input.value); const del=document.createElement("button"); del.type="button"; del.className="text-button danger-text"; del.textContent="Remove"; del.addEventListener("click",()=>{onboardingDraft[field].splice(i,1);renderOnboardingTasks();}); row.append(input,del); box.appendChild(row); }); });
  }

  function renderOnboardingActivities(){ elements.onboardingActivityChoices.replaceChildren(); [...new Set([...ONBOARDING_ACTIVITIES,...onboardingDraft.activities])].forEach((name)=>{ const label=document.createElement("label"); label.className="onboarding-activity-choice"; const input=document.createElement("input"); input.type="checkbox"; input.checked=onboardingDraft.activities.includes(name); input.addEventListener("change",()=>{ onboardingDraft.activities=input.checked?[...new Set([...onboardingDraft.activities,name])]:onboardingDraft.activities.filter((x)=>x!==name); }); const span=document.createElement("span"); span.innerHTML=`<strong>${escapeHtml(name)}</strong><small>Smart metrics included</small>`; label.append(input,span); elements.onboardingActivityChoices.appendChild(label); }); }

  function syncOnboarding(){
    onboardingDraft.systemName=elements.onboardingSystemName.value.trim()||"My Command Center";
    onboardingDraft.mission=elements.onboardingMission.value.trim();
    onboardingDraft.primaryGoal=elements.onboardingPrimaryGoal.value.trim();
    onboardingDraft.proteinGoal=normalizeProteinGoal(elements.onboardingProteinGoal.value);
    onboardingDraft.trainingMode=document.querySelector('input[name="onboardingTrainingMode"]:checked')?.value||"template";
    onboardingDraft.scheduleType=document.querySelector('input[name="onboardingScheduleType"]:checked')?.value||"14day";
    onboardingDraft.customScheduleLength=clamp(Number(elements.onboardingCustomScheduleLength.value)||10,1,30);
    ["mindTasks","bodyTasks","spiritTasks"].forEach((f)=>onboardingDraft[f]=onboardingDraft[f].map((x)=>x.trim()).filter(Boolean));
  }
  function moveOnboarding(dir){
    syncOnboarding();
    if(dir<0 && onboardingStep===1){
      if(onboardingDraft?.editing){ hideOnboarding(); onboardingDraft=null; return; }
      onboardingStep=0; renderOnboarding(); return;
    }
    onboardingStep=clamp(onboardingStep+dir,0,5);
    renderOnboarding();
  }


  function getDraftScheduleLength(draft = onboardingDraft) {
    if (!draft) return 14;
    if (draft.scheduleType === "weekly") return 7;
    if (draft.scheduleType === "custom") return clamp(Number(draft.customScheduleLength) || 10, 1, 30);
    return 14;
  }

  function getTrainingScheduleLength() {
    const stored = Number(state.profile?.scheduleLength);
    if (Number.isFinite(stored) && stored >= 1 && stored <= 30) return Math.round(stored);
    const actual = Array.isArray(state.settings?.schedule) ? state.settings.schedule.length : 14;
    return clamp(actual || 14, 1, 30);
  }

  function getTrainingScheduleLabel() {
    const length = getTrainingScheduleLength();
    const type = state.profile?.scheduleType;
    if (type === "weekly" || length === 7) return "WEEKLY";
    if (type === "14day" || length === 14) return "14-DAY";
    return `${length}-DAY CUSTOM`;
  }

  function resizeTrainingSchedule(targetLength, mode = "preserve") {
    const length = clamp(Number(targetLength) || 14, 1, 30);
    const current = Array.isArray(state.settings.schedule) ? [...state.settings.schedule] : [];
    const defaults = Array.isArray(DEFAULT_SETTINGS.schedule) ? DEFAULT_SETTINGS.schedule : [];

    if (mode === "blank") {
      state.settings.schedule = Array(length).fill("Rest");
      return;
    }

    const next = current.slice(0, length);
    while (next.length < length) {
      next.push(defaults[next.length % Math.max(defaults.length, 1)] || "Rest");
    }
    state.settings.schedule = next;
  }

  function openWorkoutBuilderAfterSetup() {
    switchView("schedule");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (elements.workoutBuilderCard) {
          elements.workoutBuilderCard.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        setTimeout(() => elements.quickWorkoutName?.focus(), 350);
      });
    });
  }

  function renderOnboardingReview(){ syncOnboarding(); elements.onboardingReview.innerHTML=`<section><span class="data-label">SYSTEM</span><strong>${escapeHtml(onboardingDraft.systemName)}</strong><p>${escapeHtml(onboardingDraft.mission||onboardingDraft.primaryGoal||"Personal operating system")}</p></section><section><span class="data-label">MIND</span>${onboardingDraft.mindTasks.map((x)=>`<p>✓ ${escapeHtml(x)}</p>`).join("")||"<p>None</p>"}</section><section><span class="data-label">BODY</span>${onboardingDraft.bodyTasks.map((x)=>`<p>✓ ${escapeHtml(x)}</p>`).join("")||"<p>None</p>"}</section><section><span class="data-label">SPIRIT</span>${onboardingDraft.spiritTasks.map((x)=>`<p>✓ ${escapeHtml(x)}</p>`).join("")||"<p>None</p>"}</section><section><span class="data-label">ACTIVITIES</span><p>${onboardingDraft.activities.map(escapeHtml).join(" · ")||"None"}</p></section><section><span class="data-label">TRAINING</span><p>${escapeHtml(onboardingDraft.trainingMode)} · ${getDraftScheduleLength()}-day schedule · ${onboardingDraft.proteinGoal} g protein</p></section><section><span class="data-label">FULL FEATURES</span><p>Workout builder · AAR · Activity · Intel · Operations · Work Mode · AI SITREP</p></section>`; }

  function applyOnboardingDraft(){
    syncOnboarding();
    if(!onboardingDraft.editing && hasMeaningfulExistingData(state)){
      alert("Existing data was detected. Setup was cancelled to protect your Command Center.");
      hideOnboarding();
      return;
    }

    try{ if(typeof createSafetySnapshot==="function") createSafetySnapshot("pre-onboarding-apply"); }catch(_){}

    const previousMind = Array.isArray(state.settings.mindTemplates) ? [...state.settings.mindTemplates] : [];
    const previousSpirit = Array.isArray(state.settings.spiritTemplates) ? [...state.settings.spiritTemplates] : [];
    const today = getTodayRecord();
    const completionByText = new Map(
      [...(today.mindTasks||[]), ...(today.spiritTasks||[])].map((task)=>[String(task.text||"").trim().toLowerCase(), Boolean(task.completed)])
    );

    state.profile={
      ...(state.profile||{}),
      onboardingComplete:true,
      onboardingVersion:ONBOARDING_VERSION,
      createdAt:state.profile?.createdAt||new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      template:onboardingDraft.trainingMode==="template"?"operation-arete":"custom",
      systemName:onboardingDraft.systemName,
      mission:onboardingDraft.mission,
      primaryGoal:onboardingDraft.primaryGoal,
      bodyTasks:[...onboardingDraft.bodyTasks],
      selectedActivities:[...onboardingDraft.activities],
      trainingMode:onboardingDraft.trainingMode,
      scheduleType:onboardingDraft.scheduleType,
      scheduleLength:getDraftScheduleLength(),
      customScheduleLength:onboardingDraft.customScheduleLength
    };

    // The app's template engine expects strings, not objects.
    state.settings.mindTemplates=[...onboardingDraft.mindTasks];
    state.settings.spiritTemplates=[...onboardingDraft.spiritTasks];
    state.settings.proteinGoal=onboardingDraft.proteinGoal;

    // Apply edits to the current Dashboard immediately while preserving completion
    // for tasks whose text still matches.
    today.mindTasks=onboardingDraft.mindTasks.map((text)=>({
      ...createTask(text),
      completed:completionByText.get(String(text).trim().toLowerCase())||false
    }));
    today.spiritTasks=onboardingDraft.spiritTasks.map((text)=>({
      ...createTask(text),
      completed:completionByText.get(String(text).trim().toLowerCase())||false
    }));
    today.updatedAt=new Date().toISOString();

    // Add newly selected trackers. Never delete tracker history automatically.
    onboardingDraft.activities.forEach((name)=>{
      if(!state.activityTrackers[name]) state.activityTrackers[name]={name,entries:[],metrics:inferActivityMetrics(name)};
    });

    const targetScheduleLength=getDraftScheduleLength();
    const lengthChanged=(state.settings.schedule||[]).length!==targetScheduleLength;

    if(!onboardingDraft.editing){
      if(onboardingDraft.trainingMode==="template"){
        state.settings.schedule=[...DEFAULT_SETTINGS.schedule.slice(0,targetScheduleLength)];
        while(state.settings.schedule.length<targetScheduleLength){
          state.settings.schedule.push(DEFAULT_SETTINGS.schedule[state.settings.schedule.length%DEFAULT_SETTINGS.schedule.length]||"Rest");
        }
      }else{
        resizeTrainingSchedule(targetScheduleLength,"blank");
      }
    }else if(lengthChanged){
      resizeTrainingSchedule(targetScheduleLength,"preserve");
    }

    const wasEditing=Boolean(onboardingDraft.editing);
    const saved=saveState();
    if(!saved){
      alert("The Command Center could not save. Your previous data is still protected. Check available browser storage and try again.");
      return;
    }

    hideOnboarding();
    onboardingDraft=null;
    renderAll();
    if(state.profile.trainingMode==="build"){
      openWorkoutBuilderAfterSetup();
    }else{
      switchView("today");
    }
    alert(wasEditing ? "Command Center changes saved and applied." : "Your Command Center is ready.");
  }

  function renderProfileSummary(){
    if(!elements.profileSummary)return;
    const p=state.profile||{};
    const selected=Array.isArray(p.selectedActivities)&&p.selectedActivities.length?p.selectedActivities:Object.keys(state.activityTrackers||{});
    elements.profileSummary.innerHTML=`<p><span class="data-label">SYSTEM</span><strong>${escapeHtml(p.systemName||"My Command Center")}</strong></p><p><span class="data-label">MISSION</span>${escapeHtml(p.mission||p.primaryGoal||"Not set")}</p><p><span class="data-label">PROTOCOL</span>${state.settings.mindTemplates.length} Mind · ${(p.bodyTasks||[]).length} Body · ${state.settings.spiritTemplates.length} Spirit</p><p><span class="data-label">ACTIVITIES</span>${selected.map(escapeHtml).join(" · ")||"None"}</p>`;
  }

  function bindEvents() {

    elements.onboardingBeginButton.addEventListener("click",()=>{onboardingDraft=makeOnboardingDraft(false);onboardingStep=1;renderOnboarding();});
    elements.onboardingTemplateButton.addEventListener("click",()=>{onboardingDraft=makeOnboardingDraft(true);onboardingStep=1;renderOnboarding();});
    elements.onboardingRestoreInput.addEventListener("change",(event)=>{hideOnboarding(); if(typeof prepareRestoreFromFile==="function")prepareRestoreFromFile(event,"global");else importData(event);});
    elements.onboardingBackButton.addEventListener("click",()=>moveOnboarding(-1)); elements.onboardingNextButton.addEventListener("click",()=>moveOnboarding(1)); elements.onboardingCreateButton.addEventListener("click",applyOnboardingDraft);
    elements.onboardingAddCustomActivity.addEventListener("click",()=>{const name=elements.onboardingCustomActivity.value.trim();if(!name)return;if(!onboardingDraft.activities.includes(name))onboardingDraft.activities.push(name);elements.onboardingCustomActivity.value="";renderOnboardingActivities();});
    document.querySelectorAll(".onboarding-add-task").forEach((b)=>b.addEventListener("click",()=>{onboardingDraft[`${b.dataset.onboardingDomain}Tasks`].push("");renderOnboardingTasks();}));
    document.querySelectorAll('input[name="onboardingTrainingMode"]').forEach((i)=>i.addEventListener("change",()=>onboardingDraft.trainingMode=i.value));
    document.querySelectorAll('input[name="onboardingScheduleType"]').forEach((input)=>input.addEventListener("change",()=>{
      onboardingDraft.scheduleType=input.value;
      elements.onboardingCustomScheduleLengthRow.hidden=input.value!=="custom";
    }));
    elements.onboardingCustomScheduleLength.addEventListener("input",()=>{
      onboardingDraft.customScheduleLength=clamp(Number(elements.onboardingCustomScheduleLength.value)||10,1,30);
    });
    elements.editPersonalSetupButton.addEventListener("click",()=>showOnboarding(false,true));

    elements.startAiSitrepButton.addEventListener("click", openAiSitrep);
    elements.aiSitrepClose.addEventListener("click", () => {
      stopSitrepRecognition();
      if (confirm("Close SITREP? Unsaved proposed updates will be discarded.")) {
        sitrepSession = null;
        elements.aiSitrepDialog.close();
      }
    });
    elements.aiSitrepMicButton.addEventListener("click", startSitrepRecognition);
    elements.aiSitrepSendButton.addEventListener("click", submitSitrepAnswer);
    elements.aiSitrepTextInput.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submitSitrepAnswer();
    });
    elements.aiSitrepSaveAll.addEventListener("click", saveAiSitrep);
    elements.aiSitrepRestart.addEventListener("click", restartAiSitrep);
    elements.aiSitrepDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      stopSitrepRecognition();
      if (confirm("Close SITREP? Unsaved proposed updates will be discarded.")) {
        sitrepSession = null;
        elements.aiSitrepDialog.close();
      }
    });
    document.querySelectorAll(".nav-button").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.target));
    });
    elements.systemMenuButton.addEventListener("click", openCommandMenu);
    elements.commandNewCenter.addEventListener("click", (event) => {
      event.preventDefault();
      elements.systemConfirmDialog.close();
      showOnboarding(false, true);
    });
    elements.commandPersonalMode.addEventListener("click", (event) => {
      event.preventDefault();
      setAppMode("personal");
    });
    elements.commandWorkMode.addEventListener("click", (event) => {
      event.preventDefault();
      setAppMode("work");
    });
    elements.systemConfirmYes.addEventListener("click", () => {
      elements.systemConfirmDialog.close();
      switchView(appMode === "work" ? "work-settings" : "settings");
    });
    elements.commandGlobalBackup.addEventListener("click", exportGlobalBackup);
    elements.systemConfirmCancel.addEventListener("click", () => elements.systemConfirmDialog.close());
    elements.systemConfirmDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      elements.systemConfirmDialog.close();
    });

    elements.workQuickAddTask.addEventListener("click", () => openWorkTaskDialog());
    elements.workAddTaskButton.addEventListener("click", () => openWorkTaskDialog());
    elements.workTaskCancel.addEventListener("click", () => elements.workTaskDialog.close());
    elements.workTaskForm.addEventListener("submit", saveWorkTaskFromDialog);

    elements.workAddOperationButton.addEventListener("click", () => openWorkOperationDialog());
    elements.workOperationCancel.addEventListener("click", () => elements.workOperationDialog.close());
    elements.workOperationForm.addEventListener("submit", saveWorkOperationFromDialog);

    elements.workAddLogButton.addEventListener("click", openWorkLogDialog);
    elements.workLogCancel.addEventListener("click", () => elements.workLogDialog.close());
    elements.workLogForm.addEventListener("submit", saveWorkLogFromDialog);

    document.querySelectorAll(".work-filter").forEach((button) => {
      button.addEventListener("click", () => {
        workTaskFilter = button.dataset.workFilter || "open";
        document.querySelectorAll(".work-filter").forEach((item) => item.classList.toggle("active", item === button));
        renderWorkTasks();
      });
    });

    elements.saveWorkSettings.addEventListener("click", () => {
      workState.settings.defaultCategory = elements.workDefaultCategory.value.trim();
      saveWorkState();
      elements.workSettingsStatus.textContent = "Work settings saved.";
      setTimeout(() => { elements.workSettingsStatus.textContent = ""; }, 1500);
    });
    elements.exportWorkDataButton.addEventListener("click", exportWorkBackup);
    elements.resetWorkDataButton.addEventListener("click", resetWorkData);


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
    elements.quickWorkoutName.addEventListener("input", () => {
      if (hotSwapTemplateName && elements.quickWorkoutName.value.trim() !== hotSwapTemplateName) {
        hotSwapTemplateName = "";
        renderHotSwapTemplates();
      }
    });
    elements.quickWorkoutForm.addEventListener("submit", handleQuickWorkoutSubmit);
    elements.hotSwapAssignButton.addEventListener("click", assignHotSwapTemplate);
    elements.clearHotSwapSelection.addEventListener("click", clearHotSwapTemplate);

    elements.toggleScheduleButton.addEventListener("click", toggleScheduleVisibility);
    elements.taskDialogCancel.addEventListener("click", () => elements.taskDialog.close());
    elements.scheduleDialogCancel.addEventListener("click", () => elements.scheduleDialog.close());
    elements.workoutDialogCancel.addEventListener("click", () => elements.workoutDialog.close());
    elements.exerciseLogCancel.addEventListener("click", () => {
      loggingPastEntry = false;
      loggingExerciseName = null;
      loggingWorkoutName = null;
      elements.exerciseLogDialog.close();
    });
    elements.exerciseLogForm.addEventListener("submit", saveExerciseLog);
    elements.exerciseLogDialog.addEventListener("cancel", () => {
      loggingPastEntry = false;
      loggingExerciseName = null;
      loggingWorkoutName = null;
    });
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
    elements.activityMetricSelect.addEventListener("change", () => {
      const domain = state.settings.archiveDomain;
      const metrics = getTrackerMetrics(domain);
      const selectedName = elements.activityMetricSelect.value;
      const index = metrics.findIndex((metric) => metric.name === selectedName);
      const current = Number(state.settings.activitySlideByDomain?.[domain] || 0);
      if (index >= 0) {
        setActivityMetricSlide(index, index > current ? 1 : index < current ? -1 : 0);
      }
    });

    elements.activitySwipePrev.addEventListener("click", () => moveActivityMetricSlide(-1));
    elements.activitySwipeNext.addEventListener("click", () => moveActivityMetricSlide(1));
    elements.activityTrendWindow.addEventListener("change", renderActivityProgress);
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
    elements.openGlobalRestoreButton.addEventListener("click", () => elements.globalRestoreInput.click());
    elements.workOpenGlobalRestoreButton.addEventListener("click", () => elements.globalRestoreInput.click());
    elements.globalRestoreInput.addEventListener("change", (event) => prepareRestoreFromFile(event, "global"));
    elements.workRestoreInput.addEventListener("change", (event) => prepareRestoreFromFile(event, "work"));
    elements.restoreConfirmButton.addEventListener("click", executePendingRestore);
    elements.restoreCancelButton.addEventListener("click", closeRestorePreview);
    elements.restorePreviewDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeRestorePreview();
    });
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
    if (!Array.isArray(state.settings.schedule) || !state.settings.schedule.length) {
      state.settings.schedule = [...DEFAULT_SETTINGS.schedule];
    } else {
      const requestedLength = clamp(Number(state.profile?.scheduleLength) || state.settings.schedule.length || 14, 1, 30);
      state.settings.schedule = [...state.settings.schedule.slice(0, requestedLength)];
      while (state.settings.schedule.length < requestedLength) {
        state.settings.schedule.push(DEFAULT_SETTINGS.schedule[state.settings.schedule.length % DEFAULT_SETTINGS.schedule.length] || "Rest");
      }
    }

    if (!state.profile || typeof state.profile !== "object") state.profile = {};
    if (!state.profile.scheduleLength) state.profile.scheduleLength = state.settings.schedule.length || 14;
    if (!state.profile.scheduleType) {
      state.profile.scheduleType = state.profile.scheduleLength === 7 ? "weekly" : state.profile.scheduleLength === 14 ? "14day" : "custom";
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

      // Add any new smart preset metrics without deleting personalized metrics.
      const presetMetrics = inferActivityMetrics(tracker.name);
      const existingNames = new Set(
        tracker.metrics.map((metric) => String(metric?.name || "").trim().toLowerCase())
      );
      presetMetrics.forEach((metric) => {
        if (!existingNames.has(String(metric.name).trim().toLowerCase())) {
          tracker.metrics.push(structuredCloneSafe(metric));
        }
      });
    });
    if (!state.settings.intelRange) state.settings.intelRange = "365";
    if (!state.settings.activityMetricByDomain || typeof state.settings.activityMetricByDomain !== "object") {
      state.settings.activityMetricByDomain = {};
    }
    if (!state.settings.activitySlideByDomain || typeof state.settings.activitySlideByDomain !== "object") {
      state.settings.activitySlideByDomain = {};
    }
    if (!Number.isFinite(Number(state.settings.maxHeartRate))) state.settings.maxHeartRate = 0;
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
    const activeView = document.querySelector(".view.active")?.dataset.view || "today";
    renderHeaderForView(activeView);
    lastRenderedDateKey = getTodayKey();
    renderHeader();
    renderToday();
    renderSchedule();
    renderHistory();
    renderActivityTracker();
    renderIntel();
    renderSettings();
    renderWorkAll();
  }

  function renderHeader() {
    if (elements.brandTitle && appMode === "personal") {
      elements.brandTitle.textContent = String(state.profile?.systemName || "My Command Center").trim().toUpperCase();
    }
    const now = new Date();
    const cycleDay = calculateCycleDay(now);
    const completion = calculateCompletion(getTodayRecord());

    elements.currentDate.textContent = now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    elements.cycleDayHeader.textContent = `DAY ${cycleDay} / ${getTrainingScheduleLength()}`;
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


  const ACTIVITY_WORKOUT_ALIASES = [
    ["MMA", /\bmma\b/i],
    ["BJJ", /\b(bjj|jiu[\s-]?jitsu)\b/i],
    ["Boxing", /\bbox(ing)?\b/i],
    ["Running", /\b(run|running|cardio)\b/i],
    ["Ruck", /\bruck(ing)?\b/i],
    ["Swimming", /\b(swim|swimming)\b/i],
    ["Surfing", /\b(surf|surfing)\b/i],
    ["Mobility", /\b(mobility|recovery)\b/i]
  ];

  function activityDomainForWorkout(workoutName) {
    const name = String(workoutName || "");
    const match = ACTIVITY_WORKOUT_ALIASES.find(([, pattern]) => pattern.test(name));
    return match ? match[0] : null;
  }

  function isActivityWorkout(workoutName) {
    return Boolean(activityDomainForWorkout(workoutName));
  }

  function ensureActivityTracker(domain) {
    if (!domain) return null;
    if (!state.activityTrackers[domain]) {
      state.activityTrackers[domain] = {
        name: domain,
        entries: [],
        sessions: [],
        metrics: inferActivityMetrics(domain)
      };
      saveState();
    }
    return state.activityTrackers[domain];
  }

  function openDashboardActivityLog(workoutName) {
    const domain = activityDomainForWorkout(workoutName);
    if (!domain) return false;

    ensureActivityTracker(domain);
    state.settings.archiveDomain = domain;

    elements.activityEntryDomain.textContent = domain;
    elements.activityEntryActivity.value = domain;
    elements.activityEntryDate.value = getTodayKey();
    elements.activityEntryNote.value = `Logged from Dashboard · ${workoutName}`;
    elements.activityEntryStatus.textContent = "";
    buildActivitySessionFields(domain);
    elements.activityEntryDialog.showModal();

    requestAnimationFrame(() => {
      const firstField = elements.activitySessionFields.querySelector("input:not([readonly]), select");
      firstField?.focus();
    });

    return true;
  }

  function renderWorkoutDetails(workoutName) {
    const details = getWorkoutDetails(workoutName);
    elements.workoutDetails.replaceChildren();

    const activityDomain = activityDomainForWorkout(workoutName);

    if (activityDomain) {
      const list = document.createElement("div");
      list.className = "today-exercise-list";

      const row = document.createElement("div");
      row.className = "today-exercise-row dashboard-activity-row";

      const copy = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = details[0] || `${activityDomain} session`;

      const sub = document.createElement("small");
      const tracker = state.activityTrackers?.[activityDomain];
      const recentSession = Array.isArray(tracker?.sessions) && tracker.sessions.length
        ? [...tracker.sessions].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]
        : null;

      sub.textContent = recentSession
        ? `Last session: ${formatShortDate(recentSession.date)}`
        : `Log ${activityDomain} session metrics`;

      copy.append(name, sub);

      const logButton = document.createElement("button");
      logButton.type = "button";
      logButton.className = "button secondary log-set-button";
      logButton.textContent = "Log";
      logButton.addEventListener("click", () => openDashboardActivityLog(workoutName));

      row.append(copy, logButton);
      list.appendChild(row);
      elements.workoutDetails.appendChild(list);
      return;
    }

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
      sub.textContent = latest
        ? `Last: ${formatWeight(latest.weight)} × ${latest.reps} reps · ${formatShortDate(latest.date)}`
        : "No weight logged yet";

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
    const scheduleLength = getTrainingScheduleLength();
    const scheduleLabel = getTrainingScheduleLabel();
    elements.scheduleCycleEyebrow.textContent = `${scheduleLabel} BATTLE RHYTHM`;
    elements.scheduleCycleHelp.textContent = `This date is Day 1. The training schedule repeats every ${scheduleLength} day${scheduleLength === 1 ? "" : "s"}.`;
    elements.quickBuilderHelp.textContent = `Create a workout, add exercises, and assign it directly to any of the ${scheduleLength} schedule days.`;
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
      edit.addEventListener("click", (event) => {
        event.stopPropagation();
        openScheduleDialog(index);
      });
      item.addEventListener("click", () => openScheduleDialog(index));

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



  const GENERIC_HOT_SWAP_TEMPLATES = {
    "Lift": ["Complete planned strength session."],
    "Cardio": ["Complete planned conditioning session."],
    "MMA": ["Complete planned MMA session."],
    "BJJ": ["Complete planned BJJ session."],
    "Boxing": ["Complete planned boxing session."],
    "Run": ["Complete planned running session."],
    "Ruck": ["Complete planned ruck session."],
    "Mobility": ["Complete planned mobility / recovery session."],
    "Recovery": ["Recovery, mobility, or low-intensity movement."],
    "Rest": ["Rest day."]
  };

  let hotSwapTemplateName = "";

  function getHotSwapLibrary() {
    return {
      ...GENERIC_HOT_SWAP_TEMPLATES,
      ...DEFAULT_WORKOUTS,
      ...(state.customWorkouts || {})
    };
  }

  function renderHotSwapTemplates() {
    if (!elements.genericTemplateChips || !elements.savedTemplateChips || !elements.hotSwapDayGrid) return;

    elements.genericTemplateChips.replaceChildren();
    elements.savedTemplateChips.replaceChildren();

    Object.keys(GENERIC_HOT_SWAP_TEMPLATES).forEach((name) => {
      // Avoid duplicates when a generic type also exists in saved/protected templates.
      const duplicateSaved = DEFAULT_WORKOUTS[name] || state.customWorkouts?.[name];
      if (!duplicateSaved) {
        elements.genericTemplateChips.appendChild(createHotSwapChip(name, "generic"));
      }
    });

    const savedNames = [
      ...Object.keys(DEFAULT_WORKOUTS),
      ...Object.keys(state.customWorkouts || {})
    ];

    [...new Set(savedNames)].forEach((name) => {
      elements.savedTemplateChips.appendChild(
        createHotSwapChip(name, state.customWorkouts?.[name] ? "custom" : "protected")
      );
    });

    renderHotSwapDayGrid();
    renderHotSwapSelection();
  }

  function createHotSwapChip(name, source) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "template-chip";
    button.dataset.templateName = name;
    button.dataset.templateSource = source;
    button.textContent = name;
    button.setAttribute("aria-pressed", String(hotSwapTemplateName === name));
    if (hotSwapTemplateName === name) button.classList.add("selected");

    button.addEventListener("click", () => {
      selectHotSwapTemplate(name);
    });

    return button;
  }

  function selectHotSwapTemplate(name) {
    const library = getHotSwapLibrary();
    if (!library[name]) return;

    elements.hotSwapStatus.textContent = "";
    renderHotSwapTemplates();
  }

  function clearHotSwapTemplate() {
    hotSwapTemplateName = "";
    elements.hotSwapStatus.textContent = "";
    elements.hotSwapDayGrid?.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.checked = false;
    });
    renderHotSwapTemplates();
  }

  function renderHotSwapDayGrid() {
    elements.hotSwapDayGrid.replaceChildren();

    state.settings.schedule.forEach((assignment, index) => {
      const label = document.createElement("label");
      label.className = "hot-swap-day";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = String(index);
      checkbox.dataset.hotSwapDay = "true";

      const copy = document.createElement("span");
      copy.innerHTML = `<strong>DAY ${index + 1}</strong><small>${escapeHtml(assignment)}</small>`;

      label.append(checkbox, copy);
      elements.hotSwapDayGrid.appendChild(label);
    });
  }

  function renderHotSwapSelection() {
    const library = getHotSwapLibrary();
    const selected = hotSwapTemplateName && library[hotSwapTemplateName];

    elements.hotSwapSelection.hidden = !selected;
    elements.hotSwapAssignButton.disabled = !selected;

    if (!selected) {
      elements.hotSwapSelectedName.textContent = "—";
      elements.hotSwapSelectedDetail.textContent = "";
      return;
    }

    elements.hotSwapSelectedName.textContent = hotSwapTemplateName;
    const count = Array.isArray(selected) ? selected.length : 0;
    const source = state.customWorkouts?.[hotSwapTemplateName]
      ? "Custom workout"
      : DEFAULT_WORKOUTS[hotSwapTemplateName]
        ? "Protected template"
        : "Quick type";
    elements.hotSwapSelectedDetail.textContent =
      `${source}${count ? ` · ${count} item${count === 1 ? "" : "s"}` : ""}`;
  }

  function assignHotSwapTemplate() {
    const library = getHotSwapLibrary();
    if (!hotSwapTemplateName || !library[hotSwapTemplateName]) {
      elements.hotSwapStatus.textContent = "Select a template first.";
      return;
    }

    const selectedDays = [...elements.hotSwapDayGrid.querySelectorAll('input[type="checkbox"]:checked')];
    if (!selectedDays.length) {
      elements.hotSwapStatus.textContent = "Tap at least one day to assign.";
      return;
    }

    const selectedName = hotSwapTemplateName;

    // Generic quick types stay lightweight schedule labels.
    // Do not create duplicate custom workouts just because they were assigned.
    selectedDays.forEach((checkbox) => {
      const index = Number(checkbox.value);
      if (Number.isInteger(index) && state.settings.schedule[index] !== undefined) {
        state.settings.schedule[index] = selectedName;
      }
    });

    const count = selectedDays.length;
    saveState();

    // Refresh the schedule and assignment grid, then clear selected days for fast repeat use.
    renderSchedule();
    hotSwapTemplateName = selectedName;
    renderHotSwapTemplates();

    elements.hotSwapDayGrid.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.checked = false;
    });

    elements.hotSwapStatus.textContent =
      `${selectedName} assigned to ${count} day${count === 1 ? "" : "s"}.`;
  }

  function renderQuickWorkoutBuilder() {
    renderHotSwapTemplates();

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
    hotSwapTemplateName = name;
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
    item.className = "workout-library-item compact-workout-folder";

    const top = document.createElement("div");
    top.className = "compact-workout-top";

    const copy = document.createElement("div");
    copy.className = "compact-workout-copy";

    const title = document.createElement("strong");
    title.textContent = name;

    const count = document.createElement("small");
    count.textContent = `${exercises.length} item${exercises.length === 1 ? "" : "s"}`;

    copy.append(title, count);

    const actions = document.createElement("div");
    actions.className = "compact-workout-actions";

    const assign = document.createElement("button");
    assign.type = "button";
    assign.className = "text-button";
    assign.textContent = "Assign";
    assign.addEventListener("click", () => {
      hotSwapTemplateName = name;
      renderHotSwapTemplates();
      elements.hotSwapSelection.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    actions.appendChild(assign);

    const duplicate = document.createElement("button");
    duplicate.type = "button";
    duplicate.className = "text-button";
    duplicate.textContent = "Duplicate";
    duplicate.addEventListener("click", () => duplicateWorkout(name));
    actions.appendChild(duplicate);

    if (!isOriginal) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "text-button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => openWorkoutDialog(name));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "text-button danger-text";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => deleteCustomWorkout(name));

      actions.append(edit, remove);
    }

    top.append(copy, actions);
    item.appendChild(top);
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
    const currentCycleDay = calculateCycleDay(new Date());
    loggingWorkoutName = state.settings.schedule[currentCycleDay - 1] || "Unassigned";
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
    loggingWorkoutName = null;
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

    const exerciseName = loggingPastEntry
      ? elements.exerciseNameInput.value.trim()
      : String(loggingExerciseName || "").trim();
    const dateKey = elements.exerciseDateInput.value;
    const weight = Number(elements.exerciseWeightInput.value);
    const reps = Number(elements.exerciseRepsInput.value);
    const sets = Number(elements.exerciseSetsInput.value);

    if (
      !exerciseName ||
      !dateKey ||
      !Number.isFinite(weight) ||
      weight < 0 ||
      !Number.isInteger(reps) ||
      reps < 1 ||
      !Number.isInteger(sets) ||
      sets < 1
    ) {
      elements.exerciseLogStatus.textContent =
        "Choose an exercise and date, then enter valid weight, reps, and sets.";
      return;
    }

    const selectedDate = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(selectedDate.getTime())) {
      elements.exerciseLogStatus.textContent = "Choose a valid workout date.";
      return;
    }

    const scheduleIndex = calculateCycleDay(selectedDate) - 1;
    const workoutName = loggingWorkoutName ||
      state.settings.schedule[scheduleIndex] ||
      "Unassigned";

    const log = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: selectedDate.toISOString(),
      weight,
      reps,
      sets,
      note: elements.exerciseLogNote.value.trim(),
      workout: workoutName,
      scheduleDay: scheduleIndex + 1
    };

    if (!Array.isArray(state.exerciseLogs[exerciseName])) {
      state.exerciseLogs[exerciseName] = [];
    }

    state.exerciseLogs[exerciseName].push(log);

    // Make the newly logged exercise the active progress selection.
    // This matters for a first-ever log because the select option does not
    // exist until Activity is rendered again.
    state.settings.progressExercise = exerciseName;

    // Attach a lightweight reference to the daily record so same-day
    // workout swaps still retain the exact lift session that was performed.
    const dayKey = dateKey;
    if (!state.daily[dayKey]) {
      state.daily[dayKey] = createDailyRecord(dayKey);
    }
    if (!Array.isArray(state.daily[dayKey].liftLogIds)) {
      state.daily[dayKey].liftLogIds = [];
    }
    state.daily[dayKey].liftLogIds.push(log.id);
    state.daily[dayKey].updatedAt = new Date().toISOString();

    const saved = saveState();
    if (saved === false) {
      // Roll back the in-memory insert if persistence reports failure.
      state.exerciseLogs[exerciseName] =
        state.exerciseLogs[exerciseName].filter((entry) => entry.id !== log.id);
      state.daily[dayKey].liftLogIds =
        state.daily[dayKey].liftLogIds.filter((id) => id !== log.id);
      elements.exerciseLogStatus.textContent =
        "The lift could not be saved. Your previous data is unchanged.";
      return;
    }

    elements.exerciseLogStatus.textContent =
      `${formatWeight(weight)} × ${reps} saved to ${workoutName}.`;

    loggingPastEntry = false;
    loggingExerciseName = null;
    loggingWorkoutName = null;

    // Re-render the Activity tracker so a brand-new exercise immediately
    // appears in the progress selector/chart. Previously the code tried to
    // select an option that did not exist yet, making a successful first log
    // look like it never registered.
    renderToday();
    renderActivityTracker();
    renderHistory();

    setTimeout(() => {
      if (elements.exerciseLogDialog.open) {
        elements.exerciseLogDialog.close();
      }
    }, 180);
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

  function renderActivityTracker() {
    const exercises = Object.keys(state.exerciseLogs || {})
      .filter((name) => Array.isArray(state.exerciseLogs[name]) && state.exerciseLogs[name].length)
      .sort();

    const previous = state.settings.progressExercise || elements.progressExerciseSelect.value;
    elements.progressExerciseSelect.replaceChildren();

    if (!exercises.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No exercises logged";
      elements.progressExerciseSelect.appendChild(option);
      elements.progressExerciseSelect.disabled = true;
    } else {
      elements.progressExerciseSelect.disabled = false;
      exercises.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        elements.progressExerciseSelect.appendChild(option);
      });
      elements.progressExerciseSelect.value = exercises.includes(previous) ? previous : exercises[0];
      state.settings.progressExercise = elements.progressExerciseSelect.value;
    }

    renderProgressDomains();
    renderProgressChart();
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
        if (!state.settings.activitySlideByDomain || typeof state.settings.activitySlideByDomain !== "object") {
          state.settings.activitySlideByDomain = {};
        }
        if (!state.settings.activityMetricByDomain || typeof state.settings.activityMetricByDomain !== "object") {
          state.settings.activityMetricByDomain = {};
        }
        saveState();
        renderActivityTracker();
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
      { name: "Sessions", unit: "sessions", type: "number" },
      { name: "Training time", unit: "min", type: "number" },
      { name: "Performance", unit: "/10", type: "number" }
    ]);
  }

  function parseTrackerMetrics(text, fallbackName) {
    const parsed = String(text || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, unit = ""] = line.split("|").map((part) => part.trim());
        return { name, unit, type: "number" };
      })
      .filter((metric) => metric.name);
    return parsed.length ? parsed : inferActivityMetrics(fallbackName);
  }

  function getTrackerMetrics(domain) {
    const tracker = state.activityTrackers?.[domain];
    if (!tracker) return [];
    const configured = Array.isArray(tracker.metrics) && tracker.metrics.length
      ? tracker.metrics
      : inferActivityMetrics(domain);

    const map = new Map();
    configured.forEach((metric) => {
      const key = String(metric?.name || "").trim().toLowerCase();
      if (!key) return;
      map.set(key, { type: "number", unit: "", ...structuredCloneSafe(metric) });
    });

    (tracker.entries || []).forEach((entry) => {
      const key = String(entry.metric || "").trim().toLowerCase();
      if (!key || map.has(key)) return;
      map.set(key, { name: entry.metric, unit: entry.unit || "", type: "number" });
    });

    return [...map.values()];
  }

  function ensureTrackerMetric(tracker, metric) {
    if (!tracker || !metric?.name) return;
    if (!Array.isArray(tracker.metrics)) tracker.metrics = [];
    const exists = tracker.metrics.some(
      (item) => String(item?.name || "").trim().toLowerCase() === String(metric.name).trim().toLowerCase()
    );
    if (!exists) tracker.metrics.push(structuredCloneSafe(metric));
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

    // Immediately refresh the Activity workspace so a newly created folder
    // appears without requiring the user to switch tabs or views.
    renderHistory();
    if (typeof renderActivityWorkspace === "function") renderActivityWorkspace();
    if (typeof renderActivity === "function") renderActivity();
  }

  function formatPaceMinutes(minutesPerUnit) {
    if (!Number.isFinite(minutesPerUnit) || minutesPerUnit <= 0) return "";
    const whole = Math.floor(minutesPerUnit);
    let seconds = Math.round((minutesPerUnit - whole) * 60);
    let adjusted = whole;
    if (seconds === 60) {
      adjusted += 1;
      seconds = 0;
    }
    return `${adjusted}:${String(seconds).padStart(2, "0")}`;
  }

  function paceNumberFromTimeDistance(timeMinutes, distance, domain) {
    const t = Number(timeMinutes);
    const d = Number(distance);
    if (!Number.isFinite(t) || !Number.isFinite(d) || t <= 0 || d <= 0) return null;
    if (String(domain).toLowerCase().includes("swimming")) {
      return t / (d / 100);
    }
    return t / d;
  }

  function calculateDerivedActivityMetrics(domain, values) {
    const derived = {};
    const pace = paceNumberFromTimeDistance(values.Time, values.Distance, domain);
    if (pace !== null) {
      derived.Pace = pace;
    }


    return derived;
  }

  function buildActivitySessionFields(domain) {
    const tracker = state.activityTrackers?.[domain];
    if (!tracker) return;
    elements.activitySessionFields.replaceChildren();

    const metrics = getTrackerMetrics(domain);
    metrics.forEach((metric) => {
      const row = document.createElement("div");
      row.className = "activity-session-field";

      const copy = document.createElement("div");
      copy.className = "activity-session-copy";
      const label = document.createElement("label");
      label.htmlFor = `activityMetric-${slugifyMetric(metric.name)}`;
      label.textContent = metric.name;

      const helper = document.createElement("small");
      helper.textContent = metric.type === "calculated"
        ? metric.name === "Pace"
          ? "Calculated automatically after Time and Distance are entered."
          : "Calculated automatically."
        : metric.type === "effort"
          ? "Choose how the run felt; the app converts it to Zone 1–5."
          : metric.unit
            ? metric.unit
            : "Custom metric";

      copy.append(label, helper);

      const control = document.createElement("div");
      control.className = "activity-session-control";

      let input;
      if (metric.type === "effort") {
        input = document.createElement("select");
        input.id = `activityMetric-${slugifyMetric(metric.name)}`;
        input.dataset.metricName = metric.name;
        input.dataset.metricUnit = metric.unit || "zone";
        input.dataset.metricType = "effort";
        [
          ["", "How did the run feel?"],
          ["1", "Very easy · Zone 1"],
          ["2", "Easy / sustainable · Zone 2"],
          ["3", "Moderate / steady · Zone 3"],
          ["4", "Hard · Zone 4"],
          ["5", "Very hard / max effort · Zone 5"]
        ].forEach(([value, labelText]) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = labelText;
          input.appendChild(option);
        });
      } else {
        input = document.createElement("input");
        input.id = `activityMetric-${slugifyMetric(metric.name)}`;
        input.dataset.metricName = metric.name;
        input.dataset.metricUnit = metric.unit || "";
        input.dataset.metricType = metric.type || "number";
        input.type = "number";
        input.step = "any";
        input.inputMode = "decimal";
        input.placeholder = metric.type === "calculated" ? "AUTO" : metric.unit || "value";
        if (metric.type === "calculated") {
          input.readOnly = true;
          input.classList.add("calculated-field");
        }
      }

      const unit = document.createElement("span");
      unit.textContent = metric.type === "effort" ? "" : (metric.unit || "");

      control.append(input, unit);
      row.append(copy, control);
      elements.activitySessionFields.appendChild(row);
    });

    elements.activitySessionFields.querySelectorAll("input:not([readonly])").forEach((input) => {
      input.addEventListener("input", () => updateCalculatedSessionFields(domain));
    });

    if (isRunningDomain(domain)) {
      renderHeartRateZonePanel();
    }
  }

  function slugifyMetric(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function sessionFieldValues() {
    const values = {};
    elements.activitySessionFields.querySelectorAll("[data-metric-name]").forEach((input) => {
      const raw = input.value.trim();
      if (raw === "") return;
      const value = Number(raw);
      if (Number.isFinite(value)) values[input.dataset.metricName] = value;
    });
    return values;
  }

  function updateCalculatedSessionFields(domain) {
    const values = sessionFieldValues();
    const derived = calculateDerivedActivityMetrics(domain, values);

    Object.entries(derived).forEach(([metricName, value]) => {
      const input = [...elements.activitySessionFields.querySelectorAll("[data-metric-name]")]
        .find((field) => field.dataset.metricName === metricName);
      if (!input) return;
      input.value = String(Math.round(value * 100) / 100);
    });

    const paceInput = [...elements.activitySessionFields.querySelectorAll("[data-metric-name]")]
      .find((field) => field.dataset.metricName === "Pace");
    if (paceInput && Number.isFinite(derived.Pace)) {
      paceInput.title = `Pace: ${formatPaceMinutes(derived.Pace)}`;
    }
  }

  function openActivityEntryDialog() {
    const domain = state.settings.archiveDomain;
    if (!domain || domain === "Weightlifting") return;

    elements.activityEntryDomain.textContent = domain;
    elements.activityEntryActivity.value = domain;
    elements.activityEntryDate.value = getTodayKey();
    elements.activityEntryNote.value = "";
    elements.activityEntryStatus.textContent = "";
    buildActivitySessionFields(domain);
    elements.activityEntryDialog.showModal();
  }

  function saveActivityEntry(event) {
    event.preventDefault();

    const dialogDomain = String(elements.activityEntryActivity.value || elements.activityEntryDomain.textContent || "").trim();
    const domain = dialogDomain || state.settings.archiveDomain;
    const tracker = state.activityTrackers?.[domain];
    if (!tracker) {
      elements.activityEntryStatus.textContent = "Activity tracker is unavailable. Close and reopen the log.";
      return;
    }

    const dateKey = elements.activityEntryDate.value;
    const values = sessionFieldValues();
    if (!dateKey) {
      elements.activityEntryStatus.textContent = "Select a date.";
      return;
    }

    // Fill calculated metrics before save.
    const derived = calculateDerivedActivityMetrics(domain, values);
    Object.assign(values, derived);

    const metricMap = new Map(getTrackerMetrics(domain).map((metric) => [metric.name, metric]));
    const filledMetrics = Object.entries(values).filter(([, value]) => Number.isFinite(Number(value)));
    if (!filledMetrics.length) {
      elements.activityEntryStatus.textContent = "Enter at least one metric.";
      return;
    }

    const sessionId = `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const sessionDate = new Date(`${dateKey}T12:00:00`).toISOString();
    const note = elements.activityEntryNote.value.trim();

    filledMetrics.forEach(([metricName, value]) => {
      const metric = metricMap.get(metricName) || { name: metricName, unit: "", type: "number" };
      ensureTrackerMetric(tracker, metric);

      const entry = {
        id: `${sessionId}-${slugifyMetric(metricName)}`,
        sessionId,
        date: sessionDate,
        metric: metricName,
        value: Number(value),
        unit: metric.unit || "",
        note
      };

      if (metricName === "Heart rate") {
        const zone = zoneForHeartRate(Number(value));
        if (zone) {
          entry.zone = zone.zone;
          entry.zoneName = zone.name;
        }
      }

      tracker.entries.push(entry);
    });

    tracker.sessions = Array.isArray(tracker.sessions) ? tracker.sessions : [];
    tracker.sessions.push({
      id: sessionId,
      date: sessionDate,
      note,
      metrics: Object.fromEntries(filledMetrics.map(([name, value]) => [name, Number(value)]))
    });

    const saved = saveState();
    if (saved === false) {
      elements.activityEntryStatus.textContent = "The activity session could not be saved.";
      return;
    }

    state.settings.archiveDomain = domain;
    elements.activityEntryStatus.textContent = `${domain} session saved.`;

    renderToday();
    renderHistory();
    renderActivityTracker();

    setTimeout(() => {
      if (elements.activityEntryDialog.open) elements.activityEntryDialog.close();
    }, 180);
  }

  function activityTrendDays() {
    const rawValue = elements.activityTrendWindow?.value || "42";
    if (rawValue === "all") return 0;
    const raw = Number(rawValue);
    return Number.isFinite(raw) && raw > 0 ? raw : 42;
  }

  function metricLogsForWindow(tracker, metricName, days) {
    const all = (tracker.entries || [])
      .filter((entry) => entry.metric === metricName)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    if (!all.length || !days) return all;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days + 1);
    const cutoffKey = formatDateKey(cutoff);
    return all.filter((entry) => String(entry.date || "").slice(0, 10) >= cutoffKey);
  }

  function trendSummaryForLogs(metric, logs) {
    if (!logs.length) return `No ${metric.name} entries in this period.`;
    if (logs.length === 1) {
      const value = logs[0].value;
      return `${metric.name}: one entry · ${formatMetricValue(metric, value)}.`;
    }

    const first = Number(logs[0].value);
    const last = Number(logs[logs.length - 1].value);
    const delta = last - first;
    const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    const deltaText = formatMetricValue(metric, Math.abs(delta));

    if (metric.name === "Pace") {
      const faster = delta < 0;
      return `${metric.name}: ${faster ? "faster" : delta > 0 ? "slower" : "unchanged"} by ${formatPaceMinutes(Math.abs(delta))} over the selected period.`;
    }

    return `${metric.name}: ${direction} ${deltaText} from first to latest entry.`;
  }

  function formatMetricValue(metric, value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    if (metric.name === "Pace") return formatPaceMinutes(number);
    if (metric.name === "Effort zone") {
      const labels = {
        1: "Zone 1 · Very easy",
        2: "Zone 2 · Easy",
        3: "Zone 3 · Moderate",
        4: "Zone 4 · Hard",
        5: "Zone 5 · Very hard"
      };
      return labels[Math.round(number)] || `Zone ${Math.round(number)}`;
    }
    return `${Math.round(number * 100) / 100}${metric.unit ? ` ${metric.unit}` : ""}`;
  }

  function renderActivityProgress() {
    const domain = state.settings.archiveDomain;
    if (!domain || domain === "Weightlifting") return;

    const tracker = state.activityTrackers?.[domain] || { entries: [], metrics: [] };
    const metrics = getTrackerMetrics(domain);
    elements.activityProgressHeading.textContent = `${domain} progress`;

    elements.activityMetricSelect.replaceChildren();
    metrics.forEach((metric) => {
      const option = document.createElement("option");
      option.value = metric.name;
      option.textContent = metric.name;
      elements.activityMetricSelect.appendChild(option);
    });

    const selectedMetric = state.settings.activityMetricByDomain?.[domain];
    if (metrics.some((metric) => metric.name === selectedMetric)) {
      elements.activityMetricSelect.value = selectedMetric;
    } else if (metrics[0]) {
      elements.activityMetricSelect.value = metrics[0].name;
      state.settings.activityMetricByDomain[domain] = metrics[0].name;
    }

    const selectedByName = metrics.findIndex(
      (metric) => metric.name === state.settings.activityMetricByDomain?.[domain]
    );
    const storedSlide = Number(state.settings.activitySlideByDomain?.[domain]);
    const preferredIndex = selectedByName >= 0
      ? selectedByName
      : Number.isInteger(storedSlide) && storedSlide >= 0 && storedSlide < metrics.length
        ? storedSlide
        : 0;
    const activeIndex = Math.max(0, Math.min(metrics.length - 1, preferredIndex));
    state.settings.activitySlideByDomain[domain] = activeIndex;

    elements.activitySwipeTrack.replaceChildren();
    elements.activitySwipeDots.replaceChildren();

    const days = activityTrendDays();

    metrics.forEach((metric, index) => {
      const slide = document.createElement("article");
      slide.className = `activity-metric-slide${index === activeIndex ? " active" : ""}`;
      if (index === activeIndex && activitySwipeDirection !== 0) {
        slide.classList.add(activitySwipeDirection > 0 ? "slide-in-right" : "slide-in-left");
      }
      slide.dataset.metricIndex = String(index);

      const logs = metricLogsForWindow(tracker, metric.name, days);

      const head = document.createElement("div");
      head.className = "activity-slide-header";
      head.innerHTML = `
        <div>
          <span class="data-label">${escapeHtml(domain.toUpperCase())}</span>
          <h4>${escapeHtml(metric.name)}</h4>
        </div>
        <span class="activity-slide-count">${logs.length} entries</span>
      `;

      const trend = document.createElement("p");
      trend.className = "activity-slide-trend";
      trend.textContent = trendSummaryForLogs(metric, logs);

      const chartWrap = document.createElement("div");
      chartWrap.className = "chart-wrap activity-slide-chart-wrap";
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 360;
      canvas.setAttribute("aria-label", `${metric.name} trend graph`);
      chartWrap.appendChild(canvas);

      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = `No ${metric.name} entries in this period.`;
      empty.hidden = logs.length > 0;

      const recentList = document.createElement("div");
      recentList.className = "progress-log-list";
      [...logs].reverse().slice(0, 6).forEach((log) => {
        const row = document.createElement("div");
        row.className = "progress-log-row";
        const zoneLabel = log.metric === "Heart rate" && log.zone
          ? ` · Zone ${log.zone}${log.zoneName ? ` (${log.zoneName})` : ""}`
          : "";
        const main = document.createElement("div");
        main.className = "progress-log-main";
        main.innerHTML = `
          <span>${escapeHtml(formatShortDate(log.date))}</span>
          <strong>${escapeHtml(formatMetricValue(metric, log.value))}</strong>
          <small>${escapeHtml(log.note || metric.name)}${escapeHtml(zoneLabel)}</small>
        `;

        const actions = document.createElement("div");
        actions.className = "progress-log-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "text-button progress-log-edit";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editActivityEntry(domain, log.id));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "text-button danger-text progress-log-delete";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteActivityEntry(domain, log.id));

        actions.append(editButton, deleteButton);
        row.append(main, actions);
        recentList.appendChild(row);
      });

      slide.append(head, trend, chartWrap, empty, recentList);
      elements.activitySwipeTrack.appendChild(slide);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `activity-swipe-dot${index === activeIndex ? " active" : ""}`;
      dot.setAttribute("aria-label", `Show ${metric.name}`);
      dot.addEventListener("click", () => {
        const currentIndex = Number(state.settings.activitySlideByDomain?.[domain] || 0);
        setActivityMetricSlide(index, index > currentIndex ? 1 : index < currentIndex ? -1 : 0);
      });
      elements.activitySwipeDots.appendChild(dot);

      requestAnimationFrame(() => {
        if (logs.length) drawActivityChartOnCanvas(canvas, logs, metric);
      });
    });

    elements.activitySwipePrev.disabled = activeIndex <= 0;
    elements.activitySwipeNext.disabled = activeIndex >= metrics.length - 1;
    if (metrics[activeIndex]) {
      elements.activityMetricSelect.value = metrics[activeIndex].name;
      state.settings.activityMetricByDomain[domain] = metrics[activeIndex].name;
    }

    elements.activityProgressEmpty.hidden = metrics.length > 0;
    elements.activityProgressChart.hidden = true;
    elements.activityProgressLogList.replaceChildren();
    const periodLabel =
      days === 0 ? "your lifetime history" :
      days === 42 ? "6 weeks" :
      days === 365 ? "1 year" :
      `${days} days`;

    elements.activityTrendSummary.textContent = metrics[activeIndex]
      ? `${metrics[activeIndex].name} trends over ${periodLabel}. Swipe left/right for other metrics.`
      : "Add metrics to begin tracking.";

    bindActivitySwipeGesture();

    if (isRunningDomain(domain)) renderHeartRateZonePanel();
    else if (elements.runningHeartRatePanel) elements.runningHeartRatePanel.hidden = true;
  }

  function findActivityEntry(domain, entryId) {
    const tracker = state.activityTrackers?.[domain];
    if (!tracker) return { tracker: null, entry: null, index: -1 };
    const index = (tracker.entries || []).findIndex((entry) => entry.id === entryId);
    return {
      tracker,
      entry: index >= 0 ? tracker.entries[index] : null,
      index
    };
  }

  function editActivityEntry(domain, entryId) {
    const { tracker, entry, index } = findActivityEntry(domain, entryId);
    if (!tracker || !entry || index < 0) return;

    const metric = getTrackerMetrics(domain).find((item) => item.name === entry.metric) || {
      name: entry.metric,
      unit: entry.unit || "",
      type: "number"
    };

    const dateKey = String(entry.date || "").slice(0, 10);
    const valueLabel = metric.name === "Pace"
      ? `${formatPaceMinutes(Number(entry.value))} (${Math.round(Number(entry.value) * 100) / 100} min/unit)`
      : String(entry.value);

    const nextDate = prompt(`Edit ${metric.name} date (YYYY-MM-DD)`, dateKey);
    if (nextDate === null) return;

    let nextValue;
    if (metric.name === "Effort zone") {
      const next = prompt("Effort zone: 1 Very easy, 2 Easy, 3 Moderate, 4 Hard, 5 Very hard", String(entry.value));
      if (next === null) return;
      nextValue = Number(next);
      if (!Number.isInteger(nextValue) || nextValue < 1 || nextValue > 5) {
        alert("Effort zone must be 1 through 5.");
        return;
      }
    } else {
      const next = prompt(`Edit ${metric.name}. Current: ${valueLabel}`, String(entry.value));
      if (next === null) return;
      nextValue = Number(next);
      if (!Number.isFinite(nextValue)) {
        alert("Enter a valid number.");
        return;
      }
    }

    const nextNote = prompt("Edit note", entry.note || "");
    if (nextNote === null) return;

    entry.date = new Date(`${nextDate}T12:00:00`).toISOString();
    entry.value = nextValue;
    entry.note = nextNote.trim();

    // If this is part of a grouped session, keep the session mirror synchronized.
    if (entry.sessionId && Array.isArray(tracker.sessions)) {
      const session = tracker.sessions.find((item) => item.id === entry.sessionId);
      if (session) {
        session.date = entry.date;
        session.note = entry.note;
        session.metrics = session.metrics && typeof session.metrics === "object" ? session.metrics : {};
        session.metrics[entry.metric] = nextValue;
      }
    }

    saveState();
    renderHistory();
    renderActivityProgress();
  }

  function deleteActivityEntry(domain, entryId) {
    const { tracker, entry, index } = findActivityEntry(domain, entryId);
    if (!tracker || !entry || index < 0) return;

    const label = `${entry.metric}: ${entry.value}${entry.unit ? ` ${entry.unit}` : ""} on ${formatShortDate(entry.date)}`;
    if (!confirm(`Delete this activity entry?\n\n${label}`)) return;

    tracker.entries.splice(index, 1);

    if (entry.sessionId && Array.isArray(tracker.sessions)) {
      const session = tracker.sessions.find((item) => item.id === entry.sessionId);
      if (session?.metrics && typeof session.metrics === "object") {
        delete session.metrics[entry.metric];
        if (!Object.keys(session.metrics).length) {
          tracker.sessions = tracker.sessions.filter((item) => item.id !== entry.sessionId);
        }
      }
    }

    saveState();
    renderHistory();
    renderActivityProgress();
  }

  function drawActivityChartOnCanvas(canvas, logs, metric) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.floor(rect.width || 720));
    const height = Math.max(220, Math.floor(rect.height || 300));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const pad = { left: 52, right: 16, top: 22, bottom: 36 };
    const values = logs.map((log) => Number(log.value)).filter(Number.isFinite);
    if (!values.length) return;

    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= Math.max(1, Math.abs(min) * .05);
      max += Math.max(1, Math.abs(max) * .05);
    }
    const range = max - min || 1;

    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.strokeStyle = "rgba(150,150,165,.28)";
    ctx.fillStyle = "#9696a5";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = pad.top + ((height - pad.top - pad.bottom) * i / 4);
      const value = max - range * i / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      const label = metric.name === "Pace" ? formatPaceMinutes(value) : String(Math.round(value * 100) / 100);
      ctx.fillText(label, 4, y + 4);
    }

    const xFor = (i) => logs.length === 1
      ? (pad.left + width - pad.right) / 2
      : pad.left + (width - pad.left - pad.right) * i / (logs.length - 1);
    const yFor = (value) =>
      pad.top + (height - pad.top - pad.bottom) * (max - value) / range;

    ctx.strokeStyle = "#f34f58";
    ctx.lineWidth = 3;
    ctx.beginPath();
    logs.forEach((log, i) => {
      const x = xFor(i);
      const y = yFor(Number(log.value) || 0);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = "#f34f58";
    logs.forEach((log, i) => {
      const x = xFor(i);
      const y = yFor(Number(log.value) || 0);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function setActivityMetricSlide(index, direction = 0) {
    const domain = state.settings.archiveDomain;
    const metrics = getTrackerMetrics(domain);
    const safeIndex = Math.max(0, Math.min(metrics.length - 1, index));
    activitySwipeDirection = direction;
    state.settings.activitySlideByDomain[domain] = safeIndex;
    if (metrics[safeIndex]) {
      state.settings.activityMetricByDomain[domain] = metrics[safeIndex].name;
    }
    saveState();
    renderActivityProgress();

    const active = elements.activitySwipeTrack?.querySelector(".activity-metric-slide.active");
    if (active && direction !== 0) {
      active.classList.add(direction > 0 ? "slide-in-right" : "slide-in-left");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => active.classList.remove("slide-in-right", "slide-in-left"));
      });
    }
    activitySwipeDirection = 0;
  }

  function moveActivityMetricSlide(direction) {
    const domain = state.settings.archiveDomain;
    const current = Number(state.settings.activitySlideByDomain?.[domain] || 0);
    setActivityMetricSlide(current + direction, direction);
  }

  let activitySwipeStartX = null;
  let activitySwipeDirection = 0;
  function bindActivitySwipeGesture() {
    const track = elements.activitySwipeTrack;
    if (!track || track.dataset.swipeBound === "true") return;
    track.dataset.swipeBound = "true";
    track.addEventListener("touchstart", (event) => {
      activitySwipeStartX = event.changedTouches?.[0]?.clientX ?? null;
    }, { passive: true });
    track.addEventListener("touchend", (event) => {
      if (activitySwipeStartX === null) return;
      const endX = event.changedTouches?.[0]?.clientX ?? activitySwipeStartX;
      const delta = endX - activitySwipeStartX;
      activitySwipeStartX = null;
      if (Math.abs(delta) < 45) return;
      moveActivityMetricSlide(delta < 0 ? 1 : -1);
    }, { passive: true });
  }

  const HEART_RATE_ZONES = [
    { zone: 1, name: "Recovery", min: 0.50, max: 0.60, description: "Very easy recovery and aerobic work." },
    { zone: 2, name: "Aerobic base", min: 0.60, max: 0.70, description: "Easy sustainable endurance work." },
    { zone: 3, name: "Tempo", min: 0.70, max: 0.80, description: "Moderate, comfortably hard effort." },
    { zone: 4, name: "Threshold", min: 0.80, max: 0.90, description: "Hard threshold-focused work." },
    { zone: 5, name: "Maximum", min: 0.90, max: 1.01, description: "Very hard to near-maximal effort." }
  ];

  function isRunningDomain(domain = state.settings.archiveDomain) {
    return String(domain || "").trim().toLowerCase().includes("running");
  }

  function zoneForHeartRate(bpm) {
    const maxHr = Number(state.settings.maxHeartRate) || 0;
    const value = Number(bpm);
    if (!maxHr || !Number.isFinite(value) || value <= 0) return null;
    const ratio = value / maxHr;
    return HEART_RATE_ZONES.find((zone) => ratio >= zone.min && ratio < zone.max) || null;
  }

  function bpmRangeForZone(zone) {
    const maxHr = Number(state.settings.maxHeartRate) || 0;
    if (!maxHr) return `${Math.round(zone.min * 100)}–${Math.round(Math.min(zone.max, 1) * 100)}% Max HR`;
    const low = Math.round(maxHr * zone.min);
    const high = zone.zone === 5 ? maxHr : Math.max(low, Math.round(maxHr * zone.max) - 1);
    return `${low}–${high} bpm`;
  }

  function renderHeartRateZonePanel() {
    if (elements.runningHeartRatePanel) elements.runningHeartRatePanel.hidden = true;
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
    elements.activityTrackerMetrics.value = "";
    elements.activityTrackerStatus.textContent = "";
    elements.activityTrackerDialog.showModal();
    setTimeout(() => elements.activityTrackerName.focus(), 0);
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
    renderProfileSummary();
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
    if (!confirm("Delete all Personal Command Center data? Work Command data will remain separate.")) return;

    if (confirm("Create and download a safety backup before wiping Personal data?")) {
      downloadSafetyBackupBeforeWipe("personal");
    }

    if (!confirm("Final confirmation: permanently reset Personal Command Center data in this browser?")) return;

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BACKUP_STORAGE_KEY);
    } catch (_) {}
    state = createInitialState();
    saveAndRender();
    switchView("today");
  }

  function countPersonalBackupData(personal) {
    const daily = Object.keys(personal?.daily || {});
    const aars = daily.filter((date) => {
      const aar = personal.daily?.[date]?.aar || {};
      return ["wentWell","improve","lesson","priority"].some((field) => String(aar[field] || "").trim());
    }).length;

    const liftEntries = Object.values(personal?.exerciseLogs || {})
      .reduce((sum, entries) => sum + (Array.isArray(entries) ? entries.length : 0), 0);

    const activityEntries = Object.values(personal?.activityTrackers || {})
      .reduce((sum, tracker) => sum + (Array.isArray(tracker?.entries) ? tracker.entries.length : 0), 0);

    return {
      days: daily.length,
      aars,
      lifts: liftEntries,
      activities: activityEntries,
      operations: personal?.operations?.items?.length || 0
    };
  }

  function countWorkBackupData(work) {
    return {
      tasks: Array.isArray(work?.tasks) ? work.tasks.length : 0,
      operations: Array.isArray(work?.operations) ? work.operations.length : 0,
      logs: Array.isArray(work?.logs) ? work.logs.length : 0
    };
  }

  function makeBackupEnvelope(scope) {
    const exportedAt = new Date().toISOString();
    const base = {
      app: "My Command Center",
      format: "command-center-backup",
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt,
      scope
    };

    if (scope === "personal") {
      return { ...base, personal: structuredCloneSafe(state) };
    }
    if (scope === "work") {
      return { ...base, work: structuredCloneSafe(workState) };
    }
    return {
      ...base,
      personal: structuredCloneSafe(state),
      work: structuredCloneSafe(workState),
      activeMode: appMode
    };
  }

  function exportData() {
    const payload = makeBackupEnvelope("personal");
    downloadJsonFile(`command-center-personal-${getTodayKey()}.json`, payload);
    if (elements.backupStatus) elements.backupStatus.textContent = "Personal backup exported.";
  }

  function exportWorkBackup() {
    const payload = makeBackupEnvelope("work");
    downloadJsonFile(`command-center-work-${workTodayKey()}.json`, payload);
    if (elements.workBackupStatus) elements.workBackupStatus.textContent = "Work backup exported.";
  }

  function exportGlobalBackup() {
    const payload = makeBackupEnvelope("global");
    downloadJsonFile(`command-center-global-${workTodayKey()}.json`, payload);
    elements.systemConfirmDialog.close();
  }

  function normalizeIncomingBackup(parsed, requestedScope = "personal") {
    if (!parsed || typeof parsed !== "object") throw new Error("Backup file is empty or invalid.");

    // v13+ envelope.
    if (parsed.format === "command-center-backup") {
      return {
        schemaVersion: Number(parsed.schemaVersion) || 1,
        exportedAt: parsed.exportedAt || null,
        scope: parsed.scope || requestedScope,
        personal: parsed.personal || null,
        work: parsed.work || null,
        activeMode: parsed.activeMode || null
      };
    }

    // Earlier Global backup format from Work Mode v11/v12.
    if (parsed.type === "my-command-center-global") {
      return {
        schemaVersion: Number(parsed.schemaVersion) || 11,
        exportedAt: parsed.exportedAt || null,
        scope: "global",
        personal: parsed.personal || null,
        work: parsed.work || null,
        activeMode: parsed.activeMode || null
      };
    }

    // Earlier Work-only backup.
    if (parsed.type === "my-command-center-work") {
      return {
        schemaVersion: Number(parsed.schemaVersion) || 11,
        exportedAt: parsed.exportedAt || null,
        scope: "work",
        personal: null,
        work: parsed.work || null,
        activeMode: null
      };
    }

    // Legacy personal payload: { app, exportedAt, data } or raw personal state.
    const legacyPersonal = parsed.data || parsed;
    if (legacyPersonal?.settings && legacyPersonal?.daily) {
      return {
        schemaVersion: Number(parsed.schemaVersion) || Number(legacyPersonal.version) || 1,
        exportedAt: parsed.exportedAt || null,
        scope: "personal",
        personal: legacyPersonal,
        work: null,
        activeMode: null
      };
    }

    throw new Error("This is not a recognized My Command Center backup.");
  }

  function validateRestoreEnvelope(envelope, requestedScope) {
    if (!envelope) throw new Error("Could not read backup.");

    const effectiveScope = requestedScope === "global" ? "global" : requestedScope;

    if (effectiveScope === "personal" && !envelope.personal) {
      throw new Error("This backup does not contain Personal Command Center data.");
    }
    if (effectiveScope === "work" && !envelope.work) {
      throw new Error("This backup does not contain Work Command data.");
    }
    if (effectiveScope === "global" && !envelope.personal && !envelope.work) {
      throw new Error("This backup does not contain Personal or Work data.");
    }

    if (envelope.personal) {
      if (typeof envelope.personal !== "object" || !envelope.personal.settings || !envelope.personal.daily) {
        throw new Error("Personal backup data failed validation.");
      }
    }
    if (envelope.work) {
      if (typeof envelope.work !== "object" || !Array.isArray(envelope.work.tasks) || !Array.isArray(envelope.work.operations)) {
        throw new Error("Work backup data failed validation.");
      }
    }
    return true;
  }

  function prepareRestoreFromFile(event, requestedScope) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const envelope = normalizeIncomingBackup(parsed, requestedScope);
        validateRestoreEnvelope(envelope, requestedScope);
        pendingRestore = { envelope, requestedScope, fileName: file.name };
        renderRestorePreview();
        elements.restorePreviewDialog.showModal();
      } catch (error) {
        alert(error.message || "The backup could not be validated.");
        pendingRestore = null;
      } finally {
        input.value = "";
      }
    };
    reader.onerror = () => {
      alert("The selected backup file could not be read.");
      input.value = "";
    };
    reader.readAsText(file);
  }

  function importData(event) {
    // Keep the existing Personal Restore file button wired to the new validated flow.
    prepareRestoreFromFile(event, "personal");
  }

  function renderRestorePreview() {
    if (!pendingRestore) return;
    const { envelope, requestedScope, fileName } = pendingRestore;

    const scopeLabel = requestedScope === "global"
      ? "Global"
      : requestedScope === "work" ? "Work" : "Personal";

    elements.restorePreviewTitle.textContent = `${scopeLabel} backup validated`;
    const exported = envelope.exportedAt ? new Date(envelope.exportedAt).toLocaleString() : "Unknown";
    elements.restorePreviewMeta.textContent =
      `${fileName} · Created ${exported} · Schema v${envelope.schemaVersion || 1}`;

    const cards = [];
    if ((requestedScope === "personal" || requestedScope === "global") && envelope.personal) {
      const p = countPersonalBackupData(envelope.personal);
      cards.push(["Personal days", p.days], ["AARs", p.aars], ["Lift entries", p.lifts], ["Activity entries", p.activities], ["Personal Ops", p.operations]);
    }
    if ((requestedScope === "work" || requestedScope === "global") && envelope.work) {
      const w = countWorkBackupData(envelope.work);
      cards.push(["Work tasks", w.tasks], ["Work Ops", w.operations], ["Work logs", w.logs]);
    }

    elements.restorePreviewStats.replaceChildren();
    cards.forEach(([label, value]) => {
      const card = document.createElement("div");
      card.innerHTML = `<span>${escapeHtml(label)}</span><strong>${value}</strong>`;
      elements.restorePreviewStats.appendChild(card);
    });
  }

  function closeRestorePreview() {
    pendingRestore = null;
    if (elements.restorePreviewDialog?.open) elements.restorePreviewDialog.close();
  }

  function getRestoreMode() {
    return document.querySelector('input[name="restoreMode"]:checked')?.value === "replace"
      ? "replace"
      : "merge";
  }

  function createSafetySnapshot(reason = "restore") {
    const snapshot = {
      app: "My Command Center",
      format: "command-center-safety-snapshot",
      schemaVersion: BACKUP_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      reason,
      personal: structuredCloneSafe(state),
      work: structuredCloneSafe(workState),
      activeMode: appMode
    };
    try {
      localStorage.setItem(SAFETY_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn("Could not save pre-restore safety snapshot:", error);
    }
    return snapshot;
  }

  function mergeWorkStates(current, incoming) {
    const base = createInitialWorkState();
    const a = current && typeof current === "object" ? current : base;
    const b = incoming && typeof incoming === "object" ? incoming : base;

    const taskMap = new Map();
    [...(a.tasks || []), ...(b.tasks || [])].forEach((task) => {
      if (!task) return;
      const key = task.id || JSON.stringify([task.title || "", task.createdAt || "", task.due || ""]);
      const existing = taskMap.get(key);
      taskMap.set(key, existing ? { ...existing, ...structuredCloneSafe(task) } : structuredCloneSafe(task));
    });

    const opMap = new Map();
    [...(a.operations || []), ...(b.operations || [])].forEach((op) => {
      if (!op) return;
      const key = op.id || JSON.stringify([op.name || "", op.createdAt || ""]);
      const existing = opMap.get(key);
      opMap.set(key, existing ? { ...existing, ...structuredCloneSafe(op) } : structuredCloneSafe(op));
    });

    const logMap = new Map();
    [...(a.logs || []), ...(b.logs || [])].forEach((log) => {
      if (!log) return;
      const key = log.id || JSON.stringify([log.date || "", log.completed || "", log.createdAt || ""]);
      const existing = logMap.get(key);
      logMap.set(key, existing ? { ...existing, ...structuredCloneSafe(log) } : structuredCloneSafe(log));
    });

    return {
      ...base,
      ...a,
      ...b,
      settings: { ...base.settings, ...(a.settings || {}), ...(b.settings || {}) },
      tasks: [...taskMap.values()],
      operations: [...opMap.values()],
      logs: [...logMap.values()],
      activeOperationId: b.activeOperationId || a.activeOperationId || null
    };
  }

  function executePendingRestore() {
    if (!pendingRestore) return;
    const { envelope, requestedScope } = pendingRestore;
    const mode = getRestoreMode();

    const scopeLabel = requestedScope === "global"
      ? "Personal + Work"
      : requestedScope === "work" ? "Work" : "Personal";

    if (mode === "replace" && !confirm(`Replace current ${scopeLabel} data with this backup? A safety snapshot will be created first.`)) {
      return;
    }

    createSafetySnapshot(`pre-${requestedScope}-${mode}-restore`);

    try {
      if ((requestedScope === "personal" || requestedScope === "global") && envelope.personal) {
        state = mode === "merge"
          ? mergeCommandCenterStates(state, envelope.personal)
          : structuredCloneSafe(envelope.personal);
        ensureStateShape();
        saveState();
      }

      if ((requestedScope === "work" || requestedScope === "global") && envelope.work) {
        workState = mode === "merge"
          ? mergeWorkStates(workState, envelope.work)
          : { ...createInitialWorkState(), ...structuredCloneSafe(envelope.work) };
        saveWorkState();
      }

      if (requestedScope === "global" && envelope.activeMode) {
        appMode = envelope.activeMode === "work" ? "work" : "personal";
        try { localStorage.setItem(APP_MODE_KEY, appMode); } catch (_) {}
      }

      closeRestorePreview();
      renderAll();
      applyModeUI();
      switchView(appMode === "work" ? "work-dashboard" : "today");

      const message = `${scopeLabel} backup restored using ${mode === "merge" ? "Merge" : "Replace"} mode.`;
      if (requestedScope === "work" && elements.workBackupStatus) elements.workBackupStatus.textContent = message;
      else if (elements.backupStatus) elements.backupStatus.textContent = message;
      alert(message);
    } catch (error) {
      console.error("Restore failed:", error);
      alert(`Restore failed: ${error.message || "Unknown error"}. Your pre-restore safety snapshot was preserved.`);
    }
  }

  function downloadSafetyBackupBeforeWipe(scope) {
    const payload = scope === "work"
      ? makeBackupEnvelope("work")
      : scope === "personal"
        ? makeBackupEnvelope("personal")
        : makeBackupEnvelope("global");

    const label = scope === "work" ? "work" : scope === "personal" ? "personal" : "global";
    downloadJsonFile(`command-center-pre-wipe-${label}-${workTodayKey()}.json`, payload);
  }


  function openCommandMenu() {
    const personalActive = appMode === "personal";
    elements.commandPersonalMode.classList.toggle("selected", personalActive);
    elements.commandWorkMode.classList.toggle("selected", !personalActive);

    elements.commandPersonalMode.setAttribute("aria-pressed", String(personalActive));
    elements.commandWorkMode.setAttribute("aria-pressed", String(!personalActive));

    elements.commandModeSystemLabel.textContent = appMode === "work" ? "Work settings" : "Personal settings";
    elements.systemConfirmDialog.showModal();
  }

  function setAppMode(mode) {
    const nextMode = mode === "work" ? "work" : "personal";
    appMode = nextMode;

    try {
      localStorage.setItem(APP_MODE_KEY, appMode);
    } catch (error) {
      console.warn("Could not persist active mode:", error);
    }

    if (elements.systemConfirmDialog?.open) elements.systemConfirmDialog.close();
    applyModeUI();

    const target = appMode === "work" ? "work-dashboard" : "today";
    switchView(target);
  }

  function applyModeUI() {
    const work = appMode === "work";

    if (elements.personalNav) elements.personalNav.hidden = work;
    if (elements.workNav) elements.workNav.hidden = !work;

    if (elements.brandEyebrow) {
      elements.brandEyebrow.textContent = work
        ? "WORK COMMAND // PROFESSIONAL OPERATING SYSTEM"
        : "OPERATION ARETE // PERSONAL OPERATING SYSTEM";
    }
    if (elements.brandTitle) {
      const personalName = String(state.profile?.systemName || "My Command Center").trim();
      elements.brandTitle.textContent = work ? "WORK COMMAND" : personalName.toUpperCase();
    }

    document.body.dataset.appMode = appMode;

    // Make sure only the selected mode's views can become visible.
    document.querySelectorAll(".work-view").forEach((view) => {
      if (!work) {
        view.hidden = true;
        view.classList.remove("active");
      }
    });

    if (work) {
      document.querySelectorAll(".view:not(.work-view)").forEach((view) => {
        if (view.dataset.view !== "settings") {
          view.hidden = true;
          view.classList.remove("active");
        }
      });
      renderWorkAll();
    }
  }

  function workTodayKey() {
    return formatDateKey(new Date());
  }

  function getActiveWorkOperation() {
    return workState.operations.find((op) => op.id === workState.activeOperationId && op.status !== "complete") || null;
  }

  function workTaskDueToday(task) {
    return task.due === workTodayKey() && task.status !== "complete";
  }

  function workStatusLabel(status) {
    return ({ todo: "TODO", active: "ACTIVE", waiting: "WAITING", complete: "COMPLETE" })[status] || String(status || "TODO").toUpperCase();
  }

  function renderWorkAll() {
    renderWorkDashboard();
    renderWorkTasks();
    renderWorkOperations();
    renderWorkArchive();
    renderWorkIntel();
    renderWorkSettings();
  }

  function renderWorkDashboard() {
    const active = workState.tasks.filter((task) => task.status !== "complete");
    const complete = workState.tasks.filter((task) => task.status === "complete");
    const total = workState.tasks.length;
    const pct = total ? Math.round((complete.length / total) * 100) : 0;
    elements.workCompletionPercent.textContent = `${pct}%`;
    elements.workActiveCount.textContent = String(active.filter((task) => task.status === "active" || task.status === "todo").length);
    elements.workDueTodayCount.textContent = String(active.filter(workTaskDueToday).length);
    elements.workWaitingCount.textContent = String(active.filter((task) => task.status === "waiting").length);
    elements.workCompleteCount.textContent = String(complete.length);

    const op = getActiveWorkOperation();
    elements.workCurrentOperationName.textContent = op ? op.name : "No active operation";
    elements.workCurrentOperationMission.textContent = op
      ? (op.mission || op.intent || "No mission statement entered.")
      : "Create a Work Operation when you want tasks grouped under a larger mission.";

    const priorityRank = { High: 0, Medium: 1, Low: 2 };
    const tasks = [...active].sort((a,b) => {
      const dueA = a.due || "9999-99-99";
      const dueB = b.due || "9999-99-99";
      return (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9) || dueA.localeCompare(dueB);
    }).slice(0, 6);

    elements.workPriorityTasks.replaceChildren();
    tasks.forEach((task) => elements.workPriorityTasks.appendChild(createWorkTaskCard(task, true)));
    elements.workPriorityEmpty.hidden = tasks.length > 0;
  }

  function taskMatchesWorkFilter(task) {
    if (workTaskFilter === "all") return true;
    if (workTaskFilter === "complete") return task.status === "complete";
    if (workTaskFilter === "waiting") return task.status === "waiting";
    if (workTaskFilter === "today") return workTaskDueToday(task);
    return task.status !== "complete";
  }

  function renderWorkTasks() {
    const tasks = [...workState.tasks]
      .filter(taskMatchesWorkFilter)
      .sort((a,b) => (a.status === "complete") - (b.status === "complete") || String(a.due || "9999").localeCompare(String(b.due || "9999")));

    elements.workTaskList.replaceChildren();
    tasks.forEach((task) => elements.workTaskList.appendChild(createWorkTaskCard(task, false)));
    elements.workTaskEmpty.hidden = tasks.length > 0;
  }

  function createWorkTaskCard(task, compact) {
    const card = document.createElement("article");
    card.className = `work-task-card priority-${String(task.priority || "medium").toLowerCase()}${compact ? " compact" : ""}`;

    const top = document.createElement("div");
    top.className = "work-task-top";
    const info = document.createElement("div");
    const op = workState.operations.find((item) => item.id === task.operationId);
    info.innerHTML = `
      <span class="work-task-priority">${escapeHtml(task.priority || "Medium")}</span>
      <strong>${escapeHtml(task.title)}</strong>
      <small>${escapeHtml(task.category || "General")}${task.due ? ` · Due ${escapeHtml(formatShortDate(task.due))}` : ""}${op ? ` · ${escapeHtml(op.name)}` : ""}</small>
    `;
    const status = document.createElement("span");
    status.className = `work-status status-${task.status}`;
    status.textContent = workStatusLabel(task.status);
    top.append(info, status);

    const actions = document.createElement("div");
    actions.className = "work-task-actions";

    if (task.status !== "complete") {
      const advance = document.createElement("button");
      advance.type = "button";
      advance.className = "text-button";
      advance.textContent = task.status === "waiting" ? "Resume" : task.status === "active" ? "Complete" : "Start";
      advance.addEventListener("click", () => {
        if (task.status === "waiting") task.status = "active";
        else if (task.status === "active") {
          task.status = "complete";
          task.completedAt = new Date().toISOString();
        } else task.status = "active";
        saveWorkState();
        renderWorkAll();
      });
      actions.appendChild(advance);
    }

    if (!compact) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "text-button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => openWorkTaskDialog(task.id));

      const waiting = document.createElement("button");
      waiting.type = "button";
      waiting.className = "text-button";
      waiting.textContent = "Waiting";
      waiting.addEventListener("click", () => {
        task.status = "waiting";
        saveWorkState();
        renderWorkAll();
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "text-button danger-text";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => {
        if (!confirm(`Delete "${task.title}"?`)) return;
        workState.tasks = workState.tasks.filter((item) => item.id !== task.id);
        saveWorkState();
        renderWorkAll();
      });
      actions.append(edit, waiting, remove);
    }

    card.append(top, actions);
    return card;
  }

  function openWorkTaskDialog(taskId = null) {
    const task = taskId ? workState.tasks.find((item) => item.id === taskId) : null;
    elements.workTaskDialogTitle.textContent = task ? "Edit Work Task" : "New Work Task";
    elements.workTaskId.value = task?.id || "";
    elements.workTaskTitle.value = task?.title || "";
    elements.workTaskPriority.value = task?.priority || "Medium";
    elements.workTaskStatus.value = task?.status || "todo";
    elements.workTaskDue.value = task?.due || "";
    elements.workTaskCategory.value = task?.category || workState.settings.defaultCategory || "";
    elements.workTaskNotes.value = task?.notes || "";

    elements.workTaskOperation.replaceChildren();
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "No operation";
    elements.workTaskOperation.appendChild(none);
    workState.operations.filter((op) => op.status !== "complete").forEach((op) => {
      const option = document.createElement("option");
      option.value = op.id;
      option.textContent = op.name;
      elements.workTaskOperation.appendChild(option);
    });
    elements.workTaskOperation.value = task?.operationId || "";
    elements.workTaskDialog.showModal();
  }

  function saveWorkTaskFromDialog(event) {
    event.preventDefault();
    const id = elements.workTaskId.value;
    const existing = id ? workState.tasks.find((task) => task.id === id) : null;
    const priorStatus = existing?.status;
    const task = existing || {
      id: `wt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString()
    };

    task.title = elements.workTaskTitle.value.trim();
    task.priority = elements.workTaskPriority.value;
    task.status = elements.workTaskStatus.value;
    task.due = elements.workTaskDue.value;
    task.category = elements.workTaskCategory.value.trim();
    task.operationId = elements.workTaskOperation.value;
    task.notes = elements.workTaskNotes.value.trim();

    if (!task.title) return;
    if (task.status === "complete" && priorStatus !== "complete") task.completedAt = new Date().toISOString();
    if (task.status !== "complete") task.completedAt = null;
    if (!existing) workState.tasks.push(task);

    saveWorkState();
    elements.workTaskDialog.close();
    renderWorkAll();
  }

  function renderWorkOperations() {
    elements.workOperationList.replaceChildren();
    const operations = [...workState.operations].sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    operations.forEach((op) => {
      const card = document.createElement("article");
      card.className = `operation-card${workState.activeOperationId === op.id ? " active-operation" : ""}`;
      const linked = workState.tasks.filter((task) => task.operationId === op.id);
      const complete = linked.filter((task) => task.status === "complete").length;
      const pct = linked.length ? Math.round(complete / linked.length * 100) : 0;
      card.innerHTML = `
        <div class="section-heading">
          <div><p class="category-kicker">${op.status === "complete" ? "COMPLETED" : workState.activeOperationId === op.id ? "ACTIVE OPERATION" : "WORK OPERATION"}</p><h3>${escapeHtml(op.name)}</h3></div>
          <strong>${pct}%</strong>
        </div>
        <p class="helper-text">${escapeHtml(op.mission || op.intent || "No mission statement.")}</p>
        <div class="work-objective-list">${(op.objectives || []).map((item) => `<span>• ${escapeHtml(item)}</span>`).join("")}</div>
        <p class="helper-text">${linked.length} linked tasks · ${complete} complete</p>
      `;

      const actions = document.createElement("div");
      actions.className = "button-row";
      if (op.status !== "complete") {
        const activate = document.createElement("button");
        activate.className = "button secondary";
        activate.type = "button";
        activate.textContent = workState.activeOperationId === op.id ? "Active" : "Make Active";
        activate.disabled = workState.activeOperationId === op.id;
        activate.addEventListener("click", () => {
          workState.activeOperationId = op.id;
          saveWorkState();
          renderWorkAll();
        });
        actions.appendChild(activate);
      }

      const edit = document.createElement("button");
      edit.className = "button secondary";
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => openWorkOperationDialog(op.id));
      actions.appendChild(edit);

      if (op.status !== "complete") {
        const conclude = document.createElement("button");
        conclude.className = "button secondary";
        conclude.type = "button";
        conclude.textContent = "Conclude";
        conclude.addEventListener("click", () => {
          if (!confirm(`Conclude ${op.name}?`)) return;
          op.status = "complete";
          op.completedAt = new Date().toISOString();
          if (workState.activeOperationId === op.id) workState.activeOperationId = null;
          saveWorkState();
          renderWorkAll();
        });
        actions.appendChild(conclude);
      }

      card.appendChild(actions);
      elements.workOperationList.appendChild(card);
    });
    elements.workOperationEmpty.hidden = operations.length > 0;
  }

  function openWorkOperationDialog(operationId = null) {
    const op = operationId ? workState.operations.find((item) => item.id === operationId) : null;
    elements.workOperationId.value = op?.id || "";
    elements.workOperationName.value = op?.name || "";
    elements.workOperationIntent.value = op?.intent || "";
    elements.workOperationMission.value = op?.mission || "";
    elements.workOperationObjectives.value = (op?.objectives || []).join("\n");
    elements.workOperationDialog.showModal();
  }

  function saveWorkOperationFromDialog(event) {
    event.preventDefault();
    const id = elements.workOperationId.value;
    const existing = id ? workState.operations.find((op) => op.id === id) : null;
    const op = existing || {
      id: `wop-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      status: "active"
    };
    op.name = elements.workOperationName.value.trim();
    op.intent = elements.workOperationIntent.value.trim();
    op.mission = elements.workOperationMission.value.trim();
    op.objectives = elements.workOperationObjectives.value.split(/\n+/).map((x) => x.trim()).filter(Boolean);
    if (!op.name) return;
    if (!existing) {
      workState.operations.push(op);
      if (!workState.activeOperationId) workState.activeOperationId = op.id;
    }
    saveWorkState();
    elements.workOperationDialog.close();
    renderWorkAll();
  }

  function openWorkLogDialog() {
    elements.workLogDate.value = workTodayKey();
    ["workLogCompleted","workLogIssues","workLogDecisions","workLogFollowUp","workLogNotes"].forEach((id) => elements[id].value = "");
    elements.workLogDialog.showModal();
  }

  function saveWorkLogFromDialog(event) {
    event.preventDefault();
    workState.logs.push({
      id: `wl-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: elements.workLogDate.value,
      completed: elements.workLogCompleted.value.trim(),
      issues: elements.workLogIssues.value.trim(),
      decisions: elements.workLogDecisions.value.trim(),
      followUp: elements.workLogFollowUp.value.trim(),
      notes: elements.workLogNotes.value.trim(),
      createdAt: new Date().toISOString()
    });
    saveWorkState();
    elements.workLogDialog.close();
    renderWorkAll();
  }

  function renderWorkArchive() {
    const records = [];
    workState.logs.forEach((log) => records.push({ type: "log", date: log.date, item: log }));
    workState.tasks.filter((task) => task.status === "complete" && task.completedAt).forEach((task) => {
      records.push({ type: "task", date: String(task.completedAt).slice(0,10), item: task });
    });
    records.sort((a,b) => b.date.localeCompare(a.date));

    elements.workArchiveList.replaceChildren();
    records.forEach((record) => {
      const card = document.createElement("article");
      card.className = "history-card";
      if (record.type === "task") {
        const task = record.item;
        card.innerHTML = `<strong>${escapeHtml(formatShortDate(record.date))}</strong><span class="work-status status-complete">TASK COMPLETE</span><h3>${escapeHtml(task.title)}</h3><p class="helper-text">${escapeHtml(task.notes || task.category || "Completed work task.")}</p>`;
      } else {
        const log = record.item;
        card.innerHTML = `
          <strong>${escapeHtml(formatShortDate(log.date))}</strong>
          <span class="work-status">WORK LOG</span>
          ${log.completed ? `<p><b>Completed:</b> ${escapeHtml(log.completed)}</p>` : ""}
          ${log.issues ? `<p><b>Issues:</b> ${escapeHtml(log.issues)}</p>` : ""}
          ${log.decisions ? `<p><b>Decisions:</b> ${escapeHtml(log.decisions)}</p>` : ""}
          ${log.followUp ? `<p><b>Follow-up:</b> ${escapeHtml(log.followUp)}</p>` : ""}
          ${log.notes ? `<p><b>Notes:</b> ${escapeHtml(log.notes)}</p>` : ""}
        `;
      }
      elements.workArchiveList.appendChild(card);
    });
    elements.workArchiveEmpty.hidden = records.length > 0;
  }

  function renderWorkIntel() {
    const total = workState.tasks.length;
    const complete = workState.tasks.filter((task) => task.status === "complete");
    const onTimeEligible = complete.filter((task) => task.due);
    const onTime = onTimeEligible.filter((task) => String(task.completedAt || "").slice(0,10) <= task.due).length;
    elements.workIntelTotal.textContent = String(total);
    elements.workIntelComplete.textContent = String(complete.length);
    elements.workIntelOnTime.textContent = onTimeEligible.length ? `${Math.round(onTime / onTimeEligible.length * 100)}%` : "—";
    elements.workIntelOps.textContent = String(workState.operations.length);

    const statuses = [
      ["Todo", workState.tasks.filter((t) => t.status === "todo").length],
      ["Active", workState.tasks.filter((t) => t.status === "active").length],
      ["Waiting", workState.tasks.filter((t) => t.status === "waiting").length],
      ["Complete", complete.length]
    ];
    const max = Math.max(1, ...statuses.map(([,n]) => n));
    elements.workIntelStatusBars.innerHTML = statuses.map(([name,n]) => `
      <div class="work-intel-bar"><span>${name}</span><div><i style="width:${Math.round(n/max*100)}%"></i></div><strong>${n}</strong></div>
    `).join("");

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recentComplete = complete.filter((task) => new Date(task.completedAt) >= cutoff);
    const recentLogs = workState.logs.filter((log) => new Date(`${log.date}T12:00:00`) >= cutoff);
    elements.workIntelRecent.innerHTML = `
      <p><strong>${recentComplete.length}</strong> tasks completed in the last 30 days.</p>
      <p><strong>${recentLogs.length}</strong> work logs captured.</p>
      <p><strong>${workState.tasks.filter((t) => t.status === "waiting").length}</strong> tasks currently waiting.</p>
    `;
  }

  function renderWorkSettings() {
    elements.workDefaultCategory.value = workState.settings.defaultCategory || "";
  }

  function exportWorkBackup() {
    downloadJsonFile(`work-command-backup-${workTodayKey()}.json`, {
      type: "my-command-center-work",
      exportedAt: new Date().toISOString(),
      work: workState
    });
  }

  function exportGlobalBackup() {
    downloadJsonFile(`command-center-global-backup-${workTodayKey()}.json`, {
      type: "my-command-center-global",
      exportedAt: new Date().toISOString(),
      personal: state,
      work: workState,
      activeMode: appMode
    });
    elements.systemConfirmDialog.close();
  }

  function downloadJsonFile(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function resetWorkData() {
    if (!confirm("Delete all Work Command data? Personal Command Center data will NOT be touched.")) return;

    if (confirm("Create and download a safety backup before wiping Work data?")) {
      downloadSafetyBackupBeforeWipe("work");
    }

    if (!confirm("Final confirmation: delete Work tasks, Work Operations, Work Logs, and Work settings?")) return;

    workState = createInitialWorkState();
    saveWorkState();
    renderWorkAll();
  }

  const SECTION_IDENTITIES = {
    schedule: { title: "PROTOCOL", kicker: "TRAINING BATTLE RHYTHM // PROGRAM" },
    history: { title: "ARCHIVE", kicker: "WRITTEN RECORD // LESSONS LEARNED" },
    activity: { title: "ACTIVITY", kicker: "PERFORMANCE LOG // TRACKING" },
    intel: { title: "INTEL", kicker: "PATTERNS // TREND ANALYSIS" },
    operations: { title: "OPERATIONS", kicker: "CAMPAIGN // MACRO PROGRESS" },
    settings: { title: "SYSTEM", kicker: "CONTROL // SETTINGS" },
    "work-dashboard": { title: "WORK COMMAND", kicker: "PROFESSIONAL OPERATING SYSTEM" },
    "work-tasks": { title: "TASKS", kicker: "EXECUTION // TASK CONTROL" },
    "work-operations": { title: "WORK OPS", kicker: "MISSION // PROFESSIONAL OPERATIONS" },
    "work-archive": { title: "WORK ARCHIVE", kicker: "PROFESSIONAL RECORD // DAILY LOG" },
    "work-intel": { title: "WORK INTEL", kicker: "PATTERNS // PROFESSIONAL TRENDS" },
    "work-settings": { title: "WORK SYSTEM", kicker: "CONTROL // WORK SETTINGS" }
  };

  function renderHeaderForView(target) {
    const personalDashboard = appMode === "personal" && target === "today";
    elements.dashboardDirectivePanel.hidden = !personalDashboard;
    elements.sectionIdentityBanner.hidden = personalDashboard;

    if (!personalDashboard) {
      const identity = SECTION_IDENTITIES[target] || {
        title: String(target || "COMMAND CENTER").toUpperCase(),
        kicker: appMode === "work" ? "WORK COMMAND" : "COMMAND CENTER"
      };
      elements.sectionIdentityTitle.textContent = identity.title;
      elements.sectionIdentityKicker.textContent = identity.kicker;
    }
  }

  function switchView(target) {
    const isWorkTarget = String(target).startsWith("work-");
    if (isWorkTarget && appMode !== "work") appMode = "work";
    if (!isWorkTarget && target !== "settings" && appMode === "work") {
      appMode = "personal";
    }
    applyModeUI();
    renderHeaderForView(target);
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
    if (target === "activity") renderActivityTracker();
    if (target === "intel") renderIntel();
    if (target === "operations") renderOperations();
    if (target === "schedule") renderSchedule();
    if (target === "settings") renderSettings();
    if (target === "work-dashboard") renderWorkDashboard();
    if (target === "work-tasks") renderWorkTasks();
    if (target === "work-operations") renderWorkOperations();
    if (target === "work-archive") renderWorkArchive();
    if (target === "work-intel") renderWorkIntel();
    if (target === "work-settings") renderWorkSettings();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function calculateCycleDay(date) {
    const start = parseLocalDate(state.settings.cycleStartDate);
    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const targetUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const difference = Math.round((targetUtc - startUtc) / 86400000);
    return modulo(difference, getTrainingScheduleLength()) + 1;
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
