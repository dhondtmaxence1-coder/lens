export function buildCandidateSessions(topFilms) {
  const candidateGroups = [
    ...buildPairs(topFilms),
    ...buildTriplets(topFilms)
  ];

  const sessions = [];
  let sessionIndex = 1;

  candidateGroups.forEach((group) => {
    const permutations = getPermutations(group);

    permutations.forEach((orderedFilms) => {
      sessions.push(createSession(orderedFilms, sessionIndex));
      sessionIndex += 1;
    });
  });

  return sessions;
}

export function buildPairs(films) {
  const pairs = [];

  for (let i = 0; i < films.length; i += 1) {
    for (let j = i + 1; j < films.length; j += 1) {
      pairs.push([films[i], films[j]]);
    }
  }

  return pairs;
}

export function buildTriplets(films) {
  const triplets = [];

  for (let i = 0; i < films.length; i += 1) {
    for (let j = i + 1; j < films.length; j += 1) {
      for (let k = j + 1; k < films.length; k += 1) {
        triplets.push([films[i], films[j], films[k]]);
      }
    }
  }

  return triplets;
}

export function getPermutations(films) {
  if (films.length === 2) {
    return [
      [films[0], films[1]],
      [films[1], films[0]]
    ];
  }

  if (films.length === 3) {
    return [
      [films[0], films[1], films[2]],
      [films[0], films[2], films[1]],
      [films[1], films[0], films[2]],
      [films[1], films[2], films[0]],
      [films[2], films[0], films[1]],
      [films[2], films[1], films[0]]
    ];
  }

  return [films];
}

export function createSession(films, index) {
  return {
    id: `session_${String(index).padStart(4, "0")}`,
    films,
    totalDuration: computeTotalDuration(films)
  };
}

export function computeTotalDuration(films) {
  const totalDuration = films.reduce((total, film) => {
    return total + film.durationMinutes;
  }, 0);

  return Math.round(totalDuration);
}