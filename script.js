/**
 * ===================================================================
 * METRO RUNNER DHAKA - CORE GAME ENGINE
 * Dhaka Metro Rail (MRT Line-6) 3D Endless Runner
 * Three.js + MediaPipe Hands Webcam Gesture Control
 * ===================================================================
 */

'use strict';

// ===================================================================
// 1. CONFIGURATION & TUNABLE PARAMETERS
// ===================================================================
const CONFIG = {
  // Track & Lane Geometry
  LANE_WIDTH: 2.5,                  // Distance between lane centers (meters)
  LANES: [2.5, 0, -2.5],            // Left (-1), Middle (0), Right (+1) (looking down +Z, +X is Left on screen)
  TRACK_SEGMENT_LENGTH: 50.0,       // Length of each pooled viaduct segment
  VISIBLE_TRACK_SEGMENTS: 7,        // Number of continuous track chunks rendered
  VIADUCT_ELEVATION: 6.0,           // Height of tracks above street level

  // Speeds & Acceleration
  START_SPEED: 24.0,                // Initial forward speed (m/s)
  MAX_SPEED: 56.0,                  // Maximum forward speed cap (m/s)
  SPEED_ACCELERATION: 0.0018,       // Gradual acceleration rate per second (~+2% per 10s)
  LANE_CHANGE_SPEED: 14.0,          // Interpolation speed for lane changing
  TRAIN_SPEED_RELATIVE: 18.0,       // Oncoming speed of Dhaka MRT trains (m/s)

  // Player Physics & Timers
  JUMP_FORCE: 14.8,                 // Initial upward velocity
  GRAVITY: 38.0,                    // Downward gravitational acceleration
  SLIDE_DURATION: 0.85,             // Duration of slide crouch in seconds
  PLAYER_NORMAL_HEIGHT: 1.7,        // Standing collision height
  PLAYER_SLIDE_HEIGHT: 0.75,        // Crouched collision height
  PLAYER_WIDTH: 0.8,                // Hitbox width

  // Scoring
  COIN_POINTS: 10,                  // Points per collected ৳ Taka coin
  DISTANCE_SCORE_MULTIPLIER: 1.0,   // Score gained per meter traveled

  // Procedural Spawner
  MIN_OBSTACLE_SPAWN_DIST: 32.0,    // Minimum distance between obstacle rows
  MAX_OBSTACLE_SPAWN_DIST: 52.0,    // Maximum distance between obstacle rows
  DESPAWN_Z_OFFSET: -15.0,          // Distance behind camera before recycling

  // Hand Gesture Control (MediaPipe)
  GESTURE_COOLDOWN_MS: 220,         // Prevent accidental retriggers while changing finger poses
  MEDIAPIPE_INTERVAL_MS: 50,        // MediaPipe runs at ~20 FPS to free CPU for game

  // Visual Colors (MRT Line-6 Theme)
  COLORS: {
    MRT_GREEN: 0x006a4e,            // DMTCL Official Emerald Green
    MRT_RED: 0xf42a41,              // Bangladesh Crimson Red
    MRT_WHITE: 0xf8fafc,            // Train Body Pristine White
    MRT_DARK: 0x1e293b,             // Chassis & Rail Dark Slate
    CONCRETE: 0x475569,             // Viaduct Deck & Piers
    RAIL_STEEL: 0xcfd8dc,           // Steel Rails
    COIN_GOLD: 0xffb703,            // Dhaka Taka Coin Gold
    SKY_TOP: 0x0ea5e9,              // Tropical Dhaka Sky Blue
    SKY_BOTTOM: 0xf0fdf4            // Horizon Mist
  }
};

// Dhaka MRT Line-6 Stations (in sequence along the line)
const STATIONS = [
  { bn: "উত্তরা উত্তর", en: "Uttara North", dist: 0 },
  { bn: "উত্তরা সেন্টার", en: "Uttara Center", dist: 350 },
  { bn: "উত্তরা দক্ষিণ", en: "Uttara South", dist: 750 },
  { bn: "পল্লবী", en: "Pallabi", dist: 1200 },
  { bn: "মিরপুর ১১", en: "Mirpur 11", dist: 1650 },
  { bn: "মিরপুর ১০", en: "Mirpur 10", dist: 2100 },
  { bn: "কাজীপাড়া", en: "Kazipara", dist: 2600 },
  { bn: "শেওড়াপাড়া", en: "Shewrapara", dist: 3100 },
  { bn: "আগারগাঁও", en: "Agargaon", dist: 3650 },
  { bn: "বিজয় সরণি", en: "Bijoy Sarani", dist: 4200 },
  { bn: "ফার্মগেট", en: "Farmgate", dist: 4800 },
  { bn: "কারওয়ান বাজার", en: "Karwan Bazar", dist: 5400 },
  { bn: "শাহবাগ", en: "Shahbagh", dist: 6050 },
  { bn: "ঢাকা বিশ্ববিদ্যালয়", en: "Dhaka University", dist: 6700 },
  { bn: "বাংলাদেশ সচিবালয়", en: "Secretariat", dist: 7400 },
  { bn: "মতিঝিল", en: "Motijheel", dist: 8100 },
  { bn: "কমলাপুর", en: "Kamalapur", dist: 8900 }
];


// ===================================================================
// 2. PROCEDURAL WEB AUDIO SYNTHESIZER
// ===================================================================
class AudioController {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  playCoin() {
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    
    // Crisp two-tone chime (F#6 -> B6)
    const osc1 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1479.98, now); // F#6
    osc1.frequency.exponentialRampToValueAtTime(1975.53, now + 0.08); // B6
    
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    
    osc1.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.28);
  }

  playJump() {
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.18);
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playSlide() {
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    
    // Whoosh friction sound with filtered buffer
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * (i / bufferSize));
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.25);
    filter.Q.value = 2.0;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start(now);
  }

  playTrainHorn() {
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    
    // Dual pneumatic train horn chord: F4 (349Hz) + A#4 (466Hz)
    [349.23, 466.16].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.7);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.75);
    });
  }

  playStationChime() {
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    
    // 4-tone melodic Dhaka Metro announcement chime: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const startTime = now + i * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.48);
    });
  }

  playCrash() {
    if (this.isMuted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    
    // Low bass impact thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);

    // Impact noise burst
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-4 * (i / bufferSize));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);
  }
}


// ===================================================================
// 3. PROCEDURAL PROCEDURAL ASSET GENERATOR (Three.js Shapes & Textures)
// ===================================================================
class AssetGenerator {
  // Generate Authentic Bangladeshi Lungi Plaid Check Canvas Texture (ঐতিহ্যবাহী লুঙ্গি চেক)
  static createLungiTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Deep Indigo / Teal base fabric color
    ctx.fillStyle = '#0f3a5d';
    ctx.fillRect(0, 0, 256, 256);

    // Traditional Tartan Lungi Plaid Checks
    // Emerald green wide bands
    ctx.fillStyle = 'rgba(5, 150, 105, 0.5)';
    for (let x = 0; x < 256; x += 32) {
      ctx.fillRect(x, 0, 14, 256);
      ctx.fillRect(0, x, 256, 14);
    }

    // Sky blue accent stripes
    ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
    for (let x = 8; x < 256; x += 32) {
      ctx.fillRect(x, 0, 4, 256);
      ctx.fillRect(0, x, 256, 4);
    }

    // Crimson red fine pinstripes
    ctx.fillStyle = 'rgba(244, 42, 65, 0.7)';
    for (let x = 20; x < 256; x += 32) {
      ctx.fillRect(x, 0, 3, 256);
      ctx.fillRect(0, x, 256, 3);
    }

