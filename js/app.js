import { APP_CONFIG } from "./constants.js";
import { loadFilms } from "./data.js";
import { state } from "./state.js";
import { buildCandidateSessions } from "./sessions.js";
import { scoreFilms, getTopFilms } from "./scoringFilms.js";
import { scoreSessions } from "./scoringSessions.js";
import {
  getFinalPool,
  weightedDraw,
  rerollResults,
  selectSingleFilmResults
} from "./selection.js";
import {
  initUI,
  renderHomeScreen,
  renderCalibrationScreen,
  renderResultsScreen,
  renderSessionDetailScreen,
  renderError
} from "./ui.js";
import {
  createInitialUserTarget,
  selectCalibrationFilms,
  updateUserTargetWithChoice
} from "./profile.js";


async function initApp() {
  try {
    console.log("Lens démarre...");

    state.films = await loadFilms();

    console.log(`${state.films.length} films chargés.`);
    console.table(
      state.films.map((film) => ({
        id: film.id,
        title: film.title,
        duration: film.durationMinutes,
        intensity: film.intensity
      }))
    );

  initUI({
    onStart: handleStart,
    onCalibrationChoice: handleCalibrationChoice,
    onPreviousResult: handlePreviousResult,
    onNextResult: handleNextResult,
    onReroll: handleReroll,
    onOpenSession: handleOpenSession,
    onBackToResults: handleBackToResults,
    onRestart: handleRestart
  });

    renderHomeScreen();
  } catch (error) {
    console.error(error);
    renderError(error.message);
  }
}


function handleStart(userInputs) {
  state.userInputs = userInputs;
  state.userTarget = createInitialUserTarget(userInputs);
  console.log("Mode exécuté :", state.userTarget.resolvedMode);

  state.calibrationFilms = selectCalibrationFilms(
    state.films,
    APP_CONFIG.calibrationCardCount
  );

  state.calibrationIndex = 0;

  console.groupCollapsed("Session started");
  console.log("Inputs:", state.userInputs);
  console.log("Resolved mode:", state.userTarget.resolvedMode);
  console.log("Calibration cards:", state.calibrationFilms.map((film) => film.title));
  console.groupEnd();

  renderCalibrationScreen(
  state.calibrationFilms[state.calibrationIndex],
  state.calibrationIndex,
  state.calibrationFilms.length
  );

}

function handleCalibrationChoice(choice) {
  const currentFilm = state.calibrationFilms[state.calibrationIndex];

  state.userTarget = updateUserTargetWithChoice(
    state.userTarget,
    currentFilm,
    choice
  );

  console.log("Calibration choice:", {
    choice,
    filmId: currentFilm.id,
    title: currentFilm.title
  });

  state.calibrationIndex += 1;

  if (state.calibrationIndex < state.calibrationFilms.length) {
    renderCalibrationScreen(
      state.calibrationFilms[state.calibrationIndex],
      state.calibrationIndex,
      state.calibrationFilms.length
    );

    return;
  }

  console.groupCollapsed("Calibration completed");
  console.log("Final user target:", state.userTarget);
  console.groupEnd();

  runRecommendationPipeline();
}

function runRecommendationPipeline() {
  scoreAndSelectTopFilms();

  if (state.userTarget.resolvedMode === "single") {
    runSingleFilmPipeline();
  } else {
    runSessionPipeline();
  }

  state.selectedResultIndex = 0;

  renderResultsScreen(
    state.currentResults,
    state.selectedResultIndex,
    handleOpenSession
  );

  logRecommendationSummary();
}





function scoreAndSelectTopFilms() {
  state.scoredFilms = scoreFilms(state.films, state.userTarget);
  state.topFilms = getTopFilms(state.scoredFilms, APP_CONFIG.topFilmCount);
}

