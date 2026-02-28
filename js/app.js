import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================
//  DONNÉES STATIQUES — Fallback si l'API n'est pas disponible
// ============================================================
const STATIC_BRANDS = [
  { id: 1, name: 'MTX Audio',  country: 'États-Unis' },
  { id: 2, name: 'Focal',      country: 'France'     },
  { id: 3, name: 'GAS',        country: 'Suède'      },
  { id: 4, name: 'GroundZero', country: 'Allemagne'  },
];

// Paramètres T/S vérifiés — sources : loudspeakerdatabase.com, datasheets fabricants
const STATIC_SUBS = [
  // ── MTX Audio ──────────────────────────────────────────────────────────────
  // RT12-04 : 12" 4Ω entrée de gamme — source : loudspeakerdatabase.com/MTX/RT12-04
  { id:1,  brand_id:1, model:'MTX RT12-04',        size_inch:12.0, diameter_mm:305, fs:28.00, qts:0.5400, qes:0.5800, qms:6.870, vas:68.00,  xmax:16.0, re:3.20, voice_coil:'4Ω',    power_rms: 250, recommended_type:'both'   },
  // TX812 : 12" 2Ω compétition — source : loudspeakerdatabase.com/MTX/TX812
  { id:2,  brand_id:1, model:'MTX TX812',          size_inch:12.0, diameter_mm:305, fs:35.00, qts:0.4200, qes:0.4600, qms:5.120, vas:24.60,  xmax:12.5, re:2.00, voice_coil:'2Ω',    power_rms:1800, recommended_type:'both'   },
  // TX815 : 15" 2Ω compétition — source : loudspeakerdatabase.com/MTX/TX815
  { id:3,  brand_id:1, model:'MTX TX815',          size_inch:15.0, diameter_mm:380, fs:31.00, qts:0.4900, qes:0.5300, qms:6.300, vas:69.30,  xmax:12.5, re:2.00, voice_coil:'2Ω',    power_rms:2000, recommended_type:'both'   },
  // RFL12 : 12" 2Ω ultra-compétition, Qts faible → évent — source : loudspeakerdatabase.com/MTX/RFL12
  { id:4,  brand_id:1, model:'MTX RFL12',          size_inch:12.0, diameter_mm:305, fs:35.00, qts:0.3500, qes:0.3700, qms:7.610, vas:14.60,  xmax:15.0, re:2.00, voice_coil:'2Ω',    power_rms:3000, recommended_type:'ported' },
  // RFL15 : 15" 2Ω ultra-compétition, Qts faible → évent — source : loudspeakerdatabase.com/MTX/RFL15
  { id:5,  brand_id:1, model:'MTX RFL15',          size_inch:15.0, diameter_mm:380, fs:35.00, qts:0.3800, qes:0.4000, qms:7.030, vas:44.00,  xmax:15.0, re:2.00, voice_coil:'2Ω',    power_rms:3500, recommended_type:'ported' },

  // ── Focal ──────────────────────────────────────────────────────────────────
  // Sub P25 FE (Flax Expert) 10" 4Ω — source : focal-audio.jp datasheet PDF
  { id:6,  brand_id:2, model:'Focal Sub P25 FE',   size_inch:10.0, diameter_mm:250, fs:31.00, qts:0.4500, qes:0.5100, qms:4.500, vas:29.00,  xmax:14.0, re:3.70, voice_coil:'4Ω',    power_rms: 300, recommended_type:'both'   },
  // Sub P25 FSE (Flax EVO Shallow) 10" 4Ω — source : focal-audio.jp datasheet PDF
  { id:7,  brand_id:2, model:'Focal Sub P25 FSE',  size_inch:10.0, diameter_mm:250, fs:30.00, qts:0.7800, qes:0.9500, qms:5.000, vas:25.00,  xmax:11.0, re:3.20, voice_coil:'4Ω',    power_rms: 280, recommended_type:'sealed' },
  // Sub P25 DB (Double Bobine) 10" 2×1Ω — source : loudspeakerdatabase.com/Focal
  { id:8,  brand_id:2, model:'Focal Sub P25 DB',   size_inch:10.0, diameter_mm:250, fs:27.46, qts:0.4310, qes:0.4700, qms:5.210, vas:40.72,  xmax: 8.5, re:1.70, voice_coil:'2×1Ω',  power_rms: 300, recommended_type:'both'   },
  // Sub P30F (Expert Flax) 12" 4Ω — source : focal-america.com datasheet PDF
  { id:9,  brand_id:2, model:'Focal Sub P30F',     size_inch:12.0, diameter_mm:300, fs:28.00, qts:0.4700, qes:0.5100, qms:5.600, vas:70.00,  xmax:14.0, re:3.70, voice_coil:'4Ω',    power_rms: 400, recommended_type:'both'   },
  // Sub P30 FSE (Flax EVO Shallow) 12" 4Ω — source : loudspeakerdatabase.com/Focal/SUB_P30FSE
  { id:10, brand_id:2, model:'Focal Sub P30 FSE',  size_inch:12.0, diameter_mm:300, fs:30.00, qts:1.1000, qes:1.3000, qms:7.200, vas:42.00,  xmax:11.0, re:3.20, voice_coil:'4Ω',    power_rms: 300, recommended_type:'sealed' },

  // ── GAS Audio Power ────────────────────────────────────────────────────────
  // MAX S1-8D1 8" 2×1Ω — source : gasaudiopower.com datasheet officiel
  { id:11, brand_id:3, model:'GAS MAX S1-8D1',     size_inch: 8.0, diameter_mm:200, fs:33.10, qts:0.4200, qes:0.4700, qms:3.780, vas: 8.80,  xmax:12.0, re:1.80, voice_coil:'2×1Ω',  power_rms: 550, recommended_type:'both'   },
  // MAX S1-10D1 10" 2×1Ω — source : gasaudiopower.com datasheet officiel
  { id:12, brand_id:3, model:'GAS MAX S1-10D1',    size_inch:10.0, diameter_mm:250, fs:33.30, qts:0.4700, qes:0.5100, qms:5.520, vas:11.70,  xmax:20.0, re:1.80, voice_coil:'2×1Ω',  power_rms:1500, recommended_type:'both'   },
  // MAX S1-10D2 10" 2×2Ω — source : gasaudiopower.com datasheet officiel
  { id:13, brand_id:3, model:'GAS MAX S1-10D2',    size_inch:10.0, diameter_mm:250, fs:31.00, qts:0.4900, qes:0.5300, qms:5.710, vas:14.90,  xmax:20.0, re:3.80, voice_coil:'2×2Ω',  power_rms:1500, recommended_type:'both'   },
  // MAX S1-12D1 12" 2×1Ω — source : bassbrothers.no (datasheet PDF GAS officiel)
  { id:14, brand_id:3, model:'GAS MAX S1-12D1',    size_inch:12.0, diameter_mm:305, fs:27.40, qts:0.4800, qes:0.5300, qms:5.810, vas:33.40,  xmax:40.0, re:1.80, voice_coil:'2×1Ω',  power_rms:1600, recommended_type:'both'   },
  // MAX S2-15D1 15" 2×1Ω — source : loudspeakerdatabase.com/GAS/MAX_S2-15D1
  { id:15, brand_id:3, model:'GAS MAX S2-15D1',    size_inch:15.0, diameter_mm:380, fs:31.00, qts:0.4500, qes:0.4900, qms:5.440, vas:59.50,  xmax:25.0, re:2.20, voice_coil:'2×1Ω',  power_rms:2500, recommended_type:'both'   },

  // ── Ground Zero ────────────────────────────────────────────────────────────
  // GZUW 8CF 8" 2×2Ω Uranium Carbon Fiber — source : loudspeakerdatabase.com/GroundZero/GZUW_8CF
  { id:16, brand_id:4, model:'GZUW 8CF',           size_inch: 8.0, diameter_mm:215, fs:57.00, qts:0.7000, qes:0.7400, qms:11.92, vas: 4.80,  xmax:10.0, re:4.10, voice_coil:'2×2Ω',  power_rms: 300, recommended_type:'sealed' },
  // GZNW 12Xmax 12" 2×1Ω Nuclear SPL — source : loudspeakerdatabase.com/GroundZero/GZNW_12Xmax
  { id:17, brand_id:4, model:'GZNW 12Xmax',        size_inch:12.0, diameter_mm:305, fs:35.60, qts:0.6100, qes:0.6700, qms:6.820, vas:13.60,  xmax:17.5, re:1.80, voice_coil:'2×1Ω',  power_rms:3000, recommended_type:'both'   },
  // GZNW 12X-D2 12" 2×2Ω Nuclear ultra-grave (Fs=21.8Hz) — source : loudspeakerdatabase.com/GroundZero/GZNW_12X-D2
  { id:18, brand_id:4, model:'GZNW 12X-D2',        size_inch:12.0, diameter_mm:305, fs:21.80, qts:0.3300, qes:0.3200, qms:7.760, vas:35.00,  xmax:31.0, re:4.20, voice_coil:'2×2Ω',  power_rms:2000, recommended_type:'ported' },
  // GZNW 15Xmax 15" 2×1Ω Nuclear — source : loudspeakerdatabase.com/GroundZero/GZNW_15Xmax
  { id:19, brand_id:4, model:'GZNW 15Xmax',        size_inch:15.0, diameter_mm:380, fs:29.50, qts:0.3300, qes:0.3500, qms:5.130, vas:35.70,  xmax:12.5, re:2.00, voice_coil:'2×1Ω',  power_rms:4000, recommended_type:'ported' },
  // GZPW 15Xmax 15" 2×1Ω Plutonium compétition — source : speakerboxlite.com/GroundZero
  { id:20, brand_id:4, model:'GZPW 15Xmax',        size_inch:15.0, diameter_mm:380, fs:31.60, qts:0.4000, qes:0.4470, qms:6.020, vas:24.00,  xmax:23.0, re:2.00, voice_coil:'2×1Ω',  power_rms:6000, recommended_type:'ported' },
];

