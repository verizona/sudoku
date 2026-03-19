const PUZZLES = {
  easy: [
    {
      puzzle: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
      solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
    },
    {
      puzzle: "200080300060070084030500209000105408000000000402706000301007040720040060004010003",
      solution: "245986371169273584837514269673125498918364725452796831391657842726843156584219673"
    }
  ],
  medium: [
    {
      puzzle: "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
      solution: "435269781682571493197834562826195347374682915951743628519326874248957136763418259"
    },
    {
      puzzle: "600120384008459072000006005000264030070080006940003000310000050089700000502000190",
      solution: "697125384138459672254836915851264739273981546946573821314698257789512463562347198"
    }
  ],
  hard: [
    {
      puzzle: "000000907000420180000705026100904000050000040000507009920108000034059000507000000",
      solution: "483612957659423187271795326168934572952871643743567819926148735834259761517386294"
    },
    {
      puzzle: "030000080009000500007509200700105008000000000500803001002401700004000100090000040",
      solution: "135267489249318576867549213723195868918624357546873921352481796684957132791236845"
    }
  ]
};

const SAVE_KEY = "osman_sudoku_save_v5";
const SETTINGS_KEY = "osman_sudoku_settings_v5";

let currentPuzzle = "";
let currentSolution = "";
let boardState = [];
let notesState = [];
let selectedCell = null;
let mistakes = 0;
let notesMode = false;
let secondsElapsed = 0;
let timerInterval = null;
let gameOver = false;
let hintsLeft = 3;
let theme = "dark";
let touchStartX = 0;
let touchStartY = 0;

const boardEl = document.getElementById("board");
const difficultyEl = document.getElementById("difficulty");
const newGameBtn = document.getElementById("new-game-btn");
const notesBtn = document.getElementById("notes-btn");
const eraseBtn = document.getElementById("erase-btn");
const hintBtn = document.getElementById("hint-btn");
const themeBtn = document.getElementById("theme-btn");
const messageEl = document.getElementById("message");
const victoryOverlay = document.getElementById("victory-overlay");
const victoryTime = document.getElementById("victory-time");
const playAgainBtn = document.getElementById("play-again-btn");
const confettiContainer = document.getElementById("confetti-container");
const cellInput = document.getElementById("cell-input");
const numberPadEl = document.getElementById("number-pad");

function createEmptyNotes() {
  return Array.from({ length: 81 }, () => new Set());
}

function isValidPuzzleString(value) {
  return typeof value === "string" && /^[0-9]{81}$/.test(value);
}

function normalizeBoardState(value, fallbackPuzzle) {
  if (!Array.isArray(value) || value.length !== 81) {
    return fallbackPuzzle.split("");
  }
  return value.map(v => /^[0-9]$/.test(String(v)) ? String(v) : "0");
}

function normalizeNotesState(value) {
  if (!Array.isArray(value) || value.length !== 81) {
    return createEmptyNotes();
  }

  return value.map(item => {
    const set = new Set();
    if (Array.isArray(item)) {
      item.forEach(v => {
        const s = String(v);
        if (/^[1-9]$/.test(s)) set.add(s);
      });
    }
    return set;
  });
}

function startGame(forceDifficulty = null) {
  const difficulty = forceDifficulty || difficultyEl.value || "medium";
  difficultyEl.value = difficulty;

  const options = PUZZLES[difficulty];
  const chosen = options[Math.floor(Math.random() * options.length)];

  currentPuzzle = chosen.puzzle;
  currentSolution = chosen.solution;
  boardState = currentPuzzle.split("");
  notesState = createEmptyNotes();
  selectedCell = null;
  mistakes = 0;
  notesMode = false;
  secondsElapsed = 0;
  gameOver = false;
  hintsLeft = 3;

  notesBtn.textContent = "Notes: Off";
  messageEl.textContent = "";
  hideVictory();
  clearSave();

  resetTimer();
  renderBoard();
  renderNumberPad();
  saveGame();
}

