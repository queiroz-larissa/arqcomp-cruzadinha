// =========================================================
// ESTADO & PERSISTÊNCIA (LOCALSTORAGE)
// =========================================================
const STORAGE_KEY = "sptech_escape_alice_v1";

const defaultState = {
  nickname: "",
  asciiUnlocked: false,
  completed: { m1: false, m2: false, m3: false, m4: false, m5: false },
  elapsedSeconds: 0,
  ranking: [
    { name: "Agente Twilight", time: "04:18", status: "Alice Resgatada" },
    { name: "Agente Clover", time: "05:42", status: "Alice Resgatada" },
    { name: "Agente Sam", time: "06:15", status: "Alice Resgatada" }
  ]
};

let gameState = loadState();
let currentScreen = "screen-briefing";
let timerInterval = null;
let phaseSecondsLeft = 0;

const PHASE_TIMERS = {
  "screen-briefing": 0,
  "screen-m1": 180, // 3 min
  "screen-m2": 180, // 3 min
  "screen-m3": 180, // 3 min
  "screen-m4": 180, // 3 min
  "screen-m5": 480, // 8 min para a Cruzadinha
  "screen-ranking": 0
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      completed: { ...defaultState.completed, ...(parsed.completed || {}) }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  updateHud();
}

function formatTime(totalSec) {
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// =========================================================
// NAVEGAÇÃO & CRONÔMETRO POR FASE
// =========================================================
function updateHud() {
  const agentTag = document.getElementById("hudAgentName");
  agentTag.textContent = gameState.nickname
    ? `Agente ${gameState.nickname}`
    : "Agente: Não Identificado";

  const map = {
    "nav-m1": gameState.completed.m1,
    "nav-m2": gameState.completed.m2,
    "nav-m3": gameState.completed.m3,
    "nav-m4": gameState.completed.m4,
    "nav-m5": gameState.completed.m5
  };

  Object.entries(map).forEach(([id, isDone]) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle("done", Boolean(isDone));
  });
}

function switchScreen(screenId) {
  currentScreen = screenId;
  document.querySelectorAll(".screen").forEach((sec) => {
    sec.classList.toggle("active", sec.id === screenId);
  });
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.screen === screenId);
  });
  startPhaseTimer(screenId);
  if (screenId === "screen-ranking") renderRanking();
}

function startPhaseTimer(screenId) {
  clearInterval(timerInterval);
  const timerEl = document.getElementById("hudTimer");
  timerEl.classList.remove("danger");

  const limit = PHASE_TIMERS[screenId] || 0;
  if (limit === 0) {
    timerEl.textContent = "LIVRE";
    return;
  }

  phaseSecondsLeft = limit;
  timerEl.textContent = formatTime(phaseSecondsLeft);

  timerInterval = setInterval(() => {
    phaseSecondsLeft--;
    gameState.elapsedSeconds++;
    timerEl.textContent = formatTime(Math.max(0, phaseSecondsLeft));

    if (phaseSecondsLeft <= 30) {
      timerEl.classList.add("danger");
    }

    if (phaseSecondsLeft <= 0) {
      clearInterval(timerInterval);
      showModal(
        "TEMPO ESGOTADO!",
        "O alarme disparou e a Laritrix fugiu com a Alice! Clique abaixo para reiniciar o cronômetro desta fase e tentar de novo.",
        () => startPhaseTimer(currentScreen)
      );
    }
  }, 1000);
}

// =========================================================
// TELA 0: BRIEFING & DECODIFICADOR ASCII (32 E 65)
// =========================================================
function setupBriefing() {
  const nickInput = document.getElementById("agentNicknameInput");
  const spaceInput = document.getElementById("asciiSpaceInput");
  const aInput = document.getElementById("asciiAInput");
  const feedback = document.getElementById("asciiFeedback");
  const letterEl = document.getElementById("encryptedLetterText");
  const startBtn = document.getElementById("btnStartMission1");

  if (gameState.nickname) nickInput.value = gameState.nickname;
  if (gameState.asciiUnlocked) {
    spaceInput.value = 32;
    aInput.value = 65;
    revealLetter(letterEl, gameState.nickname || "Secreto");
    startBtn.classList.remove("hidden");
  }

  document.getElementById("btnToggleAsciiHint").addEventListener("click", () => {
    document.getElementById("asciiHintBox").classList.toggle("hidden");
  });

  document.getElementById("btnDecodeAscii").addEventListener("click", () => {
    const nick = nickInput.value.trim() || "Secreto";
    const codeSpace = Number(spaceInput.value);
    const codeA = Number(aInput.value);

    if (codeSpace === 32 && codeA === 65) {
      gameState.nickname = nick;
      gameState.asciiUnlocked = true;
      saveState();
      feedback.textContent = `Calibração concluída! Bem-vindo(a), Agente ${nick}.`;
      revealLetter(letterEl, nick);
      startBtn.classList.remove("hidden");
    } else {
      feedback.textContent = "Códigos incorretos! Lembre-se: Espaço = 32 e 'A' maiúsculo = 65.";
    }
  });

  startBtn.addEventListener("click", () => switchScreen("screen-m1"));
}