    // Crisp white woven gridlines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let x = 0; x < 256; x += 16) {
      ctx.fillRect(x, 0, 1.5, 256);
      ctx.fillRect(0, x, 256, 1.5);
    }

    // Traditional Ornamental Bottom Hem Border (লুঙ্গির পাড়)
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 230, 256, 26);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 232, 256, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 240, 256, 3);
    ctx.fillStyle = '#f42a41';
    ctx.fillRect(0, 246, 256, 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1.5);
    return texture;
  }

  // Generate Authentic Red-and-White Bengali Gamcha Plaid Canvas Texture (লাল-সাদা গামছা)
  static createGamchaTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Rich Bengali Red base
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 128, 128);

    // Iconic White Gamcha Grid Checks
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 128; i += 16) {
      ctx.fillRect(i, 0, 4, 128);
      ctx.fillRect(0, i, 128, 4);
    }

    // Fine dark crossing threads
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    for (let i = 8; i < 128; i += 16) {
      ctx.fillRect(i, 0, 1.5, 128);
      ctx.fillRect(0, i, 128, 1.5);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.5, 3);
    return texture;
  }

  // Generate Bengali Cotton Fatua / Shirt Canvas Texture (বাঙালি ফতুয়া)
  static createFatuaTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Clean cream/white cotton
    ctx.fillStyle = '#faf5ee';
    ctx.fillRect(0, 0, 128, 128);

    // Subtle fine fabric ribs
    ctx.fillStyle = '#e5e0d6';
    for (let y = 0; y < 128; y += 6) {
      ctx.fillRect(0, y, 128, 1);
    }

    // Front button placket in center with MRT green trim
    ctx.fillStyle = '#006a4e';
    ctx.fillRect(61, 0, 6, 82);

    // Coconut shell buttons
    ctx.fillStyle = '#78350f';
    [16, 38, 60].forEach(y => {
      ctx.beginPath();
      ctx.arc(64, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // Generate Dhaka Billboard procedural Canvas Texture
  static createBillboardTexture(titleBn, titleEn, themeColor = '#006a4e') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, themeColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 240);

    // Badge
    ctx.fillStyle = '#f42a41';
    ctx.beginPath();
    ctx.arc(60, 60, 24, 0, Math.PI * 2);
    ctx.fill();

    // Dhaka MRT / Brand Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(titleBn, 100, 72);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillText(titleEn, 100, 115);

    // Decorative graphical bars
    ctx.fillStyle = '#00a877';
    ctx.fillRect(50, 150, 412, 12);
    ctx.fillStyle = '#f42a41';
    ctx.fillRect(50, 170, 260, 8);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px "Outfit", sans-serif';
    ctx.fillText('DMTCL MRT LINE-6 • DHAKA', 50, 220);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  // Create Embossed Dhaka ৳ Taka Coin Canvas Texture
  static createCoinTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Golden gradient background
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.7, '#f59e0b');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.fill();

    // Rim
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Inner ring
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.stroke();

    // Embossed Bangla Taka Symbol "৳"
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 74px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('৳', 64, 68);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // Create Hazard Barrier Striped Canvas Texture
  static createHazardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#eab308'; // Warning yellow
    ctx.fillRect(0, 0, 128, 64);

    // Diagonal black hazard stripes
    ctx.fillStyle = '#18181b';
    for (let x = -64; x < 200; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 20, 0);
      ctx.lineTo(x - 10, 64);
      ctx.lineTo(x - 30, 64);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(4, 1);
    return texture;
  }

  // Build authentic Dhaka MRT Line-6 3D Train Mesh
  static createDhakaMetroTrainMesh() {
    const trainGroup = new THREE.Group();

    // 1. Aerodynamic Main Body
    const bodyGeo = new THREE.BoxGeometry(2.3, 2.6, 12.0);
    const bodyMat = new THREE.MeshLambertMaterial({ color: CONFIG.COLORS.MRT_WHITE });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.6;
    body.castShadow = true;
    trainGroup.add(body);

    // 2. Curved Aerodynamic Nose Cab
    const noseGeo = new THREE.BoxGeometry(2.26, 2.4, 2.2);
    const noseMat = new THREE.MeshLambertMaterial({ color: CONFIG.COLORS.MRT_WHITE });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 1.5, -6.8);
    nose.scale.set(0.96, 0.95, 1.0);
    trainGroup.add(nose);

    // 3. MRT Line-6 Signature Emerald Green Belt Stripe
    const stripeGeo = new THREE.BoxGeometry(2.34, 0.38, 14.2);
    const stripeMat = new THREE.MeshLambertMaterial({ color: CONFIG.COLORS.MRT_GREEN });
    const greenStripe = new THREE.Mesh(stripeGeo, stripeMat);
    greenStripe.position.set(0, 1.15, -0.6);
    trainGroup.add(greenStripe);

    // 4. Bangladesh Crimson Red Accent Stripe
    const redStripeGeo = new THREE.BoxGeometry(2.35, 0.14, 14.2);
    const redStripeMat = new THREE.MeshLambertMaterial({ color: CONFIG.COLORS.MRT_RED });
    const redStripe = new THREE.Mesh(redStripeGeo, redStripeMat);
    redStripe.position.set(0, 1.48, -0.6);
    trainGroup.add(redStripe);

    // 5. Dark Panoramic Windshield
    const windshieldGeo = new THREE.BoxGeometry(1.9, 1.0, 0.2);
    const windshieldMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const windshield = new THREE.Mesh(windshieldGeo, windshieldMat);
    windshield.position.set(0, 2.15, -7.9);
    trainGroup.add(windshield);

    // 6. Side Passenger Windows (with warm interior illumination)
    const winGeo = new THREE.BoxGeometry(2.36, 0.7, 1.4);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // warm window glow
    for (let z = -4.0; z <= 4.5; z += 2.2) {
      const windowMesh = new THREE.Mesh(winGeo, winMat);
      windowMesh.position.set(0, 2.1, z);
      trainGroup.add(windowMesh);
    }

    // 7. Twin Front LED Headlights (Glowing)
    const lightGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.2, 16);
    lightGeo.rotateX(Math.PI / 2);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    const leftLight = new THREE.Mesh(lightGeo, lightMat);
    leftLight.position.set(-0.65, 1.15, -7.9);
    trainGroup.add(leftLight);

    const rightLight = new THREE.Mesh(lightGeo, lightMat);
    rightLight.position.set(0.65, 1.15, -7.9);
    trainGroup.add(rightLight);

    // 8. Diamond Roof Pantograph & AC Pods
    const acGeo = new THREE.BoxGeometry(1.4, 0.35, 3.0);
    const acMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const acPod = new THREE.Mesh(acGeo, acMat);
    acPod.position.set(0, 3.05, 0);
    trainGroup.add(acPod);

    // Under-train dark chassis
    const chassisGeo = new THREE.BoxGeometry(2.1, 0.45, 13.0);
    const chassisMat = new THREE.MeshLambertMaterial({ color: 0x090d16 });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.set(0, 0.25, -0.5);
    trainGroup.add(chassis);

    return trainGroup;
  }

  // Build Low Barricade Mesh (Jumpable)
  static createBarricadeMesh(hazardTex) {
    const group = new THREE.Group();

    // Striped wooden/metal horizontal plank
    const plankGeo = new THREE.BoxGeometry(2.3, 0.65, 0.18);
    const plankMat = new THREE.MeshLambertMaterial({ map: hazardTex });
    const plank = new THREE.Mesh(plankGeo, plankMat);
    plank.position.set(0, 0.55, 0);
    plank.castShadow = true;
    group.add(plank);

    // Support legs
    const legGeo = new THREE.BoxGeometry(0.14, 0.85, 0.5);
    const legMat = new THREE.MeshLambertMaterial({ color: 0xef4444 }); // red legs
    
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.95, 0.42, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.95, 0.42, 0);
    group.add(rightLeg);

    // Flashing Amber Warning Beacon on top
    const beaconGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.22, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 0.98, 0);
    group.add(beacon);

    return group;
  }

  // Build Overhead Signal Gantry Mesh (Slideable)
  static createOverheadGantryMesh() {
    const group = new THREE.Group();

    // High overhead truss bar
    const barGeo = new THREE.BoxGeometry(2.4, 0.45, 0.35);
    const barMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(0, 2.35, 0);
    group.add(bar);

    // Warning clearance sign attached beneath
    const signGeo = new THREE.BoxGeometry(1.8, 0.35, 0.1);
    const signMat = new THREE.MeshBasicMaterial({ color: 0xd97706 }); // clearance yellow
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 1.95, 0);
    group.add(sign);

    // Side hanging support cables / vertical beams
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8);
    const postMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    
    const leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.set(-1.18, 1.25, 0);
    group.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.set(1.18, 1.25, 0);
    group.add(rightPost);

    // Red warning LED indicator in center
    const ledGeo = new THREE.SphereGeometry(0.1, 12, 12);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0, 1.95, 0.12);
    group.add(led);

    return group;
  }

  // Build 3D Golden Dhaka ৳ Taka Coin Mesh
  static createCoinMesh(coinTex) {
    const group = new THREE.Group();
    const radius = 0.45;
    const thickness = 0.12;

    const geo = new THREE.CylinderGeometry(radius, radius, thickness, 24);
    geo.rotateX(Math.PI / 2);

    // Side material (gold shiny)
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.25
    });

    // Face material (with Dhaka ৳ symbol)
    const faceMat = new THREE.MeshStandardMaterial({
      map: coinTex,
      metalness: 0.6,
      roughness: 0.3
    });

    const coin = new THREE.Mesh(geo, [sideMat, faceMat, faceMat]);
    coin.castShadow = true;
    group.add(coin);
    return group;
  }

  // Build Full Track & Viaduct Segment (Elevated Concrete Deck, Rails, Piers)
  static createViaductSegmentMesh(textures) {
    const segment = new THREE.Group();
    const len = CONFIG.TRACK_SEGMENT_LENGTH;
    const width = 9.2;

    // 1. Elevated Concrete Viaduct Deck
    const deckGeo = new THREE.BoxGeometry(width, 0.8, len);
    const deckMat = new THREE.MeshLambertMaterial({ color: CONFIG.COLORS.CONCRETE });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, -0.4, 0);
    deck.receiveShadow = true;
    segment.add(deck);

    // 2. Ballast Gravel Beds (under tracks)
    const ballastGeo = new THREE.BoxGeometry(width - 0.6, 0.12, len);
    const ballastMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const ballast = new THREE.Mesh(ballastGeo, ballastMat);
    ballast.position.set(0, 0.05, 0);
    segment.add(ballast);

    // 3. Side Parapet Safety Walls with MRT Green Reflector Bands
    const wallGeo = new THREE.BoxGeometry(0.35, 1.2, len);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x64748b });

    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-width / 2 + 0.18, 0.6, 0);
    segment.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.position.set(width / 2 - 0.18, 0.6, 0);
    segment.add(rightWall);

    // Green reflector stripe on walls
    const stripeGeo = new THREE.BoxGeometry(0.04, 0.22, len);
    const stripeMat = new THREE.MeshBasicMaterial({ color: CONFIG.COLORS.MRT_GREEN });
    
    const leftStripe = new THREE.Mesh(stripeGeo, stripeMat);
    leftStripe.position.set(-width / 2 + 0.38, 0.8, 0);
    segment.add(leftStripe);

    const rightStripe = new THREE.Mesh(stripeGeo, stripeMat);
    rightStripe.position.set(width / 2 - 0.38, 0.8, 0);
    segment.add(rightStripe);

    // 4. Steel Rails (2 for each of the 3 lanes = 6 rails)
    const railGeo = new THREE.BoxGeometry(0.08, 0.14, len);
    const railMat = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.RAIL_STEEL, metalness: 0.9, roughness: 0.2 });

    CONFIG.LANES.forEach(laneX => {
      const leftRail = new THREE.Mesh(railGeo, railMat);
      leftRail.position.set(laneX - 0.72, 0.16, 0);
      segment.add(leftRail);

      const rightRail = new THREE.Mesh(railGeo, railMat);
      rightRail.position.set(laneX + 0.72, 0.16, 0);
      segment.add(rightRail);
    });

    // 5. Cross Sleepers (Ties) placed along the track
    const sleeperGeo = new THREE.BoxGeometry(8.2, 0.1, 0.35);
    const sleeperMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const sleeperSpacing = 2.0;
    for (let z = -len / 2 + 1; z < len / 2; z += sleeperSpacing) {
      const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
      sleeper.position.set(0, 0.1, z);
      segment.add(sleeper);
    }

    // 6. Concrete T-Pillars underneath supporting the elevated viaduct
    const pierGeo = new THREE.BoxGeometry(2.0, CONFIG.VIADUCT_ELEVATION, 2.0);
    const pierMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    
    const pierCapGeo = new THREE.BoxGeometry(7.0, 1.2, 2.4);
    const pierCapMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

    [-len / 4, len / 4].forEach(zPos => {
      const cap = new THREE.Mesh(pierCapGeo, pierCapMat);
      cap.position.set(0, -1.0, zPos);
      segment.add(cap);

      const column = new THREE.Mesh(pierGeo, pierMat);
      column.position.set(0, -1.0 - CONFIG.VIADUCT_ELEVATION / 2, zPos);
      segment.add(column);
    });

    // 7. Overhead Catenary Electrification Masts
    const mastPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8);
    const mastArmGeo = new THREE.BoxGeometry(width + 0.4, 0.1, 0.1);
    const mastMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });

    [-len / 3, len / 3].forEach(zPos => {
      const leftPole = new THREE.Mesh(mastPoleGeo, mastMat);
      leftPole.position.set(-width / 2 - 0.1, 2.1, zPos);
      segment.add(leftPole);

      const rightPole = new THREE.Mesh(mastPoleGeo, mastMat);
      rightPole.position.set(width / 2 + 0.1, 2.1, zPos);
      segment.add(rightPole);

      const topArm = new THREE.Mesh(mastArmGeo, mastMat);
      topArm.position.set(0, 4.1, zPos);
      segment.add(topArm);
    });

    return segment;
  }

  // Build Overhead Station Arch Canopy
  static createStationArchMesh(stationNameBn, stationNameEn) {
    const group = new THREE.Group();

    // Portal arch spanning the 3 lanes
    const archGeo = new THREE.BoxGeometry(11.0, 1.4, 4.0);
    const archMat = new THREE.MeshLambertMaterial({ color: CONFIG.COLORS.MRT_GREEN });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(0, 5.0, 0);
    group.add(arch);

    // Support pillars on the side
    const pillarGeo = new THREE.BoxGeometry(1.2, 6.0, 3.8);
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });

    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-5.6, 2.5, 0);
    group.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(5.6, 2.5, 0);
    group.add(rightPillar);

    // Station Nameplate Board attached to arch
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#004d38';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stationNameBn, 256, 56);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillText(stationNameEn.toUpperCase(), 256, 96);

    const signTex = new THREE.CanvasTexture(canvas);
    const signGeo = new THREE.BoxGeometry(6.5, 1.2, 0.2);
    const signMat = new THREE.MeshBasicMaterial({ map: signTex });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 4.8, -2.1);
    group.add(sign);

    return group;
  }
}


