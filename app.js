const DATA = window.APP_DATA;
const storeKey = 'arxaia-a-gim-game-v2';
const emptyState = { done: [], xp: 0, selectedLesson: 1, screen: 'home', quiz: {}, pairFound: [], lastEnding: null };
let state = { ...emptyState, ...JSON.parse(localStorage.getItem(storeKey) || '{}') };
const $ = (s) => document.querySelector(s);
const save = () => localStorage.setItem(storeKey, JSON.stringify(state));
const lesson = () => DATA.lessons.find(l => l.id === state.selectedLesson) || DATA.lessons[0];
const level = () => Math.floor(state.xp / 300) + 1;
const progress = () => Math.round((state.done.length / DATA.lessons.length) * 100);
function setScreen(screen){ state.screen = screen; save(); render(); }
function openLesson(id){ state.selectedLesson = id; state.screen = 'lesson'; save(); render(); }
function completeLesson(id){
  if(!state.done.includes(id)){
    const l = DATA.lessons.find(x => x.id === id);
    state.done.push(id); state.xp += l.xp; save();
  }
  render();
}
function resetProgress(){ localStorage.removeItem(storeKey); state = {...emptyState}; render(); }
function answerQuiz(lessonId, qIndex, choice){
  const key = `${lessonId}-${qIndex}`;
  if(state.quiz[key] !== undefined) return;
  const l = DATA.lessons.find(x => x.id === lessonId);
  const good = l.quiz[qIndex].correct === choice;
  state.quiz[key] = choice;
  if(good) state.xp += 25;
  save(); render();
}
function flipPair(index){
  if(state.pairFound.includes(index)) return;
  state.pairFound.push(index);
  state.xp += 10; save(); render();
}
function checkEnding(i, choice){
  const item = DATA.miniGames.endings[i];
  state.lastEnding = {i, choice, good: item.correct === choice, note: item.note};
  if(item.correct === choice) state.xp += 15;
  save(); render();
}
function topBar(){
  return `<header class="topbar">
    <button class="brand" onclick="setScreen('home')"><span>🏛️</span><b>${DATA.appTitle}</b></button>
    <nav><button onclick="setScreen('map')">Χάρτης</button><button onclick="setScreen('games')">Παιχνίδια</button><button onclick="setScreen('teacher')">Για καθηγητή</button></nav>
  </header>`;
}
function stats(){
  return `<section class="stats">
    <div><b>${state.xp}</b><span>XP</span></div>
    <div><b>${level()}</b><span>Επίπεδο</span></div>
    <div><b>${state.done.length}/${DATA.lessons.length}</b><span>Σήματα</span></div>
    <div><b>${progress()}%</b><span>Πρόοδος</span></div>
  </section>`;
}
function home(){
  return `<main class="shell">
    <section class="hero">
      <div class="hero-card">
        <p class="eyebrow">Παιχνιδοποιημένο μάθημα · χωρίς βαριά PDF στην οθόνη</p>
        <h1>${DATA.heroTitle}</h1>
        <p>${DATA.heroText}</p>
        <div class="hero-actions"><button class="primary" onclick="setScreen('map')">Μπες στον χάρτη αποστολών</button><button onclick="setScreen('games')">Παίξε γρήγορη πρόκληση</button></div>
      </div>
      <div class="avatar-card"><div class="owl">🦉</div><h2>Στόχος ημέρας</h2><p>Διάλεξε μία ενότητα, μάθε 3 λέξεις, κέρδισε ένα σήμα.</p>${stats()}</div>
    </section>
    <section class="teacher-note"><b>Ιδέα:</b> Οι σημειώσεις του καθηγητή μετατράπηκαν σε μικρές μαθητικές εμπειρίες: στόχοι, ιστορία, λέξεις, κανόνες, αποστολές, quiz.</section>
  </main>`;
}
function map(){
  return `<main class="shell"><h1>Χάρτης αποστολών</h1><p class="lead">Κάθε κάρτα ανοίγει ένα μικρό μάθημα. Όχι απλή προβολή σημειώσεων — κάθε ενότητα γίνεται παιχνίδι.</p>${stats()}
  <section class="map-grid">${DATA.lessons.map(l => `<article class="lesson-card ${state.done.includes(l.id)?'done':''}" onclick="openLesson(${l.id})">
    <div class="big-icon">${l.icon}</div><span class="tag">${l.world}</span><h2>${l.title}</h2><p>${l.hook}</p><footer><b>${l.xp} XP</b><span>${state.done.includes(l.id)?'✅ Κερδήθηκε':'🔒 Αποστολή'}</span></footer>
  </article>`).join('')}</section></main>`;
}
function lessonView(){
  const l = lesson();
  return `<main class="shell lesson-view"><button class="back" onclick="setScreen('map')">← Πίσω στον χάρτη</button>
    <section class="lesson-hero"><div><span class="tag">${l.world}</span><h1>${l.icon} ${l.title}</h1><p>${l.hook}</p></div><aside><b>Σήμα:</b><br>${l.badge}<br><br><b>Αμοιβή:</b> ${l.xp} XP</aside></section>
    <section class="story"><h2>Η ιστορία της αποστολής</h2><p>${l.story}</p></section>
    <section class="columns">
      <article><h2>Τι μαθαίνω</h2><ul>${l.learn.map(x=>`<li>${x}</li>`).join('')}</ul></article>
      <article><h2>Λέξεις-θησαυροί</h2><div class="word-bank">${l.words.map(w=>`<span>${w}</span>`).join('')}</div></article>
      <article><h2>Κόλπο γραμματικής</h2><p>${l.grammar}</p></article>
    </section>
    <section><h2>Αποστολές τάξης</h2><div class="mission-list">${l.missions.map((m,i)=>`<div><b>${i+1}</b>${m}</div>`).join('')}</div></section>
    <section class="quiz-box"><h2>Μίνι quiz</h2>${l.quiz.map((q,qi)=>quizItem(l, q, qi)).join('')}</section>
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
  return `<main class="shell"><h1>Γρήγορες προκλήσεις</h1><p class="lead">Για αρχή μαθήματος, επανάληψη ή τα τελευταία 5 λεπτά.</p>${stats()}
  <section class="game-grid">
    <article class="game"><h2>🃏 Κάρτες λέξεων</h2><p>Πάτα κάρτα για να εμφανιστεί η σημερινή σημασία.</p><div class="cards">${DATA.miniGames.pairs.map((p,i)=>`<button class="flip ${state.pairFound.includes(i)?'on':''}" onclick="flipPair(${i})"><b>${p[0]}</b><span>${state.pairFound.includes(i)?p[1]:'πάτα με'}</span></button>`).join('')}</div></article>
    <article class="game"><h2>🎯 Σκοποβολή καταλήξεων</h2><p>Διάλεξε σωστή κατάληξη.</p>${DATA.miniGames.endings.map((e,i)=>`<div class="ending"><b>${e.stem}__</b>${e.options.map((o,oi)=>`<button onclick="checkEnding(${i},${oi})">${o}</button>`).join('')}</div>`).join('')}<p class="result">${state.lastEnding ? (state.lastEnding.good ? '✅ Σωστό: ' : '❌ Προσπάθησε ξανά: ') + state.lastEnding.note : 'Διάλεξε μια απάντηση.'}</p></article>
  </section></main>`;
}
function teacher(){
  return `<main class="shell"><h1>Σημειώσεις για καθηγητή</h1><section class="teacher-grid">
    <article><h2>Πώς προσθέτεις νέα ύλη</h2><p>Ανοίγεις μόνο το <code>data.js</code> και αλλάζεις τίτλους, λέξεις, αποστολές και quiz. Το HTML μένει σχεδόν ανέπαφο.</p></article>
    <article><h2>Πώς το δουλεύεις στην τάξη</h2><p>1) Άνοιγμα χάρτη, 2) μικρή ιστορία, 3) λέξεις-θησαυροί, 4) αποστολή ομάδας, 5) quiz και σήμα.</p></article>
    <article><h2>Γιατί δεν υπάρχουν PDF</h2><p>Τα PDF/σημειώσεις δεν εμφανίζονται ως αρχεία. Χρησιμοποιούνται ως βάση για να χτιστεί μαθητική εμπειρία μέσα στο site.</p></article>
    <article><h2>Καθαρή δομή GitHub</h2><p>Μόνο τρία βασικά αρχεία: <code>index.html</code>, <code>styles.css</code>, <code>app.js</code>, και το περιεχόμενο στο <code>data.js</code>.</p></article>
  </section><button onclick="resetProgress()">Μηδενισμός δοκιμαστικής προόδου</button></main>`;
}
function render(){
  const screens = {home, map, lesson: lessonView, games, teacher};
  $('#app').innerHTML = topBar() + (screens[state.screen] || home)();
}
window.setScreen=setScreen; window.openLesson=openLesson; window.completeLesson=completeLesson; window.answerQuiz=answerQuiz; window.flipPair=flipPair; window.checkEnding=checkEnding; window.resetProgress=resetProgress;
render();
