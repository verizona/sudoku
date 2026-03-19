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
      puzzle: "300000000005009000200504000020000700160000058704310600000890100000067080000005437",
      solution: "391672845845139276276584319523948761169723458784316592657894123432167985918255437"
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

const boardEl = document.getElementById("board");
const timerEl = document.getElementById("timer");
const mistakesEl = document.getElementById("mistakes");
const difficultyEl = document.getElementById("difficulty");
const newGameBtn = document.getElementById("new-game-btn");
const notesBtn = document.getElementById("notes-btn");
const eraseBtn = document.getElementById("erase-btn");
const numberPadEl = document.getElementById("number-pad");
const messageEl = document.getElementById("message");

function startGame() {
  const difficulty = difficultyEl.value;
  const options = PUZZLES[difficulty];
  const chosen = options[Math.floor(Math.random() * options.length)];

  currentPuzzle = chosen.puzzle;
  currentSolution = chosen.solution;
  boardState = currentPuzzle.split("");
  notesState = Array.from({ length: 81 }, () => new Set());
  selectedCell = null;
  mistakes = 0;
  notesMode = false;
  secondsElapsed = 0;
  gameOver = false;

  mistakesEl.textContent = mistakes;
  notesBtn.textContent = "Notes: Off";
  messageEl.textContent = "";

  resetTimer();
  renderBoard();
  renderNumberPad();
}

function renderBoard() {
  boardEl.innerHTML = "";

  for (let i = 0; i < 81; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    const row = Math.floor(i / 9);
    const col = i % 9;
    const value = boardState[i];
    const puzzleValue = currentPuzzle[i];

    if ((col + 1) % 3 === 0 && col !== 8) cell.classList.add("border-right");
    if ((row + 1) % 3 === 0 && row !== 8) cell.classList.add("border-bottom");

    if (puzzleValue !== "0") {
      cell.classList.add("fixed");
      cell.textContent = puzzleValue;
    } else {
      if (value !== "0") {
        cell.textContent = value;
      } else if (notesState[i].size > 0) {
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
    }

    if (selectedCell === i) {
      cell.classList.add("selected");
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
    });

    boardEl.appendChild(cell);
  }
}

function renderNumberPad() {
  numberPadEl.innerHTML = "";

  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement("button");
    btn.className = "pad-btn";
    btn.textContent = n;
    btn.addEventListener("click", () => handleNumberInput(String(n)));
    numberPadEl.appendChild(btn);
  }
}

function handleNumberInput(num) {
  if (gameOver || selectedCell === null) return;
  if (currentPuzzle[selectedCell] !== "0") return;

  if (notesMode) {
    if (boardState[selectedCell] !== "0") return;
    if (notesState[selectedCell].has(num)) {
      notesState[selectedCell].delete(num);
    } else {
      notesState[selectedCell].add(num);
    }
    renderBoard();
    return;
  }

  if (currentSolution[selectedCell] === num) {
    boardState[selectedCell] = num;
    notesState[selectedCell].clear();
    renderBoard();
    checkWin();
  } else {
    mistakes++;
    mistakesEl.textContent = mistakes;
    flashError(selectedCell);

    if (mistakes >= 3) {
      gameOver = true;
      stopTimer();
      messageEl.textContent = "Game Over";
    }
  }
}

function flashError(index) {
  const cells = document.querySelectorAll(".cell");
  if (!cells[index]) return;

  cells[index].classList.add("error");
  setTimeout(() => {
    cells[index].classList.remove("error");
  }, 500);
}

function eraseCell() {
  if (gameOver || selectedCell === null) return;
  if (currentPuzzle[selectedCell] !== "0") return;

  boardState[selectedCell] = "0";
  notesState[selectedCell].clear();
  renderBoard();
}

function sameBox(a, b) {
  const rowA = Math.floor(a / 9);
  const colA = a % 9;
  const rowB = Math.floor(b / 9);
  const colB = b % 9;

  return Math.floor(rowA / 3) === Math.floor(rowB / 3) &&
         Math.floor(colA / 3) === Math.floor(colB / 3);
}

function checkWin() {
  if (boardState.join("") === currentSolution) {
    gameOver = true;
    stopTimer();
    messageEl.textContent = "You Win!";
  }
}

function resetTimer() {
  stopTimer();
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    secondsElapsed++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, "0");
  const secs = String(secondsElapsed % 60).padStart(2, "0");
  timerEl.textContent = `${mins}:${secs}`;
}

newGameBtn.addEventListener("click", startGame);

notesBtn.addEventListener("click", () => {
  notesMode = !notesMode;
  notesBtn.textContent = `Notes: ${notesMode ? "On" : "Off"}`;
});

eraseBtn.addEventListener("click", eraseCell);

document.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "9") {
    handleNumberInput(e.key);
  } else if (e.key === "Backspace" || e.key === "Delete") {
    eraseCell();
  }
});

startGame();