// ===================================================================
// 4. BANGLADESHI LUNGI RUNNER CHARACTER (লুঙ্গি পরা বাঙালি রানার)
// ===================================================================
class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();

    // Logical state
    this.lane = 0;                  // -1 (Left), 0 (Middle), +1 (Right)
    this.targetX = 0;               // Target x-coordinate
    this.currentX = 0;              // Current smoothed x-coordinate
    this.y = 0;                     // Vertical elevation above rail deck
    this.vy = 0;                    // Vertical velocity
    this.isGrounded = true;
    this.isSliding = false;
    this.slideTimer = 0;
    this.runCycle = 0;              // For procedural leg/arm swinging

    this.hitbox = new THREE.Box3();

    // Procedural Bengali Textures
    this.lungiTex = AssetGenerator.createLungiTexture();
    this.gamchaTex = AssetGenerator.createGamchaTexture();
    this.fatuaTex = AssetGenerator.createFatuaTexture();

    this.buildCharacterMesh();
    this.scene.add(this.mesh);
  }

  buildCharacterMesh() {
    // Skin Tone: Warm South Asian / Bengali Complexion
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xc68652 });
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x171717 });
    const stacheMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // Clothing Materials
    const fatuaMat = new THREE.MeshLambertMaterial({ map: this.fatuaTex });
    const lungiMat = new THREE.MeshLambertMaterial({ map: this.lungiTex });
    const gamchaMat = new THREE.MeshLambertMaterial({ map: this.gamchaTex });

    // 1. Torso & Bengali Fatua (ফতুয়া)
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.y = 1.18;

    const torsoGeo = new THREE.BoxGeometry(0.66, 0.72, 0.38);
    this.torso = new THREE.Mesh(torsoGeo, fatuaMat);
    this.torso.castShadow = true;
    this.torsoGroup.add(this.torso);

    // Fatua Neck Trim (MRT green collar line)
    const collarGeo = new THREE.BoxGeometry(0.42, 0.08, 0.39);
    const collarMat = new THREE.MeshBasicMaterial({ color: CONFIG.COLORS.MRT_GREEN });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.34, 0);
    this.torsoGroup.add(collar);

    this.mesh.add(this.torsoGroup);

    // 2. The Iconic Bengali Gamcha (লাল-সাদা গামছা)
    // Gamcha draped comfortably around the neck and shoulder
    const gamchaNeckGeo = new THREE.BoxGeometry(0.54, 0.12, 0.44);
    const gamchaNeck = new THREE.Mesh(gamchaNeckGeo, gamchaMat);
    gamchaNeck.position.set(0, 1.54, 0.02);
    this.mesh.add(gamchaNeck);

    // Loose Gamcha tail fluttering in the air behind shoulder
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0.20, 1.52, -0.18);
    const gamchaTailGeo = new THREE.BoxGeometry(0.18, 0.54, 0.04);
    this.gamchaTail = new THREE.Mesh(gamchaTailGeo, gamchaMat);
    this.gamchaTail.position.y = -0.25;
    tailPivot.add(this.gamchaTail);
    this.gamchaTailPivot = tailPivot;
    this.mesh.add(tailPivot);

    // 3. Head, Stylish Hair & Authentic Dhaka Mustache (গোঁফ)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.76, 0);

    // Head Base
    const headGeo = new THREE.BoxGeometry(0.36, 0.38, 0.36);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.castShadow = true;
    this.headGroup.add(this.head);

    // Bengali Hairstyle (side-swept volume & back)
    const hairTopGeo = new THREE.BoxGeometry(0.40, 0.14, 0.38);
    const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
    hairTop.position.set(0, 0.18, -0.02);
    this.headGroup.add(hairTop);

    const hairBackGeo = new THREE.BoxGeometry(0.38, 0.28, 0.12);
    const hairBack = new THREE.Mesh(hairBackGeo, hairMat);
    hairBack.position.set(0, 0.02, 0.15);
    this.headGroup.add(hairBack);

    // Sideburns
    const sideburnGeo = new THREE.BoxGeometry(0.04, 0.16, 0.1);
    const leftBurn = new THREE.Mesh(sideburnGeo, hairMat);
    leftBurn.position.set(-0.19, 0.02, -0.04);
    const rightBurn = new THREE.Mesh(sideburnGeo, hairMat);
    rightBurn.position.set(0.19, 0.02, -0.04);
    this.headGroup.add(leftBurn);
    this.headGroup.add(rightBurn);

    // Expressive Eyes (Facing forward along +Z)
    const eyeWhiteGeo = new THREE.BoxGeometry(0.08, 0.05, 0.02);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilGeo = new THREE.BoxGeometry(0.04, 0.04, 0.03);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });

    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    leftEyeWhite.position.set(-0.10, 0.04, 0.185);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.10, 0.04, 0.19);
    this.headGroup.add(leftEyeWhite);
    this.headGroup.add(leftPupil);

    const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    rightEyeWhite.position.set(0.10, 0.04, 0.185);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.10, 0.04, 0.19);
    this.headGroup.add(rightEyeWhite);
    this.headGroup.add(rightPupil);

    // PROUD BANGLADESHI MUSTACHE (ঐতিহ্যবাহী বাঙালি গোঁফ)
    const stacheGeo = new THREE.BoxGeometry(0.24, 0.065, 0.06);
    const mustache = new THREE.Mesh(stacheGeo, stacheMat);
    mustache.position.set(0, -0.08, 0.19);
    this.headGroup.add(mustache);

    // Upturned mustache tips
    const stacheTipGeo = new THREE.BoxGeometry(0.06, 0.05, 0.05);
    const leftTip = new THREE.Mesh(stacheTipGeo, stacheMat);
    leftTip.position.set(-0.14, -0.06, 0.185);
    leftTip.rotation.z = -0.35;
    const rightTip = new THREE.Mesh(stacheTipGeo, stacheMat);
    rightTip.position.set(0.14, -0.06, 0.185);
    rightTip.rotation.z = 0.35;
    this.headGroup.add(leftTip);
    this.headGroup.add(rightTip);

    this.mesh.add(this.headGroup);

    // 4. THE AUTHENTIC BANGLADESHI LUNGI (ঐতিহ্যবাহী লুঙ্গি - কাছা মারা স্টাইল)
    this.lungiGroup = new THREE.Group();

    // Rolled Waist Tuck Band (লুঙ্গির কোমর)
    const waistGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.14, 16);
    const waist = new THREE.Mesh(waistGeo, lungiMat);
    waist.position.set(0, 0.88, 0);
    this.lungiGroup.add(waist);

    // Front Knot (লুঙ্গির গিঁট)
    const knotGeo = new THREE.SphereGeometry(0.08, 10, 8);
    const knot = new THREE.Mesh(knotGeo, lungiMat);
    knot.position.set(0, 0.89, 0.36);
    this.lungiGroup.add(knot);

    // Knee-Length Folded Lungi Skirt (কাছা মারা লুঙ্গি)
    const skirtGeo = new THREE.CylinderGeometry(0.36, 0.45, 0.48, 16, 1, true);
    this.lungiSkirt = new THREE.Mesh(skirtGeo, lungiMat);
    this.lungiSkirt.position.set(0, 0.64, 0);
    this.lungiGroup.add(this.lungiSkirt);

    // Front Pleated Fold (কোঁচানো ভাঁজ)
    const pleatGeo = new THREE.BoxGeometry(0.18, 0.46, 0.08);
    const pleat = new THREE.Mesh(pleatGeo, lungiMat);
    pleat.position.set(0, 0.64, 0.36);
    this.lungiGroup.add(pleat);

    this.mesh.add(this.lungiGroup);

    // 5. Arms & Rolled-up Sleeves
    // Left Arm (Shoulder Pivot)
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.44, 1.46, 0);

    const sleeveGeo = new THREE.BoxGeometry(0.20, 0.22, 0.20);
    const leftSleeve = new THREE.Mesh(sleeveGeo, fatuaMat);
    leftSleeve.position.y = -0.09;
    this.leftArmPivot.add(leftSleeve);

    const armGeo = new THREE.BoxGeometry(0.16, 0.42, 0.16);
    this.leftArm = new THREE.Mesh(armGeo, skinMat);
    this.leftArm.position.y = -0.32;
    this.leftArmPivot.add(this.leftArm);

    // Clenched fist
    const fistGeo = new THREE.BoxGeometry(0.18, 0.14, 0.16);
    const leftFist = new THREE.Mesh(fistGeo, skinMat);
    leftFist.position.y = -0.52;
    this.leftArmPivot.add(leftFist);

    this.mesh.add(this.leftArmPivot);

    // Right Arm (Shoulder Pivot)
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.44, 1.46, 0);

    const rightSleeve = new THREE.Mesh(sleeveGeo, fatuaMat);
    rightSleeve.position.y = -0.09;
    this.rightArmPivot.add(rightSleeve);

    this.rightArm = new THREE.Mesh(armGeo, skinMat);
    this.rightArm.position.y = -0.32;
    this.rightArmPivot.add(this.rightArm);

    const rightFist = new THREE.Mesh(fistGeo, skinMat);
    rightFist.position.y = -0.52;
    this.rightArmPivot.add(rightFist);

    this.mesh.add(this.rightArmPivot);

    // 6. Legs & Sponge Flip-Flops (স্পঞ্জ স্যান্ডেল / বাটা চটি)
    const calfGeo = new THREE.BoxGeometry(0.18, 0.52, 0.18);
    const sandalSoleGeo = new THREE.BoxGeometry(0.20, 0.05, 0.36);
    const sandalSoleMat = new THREE.MeshLambertMaterial({ color: 0xffffff }); // white foam sole
    const strapGeo = new THREE.BoxGeometry(0.21, 0.06, 0.16);
    const strapMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 }); // iconic blue rubber strap

    // Left Leg
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.18, 0.65, 0);

    this.leftCalf = new THREE.Mesh(calfGeo, skinMat);
    this.leftCalf.position.y = -0.26;
    this.leftLegPivot.add(this.leftCalf);

    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.30), skinMat);
    leftFoot.position.set(0, -0.52, 0.06);
    this.leftLegPivot.add(leftFoot);

    const leftSole = new THREE.Mesh(sandalSoleGeo, sandalSoleMat);
    leftSole.position.set(0, -0.57, 0.06);
    this.leftLegPivot.add(leftSole);

    const leftStrap = new THREE.Mesh(strapGeo, strapMat);
    leftStrap.position.set(0, -0.48, 0.08);
    this.leftLegPivot.add(leftStrap);

    this.mesh.add(this.leftLegPivot);

    // Right Leg
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.18, 0.65, 0);

    this.rightCalf = new THREE.Mesh(calfGeo, skinMat);
    this.rightCalf.position.y = -0.26;
    this.rightLegPivot.add(this.rightCalf);

    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.30), skinMat);
    rightFoot.position.set(0, -0.52, 0.06);
    this.rightLegPivot.add(rightFoot);

    const rightSole = new THREE.Mesh(sandalSoleGeo, sandalSoleMat);
    rightSole.position.set(0, -0.57, 0.06);
    this.rightLegPivot.add(rightSole);

    const rightStrap = new THREE.Mesh(strapGeo, strapMat);
    rightStrap.position.set(0, -0.48, 0.08);
    this.rightLegPivot.add(rightStrap);

    this.mesh.add(this.rightLegPivot);

    // 7. Dynamic Ground Shadow
    const shadowGeo = new THREE.CircleGeometry(0.60, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.position.y = 0.02;
    this.mesh.add(this.shadow);
  }

  moveLeft() {
    if (this.lane > -1) {
      this.lane--;
      this.targetX = CONFIG.LANES[this.lane + 1];
    }
  }

  moveRight() {
    if (this.lane < 1) {
      this.lane++;
      this.targetX = CONFIG.LANES[this.lane + 1];
    }
  }

  jump() {
    if (this.isGrounded) {
      this.vy = CONFIG.JUMP_FORCE;
      this.isGrounded = false;
      this.isSliding = false; // Cancel sliding if jumping
      return true;
    }
    return false;
  }

  slide() {
    if (this.isGrounded) {
      this.isSliding = true;
      this.slideTimer = CONFIG.SLIDE_DURATION;
      return true;
    } else {
      // Fast fall if sliding mid-air
      this.vy = -CONFIG.JUMP_FORCE * 1.2;
      return true;
    }
  }

  update(dt, forwardSpeed, playerZ) {
    // 1. Smooth Lane Transition (Damped Lerp)
    const dx = this.targetX - this.currentX;
    this.currentX += dx * Math.min(1.0, CONFIG.LANE_CHANGE_SPEED * dt);
    this.mesh.position.x = this.currentX;

    // Lean/Tilt character into turn
    this.mesh.rotation.z = -dx * 0.18;

    // 2. Vertical Jump Physics
    if (!this.isGrounded) {
      this.vy -= CONFIG.GRAVITY * dt;
      this.y += this.vy * dt;

      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.isGrounded = true;
      }
    }
    this.mesh.position.y = this.y;

    // Adjust shadow scale and opacity with altitude
    const shadowScale = Math.max(0.4, 1.0 - (this.y / 4.0));
    this.shadow.scale.set(shadowScale, shadowScale, 1.0);
    this.shadow.position.y = -this.y + 0.02; // Stays glued to tracks

    // 3. Sliding Timer & Stance
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // 4. Procedural Character Skeletal Animation
    if (this.isSliding) {
      // Crouch low / baseball slide posture
      this.mesh.scale.set(1.0, 0.48, 1.35);
      this.mesh.rotation.x = -0.4;
      this.leftArmPivot.rotation.x = 1.0;
      this.rightArmPivot.rotation.x = 1.0;
      this.leftLegPivot.rotation.x = -0.8;
      this.rightLegPivot.rotation.x = 0.5;
      if (this.lungiGroup) this.lungiGroup.rotation.y = 0;
      if (this.gamchaTailPivot) this.gamchaTailPivot.rotation.x = -0.6;
    } else if (!this.isGrounded) {
      // Mid-air Jump Posture (knees slightly bent, arms outward)
      this.mesh.scale.set(1.0, 1.0, 1.0);
      this.mesh.rotation.x = 0;
      this.leftArmPivot.rotation.x = -1.2;
      this.rightArmPivot.rotation.x = -1.2;
      this.leftLegPivot.rotation.x = 0.8;
      this.rightLegPivot.rotation.x = 0.5;
      if (this.lungiGroup) this.lungiGroup.rotation.y = 0;
      if (this.gamchaTailPivot) this.gamchaTailPivot.rotation.x = -0.8;
    } else {
      // Normal Running Animation (cycling arms and legs synced to forward speed)
      this.mesh.scale.set(1.0, 1.0, 1.0);
      this.mesh.rotation.x = 0;
      this.runCycle += dt * (forwardSpeed * 0.65);

      const armSwing = Math.sin(this.runCycle) * 0.9;
      const legSwing = Math.sin(this.runCycle) * 1.1;

      this.leftArmPivot.rotation.x = armSwing;
      this.rightArmPivot.rotation.x = -armSwing;

      this.leftLegPivot.rotation.x = -legSwing;
      this.rightLegPivot.rotation.x = legSwing;

      // Authentic Lungi Sway with running stride
      if (this.lungiGroup) {
        this.lungiGroup.rotation.y = Math.sin(this.runCycle) * 0.14;
        this.lungiGroup.rotation.z = Math.sin(this.runCycle) * 0.05;
      }

      // Authentic Gamcha Flutter in the wind!
      if (this.gamchaTailPivot) {
        this.gamchaTailPivot.rotation.x = -0.35 + Math.sin(this.runCycle * 2.2) * 0.22;
        this.gamchaTailPivot.rotation.z = Math.sin(this.runCycle) * 0.12;
      }

      // Subtle vertical running bob
      if (this.torsoGroup) {
        this.torsoGroup.position.y = 1.18 + Math.abs(Math.sin(this.runCycle * 2)) * 0.07;
      }
    }

    // 5. Update Collision Hitbox (in absolute world coordinates)
    const h = this.isSliding ? CONFIG.PLAYER_SLIDE_HEIGHT : CONFIG.PLAYER_NORMAL_HEIGHT;
    this.hitbox.min.set(this.currentX - 0.38, this.y, playerZ - 0.45);
    this.hitbox.max.set(this.currentX + 0.38, this.y + h, playerZ + 0.45);
  }

  reset() {
    this.lane = 0;
    this.targetX = 0;
    this.currentX = 0;
    this.y = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.isSliding = false;
    this.slideTimer = 0;
    this.runCycle = 0;
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.scale.set(1, 1, 1);
    if (this.lungiGroup) {
      this.lungiGroup.rotation.set(0, 0, 0);
    }
    if (this.gamchaTailPivot) {
      this.gamchaTailPivot.rotation.set(0, 0, 0);
    }
  }
}