const API_BASE = 'http://localhost:3001/api';
let apiAvailable = false;

async function apiFetch(path) {
  const r = await fetch(API_BASE + path);
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}

// ============================================================
//  CALCULATOR — Thiele-Small physics
// ============================================================
class Calculator {

  static sealed(Fs, Qts, Vas, Qtc = 0.707) {
    if (Qtc <= Qts) throw new Error(`Qtc (${Qtc}) doit être > Qts (${Qts})`);
    const alpha = (Qtc / Qts) ** 2 - 1;
    const Vb    = Vas / alpha;
    const Fc    = Fs * Math.sqrt(1 + alpha);
    const a     = 2 - 1 / (Qtc * Qtc);
    const f3    = Fc * Math.sqrt((a + Math.sqrt(a * a + 4)) / 2);
    return { Vb, Fc, Qtc, f3, alpha };
  }

  static ported(Fs, Qts, Vas, Fb_target = null) {
    const Vb = Math.max(Vas * 20 * Math.pow(Qts, 3.3), Vas * 0.1);
    const Fb = Fb_target ?? (0.707 * Fs);
    const alpha = Vas / Vb;
    const Qb    = Qts * Math.sqrt(1 + alpha);
    const f3    = Fb * 0.85;
    return { Vb, Fb, Qb, f3, alpha };
  }

