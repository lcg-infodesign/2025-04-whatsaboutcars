// -----------------------------------------------------------
// Configurazioni globali
// -----------------------------------------------------------

// Margine esterno del canvas per lasciare spazio alla legenda e ai bordi
let outerMargin = 100;

// Variabile che conterrà la tabella CSV caricata
let data;

// Array che conterrà i nomi delle colonne del CSV
let columnNames = [];

// Variabili per memorizzare i limiti geografici (latitudine e longitudine)
let minLat, maxLat, minLon, maxLon;

// Variabili per memorizzare i limiti di elevazione (minimo e massimo)
let minElev = Infinity, maxElev = -Infinity;

// Oggetto che associa a ogni "TypeCategory" un colore
let typeCategoryColors = {};

// Palette di colori predefinita per i diversi tipi di vulcano
let colorPalette = [
  "#cf0808ff","#FF6347","#FF7F50","#FF8C00","#FFA500",
  "#FFB347","#FF6A00","#FF3300","#ffbeb4ff"
];

// Oggetto che associa a ciascun codice di "Last Known Eruption"
// un valore di opacità (più recente = più opaco)
let eruptionOpacity = {
  "D1": 255, "D2": 220, "D3": 190, "D4": 140, "D5": 110,
  "D6": 80, "D7": 40, "U": 120, "Q": 100, "?": 80
};

// Oggetti che tengono traccia dei filtri attivi:
// - quali categorie di vulcani sono visibili
// - quali periodi di eruzione sono visibili
let activeCategories = {};
let activeEruptions = {};

// Riferimento al contenitore HTML della legenda
let legendDiv;


// -----------------------------------------------------------
// Caricamento CSV
// -----------------------------------------------------------


function preload() {
  // loadTable() carica la tabella CSV con intestazione (header)
  data = loadTable("data.csv", "csv", "header");
}


// -----------------------------------------------------------
// Setup iniziale
// -----------------------------------------------------------

function setup() {
  // Crea un canvas che copre tutta la finestra
  createCanvas(windowWidth, windowHeight);

  // Imposta il font per i testi
  textFont("Helvetica");

  // Salva i nomi delle colonne del dataset
  columnNames = data.columns;

  // Array temporanei per salvare latitudini, longitudini e categorie
  let latitudes = [];
  let longitudes = [];
  let typeCategories = [];

  // Ciclo su tutte le righe del CSV per calcolare limiti e categorie
  for (let r = 0; r < data.getRowCount(); r++) {
    let lat = parseFloat(data.getString(r, "Latitude"));
    let lon = parseFloat(data.getString(r, "Longitude"));
    let elev = parseFloat(data.getString(r, "Elevation (m)"));
    let typeCat = data.getString(r, "TypeCategory");

    // Se latitudine e longitudine sono valide, le salva
    if (!isNaN(lat) && !isNaN(lon)) { 
      latitudes.push(lat); 
      longitudes.push(lon); 
    }

    // Calcola i valori minimo e massimo di elevazione
    if (!isNaN(elev)) { 
      let absElev = abs(elev);
      if (absElev < minElev) minElev = absElev;
      if (absElev > maxElev) maxElev = absElev;
    }

    // Raccoglie tutte le categorie uniche (senza duplicati)
    if (typeCat && !typeCategories.includes(typeCat)) {
      typeCategories.push(typeCat);
    }
  }

  // Calcola i limiti geografici globali (lat/lon min e max)
  minLat = min(latitudes); 
  maxLat = max(latitudes);
  minLon = min(longitudes); 
  maxLon = max(longitudes);

  // Assegna a ogni categoria un colore dalla palette
  // e imposta di default il filtro come attivo (true)
  for (let i = 0; i < typeCategories.length; i++) {
    typeCategoryColors[typeCategories[i]] = colorPalette[i % colorPalette.length];
    activeCategories[typeCategories[i]] = true;
  }

  // Inizializza i filtri dei periodi di eruzione
  for (let code in eruptionOpacity) {
    activeEruptions[code] = true;
  }

  // Crea la legenda interattiva con i checkbox
  createLegendInterface(typeCategories);
}


// -----------------------------------------------------------
// Legenda interattiva con checkbox e infobox esplicativo
// -----------------------------------------------------------

