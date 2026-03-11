/**
 * FLASHLIGHT QUIZ — Animator Logic (animator.js)
 * ------------------------------------------------
 * Manages game state, PeerJS connections, timer,
 * buzz arbitration, and scoreboard for the Animator role.
 */

// ── State ─────────────────────────────────────────────
const STATE = {
  peer: null,                // PeerJS Peer instance
  connections: { left: null, right: null },
  questions: [],             // Loaded from questions.json
  currentIndex: 0,           // Current question index
  timerInterval: null,       // setInterval handle
  timeLeft: 15,              // Seconds remaining
  buzzedTeam: null,          // null | "left" | "right"
  scores: { left: 0, right: 0 },
  phase: "idle",             // idle | running | buzzed | revealed | ended
  gameStarted: false,
};

// ── DOM References ─────────────────────────────────────
const DOM = {};

// ── Audio (Web Audio API buzzer sound) ─────────────────
function playBuzzSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) { /* AudioContext not available */ }
}

// ── Boot ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  bindButtons();
  // Load questions on page load so they can be shown right away
  loadQuestions();
});

function cacheDom() {
  const ids = [
    "btnLaunch", "btnStartTimer", "btnShowAnswer", "btnNextQuestion",
    "timerValue", "timerFill", "timerProgress",
    "questionCounter", "questionText",
    "optA", "optB", "optC", "optD",
    "buzzPanel", "buzzMsg",
    "scoreLeft", "scoreRight",
    "connLeft", "connRight", "connLeftDot", "connRightDot",
    "setupScreen", "gameScreen", "endScreen",
    "winnerText", "finalScoreLeft", "finalScoreRight",
    "peerStatus", "phaseLabel",
  ];
  ids.forEach(id => { DOM[id] = document.getElementById(id); });
}

function bindButtons() {
  DOM.btnLaunch.addEventListener("click", launchGame);
  DOM.btnStartTimer.addEventListener("click", startTimer);
  DOM.btnShowAnswer.addEventListener("click", showAnswer);
  DOM.btnNextQuestion.addEventListener("click", nextQuestion);
  document.getElementById("btnRestart")?.addEventListener("click", () => location.reload());
  document.getElementById("btnAwardLeft")?.addEventListener("click", () => awardPoint("left"));
  document.getElementById("btnAwardRight")?.addEventListener("click", () => awardPoint("right"));
  document.getElementById("btnNoPoint")?.addEventListener("click", () => noPoint());
}

