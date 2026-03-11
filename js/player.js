/**
 * FLASHLIGHT QUIZ — Player Logic (player.js)
 * -------------------------------------------
 * Shared between Team Left and Team Right screens.
 * Detects which team based on window.location.pathname.
 * Connects to the Animator peer, handles BUZZ button,
 * timer sync, and status messages.
 */

// ── Detect Team ────────────────────────────────────────
const path = window.location.pathname.toLowerCase();
const TEAM = path.includes("/right") ? "right" : "left";

// ── State ──────────────────────────────────────────────
const STATE = {
  peer: null,
  conn: null,           // DataConnection to animator
  animatorId: null,     // Provided by animator session ID
  buzzSent: false,
  timeLeft: 15,
  timerInterval: null,
  phase: "disconnected", // disconnected | connected | waiting | buzzed | revealed
};

const TIMER_DURATION = 15;
const CIRCUMFERENCE = 2 * Math.PI * 54;

// ── Audio ──────────────────────────────────────────────
function playBuzzSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {}
}

function playCorrectSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.2);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.25);
    });
  } catch (e) {}
}

// ── DOM References ─────────────────────────────────────
let DOM = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  applyTeamTheme();
  bindButtons();
});

function cacheDom() {
  DOM = {
    btnBuzz:        document.getElementById("btnBuzz"),
    btnConnect:     document.getElementById("btnConnect"),
    sessionInput:   document.getElementById("sessionInput"),
    timerValue:     document.getElementById("timerValue"),
    timerFill:      document.getElementById("timerFill"),
    timerProgress:  document.getElementById("timerProgress"),
    statusBanner:   document.getElementById("statusBanner"),
    connStatus:     document.getElementById("connStatus"),
    connDot:        document.getElementById("connDot"),
    questionText:   document.getElementById("questionText"),
    optionsWrap:    document.getElementById("optionsWrap"),
    questionCounter:document.getElementById("questionCounter"),
    endOverlay:     document.getElementById("endOverlay"),
    endMsg:         document.getElementById("endMsg"),
    endScores:      document.getElementById("endScores"),
    teamLabel:      document.getElementById("teamLabel"),
  };
}

function applyTeamTheme() {
  // Set body class and text content based on team
  document.body.classList.add(`team-${TEAM}`);
  if (DOM.teamLabel) DOM.teamLabel.textContent = TEAM === "left" ? "⬅ TEAM LEFT" : "TEAM RIGHT ➡";
  // Don't wipe buzz button classes — just add team identifier
  if (DOM.btnBuzz) {
    DOM.btnBuzz.classList.add(`${TEAM}-btn`);
  }
  // Set page title
  document.title = `Flashlight — Team ${TEAM.charAt(0).toUpperCase() + TEAM.slice(1)}`;
}

function bindButtons() {
  if (DOM.btnConnect) DOM.btnConnect.addEventListener("click", connectToAnimator);
  if (DOM.sessionInput) DOM.sessionInput.addEventListener("keydown", (e) => { if (e.key === "Enter") connectToAnimator(); });
  if (DOM.btnBuzz) DOM.btnBuzz.addEventListener("click", sendBuzz);
}

