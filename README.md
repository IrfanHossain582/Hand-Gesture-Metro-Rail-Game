# 🚇 Metro Runner Dhaka (ঢাকা মেট্রোরেল রানার)

A high-performance 3D endless runner game inspired by Subway Surfers, set along the elevated viaducts of the **Dhaka Metro Rail (MRT Line-6)** in Dhaka, Bangladesh.

Built entirely with pure HTML5, CSS3, Three.js, and MediaPipe Hands — with **zero backend**, **no paid APIs**, and **no external 3D model or image asset dependencies** (everything is procedurally generated in code).

---

## 🎮 How to Deploy and Play

The game is a static site: it needs no build step, server, or backend. For camera access on phones and desktops, deploy it on an HTTPS host such as Vercel.

### Deploy on Vercel
1. Import this GitHub repository in Vercel.
2. Choose **Other** as the framework preset.
3. Leave the build command and output directory empty (the project root contains `index.html`).
4. Deploy. Vercel serves the files over HTTPS, which allows browsers to request camera permission.

No `vercel.json` is required: all assets are relative static files and the game has no client-side routes.

For local development, use any static file server. Camera permissions may be restricted on `file://` pages; use HTTPS or a browser's trusted localhost origin when testing the camera locally.

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

### B) Touch Controls
On phones and tablets, swipe on the game screen:

| Swipe | Action |
| :--- | :--- |
| Left / right | Change lane |
| Up | Jump |
| Down | Slide |

The mobile HUD displays a **Swipe to play** hint. Touch input, keyboard input, and camera gestures can be used together. The play surface blocks page scrolling and zoom gestures to avoid interrupting a run.

### Power-Ups
Collect floating lane pickups to activate them automatically. One major power-up can run at once; **Score x2** can overlap any major effect.

| Pickup | Effect |
| :--- | :--- |
| Fly | Fly above hazards for 8 seconds, collect elevated coin trails, then land in a cleared zone |
| Super Speed | Dash for 6 seconds with a speed bonus and invulnerability, then ease back to normal speed |
| Coin Magnet | Pull nearby coins from all lanes for 10 seconds |
| Shield | Absorb one collision, or keep the shield for up to 12 seconds |
| Score x2 | Double distance and coin points for 15 seconds |

Power-ups are spawned about every 20–30 seconds and their remaining time is shown in the HUD.

### Settings and performance
Open **⚙️ Settings** for sound, graphics quality (**Auto / Low / High**) and a preferred input label. The preferred input does not disable the other controls: keyboard, swipe and camera gestures remain usable together. Auto quality lowers rendering detail after FPS stays below 40 for 3 seconds and restores it after performance stays above 52 FPS for 8 seconds. Camera mode separately reduces rendering cost. Haptics are optional and only run on devices that support `navigator.vibrate`.

### C) Camera Hand-Gesture Control (The Twist)
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

All tunable parameters are cleanly consolidated at the top of [`script.js`](./script.js):

```javascript
const CONFIG = {
  DAY_CYCLE_DISTANCE: 4200.0,       // Distance for a complete morning-to-night cycle
  TRAFFIC_LENGTH: 350.0,            // Recycled street traffic loop length
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
  OBSTACLE_SPAWN_LOOKAHEAD: 220.0,// Spawn hazards far enough ahead for a fair reaction
  TRAIN_WARNING_TIME: 3.0,        // Train horn and lane warning lead time in seconds
  TRAIN_MIN_GAP_SECONDS: 1.5,     // Minimum spacing between train encounters
  POWERUPS: {
    SPAWN_MIN_SECONDS: 20, SPAWN_MAX_SECONDS: 30,
    FLY_DURATION: 8, DASH_DURATION: 6, MAGNET_DURATION: 10,
    SHIELD_DURATION: 12, SCORE_X2_DURATION: 15
  },
  QUALITY_FPS_THRESHOLD: 40,       // Lower Auto quality after sustained low FPS
  QUALITY_FPS_DROP_SECONDS: 3,
  GAMEOVER_SLOWMO_SECONDS: 0.65,
  HAPTICS_ENABLED: true,

  // Hand Gestures & Touch
  GESTURE_COOLDOWN_MS: 220,       // Minimum time between finger-pose actions
  MEDIAPIPE_INTERVAL_MS: 50,      // Inference throttle (about 20 FPS)
  SWIPE_MIN_DISTANCE_PX: 48,       // Minimum swipe distance for a normal swipe
  SWIPE_FAST_DISTANCE_PX: 30,     // Minimum distance for a quick swipe
  SWIPE_FAST_DURATION_MS: 220     // Time limit for a quick swipe
};
```

