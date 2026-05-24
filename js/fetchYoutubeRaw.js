const TARGET_VIDEO_COUNT = 300;
const MAX_RESULTS_PER_PAGE = 50;
const MAX_PAGES_PER_QUERY = 3;

const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 25;

const SEARCH_DELAY_MS = 7000;

const SEARCH_QUERIES = [
  "award winning short film english",
  "independent short film english",
  "short film drama english",
  "short film comedy english",
  "short film horror english",
  "short film sci fi english",
  "short film thriller english",
  "animated short film english",
  "student short film english",
  "festival short film english",
  "omeleto short film",
  "alter horror short film",
  "dust sci fi short film",
  "cgmeetup animated short film",
  "short of the week film",
  "vimeo staff pick short film youtube",
  "oscar nominated short film youtube",
  "academy award short film youtube",
  "film festival short movie youtube",
  "cinematic short film english"
];

const fetchButton = document.querySelector("#fetch-youtube-button");
const apiKeyInput = document.querySelector("#youtube-api-key");
const statusText = document.querySelector("#fetch-youtube-status");

if (fetchButton) {
  fetchButton.addEventListener("click", handleFetchYoutubeVideos);
}

async function handleFetchYoutubeVideos() {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    updateStatus("Missing YouTube API key.");
    return;
  }

  try {
    fetchButton.disabled = true;
    updateStatus("Starting YouTube fetch...");

    const videoIdMap = await collectVideoIds(apiKey);

    updateStatus(`Collected ${videoIdMap.size} unique video IDs. Fetching details...`);

    const rawVideos = await fetchVideosDetails(
      Array.from(videoIdMap.keys()),
      apiKey,
      videoIdMap
    );

    const filteredVideos = rawVideos
      .map(normalizeVideo)
      .filter(isUsableShortFilm)
      .slice(0, TARGET_VIDEO_COUNT);

    updateStatus(
      `Kept ${filteredVideos.length} usable videos. Downloading JSON...`
    );

    downloadJson(filteredVideos, "raw_youtube_results.json");

    updateStatus(
      `Done. Downloaded ${filteredVideos.length} videos as raw_youtube_results.json`
    );
  } catch (error) {
    console.error(error);
    updateStatus(`Error: ${error.message}`);
  } finally {
    fetchButton.disabled = false;
  }
}

async function collectVideoIds(apiKey) {
  const videoIdMap = new Map();

  for (const query of SEARCH_QUERIES) {
    if (videoIdMap.size >= TARGET_VIDEO_COUNT * 2) {
      break;
    }

    let pageToken = null;

    for (let page = 1; page <= MAX_PAGES_PER_QUERY; page += 1) {
      updateStatus(
        `Searching "${query}" — page ${page}. Unique videos: ${videoIdMap.size}`
      );

      const data = await searchVideos(query, apiKey, pageToken);

      const items = data.items || [];

      items.forEach((item) => {
        const videoId = item.id?.videoId;

        if (!videoId || videoIdMap.has(videoId)) {
          return;
        }

        videoIdMap.set(videoId, {
          searchQuery: query,
          searchTitle: item.snippet?.title || "",
          searchDescription: item.snippet?.description || ""
        });
      });

      pageToken = data.nextPageToken;

      updateStatus(
        `Waiting ${SEARCH_DELAY_MS / 1000}s to avoid YouTube rate limits...`
      );

      await sleep(SEARCH_DELAY_MS);

      if (!pageToken) {
        break;
      }

      if (videoIdMap.size >= TARGET_VIDEO_COUNT * 2) {
        break;
      }
    }
  }

  return videoIdMap;
}

async function searchVideos(query, apiKey, pageToken = null) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");

  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(MAX_RESULTS_PER_PAGE));
  url.searchParams.set("relevanceLanguage", "en");
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("videoSyndicated", "true");
  url.searchParams.set("key", apiKey);

  if (pageToken) {
    url.searchParams.set("pageToken", pageToken);
  }

  return fetchJson(url);
}

async function fetchVideosDetails(videoIds, apiKey, videoIdMap) {
  const allVideos = [];
  const batches = chunkArray(videoIds, 50);

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];

    updateStatus(
      `Fetching video details batch ${index + 1} / ${batches.length}...`
    );

    const url = new URL("https://www.googleapis.com/youtube/v3/videos");

    url.searchParams.set("part", "snippet,contentDetails,statistics,status");
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("key", apiKey);

    const data = await fetchJson(url);

    const videos = data.items || [];

    videos.forEach((video) => {
      const searchMetadata = videoIdMap.get(video.id) || {};

      allVideos.push({
        ...video,
        searchMetadata
      });
    });
  }

  return allVideos;
}

function normalizeVideo(video) {
  const snippet = video.snippet || {};
  const contentDetails = video.contentDetails || {};
  const statistics = video.statistics || {};
  const status = video.status || {};
  const searchMetadata = video.searchMetadata || {};

  return {
    id: video.id,
    title: decodeHtmlEntities(snippet.title || ""),
    url: `https://www.youtube.com/watch?v=${video.id}`,
    thumbnail: getBestThumbnail(snippet.thumbnails),
    channelName: snippet.channelTitle || "",
    description: decodeHtmlEntities(snippet.description || ""),
    durationMinutes: parseYoutubeDurationToMinutes(contentDetails.duration),
    publishedAt: snippet.publishedAt || null,
    viewCount: statistics.viewCount ? Number(statistics.viewCount) : null,
    likeCount: statistics.likeCount ? Number(statistics.likeCount) : null,
    tags: snippet.tags || [],
    commentsSample: [],
    embeddable: status.embeddable === true,
    privacyStatus: status.privacyStatus || null,
    searchQuery: searchMetadata.searchQuery || null
  };
}

function isUsableShortFilm(video) {
  if (!video.embeddable) {
    return false;
  }

  if (video.privacyStatus !== "public") {
    return false;
  }

  if (
    typeof video.durationMinutes !== "number" ||
    Number.isNaN(video.durationMinutes)
  ) {
    return false;
  }

  if (video.durationMinutes < MIN_DURATION_MINUTES) {
    return false;
  }

  if (video.durationMinutes > MAX_DURATION_MINUTES) {
    return false;
  }

  return true;
}

function getBestThumbnail(thumbnails = {}) {
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ""
  );
}

function parseYoutubeDurationToMinutes(duration) {
  if (!duration) {
    return null;
  }

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  return Math.round((hours * 60 + minutes + seconds / 60) * 10) / 10;
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `YouTube API error ${response.status}: ${errorText}`
    );
  }

  return response.json();
}

function chunkArray(array, size) {
  const chunks = [];

  for (let index = 0; index < array.length; index += 1) {
    if (index % size === 0) {
      chunks.push(array.slice(index, index + size));
    }
  }

  return chunks;
}

function downloadJson(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function updateStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }

  console.log(message);
}

function decodeHtmlEntities(text) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;

  return textarea.value;
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}