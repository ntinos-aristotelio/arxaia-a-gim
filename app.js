const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const stateKey = 'akadimiaArxaionProgressV2_0';
const defaultState = {
  name: '',
  xp: 0,
  coins: 0,
  streak: 0,
  completed: {},
  badges: [],
  answers: {},
  teacherMode: false,
  activeUnitId: '',
  exerciseMode: {},
  showAnswers: {},
  showReport: {},
  unitNotes: {}
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
state.exerciseMode = state.exerciseMode || {};
state.showAnswers = state.showAnswers || {};
state.showReport = state.showReport || {};
state.unitNotes = state.unitNotes || {};

let mapFilter = 'all';
let mapSearch = '';

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

function miss() {
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
    <strong>${solved}/${total}</strong> δοκιμασίες λυμένες • <strong>${Object.keys(state.completed).length}/${ACADEMY_UNITS.length}</strong> περιοχές σφραγισμένες
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
        <button id="toggleReportBtn" class="ghost-tool">${showReport ? 'Κλείσιμο αναφοράς' : 'Αναφορά καθηγητή'}</button>
        <button id="toggleAnswersBtn" class="ghost-tool ${!state.teacherMode ? 'disabled-tool' : ''}">${showAnswers ? 'Απόκρυψη απαντήσεων' : 'Σωστές απαντήσεις'}</button>
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
  $('#toggleReportBtn').addEventListener('click', () => {
    state.showReport[u.id] = !state.showReport[u.id];
    save();
    openUnit(i);
  });
  $('#toggleAnswersBtn').addEventListener('click', () => {
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
      ${answerLine}<div class="feedback">${solved ? '✓ Έχει λυθεί.' : ''}</div>
    </article>`;

  if (ex.type === 'fill') return `
    <article class="exercise ${solved ? 'solved' : ''}" data-id="${id}" data-ex-index="${idx}" data-type="fill">
      ${meta}<h3>📜 ${escapeHTML(ex.title)}</h3><p>${escapeHTML(ex.prompt)}</p>
      <input placeholder="γράψε απάντηση"><button class="checkFill">Έλεγχος</button><button class="ghost hint" style="color:#172033;border-color:#c7a35a">Υπόδειξη</button>
      ${answerLine}<div class="feedback">${solved ? '✓ Έχει λυθεί.' : ''}</div>
    </article>`;

  if (ex.type === 'match') return `
    <article class="exercise ${solved ? 'solved' : ''}" data-id="${id}" data-ex-index="${idx}" data-type="match">
      ${meta}<h3>🧩 ${escapeHTML(ex.title)}</h3><p>Πάτησε πρώτα αριστερή κάρτα και μετά τη σωστή δεξιά κάρτα.</p>
      <div class="match-grid">
        <div>${ex.pairs.map((p, i) => `<div class="pill left" data-v="${i}">${escapeHTML(p[0])}</div>`).join('')}</div>
        <div>${shuffle(ex.pairs.map((p, i) => [p[1], i])).map(p => `<div class="pill right" data-v="${p[1]}">${escapeHTML(p[0])}</div>`).join('')}</div>
      </div>
      ${answerLine}<div class="feedback">${solved ? '✓ Έχει λυθεί.' : ''}</div>
    </article>`;

  if (ex.type === 'sort') return `
    <article class="exercise ${solved ? 'solved' : ''}" data-id="${id}" data-ex-index="${idx}" data-type="sort">
      ${meta}<h3>🏺 ${escapeHTML(ex.title)}</h3><p>${escapeHTML(ex.prompt || 'Πάτησε τις κάρτες με τη σωστή σειρά.')}</p>
      <div class="sort-list">${shuffle(ex.items).map(it => `<div class="sort-item">${escapeHTML(it)}</div>`).join('')}</div>
      <button class="checkSort">Έλεγχος σειράς</button>
      ${answerLine}<div class="feedback">${solved ? '✓ Έχει λυθεί.' : ''}</div>
    </article>`;

  if (ex.type === 'tablefill') return `
    <article class="exercise ${solved ? 'solved' : ''}" data-id="${id}" data-ex-index="${idx}" data-type="tablefill">
      ${meta}<h3>📋 ${escapeHTML(ex.title)}</h3><p>${escapeHTML(ex.prompt)}</p>
      <div class="table-fill">${ex.fields.map((f, i) => `<label><span>${escapeHTML(f.label)}</span><input data-field="${i}" placeholder="τύπος"></label>`).join('')}</div>
      <button class="checkTable">Σφράγισε πίνακα</button>
      ${answerLine}<div class="feedback">${solved ? '✓ Έχει λυθεί.' : ''}</div>
    </article>`;

  if (ex.type === 'duel') return `
    <article class="exercise boss ${solved ? 'solved' : ''}" data-id="${id}" data-ex-index="${idx}" data-type="duel">
      ${meta}<h3>🐍 ${escapeHTML(ex.title)}</h3><p>${escapeHTML(ex.prompt)}</p>
      <div class="boss-meter"><span style="width:100%"></span></div>
      <div class="duel-stage"><button class="startDuel">Ξεκίνα μονομαχία</button></div>
      ${answerLine}<div class="feedback">${solved ? '✓ Έχει λυθεί.' : ''}</div>
    </article>`;

  return '';
}

function bindExercises(u) {
  $$('.exercise').forEach(card => {
    const idx = +card.dataset.exIndex;
    const ex = u.exercises[idx];
    const id = card.dataset.id;

    if (ex.type === 'choice') {
      card.querySelectorAll('.option').forEach(btn => btn.onclick = () => {
        if (state.answers[id]) return toast('Αυτή η δοκιμασία έχει ήδη λυθεί.');
        const ok = +btn.dataset.a === ex.answer;
        btn.classList.add(ok ? 'correct' : 'wrong');
        card.querySelector('.feedback').textContent = ok ? ex.feedback : 'Όχι ακόμα. Ξανασκέψου τον κανόνα.';
        ok ? award(id, 25, card) : miss();
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
        ok ? award(id, 30, card) : miss();
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
          miss();
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
        ok ? award(id, 35, card) : miss();
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
        ok ? award(id, 45, card) : miss();
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
            miss();
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

function printUnit(id) {
  const u = ACADEMY_UNITS.find(x => x.id === id);
  const showAnswers = state.teacherMode && state.showAnswers[id];
  const micro = u.microLessons.map(m => `<li><strong>${escapeHTML(m.title)}:</strong> ${escapeHTML(m.body)}</li>`).join('');
  const exercises = u.exercises.map((ex, idx) => `
    <li>
      <strong>${idx + 1}. ${escapeHTML(ex.title)}</strong>
      <div>${printPrompt(ex)}</div>
      ${showAnswers ? `<div class="answer">Απάντηση: ${answerHTML(ex)}</div>` : ''}
    </li>
  `).join('');

  const html = `
    <!DOCTYPE html><html lang="el"><head><meta charset="UTF-8">
    <title>${escapeHTML(u.title)}</title>
    <style>
      body{font-family:Georgia,'Times New Roman',serif;line-height:1.5;color:#172033;padding:24px}
      h1{border-bottom:3px solid #c7a35a;padding-bottom:10px}
      li{margin:12px 0}
      .answer{margin-top:6px;font-weight:bold;color:#285c3d}
      .meta{color:#77684f}
    </style></head><body>
    <h1>${escapeHTML(u.place)} — ${escapeHTML(u.title)}</h1>
    <p class="meta">${escapeHTML(u.source)}</p>
    <h2>Κάρτες μικρομαθήματος</h2><ol>${micro}</ol>
    <h2>Δοκιμασίες</h2><ol>${exercises}</ol>
    </body></html>
  `;

  const w = window.open('', '_blank');
  if (!w) return toast('Το παράθυρο εκτύπωσης μπλοκαρίστηκε από τον browser.');
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

function printPrompt(ex) {
  if (ex.type === 'choice') return escapeHTML(ex.prompt + ' Επιλογές: ' + ex.options.join(' / '));
  if (ex.type === 'fill') return escapeHTML(ex.prompt);
  if (ex.type === 'match') return escapeHTML('Αντιστοίχισε: ' + ex.pairs.map(p => p[0]).join(', ') + ' με ' + ex.pairs.map(p => p[1]).join(', '));
  if (ex.type === 'sort') return escapeHTML(ex.prompt || 'Βάλε στη σωστή σειρά: ' + ex.items.join(', '));
  if (ex.type === 'tablefill') return escapeHTML(ex.prompt + ' Πεδία: ' + ex.fields.map(f => f.label).join(', '));
  if (ex.type === 'duel') return escapeHTML(ex.prompt + ' Γύροι: ' + ex.rounds.map(r => r.q).join(' | '));
  return '';
}

function exportProgress() {
  const payload = {
    exportedAt: new Date().toISOString(),
    build: '2.0',
    student: state.name,
    rank: rank(),
    xp: state.xp,
    coins: state.coins,
    solvedExercises: solvedExercises(),
    totalExercises: totalExercises(),
    completedUnits: Object.keys(state.completed),
    badges: state.badges,
    notes: state.unitNotes
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
$('#teacherPreviewBtn').addEventListener('click', () => {
  state.teacherMode = !state.teacherMode;
  save();
  render();
  toast(state.teacherMode ? 'Άνοιξαν όλες οι περιοχές για έλεγχο.' : 'Επιστροφή στη μαθητική πορεία.');
});
$('#randomChallengeBtn').addEventListener('click', openRandomUnsolved);
$('#exportProgressBtn').addEventListener('click', exportProgress);
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
