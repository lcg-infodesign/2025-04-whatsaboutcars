// -----------------------------------------------------------
// Variabili globali
// -----------------------------------------------------------

// Variabile per contenere la tabella dei dati CSV
let data;

// Array che conterrà i nomi delle colonne del dataset
let columnNames = [];

// ID del vulcano selezionato (preso dalla query string ?id=)
let vulcanoId;

// Riga specifica del dataset corrispondente al vulcano scelto
let vulcanoData;


// -----------------------------------------------------------
// Colori e opacità (identici allo sketch principale)
// -----------------------------------------------------------

// Palette colori per le diverse categorie di vulcani
let colorPalette = [
  "#cf0808ff","#FF6347","#FF7F50","#FF8C00","#FFA500",
  "#FFB347","#FF6A00","#FF3300","#ffbeb4ff"
];

// Opacità associate ai codici del campo "Last Known Eruption"
let eruptionOpacity = {
  "D1": 255, "D2": 220, "D3": 190, "D4": 140, "D5": 110,
  "D6": 80, "D7": 40, "U": 120, "Q": 100, "?": 80
};

// Oggetto che associa ogni "TypeCategory" a un colore
let typeCategoryColors = {};


// -----------------------------------------------------------
// Caricamento del dataset
// -----------------------------------------------------------


function preload() {
  // Carica il file CSV con intestazioni (header)
  data = loadTable("data.csv", "csv", "header");
}


// -----------------------------------------------------------
// Setup iniziale: imposta lo stile e crea il layout della pagina
// -----------------------------------------------------------
function setup() {

  // --- Impostazioni globali del body HTML ---
  noCanvas();
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden"; // evita scroll
  document.body.style.backgroundColor = "#000"; // sfondo completamente nero
  document.body.style.fontFamily = "Helvetica, Arial, sans-serif";
  document.body.style.color = "#fff"; // testo bianco

  // Crea il canvas principale per disegnare il cerchio del vulcano
  createCanvas(windowWidth, windowHeight);
  background(0);
  textFont("Helvetica");
  textAlign(LEFT, TOP);

  // Salva i nomi delle colonne del dataset
  columnNames = data.columns;

  // Ottieni dalla URL l’ID del vulcano (es. detail.html?id=12)
  const params = new URLSearchParams(window.location.search);
  vulcanoId = parseInt(params.get("id"));

  // Se l'ID non è valido, interrompe l’esecuzione e mostra un messaggio d’errore
  if (isNaN(vulcanoId) || vulcanoId < 0 || vulcanoId >= data.getRowCount()) {
    noLoop();
    createP("Vulcano non trovato!")
      .style("color", "red")
      .style("font-size", "16px");
    return;
  }

  // Recupera la riga del dataset corrispondente al vulcano scelto
  vulcanoData = data.getRow(vulcanoId);


  // --- Preparazione dei colori per ogni categoria ---
  let typeCategories = [];

  // Scorre tutte le righe per ottenere le categorie uniche
  for (let r = 0; r < data.getRowCount(); r++) {
    let typeCat = data.getString(r, "TypeCategory");
    if (typeCat && !typeCategories.includes(typeCat))
      typeCategories.push(typeCat);
  }

  // Assegna un colore da colorPalette a ciascuna categoria
  for (let i = 0; i < typeCategories.length; i++) {
    typeCategoryColors[typeCategories[i]] = colorPalette[i % colorPalette.length];
  }

  // --- Titolo del vulcano in alto ---
  let vulcanoName = vulcanoData.getString("Volcano Name") || "Vulcano";
  let title = createDiv(vulcanoName);
  title.position(0, 30);
  title.style("width", "100%");
  title.style("text-align", "center");
  title.style("font-size", "38px");
  title.style("color", "#FFB347");
  title.style("font-weight", "bold");

  // --- Canvas principale per disegnare il cerchio ---
  createCanvas(windowWidth, windowHeight);
  background(0);

  // --- Creazione delle sezioni laterali ---
  createLegend(typeCategories);  // legenda a sinistra
  createInfo(vulcanoData);       // informazioni a destra
}


// -----------------------------------------------------------
// Disegno principale 
// -----------------------------------------------------------
function draw() {
  clear();      
  background(0); 

  // Centro del canvas (dove disegnare il cerchio)
  let cx = width / 2;
  let cy = height / 2 + 50;

  // Legge i dati specifici del vulcano selezionato
  let typeCat = vulcanoData.getString("TypeCategory");
  let lastEruption = vulcanoData.getString("Last Known Eruption");
  let elev = parseFloat(vulcanoData.getString("Elevation (m)"));

  // Determina il colore e l’opacità del cerchio in base ai parametri
  let baseColor = color(typeCategoryColors[typeCat] || "#ffffff");
  let alphaValue = eruptionOpacity[lastEruption] || 150;
  baseColor.setAlpha(alphaValue);

  fill(baseColor);
  noStroke();

  // Disegna il cerchio centrale (10 volte più grande rispetto alla mappa)
  // La dimensione è proporzionale all'elevazione del vulcano
  let size = map(abs(elev), 0, 5000, 35, 560);
  ellipse(cx, cy, size, size);
}


