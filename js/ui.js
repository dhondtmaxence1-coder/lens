import { getYoutubeEmbedUrl, getYoutubeWatchUrl } from "./youtubeUtils.js";

export function initUI(handlers) {
  const homeForm = document.querySelector("#home-form");

  if (homeForm) {
    homeForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const userInputs = getUserInputsFromHome();
      handlers.onStart(userInputs);
    });
  }


  const takeButton = document.querySelector("#take-button");
  const skipButton = document.querySelector("#skip-button");

  if (takeButton) {
    takeButton.addEventListener("click", () => {
      handlers.onCalibrationChoice("take");
    });
  }

  if (skipButton) {
    skipButton.addEventListener("click", () => {
      handlers.onCalibrationChoice("skip");
    });
  }


  const previousResultButton = document.querySelector("#previous-result-button");
  const nextResultButton = document.querySelector("#next-result-button");
  const rerollButton = document.querySelector("#reroll-button");

  if (previousResultButton) {
    previousResultButton.addEventListener("click", () => {
      handlers.onPreviousResult();
    });
  }

  if (nextResultButton) {
    nextResultButton.addEventListener("click", () => {
      handlers.onNextResult();
    });
  }

  if (rerollButton) {
    rerollButton.addEventListener("click", () => {
      handlers.onReroll();
    });
  }


  const backToResultsButton = document.querySelector("#back-to-results-button");

  if (backToResultsButton) {
    backToResultsButton.addEventListener("click", () => {
      handlers.onBackToResults();
    });
  }


  const sessionDetailScreen = document.querySelector("[data-screen='session-detail']");

  if (sessionDetailScreen) {
    attachSwipeHandler(sessionDetailScreen, {
      onSwipeLeft: handlers.onBackToResults
    });
  }


  const restartButton = document.querySelector("#restart-button");

  if (restartButton) {
    restartButton.addEventListener("click", () => {
      handlers.onRestart();
    });
  }


  const resultsScreen = document.querySelector("[data-screen='results']");

  if (resultsScreen) {
    attachSwipeHandler(resultsScreen, {
      onSwipeLeft: handlers.onNextResult,
      onSwipeRight: handlers.onPreviousResult
    });
  }
}

export function showScreen(screenName) {
  const screens = document.querySelectorAll("[data-screen]");

  screens.forEach((screen) => {
    screen.hidden = screen.dataset.screen !== screenName;
  });
}

export function renderHomeScreen() {
  const homeForm = document.querySelector("#home-form");

  if (homeForm) {
    homeForm.reset();
  }

  showScreen("home");
}

export function getUserInputsFromHome() {
  const availableTimeInput = document.querySelector("#available-time");
  const selectedMoodInput = document.querySelector("#selected-mood");
  const selectedModeInput = document.querySelector("input[name='mode']:checked");

  return {
    availableTime: Number(availableTimeInput.value),
    selectedMood: selectedMoodInput.value,
    mode: selectedModeInput.value
  };
}

export function renderError(message) {
  const errorText = document.querySelector("#error-message");

  if (errorText) {
    errorText.textContent = message;
  }

  showScreen("error");
}

export function renderCalibrationScreen(film, index, total) {
  const progress = document.querySelector("#calibration-progress");
  const choiceLine = document.querySelector("#calibration-choice-line");

  if (progress) {
    progress.textContent = `${index + 1} / ${total}`;
  }

  if (choiceLine) {
    choiceLine.textContent = film.choiceLine;
  }

  showScreen("calibration");
}

export function renderResultsScreen(results, activeIndex, onOpenSession, animationDirection = "none") {
  const activeResultCard = document.querySelector("#active-result-card");
  const resultCounter = document.querySelector("#result-counter");

  if (!activeResultCard || !resultCounter) {
    return;
  }

  const activeSession = results[activeIndex];

  activeResultCard.replaceChildren(
    renderResultCard(activeSession, onOpenSession)
  );

  activeResultCard.classList.remove(
    "result-card-slide-next",
    "result-card-slide-previous",
    "result-card-reroll"
  );

  void activeResultCard.offsetWidth;

  if (animationDirection === "next") {
    activeResultCard.classList.add("result-card-slide-next");
  }

  if (animationDirection === "previous") {
    activeResultCard.classList.add("result-card-slide-previous");
  }

  if (animationDirection === "reroll") {
    activeResultCard.classList.add("result-card-reroll");
  }

  resultCounter.textContent = `${activeIndex + 1} / ${results.length}`;

  showScreen("results");
}

