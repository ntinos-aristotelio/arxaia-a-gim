function loadSection(id) {
    const data = sectionsData[id];
    document.getElementById('dynamic-content').innerHTML = `<h1>${data.title}</h1><ul>` + 
        data.vocab.map(v => `<li>${v.ancient}: ${v.modern}</li>`).join('') + `</ul>`;
}