function createLegendInterface(typeCategories) {
  // Crea un contenitore per la legenda
  legendDiv = createDiv();
  legendDiv.position(60, outerMargin + 20);
  legendDiv.style("color", "white");
  legendDiv.style("font-family", "Helvetica");
  legendDiv.style("font-size", "14px");
  legendDiv.style("line-height", "20px");

  // Sezione: legenda per TypeCategory
  legendDiv.html("<strong>Legenda TypeCategory</strong><br>");

  // Per ogni categoria di tipo crea un checkbox e un’etichetta colorata
  typeCategories.forEach(cat => {
    let line = createDiv();
    line.parent(legendDiv);
    line.style("display", "flex").style("align-items", "center");

    // Checkbox per attivare/disattivare il filtro
    let cb = createCheckbox("", true);
    cb.parent(line);
    cb.style("margin-right", "6px");
    cb.changed(() => activeCategories[cat] = cb.checked());

    // Piccolo cerchio colorato accanto al nome della categoria
    let colorBox = createDiv();
    colorBox.style("width", "15px").style("height", "15px")
      .style("background-color", typeCategoryColors[cat])
      .style("margin-right", "6px")
      .style("border-radius", "50%");
    colorBox.parent(line);

    // Etichetta testuale con il nome della categoria
    let label = createSpan(cat);
    label.parent(line);
  });

  // Sezione: legenda per opacità = recenza ultima eruzione
  legendDiv.child(createElement("br"));
  legendDiv.child(createElement("strong", "Opacità = recenza ultima eruzione"));
  legendDiv.child(createElement("br"));

  // Liste dei codici e dei periodi corrispondenti
  let codeList = ["D1","D2","D3","D4","D5","D6","D7","U","Q","?"];
  let periodList = [
    "1964 o successivo", "1900–1963", "1800–1899", "1700–1799", 
    "1500–1699", "1–1499 d.C.", "Prima di Cristo (Olocene)", 
    "Non datata (Olocene)", "Quaternaria idrotermale", "Incerta"
  ];

  // Per ogni codice crea un elemento di legenda
  for (let j = 0; j < codeList.length; j++) {
    let code = codeList[j];
    let alphaVal = eruptionOpacity[code] || 150;

    let line = createDiv();
    line.parent(legendDiv);
    line.style("display", "flex").style("align-items", "center");

    // Checkbox per filtrare i vulcani per periodo di eruzione
    let cb = createCheckbox("", true);
    cb.parent(line);
    cb.style("margin-right", "6px");
    cb.changed(() => activeEruptions[code] = cb.checked());

    // Cerchio grigio semi-trasparente per rappresentare l’opacità
    let ellipseBox = createDiv();
    ellipseBox.style("width", "15px").style("height", "15px")
      .style("background-color", `rgba(200,200,200,${alphaVal/255})`)
      .style("border-radius", "50%")
      .style("margin-right", "6px");
    ellipseBox.parent(line);

    // Etichetta testuale con codice e descrizione
    let label = createSpan(`${code}: ${periodList[j]}`);
    label.parent(line);
  }

  // Box informativo finale (infobox)
  legendDiv.child(createElement("br"));
  let infoBox = createDiv("🔍 <strong>Nota:</strong> il diametro dei cerchi è proporzionale all'elevazione dei vulcani (maggiore elevazione → cerchio più grande).");
  infoBox.parent(legendDiv);
  infoBox.style("margin-top", "20px");
  infoBox.style("padding", "10px 12px");
  infoBox.style("background-color", "rgba(255,255,255,0.1)");
  infoBox.style("border", "1px solid rgba(255,255,255,0.3)");
  infoBox.style("border-radius", "8px");
  infoBox.style("max-width", "220px");
  infoBox.style("font-size", "13px");
  infoBox.style("line-height", "1.4");
}


// -----------------------------------------------------------
// Disegno principale
// -----------------------------------------------------------

