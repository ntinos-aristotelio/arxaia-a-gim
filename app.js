const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const stateKey = 'akadimiaArxaionProgressV2_6';
const teacherToolsKey = 'akadimiaTeacherToolsUnlockedV2_6';
const TEACHER_CODE = 'akadimia2026';
const defaultState = {
  name: '',
  xp: 0,
  coins: 0,
  streak: 0,
  completed: {},
  badges: [],
  answers: {},
  mistakes: {},
  diagnosticHistory: [],
  teacherMode: false,
  activeUnitId: '',
  exerciseMode: {},
  showAnswers: {},
  showReport: {},
  unitNotes: {},
  bookmarks: {},
  hintsUsed: {},
  mentorSessions: [],
  dailyClaims: {},
  dailyStreak: 0,
  lastDailyClaim: '',
  challengeHistory: [],
  teacherPrefs: {}
};

let loadedState = {};
try {
  loadedState = JSON.parse(localStorage.getItem(stateKey) || '{}');
} catch (err) {
  loadedState = {};
}
let state = Object.assign({}, defaultState, loadedState);
state.completed = state.completed || {};
state.badges = state.badges || [];
state.answers = state.answers || {};
state.mistakes = state.mistakes || {};
state.diagnosticHistory = state.diagnosticHistory || [];
state.exerciseMode = state.exerciseMode || {};
state.showAnswers = state.showAnswers || {};
state.showReport = state.showReport || {};
state.unitNotes = state.unitNotes || {};
state.bookmarks = state.bookmarks || {};
state.hintsUsed = state.hintsUsed || {};
state.mentorSessions = state.mentorSessions || [];
state.dailyClaims = state.dailyClaims || {};
state.dailyStreak = state.dailyStreak || 0;
state.lastDailyClaim = state.lastDailyClaim || '';
state.challengeHistory = state.challengeHistory || [];
state.teacherPrefs = state.teacherPrefs || {};

let mapFilter = 'all';
let mapSearch = '';
let classroomSession = { deck: [], index: 0, showAnswer: false, scores: { a: 0, b: 0 } };
let challengeSession = { deck: [], index: 0, score: 0, answered: false, results: [] };