// ── Connection ─────────────────────────────────────────
function connectToAnimator() {
  const sessionId = DOM.sessionInput?.value.trim();
  if (!sessionId) {
    setStatus("⚠️ Please enter the Session ID from the Animator screen.", "status-waiting");
    return;
  }

  STATE.animatorId = sessionId;
  DOM.btnConnect && (DOM.btnConnect.disabled = true);
  setConnStatus("connecting");
  setStatus("⏳ Connecting…", "status-waiting");

  STATE.peer = new Peer(undefined, {
    host: "0.peerjs.com",
    port: 443,
    secure: true,
    path: "/",
  });

  STATE.peer.on("open", () => {
    STATE.conn = STATE.peer.connect(STATE.animatorId, {
      metadata: { team: TEAM },
      reliable: true,
    });

    STATE.conn.on("open", () => {
      STATE.phase = "connected";
      setConnStatus("connected");
      setStatus("✅ Connected! Waiting for the game to start…", "status-connected");
      DOM.btnConnect && (DOM.btnConnect.disabled = true);
      document.getElementById("connectSection")?.classList.add("hidden");
    });

    STATE.conn.on("data", handleMessage);

    STATE.conn.on("close", () => {
      STATE.phase = "disconnected";
      setConnStatus("error");
      setStatus("⚠️ Connection lost. Refresh to reconnect.", "status-waiting");
    });

    STATE.conn.on("error", (err) => {
      setConnStatus("error");
      setStatus(`❌ Error: ${err.type}. Try refreshing.`, "status-waiting");
      DOM.btnConnect && (DOM.btnConnect.disabled = false);
    });
  });

  STATE.peer.on("error", (err) => {
    setConnStatus("error");
    setStatus(`❌ Peer error: ${err.type}`, "status-waiting");
    DOM.btnConnect && (DOM.btnConnect.disabled = false);
  });
}

// ── Message Handler ────────────────────────────────────
function handleMessage(data) {
  switch (data.type) {

    case "question":
      displayQuestion(data);
      resetBuzz();
      clearLocalTimer();
      updateTimerUI(TIMER_DURATION);
      setStatus("🎯 Get ready to buzz!", "status-waiting");
      break;

    case "timerStart":
      startLocalTimer(data.seconds);
      setStatus("⏱ Timer started — stay sharp!", "status-waiting");
      break;

    case "timer":
      // Sync from animator tick
      STATE.timeLeft = data.seconds;
      updateTimerUI(data.seconds);
      if (data.seconds <= 0) {
        clearLocalTimer();
        if (!STATE.buzzSent) setStatus("⏰ Time's up!", "status-waiting");
      }
      break;

    case "buzzAck":
      if (data.team === TEAM) {
        setStatus("🔔 YOU BUZZED FIRST! Answer now!", "status-first");
      } else {
        setStatus("😔 Too slow — other team buzzed first.", "status-late");
        DOM.btnBuzz && (DOM.btnBuzz.disabled = true);
      }
      break;

    case "answer":
      revealAnswer(data.correctIndex);
      break;

    case "nextQuestion":
      // Reset will happen when question message arrives
      setStatus("➡ Next question incoming…", "status-waiting");
      resetBuzz();
      clearLocalTimer();
      break;

    case "scored":
      // Optional: show score update notification
      break;

    case "gameOver":
      showEndScreen(data.scores);
      break;
  }
}

// ── BUZZ ───────────────────────────────────────────────
function sendBuzz() {
  if (STATE.buzzSent || !STATE.conn || !STATE.conn.open) return;
  STATE.buzzSent = true;
  DOM.btnBuzz && (DOM.btnBuzz.disabled = true);
  playBuzzSound();
  STATE.conn.send({ type: "buzz", team: TEAM });
  setStatus("🔴 Buzz sent! Waiting for confirmation…", "status-sent");
}

function resetBuzz() {
  STATE.buzzSent = false;
  DOM.btnBuzz && (DOM.btnBuzz.disabled = false);
}

// ── Local Timer (fallback in case of network lag) ──────
function startLocalTimer(seconds) {
  clearLocalTimer();
  STATE.timeLeft = seconds;
  STATE.timerInterval = setInterval(() => {
    // Animator sends ticks, but we also run local for smooth display
    // The "timer" message from animator will override this value
  }, 1000);
}

function clearLocalTimer() {
  if (STATE.timerInterval) { clearInterval(STATE.timerInterval); STATE.timerInterval = null; }
}

// ── Timer UI ───────────────────────────────────────────
function updateTimerUI(seconds) {
  if (!DOM.timerValue) return;
  DOM.timerValue.textContent = Math.max(0, seconds);
  const pct = Math.max(0, seconds) / TIMER_DURATION;
  const offset = CIRCUMFERENCE * (1 - pct);
  if (DOM.timerFill) {
    DOM.timerFill.style.strokeDashoffset = offset;
    DOM.timerFill.classList.toggle("urgent", seconds <= 5 && seconds > 0);
  }
  if (DOM.timerProgress) {
    DOM.timerProgress.style.width = (pct * 100) + "%";
    DOM.timerProgress.classList.toggle("urgent", seconds <= 5 && seconds > 0);
  }
  if (DOM.timerValue) DOM.timerValue.classList.toggle("urgent", seconds <= 5 && seconds > 0);
}