// ── Data Loading ───────────────────────────────────────
async function loadQuestions() {
  try {
    // Resolve path relative to root regardless of which subdirectory we're in
    const base = location.pathname.includes("/animator") ? "../" : "./";
    const res = await fetch(base + "data/questions.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    STATE.questions = await res.json();
    setStatus("peerStatus", `✅ ${STATE.questions.length} questions loaded. Click LAUNCH to begin.`);
  } catch (e) {
    setStatus("peerStatus", `⚠️ Could not load questions.json: ${e.message}`);
  }
}

// ── PeerJS Setup ───────────────────────────────────────
function launchGame() {
  if (!STATE.questions.length) {
    alert("Questions not loaded yet. Please wait.");
    return;
  }
  DOM.btnLaunch.disabled = true;
  setStatus("peerStatus", "⏳ Connecting to PeerJS network…");

  // Generate a session-unique ID to avoid clashes on PeerJS cloud
  const sessionId = "flashlight-animator-" + Math.random().toString(36).slice(2, 7);
  window._animatorPeerId = sessionId; // expose for debug

  STATE.peer = new Peer(sessionId, {
    host: "0.peerjs.com",
    port: 443,
    secure: true,
    path: "/",
  });

  STATE.peer.on("open", (id) => {
    // Broadcast the session ID so teams can connect
    document.getElementById("sessionIdDisplay").textContent = id;
    document.getElementById("sessionIdBox").classList.remove("hidden");
    setStatus("peerStatus", "✅ Live! Share the Session ID with your teams.");
    DOM.gameScreen.classList.remove("hidden");
    DOM.setupScreen.classList.add("hidden");
    displayQuestion(STATE.currentIndex);
  });

  STATE.peer.on("connection", handleConnection);

  STATE.peer.on("error", (err) => {
    setStatus("peerStatus", `❌ PeerJS error: ${err.type}`);
    DOM.btnLaunch.disabled = false;
  });
}

function handleConnection(conn) {
  conn.on("open", () => {
    const team = conn.metadata?.team;
    if (team !== "left" && team !== "right") return;

    STATE.connections[team] = conn;
    updateConnIndicator(team, true);

    // Send current question to newly connected player
    conn.send({
      type: "question",
      index: STATE.currentIndex,
      question: STATE.questions[STATE.currentIndex].question,
      options: STATE.questions[STATE.currentIndex].options,
      total: STATE.questions.length,
    });

    conn.on("data", (data) => handlePlayerMessage(team, data));
    conn.on("close", () => {
      STATE.connections[team] = null;
      updateConnIndicator(team, false);
    });
  });
}

function handlePlayerMessage(team, data) {
  if (data.type === "buzz") {
    if (STATE.phase !== "running" && STATE.phase !== "buzzed") return;
    if (STATE.buzzedTeam !== null) return; // Already buzzed — ignore

    STATE.buzzedTeam = team;
    STATE.phase = "buzzed";
    playBuzzSound();
    showBuzzIndicator(team);

    // Acknowledge to all players
    broadcast({ type: "buzzAck", team });

    // Reveal scoring controls
    document.getElementById("scoringControls").classList.remove("hidden");
  }
}

// ── Timer ──────────────────────────────────────────────
const TIMER_DURATION = 15;
const CIRCUMFERENCE = 2 * Math.PI * 54; // r=54 on SVG

function startTimer() {
  if (STATE.phase !== "idle") return;
  STATE.phase = "running";
  STATE.timeLeft = TIMER_DURATION;
  DOM.btnStartTimer.disabled = true;

  // Broadcast question data to any connected team
  broadcastQuestion();

  updateTimerUI(STATE.timeLeft);
  broadcast({ type: "timerStart", seconds: TIMER_DURATION });

  STATE.timerInterval = setInterval(() => {
    STATE.timeLeft--;
    updateTimerUI(STATE.timeLeft);
    broadcast({ type: "timer", seconds: STATE.timeLeft });

    if (STATE.timeLeft <= 0) {
      clearInterval(STATE.timerInterval);
      STATE.timerInterval = null;
      if (STATE.phase === "running") {
        STATE.phase = "buzzed"; // time up
        setPhaseLabel("⏰ Time's up!");
        document.getElementById("scoringControls").classList.remove("hidden");
      }
    }
  }, 1000);
}

function updateTimerUI(seconds) {
  DOM.timerValue.textContent = seconds;
  const pct = seconds / TIMER_DURATION;
  const offset = CIRCUMFERENCE * (1 - pct);
  DOM.timerFill.style.strokeDashoffset = offset;
  DOM.timerProgress.style.width = (pct * 100) + "%";

  const urgent = seconds <= 5 && seconds > 0;
  DOM.timerValue.classList.toggle("urgent", urgent);
  DOM.timerFill.classList.toggle("urgent", urgent);
  DOM.timerProgress.classList.toggle("urgent", urgent);
  setPhaseLabel(seconds > 0 ? `⏱ ${seconds}s remaining` : "⏰ Time's up!");
}

// ── Question Display ───────────────────────────────────
function displayQuestion(index) {
  const q = STATE.questions[index];
  if (!q) return;

  DOM.questionCounter.textContent = `Question ${index + 1} / ${STATE.questions.length}`;
  DOM.questionText.textContent = q.question;
  DOM.questionText.classList.add("animate-slide-up");
  DOM.questionText.addEventListener("animationend", () => DOM.questionText.classList.remove("animate-slide-up"), { once: true });

  const letters = ["A", "B", "C", "D"];
  const optBtns = [DOM.optA, DOM.optB, DOM.optC, DOM.optD];
  q.options.forEach((opt, i) => {
    if (optBtns[i]) {
      optBtns[i].querySelector(".option-letter").textContent = letters[i];
      optBtns[i].querySelector(".option-text").textContent = opt;
      optBtns[i].className = "option-btn";
    }
  });

  // Reset UI state
  resetBuzzIndicator();
  updateTimerUI(TIMER_DURATION);
  DOM.timerFill.style.strokeDashoffset = 0;
  setPhaseLabel("🎯 Ready — click START TIMER");
  DOM.btnStartTimer.disabled = false;
  DOM.btnShowAnswer.disabled = false;
  DOM.btnNextQuestion.disabled = true;
  document.getElementById("scoringControls").classList.add("hidden");
}

function broadcastQuestion() {
  const q = STATE.questions[STATE.currentIndex];
  broadcast({
    type: "question",
    index: STATE.currentIndex,
    question: q.question,
    options: q.options,
    total: STATE.questions.length,
  });
}

// ── Show Answer ────────────────────────────────────────
function showAnswer() {
  if (STATE.phase === "idle") {
    // Allow showing answer even without timer start (skip)
  }
  if (STATE.timerInterval) { clearInterval(STATE.timerInterval); STATE.timerInterval = null; }
  STATE.phase = "revealed";

  const correctIdx = STATE.questions[STATE.currentIndex].correctAnswer;
  const optBtns = [DOM.optA, DOM.optB, DOM.optC, DOM.optD];
  optBtns.forEach((btn, i) => {
    if (!btn) return;
    if (i === correctIdx) {
      btn.classList.add("correct");
    } else {
      btn.classList.add("reveal-wrong");
    }
  });

  broadcast({ type: "answer", correctIndex: correctIdx });
  DOM.btnShowAnswer.disabled = true;
  DOM.btnNextQuestion.disabled = false;
  setPhaseLabel("✅ Correct answer revealed!");
  document.getElementById("scoringControls").classList.remove("hidden");
}

// ── Scoring ────────────────────────────────────────────
function awardPoint(team) {
  STATE.scores[team]++;
  updateScoreboard();
  broadcast({ type: "scored", team, scores: STATE.scores });
  document.getElementById("scoringControls").classList.add("hidden");
  DOM.btnShowAnswer.disabled = true;
  DOM.btnNextQuestion.disabled = false;
  setPhaseLabel(`🏅 Point awarded to Team ${team.toUpperCase()}!`);
}

function noPoint() {
  document.getElementById("scoringControls").classList.add("hidden");
  DOM.btnShowAnswer.disabled = true;
  DOM.btnNextQuestion.disabled = false;
  setPhaseLabel("➡ No point awarded.");
}

function updateScoreboard() {
  DOM.scoreLeft.textContent = STATE.scores.left;
  DOM.scoreRight.textContent = STATE.scores.right;
  animatePop(DOM.scoreLeft.parentElement);
}

// ── Next Question ──────────────────────────────────────
function nextQuestion() {
  STATE.currentIndex++;
  if (STATE.currentIndex >= STATE.questions.length) {
    endGame();
    return;
  }
  STATE.buzzedTeam = null;
  STATE.phase = "idle";
  broadcast({ type: "nextQuestion", index: STATE.currentIndex });
  displayQuestion(STATE.currentIndex);
}

// ── End Game ───────────────────────────────────────────
function endGame() {
  broadcast({ type: "gameOver", scores: STATE.scores });
  DOM.gameScreen.classList.add("hidden");
  DOM.endScreen.classList.remove("hidden");
  DOM.finalScoreLeft.textContent = STATE.scores.left;
  DOM.finalScoreRight.textContent = STATE.scores.right;

  let winnerText, winnerClass;
  if (STATE.scores.left > STATE.scores.right) {
    winnerText = "🏆 TEAM LEFT WINS!";
    winnerClass = "left";
  } else if (STATE.scores.right > STATE.scores.left) {
    winnerText = "🏆 TEAM RIGHT WINS!";
    winnerClass = "right";
  } else {
    winnerText = "🤝 IT'S A TIE!";
    winnerClass = "tie";
  }
  DOM.winnerText.textContent = winnerText;
  DOM.winnerText.className = `winner-badge ${winnerClass}`;
}

// ── Buzz UI ────────────────────────────────────────────
function showBuzzIndicator(team) {
  const icon  = team === "left" ? "🔴" : "🔵";
  const label = team === "left" ? "Team LEFT" : "Team RIGHT";
  DOM.buzzMsg.textContent = `${icon} ${label} BUZZED FIRST!`;
  DOM.buzzPanel.className = `buzz-indicator buzzed-${team}`;
  setPhaseLabel(`🔔 ${label} buzzed!`);
}

function resetBuzzIndicator() {
  STATE.buzzedTeam = null;
  DOM.buzzMsg.textContent = "No buzz yet…";
  DOM.buzzPanel.className = "buzz-indicator";
}

// ── Connection Indicators ──────────────────────────────
function updateConnIndicator(team, connected) {
  const dot  = DOM[`connDot${team.charAt(0).toUpperCase() + team.slice(1)}`] || document.getElementById(`connDot${team.charAt(0).toUpperCase() + team.slice(1)}`);
  const span = DOM[`conn${team.charAt(0).toUpperCase() + team.slice(1)}`] || document.getElementById(`conn${team.charAt(0).toUpperCase() + team.slice(1)}`);
  if (dot) dot.className = "conn-dot " + (connected ? "connected" : "error");
  if (span) span.textContent = connected ? "Connected" : "Offline";
}

// ── Broadcast Helpers ──────────────────────────────────
function broadcast(data) {
  ["left", "right"].forEach(t => {
    const conn = STATE.connections[t];
    if (conn && conn.open) { try { conn.send(data); } catch(e) {} }
  });
}

// ── UI Helpers ─────────────────────────────────────────
function setStatus(elId, msg) {
  const el = document.getElementById(elId);
  if (el) el.textContent = msg;
}

function setPhaseLabel(msg) {
  if (DOM.phaseLabel) DOM.phaseLabel.textContent = msg;
}

function animatePop(el) {
  if (!el) return;
  el.style.transform = "scale(1.1)";
  setTimeout(() => { el.style.transform = ""; }, 300);
}
