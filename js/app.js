import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================
//  CALCULATOR — Thiele-Small physics
// ============================================================
class Calculator {

  /** Sealed (clos) enclosure */
  static sealed(Fs, Qts, Vas, Qtc = 0.707) {
    if (Qtc <= Qts)
      throw new Error(`Qtc (${Qtc}) doit être > Qts (${Qts})`);

    const alpha = (Qtc / Qts) ** 2 - 1;   // Vas/Vb
    const Vb   = Vas / alpha;              // litres
    const Fc   = Fs * (Qtc / Qts);        // Hz
    // -3 dB frequency (2nd order high-pass)
    const a    = 2 - 1 / (Qtc * Qtc);
    const f3   = Fc * Math.sqrt((a + Math.sqrt(a * a + 4)) / 2);

    return { Vb, Fc, Qtc, f3, alpha };
  }

  /** Ported (évent) enclosure — simplified Thiele alignment */
  static ported(Fs, Qts, Vas, Fb_target = null) {
    // Volume using empirical formula (valid ~0.2 ≤ Qts ≤ 0.6)
    const Vb = Math.max(Vas * 20 * Math.pow(Qts, 3.3), Vas * 0.1);
    const Fb = Fb_target || (0.707 * Fs);

    // System Q at box tuning (approximation)
    const alpha = Vas / Vb;
    const Qb    = Qts * Math.sqrt(1 + alpha);
    // f(-3dB) ≈ Fb for well-tuned system
    const f3    = Fb * 0.9;

    return { Vb, Fb, Qb, f3, alpha };
  }

  /** Port (évent) length — Helmholtz resonator */
  static portLength(Fb, Vb_liters, portDiam_mm, numPorts = 1) {
    const r     = (portDiam_mm / 2) / 10; // cm
    const A     = Math.PI * r * r;         // cm²
    const Vb_cm3 = (Vb_liters * 1000) / numPorts;
    const c     = 34400; // cm/s

    // Lp = (c² × A) / (4π² × Fb² × Vb) − 0.73 × Dp
    const Le = (c * c * A) / (4 * Math.PI ** 2 * Fb * Fb * Vb_cm3);
    const Lp = Le - 0.73 * (portDiam_mm / 10);
    return Math.max(Lp, 2); // minimum 2 cm
  }

  /** Bandpass 4th-order approximation */
  static bandpass(Fs, Qts, Vas, ratio = 0.6) {
    // Front sealed chamber
    const Qtc_front = 0.707;
    const alpha_f   = (Qtc_front / Qts) ** 2 - 1;
    const Vb_front  = Vas / alpha_f;
    // Back ported chamber
    const Vb_back   = Vb_front / ratio;
    const Fb        = Fs * 0.85;
    const bw        = Fs * 1.4; // approx bandwidth (-3dB)

    return {
      Vb_front,
      Vb_back,
      Vb: Vb_front + Vb_back,
      Fb,
      f_low:  Fb * 0.7,
      f_high: bw,
    };
  }