function save() {
  localStorage.setItem(stateKey, JSON.stringify(state));
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function teacherToolsUnlocked() {
  return sessionStorage.getItem(teacherToolsKey) === 'true';
}

function setTeacherToolsUnlocked(value) {
  if (value) {
    sessionStorage.setItem(teacherToolsKey, 'true');
  } else {
    sessionStorage.removeItem(teacherToolsKey);
  }
  renderTeacherToolsMenu();
}

function requestTeacherAccess() {
  if (teacherToolsUnlocked()) {
    renderTeacherToolsMenu(true);
    return true;
  }
  const code = prompt('Κωδικός καθηγητή');
  if (code === TEACHER_CODE) {
    setTeacherToolsUnlocked(true);
    toast('Τα εργαλεία καθηγητή ξεκλειδώθηκαν.');
    return true;
  }
  if (code !== null) toast('Λάθος κωδικός καθηγητή.');
  return false;
}

function renderTeacherToolsMenu(forceOpen = false) {
  const box = $('#teacherToolsBox');
  const menu = $('#teacherToolsMenu');
  const gate = $('#teacherToolsBtn');
  if (!box || !menu || !gate) return;
  const unlocked = teacherToolsUnlocked();
  box.classList.toggle('locked', !unlocked);
  box.classList.toggle('unlocked', unlocked);
  if (unlocked || forceOpen) {
    menu.classList.remove('hidden');
    gate.textContent = '🔓 Εργαλεία καθηγητή';
  } else {
    menu.classList.add('hidden');
    gate.textContent = '🔐 Εργαλεία καθηγητή';
  }
}

function ensureTeacherAccess() {
  return teacherToolsUnlocked() || requestTeacherAccess();
}

function rank() {
  if (state.xp >= 12000) return 'Διδάσκαλος της Ακαδημίας';
  if (state.xp >= 9000) return 'Φιλόσοφος της Ακαδημίας';
  if (state.xp >= 6500) return 'Ρήτωρ';
  if (state.xp >= 4200) return 'Φύλακας των Λέξεων';
  if (state.xp >= 1800) return 'Μαθητευόμενος Γραμματιστής';
  return 'Νέος Μαθητής';
}

function addBadge(b) {
  if (!state.badges.includes(b)) {
    state.badges.push(b);
    toast('Νέο σήμα: ' + b);
  }
}

function exerciseId(unitId, idx) {
  return unitId + '-' + idx;
}

function totalExercises() {
  return ACADEMY_UNITS.reduce((sum, u) => sum + u.exercises.length, 0);
}

function solvedExercises() {
  const valid = new Set();
  ACADEMY_UNITS.forEach(u => u.exercises.forEach((_, idx) => valid.add(exerciseId(u.id, idx))));
  return Object.keys(state.answers).filter(id => valid.has(id)).length;
}

function unitSolvedCount(u) {
  return u.exercises.filter((_, idx) => state.answers[exerciseId(u.id, idx)]).length;
}

function unitRequired(u) {
  return u.requiredSolved || Math.min(3, u.exercises.length);
}

function coursePercent() {
  const total = totalExercises();
  return total ? Math.round((solvedExercises() / total) * 100) : 0;
}

function award(id, points = 20, card = null) {
  if (state.answers[id]) {
    return false;
  }
  state.answers[id] = true;
  state.xp += points;
  state.coins += Math.ceil(points / 10);
  state.streak += 1;
  if (state.streak === 3) addBadge('Σερί 3 σωστών');
  if (state.streak === 7) addBadge('Αλυσίδα Σοφίας');
  if (state.xp >= 100) addBadge('Πρώτα 100 XP');
  if (state.xp >= 1000) addBadge('1000 XP στην Ακαδημία');
  save();
  renderStats();
  if (card) markCardSolved(card);
  refreshActiveProgress();
  return true;
}

function findExerciseById(id) {
  const lastDash = String(id).lastIndexOf('-');
  if (lastDash < 0) return { unit: null, ex: null, idx: -1 };
  const unitId = id.slice(0, lastDash);
  const idx = Number(id.slice(lastDash + 1));
  const unit = ACADEMY_UNITS.find(u => u.id === unitId);
  return { unit, ex: unit && Number.isInteger(idx) ? unit.exercises[idx] : null, idx };
}

function recordMistake(id) {
  if (!id) return;
  const found = findExerciseById(id);
  const current = state.mistakes[id] || { count: 0, firstSeen: new Date().toISOString() };
  current.count = Number(current.count || 0) + 1;
  current.lastSeen = new Date().toISOString();
  if (found.unit && found.ex) {
    current.unitId = found.unit.id;
    current.unitTitle = found.unit.title;
    current.place = found.unit.place;
    current.exerciseTitle = found.ex.title;
  }
  state.mistakes[id] = current;
}

function mistakeTotal() {
  return Object.values(state.mistakes || {}).reduce((sum, item) => sum + Number(item.count || 0), 0);
}

function miss(id = '') {
  if (id) recordMistake(id);
  state.streak = 0;
  save();
  renderStats();
}

function renderStats() {
  $('#greeting').textContent = 'Χαίρε, ' + (state.name || 'μαθητή') + '!';
  $('#rankTitle').textContent = rank();
  $('#xp').textContent = state.xp;
  $('#coins').textContent = state.coins;
  $('#streak').textContent = state.streak;
  $('#relics').textContent = Object.keys(state.completed).length;
  $('#xpBar').style.width = Math.min(100, (state.xp % 220) / 220 * 100) + '%';

  const solved = solvedExercises();
  const total = totalExercises();
  $('#overallProgress').innerHTML = `
    <div class="mini-label">Συνολική πορεία</div>
    <div class="course-meter"><span style="width:${coursePercent()}%"></span></div>
    <strong>${solved}/${total}</strong> δοκιμασίες λυμένες • <strong>${Object.keys(state.completed).length}/${ACADEMY_UNITS.length}</strong> περιοχές σφραγισμένες • <strong>${mistakeTotal()}</strong> λάθη προς επανάληψη • <strong>${state.dailyStreak || 0}</strong> ημερήσιο σερί
  `;

  const hint = solved === 0
    ? 'Ξεκίνα από την πρώτη ανοιχτή αποστολή. Μη βιαστείς: διάβασε πρώτα τις κάρτες μικρομαθήματος.'
    : solved < 40
      ? 'Καλή αρχή. Δούλεψε πρώτα τις “Προθέρμανση” και “Εργαστήριο” πριν πας σε boss.'
      : solved < 180
        ? 'Η πορεία έχει ρυθμό. Χρησιμοποίησε το φίλτρο “Σε εξέλιξη” για να μη χάνεσαι.'
        : 'Προχωρημένη πορεία. Η τελική επανάληψη στις Πύλες της Ακαδημίας θα δέσει όλη την ύλη.';
  $('#mentorHint').textContent = hint;

  $('#badges').innerHTML = state.badges.length
    ? state.badges.map(b => `<span class="badge">${escapeHTML(b)}</span>`).join('')
    : '<span class="source">Τα σήματα θα εμφανιστούν εδώ.</span>';

  const preview = $('#teacherPreviewBtn');
  if (preview) {
    preview.textContent = state.teacherMode ? 'Κλείσιμο προεπισκόπησης' : 'Προεπισκόπηση καθηγητή';
    preview.classList.toggle('active', !!state.teacherMode);
  }
  renderTeacherToolsMenu();
}

function start() {
  const input = $('#studentName').value.trim();
  if (input) state.name = input;
  if (!state.name) state.name = 'Μαθητής';
  save();
  $('.hero').classList.add('hidden');
  $('#appShell').classList.remove('hidden');
  render();
}

function isUnlocked(i) {
  return state.teacherMode || i === 0 || state.completed[ACADEMY_UNITS[i - 1].id];
}

function firstPlayableIndex() {
  const activeIndex = ACADEMY_UNITS.findIndex(u => u.id === state.activeUnitId);
  if (activeIndex >= 0 && isUnlocked(activeIndex)) return activeIndex;

  const firstIncomplete = ACADEMY_UNITS.findIndex((u, i) => isUnlocked(i) && !state.completed[u.id]);
  if (firstIncomplete >= 0) return firstIncomplete;

  const firstUnlocked = ACADEMY_UNITS.findIndex((_, i) => isUnlocked(i));
  return firstUnlocked >= 0 ? firstUnlocked : 0;
}

function render() {
  renderStats();
  renderCurriculumPanel();
  renderMap();
  openUnit(firstPlayableIndex(), false);
}

function renderCurriculumPanel() {
  const schoolUnits = ACADEMY_UNITS.filter(u => /Ενότητα\s+\d+/.test(u.title)).length;
  const doneUnits = Object.keys(state.completed).length;
  const total = totalExercises();
  const solved = solvedExercises();

  $('#curriculumPanel').innerHTML = `
    <div class="coverage-card">
      <strong>Κάλυψη ύλης</strong>
      <span>Ενότητες 1-10, γραμματική, λεξιλόγιο, συντακτικό και μεγάλη επανάληψη.</span>
    </div>
    <div class="coverage-card">
      <strong>${schoolUnits}</strong>
      <span>σχολικές αποστολές</span>
    </div>
    <div class="coverage-card">
      <strong>${doneUnits}/${ACADEMY_UNITS.length}</strong>
      <span>περιοχές σφραγισμένες</span>
    </div>
    <div class="coverage-card">
      <strong>${solved}/${total}</strong>
      <span>δοκιμασίες λυμένες</span>
    </div>
  `;
}

function unitMatchesSearch(u) {
  if (!mapSearch) return true;
  const hay = [u.place, u.title, u.story, u.source, ...(u.phases || []), ...(u.microLessons || []).map(m => m.title + ' ' + m.body)].join(' ').toLowerCase();
  return normalize(hay).includes(normalize(mapSearch));
}

function unitMatchesFilter(u, i) {
  if (mapFilter === 'done') return !!state.completed[u.id];
  if (mapFilter === 'open') return isUnlocked(i);
  if (mapFilter === 'todo') return isUnlocked(i) && !state.completed[u.id];
  return true;
}

function renderMap() {
  const items = ACADEMY_UNITS
    .map((u, i) => ({ u, i }))
    .filter(({ u, i }) => unitMatchesSearch(u) && unitMatchesFilter(u, i));

  $('#map').innerHTML = items.length
    ? items.map(({ u, i }) => {
      const solved = unitSolvedCount(u);
      const total = u.exercises.length;
      return `
        <button class="node ${state.completed[u.id] ? 'done' : ''} ${!isUnlocked(i) ? 'locked' : ''} ${state.activeUnitId === u.id ? 'current' : ''}" data-i="${i}">
          <div class="icon">${u.icon}</div>
          <h3>${escapeHTML(u.place)}</h3>
          <strong>${escapeHTML(u.title)}</strong>
          <br><small>${isUnlocked(i) ? solved + '/' + total + ' δοκιμασίες' : 'Κλειδωμένο'}</small>
        </button>
      `;
    }).join('')
    : '<div class="empty-state">Δεν βρέθηκαν περιοχές με αυτά τα κριτήρια.</div>';

  $$('.node').forEach(n => n.addEventListener('click', () => {
    const i = +n.dataset.i;
    if (!isUnlocked(i)) return toast('Πρώτα ολοκλήρωσε την προηγούμενη περιοχή.');
    openUnit(i);
  }));
}

function openUnit(i, rerenderMap = true) {
  if (i < 0) i = 0;
  const u = ACADEMY_UNITS[i];
  if (!u) return;

  state.activeUnitId = u.id;
  save();
  if (rerenderMap) renderMap();

  const done = !!state.completed[u.id];
  const solved = unitSolvedCount(u);
  const required = unitRequired(u);
  const mode = state.exerciseMode[u.id] || 'guided';
  const showReport = !!state.showReport[u.id];
  const showAnswers = !!state.showAnswers[u.id] && state.teacherMode;
  const tags = learningTags(u);

  const prototype = u.prototypeNote ? `<div class="unit-focus">🧭 ${escapeHTML(u.prototypeNote)}</div>` : '';
  const phases = u.phases ? `<div class="phase-strip">${u.phases.map((p, n) => `<span class="phase-pill">${n + 1}. ${escapeHTML(p)}</span>`).join('')}</div>` : '';
  const noteValue = escapeHTML(state.unitNotes[u.id] || '');
  const bookmarked = !!state.bookmarks[u.id];

  $('#lessonView').innerHTML = `
    <article class="lesson-card">
      <div class="lesson-head">
        <div>
          <p class="eyebrow">${escapeHTML(u.place)}</p>
          <h2>${u.icon} ${escapeHTML(u.title)}</h2>
        </div>
        <button id="completeUnitBtn">${done ? 'Ολοκληρώθηκε' : 'Σφράγισε την αποστολή'}</button>
      </div>

      <div class="unit-dashboard">
        <div><strong id="unitProgressLine">${solved}/${u.exercises.length}</strong><span>δοκιμασίες</span></div>
        <div><strong>${required}</strong><span>για σφραγίδα</span></div>
        <div><strong>${u.exercises.filter(ex => ex.type === 'duel').length || 1}</strong><span>mini boss</span></div>
        <div><strong>${tags.length}</strong><span>άξονες ύλης</span></div>
      </div>

      <p>${escapeHTML(u.story)}</p>
      ${prototype}
      ${phases}
      <p class="source">${escapeHTML(u.source)}</p>

      <div class="learning-path">
        <div class="path-step"><b>1. Θυμήσου</b><span>διάβασε τις κάρτες</span></div>
        <div class="path-step"><b>2. Δοκίμασε</b><span>λύσε βασικές ασκήσεις</span></div>
        <div class="path-step"><b>3. Κατέκτησε</b><span>πήγαινε σε δύσκολες δοκιμασίες</span></div>
        <div class="path-step"><b>4. Σφράγισε</b><span>νίκησε το mini boss</span></div>
      </div>

      <details class="micro-lessons" open>
        <summary>📜 Κάρτες μικρομαθήματος</summary>
        <div class="micro-grid">${u.microLessons.map(m => `<div class="micro"><strong>${escapeHTML(m.title)}</strong><p>${escapeHTML(m.body)}</p></div>`).join('')}</div>
      </details>

      <div class="unit-tags">${tags.map(t => `<span>${escapeHTML(t)}</span>`).join('')}</div>

      <div class="teacher-tools">
        <button id="showGuidedBtn" class="${mode === 'guided' ? 'active-tool' : ''}">Καθοδηγούμενη ροή</button>
        <button id="showUnsolvedBtn" class="${mode === 'unsolved' ? 'active-tool' : ''}">Μόνο άλυτες</button>
        <button id="showBossBtn" class="${mode === 'boss' ? 'active-tool' : ''}">Μόνο boss</button>
        <button id="showAllBtn" class="${mode === 'all' ? 'active-tool' : ''}">Όλες</button>
        <button id="printUnitBtn" class="ghost-tool">Εκτύπωση φύλλου</button>
        <button id="bookmarkUnitBtn" class="ghost-tool ${bookmarked ? 'active-tool' : ''}">${bookmarked ? '★ Σελιδοδείκτης' : '☆ Σελιδοδείκτης'}</button>
        ${state.teacherMode ? `<button id="toggleReportBtn" class="ghost-tool">${showReport ? 'Κλείσιμο αναφοράς' : 'Αναφορά καθηγητή'}</button><button id="toggleAnswersBtn" class="ghost-tool">${showAnswers ? 'Απόκρυψη απαντήσεων' : 'Σωστές απαντήσεις'}</button>` : ''}
      </div>

      ${showReport ? buildTeacherReport(u) : ''}
      ${showAnswers ? buildAnswerKeyPanel(u) : ''}

      <div class="notes-box">
        <label for="unitNotes"><strong>Σημειώσεις μαθητή</strong> <span>αποθηκεύονται μόνο σε αυτόν τον browser</span></label>
        <textarea id="unitNotes" placeholder="Γράψε εδώ τι πρέπει να θυμάσαι από την ενότητα...">${noteValue}</textarea>
      </div>
    </article>

    <div id="exercises"></div>
  `;

  $('#completeUnitBtn').addEventListener('click', () => completeUnit(u.id));
  $('#showGuidedBtn').addEventListener('click', () => setExerciseMode(u.id, 'guided'));
  $('#showUnsolvedBtn').addEventListener('click', () => setExerciseMode(u.id, 'unsolved'));
  $('#showBossBtn').addEventListener('click', () => setExerciseMode(u.id, 'boss'));
  $('#showAllBtn').addEventListener('click', () => setExerciseMode(u.id, 'all'));
  $('#printUnitBtn').addEventListener('click', () => printUnit(u.id));
  $('#bookmarkUnitBtn').addEventListener('click', () => toggleBookmark(u.id));
  const reportBtn = $('#toggleReportBtn');
  if (reportBtn) reportBtn.addEventListener('click', () => {
    if (!ensureTeacherAccess()) return;
    state.showReport[u.id] = !state.showReport[u.id];
    save();
    openUnit(i);
  });
  const answersBtn = $('#toggleAnswersBtn');
  if (answersBtn) answersBtn.addEventListener('click', () => {
    if (!ensureTeacherAccess()) return;
    if (!state.teacherMode) return toast('Οι απαντήσεις εμφανίζονται μόνο στην προεπισκόπηση καθηγητή.');
    state.showAnswers[u.id] = !state.showAnswers[u.id];
    save();
    openUnit(i);
  });
  $('#unitNotes').addEventListener('input', (e) => {
    state.unitNotes[u.id] = e.target.value;
    save();
  });

  renderExercises(u.id);
}

function setExerciseMode(unitId, mode) {
  state.exerciseMode[unitId] = mode;
  save();
  const idx = ACADEMY_UNITS.findIndex(u => u.id === unitId);
  openUnit(idx);
}

function learningTags(u) {
  const text = normalize([u.title, u.source, u.story, ...(u.phases || [])].join(' '));
  const tags = [];
  if (/κειμενο|κατανοηση|λουκιαν|σωκρατ|ισοκρατ|αισωπ|αλεξανδρ|φιλια|ελαφι/.test(text)) tags.push('Κατανόηση κειμένου');
  if (/λεξ|φωνη|γη|πατηρ|ελευθερ|κτημ|ζυγ|ποσ|ριζ/.test(text)) tags.push('Λεξιλόγιο');
  if (/ρημα|ειμι|λυω|αοριστ|παρατατικ|μελλοντ|παρακειμεν|αυξησ|αναδιπλασιασ/.test(text)) tags.push('Ρήματα');
  if (/κλισ|ουσιαστικ|επιθετ|αντωνυμ|πτωσ|αρσενικ|θηλυκ|ουδετερ/.test(text)) tags.push('Κλίσεις');
  if (/υποκειμεν|αντικειμεν|κατηγορουμεν|συνδετικ/.test(text)) tags.push('Σύνταξη');
  if (/φθογγ|φωνηεν|διφθογγ|τον|πνευμα|συλλαβ/.test(text)) tags.push('Φθόγγοι - τονισμός');
  return tags.length ? tags : ['Μικρομάθηση', 'Εξάσκηση', 'Επανάληψη'];
}

function exerciseTypeLabel(type) {
  return {
    choice: 'Επιλογή',
    fill: 'Συμπλήρωση',
    match: 'Αντιστοίχιση',
    sort: 'Σειρά',
    tablefill: 'Πίνακας',
    duel: 'Mini boss'
  }[type] || 'Δοκιμασία';
}

function typeCounts(u) {
  return u.exercises.reduce((acc, ex) => {
    acc[exerciseTypeLabel(ex.type)] = (acc[exerciseTypeLabel(ex.type)] || 0) + 1;
    return acc;
  }, {});
}

function buildTeacherReport(u) {
  const counts = typeCounts(u);
  const tags = learningTags(u);
  return `
    <section class="teacher-report">
      <h3>📚 Αναφορά καθηγητή</h3>
      <div class="report-grid">
        <div><strong>Στόχος</strong><p>${escapeHTML(u.story)}</p></div>
        <div><strong>Άξονες ύλης</strong><p>${tags.map(escapeHTML).join(' • ')}</p></div>
        <div><strong>Τύποι ασκήσεων</strong><p>${Object.entries(counts).map(([k, v]) => `${escapeHTML(k)}: ${v}`).join(' • ')}</p></div>
        <div><strong>Πρόταση χρήσης</strong><p>Πρώτα 5-8 λεπτά κάρτες μικρομαθήματος, μετά καθοδηγούμενη ροή, τέλος mini boss ή εκτύπωση φύλλου για σπίτι.</p></div>
      </div>
    </section>
  `;
}

function buildAnswerKeyPanel(u) {
  return `
    <section class="answer-key-panel">
      <h3>🔑 Κλείδα απαντήσεων καθηγητή</h3>
      <ol>
        ${u.exercises.map((ex, idx) => `<li><strong>${idx + 1}. ${escapeHTML(ex.title)}</strong>: ${answerHTML(ex)}</li>`).join('')}
      </ol>
    </section>
  `;
}

function answerHTML(ex) {
  if (ex.type === 'choice') return escapeHTML(ex.options[ex.answer]);
  if (ex.type === 'fill') return (Array.isArray(ex.answer) ? ex.answer : [ex.answer]).map(escapeHTML).join(' / ');
  if (ex.type === 'match') return ex.pairs.map(p => `${escapeHTML(p[0])} → ${escapeHTML(p[1])}`).join(' • ');
  if (ex.type === 'sort') return (ex.correct || []).map(escapeHTML).join(' → ');
  if (ex.type === 'tablefill') return ex.fields.map(f => `${escapeHTML(f.label)}: ${(Array.isArray(f.answer) ? f.answer : [f.answer]).map(escapeHTML).join(' / ')}`).join(' • ');
  if (ex.type === 'duel') return ex.rounds.map((r, i) => `Γύρος ${i + 1}: ${escapeHTML(r.options[r.answer])}`).join(' • ');
  return '—';
}

function completeUnit(id) {
  const u = ACADEMY_UNITS.find(x => x.id === id);
  const solved = unitSolvedCount(u);
  const required = unitRequired(u);
  if (solved < required) return toast('Λύσε τουλάχιστον ' + required + ' δοκιμασίες για να σφραγιστεί.');
  if (!state.completed[id]) {
    state.completed[id] = true;
    state.xp += 50;
    state.coins += 8;
    addBadge(u.relic);
    toast('Κέρδισες κειμήλιο: ' + u.relic);
    save();
    render();
  }
}

function buildGuidedStages(u) {
  const all = u.exercises.map((ex, idx) => ({ ex, idx }));
  const bosses = all.filter(item => item.ex.type === 'duel');
  const normal = all.filter(item => item.ex.type !== 'duel');
  const firstCut = Math.ceil(normal.length * 0.34);
  const secondCut = Math.ceil(normal.length * 0.72);

  return [
    {
      title: '1. Προθέρμανση',
      subtitle: 'Βασικές ερωτήσεις για να μπει ο μαθητής στο θέμα.',
      items: normal.slice(0, firstCut),
      open: true
    },
    {
      title: '2. Εργαστήριο',
      subtitle: 'Λεξιλόγιο, γραμματική και τύποι με περισσότερη εξάσκηση.',
      items: normal.slice(firstCut, secondCut),
      open: false
    },
    {
      title: '3. Πρόκληση',
      subtitle: 'Πιο απαιτητικές δοκιμασίες πριν από τη σφραγίδα.',
      items: normal.slice(secondCut),
      open: false
    },
    {
      title: '4. Mini boss',
      subtitle: 'Η τελική δοκιμασία της περιοχής.',
      items: bosses,
      open: false
    }
  ].filter(stage => stage.items.length);
}

function exerciseItemsForMode(u, mode) {
  const all = u.exercises.map((ex, idx) => ({ ex, idx }));
  if (mode === 'unsolved') return [{
    title: 'Άλυτες δοκιμασίες',
    subtitle: 'Εμφανίζονται μόνο όσα δεν έχει λύσει ο μαθητής.',
    items: all.filter(item => !state.answers[exerciseId(u.id, item.idx)]),
    open: true
  }];
  if (mode === 'boss') return [{
    title: 'Mini boss',
    subtitle: 'Οι τελικές μονομαχίες της ενότητας.',
    items: all.filter(item => item.ex.type === 'duel'),
    open: true
  }];
  if (mode === 'all') return [{
    title: 'Όλες οι δοκιμασίες',
    subtitle: 'Πλήρης λίστα ασκήσεων της ενότητας.',
    items: all,
    open: true
  }];
  return buildGuidedStages(u);
}

function renderExercises(id) {
  const u = ACADEMY_UNITS.find(x => x.id === id);
  const mode = state.exerciseMode[id] || 'guided';
  const stages = exerciseItemsForMode(u, mode);

  $('#exercises').innerHTML = stages.length
    ? stages.map(stage => `
      <details class="exercise-stage" ${stage.open ? 'open' : ''}>
        <summary>
          <span>${escapeHTML(stage.title)}</span>
          <small>${escapeHTML(stage.subtitle)} • ${stage.items.length} δοκιμασίες</small>
        </summary>
        <div class="stage-body">
          ${stage.items.map(item => exerciseHTML(item.ex, id, item.idx)).join('')}
        </div>
      </details>
    `).join('')
    : '<div class="empty-state">Δεν υπάρχουν δοκιμασίες με αυτό το φίλτρο.</div>';

  bindExercises(u);
}

function exerciseHTML(ex, unitId, idx) {
  const id = exerciseId(unitId, idx);
  const solved = !!state.answers[id];
  const status = solved ? 'Λυμένη' : 'Άλυτη';
  const showAnswer = state.teacherMode && state.showAnswers[unitId];
  const meta = `
    <div class="exercise-meta">
      <span>${exerciseTypeLabel(ex.type)}</span>
      <span class="${solved ? 'status-done' : 'status-todo'}">${status}</span>
    </div>
  `;
  const answerLine = showAnswer ? `<div class="teacher-answer"><strong>Απάντηση:</strong> ${answerHTML(ex)}</div>` : '';

  if (ex.type === 'choice') return `
    <article class="exercise ${solved ? 'solved' : ''}" data-id="${id}" data-ex-index="${idx}" data-type="choice">
      ${meta}<h3>⚔️ ${escapeHTML(ex.title)}</h3><p>${escapeHTML(ex.prompt)}</p>
      <div class="options">${ex.options.map((o, i) => `<button class="option" data-a="${i}">${escapeHTML(o)}</button>`).join('')}</div>
      ${answerLine}<button class="ghost-tool mentor-help">🧭 Βοήθεια μέντορα</button><div class="feedback">${solved ? '✓ Έχει λυθεί.' : ''}</div>
    </article>`;

  if (ex.type === 'fill') return `
    <article class="exercise ${solved ? 'solved' : ''}" data-id="${id}" data-ex-index="${idx}" data-type="fill">
      ${meta}<h3>📜 ${escapeHTML(ex.title)}</h3><p>${escapeHTML(ex.prompt)}</p>
      <input placeholder="γράψε απάντηση"><button class="checkFill">Έλεγχος</button><button class="ghost hint" style="color:#172033;border-color:#c7a35a">Υπόδειξη</button>
      ${answerLine}<button class="ghost-tool mentor-help">🧭 Βοήθεια μέντορα</button><div class="feedback">${solved ? '✓ Έχει λυθεί.' : ''}</div>
    </article>`;

  if (ex.type === 'match') return `
    <article class="exercise ${solved ? 'solved' : ''}" data-id="${id}" data-ex-index="${idx}" data-type="match">
      ${meta}<h3>🧩 ${escapeHTML(ex.title)}</h3><p>Πάτησε πρώτα αριστερή κάρτα και μετά τη σωστή δεξιά κάρτα.</p>
      <div class="match-grid">
        <div>${ex.pairs.map((p, i) => `<div class="pill left" data-v="${i}">${escapeHTML(p[0])}</div>`).join('')}</div>
        <div>${shuffle(ex.pairs.map((p, i) => [p[1], i])).map(p => `<div class="pill right" data-v="${p[1]}">${escapeHTML(p[0])}</div>`).join('')}</div>
      </div>
      ${answerLine}<button class="ghost-tool mentor-help">🧭 Βοήθεια μέντορα</button><div class="feedback">${solved ? '✓ Έχει λυθεί.' : ''}</div>
    </article>`;

  if (ex.type === 'sort') return `
    <article class="exercise ${solved ? 'solved' : ''}" data-id="${id}" data-ex-index="${idx}" data-type="sort">
      ${meta}<h3>🏺 ${escapeHTML(ex.title)}</h3><p>${escapeHTML(ex.prompt || 'Πάτησε τις κάρτες με τη σωστή σειρά.')}</p>
      <div class="sort-list">${shuffle(ex.items).map(it => `<div class="sort-item">${escapeHTML(it)}</div>`).join('')}</div>
      <button class="checkSort">Έλεγχος σειράς</button>
      ${answerLine}<button class="ghost-tool mentor-help">🧭 Βοήθεια μέντορα</button><div class="feedback">${solved ? '✓ Έχει λυθεί.' : ''}</div>
    </article>`;

  if (ex.type === 'tablefill') return `
    <article class="exercise ${solved ? 'solved' : ''}" data-id="${id}" data-ex-index="${idx}" data-type="tablefill">
      ${meta}<h3>📋 ${escapeHTML(ex.title)}</h3><p>${escapeHTML(ex.prompt)}</p>
      <div class="table-fill">${ex.fields.map((f, i) => `<label><span>${escapeHTML(f.label)}</span><input data-field="${i}" placeholder="τύπος"></label>`).join('')}</div>
      <button class="checkTable">Σφράγισε πίνακα</button>
      ${answerLine}<button class="ghost-tool mentor-help">🧭 Βοήθεια μέντορα</button><div class="feedback">${solved ? '✓ Έχει λυθεί.' : ''}</div>
    </article>`;

  if (ex.type === 'duel') return `
    <article class="exercise boss ${solved ? 'solved' : ''}" data-id="${id}" data-ex-index="${idx}" data-type="duel">
      ${meta}<h3>🐍 ${escapeHTML(ex.title)}</h3><p>${escapeHTML(ex.prompt)}</p>
      <div class="boss-meter"><span style="width:100%"></span></div>
      <div class="duel-stage"><button class="startDuel">Ξεκίνα μονομαχία</button></div>
      ${answerLine}<button class="ghost-tool mentor-help">🧭 Βοήθεια μέντορα</button><div class="feedback">${solved ? '✓ Έχει λυθεί.' : ''}</div>
    </article>`;

  return '';
}

function bindExercises(u) {
  $$('.exercise').forEach(card => {
    const idx = +card.dataset.exIndex;
    const ex = u.exercises[idx];
    const id = card.dataset.id;
    const mentorBtn = card.querySelector('.mentor-help');
    if (mentorBtn) mentorBtn.onclick = () => showExerciseMentor(card, ex, u, id);

    if (ex.type === 'choice') {
      card.querySelectorAll('.option').forEach(btn => btn.onclick = () => {
        if (state.answers[id]) return toast('Αυτή η δοκιμασία έχει ήδη λυθεί.');
        const ok = +btn.dataset.a === ex.answer;
        btn.classList.add(ok ? 'correct' : 'wrong');
        card.querySelector('.feedback').textContent = ok ? ex.feedback : 'Όχι ακόμα. Ξανασκέψου τον κανόνα.';
        ok ? award(id, 25, card) : miss(id);
      });
    }

    if (ex.type === 'fill') {
      card.querySelector('.hint').onclick = () => card.querySelector('.feedback').textContent = ex.hint || 'Ξαναδιάβασε την κάρτα μικρομαθήματος.';
      card.querySelector('.checkFill').onclick = () => {
        if (state.answers[id]) return toast('Αυτή η δοκιμασία έχει ήδη λυθεί.');
        const val = normalize(card.querySelector('input').value);
        const accepted = Array.isArray(ex.answer) ? ex.answer : [ex.answer];
        const ok = accepted.some(a => val === normalize(a));
        card.querySelector('.feedback').textContent = ok ? (ex.feedback || 'Σωστά. Ο πάπυρος άνοιξε.') : 'Όχι ακόμα. Πρόσεξε τόνους/κατάληξη, αλλά μπορείς να γράψεις και χωρίς τόνο.';
        ok ? award(id, 30, card) : miss(id);
      };
    }

    if (ex.type === 'match') {
      let left = null;
      let count = 0;
      const alreadyHidden = new Set();
      card.querySelectorAll('.left').forEach(p => p.onclick = () => {
        if (state.answers[id]) return toast('Αυτή η δοκιμασία έχει ήδη λυθεί.');
        if (alreadyHidden.has(p.dataset.v)) return;
        left = p;
        card.querySelectorAll('.pill').forEach(x => x.classList.remove('selected'));
        p.classList.add('selected');
      });
      card.querySelectorAll('.right').forEach(p => p.onclick = () => {
        if (state.answers[id]) return toast('Αυτή η δοκιμασία έχει ήδη λυθεί.');
        if (!left) return;
        if (left.dataset.v === p.dataset.v) {
          alreadyHidden.add(p.dataset.v);
          left.style.visibility = 'hidden';
          p.style.visibility = 'hidden';
          count++;
          if (count === ex.pairs.length) {
            card.querySelector('.feedback').textContent = 'Όλα ταιριάστηκαν σωστά.';
            award(id, 35, card);
          }
        } else {
          card.querySelector('.feedback').textContent = 'Δεν ταιριάζουν. Δοκίμασε άλλο ζευγάρι.';
          miss(id);
        }
      });
    }

    if (ex.type === 'sort') {
      const picked = [];
      card.querySelectorAll('.sort-item').forEach(it => it.onclick = () => {
        if (state.answers[id]) return toast('Αυτή η δοκιμασία έχει ήδη λυθεί.');
        if (it.classList.contains('active')) return;
        it.classList.add('active');
        picked.push(it.textContent);
        it.textContent = picked.length + '. ' + it.textContent;
      });
      card.querySelector('.checkSort').onclick = () => {
        if (state.answers[id]) return toast('Αυτή η δοκιμασία έχει ήδη λυθεί.');
        const ok = JSON.stringify(picked.map(x => x.replace(/^\d+\.\s*/, ''))) === JSON.stringify(ex.correct);
        card.querySelector('.feedback').textContent = ok ? 'Η σειρά είναι σωστή.' : 'Η σωστή σειρά είναι: ' + ex.correct.join(' → ');
        ok ? award(id, 35, card) : miss(id);
      };
    }

    if (ex.type === 'tablefill') {
      card.querySelector('.checkTable').onclick = () => {
        if (state.answers[id]) return toast('Αυτή η δοκιμασία έχει ήδη λυθεί.');
        let ok = true;
        ex.fields.forEach((f, i) => {
          const input = card.querySelector(`[data-field="${i}"]`);
          const accepted = Array.isArray(f.answer) ? f.answer : [f.answer];
          const good = accepted.some(a => normalize(input.value) === normalize(a));
          input.classList.toggle('field-ok', good);
          input.classList.toggle('field-bad', !good);
          if (!good) ok = false;
        });
        card.querySelector('.feedback').textContent = ok ? (ex.feedback || 'Ο πίνακας συμπληρώθηκε σωστά.') : 'Κάποιοι τύποι θέλουν ξανά έλεγχο. Μπορείς να γράψεις και χωρίς τόνους.';
        ok ? award(id, 45, card) : miss(id);
      };
    }

    if (ex.type === 'duel') {
      let round = 0;
      let hp = ex.rounds.length;
      const stage = card.querySelector('.duel-stage');
      const meter = card.querySelector('.boss-meter span');

      function drawRound() {
        if (state.answers[id]) return toast('Αυτή η μονομαχία έχει ήδη κερδηθεί.');
        if (round >= ex.rounds.length) {
          stage.innerHTML = '<div class="duel-victory">Ο Φύλακας υποχώρησε. Η σφραγίδα άνοιξε.</div>';
          card.querySelector('.feedback').textContent = 'Νίκη στο mini boss.';
          award(id, ex.reward || 60, card);
          return;
        }

        const r = ex.rounds[round];
        stage.innerHTML = `
          <div class="round-label">Γύρος ${round + 1}/${ex.rounds.length}</div>
          <p><strong>${escapeHTML(r.q)}</strong></p>
          <div class="options">${r.options.map((o, i) => `<button class="option duelOption" data-a="${i}">${escapeHTML(o)}</button>`).join('')}</div>
        `;
        stage.querySelectorAll('.duelOption').forEach(btn => btn.onclick = () => {
          const activeRound = ex.rounds[round];
          const ok = +btn.dataset.a === activeRound.answer;
          btn.classList.add(ok ? 'correct' : 'wrong');
          if (ok) {
            hp--;
            round++;
            meter.style.width = (hp / ex.rounds.length * 100) + '%';
            card.querySelector('.feedback').textContent = activeRound.feedback || 'Σωστό χτύπημα.';
            setTimeout(drawRound, 650);
          } else {
            card.querySelector('.feedback').textContent = 'Ο Φύλακας κρατά την ασπίδα. Ξανασκέψου.';
            miss(id);
          }
        });
      }

      card.querySelector('.startDuel').onclick = drawRound;
    }
  });
}

function markCardSolved(card) {
  card.classList.add('solved');
  const status = card.querySelector('.status-todo');
  if (status) {
    status.classList.remove('status-todo');
    status.classList.add('status-done');
    status.textContent = 'Λυμένη';
  }
}

function refreshActiveProgress() {
  const u = ACADEMY_UNITS.find(x => x.id === state.activeUnitId);
  const line = $('#unitProgressLine');
  if (u && line) line.textContent = unitSolvedCount(u) + '/' + u.exercises.length;
  renderCurriculumPanel();
  renderMap();
}


function allExerciseRefs() {
  const refs = [];
  ACADEMY_UNITS.forEach((u, unitIndex) => {
    u.exercises.forEach((ex, idx) => refs.push({ u, unitIndex, ex, idx, id: exerciseId(u.id, idx) }));
  });
  return refs;
}

function openExerciseRef(ref, mode = 'all') {
  if (!ref) return;
  if (!isUnlocked(ref.unitIndex)) return toast('Η περιοχή είναι ακόμη κλειδωμένη στη μαθητική πορεία. Άνοιξε προεπισκόπηση καθηγητή για έλεγχο.');
  state.exerciseMode[ref.u.id] = mode;
  openUnit(ref.unitIndex);
  setTimeout(() => {
    const card = document.querySelector(`[data-id="${ref.id}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 180);
}

function diagnosticPool() {
  const pool = [];
  allExerciseRefs().forEach(ref => {
    const area = learningTags(ref.u)[0] || 'Γενική επανάληψη';
    if (ref.ex.type === 'choice') {
      pool.push({
        qid: ref.id + ':choice',
        originId: ref.id,
        ref,
        area,
        place: ref.u.place,
        unitTitle: ref.u.title,
        title: ref.ex.title,
        prompt: ref.ex.prompt,
        options: ref.ex.options,
        answer: ref.ex.answer
      });
    }
    if (ref.ex.type === 'duel') {
      ref.ex.rounds.forEach((round, roundIndex) => pool.push({
        qid: ref.id + ':duel:' + roundIndex,
        originId: ref.id,
        ref,
        area,
        place: ref.u.place,
        unitTitle: ref.u.title,
        title: ref.ex.title + ' • γύρος ' + (roundIndex + 1),
        prompt: round.q,
        options: round.options,
        answer: round.answer
      }));
    }
  });
  return pool;
}

function selectDiagnosticQuestions(limit = 20) {
  const pool = diagnosticPool();
  const selected = [];
  const used = new Set();
  ACADEMY_UNITS.forEach(u => {
    const first = pool.find(q => q.ref.u.id === u.id && !used.has(q.qid));
    if (first && selected.length < limit) {
      selected.push(first);
      used.add(first.qid);
    }
  });
  shuffle(pool).forEach(q => {
    if (selected.length < limit && !used.has(q.qid)) {
      selected.push(q);
      used.add(q.qid);
    }
  });
  return selected.slice(0, limit);
}

function renderDiagnosticCenter() {
  state.activeUnitId = '';
  save();
  renderMap();
  const questions = selectDiagnosticQuestions(20);
  $('#lessonView').innerHTML = `
    <article class="lesson-card feature-panel">
      <p class="eyebrow">Build 2.1 • Διαγνωστικό</p>
      <h2>🧭 Διαγνωστικό Τεστ Ακαδημίας</h2>
      <p>Είκοσι σύντομες ερωτήσεις από όλη την ύλη. Στο τέλος εμφανίζεται αναφορά με δυνατά σημεία, αδύνατα σημεία και προτεινόμενες περιοχές επανάληψης.</p>
      <div class="feature-grid">
        <div><strong>${questions.length}</strong><span>ερωτήσεις</span></div>
        <div><strong>${ACADEMY_UNITS.length}</strong><span>περιοχές ύλης</span></div>
        <div><strong>${mistakeTotal()}</strong><span>λάθη στο βιβλίο</span></div>
      </div>
      <div class="diagnostic-list">
        ${questions.map((q, i) => `
          <section class="diagnostic-question" data-q="${i}">
            <div class="exercise-meta"><span>${escapeHTML(q.area)}</span><span>${escapeHTML(q.place)}</span></div>
            <h3>${i + 1}. ${escapeHTML(q.title)}</h3>
            <p>${escapeHTML(q.prompt)}</p>
            <div class="diagnostic-options">
              ${q.options.map((opt, n) => `
                <label>
                  <input type="radio" name="diag-${i}" value="${n}">
                  <span>${escapeHTML(opt)}</span>
                </label>
              `).join('')}
            </div>
          </section>
        `).join('')}
      </div>
      <div class="feature-actions-row">
        <button id="submitDiagnosticBtn">Ολοκλήρωση διαγνωστικού</button>
        <button id="newDiagnosticBtn" class="ghost-tool">Νέο διαγνωστικό</button>
      </div>
      <div id="diagnosticResult"></div>
    </article>
  `;
  $('#submitDiagnosticBtn').addEventListener('click', () => evaluateDiagnostic(questions));
  $('#newDiagnosticBtn').addEventListener('click', renderDiagnosticCenter);
  $('#lessonView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function evaluateDiagnostic(questions) {
  let correct = 0;
  const wrong = [];
  const areaStats = {};
  questions.forEach((q, i) => {
    const checked = document.querySelector(`input[name="diag-${i}"]:checked`);
    const picked = checked ? Number(checked.value) : -1;
    const ok = picked === q.answer;
    areaStats[q.area] = areaStats[q.area] || { correct: 0, total: 0 };
    areaStats[q.area].total += 1;
    if (ok) {
      correct += 1;
      areaStats[q.area].correct += 1;
    } else {
      wrong.push(Object.assign({}, q, { picked }));
      recordMistake(q.originId);
    }
  });
  const score = Math.round((correct / questions.length) * 100);
  const weakAreas = Object.entries(areaStats)
    .filter(([, v]) => v.correct < v.total)
    .map(([area, v]) => ({ area, correct: v.correct, total: v.total }));

  state.diagnosticHistory.unshift({
    date: new Date().toISOString(),
    score,
    correct,
    total: questions.length,
    weakAreas,
    wrong: wrong.map(q => ({ unitId: q.ref.u.id, title: q.title, area: q.area }))
  });
  state.diagnosticHistory = state.diagnosticHistory.slice(0, 8);
  const bonus = Math.max(20, correct * 4);
  state.xp += bonus;
  state.coins += Math.ceil(bonus / 12);
  if (score >= 80) addBadge('Διαγνωστικό 80%+');
  if (score === 100) addBadge('Άριστος Διαγνώστης');
  save();
  renderStats();

  const recommended = [...new Map(wrong.map(q => [q.ref.u.id, q])).values()].slice(0, 6);
  $('#diagnosticResult').innerHTML = `
    <section class="diagnostic-result">
      <h3>Αποτέλεσμα: ${correct}/${questions.length} • ${score}%</h3>
      <p>Κέρδισες ${bonus} XP. Τα λάθη αποθηκεύτηκαν στο Κέντρο Επανάληψης.</p>
      <div class="result-meter"><span style="width:${score}%"></span></div>
      ${weakAreas.length ? `
        <h4>Άξονες που θέλουν επανάληψη</h4>
        <div class="unit-tags">${weakAreas.map(a => `<span>${escapeHTML(a.area)}: ${a.correct}/${a.total}</span>`).join('')}</div>
      ` : '<p class="success-line">Καμία αδυναμία σε αυτό το διαγνωστικό. Πολύ δυνατή πορεία.</p>'}
      ${recommended.length ? `
        <h4>Προτεινόμενες περιοχές επανάληψης</h4>
        <div class="review-list">
          ${recommended.map(q => `
            <button class="review-item" data-unit="${q.ref.unitIndex}" data-idx="${q.ref.idx}">
              <strong>${escapeHTML(q.place)}</strong>
              <span>${escapeHTML(q.unitTitle)}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}
      <details class="answer-review">
        <summary>Δες αναλυτικά τις σωστές απαντήσεις</summary>
        <ol>
          ${questions.map((q, i) => {
            const picked = document.querySelector(`input[name="diag-${i}"]:checked`);
            const pickedValue = picked ? Number(picked.value) : -1;
            const ok = pickedValue === q.answer;
            return `<li class="${ok ? 'ok-line' : 'bad-line'}"><strong>${escapeHTML(q.title)}</strong>: σωστό είναι <b>${escapeHTML(q.options[q.answer])}</b>${pickedValue >= 0 ? ` • επέλεξες ${escapeHTML(q.options[pickedValue])}` : ' • δεν απαντήθηκε'}</li>`;
          }).join('')}
        </ol>
      </details>
    </section>
  `;
  bindReviewOpenButtons();
  $('#diagnosticResult').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function mistakeEntries() {
  return Object.entries(state.mistakes || {})
    .map(([id, info]) => Object.assign({ id }, info, findExerciseById(id)))
    .filter(item => item.unit && item.ex)
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0));
}

function collectUnsolvedByTag() {
  const tags = {};
  ACADEMY_UNITS.forEach((u, i) => {
    if (!isUnlocked(i)) return;
    const count = u.exercises.filter((_, idx) => !state.answers[exerciseId(u.id, idx)]).length;
    if (!count) return;
    learningTags(u).forEach(tag => tags[tag] = (tags[tag] || 0) + count);
  });
  return tags;
}

function renderReviewCenter() {
  state.activeUnitId = '';
  save();
  renderMap();
  const entries = mistakeEntries();
  const unsolvedByTag = collectUnsolvedByTag();
  const history = state.diagnosticHistory || [];
  $('#lessonView').innerHTML = `
    <article class="lesson-card feature-panel">
      <p class="eyebrow">Build 2.1 • Επανάληψη</p>
      <h2>🧠 Κέντρο Επανάληψης</h2>
      <p>Εδώ συγκεντρώνονται οι δυσκολίες του μαθητή και μετατρέπονται σε στοχευμένη επανάληψη.</p>
      <div class="feature-grid">
        <div><strong>${mistakeTotal()}</strong><span>συνολικά λάθη</span></div>
        <div><strong>${entries.length}</strong><span>δοκιμασίες με δυσκολία</span></div>
        <div><strong>${solvedExercises()}/${totalExercises()}</strong><span>πορεία</span></div>
      </div>

      <section class="review-section">
        <h3>🔥 Πρώτα επανάλαβε αυτά</h3>
        ${entries.length ? `
          <div class="review-list">
            ${entries.slice(0, 10).map(item => `
              <button class="review-item" data-unit="${ACADEMY_UNITS.findIndex(u => u.id === item.unit.id)}" data-idx="${item.idx}">
                <strong>${escapeHTML(item.ex.title)}</strong>
                <span>${escapeHTML(item.unit.place)} • ${escapeHTML(item.unit.title)} • ${item.count} λάθος/η</span>
              </button>
            `).join('')}
          </div>
          <button id="clearMistakesBtn" class="ghost-tool danger-soft">Καθαρισμός λίστας δυσκολιών</button>
        ` : '<div class="empty-state">Δεν έχουν καταγραφεί λάθη ακόμη. Κάνε ένα διαγνωστικό ή λύσε ασκήσεις για να δημιουργηθεί προσωπική επανάληψη.</div>'}
      </section>

      <section class="review-section">
        <h3>🧩 Άλυτες δοκιμασίες ανά άξονα</h3>
        <div class="tag-practice-grid">
          ${Object.entries(unsolvedByTag).sort((a,b)=>b[1]-a[1]).map(([tag, count]) => `
            <button class="tag-practice" data-tag="${escapeHTML(tag)}">
              <strong>${escapeHTML(tag)}</strong>
              <span>${count} άλυτες</span>
            </button>
          `).join('') || '<div class="empty-state">Δεν υπάρχουν άλυτες ανοιχτές δοκιμασίες.</div>'}
        </div>
      </section>

      <section class="review-section">
        <h3>📈 Τελευταία διαγνωστικά</h3>
        ${history.length ? `<div class="history-list">${history.map(h => `<div><strong>${h.score}%</strong><span>${new Date(h.date).toLocaleString('el-GR')} • ${h.correct}/${h.total}</span></div>`).join('')}</div>` : '<div class="empty-state">Δεν έχει γίνει ακόμη διαγνωστικό τεστ.</div>'}
      </section>
    </article>
  `;
  bindReviewOpenButtons();
  const clear = $('#clearMistakesBtn');
  if (clear) clear.addEventListener('click', () => {
    if (!confirm('Να καθαριστεί η λίστα δυσκολιών; Δεν θα χαθεί η λυμένη πρόοδος.')) return;
    state.mistakes = {};
    save();
    renderStats();
    renderReviewCenter();
  });
  $$('.tag-practice').forEach(btn => btn.addEventListener('click', () => renderPracticeByTag(btn.dataset.tag)));
  $('#lessonView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPracticeByTag(tag) {
  const items = [];
  ACADEMY_UNITS.forEach((u, i) => {
    if (!isUnlocked(i)) return;
    if (!learningTags(u).includes(tag)) return;
    u.exercises.forEach((ex, idx) => {
      const id = exerciseId(u.id, idx);
      if (!state.answers[id]) items.push({ u, i, ex, idx, id });
    });
  });
  $('#lessonView').innerHTML = `
    <article class="lesson-card feature-panel">
      <p class="eyebrow">Στοχευμένη επανάληψη</p>
      <h2>🎯 ${escapeHTML(tag)}</h2>
      <p>Άνοιξε μία από τις παρακάτω δοκιμασίες. Η εφαρμογή θα σε μεταφέρει στην αντίστοιχη ενότητα.</p>
      <div class="review-list">
        ${items.slice(0, 18).map(item => `
          <button class="review-item" data-unit="${item.i}" data-idx="${item.idx}">
            <strong>${escapeHTML(item.ex.title)}</strong>
            <span>${escapeHTML(item.u.place)} • ${escapeHTML(item.u.title)} • ${exerciseTypeLabel(item.ex.type)}</span>
          </button>
        `).join('') || '<div class="empty-state">Δεν βρέθηκαν άλυτες δοκιμασίες για αυτόν τον άξονα.</div>'}
      </div>
      <button id="backReviewBtn" class="ghost-tool">Επιστροφή στο Κέντρο Επανάληψης</button>
    </article>
  `;
  bindReviewOpenButtons();
  $('#backReviewBtn').addEventListener('click', renderReviewCenter);
}

function renderStudyPlan() {
  state.activeUnitId = '';
  save();
  renderMap();
  const plan = buildStudyPlan();
  $('#lessonView').innerHTML = `
    <article class="lesson-card feature-panel">
      <p class="eyebrow">Build 2.1 • Πλάνο</p>
      <h2>📅 Πλάνο Μελέτης 7 Ημερών</h2>
      <p>Ένα πρακτικό εβδομαδιαίο πλάνο βασισμένο στην πρόοδο του μαθητή. Ξεκινά από τις ανοιχτές και μη ολοκληρωμένες περιοχές και κρατά καθημερινό στόχο μικρό.</p>
      <div class="study-plan">
        ${plan.map((day, i) => `
          <section class="day-card">
            <div class="day-number">Ημέρα ${i + 1}</div>
            <h3>${escapeHTML(day.title)}</h3>
            <p>${escapeHTML(day.goal)}</p>
            <ul>${day.tasks.map(t => `<li>${escapeHTML(t)}</li>`).join('')}</ul>
            <button class="ghost-tool" data-unit="${day.unitIndex}">Άνοιγμα περιοχής</button>
          </section>
        `).join('')}
      </div>
      <div class="feature-actions-row">
        <button id="copyPlanBtn">Αντιγραφή πλάνου</button>
        <button id="printPlanBtn" class="ghost-tool">Εκτύπωση</button>
      </div>
    </article>
  `;
  bindReviewOpenButtons();
  $('#copyPlanBtn').addEventListener('click', () => copyStudyPlan(plan));
  $('#printPlanBtn').addEventListener('click', () => window.print());
  $('#lessonView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildStudyPlan() {
  const candidates = ACADEMY_UNITS
    .map((u, i) => ({ u, i, solved: unitSolvedCount(u), total: u.exercises.length, done: !!state.completed[u.id], unlocked: isUnlocked(i) }))
    .filter(item => item.unlocked)
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.solved / a.total) - (b.solved / b.total));
  const source = candidates.length ? candidates : ACADEMY_UNITS.map((u, i) => ({ u, i, solved: unitSolvedCount(u), total: u.exercises.length }));
  const labels = ['Είσοδος στην ύλη', 'Λεξιλόγιο και κατανόηση', 'Γραμματική βάση', 'Στοχευμένη εξάσκηση', 'Mini boss', 'Επανάληψη λαθών', 'Σφράγισμα πορείας'];
  return Array.from({ length: 7 }, (_, day) => {
    const item = source[day % source.length];
    const u = item.u;
    const unsolved = u.exercises.length - unitSolvedCount(u);
    return {
      unitIndex: item.i,
      title: u.place + ' — ' + u.title,
      goal: labels[day] + '. Στόχος: μικρή, καθαρή πρόοδος χωρίς βιασύνη.',
      tasks: [
        'Διάβασε 2 κάρτες μικρομαθήματος.',
        'Λύσε 5 άλυτες δοκιμασίες ή όσες απομένουν αν είναι λιγότερες.',
        unsolved > 0 ? 'Σημείωσε μία δυσκολία στο πεδίο σημειώσεων μαθητή.' : 'Κάνε επανάληψη από τις σωστές απαντήσεις και κλείσε την ενότητα.',
        day >= 4 ? 'Δοκίμασε mini boss ή τυχαία άλυτη δοκιμασία.' : 'Μη βιαστείς για boss πριν δεις τα βασικά.'
      ]
    };
  });
}


function dayStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function seedFromString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle(items, seedText) {
  let seed = seedFromString(seedText || 'akadimia');
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function daysBetween(a, b) {
  if (!a || !b) return 999;
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}

function dailyMissionRefs(count = 6) {
  const today = dayStamp();
  const unlocked = allExerciseRefs().filter(ref => isUnlocked(ref.unitIndex));
  const mistakes = topMistakeRefs(10).filter(ref => isUnlocked(ref.unitIndex));
  const unsolved = unlocked.filter(ref => !state.answers[ref.id]);
  const normal = unlocked.filter(ref => ref.ex.type !== 'duel');
  const pool = uniqueRefs([...mistakes, ...unsolved, ...normal, ...unlocked]);
  return seededShuffle(pool, `${today}:${state.name || 'student'}:daily`).slice(0, count);
}

function renderDailyMissions() {
  featureStart();
  const today = dayStamp();
  const refs = dailyMissionRefs(6);
  const solved = refs.filter(ref => state.answers[ref.id]).length;
  const claimed = !!state.dailyClaims[today];
  const percent = refs.length ? Math.round((solved / refs.length) * 100) : 0;

  $('#lessonView').innerHTML = `
    <article class="lesson-card feature-panel daily-panel">
      <p class="eyebrow">Build 2.6 • Ημερήσιες αποστολές</p>
      <h2>☀️ Ημερήσιες αποστολές</h2>
      <p>Κάθε μέρα η Ακαδημία προτείνει λίγες στοχευμένες δοκιμασίες. Στόχος δεν είναι η ποσότητα· είναι να επιστρέφει ο μαθητής συχνά και να χτίζει σταθερή πρόοδο.</p>

      <div class="daily-hero-grid">
        <div><strong>${solved}/${refs.length}</strong><span>σημερινές δοκιμασίες</span></div>
        <div><strong>${percent}%</strong><span>πρόοδος ημέρας</span></div>
        <div><strong>${state.dailyStreak || 0}</strong><span>ημερήσιο σερί</span></div>
        <div><strong>${claimed ? '✓' : '—'}</strong><span>ανταμοιβή ημέρας</span></div>
      </div>
      <div class="course-meter large"><span style="width:${percent}%"></span></div>

      <section class="daily-missions-list">
        ${refs.map((ref, i) => `
          <button class="daily-mission-card review-item ${state.answers[ref.id] ? 'done' : ''}" data-unit="${ref.unitIndex}" data-idx="${ref.idx}">
            <span class="mission-number">${i + 1}</span>
            <strong>${escapeHTML(ref.ex.title)}</strong>
            <small>${escapeHTML(ref.u.place)} • ${escapeHTML(ref.u.title)} • ${exerciseTypeLabel(ref.ex.type)}</small>
            <em>${state.answers[ref.id] ? 'Λύθηκε σήμερα ή παλιότερα' : 'Άνοιγμα δοκιμασίας'}</em>
          </button>
        `).join('')}
      </section>

      <section class="daily-reward-box">
        <h3>🏺 Ανταμοιβή ημέρας</h3>
        <p>Λύσε τουλάχιστον <strong>3 από τις 6</strong> σημερινές αποστολές και κέρδισε bonus XP, οβολούς και σερί ημέρας.</p>
        <button id="claimDailyRewardBtn" ${solved >= 3 && !claimed ? '' : 'disabled'}>${claimed ? 'Η ανταμοιβή έχει δοθεί' : 'Σφράγισε την ημέρα'}</button>
      </section>
    </article>
  `;
  bindReviewOpenButtons();
  $('#claimDailyRewardBtn').addEventListener('click', claimDailyReward);
  $('#lessonView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function claimDailyReward() {
  const today = dayStamp();
  const refs = dailyMissionRefs(6);
  const solved = refs.filter(ref => state.answers[ref.id]).length;
  if (state.dailyClaims[today]) return toast('Η σημερινή ανταμοιβή έχει ήδη δοθεί.');
  if (solved < 3) return toast('Χρειάζονται τουλάχιστον 3 λυμένες ημερήσιες αποστολές.');
  const gap = daysBetween(state.lastDailyClaim, today);
  state.dailyStreak = gap === 1 ? Number(state.dailyStreak || 0) + 1 : 1;
  state.lastDailyClaim = today;
  state.dailyClaims[today] = true;
  state.xp += 80;
  state.coins += 12;
  addBadge('Ημερήσιος Περιηγητής');
  if (state.dailyStreak >= 3) addBadge('Τριήμερο Σερί Ακαδημίας');
  if (state.dailyStreak >= 7) addBadge('Εβδομαδιαίος Φύλακας');
  save();
  renderStats();
  renderDailyMissions();
  toast('Η ημέρα σφραγίστηκε: +80 XP και +12 οβολοί.');
}

function arenaPool(mode, count) {
  const baseTypes = new Set(['choice', 'fill']);
  const all = allExerciseRefs().filter(ref => baseTypes.has(ref.ex.type) && isUnlocked(ref.unitIndex));
  let pool = all;
  if (mode === 'unsolved') pool = all.filter(ref => !state.answers[ref.id]);
  if (mode === 'mistakes') {
    const mistakeIds = new Set(Object.keys(state.mistakes || {}));
    pool = all.filter(ref => mistakeIds.has(ref.id));
  }
  if (pool.length < count) pool = uniqueRefs([...pool, ...all]);
  return shuffle(pool).slice(0, count);
}

function renderChallengeArena() {
  featureStart();
  const history = state.challengeHistory || [];
  const last = history[0];
  $('#lessonView').innerHTML = `
    <article class="lesson-card feature-panel arena-panel">
      <p class="eyebrow">Build 2.6 • Γρήγορη επανάληψη</p>
      <h2>⚔️ Αρένα επανάληψης</h2>
      <p>Μικρή μονομαχία 5-15 ερωτήσεων για γρήγορη επανάληψη. Ιδανική για το τέλος του μαθήματος ή για προσωπική προπόνηση στο σπίτι.</p>
      <div class="arena-setup">
        <label><span>Ερωτήσεις</span><select id="arenaCount"><option value="5">5 γρήγορες</option><option value="10" selected>10 κανονικές</option><option value="15">15 απαιτητικές</option></select></label>
        <label><span>Εστίαση</span><select id="arenaMode"><option value="mixed">Μικτή ύλη</option><option value="unsolved">Άλυτες δοκιμασίες</option><option value="mistakes">Λάθη μαθητή</option></select></label>
        <button id="startArenaBtn">Έναρξη αρένας</button>
      </div>
      <div class="arena-last">
        <strong>Τελευταία προσπάθεια</strong>
        <span>${last ? `${last.score}/${last.total} • ${new Date(last.date).toLocaleDateString('el-GR')}` : 'Δεν υπάρχει ακόμη ιστορικό αρένας.'}</span>
      </div>
      <div id="arenaStage" class="arena-stage empty-state">Διάλεξε ρυθμίσεις και ξεκίνα.</div>
    </article>
  `;
  $('#startArenaBtn').addEventListener('click', startChallengeArena);
  $('#lessonView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function startChallengeArena() {
  const count = Math.max(5, Math.min(15, Number($('#arenaCount').value) || 10));
  const mode = $('#arenaMode').value;
  const deck = arenaPool(mode, count);
  if (!deck.length) return toast('Δεν βρέθηκαν κατάλληλες ερωτήσεις για την αρένα.');
  challengeSession = { deck, index: 0, score: 0, answered: false, results: [], mode };
  renderChallengeStage();
}

function renderChallengeStage() {
  const stage = $('#arenaStage');
  const ref = challengeSession.deck[challengeSession.index];
  if (!stage) return;
  if (!ref) {
    finishChallengeArena();
    return;
  }
  stage.className = 'arena-stage';
  stage.innerHTML = `
    <div class="arena-scoreline">
      <span>Ερώτηση ${challengeSession.index + 1}/${challengeSession.deck.length}</span>
      <span>Σκορ: <strong>${challengeSession.score}</strong></span>
    </div>
    <section class="arena-question">
      <div class="test-meta">${escapeHTML(ref.u.place)} • ${escapeHTML(ref.u.title)} • ${exerciseTypeLabel(ref.ex.type)}</div>
      <h3>${escapeHTML(ref.ex.title)}</h3>
      ${arenaQuestionBody(ref)}
      <div id="arenaFeedback" class="arena-feedback"></div>
    </section>
  `;
  bindArenaQuestion(ref);
}

function arenaQuestionBody(ref) {
  const ex = ref.ex;
  if (ex.type === 'choice') {
    return `<p>${escapeHTML(ex.prompt)}</p><div class="arena-options">${ex.options.map((o, i) => `<button data-a="${i}">${escapeHTML(o)}</button>`).join('')}</div>`;
  }
  if (ex.type === 'fill') {
    return `<p>${escapeHTML(ex.prompt)}</p><div class="arena-fill"><input id="arenaFillInput" placeholder="γράψε απάντηση"><button id="arenaFillCheck">Έλεγχος</button></div>`;
  }
  return `<p>${escapeHTML(ex.prompt || 'Απάντησε προφορικά.')}</p>`;
}

function bindArenaQuestion(ref) {
  if (ref.ex.type === 'choice') {
    $$('#arenaStage .arena-options button').forEach(btn => btn.addEventListener('click', () => answerArena(ref, Number(btn.dataset.a) === ref.ex.answer)));
  }
  if (ref.ex.type === 'fill') {
    $('#arenaFillCheck').addEventListener('click', () => {
      const val = normalize($('#arenaFillInput').value);
      const accepted = Array.isArray(ref.ex.answer) ? ref.ex.answer : [ref.ex.answer];
      const ok = accepted.some(a => val === normalize(a));
      answerArena(ref, ok);
    });
    $('#arenaFillInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#arenaFillCheck').click(); });
  }
}

function answerArena(ref, ok) {
  if (challengeSession.answered) return;
  challengeSession.answered = true;
  if (ok) {
    challengeSession.score += 1;
    award(ref.id, 12);
  } else {
    miss(ref.id);
  }
  challengeSession.results.push({ id: ref.id, ok, title: ref.ex.title, unit: ref.u.place, answer: answerHTML(ref.ex) });
  const feedback = $('#arenaFeedback');
  feedback.innerHTML = `
    <div class="arena-result ${ok ? 'ok' : 'bad'}">
      <strong>${ok ? 'Σωστό!' : 'Όχι ακόμα.'}</strong>
      <span>Απάντηση: ${answerHTML(ref.ex)}</span>
      <button id="nextArenaQuestion">${challengeSession.index + 1 >= challengeSession.deck.length ? 'Τέλος αρένας' : 'Επόμενη ερώτηση'}</button>
    </div>
  `;
  $('#nextArenaQuestion').addEventListener('click', () => {
    challengeSession.index += 1;
    challengeSession.answered = false;
    renderChallengeStage();
  });
}

function finishChallengeArena() {
  const total = challengeSession.deck.length;
  const score = challengeSession.score;
  const percent = total ? Math.round(score / total * 100) : 0;
  state.challengeHistory.unshift({ date: new Date().toISOString(), score, total, percent, mode: challengeSession.mode });
  state.challengeHistory = state.challengeHistory.slice(0, 12);
  if (percent >= 80) addBadge('Μονομάχος Επανάληψης');
  save();
  $('#arenaStage').className = 'arena-stage arena-finish';
  $('#arenaStage').innerHTML = `
    <h3>Τέλος αρένας</h3>
    <div class="arena-final-score">${score}/${total} <span>${percent}%</span></div>
    <p>${percent >= 80 ? 'Εξαιρετική μονομαχία. Η Ακαδημία σε αναγνωρίζει.' : percent >= 50 ? 'Καλή προσπάθεια. Δες τα λάθη και ξαναμπες στην αρένα.' : 'Θέλει επανάληψη. Ο Μέντορας μπορεί να σε βοηθήσει με μικρότερη διαδρομή.'}</p>
    <section class="arena-review-list">
      ${challengeSession.results.map((r, i) => `<div class="${r.ok ? 'ok' : 'bad'}"><strong>${i + 1}. ${escapeHTML(r.title)}</strong><span>${escapeHTML(r.unit)} • ${r.ok ? 'Σωστό' : 'Λάθος'} • Απάντηση: ${r.answer}</span></div>`).join('')}
    </section>
    <div class="feature-actions-row">
      <button id="restartArenaBtn">Νέα αρένα</button>
      <button id="arenaMentorBtn" class="ghost-tool">Άνοιγμα Μέντορα</button>
    </div>
  `;
  $('#restartArenaBtn').addEventListener('click', startChallengeArena);
  $('#arenaMentorBtn').addEventListener('click', renderAcademyMentor);
  renderStats();
}

function copyStudyPlan(plan) {
  const text = plan.map((day, i) => `Ημέρα ${i + 1}: ${day.title}\n- ${day.tasks.join('\n- ')}`).join('\n\n');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => toast('Το πλάνο αντιγράφηκε.')).catch(() => toast('Δεν μπόρεσε να αντιγραφεί αυτόματα.'));
  } else {
    toast('Ο browser δεν υποστηρίζει αυτόματη αντιγραφή.');
  }
}

function bindReviewOpenButtons() {
  $$('.review-item,[data-unit]').forEach(btn => btn.addEventListener('click', () => {
    const unitIndex = Number(btn.dataset.unit);
    const idx = btn.dataset.idx === undefined ? null : Number(btn.dataset.idx);
    const u = ACADEMY_UNITS[unitIndex];
    if (!u) return;
    if (!isUnlocked(unitIndex)) return toast('Η περιοχή είναι ακόμη κλειδωμένη στη μαθητική πορεία. Άνοιξε προεπισκόπηση καθηγητή για έλεγχο.');
    if (idx !== null && Number.isInteger(idx)) state.exerciseMode[u.id] = 'all';
    openUnit(unitIndex);
    if (idx !== null && Number.isInteger(idx)) {
      setTimeout(() => {
        const card = document.querySelector(`[data-id="${exerciseId(u.id, idx)}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 180);
    }
  }));
}

function exportProgress() {
  const payload = {
    exportedAt: new Date().toISOString(),
    build: '2.6',
    student: state.name,
    rank: rank(),
    xp: state.xp,
    coins: state.coins,
    solvedExercises: solvedExercises(),
    totalExercises: totalExercises(),
    completedUnits: Object.keys(state.completed),
    answers: state.answers,
    badges: state.badges,
    mistakes: state.mistakes,
    diagnostics: state.diagnosticHistory,
    notes: state.unitNotes,
    bookmarks: state.bookmarks,
    hintsUsed: state.hintsUsed,
    mentorSessions: state.mentorSessions,
    dailyClaims: state.dailyClaims,
    dailyStreak: state.dailyStreak,
    lastDailyClaim: state.lastDailyClaim,
    challengeHistory: state.challengeHistory
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'akadimia-progress-' + normalize(state.name || 'student').replace(/\s+/g, '-') + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function featureStart() {
  state.activeUnitId = '';
  save();
  renderMap();
}

function unitOptionHTML(selectedIds = []) {
  const selected = new Set(selectedIds);
  return ACADEMY_UNITS.map((u, i) => `
    <label class="checkline">
      <input type="checkbox" name="quizUnit" value="${escapeHTML(u.id)}" ${selected.size === 0 || selected.has(u.id) ? 'checked' : ''}>
      <span>${i + 1}. ${escapeHTML(u.place)} — ${escapeHTML(u.title)}</span>
    </label>
  `).join('');
}

function typeOptionHTML(selectedTypes = []) {
  const types = ['choice', 'fill', 'match', 'sort', 'tablefill', 'duel'];
  const selected = new Set(selectedTypes);
  return types.map(type => `
    <label class="checkline compact">
      <input type="checkbox" name="quizType" value="${type}" ${selected.size === 0 || selected.has(type) ? 'checked' : ''}>
      <span>${exerciseTypeLabel(type)}</span>
    </label>
  `).join('');
}

function allRefsByFilters(unitIds, types, includeSolved = true) {
  const unitSet = new Set(unitIds || []);
  const typeSet = new Set(types || []);
  return allExerciseRefs().filter(ref => {
    if (unitSet.size && !unitSet.has(ref.u.id)) return false;
    if (typeSet.size && !typeSet.has(ref.ex.type)) return false;
    if (!includeSolved && state.answers[ref.id]) return false;
    return true;
  });
}

function readGeneratorForm() {
  const unitIds = $$('input[name="quizUnit"]:checked').map(x => x.value);
  const types = $$('input[name="quizType"]:checked').map(x => x.value);
  const countInput = $('#testQuestionCount');
  const count = Math.max(5, Math.min(80, Number(countInput ? countInput.value : 20) || 20));
  const includeAnswers = !!($('#testIncludeAnswers') && $('#testIncludeAnswers').checked);
  const includeMicro = !!($('#testIncludeMicro') && $('#testIncludeMicro').checked);
  const includeSolved = !!($('#testIncludeSolved') && $('#testIncludeSolved').checked);
  return { unitIds, types, count, includeAnswers, includeMicro, includeSolved };
}


function completionLevel(percent) {
  if (percent >= 90) return 'Άρχοντας της ενότητας';
  if (percent >= 60) return 'Σταθερή πορεία';
  if (percent >= 30) return 'Ξεκίνησε καλά';
  return 'Χρειάζεται άνοιγμα';
}

function unlockedUnits() {
  return ACADEMY_UNITS.map((u, i) => ({ u, i })).filter(item => isUnlocked(item.i));
}

function currentMission() {
  const active = ACADEMY_UNITS.findIndex(u => u.id === state.activeUnitId);
  if (active >= 0 && isUnlocked(active) && !state.completed[ACADEMY_UNITS[active].id]) return active;
  const firstTodo = ACADEMY_UNITS.findIndex((u, i) => isUnlocked(i) && !state.completed[u.id]);
  return firstTodo >= 0 ? firstTodo : firstPlayableIndex();
}

function profileTagStats() {
  const stats = {};
  ACADEMY_UNITS.forEach(u => {
    const tags = learningTags(u);
    const solved = unitSolvedCount(u);
    const total = u.exercises.length || 1;
    tags.forEach(tag => {
      if (!stats[tag]) stats[tag] = { solved: 0, total: 0, mistakes: 0 };
      stats[tag].solved += solved;
      stats[tag].total += total;
    });
  });
  Object.values(state.mistakes || {}).forEach(m => {
    const u = ACADEMY_UNITS.find(unit => unit.id === m.unitId);
    const tags = u ? learningTags(u) : ['Γενική επανάληψη'];
    tags.forEach(tag => {
      if (!stats[tag]) stats[tag] = { solved: 0, total: 0, mistakes: 0 };
      stats[tag].mistakes += Number(m.count || 0);
    });
  });
  return Object.entries(stats)
    .map(([tag, value]) => ({ tag, ...value, percent: value.total ? Math.round(value.solved / value.total * 100) : 0 }))
    .sort((a, b) => b.percent - a.percent || a.mistakes - b.mistakes);
}

function nextUnsolvedRef(unit) {
  if (!unit) return null;
  const unitIndex = ACADEMY_UNITS.findIndex(u => u.id === unit.id);
  const idx = unit.exercises.findIndex((_, i) => !state.answers[exerciseId(unit.id, i)]);
  if (idx < 0) return null;
  return { u: unit, unitIndex, ex: unit.exercises[idx], idx, id: exerciseId(unit.id, idx) };
}

function topMistakeRefs(limit = 5) {
  return Object.entries(state.mistakes || {})
    .map(([id, item]) => ({ id, item, found: findExerciseById(id) }))
    .filter(x => x.found.unit && x.found.ex)
    .sort((a, b) => Number(b.item.count || 0) - Number(a.item.count || 0))
    .slice(0, limit)
    .map(x => ({ u: x.found.unit, unitIndex: ACADEMY_UNITS.findIndex(unit => unit.id === x.found.unit.id), ex: x.found.ex, idx: x.found.idx, id: x.id, count: x.item.count }));
}

function dailyGoals() {
  const missionIndex = currentMission();
  const mission = ACADEMY_UNITS[missionIndex];
  const next = nextUnsolvedRef(mission);
  const mistakes = topMistakeRefs(2);
  const bossRef = mission ? allExerciseRefs().find(ref => ref.u.id === mission.id && ref.ex.type === 'duel' && !state.answers[ref.id]) : null;
  const goals = [];
  if (next) goals.push({ icon: '🎯', title: 'Συνέχισε την πορεία', body: `Λύσε την επόμενη άλυτη δοκιμασία στην περιοχή ${mission.place}.`, ref: next });
  if (mistakes.length) goals.push({ icon: '🛠️', title: 'Διόρθωσε ένα δύσκολο σημείο', body: `Ξαναδούλεψε ${mistakes.length} δοκιμασία/ες που είχαν λάθος.`, ref: mistakes[0] });
  if (bossRef) goals.push({ icon: '⚔️', title: 'Πλησίασε το mini boss', body: `Προετοιμάσου για το boss της ενότητας ${mission.title}.`, ref: bossRef });
  if (!goals.length) goals.push({ icon: '🏛️', title: 'Μεγάλη επανάληψη', body: 'Έχεις εξαιρετική πορεία. Πήγαινε στις Πύλες της Ακαδημίας για τελικό έλεγχο.', ref: allExerciseRefs().find(ref => /Πύλες/.test(ref.u.place)) });
  return goals.slice(0, 3);
}

function toggleBookmark(unitId) {
  if (state.bookmarks[unitId]) {
    delete state.bookmarks[unitId];
    toast('Ο σελιδοδείκτης αφαιρέθηκε.');
  } else {
    state.bookmarks[unitId] = new Date().toISOString();
    toast('Προστέθηκε σελιδοδείκτης στην περιοχή.');
  }
  save();
  const idx = ACADEMY_UNITS.findIndex(u => u.id === unitId);
  openUnit(idx, false);
}


function uniqueRefs(refs) {
  const seen = new Set();
  return refs.filter(ref => {
    if (!ref || !ref.id || seen.has(ref.id)) return false;
    seen.add(ref.id);
    return true;
  });
}

function refsForWeakTags(limit = 6) {
  const weakTags = profileTagStats()
    .filter(t => t.mistakes > 0 || t.percent < 55)
    .sort((a, b) => b.mistakes - a.mistakes || a.percent - b.percent)
    .map(t => t.tag);
  const refs = [];
  weakTags.forEach(tag => {
    allExerciseRefs().forEach(ref => {
      if (refs.length >= limit) return;
      if (!isUnlocked(ref.unitIndex)) return;
      if (state.answers[ref.id]) return;
      if (learningTags(ref.u).includes(tag)) refs.push(ref);
    });
  });
  return uniqueRefs(refs).slice(0, limit);
}

function mentorFocusRefs(limit = 8) {
  const refs = [];
  topMistakeRefs(4).forEach(ref => {
    if (isUnlocked(ref.unitIndex)) refs.push(ref);
  });

  const missionIndex = currentMission();
  const mission = ACADEMY_UNITS[missionIndex];
  if (mission && isUnlocked(missionIndex)) {
    const next = nextUnsolvedRef(mission);
    if (next) refs.push(next);
    allExerciseRefs()
      .filter(ref => ref.u.id === mission.id && !state.answers[ref.id] && ref.ex.type !== 'duel')
      .slice(0, 3)
      .forEach(ref => refs.push(ref));
    const boss = allExerciseRefs().find(ref => ref.u.id === mission.id && ref.ex.type === 'duel' && !state.answers[ref.id]);
    if (boss) refs.push(boss);
  }

  refsForWeakTags(6).forEach(ref => refs.push(ref));

  allExerciseRefs()
    .filter(ref => isUnlocked(ref.unitIndex) && !state.answers[ref.id])
    .slice(0, limit)
    .forEach(ref => refs.push(ref));

  return uniqueRefs(refs).slice(0, limit);
}

function mentorHeadline() {
  const mistakes = mistakeTotal();
  const solved = solvedExercises();
  if (mistakes >= 8) return 'Σήμερα αξίζει να δουλέψεις πρώτα τα λάθη σου. Εκεί κρύβεται η μεγαλύτερη πρόοδος.';
  if (solved < 25) return 'Ξεκίνα ήρεμα: λίγες κάρτες μικρομαθήματος, έπειτα 3-5 βασικές δοκιμασίες.';
  if (coursePercent() >= 70) return 'Έχεις προχωρήσει πολύ. Τώρα χρειάζεται στοχευμένη επανάληψη και mini boss.';
  return 'Η πορεία σου είναι καλή. Συνέχισε με την επόμενη άλυτη αποστολή και κράτα σημειώσεις.';
}

function mentorHintText(ex, u) {
  const tags = learningTags(u);
  const tips = [];
  const full = normalize([ex.title, ex.prompt, u.title, u.source].join(' '));

  if (ex.type === 'choice') tips.push('Μην κοιτάξεις πρώτα τις επιλογές. Διάβασε την ερώτηση και υπογράμμισε νοητά τη λέξη-κλειδί.');
  if (ex.type === 'fill') tips.push('Σκέψου τι ζητάει το κενό: τύπο ρήματος, πτώση, κατάληξη ή σημασία λέξης.');
  if (ex.type === 'match') tips.push('Ξεκίνα από τα ζευγάρια που ξέρεις σίγουρα και άφησε τα δύσκολα για το τέλος.');
  if (ex.type === 'sort') tips.push('Ψάξε τη φυσική σειρά: πτώσεις, χρόνοι ή βήματα σκέψης. Μην πατάς τυχαία.');
  if (ex.type === 'tablefill') tips.push('Συμπλήρωσε πρώτα τους τύπους που αναγνωρίζεις. Μετά έλεγξε αριθμό, πρόσωπο ή πτώση.');
  if (ex.type === 'duel') tips.push('Στο mini boss κράτα ρυθμό: κάθε γύρος εξετάζει έναν βασικό κανόνα της ενότητας.');

  if (tags.includes('Ρήματα') || /ειμι|λυω|αοριστ|παρατατικ|μελλοντ|παρακειμεν|αυξησ|αναδιπλασιασ/.test(full)) {
    tips.push('Για ρήμα ρώτα με σειρά: ποιος χρόνος; ποιο πρόσωπο; ενικός ή πληθυντικός; υπάρχει αύξηση ή αναδιπλασιασμός;');
  }
  if (tags.includes('Κλίσεις') || /πτωσ|κλισ|ουσιαστικ|επιθετ|αντωνυμ|γενικη|δοτικη|αιτιατικη/.test(full)) {
    tips.push('Για κλίση βρες πρώτα γένος και αριθμό. Μετά διάλεξε πτώση από την κατάληξη.');
  }
  if (tags.includes('Λεξιλόγιο') || /λεξ|ριζ|φωνη|γη|πατηρ|ελευθερ|κτημ|ζυγ/.test(full)) {
    tips.push('Στο λεξιλόγιο ψάξε τη ρίζα. Μια γνωστή νεοελληνική λέξη συχνά ανοίγει τη σημασία.');
  }
  if (tags.includes('Σύνταξη') || /υποκειμεν|αντικειμεν|κατηγορουμεν|συνδετικ/.test(full)) {
    tips.push('Στη σύνταξη βρες πρώτα το ρήμα. Μετά ρώτησε “ποιος;” για υποκείμενο και “τι;” για αντικείμενο.');
  }
  if (tags.includes('Κατανόηση κειμένου')) {
    tips.push('Για κατανόηση κειμένου ψάξε ποιος ενεργεί, τι συμβαίνει και ποια φράση το αποδεικνύει.');
  }

  if (ex.hint) tips.unshift(ex.hint);
  return uniqueText(tips).slice(0, 4);
}

function uniqueText(items) {
  const seen = new Set();
  return items.filter(x => {
    const key = normalize(x);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function showExerciseMentor(card, ex, u, id) {
  const old = card.querySelector('.mentor-tip-box');
  if (old) {
    old.remove();
    return;
  }
  state.hintsUsed[id] = (state.hintsUsed[id] || 0) + 1;
  save();
  const box = document.createElement('div');
  box.className = 'mentor-tip-box';
  const tips = mentorHintText(ex, u);
  box.innerHTML = `
    <strong>🧭 Μέντορας Ακαδημίας</strong>
    <p>Δεν σου δίνω αμέσως την απάντηση. Σου δείχνω πώς να τη βρεις.</p>
    <ul>${tips.map(t => `<li>${escapeHTML(t)}</li>`).join('')}</ul>
  `;
  const feedback = card.querySelector('.feedback');
  if (feedback) feedback.before(box);
  else card.appendChild(box);
}

function renderAcademyMentor() {
  featureStart();
  const refs = mentorFocusRefs(8);
  const weak = profileTagStats().filter(t => t.mistakes > 0 || t.percent < 55).sort((a, b) => b.mistakes - a.mistakes || a.percent - b.percent).slice(0, 5);
  const hints = Object.values(state.hintsUsed || {}).reduce((sum, v) => sum + Number(v || 0), 0);
  const sessionRefs = refs.slice(0, 6);

  $('#lessonView').innerHTML = `
    <article class="lesson-card feature-panel mentor-panel">
      <p class="eyebrow">Build 2.5 • Έξυπνη καθοδήγηση</p>
      <h2>🧭 Μέντορας Ακαδημίας</h2>
      <p>${escapeHTML(mentorHeadline())}</p>

      <div class="mentor-summary-grid">
        <div><strong>${coursePercent()}%</strong><span>πορεία</span></div>
        <div><strong>${mistakeTotal()}</strong><span>λάθη για επανάληψη</span></div>
        <div><strong>${hints}</strong><span>υποδείξεις που ζητήθηκαν</span></div>
        <div><strong>${refs.length}</strong><span>προτάσεις τώρα</span></div>
      </div>

      <section class="mentor-card main-advice">
        <h3>Τι να κάνεις τώρα</h3>
        <p>${escapeHTML(mentorHeadline())}</p>
        <div class="feature-actions-row">
          <button id="startMentorSession">Ξεκίνα διαδρομή 15 λεπτών</button>
          <button id="mentorReviewBtn" class="ghost-tool">Άνοιγμα Κέντρου Επανάληψης</button>
          <button id="mentorDiagnosticBtn" class="ghost-tool">Νέο διαγνωστικό</button>
        </div>
      </section>

      <section class="mentor-card">
        <h3>🎯 Προτεινόμενες κινήσεις</h3>
        <div class="mentor-task-list">
          ${refs.length ? refs.map((ref, i) => `
            <button class="mentor-task review-item" data-unit="${ref.unitIndex}" data-idx="${ref.idx}">
              <strong>${i + 1}. ${escapeHTML(ref.ex.title)}</strong>
              <span>${escapeHTML(ref.u.place)} • ${escapeHTML(ref.u.title)} • ${exerciseTypeLabel(ref.ex.type)}</span>
              <small>${escapeHTML(mentorHintText(ref.ex, ref.u)[0] || 'Δούλεψε με προσοχή και μετά έλεγξε την απάντηση.')}</small>
            </button>
          `).join('') : '<div class="empty-state">Δεν υπάρχουν ανοιχτές άλυτες δοκιμασίες. Πήγαινε στην τελική επανάληψη ή άνοιξε προεπισκόπηση καθηγητή για έλεγχο.</div>'}
        </div>
      </section>

      <section class="mentor-card">
        <h3>🔍 Τι δείχνει η πορεία σου</h3>
        ${weak.length ? `<div class="mentor-weak-grid">${weak.map(t => `
          <div>
            <strong>${escapeHTML(t.tag)}</strong>
            <span>${t.mistakes} λάθη • ${t.percent}% λυμένα</span>
            <div class="mini-meter warning"><i style="width:${Math.min(100, Math.max(8, t.percent))}%"></i></div>
          </div>
        `).join('')}</div>` : '<p class="source">Δεν φαίνεται ακόμα συγκεκριμένη αδυναμία. Συνέχισε με άλυτες δοκιμασίες για να γίνει πιο έξυπνη η καθοδήγηση.</p>'}
      </section>
    </article>
  `;

  $('#startMentorSession').addEventListener('click', () => renderMentorSession(sessionRefs));
  $('#mentorReviewBtn').addEventListener('click', renderReviewCenter);
  $('#mentorDiagnosticBtn').addEventListener('click', renderDiagnosticCenter);
  bindReviewOpenButtons();
  $('#lessonView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderMentorSession(refs) {
  const session = uniqueRefs(refs && refs.length ? refs : mentorFocusRefs(6)).slice(0, 6);
  state.mentorSessions.unshift({ date: new Date().toISOString(), refs: session.map(ref => ref.id) });
  state.mentorSessions = state.mentorSessions.slice(0, 10);
  save();

  $('#lessonView').innerHTML = `
    <article class="lesson-card feature-panel mentor-panel">
      <p class="eyebrow">Διαδρομή 15 λεπτών</p>
      <h2>🕯️ Μικρή διαδρομή μελέτης</h2>
      <p>Δούλεψε με σειρά. Μην προσπαθήσεις να τα κάνεις όλα τέλεια· στόχος είναι καθαρή σκέψη και σταθερή πρόοδος.</p>
      <div class="mentor-route">
        ${session.map((ref, i) => `
          <button class="route-step review-item" data-unit="${ref.unitIndex}" data-idx="${ref.idx}">
            <span>Βήμα ${i + 1}</span>
            <strong>${escapeHTML(ref.ex.title)}</strong>
            <small>${escapeHTML(ref.u.place)} • ${exerciseTypeLabel(ref.ex.type)}</small>
          </button>
        `).join('') || '<div class="empty-state">Δεν βρέθηκαν προτεινόμενες δοκιμασίες.</div>'}
      </div>
      <section class="mentor-card">
        <h3>Κανόνας διαδρομής</h3>
        <ul>
          <li>Πρώτα σκέφτομαι τον κανόνα.</li>
          <li>Μετά απαντώ.</li>
          <li>Αν κάνω λάθος, ζητώ βοήθεια μέντορα και ξαναδοκιμάζω.</li>
          <li>Στο τέλος γράφω μία σημείωση στην ενότητα που με δυσκόλεψε.</li>
        </ul>
      </section>
      <div class="feature-actions-row">
        <button id="backMentorBtn" class="ghost-tool">Επιστροφή στον Μέντορα</button>
        <button id="printMentorRoute" class="ghost-tool">Εκτύπωση διαδρομής</button>
      </div>
    </article>
  `;
  bindReviewOpenButtons();
  $('#backMentorBtn').addEventListener('click', renderAcademyMentor);
  $('#printMentorRoute').addEventListener('click', () => window.print());
}

function renderStudentProfile() {
  featureStart();
  const solved = solvedExercises();
  const total = totalExercises();
  const completedCount = Object.keys(state.completed).length;
  const percent = coursePercent();
  const missionIndex = currentMission();
  const mission = ACADEMY_UNITS[missionIndex];
  const goals = dailyGoals();
  const tagStats = profileTagStats();
  const strongTags = tagStats.slice(0, 4);
  const weakTags = tagStats.filter(t => t.mistakes > 0 || t.percent < 45).sort((a, b) => b.mistakes - a.mistakes || a.percent - b.percent).slice(0, 4);
  const bookmarkUnits = Object.keys(state.bookmarks || {}).map(id => ({ id, u: ACADEMY_UNITS.find(unit => unit.id === id) })).filter(x => x.u);
  const completedUnits = ACADEMY_UNITS.filter(u => state.completed[u.id]);
  const nextRef = nextUnsolvedRef(mission);

  $('#lessonView').innerHTML = `
    <article class="lesson-card feature-panel student-profile">
      <p class="eyebrow">Build 2.5 • Μαθητικό προφίλ</p>
      <div class="profile-hero">
        <div>
          <h2>🧑‍🎓 Καρτέλα μαθητή</h2>
          <p>Εδώ ο μαθητής βλέπει την πορεία του, τα κειμήλια που κέρδισε, τα σημεία που χρειάζονται επανάληψη και τους σημερινούς στόχους.</p>
        </div>
        <div class="profile-seal">
          <strong>${escapeHTML(state.name || 'Μαθητής')}</strong>
          <span>${escapeHTML(rank())}</span>
        </div>
      </div>

      <div class="profile-stats-grid">
        <div><strong>${state.xp}</strong><span>XP</span></div>
        <div><strong>${state.coins}</strong><span>οβολοί</span></div>
        <div><strong>${solved}/${total}</strong><span>δοκιμασίες</span></div>
        <div><strong>${completedCount}/${ACADEMY_UNITS.length}</strong><span>κειμήλια</span></div>
      </div>

      <section class="profile-progress-card">
        <div class="profile-progress-head"><strong>Πορεία Ακαδημίας</strong><span>${percent}%</span></div>
        <div class="course-meter large"><span style="width:${percent}%"></span></div>
        <p>${escapeHTML(completionLevel(percent))}. Επόμενη προτεινόμενη περιοχή: <strong>${escapeHTML(mission ? mission.place : 'Ακαδημία')}</strong>.</p>
        ${nextRef ? `<button id="continueProfileBtn">Συνέχισε από εδώ</button>` : ''}
      </section>

      <section class="daily-goals">
        <h3>☀️ Σημερινοί στόχοι</h3>
        <div class="goal-grid">
          ${goals.map((g, i) => `
            <button class="goal-card" data-goal="${i}">
              <span class="goal-icon">${g.icon}</span>
              <strong>${escapeHTML(g.title)}</strong>
              <small>${escapeHTML(g.body)}</small>
            </button>
          `).join('')}
        </div>
      </section>

      <section class="profile-two-col">
        <div class="profile-box-card">
          <h3>🏺 Συλλογή κειμηλίων</h3>
          <div class="relic-collection">
            ${ACADEMY_UNITS.map(u => `
              <span class="relic-chip ${state.completed[u.id] ? 'earned' : ''}" title="${escapeHTML(u.title)}">
                ${state.completed[u.id] ? '🏺' : '🔒'} ${escapeHTML(u.relic || u.place)}
              </span>
            `).join('')}
          </div>
          <p class="source">Κερδισμένα: ${completedUnits.length}. Τα κλειδωμένα ξεκλειδώνουν όταν σφραγιστεί η αντίστοιχη περιοχή.</p>
        </div>
        <div class="profile-box-card">
          <h3>🏅 Σήματα</h3>
          <div class="badge-wall">
            ${state.badges.length ? state.badges.map(b => `<span class="badge">${escapeHTML(b)}</span>`).join('') : '<span class="source">Δεν έχουν κερδηθεί ακόμη σήματα.</span>'}
          </div>
        </div>
      </section>

      <section class="profile-two-col">
        <div class="profile-box-card">
          <h3>✨ Δυνατά σημεία</h3>
          <div class="tag-meter-list">
            ${strongTags.map(t => `<div><strong>${escapeHTML(t.tag)}</strong><span>${t.percent}% λυμένα</span><div class="mini-meter"><i style="width:${Math.min(100, t.percent)}%"></i></div></div>`).join('')}
          </div>
        </div>
        <div class="profile-box-card">
          <h3>🔁 Θέλει επανάληψη</h3>
          <div class="tag-meter-list">
            ${weakTags.length ? weakTags.map(t => `<div><strong>${escapeHTML(t.tag)}</strong><span>${t.mistakes} λάθη • ${t.percent}% λυμένα</span><div class="mini-meter warning"><i style="width:${Math.min(100, Math.max(8, t.percent))}%"></i></div></div>`).join('') : '<p class="source">Δεν υπάρχουν ακόμη έντονες δυσκολίες. Συνέχισε με άλυτες δοκιμασίες.</p>'}
          </div>
        </div>
      </section>

      <section class="profile-box-card">
        <h3>🔖 Σελιδοδείκτες</h3>
        <div class="bookmark-list">
          ${bookmarkUnits.length ? bookmarkUnits.map(x => `<button class="bookmark-open" data-unit="${escapeHTML(x.id)}"><strong>${escapeHTML(x.u.place)}</strong><span>${escapeHTML(x.u.title)}</span></button>`).join('') : '<p class="source">Δεν υπάρχουν σελιδοδείκτες. Μπορείς να προσθέσεις από κάθε ενότητα με το κουμπί ☆ Σελιδοδείκτης.</p>'}
        </div>
      </section>
    </article>
  `;

  const cont = $('#continueProfileBtn');
  if (cont && nextRef) cont.addEventListener('click', () => openExerciseRef(nextRef, 'unsolved'));
  $$('.goal-card').forEach(btn => btn.addEventListener('click', () => {
    const goal = goals[Number(btn.dataset.goal)];
    if (goal && goal.ref) openExerciseRef(goal.ref, 'all');
  }));
  $$('.bookmark-open').forEach(btn => btn.addEventListener('click', () => {
    const idx = ACADEMY_UNITS.findIndex(u => u.id === btn.dataset.unit);
    if (idx >= 0) openUnit(idx);
  }));
  $('#lessonView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderTeacherHub() {
  featureStart();
  const rows = ACADEMY_UNITS.map((u, i) => {
    const counts = typeCounts(u);
    const tags = learningTags(u);
    const solved = unitSolvedCount(u);
    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHTML(u.place)}</strong><br><span>${escapeHTML(u.title)}</span></td>
        <td>${solved}/${u.exercises.length}</td>
        <td>${tags.map(t => `<span class="mini-chip">${escapeHTML(t)}</span>`).join('')}</td>
        <td>${Object.entries(counts).map(([k, v]) => `${escapeHTML(k)}: ${v}`).join('<br>')}</td>
        <td><button class="tiny-open" data-unit="${i}">Άνοιγμα</button></td>
      </tr>
    `;
  }).join('');

  $('#lessonView').innerHTML = `
    <article class="lesson-card feature-panel teacher-hub">
      <p class="eyebrow">Build 2.3 • Κέντρο καθηγητή</p>
      <h2>🧭 Πίνακας ελέγχου ύλης</h2>
      <p>Εδώ βλέπεις γρήγορα τι υπάρχει σε κάθε αποστολή, πόσες δοκιμασίες έχει, ποιοι άξονες ύλης καλύπτονται και πού βρίσκεται ο μαθητής.</p>

      <div class="teacher-summary-grid">
        <div><strong>${ACADEMY_UNITS.length}</strong><span>περιοχές</span></div>
        <div><strong>${totalExercises()}</strong><span>δοκιμασίες</span></div>
        <div><strong>${solvedExercises()}</strong><span>λυμένες</span></div>
        <div><strong>${coursePercent()}%</strong><span>πορεία</span></div>
      </div>

      <div class="teacher-next-actions">
        <button id="hubTestBtn">Δημιουργία τεστ</button>
        <button id="hubClassBtn" class="ghost-tool">Λειτουργία τάξης</button>
        <button id="hubPrintBtn" class="ghost-tool">Εκτύπωση χάρτη ύλης</button>
      </div>

      <section class="teacher-usage-card">
        <h3>Πρακτική χρήση στην τάξη</h3>
        <ol>
          <li>Ξεκίνα με 2-3 κάρτες μικρομαθήματος από την ενότητα.</li>
          <li>Άνοιξε τη λειτουργία τάξης για γρήγορες ερωτήσεις στον πίνακα.</li>
          <li>Κλείσε με mini boss ή τύπωσε μικρό φύλλο από τη γεννήτρια τεστ.</li>
        </ol>
      </section>

      <div class="table-wrap">
        <table class="curriculum-table">
          <thead><tr><th>#</th><th>Περιοχή</th><th>Πρόοδος</th><th>Άξονες</th><th>Τύποι</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </article>
  `;
  $$('.tiny-open').forEach(btn => btn.addEventListener('click', () => openUnit(Number(btn.dataset.unit))));
  $('#hubTestBtn').addEventListener('click', renderTestGenerator);
  $('#hubClassBtn').addEventListener('click', renderClassroomMode);
  $('#hubPrintBtn').addEventListener('click', () => window.print());
  $('#lessonView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderTestGenerator() {
  featureStart();
  $('#lessonView').innerHTML = `
    <article class="lesson-card feature-panel test-generator">
      <p class="eyebrow">Build 2.3 • Γεννήτρια</p>
      <h2>📝 Γεννήτρια τεστ / φύλλου εργασίας</h2>
      <p>Διάλεξε ενότητες, τύπους ασκήσεων και αριθμό ερωτήσεων. Η εφαρμογή φτιάχνει άμεσα εκτυπώσιμο φύλλο εργασίας από το υλικό της Ακαδημίας.</p>

      <div class="generator-layout">
        <section class="generator-box">
          <h3>1. Ενότητες</h3>
          <div class="check-toolbar">
            <button id="selectAllUnits" class="ghost-tool">Όλες</button>
            <button id="clearUnits" class="ghost-tool">Καμία</button>
            <button id="schoolOnlyUnits" class="ghost-tool">Μόνο Ενότητες 1-10</button>
          </div>
          <div class="check-grid tall">${unitOptionHTML()}</div>
        </section>

        <section class="generator-box">
          <h3>2. Τύποι και μορφή</h3>
          <div class="check-grid">${typeOptionHTML()}</div>
          <label class="form-row"><span>Πλήθος ερωτήσεων</span><input id="testQuestionCount" type="number" min="5" max="80" value="20"></label>
          <label class="checkline"><input id="testIncludeAnswers" type="checkbox"> <span>Να εμφανιστεί κλείδα απαντήσεων</span></label>
          <label class="checkline"><input id="testIncludeMicro" type="checkbox" checked> <span>Να μπουν σύντομες κάρτες θεωρίας</span></label>
          <label class="checkline"><input id="testIncludeSolved" type="checkbox" checked> <span>Να επιτρέπονται και ήδη λυμένες ασκήσεις</span></label>
          <button id="makeTestBtn">Δημιουργία φύλλου</button>
        </section>
      </div>
      <div id="generatedTest"></div>
    </article>
  `;
  $('#selectAllUnits').addEventListener('click', () => $$('input[name="quizUnit"]').forEach(x => x.checked = true));
  $('#clearUnits').addEventListener('click', () => $$('input[name="quizUnit"]').forEach(x => x.checked = false));
  $('#schoolOnlyUnits').addEventListener('click', () => $$('input[name="quizUnit"]').forEach(x => x.checked = /Ενότητα\s+\d+/.test(ACADEMY_UNITS.find(u => u.id === x.value)?.title || '')));
  $('#makeTestBtn').addEventListener('click', generateTestSheet);
  $('#lessonView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function generateTestSheet() {
  const cfg = readGeneratorForm();
  if (!cfg.unitIds.length) return toast('Διάλεξε τουλάχιστον μία ενότητα.');
  if (!cfg.types.length) return toast('Διάλεξε τουλάχιστον έναν τύπο άσκησης.');
  const pool = shuffle(allRefsByFilters(cfg.unitIds, cfg.types, cfg.includeSolved));
  if (!pool.length) return toast('Δεν βρέθηκαν ερωτήσεις με αυτά τα κριτήρια.');
  const picks = pool.slice(0, cfg.count);
  const units = [...new Set(picks.map(p => p.u.id))].map(id => ACADEMY_UNITS.find(u => u.id === id)).filter(Boolean);
  const micro = cfg.includeMicro ? units.slice(0, 5).map(u => `
    <section class="test-micro">
      <strong>${escapeHTML(u.title)}</strong>
      <ul>${(u.microLessons || []).slice(0, 2).map(m => `<li><b>${escapeHTML(m.title)}:</b> ${escapeHTML(m.body)}</li>`).join('')}</ul>
    </section>
  `).join('') : '';

  $('#generatedTest').innerHTML = `
    <section class="generated-test">
      <div class="test-head">
        <div>
          <p class="eyebrow">Φύλλο εργασίας</p>
          <h3>Ακαδημία των Αρχαίων</h3>
          <p>Όνομα: ____________________  Τμήμα: ______  Ημερομηνία: __________</p>
        </div>
        <button id="printGeneratedTest" class="ghost-tool no-print">Εκτύπωση</button>
      </div>
      ${micro}
      <ol class="test-questions">
        ${picks.map((ref, i) => `<li>${exercisePrintHTML(ref, i + 1, false)}</li>`).join('')}
      </ol>
      ${cfg.includeAnswers ? `<section class="answer-key-panel"><h3>Κλείδα απαντήσεων</h3><ol>${picks.map((ref, i) => `<li><strong>${i + 1}.</strong> ${answerHTML(ref.ex)}</li>`).join('')}</ol></section>` : ''}
    </section>
  `;
  $('#printGeneratedTest').addEventListener('click', () => window.print());
  $('#generatedTest').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exercisePrintHTML(ref, number, withAnswer = false) {
  const ex = ref.ex;
  const unitLine = `<div class="test-meta">${escapeHTML(ref.u.place)} • ${escapeHTML(ref.u.title)} • ${exerciseTypeLabel(ex.type)}</div>`;
  let body = '';
  if (ex.type === 'choice') {
    body = `<p>${escapeHTML(ex.prompt)}</p><ol type="A">${ex.options.map(o => `<li>${escapeHTML(o)}</li>`).join('')}</ol>`;
  } else if (ex.type === 'fill') {
    body = `<p>${escapeHTML(ex.prompt)}</p><div class="answer-line"></div>`;
  } else if (ex.type === 'match') {
    body = `<p>Αντιστοίχισε τα ζευγάρια.</p><div class="print-match"><div>${ex.pairs.map(p => `<p>${escapeHTML(p[0])}</p>`).join('')}</div><div>${shuffle(ex.pairs.map(p => p[1])).map(v => `<p>${escapeHTML(v)}</p>`).join('')}</div></div>`;
  } else if (ex.type === 'sort') {
    body = `<p>${escapeHTML(ex.prompt || 'Βάλε τα στοιχεία στη σωστή σειρά.')}</p><p>${shuffle(ex.items).map(escapeHTML).join(' • ')}</p><div class="answer-line"></div>`;
  } else if (ex.type === 'tablefill') {
    body = `<p>${escapeHTML(ex.prompt)}</p><table class="mini-fill-table"><tbody>${ex.fields.map(f => `<tr><td>${escapeHTML(f.label)}</td><td></td></tr>`).join('')}</tbody></table>`;
  } else if (ex.type === 'duel') {
    body = `<p>${escapeHTML(ex.prompt)}</p>${ex.rounds.map((r, i) => `<p><strong>Γύρος ${i + 1}:</strong> ${escapeHTML(r.q)}</p><ol type="A">${r.options.map(o => `<li>${escapeHTML(o)}</li>`).join('')}</ol>`).join('')}`;
  }
  return `<article class="test-question">${unitLine}<strong>${escapeHTML(ex.title)}</strong>${body}${withAnswer ? `<div class="teacher-answer"><strong>Απάντηση:</strong> ${answerHTML(ex)}</div>` : ''}</article>`;
}

function renderClassroomMode() {
  featureStart();
  classroomSession = { deck: [], index: 0, showAnswer: false, scores: classroomSession.scores || { a: 0, b: 0 } };
  $('#lessonView').innerHTML = `
    <article class="lesson-card feature-panel classroom-mode">
      <p class="eyebrow">Build 2.3 • Προβολή τάξης</p>
      <h2>🎲 Λειτουργία τάξης</h2>
      <p>Γρήγορος γύρος για διαδραστικό πίνακα ή προφορική επανάληψη. Διάλεξε ύλη, πάτα έναρξη και μοίρασε πόντους σε ομάδες.</p>
      <div class="classroom-controls">
        <label><span>Περιοχή</span><select id="classroomUnit"><option value="all">Όλη η ύλη</option>${ACADEMY_UNITS.map((u,i)=>`<option value="${i}">${i+1}. ${escapeHTML(u.place)} — ${escapeHTML(u.title)}</option>`).join('')}</select></label>
        <label><span>Τύπος</span><select id="classroomType"><option value="all">Όλοι οι τύποι</option><option value="choice">Επιλογή</option><option value="fill">Συμπλήρωση</option><option value="match">Αντιστοίχιση</option><option value="sort">Σειρά</option><option value="tablefill">Πίνακας</option><option value="duel">Mini boss</option></select></label>
        <label><span>Γύροι</span><input id="classroomRounds" type="number" min="3" max="30" value="10"></label>
        <button id="startClassroomBtn">Έναρξη γύρου</button>
      </div>
      <div id="classroomStage" class="classroom-stage empty-state">Διάλεξε ρυθμίσεις και ξεκίνα.</div>
    </article>
  `;
  $('#startClassroomBtn').addEventListener('click', startClassroomSession);
  $('#lessonView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function startClassroomSession() {
  const unitValue = $('#classroomUnit').value;
  const typeValue = $('#classroomType').value;
  const rounds = Math.max(3, Math.min(30, Number($('#classroomRounds').value) || 10));
  const unitIds = unitValue === 'all' ? [] : [ACADEMY_UNITS[Number(unitValue)].id];
  const types = typeValue === 'all' ? [] : [typeValue];
  const deck = shuffle(allRefsByFilters(unitIds, types, true)).slice(0, rounds);
  if (!deck.length) return toast('Δεν υπάρχουν διαθέσιμες ερωτήσεις με αυτά τα κριτήρια.');
  classroomSession.deck = deck;
  classroomSession.index = 0;
  classroomSession.showAnswer = false;
  renderClassroomStage();
}

function renderClassroomStage() {
  const ref = classroomSession.deck[classroomSession.index];
  if (!ref) {
    $('#classroomStage').className = 'classroom-stage';
    $('#classroomStage').innerHTML = `
      <div class="classroom-finish">
        <h3>Τέλος γύρου</h3>
        <p>Αθηναίοι: <strong>${classroomSession.scores.a}</strong> • Σπαρτιάτες: <strong>${classroomSession.scores.b}</strong></p>
        <button id="restartClassroomBtn">Νέος γύρος</button>
        <button id="resetClassScoresBtn" class="ghost-tool">Μηδενισμός πόντων</button>
      </div>
    `;
    $('#restartClassroomBtn').addEventListener('click', startClassroomSession);
    $('#resetClassScoresBtn').addEventListener('click', () => { classroomSession.scores = { a: 0, b: 0 }; renderClassroomStage(); });
    return;
  }
  const ex = ref.ex;
  $('#classroomStage').className = 'classroom-stage';
  $('#classroomStage').innerHTML = `
    <div class="scoreboard"><span>Αθηναίοι: <strong>${classroomSession.scores.a}</strong></span><span>Σπαρτιάτες: <strong>${classroomSession.scores.b}</strong></span><span>Γύρος ${classroomSession.index + 1}/${classroomSession.deck.length}</span></div>
    <section class="class-question">
      <div class="test-meta">${escapeHTML(ref.u.place)} • ${escapeHTML(ref.u.title)} • ${exerciseTypeLabel(ex.type)}</div>
      <h3>${escapeHTML(ex.title)}</h3>
      ${classroomQuestionBody(ex)}
      ${classroomSession.showAnswer ? `<div class="class-answer"><strong>Απάντηση:</strong> ${answerHTML(ex)}</div>` : ''}
    </section>
    <div class="class-actions">
      <button id="revealClassAnswer">${classroomSession.showAnswer ? 'Απόκρυψη απάντησης' : 'Φανέρωση απάντησης'}</button>
      <button id="pointA" class="ghost-tool">+1 Αθηναίοι</button>
      <button id="pointB" class="ghost-tool">+1 Σπαρτιάτες</button>
      <button id="nextClassQuestion" class="ghost-tool">Επόμενη</button>
    </div>
  `;
  $('#revealClassAnswer').addEventListener('click', () => { classroomSession.showAnswer = !classroomSession.showAnswer; renderClassroomStage(); });
  $('#pointA').addEventListener('click', () => { classroomSession.scores.a += 1; renderClassroomStage(); });
  $('#pointB').addEventListener('click', () => { classroomSession.scores.b += 1; renderClassroomStage(); });
  $('#nextClassQuestion').addEventListener('click', () => { classroomSession.index += 1; classroomSession.showAnswer = false; renderClassroomStage(); });
}

function classroomQuestionBody(ex) {
  if (ex.type === 'choice') return `<p>${escapeHTML(ex.prompt)}</p><div class="big-options">${ex.options.map((o,i)=>`<div><strong>${String.fromCharCode(65+i)}.</strong> ${escapeHTML(o)}</div>`).join('')}</div>`;
  if (ex.type === 'fill') return `<p>${escapeHTML(ex.prompt)}</p><div class="class-blank">____________________________</div>`;
  if (ex.type === 'match') return `<p>Ποια ζευγάρια ταιριάζουν;</p><div class="print-match"><div>${ex.pairs.map(p=>`<p>${escapeHTML(p[0])}</p>`).join('')}</div><div>${shuffle(ex.pairs.map(p=>p[1])).map(v=>`<p>${escapeHTML(v)}</p>`).join('')}</div></div>`;
  if (ex.type === 'sort') return `<p>${escapeHTML(ex.prompt || 'Βάλε τα στοιχεία στη σωστή σειρά.')}</p><p class="class-items">${shuffle(ex.items).map(escapeHTML).join(' • ')}</p>`;
  if (ex.type === 'tablefill') return `<p>${escapeHTML(ex.prompt)}</p><table class="mini-fill-table"><tbody>${ex.fields.map(f=>`<tr><td>${escapeHTML(f.label)}</td><td>________________</td></tr>`).join('')}</tbody></table>`;
  if (ex.type === 'duel') return `<p>${escapeHTML(ex.prompt)}</p>${ex.rounds.map((r,i)=>`<p><strong>Γύρος ${i+1}:</strong> ${escapeHTML(r.q)}</p><div class="big-options">${r.options.map((o,j)=>`<div><strong>${String.fromCharCode(65+j)}.</strong> ${escapeHTML(o)}</div>`).join('')}</div>`).join('')}`;
  return '';
}

function importProgressFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const next = Object.assign({}, defaultState, state);
      if (payload.student) next.name = payload.student;
      if (payload.xp !== undefined) next.xp = Number(payload.xp) || 0;
      if (payload.coins !== undefined) next.coins = Number(payload.coins) || 0;
      if (payload.answers && typeof payload.answers === 'object') next.answers = payload.answers;
      if (Array.isArray(payload.completedUnits)) {
        next.completed = {};
        payload.completedUnits.forEach(id => next.completed[id] = true);
      }
      if (Array.isArray(payload.badges)) next.badges = payload.badges;
      if (payload.mistakes && typeof payload.mistakes === 'object') next.mistakes = payload.mistakes;
      if (Array.isArray(payload.diagnostics)) next.diagnosticHistory = payload.diagnostics;
      if (payload.notes && typeof payload.notes === 'object') next.unitNotes = payload.notes;
      if (payload.bookmarks && typeof payload.bookmarks === 'object') next.bookmarks = payload.bookmarks;
      if (payload.hintsUsed && typeof payload.hintsUsed === 'object') next.hintsUsed = payload.hintsUsed;
      if (Array.isArray(payload.mentorSessions)) next.mentorSessions = payload.mentorSessions;
      if (payload.dailyClaims && typeof payload.dailyClaims === 'object') next.dailyClaims = payload.dailyClaims;
      if (payload.dailyStreak !== undefined) next.dailyStreak = Number(payload.dailyStreak) || 0;
      if (payload.lastDailyClaim) next.lastDailyClaim = payload.lastDailyClaim;
      if (Array.isArray(payload.challengeHistory)) next.challengeHistory = payload.challengeHistory;
      state = next;
      save();
      toast('Η πρόοδος εισήχθη.');
      render();
    } catch (err) {
      toast('Το αρχείο δεν διαβάστηκε ως έγκυρη πρόοδος.');
    }
  };
  reader.readAsText(file, 'utf-8');
}

function openRandomUnsolved() {
  const candidates = [];
  ACADEMY_UNITS.forEach((u, i) => {
    if (!isUnlocked(i)) return;
    u.exercises.forEach((ex, idx) => {
      if (!state.answers[exerciseId(u.id, idx)]) candidates.push({ u, i, idx });
    });
  });

  if (!candidates.length) return toast('Δεν υπάρχουν άλυτες ανοιχτές δοκιμασίες.');
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  state.exerciseMode[pick.u.id] = 'unsolved';
  openUnit(pick.i);
  setTimeout(() => {
    const card = document.querySelector(`[data-id="${exerciseId(pick.u.id, pick.idx)}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 150);
}

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ς/g, 'σ')
    .replace(/[.,;··'’`῾᾿\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shuffle(arr) {
  return arr.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
}

$('#startBtn').addEventListener('click', start);
$('#studentName').addEventListener('keydown', e => { if (e.key === 'Enter') start(); });
$('#resetBtn').addEventListener('click', () => {
  if (confirm('Να μηδενιστεί η πορεία;')) {
    localStorage.removeItem(stateKey);
    location.reload();
  }
});
$('#teacherToolsBtn').addEventListener('click', () => {
  if (!teacherToolsUnlocked()) {
    requestTeacherAccess();
    return;
  }
  const menu = $('#teacherToolsMenu');
  menu.classList.toggle('hidden');
});
$('#lockTeacherToolsBtn').addEventListener('click', () => {
  state.teacherMode = false;
  setTeacherToolsUnlocked(false);
  save();
  render();
  toast('Τα εργαλεία καθηγητή κλειδώθηκαν.');
});
$('#teacherPreviewBtn').addEventListener('click', () => {
  if (!ensureTeacherAccess()) return;
  state.teacherMode = !state.teacherMode;
  save();
  render();
  toast(state.teacherMode ? 'Άνοιξαν όλες οι περιοχές για έλεγχο.' : 'Επιστροφή στη μαθητική πορεία.');
});
$('#diagnosticBtn').addEventListener('click', renderDiagnosticCenter);
$('#reviewCenterBtn').addEventListener('click', renderReviewCenter);
$('#studyPlanBtn').addEventListener('click', renderStudyPlan);
$('#studentProfileBtn').addEventListener('click', renderStudentProfile);
$('#academyMentorBtn').addEventListener('click', renderAcademyMentor);
$('#dailyMissionsBtn').addEventListener('click', renderDailyMissions);
$('#challengeArenaBtn').addEventListener('click', renderChallengeArena);
$('#teacherHubBtn').addEventListener('click', () => { if (ensureTeacherAccess()) renderTeacherHub(); });
$('#testGeneratorBtn').addEventListener('click', () => { if (ensureTeacherAccess()) renderTestGenerator(); });
$('#classroomModeBtn').addEventListener('click', () => { if (ensureTeacherAccess()) renderClassroomMode(); });
$('#randomChallengeBtn').addEventListener('click', openRandomUnsolved);
$('#exportProgressBtn').addEventListener('click', () => { if (ensureTeacherAccess()) exportProgress(); });
$('#importProgressBtn').addEventListener('click', () => { if (ensureTeacherAccess()) $('#importProgressFile').click(); });
$('#importProgressFile').addEventListener('change', e => { if (ensureTeacherAccess()) importProgressFromFile(e.target.files[0]); });
$('#unitSearch').addEventListener('input', e => {
  mapSearch = e.target.value;
  renderMap();
});
$$('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
  mapFilter = btn.dataset.filter;
  $$('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderMap();
}));


if (state.name) {
  $('.hero').classList.add('hidden');
  $('#appShell').classList.remove('hidden');
  render();
}
