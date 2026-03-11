<<<<<<< HEAD
# Learnify
=======
# 🔦 Flashlight Quiz

A **real-time, multiplayer quiz game** for the Flashlight University English Club — inspired by "Questions for a Champion" and "Burger Quiz". No server required. Works entirely in the browser via PeerJS, deployable to GitHub Pages or Vercel.

---

## 🎮 How It Works

Three screens, three roles, one game:

| Screen | URL | Role |
|--------|-----|------|
| `index.html` | `/` | Lobby / Role selection |
| `animator/index.html` | `/animator` | Game host (controls everything) |
| `left/index.html` | `/left` | Team Left (red team) |
| `right/index.html` | `/right` | Team Right (blue team) |

**Game Flow:**
1. Animator opens `/animator` → clicks **LAUNCH GAME** → a unique **Session ID** appears.
2. Team Left opens `/left` → enters Session ID → clicks **CONNECT**.
3. Team Right does the same at `/right`.
4. Animator clicks **START TIMER** → 15-second countdown begins on all screens.
5. First team to click **BUZZ** wins the right to answer.
6. Animator clicks **SHOW ANSWER** → correct option is revealed.
7. Animator awards a point (or not) using the scoring buttons.
8. **NEXT QUESTION** → repeat until all questions are done.
9. Final scoreboard announces the winner! 🏆

---

## 📁 File Structure

```
QUIZZAPP/
├── index.html              ← Landing page (role selection)
├── animator/
│   └── index.html          ← Animator control panel
├── left/
│   └── index.html          ← Team Left player screen
├── right/
│   └── index.html          ← Team Right player screen
├── js/
│   ├── animator.js         ← Animator game logic
│   └── player.js           ← Shared player logic
├── css/
│   └── styles.css          ← All styles & animations
└── data/
    └── questions.json      ← ✏️ Edit this to add your questions!
```

---

## ✏️ How to Add or Edit Questions

Open `data/questions.json`. Each question follows this format:

```json
{
  "question": "Your question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 1
}
```

| Field | Type | Description |
|-------|------|-------------|
| `question` | string | The question text |
| `options` | array of 4 strings | The 4 answer choices (A, B, C, D) |
| `correctAnswer` | number (0–3) | Index of the correct option (0 = A, 1 = B, 2 = C, 3 = D) |

### Example:

```json
[
  {
    "question": "What is the capital of England?",
    "options": ["Paris", "London", "Berlin", "Madrid"],
    "correctAnswer": 1
  },
  {
    "question": "Which word means 'happy'?",
    "options": ["Sad", "Angry", "Joyful", "Tired"],
    "correctAnswer": 2
  }
]
```

> ✅ **Tip:** You can add as many questions as you want. The game ends automatically when all questions have been displayed. No JavaScript changes needed!

---

## 💻 How to Run Locally