  /** Box external dimensions from internal volume */
  static boxDimensions(Vb_liters, driverDiam_mm, panelThick_mm = 18) {
    const Vb_cm3  = Vb_liters * 1000;
    const d_cm    = driverDiam_mm / 10;
    const t       = panelThick_mm / 10;

    // Minimum internal width: 120% of driver diameter
    const minW = d_cm * 1.2;

    // Try a W:H:D ≈ 1:1.4:0.8 aspect ratio
    let W = Math.max(Math.cbrt(Vb_cm3 / (1.4 * 0.8)), minW);
    let H = W * 1.4;
    let D = Vb_cm3 / (W * H);

    // If depth > height, increase proportions
    if (D > H) {
      W = Math.max(Math.cbrt(Vb_cm3 / 0.84), minW);
      H = W * 1.2;
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
    const ctx    = this.ctx;
    const W      = this.canvas.width;
    const H      = this.canvas.height;
    const pad    = { top: 16, right: 20, bottom: 36, left: 44 };
    const cw     = W - pad.left - pad.right;
    const ch     = H - pad.top  - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0c1829';
    ctx.fillRect(0, 0, W, H);

    // Frequency range: 10–500 Hz, log scale
    const fMin  = 10, fMax = 500;
    const dBMin = -40, dBMax = 6;

    const freqToX = f =>
      pad.left + (Math.log10(f / fMin) / Math.log10(fMax / fMin)) * cw;

    const dBToY = dB =>
      pad.top + ch - ((dB - dBMin) / (dBMax - dBMin)) * ch;

    // Grid
    ctx.strokeStyle = 'rgba(51,65,85,0.7)';
    ctx.lineWidth   = 1;

    // Horizontal dB lines
    for (const db of [-40, -30, -20, -10, -6, -3, 0, 3]) {
      const y = dBToY(db);
      ctx.beginPath();
      ctx.setLineDash(db === 0 ? [] : [4, 4]);
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cw, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.font      = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText((db >= 0 ? '+' : '') + db + ' dB', pad.left - 4, y + 4);
    }
    ctx.setLineDash([]);

    // Vertical frequency lines
    for (const f of [20, 30, 50, 80, 100, 150, 200, 300, 500]) {
      const x = freqToX(f);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(51,65,85,0.5)';
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + ch);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.font      = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f + ' Hz', x, pad.top + ch + 16);
    }

    // Compute response points
    const numPts  = 300;
    const freqs   = Array.from({ length: numPts }, (_, i) => {
      const t = i / (numPts - 1);
      return fMin * Math.pow(fMax / fMin, t);
    });

    const response = freqs.map(f => this._response(f, type, params));
    const maxResp  = Math.max(...response);

    // -3 dB line
    const db3y = dBToY(-3);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(245,158,11,0.5)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([6, 4]);
    ctx.moveTo(pad.left, db3y);
    ctx.lineTo(pad.left + cw, db3y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Response curve
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth   = 2.5;
    ctx.shadowColor  = 'rgba(6,182,212,0.5)';
    ctx.shadowBlur   = 6;

    let started = false;
    freqs.forEach((f, i) => {
      const dB = response[i] - maxResp; // normalize to 0 dB max
      if (dB < dBMin - 2) return;
      const x = freqToX(f);
      const y = dBToY(Math.max(dB, dBMin));
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill under the curve
    ctx.lineTo(freqToX(fMax), dBToY(dBMin));
    ctx.lineTo(pad.left, dBToY(dBMin));
    ctx.closePath();
    ctx.fillStyle = 'rgba(6,182,212,0.07)';
    ctx.fill();

    // Marker: tuning/system frequency
    const markerFreq = type === 'sealed' ? params.Fc : params.Fb;
    if (markerFreq) {
      const mx = freqToX(markerFreq);
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.moveTo(mx, pad.top);
      ctx.lineTo(mx, pad.top + ch);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#10b981';
      ctx.font      = 'bold 10px monospace';
      ctx.textAlign = 'center';
      const label   = type === 'sealed' ? 'Fc' : 'Fb';
      ctx.fillText(`${label} ${Math.round(markerFreq)}Hz`, mx, pad.top + 10);
    }

    // Marker: f3
    if (params.f3) {
      const f3x = freqToX(params.f3);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(245,158,11,0.7)';
      ctx.lineWidth   = 1;
      ctx.moveTo(f3x, db3y - 6);
      ctx.lineTo(f3x, db3y + 6);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.font      = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`f3 ${Math.round(params.f3)}Hz`, f3x, db3y - 10);
    }
  }

  _response(f, type, params) {
    if (type === 'sealed') {
      const { Fc, Qtc } = params;
      const Ω = f / Fc;
      return 20 * Math.log10(
        (Ω * Ω) / Math.sqrt((1 - Ω * Ω) ** 2 + (Ω / Qtc) ** 2)
      );
    }

    if (type === 'ported') {
      const { Fb, Qb = 0.707 } = params;
      // Approximate 4th-order high-pass using two 2nd-order stages
      const Ω1 = f / Fb;
      const Q1 = 0.5, Q2 = 0.5 * Qb;
      const H1 = (Ω1 * Ω1) / Math.sqrt((1 - Ω1 * Ω1) ** 2 + (Ω1 / Q1) ** 2);
      const H2 = (Ω1 * Ω1) / Math.sqrt((1 - Ω1 * Ω1) ** 2 + (Ω1 / Q2) ** 2);
      return 20 * Math.log10(Math.max(H1 * H2, 1e-10));
    }

    if (type === 'bandpass') {
      const { f_low, f_high } = params;
      const Fc_mid = Math.sqrt(f_low * f_high);
      const Ω     = f / Fc_mid;
      const bw    = f_high / Fc_mid;
      const Q     = Fc_mid / (f_high - f_low);
      const H     = (Ω / Q) / Math.sqrt((1 - Ω * Ω) ** 2 + (Ω / Q) ** 2);
      return 20 * Math.log10(Math.max(H, 1e-10));
    }

    return -60;
  }
}

// ============================================================
//  3D VIEWER — Three.js
// ============================================================
class EnclosureViewer {
  constructor(canvas) {
    this.canvas  = canvas;
    this.running = false;
    this._wireframe = false;
    this._initScene();
    this._initLights();
    this._initControls();
    this._addEnvironment();
    this._startLoop();
  }