// -----------------------------------------------------------
// Legenda sinistra (colori + opacità + nota informativa)
// -----------------------------------------------------------
function createLegend(typeCategories) {
  let legendDiv = createDiv();
  legendDiv.position(60, 150);
  legendDiv.style("color", "white");
  legendDiv.style("font-size", "13px");
  legendDiv.style("line-height", "18px");
  legendDiv.style("max-width", "250px");

  // Titolo sezione
  legendDiv.html("<strong>Legenda TypeCategory</strong><br>");

  // Crea una riga per ogni categoria di tipo
  typeCategories.forEach(cat => {
    let line = createDiv();
    line.parent(legendDiv);
    line.style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "5px");

    // Cerchietto colorato che rappresenta la categoria
    let colorBox = createDiv();
    colorBox.style("width", "14px").style("height", "14px")
      .style("background-color", typeCategoryColors[cat])
      .style("border-radius", "50%")
      .style("margin-right", "6px");
    colorBox.parent(line);

    // Nome della categoria accanto al cerchio
    let label = createSpan(cat);
    label.parent(line);
  });

  // --- Sezione opacità (recenza eruzione) ---
  legendDiv.child(createElement("br"));
  legendDiv.child(createElement("strong", "Opacità = recenza ultima eruzione"));
  legendDiv.child(createElement("br"));

  // Liste codici e descrizioni periodi
  let codeList = ["D1","D2","D3","D4","D5","D6","D7","U","Q","?"];
  let periodList = [
    "1964 o successivo", "1900–1963", "1800–1899", "1700–1799", 
    "1500–1699", "1–1499 d.C.", "Prima di Cristo (Olocene)", 
    "Non datata (Olocene)", "Quaternaria idrotermale", "Incerta"
  ];

  // Crea una riga per ogni codice di eruzione
  for (let j = 0; j < codeList.length; j++) {
    let code = codeList[j];
    let alphaVal = eruptionOpacity[code] || 150;

    let line = createDiv();
    line.parent(legendDiv);
    line.style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "3px");

    // Cerchietto grigio con opacità differente
    let ellipseBox = createDiv();
    ellipseBox.style("width", "14px").style("height", "14px")
      .style("background-color", `rgba(200,200,200,${alphaVal/255})`)
      .style("border-radius", "50%")
      .style("margin-right", "6px");
    ellipseBox.parent(line);

    // Testo descrittivo
    let label = createSpan(`${code}: ${periodList[j]}`);
    label.parent(line);
  }

  // --- Box informativo finale ---
  legendDiv.child(createElement("br"));
  let infoBox = createDiv("🔍 <strong>Nota:</strong> il diametro del cerchio è proporzionale all'elevazione del vulcano (maggiore elevazione → cerchio più grande).");
  infoBox.parent(legendDiv);
  infoBox.style("margin-top", "10px");
  infoBox.style("padding", "8px 10px");
  infoBox.style("background-color", "rgba(255,255,255,0.1)");
  infoBox.style("border", "1px solid rgba(255,255,255,0.3)");
  infoBox.style("border-radius", "6px");
  infoBox.style("font-size", "12px");
  infoBox.style("line-height", "1.3");
}


// -----------------------------------------------------------
// Info destra (tutti i dati della riga del vulcano)
// -----------------------------------------------------------
function createInfo(row) {
  let infoDiv = createDiv();
  infoDiv.position(width - 320, 150);
  infoDiv.style("color", "white");
  infoDiv.style("font-size", "13px");
  infoDiv.style("line-height", "18px");
  infoDiv.style("max-width", "260px");

  // Titolo della sezione
  let content = "<strong>Dettagli Vulcano</strong><br><br>";

  // Cicla su tutte le colonne e mostra i valori
  columnNames.forEach(col => {
    let val = row.getString(col);
    content += `<strong>${col}:</strong> ${val}<br>`;
  });

  infoDiv.html(content);

  // --- Pulsante "Torna alla mappa" ---
  let backButton = createButton("← Torna alla mappa");
  backButton.parent(infoDiv);
  backButton.style("margin-top", "15px");
  backButton.style("padding", "6px 10px");
  backButton.style("background-color", "#FFB347");
  backButton.style("border", "none");
  backButton.style("border-radius", "5px");
  backButton.style("cursor", "pointer");
  backButton.style("color", "#000");

  // Quando cliccato, torna alla pagina principale
  backButton.mousePressed(() => window.location.href = "index.html");
}


// -----------------------------------------------------------
// Ridimensionamento finestra
// -----------------------------------------------------------
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(0);
}