// ===================================================================
// 5. WORLD, TRACKS & CITY SKYLINE MANAGER
// ===================================================================
class WorldManager {
  constructor(scene) {
    this.scene = scene;
    this.trackSegments = [];
    this.cityBuildings = [];
    this.billboards = [];
    this.stationArches = [];

    this.billboardTextures = [
      AssetGenerator.createBillboardTexture("ঢাকা মেট্রোরেল", "Dhaka Metro Rail Line-6", "#006a4e"),
      AssetGenerator.createBillboardTexture("স্মার্ট বাংলাদেশ", "Smart Bangladesh 2041", "#0284c7"),
      AssetGenerator.createBillboardTexture("ডিএমটিসিএল", "DMTCL - Mass Rapid Transit", "#004d38"),
      AssetGenerator.createBillboardTexture("রিকশা আর্ট উৎসব", "Dhaka Heritage & Culture", "#b91c1c")
    ];

    this.buildInitialWorld();
  }

  buildInitialWorld() {
    // 1. Initialize Continuous Track Segments
    for (let i = 0; i < CONFIG.VISIBLE_TRACK_SEGMENTS; i++) {
      const segment = AssetGenerator.createViaductSegmentMesh();
      const zPos = i * CONFIG.TRACK_SEGMENT_LENGTH;
      segment.position.set(0, 0, zPos);
      this.scene.add(segment);
      this.trackSegments.push(segment);
    }

    // 2. Initialize City Skyline Buildings (Left & Right sides)
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingColors = [0x1e293b, 0x334155, 0x475569, 0x0f172a, 0x1e3a5f];

    for (let i = 0; i < 40; i++) {
      const mat = new THREE.MeshLambertMaterial({
        color: buildingColors[Math.floor(Math.random() * buildingColors.length)]
      });
      const bldg = new THREE.Mesh(buildingGeo, mat);
      
      const isLeft = (i % 2 === 0);
      const x = isLeft ? -(16 + Math.random() * 22) : (16 + Math.random() * 22);
      const w = 10 + Math.random() * 12;
      const d = 10 + Math.random() * 14;
      const h = 18 + Math.random() * 38;
      const z = i * 15;

      bldg.scale.set(w, h, d);
      bldg.position.set(x, -CONFIG.VIADUCT_ELEVATION + h / 2 - 2, z);
      this.scene.add(bldg);
      this.cityBuildings.push(bldg);
    }

    // 3. Trackside Billboards
    for (let i = 0; i < 6; i++) {
      const tex = this.billboardTextures[i % this.billboardTextures.length];
      const bbGeo = new THREE.BoxGeometry(6.0, 3.0, 0.25);
      const bbMat = new THREE.MeshBasicMaterial({ map: tex });
      const bb = new THREE.Mesh(bbGeo, bbMat);

      const isLeft = (i % 2 === 0);
      bb.position.set(isLeft ? -7.2 : 7.2, 2.5, i * 60 + 30);
      bb.rotation.y = isLeft ? 0.25 : -0.25;
      this.scene.add(bb);
      this.billboards.push(bb);
    }
  }