The CDN versions for Three.js and MediaPipe are pinned in the game sources; the MediaPipe model files use the matching pinned package version. Keep versions exact when updating these dependencies so deployed builds remain reproducible.

---

## 🚉 Dhaka Metro Rail (MRT Line-6) Theme Features

- **Bangladeshi Lungi Runner (লুঙ্গি পরা বাঙালি রানার)**: An authentic local runner character featuring a traditional plaid check **Lungi** folded up above the knees (*কাছা মারা স্টাইল*), complete with a rolled waist band and front knot (*গিঁট*), an iconic red-and-white checked **Gamcha (গামছা)** fluttering dynamically over his shoulder, a crisp white cotton **Fatua (ফতুয়া)** with coconut buttons, a proud Bangladeshi **Mustache (গোঁফ)**, and classic blue-and-white **Sponge Sandals (বাটা স্পঞ্জ চটি)**!
- **Elevated Viaduct**: Realistic precast concrete viaduct deck, concrete piers supporting the track high above Dhaka, side safety parapets, steel rails, sleepers, and overhead catenary wire masts.
- **Procedural Dhaka Skyline**: Recycled apartments and offices use generated facade textures with balconies, AC units, varied wall colours, window grids and lit windows. Mosques, construction cranes, moving instanced street traffic, trees, clouds and station platforms add local detail without external image assets.
- **Progression Lighting**: A distance-driven morning, sunset and night cycle adjusts the sky, fog, building windows and lights as the run continues.
- **Fair Train Warnings**: Train encounters are scheduled against obstacle rows, receive lane-specific visual warnings and a horn, leave clear recovery windows, and are spaced using current speed.
- **Dhaka MRT Trains**: Authentic Kawasaki/Mitsubishi MRT Line-6 livery with white body, emerald green belt stripe (`#006A4E`), crimson red band (`#F42A41`), glowing twin LED headlights, passenger windows, and aerodynamic nose cab.
- **Station Landmarks**: Sequence of actual stations along the MRT Line-6 (from Uttara North to Motijheel & Kamalapur). Passing each station triggers an overhead arch, Bengali + English HUD banner, and an authentic 4-tone melodic metro chime!
- **Sound Effects**: Synthesized entirely via the HTML5 Web Audio API — coin sparkles, jump whooshes, rail slides, train horns, and crash thuds. No external audio files required.

---

## ⚠️ Known Limitations

1. **Browser Camera Security**: Camera access requires HTTPS in production. Opening via `file://` may disable the webcam; use a trusted development origin only for local testing.
2. **Lighting Sensitivity**: MediaPipe hand detection relies on decent room lighting and high contrast between the hand and background. Very dim environments may cause tracking dropouts.
3. **Single Hand Tracking**: The gesture tracker targets one primary hand. If two hands are held in frame simultaneously, the tracker locks onto the first detected hand.

---

## ✅ Release Test Checklist

- [ ] Desktop keyboard: lane changes, jump, slide, pause/resume, settings and score sharing.
- [ ] Desktop camera over HTTPS: permission prompt, fist-to-ready and all four finger gestures.
- [ ] Android Chrome: portrait/landscape resize, swipe controls, large buttons and background pause.
- [ ] iPhone Safari: camera permission, safe-area layout, swipe controls and orientation change.
- [ ] Vercel: verify the deployed HTTPS URL loads, pinned CDN assets resolve and camera mode starts.

Physical Android/iPhone devices and the deployed Vercel URL must be checked on the target devices; automated local browser checks cannot certify those environments.