function runSingleFilmPipeline() {
  state.sessions = [];
  state.scoredSessions = [];
  state.finalPool = state.scoredFilms;

  state.currentResults = selectSingleFilmResults(
    state.scoredFilms,
    APP_CONFIG.resultCount
  );
}

function runSessionPipeline() {
  state.sessions = buildCandidateSessions(state.topFilms);

  state.scoredSessions = scoreSessions(
    state.sessions,
    state.userTarget
  );

  state.finalPool = getFinalPool(
    state.scoredSessions,
    APP_CONFIG.finalPoolRatio
  );

  state.currentResults = weightedDraw(
    state.finalPool,
    APP_CONFIG.resultCount
  );
}

function logRecommendationSummary() {
  console.groupCollapsed("Recommendation pipeline summary");

  console.log("Mode:", {
    selected: state.userTarget.mode,
    resolved: state.userTarget.resolvedMode
  });

  console.log("User target:", {
    availableTime: state.userTarget.availableTime,
    intensity: Number(state.userTarget.intensity.toFixed(3)),
    moodVector: state.userTarget.moodVector
  });

  console.table(
    state.topFilms.slice(0, 5).map((film) => ({
      title: film.title,
      score: film.individualFilmScore.toFixed(3),
      duration: film.durationMinutes,
      intensity: film.intensity
    }))
  );

  console.log("Counts:", {
    films: state.films.length,
    topFilms: state.topFilms.length,
    sessions: state.sessions.length,
    scoredSessions: state.scoredSessions.length,
    finalPool: state.finalPool.length,
    results: state.currentResults.length
  });

  console.table(
    state.currentResults.map((result, index) => ({
      option: index + 1,
      score: Math.round(result.sessionScore * 100) + "%",
      duration: result.totalDuration,
      films: result.films.map((film) => film.title).join(" → ")
    }))
  );

  console.groupEnd();
}





function handlePreviousResult() {
  state.selectedResultIndex =
    (state.selectedResultIndex - 1 + state.currentResults.length) %
    state.currentResults.length;

  renderResultsScreen(
    state.currentResults,
    state.selectedResultIndex,
    handleOpenSession,
    "previous"
  );
}

function handleNextResult() {
  state.selectedResultIndex =
    (state.selectedResultIndex + 1) % state.currentResults.length;

  renderResultsScreen(
    state.currentResults,
    state.selectedResultIndex,
    handleOpenSession,
    "next"
  );
}

function handleReroll() {
  if (state.userTarget.resolvedMode === "single") {
    const currentFilmIds = state.currentResults.map((result) => {
      return result.films[0].id;
    });

    const availableFilms = state.scoredFilms.filter((film) => {
      return !currentFilmIds.includes(film.id);
    });

    state.currentResults = selectSingleFilmResults(
      availableFilms,
      APP_CONFIG.resultCount
    );
  } else {
    state.currentResults = rerollResults(
      state.finalPool,
      state.currentResults,
      APP_CONFIG.resultCount
    );
  }

  state.selectedResultIndex = 0;

  renderResultsScreen(
    state.currentResults,
    state.selectedResultIndex,
    handleOpenSession,
    "reroll"
  );
}

function handleOpenSession(session) {
  state.selectedSession = session;
  renderSessionDetailScreen(session);
}

function handleBackToResults() {
  renderResultsScreen(
    state.currentResults,
    state.selectedResultIndex,
    handleOpenSession
  );
}

function handleRestart() {
  state.userInputs = null;
  state.userTarget = null;

  state.calibrationFilms = [];
  state.calibrationIndex = 0;

  state.scoredFilms = [];
  state.topFilms = [];

  state.sessions = [];
  state.scoredSessions = [];

  state.finalPool = [];
  state.currentResults = [];

  state.selectedResultIndex = 0;
  state.selectedSession = null;

  renderHomeScreen();
}


function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker
    .register("./sw.js")
    .then(() => {
      console.log("Service worker registered.");
    })
    .catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
}

registerServiceWorker();
initApp();