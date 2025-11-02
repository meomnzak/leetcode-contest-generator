// app.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');

  const startBtn = document.querySelector('.start-button');
  const regenBtn = document.querySelector('.regenerate-button');
  const endBtn   = document.querySelector('.end-button');

  startBtn?.addEventListener('click', () => {
    startBtn.disabled = true;
    startContest();
  });
  regenBtn?.addEventListener('click', regenerateContest);
  endBtn?.addEventListener('click', endContest);

  // Try to restore an in-progress timer if page reloaded
  restoreTimer();
});

let timerInterval;
let totalTime = 60; // minutes default
const DATA_PATH   = 'data/google_pool.json';
const RECENT_KEY  = 'recentPickedSlugs';
const RECENT_LIMIT = 50; // remember last N problems to avoid repeats
const END_AT_KEY   = 'contestEndAt';

function startContest() {
  console.log('Starting the contest...');
  loadQuestions();

  // Hide the start button and duration input
  const startBtn = document.querySelector('.start-button');
  const inputBox = document.querySelector('.input-container');
  if (startBtn) startBtn.style.display = 'none';
  if (inputBox) inputBox.style.display = 'none';

  // Show the regenerate and end buttons
  const regenBtn = document.querySelector('.regenerate-button');
  const endBtn   = document.querySelector('.end-button');
  if (regenBtn) regenBtn.style.display = 'inline-block';
  if (endBtn)   endBtn.style.display   = 'inline-block';

  // Show the timer and start it
  const timerWrap = document.querySelector('.timer');
  timerWrap?.classList.remove('hidden');
  startTimer();
}

function regenerateContest() {
  console.log('Regenerating contest...');
  loadQuestions();
}

function endContest() {
  console.log('Ending the contest...');

  // Show the start button and duration input
  const startBtn = document.querySelector('.start-button');
  const inputBox = document.querySelector('.input-container');
  if (startBtn) {
    startBtn.style.display = 'inline-block';
    startBtn.disabled = false;
  }
  if (inputBox) inputBox.style.display = 'block';

  // Hide the regenerate and end buttons
  const regenBtn = document.querySelector('.regenerate-button');
  const endBtn   = document.querySelector('.end-button');
  if (regenBtn) regenBtn.style.display = 'none';
  if (endBtn)   endBtn.style.display   = 'none';

  // Hide the timer and stop it
  const timerWrap = document.querySelector('.timer');
  timerWrap?.classList.add('hidden');
  stopTimer();
  localStorage.removeItem(END_AT_KEY);

  // Clear the questions
  const qList = document.querySelector('.question-list');
  if (qList) qList.innerHTML = '';
}

function loadQuestions() {
  console.log('Loading questions...');
  fetch(DATA_PATH)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to fetch ${DATA_PATH}`);
      return response.json();
    })
    .then(data => {
      const pool = Array.isArray(data) ? data : data.problems || [];
      if (!pool.length) throw new Error('Empty problems pool');

      const recent = new Set(getRecent());

      const easy   = pool.filter(q => q.difficulty === 'easy'   && !recent.has(q.slug));
      const medium = pool.filter(q => q.difficulty === 'medium' && !recent.has(q.slug));
      const hard   = pool.filter(q => q.difficulty === 'hard'   && !recent.has(q.slug));

      // Fallback if we filtered out too many due to 'recent'
      const ePick = sampleUnique(easy.length ? easy : pool.filter(q => q.difficulty === 'easy'), 1);
      const mPick = sampleUnique(medium.length ? medium : pool.filter(q => q.difficulty === 'medium'), 2);
      const hPick = sampleUnique(hard.length ? hard : pool.filter(q => q.difficulty === 'hard'), 1);

      const picks = shuffle([...ePick, ...mPick, ...hPick]);

      saveRecent(picks.map(p => p.slug));

      const formatted = picks.map(q => ({
        title: slugToTitle(q.slug),
        url: `https://leetcode.com/problems/${q.slug}/`,
        difficulty: q.difficulty
      }));

      displayQuestions(formatted);
    })
    .catch(error => console.error('Error loading questions:', error));
}