  update(playerZ) {
    // 1. Recycle Track Segments ahead of player
    this.trackSegments.forEach(seg => {
      if (seg.position.z < playerZ + CONFIG.DESPAWN_Z_OFFSET) {
        // Find furthest track segment and place this one right after it
        let maxZ = -Infinity;
        this.trackSegments.forEach(s => { if (s.position.z > maxZ) maxZ = s.position.z; });
        seg.position.z = maxZ + CONFIG.TRACK_SEGMENT_LENGTH;
      }
    });

    // 2. Recycle City Buildings
    this.cityBuildings.forEach(bldg => {
      if (bldg.position.z < playerZ + CONFIG.DESPAWN_Z_OFFSET * 2) {
        let maxZ = -Infinity;
        this.cityBuildings.forEach(b => { if (b.position.z > maxZ) maxZ = b.position.z; });
        bldg.position.z = maxZ + 15 + Math.random() * 10;
      }
    });

    // 3. Recycle Billboards
    this.billboards.forEach(bb => {
      if (bb.position.z < playerZ + CONFIG.DESPAWN_Z_OFFSET) {
        let maxZ = -Infinity;
        this.billboards.forEach(b => { if (b.position.z > maxZ) maxZ = b.position.z; });
        bb.position.z = maxZ + 55 + Math.random() * 25;
      }
    });
  }

  spawnStationArch(stationNameBn, stationNameEn, zPos) {
    const arch = AssetGenerator.createStationArchMesh(stationNameBn, stationNameEn);
    arch.position.set(0, 0, zPos);
    this.scene.add(arch);
    this.stationArches.push(arch);
  }

  reset() {
    // Reposition track segments sequentially
    this.trackSegments.forEach((seg, i) => {
      seg.position.set(0, 0, i * CONFIG.TRACK_SEGMENT_LENGTH);
    });

    this.cityBuildings.forEach((bldg, i) => {
      const isLeft = (i % 2 === 0);
      const x = isLeft ? -(16 + Math.random() * 22) : (16 + Math.random() * 22);
      bldg.position.set(x, bldg.position.y, i * 15);
    });

    this.billboards.forEach((bb, i) => {
      const isLeft = (i % 2 === 0);
      bb.position.set(isLeft ? -7.2 : 7.2, 2.5, i * 60 + 30);
    });

    // Clean up station arches
    this.stationArches.forEach(arch => this.scene.remove(arch));
    this.stationArches = [];
  }
}


// ===================================================================
// 6. OBSTACLE & COIN MANAGER (Object Pooling & Fair Spawner)
// ===================================================================
class ObstacleManager {
  constructor(scene, audioCtrl) {
    this.scene = scene;
    this.audioCtrl = audioCtrl;

    this.hazardTex = AssetGenerator.createHazardTexture();
    this.coinTex = AssetGenerator.createCoinTexture();

    // Object Pools
    this.trains = [];
    this.barricades = [];
    this.gantries = [];
    this.coins = [];
    this.particles = [];

    this.nextSpawnZ = 45.0;          // Next distance along z to spawn obstacle row
    this.currentStationIndex = 0;

    this.initPools();
  }

  initPools() {
    // 1. Train Pool (3 oncoming Dhaka MRT trains)
    for (let i = 0; i < 3; i++) {
      const train = AssetGenerator.createDhakaMetroTrainMesh();
      train.visible = false;
      train.userData = {
        active: false,
        lane: 0,
        hitbox: new THREE.Box3(),
        hornPlayed: false
      };
      this.scene.add(train);
      this.trains.push(train);
    }

    // 2. Low Barricade Pool (10 jumpable barricades)
    for (let i = 0; i < 10; i++) {
      const bar = AssetGenerator.createBarricadeMesh(this.hazardTex);
      bar.visible = false;
      bar.userData = { active: false, hitbox: new THREE.Box3() };
      this.scene.add(bar);
      this.barricades.push(bar);
    }

    // 3. Overhead Gantry Pool (8 slideable gantries)
    for (let i = 0; i < 8; i++) {
      const gantry = AssetGenerator.createOverheadGantryMesh();
      gantry.visible = false;
      gantry.userData = { active: false, hitbox: new THREE.Box3() };
      this.scene.add(gantry);
      this.gantries.push(gantry);
    }

    // 4. Coin Pool (60 golden ৳ coins)
    for (let i = 0; i < 60; i++) {
      const coin = AssetGenerator.createCoinMesh(this.coinTex);
      coin.visible = false;
      coin.userData = { active: false, hitbox: new THREE.Box3() };
      this.scene.add(coin);
      this.coins.push(coin);
    }

    // 5. Coin Burst Particles
    const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (let i = 0; i < 30; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.visible = false;
      p.userData = { active: false, vx: 0, vy: 0, vz: 0, life: 0 };
      this.scene.add(p);
      this.particles.push(p);
    }
  }

  spawnCoin(x, y, z) {
    const coin = this.coins.find(c => !c.userData.active);
    if (!coin) return;

    coin.visible = true;
    coin.userData.active = true;
    coin.position.set(x, y, z);
    coin.userData.hitbox.setFromCenterAndSize(
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(0.9, 0.9, 0.9)
    );
  }

  spawnCoinRow(laneIndex, startZ, count = 5) {
    const x = CONFIG.LANES[laneIndex + 1];
    for (let i = 0; i < count; i++) {
      this.spawnCoin(x, 0.8, startZ + i * 2.8);
    }
  }

