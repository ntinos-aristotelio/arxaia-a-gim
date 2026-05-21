const DATA = window.APP_DATA;
const storeKey = 'arxaia-a-gim-pro-v1';
const emptyState = {
  done: [], xp: 0, selectedLesson: 1, screen: 'home', quiz: {}, pairFound: [], lastEnding: null,
  coins: 0, streak: 0, lastPlay: null, focus: 'all', search: '', notes: {}, opened: []
};
let state = { ...emptyState, ...JSON.parse(localStorage.getItem(storeKey) || '{}') };
const $ = (s) => document.querySelector(s);
const save = () => localStorage.setItem(storeKey, JSON.stringify(state));
const lesson = () => DATA.lessons.find(l => l.id === state.selectedLesson) || DATA.lessons[0];
const level = () => Math.floor(state.xp / 300) + 1;
const nextLevelXp = () => level() * 300;
const levelProgress = () => Math.min(100, Math.round((state.xp % 300) / 300 * 100));
const progress = () => Math.round((state.done.length / DATA.lessons.length) * 100);
const done = (id) => state.done.includes(id);
const escaped = (str='') => String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function ping(msg){
  const t = $('#toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}
function reward(xp=0, coins=0, msg='Κέρδισες ανταμοιβή!'){
  state.xp += xp; state.coins += coins; save(); ping(`${msg} +${xp} XP · +${coins} 🪙`);
}
function setScreen(screen){ state.screen = screen; save(); render(); }
function openLesson(id){
  state.selectedLesson = id; state.screen = 'lesson';
  if(!state.opened.includes(id)){ state.opened.push(id); state.xp += 5; }
  save(); render();
}
function completeLesson(id){
  if(!state.done.includes(id)){
    const l = DATA.lessons.find(x => x.id === id);
    state.done.push(id); state.xp += l.xp; state.coins += 20; state.streak += 1; save(); render();
    ping(`Νέο σήμα: ${l.badge}! +${l.xp} XP`);
    return;
  }
  ping('Το σήμα αυτής της ενότητας έχει ήδη κερδηθεί.');
}
function resetProgress(){
  if(confirm('Να μηδενιστεί η δοκιμαστική πρόοδος σε αυτή τη συσκευή;')){
    localStorage.removeItem(storeKey); state = {...emptyState}; render(); ping('Η πρόοδος μηδενίστηκε.');
  }
}
function answerQuiz(lessonId, qIndex, choice){
  const key = `${lessonId}-${qIndex}`;
  if(state.quiz[key] !== undefined) return;
  const l = DATA.lessons.find(x => x.id === lessonId);
  const good = l.quiz[qIndex].correct === choice;
  state.quiz[key] = choice;
  if(good) reward(25, 5, 'Σωστή απάντηση'); else { save(); ping('Καλή προσπάθεια. Δες το σωστό και προχώρα.'); }
  render();
}
function flipPair(index){
  if(state.pairFound.includes(index)) return;
  state.pairFound.push(index); reward(10, 2, 'Λέξη ξεκλειδώθηκε'); render();
}
function checkEnding(i, choice){
  const item = DATA.miniGames.endings[i];
  state.lastEnding = {i, choice, good: item.correct === choice, note: item.note};
  if(item.correct === choice) reward(15, 3, 'Σωστή κατάληξη'); else { save(); ping('Όχι ακόμα. Ξαναδοκίμασε με βάση το παράδειγμα.'); }
  render();
}
function setFocus(v){ state.focus = v; save(); render(); }
function setSearch(v){ state.search = v; save(); render(); }
function saveNote(id, value){ state.notes[id] = value; save(); ping('Η σημείωση αποθηκεύτηκε στη συσκευή.'); }
function printLesson(){ window.print(); }

function topBar(){
  return `<header class="topbar">
    <button class="brand" onclick="setScreen('home')"><span class="logo">🦉</span><span><b>${DATA.appTitle}</b><small>PRO Quest</small></span></button>
    <nav>
      <button onclick="setScreen('map')">Χάρτης</button>
      <button onclick="setScreen('games')">Παιχνίδια</button>
      <button onclick="setScreen('badges')">Σήματα</button>
      <button onclick="setScreen('teacher')">Καθηγητής</button>
    </nav>
  </header>`;
}
function stats(){
  return `<section class="stats">
    <div><b>${state.xp}</b><span>XP</span></div>
    <div><b>${level()}</b><span>Επίπεδο</span></div>
    <div><b>${state.coins}</b><span>Νομίσματα</span></div>
    <div><b>${progress()}%</b><span>Πρόοδος</span></div>
  </section>`;
}
function levelBar(){ return `<div class="levelbar"><span style="width:${levelProgress()}%"></span></div><p class="tiny">Μέχρι το επόμενο επίπεδο: ${nextLevelXp()-state.xp} XP</p>`; }
function home(){
  const next = DATA.lessons.find(l => !done(l.id)) || DATA.lessons[0];
  return `<main class="shell">
    <section class="hero pro-hero">
      <div class="hero-card glass">
        <p class="eyebrow">Ψηφιακή περιπέτεια · Αρχαία χωρίς βαρεμάρα</p>
        <h1>${DATA.heroTitle}</h1>
        <p>${DATA.heroText}</p>
        ${levelBar()}
        <div class="hero-actions"><button class="primary" onclick="openLesson(${next.id})">Συνέχισε: ${next.title}</button><button onclick="setScreen('map')">Άνοιγμα χάρτη</button></div>
      </div>
      <aside class="avatar-card quest-card">
        <div class="owl">🦉</div><h2>Ημερήσια αποστολή</h2>
        <p>Μάθε 3 λέξεις, απάντησε σε 2 ερωτήσεις και πάρε ένα σήμα.</p>${stats()}
      </aside>
    </section>
    <section class="pro-grid">
      <article><span>🎮</span><h2>Game loop</h2><p>Ιστορία → λέξεις → κόλπο → αποστολές → quiz → σήμα.</p></article>
      <article><span>🧭</span><h2>Χάρτης προόδου</h2><p>Οι μαθητές βλέπουν πού βρίσκονται και τι ξεκλειδώνουν.</p></article>
      <article><span>🧑‍🏫</span><h2>Έλεγχος καθηγητή</h2><p>Το περιεχόμενο αλλάζει από ένα αρχείο, χωρίς χάος σε HTML.</p></article>
    </section>
  </main>`;
}
function filteredLessons(){
  const q = (state.search || '').toLowerCase().trim();
  return DATA.lessons.filter(l => {
    const okFocus = state.focus === 'all' || (state.focus === 'done' ? done(l.id) : !done(l.id));
    const hay = `${l.title} ${l.world} ${l.hook} ${l.words.join(' ')}`.toLowerCase();
    return okFocus && (!q || hay.includes(q));
  });
}
function map(){
  return `<main class="shell"><div class="page-head"><div><h1>Χάρτης αποστολών</h1><p class="lead">Οι σημειώσεις έγιναν διαδρομή με κόσμους, XP και σήματα.</p></div>${stats()}</div>
  <section class="toolbar"><input value="${escaped(state.search)}" oninput="setSearch(this.value)" placeholder="Αναζήτηση: π.χ. ρήμα, πόλις, γραμματική"><div><button class="${state.focus==='all'?'active':''}" onclick="setFocus('all')">Όλες</button><button class="${state.focus==='open'?'active':''}" onclick="setFocus('open')">Ανοιχτές</button><button class="${state.focus==='done'?'active':''}" onclick="setFocus('done')">Κερδισμένες</button></div></section>
  <section class="timeline">${filteredLessons().map((l,idx) => lessonCard(l, idx)).join('')}</section></main>`;
}
function lessonCard(l, idx){
  return `<article class="lesson-card ${done(l.id)?'done':''}" onclick="openLesson(${l.id})">
    <div class="path-dot">${done(l.id)?'✓':l.id}</div><div class="big-icon">${l.icon}</div>
    <span class="tag">${l.world}</span><h2>${l.title}</h2><p>${l.hook}</p>
    <div class="chips">${l.words.slice(0,3).map(w=>`<span>${w}</span>`).join('')}</div>
    <footer><b>${l.xp} XP</b><span>${done(l.id)?'Σήμα κερδισμένο':'Ξεκλείδωσε αποστολή'}</span></footer>
  </article>`;
}
function lessonView(){
  const l = lesson(); const note = state.notes[l.id] || '';
  return `<main class="shell lesson-view"><div class="lesson-tools"><button class="back" onclick="setScreen('map')">← Χάρτης</button><button onclick="printLesson()">Εκτύπωση φύλλου</button></div>
    <section class="lesson-hero"><div><span class="tag">${l.world}</span><h1>${l.icon} ${l.title}</h1><p>${l.hook}</p></div><aside><b>Σήμα</b><strong>${l.badge}</strong><b>Αμοιβή</b><strong>${l.xp} XP</strong></aside></section>
    <section class="story"><h2>📜 Η ιστορία της αποστολής</h2><p>${l.story}</p></section>
    <section class="columns">
      <article><h2>🎯 Τι πρέπει να μπορώ</h2><ul>${l.learn.map(x=>`<li>${x}</li>`).join('')}</ul></article>
      <article><h2>💎 Λέξεις-θησαυροί</h2><div class="word-bank">${l.words.map(w=>`<span>${w}</span>`).join('')}</div></article>
      <article><h2>🧠 Κόλπο γραμματικής</h2><p>${l.grammar}</p></article>
    </section>
    <section><h2>⚔️ Αποστολές τάξης</h2><div class="mission-list">${l.missions.map((m,i)=>`<div><b>${i+1}</b><span>${m}</span></div>`).join('')}</div></section>
    <section class="quiz-box"><h2>🎲 Μίνι quiz</h2>${l.quiz.map((q,qi)=>quizItem(l, q, qi)).join('')}</section>
    <section class="note-box"><h2>✍️ Σημείωση μαθητή</h2><textarea onblur="saveNote(${l.id}, this.value)" placeholder="Γράψε εδώ τι κράτησες από την αποστολή...">${escaped(note)}</textarea></section>
    <button class="complete" onclick="completeLesson(${l.id})">Ολοκλήρωσα την ενότητα και παίρνω το σήμα</button>
  </main>`;
}
function quizItem(l,q,qi){
  const key = `${l.id}-${qi}`; const picked = state.quiz[key];
  return `<div class="q"><p><b>${qi+1}.</b> ${q.q}</p><div class="answers">${q.a.map((a,i)=>{
    let cls = picked === undefined ? '' : i === q.correct ? 'good' : picked === i ? 'bad' : '';
    return `<button class="${cls}" onclick="answerQuiz(${l.id},${qi},${i})">${a}</button>`;
  }).join('')}</div></div>`;
}
function games(){
  return `<main class="shell"><div class="page-head"><div><h1>Γρήγορες προκλήσεις</h1><p class="lead">Για αρχή μαθήματος, επανάληψη ή τα τελευταία 5 λεπτά.</p></div>${stats()}</div>
  <section class="game-grid">
    <article class="game"><h2>🃏 Κάρτες λέξεων</h2><p>Πάτα κάρτα για να εμφανιστεί η σημερινή σημασία.</p><div class="cards">${DATA.miniGames.pairs.map((p,i)=>`<button class="flip ${state.pairFound.includes(i)?'on':''}" onclick="flipPair(${i})"><b>${p[0]}</b><span>${state.pairFound.includes(i)?p[1]:'πάτα με'}</span></button>`).join('')}</div></article>
    <article class="game"><h2>🎯 Σκοποβολή καταλήξεων</h2><p>Διάλεξε σωστή κατάληξη.</p>${DATA.miniGames.endings.map((e,i)=>`<div class="ending"><b>${e.stem}__</b>${e.options.map((o,oi)=>`<button onclick="checkEnding(${i},${oi})">${o}</button>`).join('')}</div>`).join('')}<p class="result">${state.lastEnding ? (state.lastEnding.good ? '✅ Σωστό: ' : '❌ Προσπάθησε ξανά: ') + state.lastEnding.note : 'Διάλεξε μια απάντηση.'}</p></article>
    <article class="game"><h2>⚡ Πρόκληση 60 δευτερολέπτων</h2><p>Ο καθηγητής βάζει χρονόμετρο: κάθε ομάδα λέει όσες λέξεις-θησαυρούς θυμάται.</p><button class="primary" onclick="reward(30, 10, 'Ομαδική πρόκληση')">Η ομάδα τα κατάφερε</button></article>
  </section></main>`;
}
function badges(){
  return `<main class="shell"><h1>Συλλογή σημάτων</h1><p class="lead">Κάθε σήμα δείχνει μία ενότητα που ολοκληρώθηκε.</p>${stats()}<section class="badge-grid">${DATA.lessons.map(l=>`<article class="badge ${done(l.id)?'won':''}"><div>${done(l.id)?l.icon:'🔒'}</div><h2>${l.badge}</h2><p>${l.title} · ${l.world}</p></article>`).join('')}</section></main>`;
}
function teacher(){
  return `<main class="shell"><h1>Πίνακας καθηγητή</h1><section class="teacher-grid">
    <article><h2>Δομή PRO</h2><p>Το <code>index.html</code> μένει ελάχιστο. Το μάθημα ζει στο <code>data.js</code>. Η εμφάνιση είναι στο <code>styles.css</code> και η λειτουργία στο <code>app.js</code>.</p></article>
    <article><h2>Ροή μαθήματος</h2><p>1) χάρτης, 2) ιστορία, 3) λέξεις, 4) κόλπο, 5) αποστολή ομάδας, 6) quiz, 7) σήμα.</p></article>
    <article><h2>Χρήση πηγών</h2><p>Οι σημειώσεις δεν ανεβαίνουν ως σκέτα αρχεία. Μετατρέπονται σε μαθητικές εμπειρίες με μικρά βήματα.</p></article>
    <article><h2>Επόμενο επίπεδο</h2><p>Μπορούμε να περάσουμε πραγματικό κείμενο κάθε ενότητας μέσα σε κάρτες, με δραστηριότητες κατανόησης και λεξιλογίου.</p></article>
  </section><button onclick="resetProgress()">Μηδενισμός δοκιμαστικής προόδου</button></main>`;
}
function render(){
  const screens = {home, map, lesson: lessonView, games, teacher, badges};
  $('#app').innerHTML = topBar() + (screens[state.screen] || home)();
}
window.setScreen=setScreen; window.openLesson=openLesson; window.completeLesson=completeLesson; window.answerQuiz=answerQuiz; window.flipPair=flipPair; window.checkEnding=checkEnding; window.resetProgress=resetProgress; window.setFocus=setFocus; window.setSearch=setSearch; window.saveNote=saveNote; window.printLesson=printLesson; window.reward=reward;
render();