function revealLetter(element, nick) {
  element.textContent = `OLA AGENTE ${nick.toUpperCase()}... SE QUISER VER ALICE VIVA, QUEBRE MEUS 4 CADEADOS DE SISTEMAS E RESOLVA O COFRE FINAL DE ARQUITETURA COMPUTACIONAL! ASS: LARITRIX.`;
}

// =========================================================
// MISSÕES 1 A 4 (CADEADOS PROGRESSIVOS)
// =========================================================
function setupMissions() {
  // Missão 1: 13 -> 1101 | 25 -> 31 | 42 -> 2A
  document.getElementById("btnCheckM1").addEventListener("click", () => {
    const bin = document.getElementById("m1Bin").value.trim().replace(/^0+/, "");
    const oct = document.getElementById("m1Oct").value.trim().replace(/^0+/, "");
    const hex = document.getElementById("m1Hex").value.trim().toUpperCase();
    const fb = document.getElementById("m1Feedback");

    if (bin === "1101" && oct === "31" && hex === "2A") {
      gameState.completed.m1 = true;
      saveState();
      fb.textContent = "Cadeado 01 aberto! Frequência de rádio decodificada.";
      document.getElementById("btnNextM1").classList.remove("hidden");
    } else {
      fb.textContent = "Combinação inválida! Revise suas divisões sucessivas por 2, 8 e 16.";
    }
  });

  // Missão 2: API dat-acqu-ino
  document.getElementById("btnCheckM2").addEventListener("click", () => {
    const q1 = document.getElementById("m2Q1").value;
    const q2 = document.getElementById("m2Q2").value;
    const q3 = document.getElementById("m2Q3").value;
    const fb = document.getElementById("m2Feedback");

    if (q1 === "ok" && q2 === "ok" && q3 === "ok") {
      gameState.completed.m2 = true;
      saveState();
      fb.textContent = "Acesso concedido ao servidor dat-acqu-ino!";
      document.getElementById("btnNextM2").classList.remove("hidden");
    } else {
      fb.textContent = "Acesso negado! Verifique o fluxo Arduino -> API -> Front-End -> Usuário.";
    }
  });

  // Missão 3: Portas Básicas (AND: A=1, OR: B=0, NOT: A=0)
  document.getElementById("btnCheckM3").addEventListener("click", () => {
    const vAnd = document.getElementById("m3And").value;
    const vOr = document.getElementById("m3Or").value;
    const vNot = document.getElementById("m3Not").value;
    const fb = document.getElementById("m3Feedback");

    if (vAnd === "1" && vOr === "0" && vNot === "0") {
      gameState.completed.m3 = true;
      saveState();
      fb.textContent = "Lasers desativados! Caminho livre para o cofre.";
      document.getElementById("btnNextM3").classList.remove("hidden");
    } else {
      fb.textContent = "Os lasers continuam ativos! Confira as tabelas-verdade de AND, OR e NOT.";
    }
  });

  // Missão 4: Portas Derivadas (NAND(1,1)=0, NOR(0,0)=1, XOR(1,1)=0)
  document.getElementById("btnCheckM4").addEventListener("click", () => {
    const vNand = document.getElementById("m4Nand").value;
    const vNor = document.getElementById("m4Nor").value;
    const vXor = document.getElementById("m4Xor").value;
    const fb = document.getElementById("m4Feedback");

    if (vNand === "0" && vNor === "1" && vXor === "0") {
      gameState.completed.m4 = true;
      saveState();
      fb.textContent = "Alarme silencioso neutralizado! Você chegou à jaula da Alice.";
      document.getElementById("btnNextM4").classList.remove("hidden");
    } else {
      fb.textContent = "Sensor disparado! Lembre-se: NAND inverte AND, NOR inverte OR e XOR exige entradas diferentes.";
    }
  });

  document.querySelectorAll("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => switchScreen(btn.dataset.next));
  });
}

