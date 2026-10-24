# 🚇 Metro Runner Dhaka (ঢাকা মেট্রোরেল রানার)

A high-performance 3D endless runner game inspired by Subway Surfers, set along the elevated viaducts of the **Dhaka Metro Rail (MRT Line-6)** in Dhaka, Bangladesh.

Built entirely with pure HTML5, CSS3, Three.js, and MediaPipe Hands — with **zero backend**, **no paid APIs**, and **no external 3D model or image asset dependencies** (everything is procedurally generated in code).

---

## 🎮 How to Run

You can launch and play the game in two simple ways:

### Option 1: Direct File Launch
Simply double-click [`index.html`](file:///c:/Users/irfan/Downloads/hand-gesture%20game/index.html) in your file manager to open it directly in Google Chrome, Microsoft Edge, Brave, or any modern WebGL-capable browser.

### Option 2: Local Static Server (Recommended for Camera Permissions)
Some browsers restrict webcam access when opening pages via `file://` protocol. Running a lightweight static server ensures full camera gesture functionality:

```bash
# Using Python 3:
python -m http.server 8000

# Or using Node.js:
npx serve .
```
Then navigate to: **`http://localhost:8000`** in Chrome or Edge.

---

## 🕹️ Controls

The game supports two control modes that run **simultaneously**:

### A) Keyboard Controls
| Action | Primary Keys | Alternative Keys |
| :--- | :--- | :--- |
| **Move Left** | `A` | `←` (Left Arrow) |
| **Move Right** | `D` | `→` (Right Arrow) |
| **Jump** (over low barriers) | `W` or `Space` | `↑` (Up Arrow) |
| **Slide / Duck** (under gantries) | `S` | `↓` (Down Arrow) |
| **Pause / Resume** | `P` | `Escape` |

### B) Camera Hand-Gesture Control (The Twist)
Play completely hands-free using your webcam and **MediaPipe Hands**:
1. Click the **`📷` Camera button** in the top-right HUD or on the start screen.
2. Allow webcam access when prompted by the browser.
3. Face your palm toward the camera and make a **fist** to arm gesture controls. This prevents an open hand from triggering an action when the camera starts.
4. Keep your thumb folded and show the required number of fingers:

| Finger pose | Action |
| :--- | :--- |
| 1 finger | Move right |
| 2 fingers | Move left |
| 3 fingers | Jump |
| 4 fingers | Slide |

Return to a fist between repeated gestures. Keyboard controls continue to work alongside the camera.

### Camera Practice (Safe Demo)
Choose **"Practice Gesture Demo"** on the start screen, or tap the 🎮 button in the HUD. The practice screen shows live camera tracking and gesture feedback without obstacles, scoring, or game-over. Make a fist to ready, then try the 1–4 finger poses. Use **Menu** to return, or **Start Game** to begin a run.

> [!NOTE]
> Keyboard inputs remain active even when Camera Mode is ON. If your hand moves out of frame or the camera is unavailable, keyboard control seamlessly continues with zero interruption.

---

## 🧠 How the Gesture Control Works

The gesture recognizer uses MediaPipe Hands Lite (`modelComplexity: 0`) with a 256 × 192 single-hand camera stream, throttled to approximately 20 inference frames per second. It counts the four non-thumb fingers using each fingertip's distance from the wrist compared with its middle joint. A fist arms the controller; each finger pose triggers only once until the hand returns to a fist. Camera-on gameplay reduces render resolution, disables real-time shadows, and serializes inference frames to avoid processing backlogs.

---

## ⚙️ How to Tune `CONFIG` Values

All tunable parameters are cleanly consolidated at the top of [`script.js`](file:///c:/Users/irfan/Downloads/hand-gesture%20game/script.js#L14-L65):

```javascript
const CONFIG = {
  // Track Geometry
  LANE_WIDTH: 2.5,                // Width between lane centers (meters)
  LANES: [2.5, 0, -2.5],          // Left (-1), Middle (0), Right (+1)
  START_SPEED: 24.0,              // Initial forward speed (m/s)
  MAX_SPEED: 56.0,                // Maximum speed cap (m/s)
  SPEED_ACCELERATION: 0.0018,     // Speed gain per second (~+2% every 10s)
  LANE_CHANGE_SPEED: 14.0,        // Lane transition smoothness/speed

  // Physics
  JUMP_FORCE: 14.8,               // Upward velocity impulse
  GRAVITY: 38.0,                  // Gravity acceleration
  SLIDE_DURATION: 0.85,           // Duration of slide ducking (seconds)

  // Spawner & Difficulty
  MIN_OBSTACLE_SPAWN_DIST: 32.0,  // Minimum spacing between obstacle rows
  MAX_OBSTACLE_SPAWN_DIST: 52.0,  // Maximum spacing between obstacle rows
  TRAIN_SPEED_RELATIVE: 18.0,     // Speed of oncoming Dhaka MRT trains

  // Hand Gestures
  GESTURE_COOLDOWN_MS: 220,       // Minimum time between finger-pose actions
  MEDIAPIPE_INTERVAL_MS: 50       // Inference throttle (about 20 FPS)
};
```

---

## 🚉 Dhaka Metro Rail (MRT Line-6) Theme Features

- **Bangladeshi Lungi Runner (লুঙ্গি পরা বাঙালি রানার)**: An authentic local runner character featuring a traditional plaid check **Lungi** folded up above the knees (*কাছা মারা স্টাইল*), complete with a rolled waist band and front knot (*গিঁট*), an iconic red-and-white checked **Gamcha (গামছা)** fluttering dynamically over his shoulder, a crisp white cotton **Fatua (ফতুয়া)** with coconut buttons, a proud Bangladeshi **Mustache (গোঁফ)**, and classic blue-and-white **Sponge Sandals (বাটা স্পঞ্জ চটি)**!
- **Elevated Viaduct**: Realistic precast concrete viaduct deck, concrete piers supporting the track high above Dhaka, side safety parapets, steel rails, sleepers, and overhead catenary wire masts.
- **Dhaka MRT Trains**: Authentic Kawasaki/Mitsubishi MRT Line-6 livery with white body, emerald green belt stripe (`#006A4E`), crimson red band (`#F42A41`), glowing twin LED headlights, passenger windows, and aerodynamic nose cab.
- **Station Landmarks**: Sequence of actual stations along the MRT Line-6 (from Uttara North to Motijheel & Kamalapur). Passing each station triggers an overhead arch, Bengali + English HUD banner, and an authentic 4-tone melodic metro chime!
- **Sound Effects**: Synthesized entirely via the HTML5 Web Audio API — coin sparkles, jump whooshes, rail slides, train horns, and crash thuds. No external audio files required.

---

## ⚠️ Known Limitations

1. **Browser Camera Security**: Modern browsers (Chrome, Edge) require a secure origin (`http://localhost` or `https://`) to grant webcam access. Opening via `file://` may disable the webcam in some strict browser configurations.
2. **Lighting Sensitivity**: MediaPipe hand detection relies on decent room lighting and high contrast between the hand and background. Very dim environments may cause tracking dropouts.
3. **Single Hand Tracking**: The gesture tracker targets one primary hand. If two hands are held in frame simultaneously, the tracker locks onto the first detected hand.

---

## 🚀 3 Ideas for Future Improvement

1. **Dhaka MRT Power-Ups**:
   - **"Rapid Pass / র‍্যাপিড পাস"**: Temporary invincibility shield that blasts through barricades.
   - **"Coin Magnet / ম্যাগনেট"**: Automatically pulls all nearby ৳ Taka coins across all 3 lanes.
   - **"2X Multiplier / দ্বিগুণ স্কোর"**: Doubles score and coin count for 15 seconds.
2. **Day / Night & Weather Cycle**:
   - Dynamic transition from Dhaka daytime tropical sunshine to monsoon rain (with track reflections and raindrops) to Dhaka nighttime skyline with glowing neon billboards and train interior cabin lights.
3. **Mobile & Tablet Touch Controls**:
   - On-screen swipe gestures (Swipe Left/Right to change lanes, Swipe Up to jump, Swipe Down to slide) with gyroscope/accelerometer steering support for mobile browsers.