function renderResultCard(session, onOpenSession) {
  const recommendationScore = Math.round(session.sessionScore * 100);
  const filmLabel = session.films.length === 1 ? "film" : "films";

  const header = createUIElement("div", {
    className: "result-card-header",
    children: [
      createUIElement("p", {
        className: "recommendation-label",
        textContent: "Recommendation"
      }),
      createUIElement("p", {
        className: "recommendation-score",
        textContent: `${recommendationScore}%`
      }),
      createUIElement("h2", {
        textContent: `${session.totalDuration} min · ${session.films.length} ${filmLabel}`
      })
    ]
  });

  const filmList = createUIElement("div", {
    className: "result-film-list"
  });

  session.films.forEach((film, index) => {
    filmList.appendChild(renderCompactFilmItem(film, index));
  });

  const openSessionButton = createUIElement("button", {
    className: "primary-button",
    textContent: "Open session",
    attributes: {
      id: "open-session-button",
      type: "button"
    }
  });

  openSessionButton.addEventListener("click", () => {
    onOpenSession(session);
  });

  return createUIElement("article", {
    className: "result-card",
    children: [
      header,
      filmList,
      openSessionButton
    ]
  });
} 

function renderCompactFilmItem(film, index) {
  const thumbnail = createUIElement("img", {
    className: "compact-film-thumbnail",
    attributes: {
      src: film.thumbnail,
      alt: film.title
    }
  });

  const content = createUIElement("div", {
    className: "compact-film-content",
    children: [
      createUIElement("p", {
        className: "compact-film-index",
        textContent: `Film ${index + 1}`
      }),
      createUIElement("h3", {
        textContent: film.title
      }),
      createUIElement("p", {
        textContent: `${Math.round(film.durationMinutes)} min · ${film.genres.join(", ")}`
      })
    ]
  });

  return createUIElement("div", {
    className: "compact-film-item",
    children: [
      thumbnail,
      content
    ]
  });
}


function createUIElement(tagName, options = {}) {
  const element = document.createElement(tagName);

  if (options.className) {
    element.className = options.className;
  }

  if (options.textContent !== undefined) {
    element.textContent = options.textContent;
  }

  if (options.attributes) {
    Object.entries(options.attributes).forEach(([name, value]) => {
      element.setAttribute(name, value);
    });
  }

  if (options.children) {
    options.children.forEach((child) => {
      if (child) {
        element.appendChild(child);
      }
    });
  }

  return element;
}

export function renderSessionDetailScreen(session) {
  const container = document.querySelector("#session-detail-content");

  if (!container) {
    return;
  }

  const filmLabel = session.films.length === 1 ? "film" : "films";

  const header = createUIElement("div", {
    className: "session-detail-header",
    children: [
      createUIElement("p", {
        className: "eyebrow",
        textContent: "Selected session"
      }),
      createUIElement("h2", {
        textContent: `${session.totalDuration} min · ${session.films.length} ${filmLabel}`
      }),
      createUIElement("p", {
        className: "results-subtitle",
        textContent: "Watch the films in this order for the best flow."
      })
    ]
  });

  const films = createUIElement("div", {
    className: "session-detail-films"
  });

  session.films.forEach((film, index) => {
    films.appendChild(renderDetailedFilmItem(film, index));
  });

  container.replaceChildren(header, films);

  showScreen("session-detail");
}

function renderDetailedFilmItem(film, index) {
  const embedUrl = getYoutubeEmbedUrl(film);
  const watchUrl = getYoutubeWatchUrl(film);

  const videoElement = embedUrl
    ? createUIElement("iframe", {
        attributes: {
          src: embedUrl,
          title: film.title,
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowfullscreen: ""
        }
      })
    : createUIElement("img", {
        className: "detail-film-thumbnail",
        attributes: {
          src: film.thumbnail,
          alt: film.title
        }
      });

  const videoFrame = createUIElement("div", {
    className: "detail-video-frame",
    children: [videoElement]
  });

  const watchButton = createUIElement("a", {
    className: "primary-link-button",
    textContent: "Watch on YouTube",
    attributes: {
      href: watchUrl,
      target: "_blank",
      rel: "noopener noreferrer"
    }
  });

  return createUIElement("article", {
    className: "detail-film-card",
    children: [
      videoFrame,
      createUIElement("div", {
        className: "detail-film-content",
        children: [
          createUIElement("p", {
            className: "compact-film-index",
            textContent: `Film ${index + 1}`
          }),
          createUIElement("h3", {
            textContent: film.title
          }),
          createUIElement("p", {
            className: "film-meta",
            textContent: `${Math.round(film.durationMinutes)} min · ${film.genres.join(", ")}`
          }),
          createUIElement("p", {
            className: "film-summary",
            textContent: film.summary || film.choiceLine
          }),
          watchButton
        ]
      })
    ]
  });
}

function attachSwipeHandler(element, handlers) {
  let touchStartX = 0;
  let touchStartY = 0;

  const minSwipeDistance = 60;
  const maxVerticalDrift = 80;

  element.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];

    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  });

  element.addEventListener("touchend", (event) => {
    const touch = event.changedTouches[0];

    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    const isHorizontalSwipe =
      Math.abs(deltaX) >= minSwipeDistance &&
      Math.abs(deltaY) <= maxVerticalDrift;

    if (!isHorizontalSwipe) {
      return;
    }

    if (deltaX < 0 && handlers.onSwipeLeft) {
      handlers.onSwipeLeft();
    }

    if (deltaX > 0 && handlers.onSwipeRight) {
      handlers.onSwipeRight();
    }
  });
}