// =========================================================
// MISSÃO 5: CRUZADINHA OFICIAL (12 PALAVRAS CRUZADAS)
// Grade: 15 linhas (0..14) x 17 colunas (0..16)
// =========================================================
const ROWS = 15;
const COLS = 17;

const WORDS = [
  {
    num: 1,
    dir: "H",
    word: "MEMORIADEMASSA",
    row: 1,
    col: 2,
    clue: "Armazenamento permanente de grande capacidade para arquivos e programas, mesmo sem energia."
  },
  {
    num: 2,
    dir: "H",
    word: "MICROCONTROLADOR",
    row: 5,
    col: 0,
    clue: "Chip único que reúne CPU, memória e periféricos, como o cérebro do Arduino."
  },
  {
    num: 3,
    dir: "H",
    word: "ULA",
    row: 7,
    col: 3,
    clue: "Parte da CPU que realiza cálculos matemáticos e operações lógicas com bits."
  },
  {
    num: 4,
    dir: "H",
    word: "EEPROM",
    row: 9,
    col: 7,
    clue: "Memória não volátil que permite apagar e regravar dados usando pulsos elétricos."
  },
  {
    num: 5,
    dir: "H",
    word: "REGISTRADORES",
    row: 11,
    col: 1,
    clue: "Pequenas memórias ultrarrápidas dentro da CPU que guardam dados em uso imediato."
  },
  {
    num: 6,
    dir: "H",
    word: "DATABUS",
    row: 13,
    col: 5,
    clue: "Barramento bidirecional que transporta os dados entre processador, memória e periféricos."
  },
  {
    num: 7,
    dir: "V",
    word: "FLASH",
    row: 0,
    col: 15,
    clue: "Memória não volátil muito usada em pendrives, cartões e para gravar código no Arduino."
  },
  {
    num: 8,
    dir: "V",
    word: "ADDRESSBUS",
    row: 1,
    col: 8,
    clue: "Barramento unidirecional por onde a CPU informa qual posição de memória quer acessar."
  },
  {
    num: 9,
    dir: "V",
    word: "ROM",
    row: 4,
    col: 4,
    clue: "Memória de fábrica apenas para leitura que guarda instruções iniciais do sistema."
  },
  {
    num: 10,
    dir: "V",
    word: "DMA",
    row: 5,
    col: 5,
    clue: "Recurso que transfere dados entre periféricos e memória sem ocupar a CPU."
  },
  {
    num: 11,
    dir: "V",
    word: "QUADCORE",
    row: 5,
    col: 12,
    clue: "Processador que possui quatro núcleos físicos independentes trabalhando ao mesmo tempo."
  },
  {
    num: 12,
    dir: "V",
    word: "UC",
    row: 13,
    col: 10,
    clue: "Componente da CPU que busca, decodifica e coordena a execução das instruções."
  }
];

let cellMap = {};