function renderBoard() {
  boardEl.innerHTML = "";

  if (!isValidPuzzleString(currentPuzzle) || !isValidPuzzleString(currentSolution)) {
    startGame(difficultyEl.value || "medium");
    return;
  }

  if (!Array.isArray(boardState) || boardState.length !== 81) {
    boardState = currentPuzzle.split("");
  }

  if (!Array.isArray(notesState) || notesState.length !== 81) {
    notesState = createEmptyNotes();
  }

  const duplicates = findDuplicates();

  for (let i = 0; i < 81; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = String(i);

    const row = Math.floor(i / 9);
    const col = i % 9;
    const value = boardState[i] ?? "0";
    const puzzleValue = currentPuzzle[i] ?? "0";

    if ((col + 1) % 3 === 0 && col !== 8) cell.classList.add("border-right");
    if ((row + 1) % 3 === 0 && row !== 8) cell.classList.add("border-bottom");

    if (puzzleValue !== "0") {
      cell.classList.add("fixed");
      cell.textContent = puzzleValue;
    } else if (value !== "0") {
      cell.textContent = value;
    } else if (notesState[i] && notesState[i].size > 0) {
      const notesGrid = document.createElement("div");
      notesGrid.className = "notes-grid";

      for (let n = 1; n <= 9; n++) {
        const note = document.createElement("div");
        note.className = "note";
        note.textContent = notesState[i].has(String(n)) ? String(n) : "";
        notesGrid.appendChild(note);
      }

      cell.appendChild(notesGrid);
    }

    if (selectedCell === i) {
      cell.classList.add("selected");
    }

    if (duplicates.has(i)) {
      cell.classList.add("duplicate");
    }

    if (selectedCell !== null) {
      const selectedValue = boardState[selectedCell];
      const selectedRow = Math.floor(selectedCell / 9);
      const selectedCol = selectedCell % 9;

      if (row === selectedRow || col === selectedCol || sameBox(i, selectedCell)) {
        if (i !== selectedCell) cell.classList.add("related");
      }

      if (selectedValue !== "0" && boardState[i] === selectedValue && i !== selectedCell) {
        cell.classList.add("same-number");
      }
    }

    cell.addEventListener("click", () => {
      if (gameOver) return;
      selectedCell = i;
      renderBoard();
      focusInputForCell(i);
    });

    boardEl.appendChild(cell);
  }
}

function renderNumberPad() {
  if (!numberPadEl) return;

  numberPadEl.innerHTML = "";

  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement("button");
    btn.className = "pad-btn";
    btn.type = "button";
    btn.textContent = String(n);
    btn.addEventListener("click", () => handleNumberInput(String(n)));
    numberPadEl.appendChild(btn);
  }
}

function focusInputForCell(index) {
  if (currentPuzzle[index] !== "0") return;
  cellInput.value = "";
  setTimeout(() => cellInput.focus(), 10);
}

function handleNumberInput(num) {
  if (gameOver || selectedCell === null) return;
  if (currentPuzzle[selectedCell] !== "0") return;
  if (!/^[1-9]$/.test(num)) return;

  if (notesMode) {
    if (boardState[selectedCell] !== "0") return;

    if (notesState[selectedCell].has(num)) {
      notesState[selectedCell].delete(num);
    } else {
      notesState[selectedCell].add(num);
    }

    renderBoard();
    saveGame();
    return;
  }

  if (currentSolution[selectedCell] === num) {
    boardState[selectedCell] = num;
    notesState[selectedCell].clear();
    messageEl.textContent = "";
    renderBoard();
    saveGame();
    checkWin();
  } else {
    mistakes++;
    flashError(selectedCell);
    renderBoard();
    saveGame();

    if (mistakes >= 3) {
      gameOver = true;
      stopTimer();
      messageEl.textContent = "Game Over";
    } else {
      messageEl.textContent = `Wrong move (${mistakes}/3)`;
    }
  }
}

function flashError(index) {
  const cells = document.querySelectorAll(".cell");
  if (!cells[index]) return;

  cells[index].classList.add("error");
  setTimeout(() => {
    if (cells[index]) cells[index].classList.remove("error");
  }, 450);
}

function eraseCell() {
  if (gameOver || selectedCell === null) return;
  if (currentPuzzle[selectedCell] !== "0") return;

  boardState[selectedCell] = "0";
  notesState[selectedCell].clear();
  renderBoard();
  saveGame();
}