  _initScene() {
    const w = this.canvas.clientWidth  || 800;
    const h = this.canvas.clientHeight || 500;

    this.renderer = new THREE.WebGLRenderer({
      canvas:    this.canvas,
      antialias: true,
      alpha:     false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1829);
    this.scene.fog = new THREE.Fog(0x0c1829, 3.5, 8);

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.01, 20);
    this.camera.position.set(0.7, 0.55, 1.0);

    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  _initLights() {
    const ambient = new THREE.AmbientLight(0xcce0ff, 0.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff8f0, 1.2);
    sun.position.set(2, 4, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far  = 10;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x4477aa, 0.5);
    fill.position.set(-3, 1, -2);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x00d4ff, 0.3);
    rim.position.set(0, -2, -3);
    this.scene.add(rim);
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping  = true;
    this.controls.dampingFactor  = 0.06;
    this.controls.minDistance    = 0.25;
    this.controls.maxDistance    = 4;
    this.controls.autoRotate     = true;
    this.controls.autoRotateSpeed = 0.8;
  }

  _addEnvironment() {
    // Floor grid
    const grid = new THREE.GridHelper(6, 60, 0x1e3a5f, 0x152035);
    grid.position.y = -0.6;
    this.scene.add(grid);
    this._grid = grid;
  }

  /** Build the 3D enclosure */
  build(type, dims, driverDiam_mm, portDiam_mm, portLen_cm) {
    // Clear previous
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      if (child.geometry) child.geometry.dispose();
      this.group.remove(child);
    }

    const { W, H, D } = dims.external; // cm → convert to meters
    const w = W / 100, h = H / 100, d = D / 100;
    const t = 0.018; // panel thickness 18 mm in metres

    // Move grid below box
    this._grid.position.y = -h / 2 - 0.005;

    // Adjust camera distance based on box size
    const maxDim = Math.max(w, h, d);
    this.camera.position.set(maxDim * 1.7, maxDim * 1.2, maxDim * 2.2);
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // ── Materials ──
    const woodMat = new THREE.MeshStandardMaterial({
      color:     0x8B6325,
      roughness: 0.82,
      metalness: 0.0,
    });
    const woodFront = new THREE.MeshStandardMaterial({
      color:     0x7A5620,
      roughness: 0.78,
      metalness: 0.0,
    });

