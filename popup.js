// popup.js
document.getElementById('toggle').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'toggle' }, (resp) => {
    updateStatus(resp);
  });
});

document.getElementById('next').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'next' }, (resp) => {
    updateStatus(resp);
  });
});

document.getElementById('prev').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'prev' }, (resp) => {
    updateStatus(resp);
  });
});

function updateStatus(resp) {
  const s = document.getElementById('status');
  if (!resp) { s.textContent = 'Status: no response'; return; }
  if (resp.success === false && resp.message) {
    s.textContent = 'Status: ' + resp.message;
    return;
  }
  // show simple summary
  if (resp.results && resp.results.length) {
    const r0 = resp.results[0].res && resp.results[0].res[0] ? resp.results[0].res[0].result : resp.results[0].res;
    s.textContent = 'Action sent to Spotify tab(s).';
  } else {
    s.textContent = 'Action attempted.';
  }
}

// On open, query status
chrome.runtime.sendMessage({ action: 'status' }, (resp) => {
  const s = document.getElementById('status');
  if (!resp) { s.textContent = 'Status: no response'; return; }
  if (resp.success === false && resp.message) {
    s.textContent = 'Status: ' + resp.message;
    return;
  }
  s.textContent = 'Spotify tab found';
});