  spawnCoinArc(laneIndex, startZ, count = 6) {
    const x = CONFIG.LANES[laneIndex + 1];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const y = 0.8 + Math.sin(t * Math.PI) * 2.4; // Parabolic jump arc!
      this.spawnCoin(x, y, startZ + i * 2.4);
    }
  }

  spawnTrain(laneIndex, zPos) {
    const train = this.trains.find(t => !t.userData.active);
    if (!train) return;

    train.visible = true;
    train.userData.active = true;
    train.userData.lane = laneIndex;
    train.userData.hornPlayed = false;
    train.position.set(CONFIG.LANES[laneIndex + 1], 0, zPos);
  }

  spawnBarricade(laneIndex, zPos) {
    const bar = this.barricades.find(b => !b.userData.active);
    if (!bar) return;

    bar.visible = true;
    bar.userData.active = true;
    bar.position.set(CONFIG.LANES[laneIndex + 1], 0, zPos);
  }

  spawnOverheadGantry(laneIndex, zPos) {
    const gantry = this.gantries.find(g => !g.userData.active);
    if (!gantry) return;

    gantry.visible = true;
    gantry.userData.active = true;
    gantry.position.set(CONFIG.LANES[laneIndex + 1], 0, zPos);
  }

  triggerCoinBurst(pos) {
    let spawned = 0;
    this.particles.forEach(p => {
      if (!p.userData.active && spawned < 8) {
        p.visible = true;
        p.userData.active = true;
        p.position.copy(pos);
        p.userData.vx = (Math.random() - 0.5) * 6;
        p.userData.vy = 2.5 + Math.random() * 4;
        p.userData.vz = (Math.random() - 0.5) * 6;
        p.userData.life = 0.45;
        spawned++;
      }
    });
  }

  // GUARANTEED PASSABLE PROCEDURAL SPAWN PATTERNS
  generateFairObstaclePattern(spawnZ) {
    // Lane indices: -1 (Left), 0 (Middle), 1 (Right)
    const patternType = Math.floor(Math.random() * 6);

    switch (patternType) {
      case 0:
        // Pattern 0: Single oncoming Dhaka Metro train in 1 lane, coins in another
        {
          const trainLane = Math.floor(Math.random() * 3) - 1;
          this.spawnTrain(trainLane, spawnZ + 25);
          
          const coinLane = (trainLane + 1 > 1) ? -1 : trainLane + 1;
          this.spawnCoinRow(coinLane, spawnZ, 5);
        }
        break;

      case 1:
        // Pattern 1: Jumpable low barrier with Coin Arc above it!
        {
          const barrierLane = Math.floor(Math.random() * 3) - 1;
          this.spawnBarricade(barrierLane, spawnZ + 6);
          this.spawnCoinArc(barrierLane, spawnZ);

          // Other lane might have a slide gantry
          const otherLanes = [-1, 0, 1].filter(l => l !== barrierLane);
          const gantryLane = otherLanes[Math.floor(Math.random() * otherLanes.length)];
          this.spawnOverheadGantry(gantryLane, spawnZ + 6);
          // Third lane remains completely empty!
        }
        break;

      case 2:
        // Pattern 2: Train in 1 lane, jumpable barrier in 2nd lane, 3rd lane 100% safe
        {
          const safeLane = Math.floor(Math.random() * 3) - 1;
          const blockedLanes = [-1, 0, 1].filter(l => l !== safeLane);
          
          this.spawnTrain(blockedLanes[0], spawnZ + 25);
          this.spawnBarricade(blockedLanes[1], spawnZ + 6);
          this.spawnCoinRow(safeLane, spawnZ, 5);
        }
        break;

      case 3:
        // Pattern 3: Overhead gantry (slide) in 1 lane, coins in other
        {
          const gantryLane = Math.floor(Math.random() * 3) - 1;
          this.spawnOverheadGantry(gantryLane, spawnZ + 5);
          
          const freeLanes = [-1, 0, 1].filter(l => l !== gantryLane);
          this.spawnCoinRow(freeLanes[0], spawnZ, 4);
        }
        break;

      case 4:
        // Pattern 4: Two low barriers (jumpable), leaving one lane open
        {
          const openLane = Math.floor(Math.random() * 3) - 1;
          const barrierLanes = [-1, 0, 1].filter(l => l !== openLane);
          
          this.spawnBarricade(barrierLanes[0], spawnZ + 5);
          this.spawnBarricade(barrierLanes[1], spawnZ + 5);
          this.spawnCoinArc(barrierLanes[0], spawnZ);
          this.spawnCoinRow(openLane, spawnZ, 5);
        }
        break;

      case 5:
      default:
        // Pattern 5: Train on one side, slide overhead gantry on opposite, middle clear
        {
          this.spawnTrain(-1, spawnZ + 25);
          this.spawnOverheadGantry(1, spawnZ + 5);
          this.spawnCoinRow(0, spawnZ, 6);
        }
        break;
    }
  }

  update(dt, playerZ, currentSpeed, worldMgr, onStationReached) {
    // 1. Procedural Obstacle Row Spawning
    if (this.nextSpawnZ < playerZ + 110.0) {
      this.generateFairObstaclePattern(this.nextSpawnZ);
      
      // Dynamic spacing scaling slightly with speed
      const speedFactor = currentSpeed / CONFIG.START_SPEED;
      const interval = CONFIG.MIN_OBSTACLE_SPAWN_DIST * Math.min(1.4, speedFactor);
      this.nextSpawnZ += interval + Math.random() * 12.0;
    }

    // 2. Station Announcements Progression
    if (this.currentStationIndex < STATIONS.length) {
      const nextSt = STATIONS[this.currentStationIndex];
      if (playerZ >= nextSt.dist) {
        worldMgr.spawnStationArch(nextSt.bn, nextSt.en, nextSt.dist + 30);
        this.audioCtrl.playStationChime();
        if (onStationReached) onStationReached(nextSt);
        this.currentStationIndex++;
      }
    }

    // 3. Update Trains (Move forward towards player)
    this.trains.forEach(train => {
      if (!train.userData.active) return;

      // Oncoming train moves backward in z (towards player running forward in +z)
      train.position.z -= CONFIG.TRAIN_SPEED_RELATIVE * dt;

      // Play train horn when within proximity
      const dist = train.position.z - playerZ;
      if (!train.userData.hornPlayed && dist > 10 && dist < 45) {
        this.audioCtrl.playTrainHorn();
        train.userData.hornPlayed = true;
      }

      // Update Hitbox: Train nose is at -7.9, back at +6.0, center relative to position is z = -0.95
      train.userData.hitbox.setFromCenterAndSize(
        new THREE.Vector3(train.position.x, 1.45, train.position.z - 0.95),
        new THREE.Vector3(2.1, 2.7, 14.0)
      );

      // Despawn once well behind player
      if (train.position.z < playerZ + CONFIG.DESPAWN_Z_OFFSET) {
        train.visible = false;
        train.userData.active = false;
      }
    });

    // 4. Update Barricades
    this.barricades.forEach(bar => {
      if (!bar.userData.active) return;

      // Hitbox: Low barrier height is ~0.9m
      bar.userData.hitbox.setFromCenterAndSize(
        new THREE.Vector3(bar.position.x, 0.45, bar.position.z),
        new THREE.Vector3(2.2, 0.85, 0.4)
      );

      if (bar.position.z < playerZ + CONFIG.DESPAWN_Z_OFFSET) {
        bar.visible = false;
        bar.userData.active = false;
      }
    });

    // 5. Update Overhead Gantries
    this.gantries.forEach(gantry => {
      if (!gantry.userData.active) return;

      // Hitbox: Overhead gantry collision is from y = 1.1m to 3.0m (crouching ducks under!)
      gantry.userData.hitbox.setFromCenterAndSize(
        new THREE.Vector3(gantry.position.x, 2.05, gantry.position.z),
        new THREE.Vector3(2.2, 1.8, 0.5)
      );

      if (gantry.position.z < playerZ + CONFIG.DESPAWN_Z_OFFSET) {
        gantry.visible = false;
        gantry.userData.active = false;
      }
    });

    // 6. Update Coins (Spin animation & check despawn)
    this.coins.forEach(coin => {
      if (!coin.userData.active) return;

      coin.rotation.z += 3.5 * dt;

      if (coin.position.z < playerZ + CONFIG.DESPAWN_Z_OFFSET) {
        coin.visible = false;
        coin.userData.active = false;
      }
    });

    // 7. Update Particles
    this.particles.forEach(p => {
      if (!p.userData.active) return;

      p.userData.life -= dt;
      if (p.userData.life <= 0) {
        p.visible = false;
        p.userData.active = false;
      } else {
        p.position.x += p.userData.vx * dt;
        p.position.y += p.userData.vy * dt;
        p.position.z += p.userData.vz * dt;
        p.userData.vy -= 12 * dt; // gravity
        p.scale.multiplyScalar(0.94);
      }
    });
  }

  checkCollisions(player, onCoinCollected, onCrash) {
    const playerBox = player.hitbox;

    // 1. Coin Collection Check
    this.coins.forEach(coin => {
      if (coin.userData.active && playerBox.intersectsBox(coin.userData.hitbox)) {
        coin.visible = false;
        coin.userData.active = false;
        this.triggerCoinBurst(coin.position);
        this.audioCtrl.playCoin();
        onCoinCollected();
      }
    });

    // 2. Train Collision Check
    for (const train of this.trains) {
      if (train.userData.active && playerBox.intersectsBox(train.userData.hitbox)) {
        onCrash("মেট্রোরেলের সাথে মুখোমুখি ধাক্কা লেগেছে! / Head-on collision with Dhaka Metro train!");
        return true;
      }
    }

    // 3. Low Barricade Collision Check (Jump over)
    for (const bar of this.barricades) {
      if (bar.userData.active && playerBox.intersectsBox(bar.userData.hitbox)) {
        onCrash("ট্র্যাকের বাধার সাথে ধাক্কা লেগেছে! / Crashed into maintenance barrier! Jump next time.");
        return true;
      }
    }

    // 4. Overhead Gantry Collision Check (Slide under)
    for (const gantry of this.gantries) {
      if (gantry.userData.active && playerBox.intersectsBox(gantry.userData.hitbox)) {
        onCrash("ওভারহেড সিগন্যাল বারে ধাক্কা লেগেছে! / Struck overhead signal bar! Slide next time.");
        return true;
      }
    }

    return false;
  }

  reset() {
    this.trains.forEach(t => { t.visible = false; t.userData.active = false; });
    this.barricades.forEach(b => { b.visible = false; b.userData.active = false; });
    this.gantries.forEach(g => { g.visible = false; g.userData.active = false; });
    this.coins.forEach(c => { c.visible = false; c.userData.active = false; });
    this.particles.forEach(p => { p.visible = false; p.userData.active = false; });

    this.nextSpawnZ = 45.0;
    this.currentStationIndex = 0;
  }
}


// ===================================================================
// 7. KEYBOARD INPUT CONTROLLER
// ===================================================================
class InputController {
  constructor(game) {
    this.game = game;
    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      // Toggle Pause with 'P' or 'Escape'
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        this.game.togglePause();
        return;
      }

      if (this.game.state !== 'PLAYING') return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.game.player.moveLeft();
          break;

        case 'ArrowRight':
        case 'd':
        case 'D':
          this.game.player.moveRight();
          break;

        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ': // Spacebar
          if (this.game.player.jump()) {
            this.game.audio.playJump();
          }
          break;

        case 'ArrowDown':
        case 's':
        case 'S':
          if (this.game.player.slide()) {
            this.game.audio.playSlide();
          }
          break;
      }
    });
  }
}