    // ── Panels: back, left, right, top, bottom ──
    const panels = [
      // back
      { size: [w,       h,       t],         pos: [0,          0,          -d/2 + t/2] },
      // left
      { size: [t,       h,       d - 2*t],   pos: [-w/2 + t/2, 0,          0]          },
      // right
      { size: [t,       h,       d - 2*t],   pos: [w/2  - t/2, 0,          0]          },
      // top
      { size: [w,       t,       d - t],     pos: [0,          h/2 - t/2,  -t/2]       },
      // bottom
      { size: [w,       t,       d - t],     pos: [0,          -h/2 + t/2, -t/2]       },
    ];

    panels.forEach(({ size, pos }) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...size),
        woodMat
      );
      mesh.position.set(...pos);
      mesh.castShadow = mesh.receiveShadow = true;
      this.group.add(mesh);
    });

    // ── Front panel with speaker (and port) hole ──
    const driverR   = (driverDiam_mm / 2) / 1000; // m
    const portR     = portDiam_mm ? (portDiam_mm / 2) / 1000 : 0;
    const portY_offset = -h * 0.22;

    this._buildFrontPanel(w, h, t, d, driverR,
      type === 'ported' ? portR : 0,
      portY_offset, woodFront);

    // ── Speaker driver ──
    this._buildSpeaker(driverR, d / 2, 0, h * 0.1);

    // ── Port tube ──
    if (type === 'ported' && portR > 0) {
      const portLen_m = (portLen_cm || 20) / 100;
      this._buildPort(portR, portLen_m, d / 2, 0, portY_offset);
    }

    // ── Store material refs for wireframe toggle ──
    this._materials = [woodMat, woodFront];
    this._applyWireframe(this._wireframe);
  }

  _buildFrontPanel(w, h, t, d, speakerR, portR, portY, mat) {
    const shape = new THREE.Shape();
    shape.moveTo(-w/2, -h/2);
    shape.lineTo( w/2, -h/2);
    shape.lineTo( w/2,  h/2);
    shape.lineTo(-w/2,  h/2);
    shape.closePath();

    // Speaker cutout
    const speakerHole = new THREE.Path();
    speakerHole.absarc(0, h * 0.1, speakerR, 0, Math.PI * 2, true);
    shape.holes.push(speakerHole);

    // Port cutout
    if (portR > 0) {
      const portHole = new THREE.Path();
      portHole.absarc(0, portY, portR, 0, Math.PI * 2, true);
      shape.holes.push(portHole);
    }

    const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, d / 2 - t);
    mesh.castShadow = mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  _buildSpeaker(radius, faceZ, cx, cy) {
    const z = faceZ + 0.001;

    // Outer ring / frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.6 });
    const frameGeo = new THREE.RingGeometry(radius * 0.86, radius, 72);
    const frame    = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(cx, cy, z);
    this.group.add(frame);

    // Surround (torus)
    const surroundMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const surround    = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.88, radius * 0.065, 16, 72),
      surroundMat
    );
    surround.position.set(cx, cy, z - 0.002);
    this.group.add(surround);

    // Cone
    const coneMat = new THREE.MeshStandardMaterial({
      color:     0x374151,
      roughness: 0.95,
      side:      THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 0.82, 0.05, 72, 1, true),
      coneMat
    );
    cone.rotation.x = Math.PI / 2;
    cone.position.set(cx, cy, z - 0.025);
    this.group.add(cone);

    // Dust cap
    const dustMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const dust    = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.22, 48), dustMat);
    dust.position.set(cx, cy, z + 0.002);
    this.group.add(dust);

    // Basket bolts (4 small cylinders)
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const bx    = cx + Math.cos(angle) * radius * 0.94;
      const by    = cy + Math.sin(angle) * radius * 0.94;
      const bolt  = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.003, 0.012, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 })
      );
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(bx, by, z - 0.003);
      this.group.add(bolt);
    }
  }

  _buildPort(radius, length, faceZ, cx, cy) {
    const portMat = new THREE.MeshStandardMaterial({
      color:     0x1e293b,
      roughness: 0.7,
      metalness: 0.1,
    });
    // Outer tube
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 48),
      portMat
    );
    tube.rotation.x = Math.PI / 2;
    tube.position.set(cx, cy, faceZ - length / 2);
    this.group.add(tube);

    // Inner dark opening
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x050b14 });
    const inner    = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.93, 48),
      innerMat
    );
    inner.position.set(cx, cy, faceZ + 0.002);
    this.group.add(inner);
  }

  toggleWireframe() {
    this._wireframe = !this._wireframe;
    this._applyWireframe(this._wireframe);
    return this._wireframe;
  }

  _applyWireframe(state) {
    this.group.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material)
          ? child.material : [child.material];
        mats.forEach(m => { m.wireframe = state; });
      }
    });
  }

  resetCamera() {
    this.camera.position.set(0.7, 0.55, 1.0);
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
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }
}

