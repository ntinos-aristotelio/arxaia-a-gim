
let xp = 0;
let correct = 0;

function updateStats(){
document.getElementById("xp").innerText = xp;
document.getElementById("correct").innerText = correct;
document.getElementById("level").innerText = Math.floor(xp/50)+1;
}

function createQuiz(game){
const div = document.createElement("div");
div.className="game";

div.innerHTML=`<h4>${game.question}</h4>`;

game.options.forEach((opt,index)=>{
const btn = document.createElement("button");
btn.className="option";
btn.innerText=opt;

btn.onclick=()=>{
if(index===game.answer){
btn.style.background="#90be6d";
xp += 25;
correct++;
alert("🏛️ Σωστό! Κέρδισες 25 XP");
}else{
btn.style.background="#e76f51";
alert("❌ Δοκίμασε ξανά!");
}
updateStats();
};

div.appendChild(btn);
});

return div;
}

const container = document.getElementById("units");

units.forEach(unit=>{
const section = document.createElement("section");
section.className="unit";

section.innerHTML=`<h2>${unit.title}</h2><p>${unit.intro}</p>`;

unit.games.forEach(game=>{
section.appendChild(createQuiz(game));
});

container.appendChild(section);
});

updateStats();
