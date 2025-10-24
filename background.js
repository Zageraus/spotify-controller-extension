// background.js

// helper: find Spotify tabs (open.spotify.com)
async function findSpotifyTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs.filter(t => t.url && t.url.includes('open.spotify.com'));
}

// execute a function in the spotify tab(s)
async function runInSpotifyTabs(func, args = []) {
  const tabs = await findSpotifyTabs();
  if (!tabs.length) {
    // Optionally notify user (can't use notifications without permission)
    console.warn('No Spotify tab found.');
    return { success: false, message: 'No Spotify tab open' };
  }
  const results = [];
  for (const tab of tabs) {
    try {
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func,
        args
      });
      results.push({ tabId: tab.id, res });
    } catch (e) {
      console.error('inject error', e);
    }
  }
  return { success: true, results };
}

// message handler from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;
  if (msg.action === 'toggle') {
    runInSpotifyTabs(togglePlay).then(r => sendResponse(r));
    return true; // keep sendResponse
  } else if (msg.action === 'next') {
    runInSpotifyTabs(nextTrack).then(r => sendResponse(r));
    return true;
  } else if (msg.action === 'prev') {
    runInSpotifyTabs(prevTrack).then(r => sendResponse(r));
    return true;
  } else if (msg.action === 'status') {
    runInSpotifyTabs(getStatus).then(r => sendResponse(r));
    return true;
  }
});

// keyboard shortcut commands
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-play') {
    runInSpotifyTabs(togglePlay);
  } else if (command === 'next-track') {
    runInSpotifyTabs(nextTrack);
  } else if (command === 'prev-track') {
    runInSpotifyTabs(prevTrack);
  }
});

/**
 * The functions below are executed inside the Spotify tab context.
 * They attempt:
 * 1) find a page <audio> element and control it
 * 2) fallback to clicking visible play/next/prev buttons by aria-label or known classes
 */

// Toggle play/pause
function togglePlay() {
  try {
    const audio = document.querySelector('audio');
    if (audio) {
      if (audio.paused) audio.play();
      else audio.pause();
      return { method: 'audio', paused: audio.paused };
    }

    // fallback: aria-label buttons
    const playBtn = document.querySelector('button[aria-label="Play"]');
    const pauseBtn = document.querySelector('button[aria-label="Pause"]');
    if (playBtn) { playBtn.click(); return { method: 'aria', action: 'play' }; }
    if (pauseBtn) { pauseBtn.click(); return { method: 'aria', action: 'pause' }; }

    // other fallback selectors (older or alternate classes)
    const possible = document.querySelectorAll('button');
    for (const b of possible) {
      const title = b.getAttribute('title') || '';
      if (/play/i.test(title) || /pause/i.test(title)) { b.click(); return { method: 'title', title }; }
    }

    return { error: 'no-control-found' };
  } catch (e) {
    return { error: e.message };
  }
}

// Next track
function nextTrack() {
  try {
    const audio = document.querySelector('audio');
    // If using an <audio> and it supports nextTrack via Media Session - no standard next on audio
    // So use buttons fallback
    const nextBtn = document.querySelector('button[aria-label="Next"]') ||
                    document.querySelector('[data-testid="control-button-skip-forward"]') ||
                    document.querySelector('.spoticon-skip-forward, .control-button--next');
    if (nextBtn) { nextBtn.click(); return { method: 'button' }; }

    // try find by title
    for (const b of document.querySelectorAll('button')) {
      const title = b.getAttribute('title') || '';
      if (/next/i.test(title) || /skip forward/i.test(title)) { b.click(); return { method: 'title', title }; }
    }

    return { error: 'no-next-found' };
  } catch (e) {
    return { error: e.message };
  }
}

// Previous track
function prevTrack() {
  try {
    const prevBtn = document.querySelector('button[aria-label="Previous"]') ||
                    document.querySelector('[data-testid="control-button-skip-back"]') ||
                    document.querySelector('.spoticon-skip-back, .control-button--prev');
    if (prevBtn) { prevBtn.click(); return { method: 'button' }; }

    for (const b of document.querySelectorAll('button')) {
      const title = b.getAttribute('title') || '';
      if (/previous/i.test(title) || /back/i.test(title) || /skip back/i.test(title)) { b.click(); return { method: 'title', title }; }
    }

    return { error: 'no-prev-found' };
  } catch (e) {
    return { error: e.message };
  }
}

// Get basic status (title, paused)
function getStatus() {
  try {
    const audio = document.querySelector('audio');
    if (audio) {
      return { paused: audio.paused, currentTime: audio.currentTime, duration: audio.duration };
    }
    // fallback: read meta on page (song title element)
    const titleEl = document.querySelector('[data-testid="nowplaying-track-link"], .TrackName, .track-info__name');
    const title = titleEl ? titleEl.textContent.trim() : null;
    return { paused: null, title };
  } catch (e) {
    return { error: e.message };
  }
}