  static portLength(Fb, Vb_liters, portDiam_mm, numPorts = 1) {
    const r       = (portDiam_mm / 2) / 10;   // cm
    const A       = Math.PI * r * r;           // cm²
    const Vb_cm3  = (Vb_liters * 1000) / numPorts;
    const c       = 34400;                     // cm/s
    const Le      = (c * c * A) / (4 * Math.PI ** 2 * Fb * Fb * Vb_cm3);
    return Math.max(Le - 0.73 * (portDiam_mm / 10), 2);
  }

  static bandpass(Fs, Qts, Vas, ratio = 0.6) {
    const alpha_f  = (0.707 / Qts) ** 2 - 1;
    const Vb_front = Vas / alpha_f;
    const Vb_back  = Vb_front / ratio;
    const Fb       = Fs * 0.85;
    return { Vb_front, Vb_back, Vb: Vb_front + Vb_back, Fb, f_low: Fb * 0.7, f_high: Fs * 1.4 };
  }

  /**
   * Applique le facteur double sub
   * mode 'parallel' → volume ×2, mode 'isobaric' → volume ÷2
   */
  static applyDoubleSub(Vb_single, mode) {
    if (mode === 'parallel')  return Vb_single * 2;
    if (mode === 'isobaric')  return Vb_single / 2;
    return Vb_single;
  }

  /** Dimensions du caisson depuis le volume interne */
  static boxDimensions(Vb_liters, driverDiam_mm, panelThick_mm = 18, numSubs = 1) {
    const Vb_cm3 = Vb_liters * 1000;
    const d_cm   = driverDiam_mm / 10;
    const t      = panelThick_mm / 10;

    // Largeur minimale : 125% du diamètre HP
    const minW = d_cm * 1.25;
    // Hauteur minimale pour numSubs HP (en prévision de l'évent)
    const minH = d_cm * (numSubs === 2 ? 2.8 : 1.4);

    // Proportion initiale W:H:D ≈ 1:1.3:0.9
    let W = Math.max(Math.cbrt(Vb_cm3 / (1.3 * 0.9)), minW);
    let H = Math.max(W * 1.3, minH);
    let D = Vb_cm3 / (W * H);

    // Si profondeur trop grande : augmenter les proportions
    if (D > H * 1.2) {
      W = Math.max(Math.cbrt(Vb_cm3 / 0.9), minW);
      H = Math.max(W, minH);
      D = Vb_cm3 / (W * H);
    }

    return {
      internal: { W, H, D },
      external: { W: W + 2*t, H: H + 2*t, D: D + 2*t },
    };
  }
}

// ============================================================
//  FREQUENCY CHART — HTML5 Canvas
// ============================================================
class FrequencyChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
  }

  draw(type, params) {
    const ctx  = this.ctx;
    const W    = this.canvas.width;
    const H    = this.canvas.height;
    const pad  = { top: 18, right: 20, bottom: 38, left: 48 };
    const cw   = W - pad.left - pad.right;
    const ch   = H - pad.top  - pad.bottom;
    const fMin = 10, fMax = 500, dBMin = -42, dBMax = 6;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0c1829';
    ctx.fillRect(0, 0, W, H);

    const fx = f  => pad.left + (Math.log10(f / fMin) / Math.log10(fMax / fMin)) * cw;
    const dy = dB => pad.top  + ch - ((dB - dBMin) / (dBMax - dBMin)) * ch;

    // Grille dB
    for (const db of [-40, -30, -20, -10, -6, -3, 0, 3]) {
      const y = dy(db);
      ctx.beginPath();
      ctx.strokeStyle = db === 0 ? 'rgba(100,120,160,0.6)' : 'rgba(51,65,85,0.5)';
      ctx.lineWidth   = 1;
      ctx.setLineDash(db === 0 ? [] : [3, 4]);
      ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(148,163,184,0.55)';
      ctx.font      = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText((db >= 0 ? '+' : '') + db, pad.left - 5, y + 4);
    }

    // Grille fréquences
    for (const f of [20, 30, 50, 80, 100, 150, 200, 300, 500]) {
      const x = fx(f);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(51,65,85,0.4)';
      ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + ch);
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.55)';
      ctx.font      = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f >= 1000 ? (f/1000) + 'k' : f, x, pad.top + ch + 16);
    }

    ctx.fillStyle  = 'rgba(148,163,184,0.4)';
    ctx.font       = '9px monospace';
    ctx.textAlign  = 'right';
    ctx.fillText('dB', pad.left - 5, pad.top - 4);
    ctx.textAlign  = 'center';
    ctx.fillText('Hz', pad.left + cw / 2, pad.top + ch + 32);

    // Calcul de la courbe
    const N = 400;
    const freqs = Array.from({ length: N }, (_, i) =>
      fMin * Math.pow(fMax / fMin, i / (N - 1)));
    const resp  = freqs.map(f => this._response(f, type, params));
    const peak  = Math.max(...resp.filter(v => isFinite(v) && !isNaN(v)));

    // Ligne -3dB
    const y3 = dy(-3);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(245,158,11,0.5)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([6, 4]);
    ctx.moveTo(pad.left, y3); ctx.lineTo(pad.left + cw, y3);
    ctx.stroke();
    ctx.setLineDash([]);

    // Courbe principale
    ctx.shadowColor = 'rgba(6,182,212,0.6)';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth   = 2.5;

    let started = false;
    const pts = [];
    freqs.forEach((f, i) => {
      const dB = resp[i] - peak;
      if (!isFinite(dB) || isNaN(dB) || dB < dBMin - 2) return;
      const x = fx(f);
      const y = dy(Math.max(dB, dBMin));
      pts.push({ x, y });
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Remplissage
    if (pts.length > 1) {
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, dy(dBMin));
      ctx.lineTo(pts[0].x, dy(dBMin));
      ctx.closePath();
      ctx.fillStyle = 'rgba(6,182,212,0.06)';
      ctx.fill();
    }

    // Marqueur fréquence d'accord / système
    const markerF = type === 'sealed' ? params.Fc : params.Fb;
    if (markerF) {
      const mx = fx(markerF);
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.moveTo(mx, pad.top); ctx.lineTo(mx, pad.top + ch);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle  = '#10b981';
      ctx.font       = 'bold 10px monospace';
      ctx.textAlign  = 'center';
      ctx.fillText((type === 'sealed' ? 'Fc' : 'Fb') + ' ' + Math.round(markerF) + 'Hz', mx, pad.top + 11);
    }

    // Marqueur f3
    if (params.f3) {
      const f3x = fx(Math.max(params.f3, fMin + 1));
      ctx.strokeStyle = 'rgba(245,158,11,0.8)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(f3x, y3 - 5); ctx.lineTo(f3x, y3 + 5);
      ctx.stroke();
      ctx.fillStyle  = '#f59e0b';
      ctx.font       = 'bold 10px monospace';
      ctx.textAlign  = 'center';
      ctx.fillText('f3 ' + Math.round(params.f3) + 'Hz', f3x, y3 - 8);
    }
  }

  _response(f, type, p) {
    if (type === 'sealed') {
      const Ω = f / p.Fc;
      const H = (Ω * Ω) / Math.sqrt((1 - Ω * Ω) ** 2 + (Ω / p.Qtc) ** 2);
      return 20 * Math.log10(Math.max(H, 1e-12));
    }
    if (type === 'ported') {
      const Ω = f / p.Fb;
      const Q = p.Qb ?? 0.7;
      // Approx 4th-order HP: produit de deux 2nd-order
      const H1 = (Ω*Ω) / Math.sqrt((1-Ω*Ω)**2 + (Ω/(Q*0.6))**2);
      const H2 = (Ω*Ω) / Math.sqrt((1-Ω*Ω)**2 + (Ω*Q*1.2)**2);
      return 20 * Math.log10(Math.max(H1 * H2, 1e-12));
    }
    if (type === 'bandpass') {
      const Fc_m = Math.sqrt(p.f_low * p.f_high);
      const Ω    = f / Fc_m;
      const BW   = p.f_high / Fc_m;
      const Q    = 1 / (BW - 1 / BW);
      const H    = (Ω / Math.abs(Q)) / Math.sqrt((1 - Ω*Ω)**2 + (Ω/Math.abs(Q))**2);
      return 20 * Math.log10(Math.max(H, 1e-12));
    }
    return -60;
  }
}