function useHint() {
  if (gameOver || selectedCell === null) return;

  if (hintsLeft <= 0) {
    messageEl.textContent = "No hints left";
    return;
  }

  if (currentPuzzle[selectedCell] !== "0") {
    messageEl.textContent = "Pick an empty cell";
    return;
  }

  boardState[selectedCell] = currentSolution[selectedCell];
  notesState[selectedCell].clear();
  hintsLeft--;
  messageEl.textContent = `Hint used (${hintsLeft} left)`;

  renderBoard();
  saveGame();
  checkWin();
}

function sameBox(a, b) {
  const rowA = Math.floor(a / 9);
  const colA = a % 9;
  const rowB = Math.floor(b / 9);
  const colB = b % 9;

  return Math.floor(rowA / 3) === Math.floor(rowB / 3) &&
         Math.floor(colA / 3) === Math.floor(colB / 3);
}

function getRowCol(index) {
  return {
    row: Math.floor(index / 9),
    col: index % 9
  };
}

function findDuplicates() {
  const duplicateSet = new Set();

  for (let row = 0; row < 9; row++) {
    const seen = {};
    for (let col = 0; col < 9; col++) {
      const idx = row * 9 + col;
      const val = boardState[idx];
      if (val === "0") continue;
      if (!seen[val]) seen[val] = [];
      seen[val].push(idx);
    }
    for (const val in seen) {
      if (seen[val].length > 1) seen[val].forEach(i => duplicateSet.add(i));
    }
  }

  for (let col = 0; col < 9; col++) {
    const seen = {};
    for (let row = 0; row < 9; row++) {
      const idx = row * 9 + col;
      const val = boardState[idx];
      if (val === "0") continue;
      if (!seen[val]) seen[val] = [];
      seen[val].push(idx);
    }
    for (const val in seen) {
      if (seen[val].length > 1) seen[val].forEach(i => duplicateSet.add(i));
    }
  }

  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const seen = {};
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const row = boxRow * 3 + r;
          const col = boxCol * 3 + c;
          const idx = row * 9 + col;
          const val = boardState[idx];
          if (val === "0") continue;
          if (!seen[val]) seen[val] = [];
          seen[val].push(idx);
        }
      }
      for (const val in seen) {
        if (seen[val].length > 1) seen[val].forEach(i => duplicateSet.add(i));
      }
    }
  }

  return duplicateSet;
}

function checkWin() {
  if (boardState.join("") === currentSolution) {
    gameOver = true;
    stopTimer();
    messageEl.textContent = "You Win!";
    showVictory();
    clearSave();
  }
}

function resetTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    if (!gameOver) {
      secondsElapsed++;
      saveGame();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

function showVictory() {
  if (!victoryOverlay || !victoryTime) return;
  victoryTime.textContent = `Solved in ${formatTime(secondsElapsed)}`;
  victoryOverlay.classList.remove("hidden");
  launchConfetti();
}

function hideVictory() {
  if (victoryOverlay) {
    victoryOverlay.classList.add("hidden");
  }
  if (confettiContainer) {
    confettiContainer.innerHTML = "";
  }
}

function launchConfetti() {
  if (!confettiContainer) return;

  confettiContainer.innerHTML = "";
  const colors = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#a855f7", "#06b6d4", "#eab308"];

  for (let i = 0; i < 90; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${2.8 + Math.random() * 2.2}s`;
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    confettiContainer.appendChild(piece);
  }
}

function saveGame() {
  if (!isValidPuzzleString(currentPuzzle) || !isValidPuzzleString(currentSolution) || gameOver) return;

  const saveData = {
    difficulty: difficultyEl.value,
    currentPuzzle,
    currentSolution,
    boardState,
    notesState: notesState.map(set => Array.from(set)),
    selectedCell,
    mistakes,
    notesMode,
    secondsElapsed,
    hintsLeft,
    timestamp: Date.now()
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);

    if (!isValidPuzzleString(data.currentPuzzle) || !isValidPuzzleString(data.currentSolution)) {
      clearSave();
      return false;
    }

    difficultyEl.value = data.difficulty || "medium";
    currentPuzzle = data.currentPuzzle;
    currentSolution = data.currentSolution;
    boardState = normalizeBoardState(data.boardState, currentPuzzle);
    notesState = normalizeNotesState(data.notesState);
    selectedCell = typeof data.selectedCell === "number" ? data.selectedCell : null;
    mistakes = Number.isInteger(data.mistakes) ? data.mistakes : 0;
    notesMode = !!data.notesMode;
    secondsElapsed = Number.isInteger(data.secondsElapsed) ? data.secondsElapsed : 0;
    hintsLeft = Number.isInteger(data.hintsLeft) ? data.hintsLeft : 3;
    gameOver = false;

    notesBtn.textContent = `Notes: ${notesMode ? "On" : "Off"}`;
    messageEl.textContent = "Saved game loaded";
    hideVictory();

    resetTimer();
    renderBoard();
    renderNumberPad();
    return true;
  } catch (err) {
    clearSave();
    return false;
  }
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme }));
}

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);

  try {
    if (raw) {
      const data = JSON.parse(raw);
      theme = data.theme === "light" ? "light" : "dark";
    }
  } catch {
    theme = "dark";
  }

  applyTheme();
}

function applyTheme() {
  document.body.classList.toggle("light", theme === "light");
  if (themeBtn) {
    themeBtn.textContent = `Theme: ${theme === "light" ? "Light" : "Dark"}`;
  }
  saveSettings();
}

function toggleTheme() {
  theme = theme === "dark" ? "light" : "dark";
  applyTheme();
}

function moveSelection(direction) {
  if (selectedCell === null) {
    selectedCell = 0;
    renderBoard();
    return;
  }

  const { row, col } = getRowCol(selectedCell);
  let newRow = row;
  let newCol = col;

  if (direction === "left") newCol = Math.max(0, col - 1);
  if (direction === "right") newCol = Math.min(8, col + 1);
  if (direction === "up") newRow = Math.max(0, row - 1);
  if (direction === "down") newRow = Math.min(8, row + 1);

  selectedCell = newRow * 9 + newCol;
  renderBoard();

  if (currentPuzzle[selectedCell] === "0") {
    focusInputForCell(selectedCell);
  }
}

function setupSwipe() {
  if (!boardEl) return;

  boardEl.addEventListener("touchstart", (e) => {
    const touch = e.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  boardEl.addEventListener("touchend", (e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) < 24) return;

    if (absX > absY) {
      moveSelection(dx > 0 ? "right" : "left");
    } else {
      moveSelection(dy > 0 ? "down" : "up");
    }
  }, { passive: true });
}

if (newGameBtn) {
  newGameBtn.addEventListener("click", () => startGame());
}

if (notesBtn) {
  notesBtn.addEventListener("click", () => {
    notesMode = !notesMode;
    notesBtn.textContent = `Notes: ${notesMode ? "On" : "Off"}`;
    saveGame();
  });
}

if (eraseBtn) {
  eraseBtn.addEventListener("click", eraseCell);
}

if (hintBtn) {
  hintBtn.addEventListener("click", useHint);
}

if (themeBtn) {
  themeBtn.addEventListener("click", toggleTheme);
}

if (playAgainBtn) {
  playAgainBtn.addEventListener("click", () => startGame());
}

if (cellInput) {
  cellInput.addEventListener("input", (e) => {
    const value = e.target.value.replace(/[^1-9]/g, "");
    if (value) handleNumberInput(value);
    cellInput.value = "";
  });

  cellInput.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      eraseCell();
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.target === cellInput) return;

  if (e.key >= "1" && e.key <= "9") {
    handleNumberInput(e.key);
    return;
  }

  if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
    eraseCell();
    return;
  }

  if (e.key === "ArrowLeft") moveSelection("left");
  if (e.key === "ArrowRight") moveSelection("right");
  if (e.key === "ArrowUp") moveSelection("up");
  if (e.key === "ArrowDown") moveSelection("down");
});

window.addEventListener("beforeunload", saveGame);

loadSettings();
setupSwipe();

try {
  const loaded = loadGame();
  if (!loaded) {
    startGame();
  }
} catch (err) {
  clearSave();
  startGame();
}