// ===================================================================
// 8. MEDIAPIPE WEBCAM HAND GESTURE CONTROLLER — FAST & LIGHTWEIGHT
// Detection strategy:
//   - MediaPipe throttled to ~20 FPS with one inference at a time
//   - Finger poses map directly to actions; a fist arms and resets input
//   - Lightweight camera mode reduces game rendering work
//   - Practice Mode: game frozen, gesture tutor overlay, no game-over
// ===================================================================
class GestureController {
  constructor(game) {
    this.game = game;
    this.isActive = false;
    this.lastHandSeenTime = 0;
    this.isGestureReady = false;

    // Edge-triggering / cooldown
    this.lastActionTime = 0;
    this.lastTriggeredGesture = null;
    this.lastMpTime = 0;

    // Practice Mode flag
    this.isPracticeMode = false;
    this.practiceReturnState = 'START';
    this.isProcessingFrame = false;
    this.fpsWindowStart = performance.now();
    this.fpsFrameCount = 0;

    // DOM Elements
    this.panel = document.getElementById('camera-panel');
    this.video = document.getElementById('webcam-video');
    this.canvas = document.getElementById('camera-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.statusDot = document.getElementById('camera-status-dot');
    this.gestureLabel = document.getElementById('gesture-name-label');
    this.handHint = document.getElementById('hand-status-hint');
    this.fpsLabel = document.getElementById('camera-fps-label');

    // MediaPipe Instances
    this.hands = null;
    this.camera = null;
    this.isMediaPipeReady = false;

    this.bindDOM();
  }

  bindDOM() {
    document.getElementById('btn-modal-camera-toggle').addEventListener('click', () => {
      this.toggle();
    });

    // Practice Mode buttons
    const btnPractice = document.getElementById('btn-practice-mode');
    if (btnPractice) btnPractice.addEventListener('click', () => this.enterPracticeMode());

    const btnHudPractice = document.getElementById('btn-hud-practice');
    if (btnHudPractice) btnHudPractice.addEventListener('click', () => this.enterPracticeMode());

    const btnExitPractice = document.getElementById('btn-exit-practice');
    if (btnExitPractice) btnExitPractice.addEventListener('click', () => this.exitPracticeMode());

    const btnStartFromPractice = document.getElementById('btn-start-from-practice');
    if (btnStartFromPractice) btnStartFromPractice.addEventListener('click', () => this.game.startGame());
  }

  async toggle() {
    this.isActive = !this.isActive;

    if (this.isActive) {
      this.isGestureReady = false;
      this.lastTriggeredGesture = null;
      this.panel.classList.remove('hidden');
      document.getElementById('btn-camera-toggle').classList.add('active', 'camera-on');
      document.getElementById('btn-modal-camera-toggle').textContent = '📷 ক্যামেরা মোড বন্ধ করুন (Camera Mode: ON)';
      this.game.setCameraPerformanceMode(true);
      this.setGestureFeedback('✊', 'মুঠি করুন / MAKE A FIST');

      if (!this.isMediaPipeReady) {
        await this.initMediaPipe();
      } else if (this.camera) {
        this.camera.start();
      }
    } else {
      const wasPracticeMode = this.isPracticeMode;
      this.isPracticeMode = false;
      this.isGestureReady = false;
      this.lastTriggeredGesture = null;
      this.panel.classList.add('hidden');
      document.getElementById('btn-camera-toggle').classList.remove('active', 'camera-on');
      document.getElementById('btn-modal-camera-toggle').textContent = '📷 ক্যামেরা মোড চালু করুন (Camera Mode: OFF)';
      this.game.setCameraPerformanceMode(false);
      const ps = document.getElementById('practice-screen');
      if (ps) ps.classList.add('hidden');
      if (this.camera) this.camera.stop();
      this.statusDot.className = 'camera-status-dot';
      if (wasPracticeMode) {
        document.body.classList.remove('practice-mode');
        this.game.state = 'START';
        document.getElementById('start-screen').classList.remove('hidden');
      }
    }
    return this.isActive;
  }

  async initMediaPipe() {
    this.statusDot.className = 'camera-status-dot loading';
    this.handHint.textContent = '⏳ লোড হচ্ছে... (Loading...)';
    this.handHint.classList.add('visible');

    if (typeof window.Hands === 'undefined') {
      this.showCameraError(new Error('MediaPipe Hands library did not load.'));
      return;
    }

    try {
      this.hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,           // Lite model = lowest CPU cost
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.45   // Slightly relaxed for faster tracking
      });

      this.hands.onResults((results) => this.onHandResults(results));

      // Lower resolution = less pixels per frame = faster inference
      this.camera = new window.Camera(this.video, {
        onFrame: async () => {
          if (!this.isActive || this.isProcessingFrame || this.video.readyState < 2) return;
          // THROTTLE: only run ML every MEDIAPIPE_INTERVAL_MS (~20 FPS)
          const now = performance.now();
          if (now - this.lastMpTime < CONFIG.MEDIAPIPE_INTERVAL_MS) return;
          this.lastMpTime = now;
          this.isProcessingFrame = true;
          try {
            await this.hands.send({ image: this.video });
          } catch (err) {
            this.showCameraError(err);
          } finally {
            this.isProcessingFrame = false;
          }
        },
        width: 256,  // reduced from 320 → faster inference
        height: 192
      });

      await this.camera.start();
      if (!this.isActive) {
        this.camera.stop();
        return;
      }
      this.isMediaPipeReady = true;
      this.statusDot.className = 'camera-status-dot active';
      this.handHint.classList.remove('visible');
    } catch (err) {
      this.showCameraError(err);
    }
  }

  showCameraError(error) {
    console.error('Camera/MediaPipe error:', error);
    this.statusDot.className = 'camera-status-dot error';
    this.handHint.textContent = '❌ ক্যামেরা চালু হয়নি। অনুমতি ও সংযোগ পরীক্ষা করুন / Check camera permission and connection.';
    this.handHint.classList.add('visible');
  }

  // ---------------------------------------------------------------
  // PRACTICE MODE — game frozen, gesture tutor overlay
  // ---------------------------------------------------------------
  enterPracticeMode() {
    const activate = () => {
      this.practiceReturnState = this.game.state;
      this.isPracticeMode = true;
      ['left', 'right', 'jump', 'slide'].forEach((action) => {
        const count = document.getElementById(`pcount-${action}`);
        if (count) count.textContent = '0';
      });
      this.game.state = 'PRACTICE';
      document.body.classList.add('practice-mode');
      document.getElementById('start-screen').classList.add('hidden');
      document.getElementById('pause-screen').classList.add('hidden');
      document.getElementById('gameover-screen').classList.add('hidden');
      const ps = document.getElementById('practice-screen');
      if (ps) ps.classList.remove('hidden');
    };

    if (!this.isActive) {
      this.toggle();
    }
    activate();
  }

  exitPracticeMode() {
    this.isPracticeMode = false;
    document.body.classList.remove('practice-mode');
    const ps = document.getElementById('practice-screen');
    if (ps) ps.classList.add('hidden');
    const returnState = this.practiceReturnState === 'PLAYING' ? 'PAUSED' : this.practiceReturnState;
    this.game.state = returnState;
    document.getElementById('start-screen').classList.toggle('hidden', returnState !== 'START');
    document.getElementById('pause-screen').classList.toggle('hidden', returnState !== 'PAUSED');
    document.getElementById('gameover-screen').classList.toggle('hidden', returnState !== 'GAMEOVER');
    this.game.lastTime = performance.now();
  }

  // ---------------------------------------------------------------
  // MEDIAPIPE RESULT CALLBACK
  // ---------------------------------------------------------------
  onHandResults(results) {
    const now = performance.now();
    this.fpsFrameCount++;
    if (now - this.fpsWindowStart >= 1000) {
      const fps = Math.round(this.fpsFrameCount * 1000 / (now - this.fpsWindowStart));
      this.fpsLabel.textContent = `${fps} FPS`;
      this.fpsFrameCount = 0;
      this.fpsWindowStart = now;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.clearRect(0, 0, w, h);

    // Mirror the preview to match natural hand movement.
    this.ctx.save();
    this.ctx.translate(w, 0);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(results.image, 0, 0, w, h);
    this.ctx.restore();

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      this.lastHandSeenTime = now;
      this.handHint.classList.remove('visible');

      const rawX = (landmarks[0].x + landmarks[9].x) / 2.0;
      const rawY = (landmarks[0].y + landmarks[9].y) / 2.0;

      this.ctx.fillStyle = '#facc15';
      this.ctx.beginPath();
      this.ctx.arc((1 - rawX) * w, rawY * h, 7, 0, Math.PI * 2);
      this.ctx.fill();

      const fingerCount = this.countExtendedFingers(landmarks);
      this.processGestureAction(fingerCount);
      if (this.isPracticeMode) this.updatePracticeOverlay(this.isGestureReady ? fingerCount : 0);
    } else if (now - this.lastHandSeenTime > 400) {
      this.isGestureReady = false;
      this.lastTriggeredGesture = null;
      this.handHint.textContent = '⚠️ হাত ক্যামেরার সামনে আনুন / Show your hand';
      this.handHint.classList.add('visible');
      this.setGestureFeedback('⚪', 'হাত দেখান / SHOW HAND');
      if (this.isPracticeMode) this.updatePracticeOverlay(0);
    }
  }

  countExtendedFingers(landmarks) {
    const wrist = landmarks[0];
    const fingers = [[8, 6], [12, 10], [16, 14], [20, 18]];
    return fingers.reduce((count, [tipIndex, pipIndex]) => {
      const tip = landmarks[tipIndex];
      const pip = landmarks[pipIndex];
      const tipDistance = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const pipDistance = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      return count + (tipDistance > pipDistance * 1.15 ? 1 : 0);
    }, 0);
  }

  processGestureAction(fingerCount) {
    if (fingerCount === 0) {
      this.isGestureReady = true;
      this.lastTriggeredGesture = null;
      this.setGestureFeedback('✊', 'প্রস্তুত / READY');
      return;
    }

    if (!this.isGestureReady) {
      this.setGestureFeedback('✊', 'প্রথমে মুঠি করুন / MAKE A FIST');
      return;
    }

    const gestures = {
      1: { action: 'RIGHT', icon: '1️⃣', label: 'ডানে / RIGHT', className: 'action-right' },
      2: { action: 'LEFT', icon: '2️⃣', label: 'বামে / LEFT', className: 'action-left' },
      3: { action: 'JUMP', icon: '3️⃣', label: 'লাফ / JUMP', className: 'action-jump' },
      4: { action: 'SLIDE', icon: '4️⃣', label: 'স্লাইড / SLIDE', className: 'action-slide' }
    };
    const gesture = gestures[fingerCount];
    if (!gesture) return;

    const now = performance.now();
    if (gesture.action !== this.lastTriggeredGesture &&
        now - this.lastActionTime >= CONFIG.GESTURE_COOLDOWN_MS) {
      this.triggerGameAction(gesture.action);
      this.lastActionTime = now;
      this.lastTriggeredGesture = gesture.action;
    }
    this.setGestureFeedback(gesture.icon, gesture.label, gesture.className);
  }

  // ---------------------------------------------------------------
  // GAME ACTIONS
  // ---------------------------------------------------------------

  triggerGameAction(gesture) {
    const inGame = this.game.state === 'PLAYING';
    const inPractice = this.isPracticeMode;
    if (!inGame && !inPractice) return;

    switch (gesture) {
      case 'LEFT':
        this.game.player.moveLeft();
        this.setGestureFeedback('⬅️', 'বামে / LEFT', 'action-left');
        if (inGame) this.game.audio.playCoin(); // subtle haptic-like click
        break;
      case 'RIGHT':
        this.game.player.moveRight();
        this.setGestureFeedback('➡️', 'ডানে / RIGHT', 'action-right');
        if (inGame) this.game.audio.playCoin();
        break;
      case 'JUMP':
        if (this.game.player.jump()) this.game.audio.playJump();
        this.setGestureFeedback('⬆️', 'লাফ / JUMP', 'action-jump');
        break;
      case 'SLIDE':
        if (this.game.player.slide()) this.game.audio.playSlide();
        this.setGestureFeedback('⬇️', 'স্লাইড / SLIDE', 'action-slide');
        break;
    }

    this.flashPracticeAction(gesture);
  }

  // Big flash indicator inside Practice Mode screen
  flashPracticeAction(gesture) {
    if (!this.isPracticeMode) return;
    const el = document.getElementById('practice-action-flash');
    if (!el) return;
    const map = {
      LEFT:  { icon: '⬅️', text: 'বামে / LEFT',    color: '#38bdf8' },
      RIGHT: { icon: '➡️', text: 'ডানে / RIGHT',   color: '#38bdf8' },
      JUMP:  { icon: '⬆️', text: 'লাফ / JUMP',     color: '#4ade80' },
      SLIDE: { icon: '⬇️', text: 'স্লাইড / SLIDE', color: '#fbbf24' }
    };
    const g = map[gesture];
    if (!g) return;
    const count = document.getElementById(`pcount-${gesture.toLowerCase()}`);
    if (count) count.textContent = String(Number(count.textContent) + 1);
    el.style.color = g.color;
    el.innerHTML = `<div style="font-size:60px;line-height:1">${g.icon}</div><div style="font-size:18px;font-weight:800;margin-top:6px">${g.text}</div>`;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) scale(1.1)';
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) scale(1)';
    }, 700);
  }

  // Highlight which gesture zone the hand is currently in
  updatePracticeOverlay(fingerCount) {
    const setZ = (id, on) => { const el = document.getElementById(id); if (el) el.classList.toggle('zone-active', on); };
    setZ('pzone-right', fingerCount === 1);
    setZ('pzone-left', fingerCount === 2);
    setZ('pzone-up', fingerCount === 3);
    setZ('pzone-down', fingerCount === 4);
  }

  setGestureFeedback(icon, text, actionClass = '') {
    this.gestureLabel.className = 'gesture-name ' + actionClass;
    this.gestureLabel.innerHTML = `<span>${icon}</span> <span>${text}</span>`;
  }

}

