// ============================================================
//  ACOUSTIQUE — modèle Thiele-Small en circuit équivalent
//  (domaine acoustique, Small 1972-73). Toutes les unités en SI
//  sauf mention contraire (litres, cm, mm à l'interface).
// ============================================================

const A = (() => {
  const RHO = 1.204;   // kg/m³ — air à 20 °C
  const C   = 343.2;   // m/s
  const P_REF      = 20e-6;   // Pa
  const K_AIR      = RHO * C * C;

  // ── Nombres complexes (minimal) ─────────────────────────────
  const cx  = (re, im = 0) => ({ re, im });
  const add = (a, b) => cx(a.re + b.re, a.im + b.im);
  const sub = (a, b) => cx(a.re - b.re, a.im - b.im);
  const mul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const scl = (a, k) => cx(a.re * k, a.im * k);
  const div = (a, b) => {
    const d = b.re * b.re + b.im * b.im;
    return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
  };
  const inv = a => div(cx(1), a);
  const mag = a => Math.hypot(a.re, a.im);

  // ── Estimations quand la fiche technique ne donne pas la valeur ──
  const estimate = {
    sd:       inch => 3.4 * inch * inch,                 // cm² (surface émissive)
    cutout:   mm   => Math.round(mm * 0.92),             // mm (découpe façade)
    depth:    mm   => Math.round(mm * 0.55),             // mm (profondeur de montage)
    disp:     inch => +(0.0014 * inch ** 3).toFixed(1),  // L  (volume déplacé)
  };

  const qtsOf = (qes, qms) => (qes * qms) / (qes + qms);

  /**
   * Paramètres dérivés d'un HP.
   * p : { fs, qes, qms, vas (L), re (Ω), sd (cm²), xmax (mm) }
   */
  function driverModel(p) {
    const vas = p.vas / 1000;
    const sd  = p.sd / 1e4;
    const ws  = 2 * Math.PI * p.fs;
    const Cas = vas / K_AIR;            // compliance acoustique
    const Mas = 1 / (ws * ws * Cas);    // masse acoustique
    const Ras = ws * Mas / p.qms;       // pertes mécaniques
    const Rae = ws * Mas / p.qes;       // amortissement électrique
    const Bl  = Math.sqrt(Rae * p.re * sd * sd);
    return {
      ...p, qts: qtsOf(p.qes, p.qms), sdM2: sd,
      Cas, Mas, Ras, Rae, Bl, Mms: Mas * sd * sd, xmaxM: p.xmax / 1000,
    };
  }

  /** Grille de fréquences logarithmique. */
  function logFreqs(fMin, fMax, n) {
    return Array.from({ length: n }, (_, i) => fMin * (fMax / fMin) ** (i / (n - 1)));
  }

  /**
   * Simulation complète du système.
   * cfg : {
   *   type: 'sealed'|'ported'|'bandpass', drv (driverModel),
   *   count: nb de HP, iso: montage isobarique (paire),
   *   power: W total ampli,
   *   vb (L) [clos/évent], fb (Hz) [évent/bandpass],
   *   vr, vf (L) [bandpass], portArea (m², total), ql (pertes caisson, 7 par défaut)
   * }
   * Renvoie SPL à 1 m en demi-espace, excursion par HP (mm), vitesse d'air
   * dans l'évent (m/s) et la réponse relative (dB) au niveau de référence
   * (niveau du HP en charge de masse, i.e. "plateau" haute fréquence).
   */
  function simulate(cfg, freqs) {
    const { drv } = cfg;
    const nPar   = cfg.iso ? 1 : cfg.count;
    const eDrv   = Math.sqrt((cfg.power / cfg.count) * drv.re);   // V par HP
    const pg     = eDrv * drv.Bl / (drv.sdM2 * drv.re);           // Pa
    const src    = cx(cfg.iso ? 2 * pg : pg);
    const masEq  = cfg.iso ? 2 * drv.Mas : drv.Mas / nPar;
    const pRef   = RHO * mag(src) / (2 * Math.PI * masEq);
    const splRef = 20 * Math.log10(pRef / P_REF);
    const ql     = cfg.ql ?? 7;

    const out = { f: freqs, spl: [], rel: [], xmm: [], vport: [], splRef };

    for (const f of freqs) {
      const w  = 2 * Math.PI * f;
      const jw = cx(0, w);
      let Zd = add(cx(drv.Rae + drv.Ras, w * drv.Mas), inv(scl(jw, drv.Cas)));
      Zd = cfg.iso ? scl(Zd, 2) : scl(Zd, 1 / nPar);

      let U, U0, Up = cx(0);
      if (cfg.type === 'sealed') {
        const Cab = cfg.vb / 1000 / K_AIR;
        U  = div(src, add(Zd, inv(scl(jw, Cab))));
        U0 = U;
      } else if (cfg.type === 'ported') {
        const Cab = cfg.vb / 1000 / K_AIR, wb = 2 * Math.PI * cfg.fb;
        const Map = 1 / (wb * wb * Cab), Ral = ql / (wb * Cab);
        const Zn  = inv(add(add(scl(jw, Cab), cx(1 / Ral)), inv(scl(jw, Map))));
        U  = div(src, add(Zd, Zn));
        Up = div(mul(U, Zn), scl(jw, Map));
        U0 = sub(U, Up);
      } else {
        const Car = cfg.vr / 1000 / K_AIR, Caf = cfg.vf / 1000 / K_AIR;
        const wb  = 2 * Math.PI * cfg.fb;
        const Map = 1 / (wb * wb * Caf), Ral = ql / (wb * Caf);
        const Zr  = inv(scl(jw, Car));
        const Zf  = inv(add(add(scl(jw, Caf), cx(1 / Ral)), inv(scl(jw, Map))));
        U  = div(src, add(add(Zd, Zr), Zf));
        Up = div(mul(U, Zf), scl(jw, Map));
        U0 = Up;
      }

      const p    = RHO * w * mag(U0) / (2 * Math.PI);
      const Udrv = cfg.iso ? U : scl(U, 1 / nPar);
      const spl  = 20 * Math.log10(Math.max(p, 1e-12) / P_REF);
      out.spl.push(spl);
      out.rel.push(spl - splRef);
      out.xmm.push(mag(Udrv) / (w * drv.sdM2) * 1000);
      out.vport.push(cfg.portArea ? mag(Up) / cfg.portArea : 0);
    }
    return out;
  }

  // ── Lecture des courbes ─────────────────────────────────────

  /** Interpolation (en log f) du passage d'une courbe sous `level`. */
  function crossing(f, y, i, level) {
    const t = (level - y[i]) / (y[i + 1] - y[i]);
    return f[i] * (f[i + 1] / f[i]) ** t;
  }

  /** f(-3 dB) basse pour clos / évent : on descend depuis 200 Hz. */
  function lowCutoff(sim, level = -3) {
    const { f, rel } = sim;
    let i = f.findIndex(v => v >= 200);
    if (i < 0) i = f.length - 1;
    for (; i > 0; i--) if (rel[i - 1] < level) return crossing(f, rel, i - 1, level);
    return f[0];
  }

  /** Bande passante d'un bandpass : -3 dB sous le pic. */
  function bandEdges(sim) {
    const { f, rel } = sim;
    let ip = 0;
    rel.forEach((v, i) => { if (v > rel[ip]) ip = i; });
    const lvl = rel[ip] - 3;
    let lo = f[0], hi = f[f.length - 1];
    for (let i = ip; i > 0; i--) if (rel[i - 1] < lvl) { lo = crossing(f, rel, i - 1, lvl); break; }
    for (let i = ip; i < f.length - 1; i++) if (rel[i + 1] < lvl) { hi = crossing(f, rel, i, lvl); break; }
    // Creux entre deux bosses (bandpass large à double bosse)
    const tops = [];
    for (let i = 1; i < f.length - 1; i++) {
      if (f[i] > lo && f[i] < hi && rel[i] >= rel[i - 1] && rel[i] >= rel[i + 1]) tops.push(i);
    }
    let dip = 0;
    if (tops.length >= 2) {
      for (let i = tops[0]; i <= tops[tops.length - 1]; i++) dip = Math.min(dip, rel[i] - rel[ip]);
    }
    return { peak: rel[ip], fPeak: f[ip], lo, hi, dip };
  }

  function maxIn(sim, key, fLo, fHi) {
    let best = { v: 0, f: fLo };
    sim.f.forEach((f, i) => {
      if (f >= fLo && f <= fHi && sim[key][i] > best.v) best = { v: sim[key][i], f };
    });
    return best;
  }

  // ── Conception (alignements) ────────────────────────────────

  /** Volume clos pour un Qtc visé. */
  function sealedVolume(qts, vasEq, qtc) {
    return vasEq / ((qtc / qts) ** 2 - 1);
  }

  /**
   * Volume évent "voiture" par HP selon la taille : pratique courante des
   * fabricants (MTX, GAS, Ground Zero recommandent 45–56 L pour un 12",
   * 80–90 L pour un 15", accordés vers 32–37 Hz), bien plus grand que
   * l'alignement T/S plat de ces HP à faible Vas.
   */
  function carPortedVolume(sizeInch) {
    const pts = [[6.5, 10], [8, 20], [10, 35], [12, 50], [15, 85], [18, 140]];
    if (sizeInch <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      if (sizeInch <= x1) return y0 + (y1 - y0) * (sizeInch - x0) / (x1 - x0);
    }
    return pts[pts.length - 1][1] * (sizeInch / 18) ** 3;
  }

  /** Volume évent par défaut (alignement Keele, proche QB3). */
  function portedDefaultVolume(qts, vasEq) {
    return 15 * vasEq * qts ** 2.87;
  }

  const FAST = logFreqs(10, 250, 140);

  /**
   * Accord optimal pour un volume donné : f3 la plus basse possible
   * sans bosse de plus de +1 dB au-dessus du plateau.
   * Jamais sous 28 Hz ni sous 0,8·Fs : plus bas, la réponse ne fait que
   * s'affaisser en pente douce et l'évent devient impossible à loger.
   */
  function optimizeFb(cfg) {
    const fs = cfg.drv.fs;
    let best = null, flattest = null;
    for (let fb = Math.max(0.8 * fs, 28); fb <= Math.max(2.2 * fs, 40); fb += 0.25) {
      const sim  = simulate({ ...cfg, type: 'ported', fb, power: 1 }, FAST);
      const peak = Math.max(...sim.rel);
      const f3   = lowCutoff(sim);
      if (peak <= 1.0 && (!best || f3 < best.f3)) best = { fb, f3 };
      if (!flattest || peak < flattest.peak) flattest = { fb, peak };
    }
    return +(best ?? flattest).fb.toFixed(1);
  }

  /**
   * Volume pour un accord imposé : celui qui donne la réponse la plus plate
   * (bosse minimale). Un accord plus haut que l'accord "plat" crée toujours
   * une petite bosse — c'est le réglage typique en voiture.
   */
  function optimizeVb(cfg, fb) {
    const vas = cfg.iso ? cfg.drv.vas / 2 : cfg.drv.vas * cfg.count;
    let best = null;
    for (let k = 0; k <= 120; k++) {
      const vb   = vas * 0.1 * 60 ** (k / 120);
      const sim  = simulate({ ...cfg, type: 'ported', vb, fb, power: 1 }, FAST);
      const peak = Math.max(...sim.rel);
      if (!best || peak < best.peak - 0.01) best = { vb, peak };
    }
    return +best.vb.toFixed(1);
  }

  /** Gain habitacle typique d'une voiture : +12 dB/oct sous ~fc, plafonné. */
  function cabinGain(f, fc = 55) {
    return Math.min(10 * Math.log10(1 + (fc / f) ** 4), 18);
  }

  /**
   * Bandpass 4e ordre : chambre arrière close fixée par Qtc, chambre avant
   * et accord choisis pour la bande la plus large et la plus basse, sans
   * creux de plus de 1,5 dB et avec un évent logeable sans souffle à pleine
   * puissance (fbFixed impose l'accord). Au-delà de 100 Hz la bande ne
   * compte plus : un caisson de basse n'y travaille pas.
   */
  function optimizeBandpass(cfg, qtcRear, fbFixed = null, mins = { vr: 0, vf: 0 }) {
    const vasEq = cfg.iso ? cfg.drv.vas / 2 : cfg.drv.vas * cfg.count;
    const vr = Math.max(sealedVolume(cfg.drv.qts, vasEq, qtcRear), mins.vr);
    const fc = cfg.drv.fs * Math.sqrt(1 + vasEq / vr);
    const vfLo = Math.max(vr * 0.25, mins.vf), vfHi = Math.max(vr * 4, vfLo * 2);
    const fbLo = Math.max(25, 0.6 * fc), fbHi = Math.max(Math.min(110, 2 * fc), fbLo * 1.5);
    let best = null, narrow = null, fallback = null;
    for (let k = 0; k < 22; k++) {
      const vf = vfLo * (vfHi / vfLo) ** (k / 21);
      const fbs = fbFixed ? [fbFixed] : Array.from({ length: 28 }, (_, j) => fbLo * (fbHi / fbLo) ** (j / 27));
      for (const fb of fbs) {
        const sim = simulate({ ...cfg, type: 'bandpass', vr, vf, fb, power: 1, portArea: 1 }, FAST);
        const e   = bandEdges(sim);
        if (e.dip < -1.5 || e.peak < -1) continue;     // pas de creux, pas de perte
        const top = Math.min(e.hi, 100);
        if (top / e.lo < 1.25) continue;               // trop étroit pour un sub
        // L'évent doit passer le débit d'air à pleine puissance (≤ 30 m/s)
        // en tenant dans la chambre avant : section ≤ 4,5 cm²/L, et tube
        // coudé de longueur ≤ profondeur de la chambre + hauteur de façade.
        let u = 0;
        sim.f.forEach((f, i) => { if (f >= 0.8 * fb && sim.vport[i] > u) u = sim.vport[i]; });
        const face  = mins.face ?? (vf * 1000) ** (2 / 3);
        const lMax  = Math.max(vf * 1000 / face + Math.sqrt(face) - 12, 10);
        const aMax  = Math.min(4.5 * vf, slotAreaForLength(fb, vf, lMax));
        const speed = u * Math.sqrt(cfg.power) / (aMax / 1e4);   // m/s avec l'évent le plus grand logeable
        const score = Math.log2(top / e.lo) + 0.08 * Math.min(e.peak, 6);
        const cand  = { score, speed, vr, vf, fb };
        // Priorité : bande ≥ 0,7 octave sans souffle ; sinon bande plus
        // étroite sans souffle ; sinon le moins de souffle possible.
        if (speed <= 30 && top / e.lo >= 1.6) { if (!best || score > best.score) best = cand; }
        else if (speed <= 30) { if (!narrow || score > narrow.score) narrow = cand; }
        else if (!fallback || speed < fallback.speed) fallback = cand;
      }
    }
    best ??= narrow ?? fallback ?? { vr, vf: Math.max(vr * 0.6, mins.vf), fb: fbFixed ?? fc };
    return { vr: best.vr, vf: best.vf, fb: +best.fb.toFixed(1) };
  }

  /**
   * Analyse complète à la puissance donnée.
   * fSub : coupure du filtre passe-haut (subsonique) supposé.
   */
  function analyze(cfg) {
    const sim = simulate(cfg, logFreqs(10, 300, 320));
    const fSub = cfg.type === 'sealed' ? 20 : Math.max(15, 0.8 * cfg.fb);
    const res = { sim, fSub };
    if (cfg.type === 'bandpass') {
      const e = bandEdges(sim);
      Object.assign(res, { f3: e.lo, fHigh: e.hi, gain: e.peak, fPeak: e.fPeak });
    } else {
      res.f3 = lowCutoff(sim);
      res.peak = Math.max(...sim.rel);
    }
    const x   = maxIn(sim, 'xmm', fSub, 200);
    const spl = maxIn(sim, 'spl', fSub, 200);
    const vp  = maxIn(sim, 'vport', fSub, 200);
    res.xMax     = x.v;
    res.xMaxF    = x.f;
    res.splMax   = spl.v;
    res.vPortMax = vp.v;
    res.vPortF   = vp.f;
    // Puissance pour atteindre Xmax (l'excursion varie en √P)
    res.pXmax = cfg.power * (cfg.drv.xmax / Math.max(x.v, 1e-6)) ** 2;
    return res;
  }

  /** Volume-vitesse max dans l'évent (m³/s) — sert à dimensionner sa section. */
  function portVolumeVelocity(cfg) {
    const a = analyze({ ...cfg, portArea: 1 });
    return a.vPortMax;   // avec Ap = 1 m², vitesse = débit
  }

  // ── Longueurs d'évent (formule de Helmholtz + corrections d'extrémité) ──
  // Correction 0,732·D : une extrémité affleurante (bride) + une libre.

  const helmholtzLeff = (fb, vbL, areaCm2) =>
    ((C * 100) ** 2 * areaCm2) / (4 * Math.PI ** 2 * fb * fb * vbL * 1000);

  const eqDiam = areaCm2 => 2 * Math.sqrt(areaCm2 / Math.PI);

  /** Longueur physique (cm) de chaque tube rond, façade incluse. */
  function roundPortLength(fb, vbL, dCm, count = 1) {
    const area = count * Math.PI * dCm * dCm / 4;
    return helmholtzLeff(fb, vbL, area) - 0.732 * dCm;
  }

  /** Longueur physique (cm) d'une fente rectangulaire, mesurée sur l'axe. */
  function slotPortLength(fb, vbL, wCm, hCm) {
    const area = wCm * hCm;
    return helmholtzLeff(fb, vbL, area) - 0.732 * eqDiam(area);
  }

  /** Accord réellement obtenu pour une longueur donnée (inverse). */
  function fbFromLength(lenCm, vbL, areaCm2, endCorrDiamCm) {
    const leff = lenCm + 0.732 * endCorrDiamCm;
    return Math.sqrt(((C * 100) ** 2 * areaCm2) / (4 * Math.PI ** 2 * leff * vbL * 1000));
  }

  /** Section de fente (cm²) dont la longueur nécessaire vaut lenCm. */
  function slotAreaForLength(fb, vbL, lenCm) {
    const k = ((C * 100) ** 2) / (4 * Math.PI ** 2 * fb * fb * vbL * 1000);
    const e = 0.732 * 2 / Math.sqrt(Math.PI);      // correction = e·√A
    const s = (e + Math.sqrt(e * e + 4 * k * lenCm)) / (2 * k);
    return s * s;
  }

  return { RHO, C, estimate, qtsOf, driverModel, logFreqs, simulate, lowCutoff, bandEdges, sealedVolume, carPortedVolume, portedDefaultVolume, optimizeFb, optimizeVb, cabinGain, optimizeBandpass, analyze, portVolumeVelocity, roundPortLength, slotPortLength, fbFromLength, slotAreaForLength, eqDiam };
})();