// ============================================================
//  3D VIEWER — Three.js
// ============================================================
class EnclosureViewer {
  constructor(canvas) {
    this.canvas     = canvas;
    this._wireframe = false;
    this._built     = false;
    this._initScene();
    this._initLights();
    this._initControls();
    this._addEnvironment();
    this._startLoop();
  }

  // ── Initialisation ────────────────────────────────────────
  _initScene() {
    const w = this.canvas.clientWidth  || 800;
    const h = this.canvas.clientHeight || 450;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0x0c1829, 1);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1829);
    this.scene.fog = new THREE.FogExp2(0x0c1829, 0.08);

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.005, 20);
    this.camera.position.set(0.7, 0.55, 1.1);

    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  _initLights() {
    this.scene.add(new THREE.AmbientLight(0xd0e8ff, 0.55));

    const key = new THREE.DirectionalLight(0xfff8f0, 1.1);
    key.position.set(2, 4, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x3366bb, 0.45);
    fill.position.set(-3, 0.5, -2);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x00ccee, 0.25);
    rim.position.set(0, -2, -3);
    this.scene.add(rim);
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping  = true;
    this.controls.dampingFactor  = 0.06;
    this.controls.minDistance    = 0.2;
    this.controls.maxDistance    = 4;
    this.controls.autoRotate     = true;
    this.controls.autoRotateSpeed = 0.6;
  }

  _addEnvironment() {
    this._grid = new THREE.GridHelper(6, 60, 0x1e3a5f, 0x152035);
    this._grid.position.y = -0.5;
    this.scene.add(this._grid);
  }

  // ── Calcul des positions HP et évent sur le panneau avant ─
  _computeLayout(numSubs, h, w, driverR, portR) {
    const gap = Math.max(0.02, h * 0.04);
    let speakers, port = null;

    if (numSubs === 1) {
      if (portR > 0) {
        // HP légèrement au-dessus du centre
        const spkY     = h * 0.12;
        const portY    = Math.max(
          spkY - driverR - gap - portR,
          -h / 2 + portR + gap
        );
        speakers = [{ x: 0, y: spkY }];
        port     = { x: 0, y: portY };
      } else {
        speakers = [{ x: 0, y: 0 }];
      }
    } else {
      // Double sub — HPs empilés verticalement
      if (portR > 0) {
        const spk1Y = h * 0.30;
        const spk2Y = spk1Y - driverR - gap - driverR;
        const portY = Math.max(
          spk2Y - driverR - gap - portR,
          -h / 2 + portR + gap
        );
        speakers = [{ x: 0, y: spk1Y }, { x: 0, y: spk2Y }];
        port     = { x: 0, y: portY };
      } else {
        const spk1Y =  h * 0.22;
        const spk2Y = -h * 0.22;
        speakers = [{ x: 0, y: spk1Y }, { x: 0, y: spk2Y }];
      }
    }
    return { speakers, port };
  }

  // ── Construction principale ──────────────────────────────
  build(type, dims, numSubs, driverDiam_mm, portDiam_mm, portLen_cm) {
    // Vider le groupe
    while (this.group.children.length > 0) {
      const c = this.group.children[0];
      if (c.geometry) c.geometry.dispose();
      this.group.remove(c);
    }

    const { W, H, D } = dims.external;
    const w = W / 100, h = H / 100, d = D / 100;   // cm → m
    const t = 0.018;                                 // épaisseur panneau 18mm

    const driverR = (driverDiam_mm / 2) / 1000;
    const portR   = (type === 'ported' && portDiam_mm > 0) ? (portDiam_mm / 2) / 1000 : 0;

    // Positions cohérentes HP + évent
    const layout  = this._computeLayout(numSubs, h, w, driverR, portR);

    // Grille sous le caisson
    this._grid.position.y = -h / 2 - 0.01;

    // Matériaux
    const matWood  = this._woodMat(0x7A5C18);
    const matFront = this._woodMat(0x6B4F14);

    // Panneaux (sans la face avant)
    this._addPanel(w,       h,       t,       0,           0,            -d/2 + t/2, matWood); // arrière
    this._addPanel(t,       h,       d - 2*t, -w/2 + t/2, 0,            0,           matWood); // gauche
    this._addPanel(t,       h,       d - 2*t,  w/2 - t/2, 0,            0,           matWood); // droite
    this._addPanel(w,       t,       d - t,   0,           h/2 - t/2,  -t/2,          matWood); // dessus
    this._addPanel(w,       t,       d - t,   0,          -h/2 + t/2,  -t/2,          matWood); // dessous

    // Panneau avant avec découpes HP (et évent)
    this._buildFrontPanel(w, h, t, d, driverR, layout.speakers,
                          portR > 0 ? portR   : 0,
                          portR > 0 ? layout.port : null,
                          matFront);

    // HPs
    layout.speakers.forEach(pos => this._buildSpeaker(driverR, d / 2, pos.x, pos.y));

    // Évent
    if (portR > 0 && layout.port) {
      const portLen_m = Math.max((portLen_cm || 20) / 100, 0.05);
      this._buildPort(portR, portLen_m, d / 2, layout.port.x, layout.port.y);
    }

    // Vis décoratives sur les coins
    this._addCornerScrews(w, h, d);

    // Ajuster la caméra
    const maxDim = Math.max(w, h, d);
    this.camera.position.set(maxDim * 1.8, maxDim * 1.2, maxDim * 2.3);
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Référence pour le toggle wireframe
    this._allMeshes = [];
    this.group.traverse(c => { if (c.isMesh) this._allMeshes.push(c); });
    this._applyWireframe(this._wireframe);
    this._built = true;
  }

  _woodMat(color) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.0 });
  }

  _addPanel(sx, sy, sz, px, py, pz, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(px, py, pz);
    m.castShadow = m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  // ── Panneau avant avec découpes (ExtrudeGeometry + holes) ─
  _buildFrontPanel(w, h, t, d, speakerR, speakerPositions, portR, portPos, mat) {
    const shape = new THREE.Shape();
    shape.moveTo(-w/2, -h/2);
    shape.lineTo( w/2, -h/2);
    shape.lineTo( w/2,  h/2);
    shape.lineTo(-w/2,  h/2);
    shape.closePath();

    // Découpes HP — coordonnées = positions dans le plan XY du shape
    speakerPositions.forEach(pos => {
      const hole = new THREE.Path();
      hole.absarc(pos.x, pos.y, speakerR, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    });

    // Découpe évent
    if (portR > 0 && portPos) {
      const hole = new THREE.Path();
      hole.absarc(portPos.x, portPos.y, portR, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }

    const geo  = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
    const mesh = new THREE.Mesh(geo, mat);
    // Le shape est en Z=0..t → on positionne pour que la face avant soit à d/2
    mesh.position.set(0, 0, d / 2 - t);
    mesh.castShadow = mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  // ── Haut-parleur ─────────────────────────────────────────
  _buildSpeaker(radius, faceZ, cx, cy) {
    // Le HP est monté en encastré, sa face avant affleure la face externe du panneau
    const z = faceZ + 0.001;

    // Cadre / anneau externe
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
    this.group.add(Object.assign(
      new THREE.Mesh(new THREE.RingGeometry(radius * 0.85, radius, 72), frameMat),
      { position: new THREE.Vector3(cx, cy, z) }
    ));

    // Suspension (tore)
    const surrMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 });
    const surround = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.875, radius * 0.07, 16, 72), surrMat
    );
    surround.rotation.x = Math.PI / 2;
    surround.position.set(cx, cy, z - 0.003);
    this.group.add(surround);

    // Membrane (cône)
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x374151, roughness: 0.95, side: THREE.DoubleSide
    });
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 0.80, 0.055, 72, 1, true), coneMat
    );
    cone.rotation.x = Math.PI / 2;
    cone.position.set(cx, cy, z - 0.026);
    this.group.add(cone);

    // Cache-poussière
    const dustMat = new THREE.MeshStandardMaterial({ color: 0x0c1420, roughness: 0.4 });
    const dust = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.22, 48), dustMat);
    dust.position.set(cx, cy, z + 0.001);
    this.group.add(dust);

    // Boulons de fixation (×4)
    const boltMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    for (let i = 0; i < 4; i++) {
      const a   = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const bx  = cx + Math.cos(a) * radius * 0.95;
      const by  = cy + Math.sin(a) * radius * 0.95;
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.003, 0.01, 8), boltMat
      );
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(bx, by, z - 0.002);
      this.group.add(bolt);
    }
  }

  // ── Évent (tube) ─────────────────────────────────────────
  _buildPort(radius, length, faceZ, cx, cy) {
    const portMat  = new THREE.MeshStandardMaterial({ color: 0x1a2540, roughness: 0.7 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x03060d });

    // Tube — CylindreGeo par défaut le long de Y → rotation.x pour l'aligner sur Z
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 48), portMat
    );
    tube.rotation.x = Math.PI / 2;
    // Centre du cylindre = faceZ - length/2
    // → face avant du tube (vers l'extérieur) à faceZ
    // → face arrière (intérieur du caisson) à faceZ - length
    tube.position.set(cx, cy, faceZ - length / 2);
    this.group.add(tube);

    // Ouverture sombre côté extérieur
    const opening = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.93, 48), innerMat
    );
    opening.position.set(cx, cy, faceZ + 0.0015);
    this.group.add(opening);

    // Rebord (flange) visible sur la façade
    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 0.6 });
    const flange = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.93, radius * 1.03, 48), flangeMat
    );
    flange.position.set(cx, cy, faceZ + 0.001);
    this.group.add(flange);
  }

  // ── Vis décoratives aux coins de la façade ───────────────
  _addCornerScrews(w, h, d) {
    const screwMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
    const fz = d / 2 + 0.001;
    const inset = 0.022;
    const corners = [[-w/2+inset, -h/2+inset], [w/2-inset, -h/2+inset],
                     [-w/2+inset,  h/2-inset], [w/2-inset,  h/2-inset]];
    corners.forEach(([x, y]) => {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.008, 8), screwMat);
      s.rotation.x = Math.PI / 2;
      s.position.set(x, y, fz);
      this.group.add(s);
    });
  }

  // ── Contrôles ─────────────────────────────────────────────
  toggleWireframe() {
    this._wireframe = !this._wireframe;
    this._applyWireframe(this._wireframe);
    return this._wireframe;
  }

  _applyWireframe(state) {
    this.group.traverse(c => {
      if (c.isMesh && c.material) {
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach(m => { m.wireframe = state; });
      }
    });
  }

  resetCamera() {
    this.camera.position.set(0.7, 0.55, 1.1);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _startLoop() {
    const loop = () => {
      requestAnimationFrame(loop);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }
}

// ============================================================
//  APP CONTROLLER
// ============================================================
class App {
  constructor() {
    this._viewer  = null;
    this._chart   = null;
    this._results = null;
    this._activeType    = 'sealed';
    this._doubleSub     = false;
    this._doubleSubMode = 'parallel';

    this._checkApi().then(() => this._loadBrands());
    this._bindTabs();
    this._bindPresets();
    this._bindDoubleSub();
    this._bindCalculate();
    this._bindButtons();
    this._bindResize();
  }

  // ── API ──────────────────────────────────────────────────
  async _checkApi() {
    try {
      const res = await fetch(API_BASE + '/health', { signal: AbortSignal.timeout(2000) });
      apiAvailable = res.ok;
    } catch { apiAvailable = false; }

    const banner = document.getElementById('api-status');
    if (banner) {
      banner.textContent = apiAvailable
        ? '✅ Connecté à la base de données MySQL'
        : '⚡ Mode hors-ligne — données intégrées (démarrez server.js pour MySQL)';
      banner.className = apiAvailable ? 'api-ok' : 'api-offline';
    }
  }

  async _loadBrands() {
    const brands = apiAvailable
      ? await apiFetch('/brands').catch(() => STATIC_BRANDS)
      : STATIC_BRANDS;

    const sel = document.getElementById('db-brand');
    if (!sel) return;
    brands.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name + (b.country ? ' (' + b.country + ')' : '');
      sel.appendChild(opt);
    });

    sel.addEventListener('change', () => this._loadModels(sel.value));
  }

  async _loadModels(brandId) {
    const modSel = document.getElementById('db-model');
    const btn    = document.getElementById('db-load-btn');
    modSel.innerHTML = '<option value="">— Choisir un modèle —</option>';
    if (!brandId) return;

    const models = apiAvailable
      ? await apiFetch(`/subwoofers?brand_id=${brandId}`).catch(
          () => STATIC_SUBS.filter(s => s.brand_id == brandId))
      : STATIC_SUBS.filter(s => s.brand_id == brandId);

    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.model + ' — ' + (m.power_rms || '?') + 'W  ' + (m.voice_coil || '');
      modSel.appendChild(opt);
    });
    btn.disabled = false;

    modSel.addEventListener('change', () => { btn.disabled = !modSel.value; });
  }

  async _loadSubwoofer() {
    const id = document.getElementById('db-model').value;
    if (!id) return;

    const sub = apiAvailable
      ? await apiFetch(`/subwoofers/${id}`).catch(
          () => STATIC_SUBS.find(s => s.id == id))
      : STATIC_SUBS.find(s => s.id == id);

    if (!sub) return;

    const map = { Fs: sub.fs, Qts: sub.qts, Qes: sub.qes, Qms: sub.qms,
                  Vas: sub.vas, Xmax: sub.xmax, Re: sub.re,
                  diameter: sub.diameter_mm, power: sub.power_rms || 400 };
    Object.entries(map).forEach(([k, v]) => {
      const el = document.getElementById(k);
      if (el && v != null) el.value = v;
    });

    // Recommandation de type
    if (sub.recommended_type && sub.recommended_type !== 'both') {
      document.querySelector(`.tab-btn[data-type="${sub.recommended_type}"]`)?.click();
    }

    document.getElementById('db-loaded-name').textContent = sub.model;
    document.getElementById('db-loaded-band').classList.remove('hidden');

    // Auto-remplir Fb si ported
    if (sub.fs) {
      const fbInput = document.getElementById('Fb');
      if (fbInput && !fbInput.value) fbInput.value = Math.round(sub.fs * 0.707);
    }
  }

  // ── Tabs ─────────────────────────────────────────────────
  _bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.type-options').forEach(o => o.classList.add('hidden'));
        this._activeType = btn.dataset.type;
        document.getElementById(`opts-${this._activeType}`)?.classList.remove('hidden');
      });
    });
  }

  // ── Présets manuels ──────────────────────────────────────
  _bindPresets() {
    const PRESETS = {
      sub10: { Fs:42, Qts:0.40, Qes:0.48, Qms:3.2, Vas:22,  Xmax:9,  Re:3.5, diameter:250, power:250 },
      sub12: { Fs:35, Qts:0.35, Qes:0.40, Qms:3.5, Vas:40,  Xmax:12, Re:3.2, diameter:305, power:400 },
      sub15: { Fs:28, Qts:0.30, Qes:0.34, Qms:3.8, Vas:80,  Xmax:16, Re:2.8, diameter:380, power:600 },
      sub18: { Fs:22, Qts:0.27, Qes:0.31, Qms:4.1, Vas:140, Xmax:20, Re:2.4, diameter:460, power:1000 },
    };
    document.getElementById('preset-select')?.addEventListener('change', e => {
      const p = PRESETS[e.target.value]; if (!p) return;
      Object.entries(p).forEach(([k, v]) => {
        const el = document.getElementById(k); if (el) el.value = v;
      });
    });
  }

  // ── Double Sub ───────────────────────────────────────────
  _bindDoubleSub() {
    const toggle  = document.getElementById('double-sub-toggle');
    const options = document.getElementById('double-sub-options');
    toggle?.addEventListener('change', () => {
      this._doubleSub = toggle.checked;
      options?.classList.toggle('hidden', !this._doubleSub);
    });
    document.querySelectorAll('input[name="double-sub-mode"]').forEach(r => {
      r.addEventListener('change', () => { this._doubleSubMode = r.value; });
    });
  }

  // ── Calculate ────────────────────────────────────────────
  _bindCalculate() {
    document.getElementById('btn-calculate')?.addEventListener('click', () => {
      try { this._calculate(); }
      catch (err) { alert('Erreur de calcul : ' + err.message); }
    });
    document.getElementById('db-load-btn')?.addEventListener('click', () => this._loadSubwoofer());
  }

  _getNum(id) {
    const v = parseFloat(document.getElementById(id)?.value);
    if (isNaN(v)) throw new Error(`Valeur manquante : champ "${id}"`);
    return v;
  }

  _calculate() {
    const Fs       = this._getNum('Fs');
    const Qts      = this._getNum('Qts');
    const Qes      = this._getNum('Qes');
    const Qms      = this._getNum('Qms');
    const Vas      = this._getNum('Vas');
    const Xmax     = this._getNum('Xmax');
    const Re       = this._getNum('Re');
    const diameter = this._getNum('diameter');
    const power    = this._getNum('power');
    const type     = this._activeType;
    const numSubs  = this._doubleSub ? 2 : 1;

    let calc, panelThick, portDiam_mm = 0, portLen_cm = 0, portCount = 1;

    if (type === 'sealed') {
      panelThick = this._getNum('panel-thick-sealed');
      const Qtc  = this._getNum('Qtc');
      calc       = Calculator.sealed(Fs, Qts, Vas, Qtc);

    } else if (type === 'ported') {
      panelThick  = this._getNum('panel-thick-ported');
      const Fb_v  = parseFloat(document.getElementById('Fb').value);
      portDiam_mm = this._getNum('port-diam');
      portCount   = parseInt(document.getElementById('port-count').value) || 1;
      calc        = Calculator.ported(Fs, Qts, Vas, isNaN(Fb_v) ? null : Fb_v);
      portLen_cm  = Calculator.portLength(calc.Fb, calc.Vb, portDiam_mm, portCount);
      calc.portLen   = portLen_cm;
      calc.portDiam  = portDiam_mm;
      calc.portCount = portCount;

    } else {
      panelThick = this._getNum('panel-thick-bp');
      const ratio = this._getNum('bp-ratio');
      calc = Calculator.bandpass(Fs, Qts, Vas, ratio);
    }

    // Application du double sub
    if (numSubs === 2) {
      const factor = this._doubleSubMode === 'isobaric' ? 0.5 : 2;
      if (type === 'bandpass') {
        calc.Vb_front *= factor;
        calc.Vb_back  *= factor;
        calc.Vb       *= factor;
      } else {
        calc.Vb *= factor;
      }
      if (type === 'ported') {
        portLen_cm = Calculator.portLength(calc.Fb, calc.Vb, portDiam_mm, portCount);
        calc.portLen = portLen_cm;
      }
    }

    const dims = Calculator.boxDimensions(calc.Vb, diameter, panelThick, numSubs);
    this._results = { type, calc, dims, Fs, Qts, Vas, Xmax, diameter, power,
                      portDiam_mm, portLen_cm, numSubs, doubleSubMode: this._doubleSubMode };

    this._renderResults();
    this._render3D();
    document.getElementById('section-results').classList.remove('hidden');
    document.getElementById('section-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Résultats ────────────────────────────────────────────
  _renderResults() {
    const { type, calc, dims, diameter, portDiam_mm, portLen_cm, numSubs, doubleSubMode } = this._results;

    // Métriques
    const grid = document.getElementById('metrics-grid');
    grid.innerHTML = '';
    const add = (label, val, unit, cls = '') => {
      grid.innerHTML += `<div class="metric-card ${cls}">
        <div class="metric-label">${label}</div>
        <div class="metric-value">${val}<span class="metric-unit"> ${unit}</span></div>
      </div>`;
    };
    add('Volume interne', calc.Vb.toFixed(1), 'L', 'highlight');

    if (type === 'sealed') {
      add('Fc système', Math.round(calc.Fc), 'Hz');
      add('Qtc système', calc.Qtc.toFixed(3));
      add('f(−3 dB)', Math.round(calc.f3), 'Hz', 'highlight');
    } else if (type === 'ported') {
      add('Accord évent Fb', Math.round(calc.Fb), 'Hz', 'highlight');
      add('Qtb système', (calc.Qb ?? 0).toFixed(3));
      add('f(−3 dB)', Math.round(calc.f3), 'Hz');
      add('Long. évent', portLen_cm.toFixed(1), 'cm');
    } else {
      add('Vol. chambre avant', calc.Vb_front.toFixed(1), 'L');
      add('Vol. chambre arrière', calc.Vb_back.toFixed(1), 'L');
      add('Fréq. basse (−3dB)', Math.round(calc.f_low), 'Hz');
      add('Fréq. haute (−3dB)', Math.round(calc.f_high), 'Hz');
    }
    if (numSubs === 2) {
      add('Configuration', doubleSubMode === 'isobaric' ? 'Isobarique' : 'Parallèle', '', 'warn');
    }

    // Dimensions
    const { external: ext, internal: int } = dims;
    const dimsEl = document.getElementById('dims-table');
    const row = (l, v, u) =>
      `<div class="dim-row"><span class="dim-label">${l}</span><span class="dim-val">${v}<span> ${u}</span></span></div>`;

    dimsEl.innerHTML =
      `<div class="dims-section-title">Externe (panneaux inclus)</div>` +
      row('Largeur (W)', ext.W.toFixed(0), 'cm') +
      row('Hauteur (H)', ext.H.toFixed(0), 'cm') +
      row('Profondeur (D)', ext.D.toFixed(0), 'cm') +
      row('Volume ext.', ((ext.W * ext.H * ext.D) / 1000).toFixed(1), 'L') +
      `<div class="dims-section-title" style="margin-top:.5rem">Interne</div>` +
      row('Largeur int.', int.W.toFixed(0), 'cm') +
      row('Hauteur int.', int.H.toFixed(0), 'cm') +
      row('Profondeur int.', int.D.toFixed(0), 'cm');

    if (type === 'ported') {
      dimsEl.innerHTML +=
        `<div class="dims-section-title" style="margin-top:.5rem">Évent</div>` +
        row('Diamètre évent', portDiam_mm, 'mm') +
        row('Longueur évent', portLen_cm.toFixed(1), 'cm') +
        row('Nombre d\'évents', calc.portCount || 1, '');
    }

    // Avertissements
    const warns = [];
    if (this._results.Qts > 0.5 && type === 'ported')
      warns.push('Qts > 0.5 : le caisson clos est plus adapté.');
    if (this._results.Qts < 0.25 && type === 'sealed')
      warns.push('Qts < 0.25 : un caisson évent sera plus efficace.');
    if (type === 'ported' && portLen_cm < 5)
      warns.push('Évent très court (< 5 cm) : risque de chuffing. Augmentez le diamètre.');
    if (type === 'ported' && portLen_cm > 80)
      warns.push('Évent très long (> 80 cm) : utilisez 2 évents ou un diamètre plus grand.');
    if (calc.Vb > 300)
      warns.push('Volume très important (> 300 L) : vérifiez vos paramètres T/S.');
    if (numSubs === 2 && doubleSubMode === 'isobaric')
      warns.push('Isobarique : le 2ème HP est monté face contre face à l\'intérieur. Volume réduit de moitié.');

    const wEl = document.getElementById('warnings-box');
    if (warns.length) {
      wEl.classList.remove('hidden');
      wEl.innerHTML = `<ul>${warns.map(w => `<li>${w}</li>`).join('')}</ul>`;
    } else {
      wEl.classList.add('hidden');
    }

    // Graphe fréquence
    const cvs = document.getElementById('freq-chart');
    if (!this._chart) this._chart = new FrequencyChart(cvs);
    this._chart.draw(type, calc);
  }

  // ── 3D ───────────────────────────────────────────────────
  _render3D() {
    const canvas = document.getElementById('three-canvas');
    if (!this._viewer) this._viewer = new EnclosureViewer(canvas);
    const { type, calc, dims, diameter, portDiam_mm, portLen_cm, numSubs } = this._results;
    this._viewer.build(type, dims, numSubs, diameter, portDiam_mm, portLen_cm);
  }

  // ── Boutons ───────────────────────────────────────────────
  _bindButtons() {
    document.getElementById('btn-wireframe')?.addEventListener('click', e => {
      if (!this._viewer) return;
      e.currentTarget.classList.toggle('active', this._viewer.toggleWireframe());
    });
    document.getElementById('btn-reset-cam')?.addEventListener('click', () => this._viewer?.resetCamera());
    document.getElementById('btn-copy')?.addEventListener('click', () => {
      if (!this._results) return;
      const { calc, dims, type, portDiam_mm } = this._results;
      const e = dims.external;
      let t = `=== Caisson de basse (${type}) ===\n`;
      t += `Volume : ${calc.Vb.toFixed(1)} L\n`;
      t += `Ext. : ${e.W.toFixed(0)} × ${e.H.toFixed(0)} × ${e.D.toFixed(0)} cm\n`;
      if (type === 'sealed') t += `Fc=${Math.round(calc.Fc)}Hz  Qtc=${calc.Qtc.toFixed(3)}  f3=${Math.round(calc.f3)}Hz\n`;
      if (type === 'ported') t += `Fb=${Math.round(calc.Fb)}Hz  f3=${Math.round(calc.f3)}Hz  Évent: Ø${portDiam_mm}mm × ${calc.portLen?.toFixed(1)}cm\n`;
      navigator.clipboard.writeText(t).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2500);
      });
    });
  }

  _bindResize() {
    const ro  = new ResizeObserver(() => this._viewer?.resize());
    const cnt = document.getElementById('viewer-container');
    if (cnt) ro.observe(cnt);
  }
}

// ── Bootstrap ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => new App());