// ===================================================================
// 9. MAIN GAME ORCHESTRATOR & LOOP
// ===================================================================
class MetroRunnerDhaka {
  constructor() {
    this.state = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
    this.cameraPerformanceMode = false;
    this.lastRenderTime = 0;

    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.speed = CONFIG.START_SPEED;
    this.bestScore = parseInt(localStorage.getItem('mrt_dhaka_best_score') || '0', 10);

    // Delta-time loop state
    this.lastTime = 0;
    this.accumulatedTime = 0;

    // Subsystems
    this.audio = new AudioController();
    this.initThree();

    this.player = new Player(this.scene);
    this.world = new WorldManager(this.scene);
    this.obstacles = new ObstacleManager(this.scene, this.audio);
    this.input = new InputController(this);
    this.gesture = new GestureController(this);

    this.bindUI();
    this.updateHUD();

    // Start requestAnimationFrame render loop
    requestAnimationFrame((t) => this.loop(t));
  }

  initThree() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene & Dhaka Atmosphere Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.COLORS.SKY_BOTTOM);
    this.scene.fog = new THREE.FogExp2(CONFIG.COLORS.SKY_BOTTOM, 0.009);

    // Camera (Third-person chase view)
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      350.0
    );
    this.cameraOffset = new THREE.Vector3(0, 3.8, -6.8); // Behind and slightly above runner
    this.cameraLookOffset = new THREE.Vector3(0, 1.8, 10.0);

    // Lighting (Warm tropical Dhaka sunlight)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.75);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 0.9);
    this.dirLight.position.set(25, 45, -20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 120;
    this.dirLight.shadow.camera.left = -15;
    this.dirLight.shadow.camera.right = 15;
    this.dirLight.shadow.camera.top = 20;
    this.dirLight.shadow.camera.bottom = -10;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Window resize handler
    window.addEventListener('resize', () => this.onWindowResize());
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setCameraPerformanceMode(enabled) {
    if (this.cameraPerformanceMode === enabled) return;
    this.cameraPerformanceMode = enabled;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, enabled ? 1.0 : 2.0));
    this.renderer.shadowMap.enabled = !enabled;
    document.body.classList.toggle('camera-performance-mode', enabled);
  }

  bindUI() {
    // Start Game Button
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.audio.init();
      this.startGame();
    });

    // Resume Game Button
    document.getElementById('btn-resume-game').addEventListener('click', () => {
      this.togglePause();
    });

    // Restart Game Buttons
    document.getElementById('btn-restart-from-pause').addEventListener('click', () => {
      this.restartGame();
    });

    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.restartGame();
    });

    // Top Bar HUD Action Buttons
    document.getElementById('btn-camera-toggle').addEventListener('click', () => {
      this.gesture.toggle();
    });

    // btn-modal-camera-toggle is now bound inside GestureController.bindDOM()

    document.getElementById('btn-sound-toggle').addEventListener('click', (e) => {
      const isMuted = this.audio.toggleMute();
      e.target.textContent = isMuted ? '🔇' : '🔊';
    });

    document.getElementById('btn-pause-toggle').addEventListener('click', () => {
      this.togglePause();
    });
  }

  startGame() {
    document.body.classList.remove('practice-mode');
    if (this.gesture) this.gesture.isPracticeMode = false;
    document.getElementById('start-screen').classList.add('hidden');
    const ps = document.getElementById('practice-screen');
    if (ps) ps.classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    this.state = 'PLAYING';
    this.lastTime = performance.now();
    this.audio.playStationChime();
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      document.getElementById('pause-screen').classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      document.getElementById('pause-screen').classList.add('hidden');
      this.lastTime = performance.now(); // avoid delta-time spike
    }
  }

  triggerGameOver(reason) {
    this.state = 'GAMEOVER';
    this.audio.playCrash();

    // Check High Score
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('mrt_dhaka_best_score', this.bestScore.toString());
    }

    // Populate Game Over Screen
    document.getElementById('gameover-reason').textContent = reason;
    document.getElementById('go-score').textContent = Math.floor(this.score).toLocaleString();
    document.getElementById('go-best').textContent = Math.floor(this.bestScore).toLocaleString();
    document.getElementById('go-coins').textContent = this.coins.toLocaleString();
    document.getElementById('go-distance').textContent = `${Math.floor(this.distance)} m`;

    document.getElementById('gameover-screen').classList.remove('hidden');
  }

  restartGame() {
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.speed = CONFIG.START_SPEED;

    this.player.reset();
    this.world.reset();
    this.obstacles.reset();

    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.add('hidden');

    this.state = 'PLAYING';
    this.lastTime = performance.now();
    this.audio.playStationChime();
    this.updateHUD();
  }

  onCoinCollected() {
    this.coins++;
    this.score += CONFIG.COIN_POINTS;
    this.updateHUD();
  }

  onStationReached(station) {
    const banner = document.getElementById('station-banner');
    document.getElementById('station-name-bn').textContent = station.bn;
    document.getElementById('station-name-en').textContent = station.en;

    banner.classList.add('show');
    setTimeout(() => {
      banner.classList.remove('show');
    }, 3800);
  }

  updateHUD() {
    document.getElementById('hud-score').textContent = Math.floor(this.score);
    document.getElementById('hud-coins').textContent = this.coins;
    document.getElementById('hud-distance').textContent = `${Math.floor(this.distance)} m`;
    
    const kmh = Math.floor(this.speed * 3.6);
    document.getElementById('hud-speed').textContent = `${kmh} km/h`;
  }

  loop(currentTime) {
    requestAnimationFrame((t) => this.loop(t));

    if (!this.lastTime) {
      this.lastTime = currentTime;
      return;
    }

    let dt = (currentTime - this.lastTime) / 1000.0;
    this.lastTime = currentTime;

    // Clamp dt to avoid physics spiral when tab is switched
    if (dt > 0.1) dt = 0.1;

    if (this.state !== 'PLAYING') return;

    if (this.state === 'PLAYING') {
      // 1. Smooth Acceleration (+2% every 10 seconds with max cap)
      if (this.speed < CONFIG.MAX_SPEED) {
        this.speed += this.speed * CONFIG.SPEED_ACCELERATION * dt;
      }

      // 2. Continuous Distance & Score Increment
      const forwardDelta = this.speed * dt;
      this.distance += forwardDelta;
      this.score += forwardDelta * CONFIG.DISTANCE_SCORE_MULTIPLIER;
      this.updateHUD();

      // 3. Update Player Mechanics
      const playerZ = this.distance;
      this.player.mesh.position.z = playerZ;
      this.player.update(dt, this.speed, playerZ);

      // 4. Update World Segments & Environment
      this.world.update(playerZ);

      // 5. Update Obstacles, Trains & Coins
      this.obstacles.update(
        dt,
        playerZ,
        this.speed,
        this.world,
        (st) => this.onStationReached(st)
      );

      // 6. Collision Checking
      this.obstacles.checkCollisions(
        this.player,
        () => this.onCoinCollected(),
        (reason) => this.triggerGameOver(reason)
      );

      // 7. Third-Person Chase Camera Follow
      this.camera.position.x = this.player.mesh.position.x * 0.7;
      this.camera.position.y = this.player.mesh.position.y * 0.4 + this.cameraOffset.y;
      this.camera.position.z = playerZ + this.cameraOffset.z;

      this.camera.lookAt(
        this.player.mesh.position.x * 0.4,
        this.player.mesh.position.y * 0.3 + this.cameraLookOffset.y,
        playerZ + this.cameraLookOffset.z
      );

      // Directional Sun Light follows camera frustum
      this.dirLight.position.set(25, 45, playerZ - 20);
      this.dirLight.target.position.set(0, 0, playerZ + 20);
      this.dirLight.target.updateMatrixWorld();

    }

    // Render 3D Scene
    if (!this.cameraPerformanceMode || currentTime - this.lastRenderTime >= 1000 / 30) {
      this.renderer.render(this.scene, this.camera);
      this.lastRenderTime = currentTime;
    }
  }
}


// ===================================================================
// 10. INITIALIZATION
// ===================================================================
window.addEventListener('DOMContentLoaded', () => {
  window.game = new MetroRunnerDhaka();
});