function draw() {
  background(0);

  drawTitle();

  // Variabili per rilevare il vulcano "hovered" (sotto il mouse)
  let hovered = null;
  let hoveredRow = null;

  // Ciclo su tutti i vulcani del dataset
  for (let r = 0; r < data.getRowCount(); r++) {
    // Legge i valori principali della riga
    let lat = parseFloat(data.getString(r, "Latitude"));
    let lon = parseFloat(data.getString(r, "Longitude"));
    let elev = parseFloat(data.getString(r, "Elevation (m)"));
    let typeCat = data.getString(r, "TypeCategory");
    let lastEruption = data.getString(r, "Last Known Eruption");

    // Salta la riga se mancano dati validi
    if (isNaN(lat) || isNaN(lon) || isNaN(elev)) continue;

    // Applica i filtri attivi: categoria e periodo di eruzione
    if (!(typeCat in activeCategories) || !activeCategories[typeCat]) continue;
    if (lastEruption in activeEruptions && !activeEruptions[lastEruption]) continue;

    // Converte lat/lon in coordinate X,Y sul canvas
    let x = map(lon, minLon, maxLon, outerMargin + 250, width - outerMargin);
    let y = map(lat, minLat, maxLat, height - outerMargin, outerMargin + 120);

    // Dimensione del cerchio proporzionale all'elevazione
    let size = map(abs(elev), minElev, maxElev, 5, 80);

    // Colore e opacità in base alla categoria e all’epoca dell’ultima eruzione
    let baseColor = color(typeCategoryColors[typeCat] || "#ffffff");
    let alphaValue = eruptionOpacity[lastEruption] || 150;
    baseColor.setAlpha(alphaValue);

    // Disegna il cerchio del vulcano
    fill(baseColor);
    noStroke();
    ellipse(x, y, size, size);

    // Se il mouse è sopra il cerchio, salva la riga e posizione
    let d = dist(mouseX, mouseY, x, y);
    if (d < size / 2) {
      hovered = { x, y };
      hoveredRow = r;
    }
  }

  // Se un vulcano è "hovered", cambia cursore e mostra tooltip
  if (hovered && hoveredRow !== null) {
    cursor("pointer");
    drawTooltip(hovered.x + 15, hovered.y - 15, hoveredRow);
  } else {
    cursor("default");
  }
}


// -----------------------------------------------------------
// Clic su un cerchio → apre la pagina di dettaglio
// -----------------------------------------------------------

function mousePressed() {
  for (let r = 0; r < data.getRowCount(); r++) {
    let lat = parseFloat(data.getString(r, "Latitude"));
    let lon = parseFloat(data.getString(r, "Longitude"));
    let elev = parseFloat(data.getString(r, "Elevation (m)"));
    let typeCat = data.getString(r, "TypeCategory");
    let lastEruption = data.getString(r, "Last Known Eruption");

    if (isNaN(lat) || isNaN(lon) || isNaN(elev)) continue;
    if (!(typeCat in activeCategories) || !activeCategories[typeCat]) continue;
    if (lastEruption in activeEruptions && !activeEruptions[lastEruption]) continue;

    let x = map(lon, minLon, maxLon, outerMargin + 250, width - outerMargin);
    let y = map(lat, minLat, maxLat, height - outerMargin, outerMargin + 120);
    let size = map(abs(elev), minElev, maxElev, 5, 80);

    // Se il click avviene dentro un cerchio
    let d = dist(mouseX, mouseY, x, y);
    if (d < size / 2) {
      // Carica la pagina di dettaglio (nella stessa finestra)
      window.location.href = `detail.html?id=${r}`;
      break;
    }
  }
}


// -----------------------------------------------------------
// Titolo e sottotitolo della visualizzazione
// -----------------------------------------------------------

function drawTitle() {
  push();
  textAlign(CENTER, TOP);

  fill("#ffffffff");
  textSize(48);
  textStyle(BOLD);
  text("Vulcani del Mondo", width / 2, 40);

  fill(255);
  textSize(18);
  textStyle(NORMAL);
  text("Assignment 04 - Laboratorio di Computergrafica per l'Information Design a.s. 2025/26", width / 2, 95);

  fill("#FFB347");
  textSize(15);
  text("Clicca sui cerchi per il dettaglio • Usa la legenda per filtrare", width / 2, 120);
  pop();
}

// -----------------------------------------------------------
// Tooltip: mostra le informazioni di un vulcano al passaggio del mouse
// -----------------------------------------------------------

function drawTooltip(px, py, rowIndex) {
  push();
  textSize(14);
  textAlign(LEFT, TOP);

  let padding = 8;
  let lineHeight = 18;
  let lines = [];

  // Crea una riga di testo per ogni colonna del dataset
  for (let col of columnNames) {
    let val = data.getString(rowIndex, col);
    lines.push(`${col}: ${val}`);
  }

  // Calcola dimensioni del box del tooltip
  let tooltipWidth = 0;
  lines.forEach(line => tooltipWidth = max(tooltipWidth, textWidth(line)));
  let boxW = tooltipWidth + padding * 2;
  let boxH = lines.length * lineHeight + padding * 2;

  // Disegna il rettangolo di sfondo semitrasparente
  fill(0, 180); 
  stroke(255); 
  strokeWeight(1.5);
  rect(px, py, boxW, boxH, 8);

  // Scrive il testo dentro il box
  fill(255); 
  noStroke();
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], px + padding, py + padding + i * lineHeight);
  }
  pop();
}


// -----------------------------------------------------------
// Gestione del ridimensionamento finestra
// -----------------------------------------------------------

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