// ============================================================
//  PRESETS
// ============================================================
const PRESETS = {
  sub10: { Fs: 42, Qts: 0.40, Qes: 0.48, Qms: 3.2, Vas: 22,  Xmax: 9,  Re: 3.5, diameter: 250, power: 250 },
  sub12: { Fs: 35, Qts: 0.35, Qes: 0.40, Qms: 3.5, Vas: 40,  Xmax: 12, Re: 3.2, diameter: 305, power: 400 },
  sub15: { Fs: 28, Qts: 0.30, Qes: 0.34, Qms: 3.8, Vas: 80,  Xmax: 16, Re: 2.8, diameter: 380, power: 600 },
  sub18: { Fs: 22, Qts: 0.27, Qes: 0.31, Qms: 4.1, Vas: 140, Xmax: 20, Re: 2.4, diameter: 460, power: 1000 },
};

// ============================================================
//  APP CONTROLLER
// ============================================================
class App {
  constructor() {
    this._viewer  = null;
    this._chart   = null;
    this._results = null;

    this._bindPreset();
    this._bindTabs();
    this._bindCalculate();
    this._bindButtons();
    this._bindResize();
  }

  // ── Presets ──────────────────────────────────────────────
  _bindPreset() {
    document.getElementById('preset-select').addEventListener('change', e => {
      const p = PRESETS[e.target.value];
      if (!p) return;
      Object.entries(p).forEach(([key, val]) => {
        const el = document.getElementById(key);
        if (el) el.value = val;
      });
    });
  }

