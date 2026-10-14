// ============================================================
//  VUE 3D — Three.js. Rend les pièces calculées par geometry.js
//  (mêmes cotes que le plan de découpe). Unités : cm → m.
// ============================================================

const VIEWER = (() => {

  const S   = 0.01;           // cm → m
  const BG  = 0x061a0a;
  const WALL = 0.4;

  class EnclosureViewer {
    constructor(canvas) {
      this.canvas = canvas;
      this.xray = false;
      this.wire = false;

      const w = canvas.clientWidth || 800, h = canvas.clientHeight || 500;
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(w, h, false);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(BG);
      this.camera = new THREE.PerspectiveCamera(38, w / h, 0.01, 30);

      this.scene.add(new THREE.HemisphereLight(0xfff6e0, 0x0b2a12, 0.9));
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(2.5, 4, 3);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      this.scene.add(key);
      this.key = key;
      const rim = new THREE.DirectionalLight(0xffd36b, 0.5);
      rim.position.set(-3, 1.5, -2.5);
      this.scene.add(rim);

      this.floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.ShadowMaterial({ opacity: 0.35 }));
      this.floor.rotation.x = -Math.PI / 2;
      this.floor.receiveShadow = true;
      this.scene.add(this.floor);
      this.grid = new THREE.GridHelper(8, 80, 0x1e6e2e, 0x0f3a18);
      this.scene.add(this.grid);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.autoRotate = true;
      this.controls.autoRotateSpeed = 0.7;
      this.controls.addEventListener('start', () => { this.controls.autoRotate = false; });

      this.group = new THREE.Group();
      this.scene.add(this.group);

      const loop = () => {
        requestAnimationFrame(loop);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
      };
      loop();
    }

    // ── Matériaux ───────────────────────────────────────────────
    _mats() {
      const wood = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
      return {
        panel: wood(0xa98250),
        front: wood(0x9a7444),
        port:  wood(0x8a6034),
        edge:  new THREE.LineBasicMaterial({ color: 0x2b1a08, transparent: true, opacity: 0.55 }),
        pvc:   new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.5, side: THREE.DoubleSide }),
        air:   new THREE.MeshBasicMaterial({ color: 0x36d6ff, transparent: true, opacity: 0.22, depthWrite: false }),
        metal: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.85, roughness: 0.3 }),
        black: new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6 }),
        cone:  new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.75, side: THREE.DoubleSide }),
        rubber:new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.95 }),
      };
    }

    _clear() {
      this.group.traverse(o => {
        o.geometry?.dispose();
        if (o.material && !Array.isArray(o.material)) o.material.dispose();
      });
      this.group.clear();
    }

    _add(geo, mat, pos, opts = {}) {
      const m = new THREE.Mesh(geo, mat);
      if (pos) m.position.set(...pos);
      m.castShadow = opts.shadow ?? true;
      m.receiveShadow = true;
      this.group.add(m);
      if (opts.edges) {
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), this.m.edge);
        e.position.copy(m.position);
        this.group.add(e);
      }
      return m;
    }

    // ── Construction ────────────────────────────────────────────
    build(geo) {
      this._clear();
      this.m = this._mats();
      const m = this.m;
      this.woodMats = [m.panel, m.front, m.port];

      for (const p of geo.parts) {
        const mat = p.role === 'port' ? m.port : (p.kind === 'holed' ? m.front : m.panel);
        if (p.kind === 'box') {
          this._add(new THREE.BoxGeometry(p.size[0] * S, p.size[1] * S, p.size[2] * S), mat,
                    p.pos.map(v => v * S), { edges: true });
        } else {
          const shape = new THREE.Shape();
          shape.moveTo(-p.w / 2 * S, -p.h / 2 * S);
          shape.lineTo( p.w / 2 * S, -p.h / 2 * S);
          shape.lineTo( p.w / 2 * S,  p.h / 2 * S);
          shape.lineTo(-p.w / 2 * S,  p.h / 2 * S);
          shape.closePath();
          for (const h of p.holes) {
            const hole = new THREE.Path();
            hole.absarc(h.x * S, h.y * S, h.r * S, 0, Math.PI * 2, true);
            shape.holes.push(hole);
          }
          const g = new THREE.ExtrudeGeometry(shape, { depth: p.thick * S, bevelEnabled: false, curveSegments: 48 });
          g.translate(0, 0, -p.thick * S / 2);
          this._add(g, mat, p.pos.map(v => v * S), { edges: true });
        }
      }

      for (const d of geo.drivers) this._driver(d);
      for (const t of geo.tubes) this._tube(t);

      this.airMeshes = geo.air.map(a =>
        this._add(new THREE.BoxGeometry(a.size[0] * S, a.size[1] * S, a.size[2] * S), m.air,
                  a.pos.map(v => v * S), { shadow: false }));

      // Sol, ombre, caméra
      const y0 = -geo.H / 2 * S;
      this.floor.position.y = y0 - 0.001;
      this.grid.position.y  = y0 - 0.002;
      const r = Math.hypot(geo.W, geo.H, geo.D) / 2 * S;
      this.key.shadow.camera.left = this.key.shadow.camera.bottom = -r * 2;
      this.key.shadow.camera.right = this.key.shadow.camera.top = r * 2;
      this.key.shadow.camera.updateProjectionMatrix();
      this.fitRadius = r;
      this.resetCamera();
      this._apply();
    }

    // HP vu de face (axe +z), monté sur le plan z
    _driver(d) {
      const m = this.m, R = d.rFrame * S, z = d.z * S, depth = d.depth * S;
      const g = new THREE.Group();
      // Saladier : couronne avec épaisseur
      const ring = new THREE.Shape();
      ring.absarc(0, 0, R, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, R * 0.9, 0, Math.PI * 2, true);
      ring.holes.push(hole);
      const flange = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: 0.006, bevelEnabled: false, curveSegments: 64 }), m.black);
      g.add(flange);
      // Suspension
      const sur = new THREE.Mesh(new THREE.TorusGeometry(R * 0.85, R * 0.05, 16, 72), m.rubber);
      sur.position.z = 0.002;
      g.add(sur);
      // Membrane (lathe)
      const coneD = R * 0.28;
      const prof = [new THREE.Vector2(R * 0.3, -coneD), new THREE.Vector2(R * 0.55, -coneD * 0.55), new THREE.Vector2(R * 0.8, -R * 0.02)];
      const cone = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), m.cone);
      cone.rotation.x = Math.PI / 2;
      g.add(cone);
      // Cache-noyau
      const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 0.32, 40, 16, 0, Math.PI * 2, 0, Math.PI / 3.2), m.black);
      cap.rotation.x = Math.PI / 2;
      cap.position.z = -coneD - R * 0.32 * Math.cos(Math.PI / 3.2) + R * 0.02;
      g.add(cap);
      // Châssis + moteur (visibles en vue intérieure)
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.85, R * 0.42, depth * 0.55, 32, 1, true), m.metal);
      basket.rotation.x = Math.PI / 2;   // grande ouverture vers l'avant
      basket.position.z = -depth * 0.275;
      g.add(basket);
      const magnet = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.5, R * 0.5, depth * 0.45, 40), m.black);
      magnet.rotation.x = Math.PI / 2;
      magnet.position.z = -depth * 0.775;
      g.add(magnet);
      // Vis
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const s = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.022, R * 0.022, 0.004, 10), m.metal);
        s.rotation.x = Math.PI / 2;
        s.position.set(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95, 0.007);
        g.add(s);
      }
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      g.position.set(d.x * S, d.y * S, z);
      this.group.add(g);
    }

    // Tube d'évent rond, droit ou coudé
    _tube(t) {
      const m = this.m;
      const P = (x, y, z) => new THREE.Vector3(x * S, y * S, z * S);
      const path = new THREE.CurvePath();
      const a = P(t.x, t.y, t.z0), b = P(t.x, t.y, t.z0 - t.s1);
      path.add(new THREE.LineCurve3(a, b));
      if (t.r > 0) {
        const zV  = t.z0 - t.s1 - t.r;
        const off = k => (t.axis === 'x' ? P(t.x + t.dir * k, t.y, zV) : P(t.x, t.y + t.dir * k, zV));
        const c = P(t.x, t.y, zV), e = off(t.r);
        path.add(new THREE.QuadraticBezierCurve3(b, c, e));
        if (t.s2 > 0.1) path.add(new THREE.LineCurve3(e, off(t.r + t.s2)));
      }
      const ro = (t.d / 2 + WALL) * S;
      this._add(new THREE.TubeGeometry(path, 96, ro, 40, false), m.pvc);
      const flare = new THREE.Mesh(new THREE.RingGeometry(t.d / 2 * S, ro + 0.012, 48), m.black);
      flare.position.set(t.x * S, t.y * S, t.z0 * S + 0.001);
      this.group.add(flare);
    }

    // ── Modes d'affichage ───────────────────────────────────────
    _apply() {
      for (const mat of this.woodMats ?? []) {
        mat.transparent = this.xray;
        mat.opacity     = this.xray ? 0.16 : 1;
        mat.depthWrite  = !this.xray;
        mat.wireframe   = this.wire;
        mat.needsUpdate = true;
      }
      for (const a of this.airMeshes ?? []) a.visible = this.xray;
    }

    toggleXray()      { this.xray = !this.xray; this._apply(); return this.xray; }
    toggleWireframe() { this.wire = !this.wire; this._apply(); return this.wire; }

    resetCamera() {
      const r = this.fitRadius ?? 0.4;
      const dist = r / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 1.15;
      const dir = new THREE.Vector3(0.9, 0.55, 1.35).normalize();
      this.camera.position.copy(dir.multiplyScalar(dist));
      this.camera.near = dist / 100;
      this.camera.far  = dist * 20;
      this.camera.updateProjectionMatrix();
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }

    resize() {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    }
  }

  return { EnclosureViewer };
})();