function displayQuestions(questions) {
  console.log('Displaying questions:', questions);
  const questionListDiv = document.querySelector('.question-list');
  if (!questionListDiv) return;
  questionListDiv.innerHTML = '';

  questions.forEach((q, index) => {
    const item = document.createElement('div');
    item.className = 'question-item';

    const link = document.createElement('a');
    link.href = q.url;
    link.target = '_blank';
    link.textContent = q.title;
    link.rel = 'noopener noreferrer';
    link.classList.add(q.difficulty); // "easy" | "medium" | "hard" for CSS

    const markButton = document.createElement('button');
    markButton.className = 'tick-button';
    markButton.textContent = 'Mark as Solved';
    markButton.onclick = () => toggleSolved(index);

    item.appendChild(link);
    item.appendChild(markButton);
    questionListDiv.appendChild(item);
  });
}

function toggleSolved(index) {
  console.log('Toggling solved state for question index:', index);
  const questions = document.querySelectorAll('.question-item');
  const question = questions[index];
  if (!question) return;
  question.classList.toggle('solved');
}

/* ---------- Utilities ---------- */

function slugToTitle(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Fisher–Yates unique sample; throws if k > arr.length
function sampleUnique(arr, k) {
  if (k > arr.length) throw new Error('Not enough items to sample');
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
  catch { return []; }
}

function saveRecent(slugs) {
  const recent = [...slugs, ...getRecent()];
  // keep unique, maintain order (newest first)
  const uniq = [];
  const seen = new Set();
  for (const s of recent) {
    if (!seen.has(s)) {
      uniq.push(s);
      seen.add(s);
    }
  }
  localStorage.setItem(RECENT_KEY, JSON.stringify(uniq.slice(0, RECENT_LIMIT)));
}

/* ---------- Timer ---------- */

function startTimer() {
  const durationInput = document.getElementById('duration');
  totalTime = parseInt(durationInput?.value, 10);
  if (Number.isNaN(totalTime) || totalTime <= 0) totalTime = 60;

  const endAt = Date.now() + totalTime * 60 * 1000;
  localStorage.setItem(END_AT_KEY, String(endAt));
  runTimer(endAt);
}

function runTimer(endAt) {
  stopTimer(); // ensure single interval
  updateTimerDisplay(Math.max(0, Math.floor((endAt - Date.now())/1000)));

  timerInterval = setInterval(() => {
    const remaining = Math.max(0, Math.floor((endAt - Date.now())/1000));
    updateTimerDisplay(remaining);
    if (remaining === 0) {
      stopTimer();
      alert('Time is up!');
    }
  }, 1000);

  const timerWrap = document.querySelector('.timer');
  timerWrap?.classList.remove('hidden');
}

function restoreTimer() {
  const endRaw = localStorage.getItem(END_AT_KEY);
  const endAt = endRaw ? Number(endRaw) : NaN;
  if (!Number.isNaN(endAt) && endAt > Date.now()) {
    runTimer(endAt);
    // Also ensure UI state matches "in contest"
    const startBtn = document.querySelector('.start-button');
    const inputBox = document.querySelector('.input-container');
    const regenBtn = document.querySelector('.regenerate-button');
    const endBtn   = document.querySelector('.end-button');
    if (startBtn) startBtn.style.display = 'none';
    if (inputBox) inputBox.style.display = 'none';
    if (regenBtn) regenBtn.style.display = 'inline-block';
    if (endBtn)   endBtn.style.display   = 'inline-block';
  }
}

function updateTimerDisplay(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const el = document.getElementById('timer');
  if (el) el.textContent = `${mm}:${ss}`;
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = undefined;
}