// ── Question Display ───────────────────────────────────
function displayQuestion(data) {
  if (DOM.questionCounter) DOM.questionCounter.textContent = `Question ${data.index + 1} / ${data.total}`;
  if (DOM.questionText) {
    DOM.questionText.textContent = data.question;
    DOM.questionText.classList.add("animate-slide-up");
    DOM.questionText.addEventListener("animationend", () => DOM.questionText.classList.remove("animate-slide-up"), { once: true });
  }

  if (DOM.optionsWrap && data.options) {
    const letters = ["A", "B", "C", "D"];
    DOM.optionsWrap.innerHTML = "";
    data.options.forEach((opt, i) => {
      const btn = document.createElement("div");
      btn.className = "option-btn flex items-center gap-3 py-3.5 px-4 rounded-xl border-[1.5px] border-dark text-light text-sm font-medium";
      btn.style.background = "rgba(255,255,255,0.04)";
      btn.id = `opt-${i}`;
      btn.innerHTML = `
        <span class="option-letter flex items-center justify-center w-8 h-8 bg-dark rounded-lg font-extrabold text-sm text-gold shrink-0">${letters[i]}</span>
        <span class="option-text">${opt}</span>
      `;
      DOM.optionsWrap.appendChild(btn);
    });
  }
}

// ── Reveal Answer ──────────────────────────────────────
function revealAnswer(correctIndex) {
  const opts = document.querySelectorAll(".option-btn");
  opts.forEach((btn, i) => {
    if (i === correctIndex) {
      btn.classList.add("correct");
    } else {
      btn.classList.add("reveal-wrong");
    }
  });

  if (STATE.buzzSent) {
    playCorrectSound();
    setStatus("✅ Answer revealed!", "status-connected");
  } else {
    setStatus("✅ Answer revealed!", "status-connected");
  }
}

// ── End Screen ─────────────────────────────────────────
function showEndScreen(scores) {
  if (!DOM.endOverlay) return;
  DOM.endOverlay.classList.remove("hidden");
  DOM.endOverlay.style.display = "flex";

  const teamColor = TEAM === "left" ? "var(--color-left)" : "var(--color-right)";
  const myScore = scores[TEAM];
  const otherScore = scores[TEAM === "left" ? "right" : "left"];
  const won = myScore > otherScore;
  const tied = myScore === otherScore;

  const msg = tied ? "🤝 It's a Tie!" : won ? "🏆 Your Team Wins!" : "😔 Better luck next time!";
  if (DOM.endMsg) {
    DOM.endMsg.textContent = msg;
    DOM.endMsg.style.color = tied ? "var(--color-gold)" : won ? "var(--color-success)" : "var(--color-wrong)";
  }
  if (DOM.endScores) {
    DOM.endScores.innerHTML = `
      <div style="color:var(--color-left)">⬅ Team Left: <strong>${scores.left}</strong></div>
      <div style="color:var(--color-right)">Team Right ➡: <strong>${scores.right}</strong></div>
    `;
  }
}

// ── Status Helpers ─────────────────────────────────────
function setStatus(msg, cls) {
  if (!DOM.statusBanner) return;
  DOM.statusBanner.textContent = msg;
  DOM.statusBanner.className = `status-banner ${cls}`;
}

function setConnStatus(state) {
  const dot  = DOM.connDot;
  const span = DOM.connStatus;
  const map = {
    "connecting": ["", "Connecting…"],
    "connected":  ["connected", "Connected"],
    "error":      ["error", "Offline"],
  };
  const [cls, label] = map[state] || ["", state];
  if (dot)  dot.className = `conn-dot ${cls}`;
  if (span) span.textContent = label;
}
