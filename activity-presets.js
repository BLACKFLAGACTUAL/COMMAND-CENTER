(() => {
  "use strict";

  window.CCActivityPresets = Object.freeze({
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
  });
})();
