export function getFinalPool(scoredSessions, ratio) {
  const poolSize = Math.max(1, Math.ceil(scoredSessions.length * ratio));

  return scoredSessions.slice(0, poolSize);
}

export function computeSessionWeight(session) {
  return session.sessionScore ** 2;
}

export function weightedDraw(pool, count, excludedSessionIds = []) {
  const excludedSet = new Set(excludedSessionIds);

  const availablePool = pool.filter((session) => {
    return !excludedSet.has(getResultSignature(session));
  });

  const results = [];
  const remainingPool = [...availablePool];

  while (results.length < count && remainingPool.length > 0) {
    const selectedSession = pickOneWeighted(remainingPool);

    results.push(selectedSession);

  const selectedSignature = getResultSignature(selectedSession);

    for (let i = remainingPool.length - 1; i >= 0; i -= 1) {
      if (getResultSignature(remainingPool[i]) === selectedSignature) {
        remainingPool.splice(i, 1);
      }
    }
  }

  return results;
}

export function pickOneWeighted(pool) {
  const totalWeight = pool.reduce((sum, session) => {
    return sum + computeSessionWeight(session);
  }, 0);

  if (totalWeight === 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  let randomThreshold = Math.random() * totalWeight;

  for (const session of pool) {
    randomThreshold -= computeSessionWeight(session);

    if (randomThreshold <= 0) {
      return session;
    }
  }

  return pool[pool.length - 1];
}

export function rerollResults(finalPool, excludedSignatures, count) {
  return weightedDraw(finalPool, count, excludedSignatures);
}

export function selectSingleFilmResults(scoredFilms, count) {
  return scoredFilms.slice(0, count).map((film, index) => {
    return {
      id: `single_${film.id}_${index + 1}`,
      films: [film],
      totalDuration: film.durationMinutes,
      sessionScore: film.individualFilmScore,
      scoringDetails: film.scoringDetails
    };
  });
}

export function getResultSignature(result) {
  return result.films
    .map((film) => film.id)
    .sort()
    .join("|");
}

export function getSingleFilmSignature(film) {
  return film.id;
}