You need a simple static file server (because `fetch()` doesn't work with `file://` URLs).

### Option 1 — VS Code Live Server (easiest)
1. Install the **Live Server** extension in VS Code.
2. Right-click `index.html` → **Open with Live Server**.
3. Open three browser tabs:
   - `http://127.0.0.1:5500/` (Lobby)
   - `http://127.0.0.1:5500/animator/` (Animator)
   - `http://127.0.0.1:5500/left/` (Team Left)
   - `http://127.0.0.1:5500/right/` (Team Right)

### Option 2 — Python (no install needed on most systems)
```bash
# In the QUIZZAPP folder:
python -m http.server 8080
# Then open: http://localhost:8080
```

### Option 3 — Node.js `serve`
```bash
npx serve .
```

### Testing Multiplayer Locally
Open **three browser tabs** simultaneously:
1. Tab 1 → `http://localhost:PORT/animator/` → Click **LAUNCH GAME** → copy the Session ID.
2. Tab 2 → `http://localhost:PORT/left/` → Paste Session ID → **CONNECT**.
3. Tab 3 → `http://localhost:PORT/right/` → Paste Session ID → **CONNECT**.

> 💡 PeerJS uses the internet to establish peer-to-peer connections even on localhost. You need an internet connection.

---

## 🚀 Deploy to GitHub

### Step 1 — Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Name it `flashlight-quiz` (or any name you prefer).
3. Set to **Public**, click **Create repository**.

### Step 2 — Push your code
```bash
# In the QUIZZAPP folder:
git init
git add .
git commit -m "Initial commit: Flashlight Quiz App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/flashlight-quiz.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages (optional)
1. Go to your repo → **Settings** → **Pages**.
2. Source: **Deploy from a branch** → Branch: `main`, folder: `/ (root)`.
3. Your app will be live at `https://YOUR_USERNAME.github.io/flashlight-quiz/`.

---

## ☁️ Deploy to Vercel (Recommended)

Vercel gives you a cleaner URL and auto-deploys on every push.

### Method A — Via Vercel Website (no CLI needed)
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New → Project**.
3. Import your `flashlight-quiz` repository.
4. **Framework Preset**: select **Other** (it's a static site).
5. **Root Directory**: leave as `/`.
6. Click **Deploy** → done! ✅

Your app will be at `https://flashlight-quiz.vercel.app` (or similar).

### Method B — Via Vercel CLI
```bash
npm install -g vercel
vercel login
# In the QUIZZAPP folder:
vercel
```
Follow the prompts and choose default settings. Your URL will be shown at the end.

### After Deploying
Share these URLs with your teams:
| Screen | URL |
|--------|-----|
| Lobby | `https://your-app.vercel.app/` |
| Animator | `https://your-app.vercel.app/animator/` |
| Team Left | `https://your-app.vercel.app/left/` |
| Team Right | `https://your-app.vercel.app/right/` |

---

## 📡 PeerJS Notes

This app uses [PeerJS](https://peerjs.com/) for real-time peer-to-peer communication without a backend.

- **Session IDs** are randomly generated each time the Animator clicks LAUNCH GAME. This prevents conflicts on the PeerJS cloud server.
- All teams must enter the **exact Session ID** shown on the Animator screen.
- PeerJS requires an **internet connection** even when testing on localhost (it uses a cloud signaling server).
- If PeerJS cloud is unavailable, you can [self-host a PeerJS server](https://github.com/peers/peerjs-server) and change the `host`/`port` settings in `js/animator.js` and `js/player.js`.

---

## 🎨 Customization

### Change the number of seconds per question
In `js/animator.js`, find:
```js
const TIMER_DURATION = 15;
```
Change `15` to any value you want.

### Change team colors
In `css/styles.css`, update:
```css
--color-left:  #EF4444;  /* Team Left color (default: red) */
--color-right: #3B82F6;  /* Team Right color (default: blue) */
--color-gold:  #FFD700;  /* Brand accent color */
```

### Change the club name / branding
Update the title text "FLASHLIGHT" in each HTML file's `<title>` tag and the `.brand-title` element.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure |
| Vanilla CSS | Styling, animations |
| Vanilla JavaScript (ES6+) | Game logic |
| [PeerJS 1.5.4](https://peerjs.com/) | Real-time P2P communication |
| Web Audio API | Buzzer sounds (no files needed) |
| Google Fonts | Inter + Bebas Neue typography |

**No build step. No framework. No dependencies to install.**

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| Teams can't connect | Make sure the Session ID is copied exactly (no extra spaces) |
| "Could not load questions.json" | Use a local server (not `file://`). See *Run Locally* section |
| PeerJS peer ID error | Refresh the Animator page to generate a new Session ID |
| No sound on buzz | Click anywhere on the page first (browser requires user gesture for audio) |
| Timer out of sync | The Animator is the master clock — refresh all team pages and reconnect |

---

*Built with ❤️ for the Flashlight University English Club.*
>>>>>>> 465bb99 (Initial commit)