  // ── Tabs (enclosure type) ─────────────────────────────────
  _bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.type-options').forEach(o => o.classList.add('hidden'));
        const type = btn.dataset.type;
        document.getElementById(`opts-${type}`)?.classList.remove('hidden');
        this._activeType = type;
      });
    });
    this._activeType = 'sealed';
  }

  // ── Calculate ────────────────────────────────────────────
  _bindCalculate() {
    document.getElementById('btn-calculate').addEventListener('click', () => {
      try {
        this._calculate();
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
    });
  }

  _getNum(id) {
    const val = parseFloat(document.getElementById(id).value);
    if (isNaN(val)) throw new Error(`Valeur manquante pour "${id}"`);
    return val;
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

    let calc, panelThick, portDiam_mm = 0, portLen_cm = 0, portCount = 1;

    if (type === 'sealed') {
      const Qtc  = this._getNum('Qtc');
      panelThick = this._getNum('panel-thick-sealed');
      calc       = Calculator.sealed(Fs, Qts, Vas, Qtc);

    } else if (type === 'ported') {
      const Fb_input = parseFloat(document.getElementById('Fb').value);
      const Fb_val   = isNaN(Fb_input) ? null : Fb_input;
      portDiam_mm    = this._getNum('port-diam');
      portCount      = parseInt(document.getElementById('port-count').value) || 1;
      panelThick     = this._getNum('panel-thick-ported');
      calc           = Calculator.ported(Fs, Qts, Vas, Fb_val);
      portLen_cm     = Calculator.portLength(calc.Fb, calc.Vb, portDiam_mm, portCount);
      calc.portLen   = portLen_cm;
      calc.portDiam  = portDiam_mm;
      calc.portCount = portCount;

    } else { // bandpass
      const ratio = this._getNum('bp-ratio');
      panelThick  = this._getNum('panel-thick-bp');
      calc        = Calculator.bandpass(Fs, Qts, Vas, ratio);
    }

    const dims = Calculator.boxDimensions(calc.Vb, diameter, panelThick);

    this._results = { type, calc, dims, Fs, Qts, Vas, Xmax, diameter, power, portDiam_mm, portLen_cm };

    this._renderResults();
    this._render3D();

    document.getElementById('section-results').classList.remove('hidden');
    document.getElementById('section-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Render results panel ─────────────────────────────────
  _renderResults() {
    const { type, calc, dims, Fs, Qts, Xmax, diameter, power, portDiam_mm, portLen_cm } = this._results;

    // Metrics
    const metricsEl = document.getElementById('metrics-grid');
    metricsEl.innerHTML = '';

    const addMetric = (label, value, unit, cls = '') => {
      metricsEl.innerHTML += `
        <div class="metric-card ${cls}">
          <div class="metric-label">${label}</div>
          <div class="metric-value">${value}<span class="metric-unit"> ${unit}</span></div>
        </div>`;
    };

    addMetric('Volume interne', calc.Vb.toFixed(1), 'L', 'highlight');

    if (type === 'sealed') {
      addMetric('Fréquence système (Fc)', Math.round(calc.Fc), 'Hz');
      addMetric('Qtc système', calc.Qtc.toFixed(3));
      addMetric('Fréq. −3 dB (f3)', Math.round(calc.f3), 'Hz', 'highlight');
    } else if (type === 'ported') {
      addMetric('Accord évent (Fb)', Math.round(calc.Fb), 'Hz', 'highlight');
      addMetric('Qtb système', calc.Qb.toFixed(3));
      addMetric('Fréq. −3 dB (f3)', Math.round(calc.f3), 'Hz');
      addMetric('Longueur évent', portLen_cm.toFixed(1), 'cm');
    } else {
      addMetric('Vol. chambre avant', calc.Vb_front.toFixed(1), 'L');
      addMetric('Vol. chambre arrière', calc.Vb_back.toFixed(1), 'L');
      addMetric('Bande passante basse', Math.round(calc.f_low), 'Hz');
      addMetric('Bande passante haute', Math.round(calc.f_high), 'Hz');
    }

    // Dimensions table
    const { external: ext, internal: int } = dims;
    const dimsEl = document.getElementById('dims-table');
    const row = (label, val, unit) =>
      `<div class="dim-row"><span class="dim-label">${label}</span><span class="dim-val">${val}<span>${unit}</span></span></div>`;

    dimsEl.innerHTML =
      '<div style="font-size:0.72rem;color:var(--accent);margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:0.06em">Externe (avec panneaux)</div>' +
      row('Largeur (W)', ext.W.toFixed(1), ' cm') +
      row('Hauteur (H)', ext.H.toFixed(1), ' cm') +
      row('Profondeur (D)', ext.D.toFixed(1), ' cm') +
      row('Volume ext.', ((ext.W * ext.H * ext.D) / 1000).toFixed(1), ' L') +
      '<div style="font-size:0.72rem;color:var(--muted);margin:0.5rem 0 0.3rem;text-transform:uppercase;letter-spacing:0.06em">Interne</div>' +
      row('Largeur int.', int.W.toFixed(1), ' cm') +
      row('Hauteur int.', int.H.toFixed(1), ' cm') +
      row('Profondeur int.', int.D.toFixed(1), ' cm');

    if (type === 'ported') {
      dimsEl.innerHTML +=
        '<div style="font-size:0.72rem;color:var(--accent);margin:0.5rem 0 0.3rem;text-transform:uppercase;letter-spacing:0.06em">Évent</div>' +
        row('Diamètre évent', portDiam_mm, ' mm') +
        row('Longueur évent', portLen_cm.toFixed(1), ' cm') +
        row('Nombre d\'évents', this._results.calc.portCount || 1, '');
    }

    // Warnings
    const warnings = [];
    if (Qts > 0.5 && type === 'ported')
      warnings.push('Qts élevé (> 0.5) : le caisson évent est moins adapté, préférez un caisson clos.');
    if (Qts < 0.25 && type === 'sealed')
      warnings.push('Qts faible (< 0.25) : un caisson évent sera plus efficace.');
    if (type === 'ported' && portLen_cm < 5)
      warnings.push('Évent très court (< 5 cm) : risque de bruit d\'air, augmentez le diamètre.');
    if (type === 'ported' && portLen_cm > 80)
      warnings.push('Évent très long (> 80 cm) : difficile à loger, utilisez 2 évents ou augmentez le diamètre.');
    if (calc.Vb > 200)
      warnings.push('Volume très important (> 200 L) : vérifiez vos paramètres T/S.');

    const warnEl = document.getElementById('warnings-box');
    if (warnings.length > 0) {
      warnEl.classList.remove('hidden');
      warnEl.innerHTML = `<ul>${warnings.map(w => `<li>${w}</li>`).join('')}</ul>`;
    } else {
      warnEl.classList.add('hidden');
    }

    // Chart
    const chartCanvas = document.getElementById('freq-chart');
    if (!this._chart) this._chart = new FrequencyChart(chartCanvas);
    this._chart.draw(type, calc);
  }

  // ── 3D Viewer ────────────────────────────────────────────
  _render3D() {
    const canvas = document.getElementById('three-canvas');
    if (!this._viewer) {
      this._viewer = new EnclosureViewer(canvas);
    }

    const { type, calc, dims, diameter, portDiam_mm, portLen_cm } = this._results;
    this._viewer.build(type, dims, diameter, portDiam_mm, portLen_cm);
  }

  // ── Buttons ───────────────────────────────────────────────
  _bindButtons() {
    document.getElementById('btn-wireframe').addEventListener('click', e => {
      if (!this._viewer) return;
      const on = this._viewer.toggleWireframe();
      e.currentTarget.classList.toggle('active', on);
    });

    document.getElementById('btn-reset-cam').addEventListener('click', () => {
      this._viewer?.resetCamera();
    });

    document.getElementById('btn-copy').addEventListener('click', () => {
      if (!this._results) return;
      const { calc, dims, type } = this._results;
      const { external: ext } = dims;
      let text = `=== Caisson de basse (${type}) ===\n`;
      text += `Volume : ${calc.Vb.toFixed(1)} L\n`;
      text += `Dimensions externes : ${ext.W.toFixed(0)} × ${ext.H.toFixed(0)} × ${ext.D.toFixed(0)} mm\n`;
      if (type === 'sealed') text += `Fc : ${Math.round(calc.Fc)} Hz | f3 : ${Math.round(calc.f3)} Hz | Qtc : ${calc.Qtc.toFixed(3)}\n`;
      if (type === 'ported') text += `Fb : ${Math.round(calc.Fb)} Hz | f3 : ${Math.round(calc.f3)} Hz | Évent : Ø${this._results.portDiam_mm}mm × ${calc.portLen?.toFixed(1)}cm\n`;

      navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2500);
      });
    });
  }

  // ── Resize ────────────────────────────────────────────────
  _bindResize() {
    const ro = new ResizeObserver(() => this._viewer?.resize());
    const container = document.getElementById('viewer-container');
    if (container) ro.observe(container);
  }
}

// ── Bootstrap ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => new App());