function buildCrossword() {
  const gridEl = document.getElementById("crosswordGrid");
  const hList = document.getElementById("cluesHorizontal");
  const vList = document.getElementById("cluesVertical");

  gridEl.innerHTML = "";
  hList.innerHTML = "";
  vList.innerHTML = "";
  cellMap = {};

  WORDS.forEach((item) => {
    for (let i = 0; i < item.word.length; i++) {
      const r = item.dir === "H" ? item.row : item.row + i;
      const c = item.dir === "H" ? item.col + i : item.col;
      const key = `${r}-${c}`;
      if (!cellMap[key]) {
        cellMap[key] = { letter: item.word[i], nums: [] };
      }
      if (i === 0) cellMap[key].nums.push(item.num);
    }

    const li = document.createElement("li");
    li.id = `clue-${item.num}`;
    li.innerHTML = `<strong>${item.num}.</strong> ${item.clue} (${item.word.length})`;
    if (item.dir === "H") hList.appendChild(li);
    else vList.appendChild(li);
  });

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${r}-${c}`;
      const cellDiv = document.createElement("div");
      cellDiv.className = "cw-cell";

      if (!cellMap[key]) {
        cellDiv.classList.add("cw-block");
      } else {
        if (cellMap[key].nums.length > 0) {
          const numSpan = document.createElement("span");
          numSpan.className = "cw-num";
          numSpan.textContent = cellMap[key].nums.join("/");
          cellDiv.appendChild(numSpan);
        }

        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 1;
        input.className = "cw-input";
        input.dataset.row = r;
        input.dataset.col = c;
        input.setAttribute("aria-label", `Linha ${r + 1}, Coluna ${c + 1}`);

        input.addEventListener("input", (e) => {
          e.target.value = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase();
          e.target.classList.remove("correct", "wrong");
        });

        cellMap[key].input = input;
        cellDiv.appendChild(input);
      }

      gridEl.appendChild(cellDiv);
    }
  }

  document.getElementById("btnCheckCrossword").addEventListener("click", checkCrossword);
  document.getElementById("btnResetCrossword").addEventListener("click", resetCrossword);
}

function checkCrossword() {
  let solvedCount = 0;

  Object.values(cellMap).forEach((cell) => {
    cell.input.classList.remove("correct", "wrong");
  });

  WORDS.forEach((item) => {
    let wordIsCorrect = true;
    const wordInputs = [];

    for (let i = 0; i < item.word.length; i++) {
      const r = item.dir === "H" ? item.row : item.row + i;
      const c = item.dir === "H" ? item.col + i : item.col;
      const cell = cellMap[`${r}-${c}`];
      wordInputs.push(cell.input);

      if (cell.input.value.toUpperCase() !== item.word[i]) {
        wordIsCorrect = false;
      }
    }

    const clueEl = document.getElementById(`clue-${item.num}`);
    if (wordIsCorrect) {
      solvedCount++;
      clueEl.classList.add("solved");
      wordInputs.forEach((inp) => {
        inp.classList.remove("wrong");
        inp.classList.add("correct");
      });
    } else {
      clueEl.classList.remove("solved");
      wordInputs.forEach((inp) => {
        if (!inp.classList.contains("correct")) {
          inp.classList.add("wrong");
        }
      });
    }
  });

  document.getElementById("crosswordScore").textContent = `${solvedCount} de ${WORDS.length} palavras`;
  const fb = document.getElementById("crosswordFeedback");

  if (solvedCount === WORDS.length) {
    clearInterval(timerInterval);
    gameState.completed.m5 = true;
    const finalTimeStr = formatTime(gameState.elapsedSeconds || 120);
    const agentLabel = `Agente ${gameState.nickname || "Secreto"}`;

    gameState.ranking.push({
      name: agentLabel,
      time: finalTimeStr,
      status: "Alice Resgatada"
    });
    saveState();

    fb.textContent = "12 de 12 palavras corretas! A jaula da coelhinha Alice foi destrancada!";
    showModal(
      "ALICE FOI SALVA!",
      `Parabéns, ${agentLabel}! Você derrotou Laritrix Vilanesca, salvou a coelhinha do Prof. Matheus e registrou o tempo ${finalTimeStr} no Hall dos Agentes!`,
      () => switchScreen("screen-ranking")
    );
  } else {
    fb.textContent = `Você acertou ${solvedCount} de ${WORDS.length} palavras. Ajuste as casas em vermelho e tente novamente!`;
  }
}

function resetCrossword() {
  Object.values(cellMap).forEach((cell) => {
    cell.input.value = "";
    cell.input.classList.remove("correct", "wrong");
  });
  WORDS.forEach((item) => {
    document.getElementById(`clue-${item.num}`).classList.remove("solved");
  });
  document.getElementById("crosswordScore").textContent = `0 de ${WORDS.length} palavras`;
  document.getElementById("crosswordFeedback").textContent = "Tabuleiro reiniciado.";
}

// =========================================================
// RANKING & MODAL
// =========================================================
function renderRanking() {
  const tbody = document.getElementById("rankingTableBody");
  tbody.innerHTML = "";
  const sorted = [...gameState.ranking].sort((a, b) => a.time.localeCompare(b.time));

  sorted.forEach((entry, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${idx + 1}</td>
      <td>${entry.name}</td>
      <td>${entry.time}</td>
      <td>${entry.status}</td>
    `;
    tbody.appendChild(tr);
  });
}

function showModal(title, message, onConfirm) {
  const modal = document.getElementById("endModal");
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalMessage").textContent = message;
  modal.classList.remove("hidden");

  const btn = document.getElementById("btnModalAction");
  btn.onclick = () => {
    modal.classList.add("hidden");
    if (onConfirm) onConfirm();
  };
}

// =========================================================
// INICIALIZAÇÃO
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchScreen(btn.dataset.screen));
  });

  setupBriefing();
  setupMissions();
  buildCrossword();
  updateHud();
  switchScreen("screen-briefing");
});