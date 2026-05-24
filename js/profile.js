import { MOOD_KEYS } from "./constants.js";

function resolveMode(mode) {
  if (mode !== "surprise") {
    return mode;
  }

  return Math.random() < 0.5 ? "single" : "session";
}

export function createInitialUserTarget(userInputs) {
    const moodVector = {};

    MOOD_KEYS.forEach((moodKey) => {
        moodVector[moodKey] = moodKey === userInputs.selectedMood ? 1 : 0;
    });

    return {
        moodVector,
        intensity: 0.5,
        availableTime: userInputs.availableTime,
        mode: userInputs.mode,
        resolvedMode: resolveMode(userInputs.mode)
    };
}

export function selectCalibrationFilms(films, count) {
    const uniqueFilmsMap = new Map();

    films.forEach((film) => {
        if (!uniqueFilmsMap.has(film.id)) {
            uniqueFilmsMap.set(film.id, film);
        }
    });

    const shuffledFilms = shuffleArray([...uniqueFilmsMap.values()]);
    const selectedFilms = [];
    const usedChoiceLines = new Set();

    for (const film of shuffledFilms) {
        const choiceLine = film.choiceLine || film.id;

        if (usedChoiceLines.has(choiceLine)) {
            continue;
        }

        selectedFilms.push(film);
        usedChoiceLines.add(choiceLine);

        if (selectedFilms.length === count) {
            break;
        }
    }

    return selectedFilms;
}

function shuffleArray(array) {
    const shuffledArray = [...array];

    for (let i = shuffledArray.length - 1; i > 0; i -= 1) {
        const randomIndex = Math.floor(Math.random() * (i + 1));

        const temporaryValue = shuffledArray[i];
        shuffledArray[i] = shuffledArray[randomIndex];
        shuffledArray[randomIndex] = temporaryValue;
    }

    return shuffledArray;
}












export function updateUserTargetWithChoice(userTarget, film, choice) {
    const direction = choice === "take" ? 1 : -1;
    const step = choice === "take" ? 0.25 : -0.15;

    const updatedMoodVector = {};

    MOOD_KEYS.forEach((moodKey) => {
    const currentValue = userTarget.moodVector[moodKey];
    const filmValue = film.moodVector[moodKey];

    updatedMoodVector[moodKey] = clamp(
        currentValue + step * (filmValue - currentValue),
        0,
        1
    );
    })

    const updatedIntensity = clamp(
        userTarget.intensity + step * (film.intensity - userTarget.intensity),
        0,
        1
    );

    return {
        ...userTarget,
        moodVector: updatedMoodVector,
        intensity: updatedIntensity
    };
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}