// ============================================================
//  GÉOMÉTRIE DU CAISSON
//  Un seul modèle sert au volume net, au plan de découpe et à la 3D.
//
//  Repère (cm) : origine au centre du caisson, x → droite, y → haut,
//  z → avant (la façade est en z = +D/2).
//
//  Assemblage : dessus/dessous = emprise complète W×D,
//  côtés entre les deux (H-2t × D), façade/arrière entre les côtés.
// ============================================================

const GEO = (() => {
  const { roundPortLength, slotPortLength, fbFromLength, eqDiam } = A;


  const EDGE = 1.5;   // marge façade (cm)
  const GAP  = 2.0;   // écart entre HP / évents (cm)
  const WALL = 0.4;   // épaisseur paroi tube PVC (cm)

  const r1 = v => Math.round(v * 10) / 10;

  // ── Contraintes minimales imposées par les HP et l'évent ────────
  function requirements(spec, hs) {
    const { drv, t, port, type } = spec;
    // HP en façade : une rangée, ou deux rangées (4 HP en carré 2 × 2)
    const nDrv   = drv.iso ? 1 : drv.count;
    const rows   = drv.rows === 2 && nDrv >= 4 ? 2 : 1;
    const nRow   = Math.ceil(nDrv / rows);          // HP par rangée
    const frame  = drv.nominal * 1.03;
    const rowW   = nRow * frame + (nRow - 1) * GAP;
    const blockH = rows * frame + (rows - 1) * GAP;
    const req    = { nDrv, rows, nRow, frame, blockH, minW: rowW + 2 * EDGE, minH: blockH + 2 * EDGE };
    const motor = drv.depth * (drv.iso ? 2 : 1) + 2;

    if (type === 'bandpass') {
      const po = port.d + 2 * WALL;
      req.minW  = Math.max(req.minW, port.count * po + (port.count - 1) * GAP + 2 * EDGE);
      req.minH  = Math.max(req.minH, po + 2 * EDGE);
      req.minDr = motor;
      req.minDf = Math.max(10, po + 4);
      return req;
    }

    req.minD = motor + 1;
    if (port?.kind === 'round') {
      const po     = port.d + 2 * WALL;
      const perCol = Math.max(1, Math.floor((blockH + GAP) / (po + GAP)));
      req.cols   = Math.ceil(port.count / perCol);
      req.perCol = perCol;
      req.minW  += req.cols * (po + GAP);
      req.minH   = Math.max(req.minH, Math.min(port.count, perCol) * (po + GAP) - GAP + 2 * EDGE);
    }
    if (port?.kind === 'slot') {
      if (port.pos === 'bottom') req.minH += hs + t; else req.minW += hs + t;
      req.minD += hs + t;   // place pour le retour de fente contre l'arrière
    }
    return req;
  }

  // ── Choix des dimensions internes ───────────────────────────────
  // Recherche sur grille : le volume est exact, les minimums respectés,
  // et les proportions les plus proches d'un caisson "voiture" classique.
  function solveDims(req, depthOf, n) {
    const rH = 0.85 / n ** 0.6, rD = 0.8 / n ** 0.6;
    const step = Math.max(0.5, req.minW / 150);
    let best = null;
    for (let W = req.minW; W <= req.minW * 3; W += step) {
      for (let H = req.minH; H <= req.minH * 3; H += step) {
        const d = depthOf(W, H);
        if (!d) continue;
        const cost = (Math.log(H / W) - Math.log(rH)) ** 2 + (Math.log(d.D / W) - Math.log(rD)) ** 2;
        if (!best || cost < best.cost) best = { W, H, ...d, cost };
      }
    }
    return best;
  }

  // ── Tube rond : trajectoire droite ou coudée à 90° ──────────────
  // Le coude part vers le côté qui offre le plus de place : haut/bas, ou
  // gauche/droite le long de l'arrière si l'espace derrière le moteur le permet.
  function roundTube(L, d, x, y, zFront, zStop, b, lateral, clear = 1) {
    const ro   = d / 2 + WALL;
    const room = zFront - zStop - d;              // garde d'un diamètre
    if (L <= room) return { x, y, z0: zFront, s1: L, r: 0, s2: 0, dir: 0, axis: 'y', len: L, overflow: 0 };

    const r   = 0.8 * d;
    const zV  = zStop + ro + clear;               // axe de la branche coudée
    const s1  = Math.max(zFront - (zV + r), 0);
    const opts = [['y', 1, b.yMax - y], ['y', -1, y - b.yMin]];
    if (lateral) opts.push(['x', 1, b.xMax - x], ['x', -1, x - b.xMin]);
    const [axis, dir, space] = opts.reduce((a, c) => (c[2] > a[2] ? c : a));
    const free = space - r - ro - 1;
    const want = L - s1 - Math.PI * r / 2;
    const s2   = Math.max(Math.min(want, free), 0);
    return { x, y, z0: zFront, s1, r, s2, dir, axis,
             len: s1 + Math.PI * r / 2 + s2, overflow: Math.max(want - free, 0) };
  }

  // ── Mise en place de toutes les pièces pour des dimensions données ──
  function layout(spec, Wi, Hi, Di, hs, Ltarget) {
    const { drv, t, port, type } = spec;
    const W = Wi + 2 * t, H = Hi + 2 * t, D = Di + 2 * t;
    const zF = D / 2, zB = -D / 2 + t;            // plan façade / face interne arrière
    const req   = requirements(spec, hs);
    const frame = req.frame;
    const parts = [], drivers = [], tubes = [], air = [], cuts = [];
    let portDisp = 0, boardDisp = 0, achieved = 0, overflow = 0, folded = false, extra = {};

    // Caisse
    parts.push({ kind: 'box', size: [W, t, D], pos: [0,  H / 2 - t / 2, 0] });
    parts.push({ kind: 'box', size: [W, t, D], pos: [0, -H / 2 + t / 2, 0] });
    parts.push({ kind: 'box', size: [t, Hi, D], pos: [-W / 2 + t / 2, 0, 0] });
    parts.push({ kind: 'box', size: [t, Hi, D], pos: [ W / 2 - t / 2, 0, 0] });
    parts.push({ kind: 'box', size: [Wi, Hi, t], pos: [0, 0, -D / 2 + t / 2] });
    cuts.push({ name: 'Dessus / dessous', qty: 2, a: W, b: D });
    cuts.push({ name: 'Côtés', qty: 2, a: Hi, b: D });
    cuts.push({ name: 'Arrière', qty: 1, a: Wi, b: Hi });

    // Zone utile de la façade (hors fente)
    let x0 = -Wi / 2, x1 = Wi / 2, y0 = -Hi / 2, y1 = Hi / 2;
    if (port?.kind === 'slot') {
      if (port.pos === 'bottom') y0 += hs + t; else x1 -= hs + t;
    }

    const { nDrv, nRow, rows, blockH } = req;
    const rowW = nRow * frame + (nRow - 1) * GAP;
    // HP n° i : colonne et décalage vertical (2 rangées → une en haut, une en bas)
    const rowDy = (frame + GAP) / 2;
    const cell  = i => ({ col: i % nRow, dy: rows === 2 ? (i < nRow ? rowDy : -rowDy) : 0 });
    const bounds = { xMin: -Wi / 2, xMax: Wi / 2, yMin: -Hi / 2, yMax: Hi / 2 };
    // Place libre derrière le(s) moteur(s) pour un coude latéral
    const behindMotor = po => Di - drv.depth * (drv.iso ? 2 : 1) - 1 >= po + 1;
    const frontHoles = [];
    const nPhys = drv.iso ? 2 : drv.count;

    // ── Bandpass : cloison porte-HP, évents seuls en façade ──
    if (type === 'bandpass') {
      const Dr  = spec.bpDr;
      const zD  = zB + Dr;                           // face arrière de la cloison
      const sx  = -rowW / 2 + frame / 2;
      const divHoles = [];
      for (let i = 0; i < nDrv; i++) {
        const { col, dy } = cell(i);
        const x = sx + col * (frame + GAP);
        divHoles.push({ x, y: dy, r: drv.cutout / 2 });
        drivers.push({ x, y: dy, z: zD + t, rFrame: frame / 2, rCut: drv.cutout / 2, depth: drv.depth });
        if (drv.iso) drivers.push({ x, y: dy, z: zD + t - drv.depth - 1, rFrame: frame / 2, rCut: drv.cutout / 2, depth: drv.depth, inner: true });
      }
      parts.push({ kind: 'holed', w: Wi, h: Hi, thick: t, pos: [0, 0, zD + t / 2], holes: divHoles });
      cuts.push({ name: 'Cloison porte-HP', qty: 1, a: Wi, b: Hi, note: `${nDrv} découpe(s) Ø ${r1(drv.cutout * 10)} mm` });

      const po = port.d + 2 * WALL;
      const totalW = port.count * po + (port.count - 1) * GAP;
      const py = -Hi / 2 + EDGE + po / 2;           // en bas : le coude remonte
      for (let i = 0; i < port.count; i++) {
        const x = -totalW / 2 + po / 2 + i * (po + GAP);
        frontHoles.push({ x, y: py, r: po / 2 });
        const tb = roundTube(Ltarget, port.d, x, py, zF, zD + t, bounds, false, 4);
        tubes.push({ ...tb, d: port.d });
        portDisp += Math.PI * (po / 2) ** 2 * Math.max(tb.len - t, 0) / 1000;
        achieved = tb.len; overflow = Math.max(overflow, tb.overflow);
      }
      parts.push({ kind: 'holed', w: Wi, h: Hi, thick: t, pos: [0, 0, zF - t / 2], holes: frontHoles });
      cuts.push({ name: 'Façade', qty: 1, a: Wi, b: Hi, note: `${port.count} trou(s) Ø ${r1(po * 10)} mm pour évent` });

      const Df = Di - Dr - t;
      const vr = Wi * Hi * Dr / 1000 - nPhys * drv.disp;
      const vf = Wi * Hi * Df / 1000 - portDisp;
      return { W, H, D, Wi, Hi, Di, parts, drivers, tubes, air, cuts, frontHoles, vr, vf,
               disp: { drivers: nPhys * drv.disp, port: portDisp, boards: 0 },
               gross: Wi * Hi * Di / 1000, achieved, overflow, folded, Dr, Df };
    }

    // ── Clos / évent : HP en façade ──
    // Position : le plus loin possible de l'évent ("far", par défaut) ou
    // centré sur la façade ("center"), toujours dans la zone libre.
    const po    = port?.kind === 'round' ? port.d + 2 * WALL : 0;
    const portsZ = port?.kind === 'round' ? req.cols * po + (req.cols - 1) * GAP : 0;
    const center = spec.drvPos === 'center' || !port;
    const hw     = rowW / 2;
    // Zone horizontale disponible pour la rangée de HP (tubes ronds à droite)
    const dLo = x0 + EDGE, dHi = x1 - EDGE - (portsZ ? portsZ + GAP : 0);
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
    let rowCx = center ? clamp(0, dLo + hw, dHi - hw) : dLo + hw;
    let cy    = 0;
    if (port?.kind === 'slot' && port.pos === 'bottom') {
      rowCx = clamp(0, dLo + hw, dHi - hw);
      cy    = center ? clamp(0, y0 + EDGE + blockH / 2, y1 - EDGE - blockH / 2) : y1 - EDGE - blockH / 2;
    }
    const startX = rowCx - hw;
    // Cotes imposées trop justes : le cadre du HP déborde de la zone libre
    const noFit = dHi - dLo < rowW - 0.5 || (y1 - y0) < blockH - 0.5;
    for (let i = 0; i < nDrv; i++) {
      const { col, dy } = cell(i);
      const x = startX + frame / 2 + col * (frame + GAP);
      const y = cy + dy;
      frontHoles.push({ x, y, r: drv.cutout / 2 });
      drivers.push({ x, y, z: zF, rFrame: frame / 2, rCut: drv.cutout / 2, depth: drv.depth });
      if (drv.iso) drivers.push({ x, y, z: zF - t - drv.depth - 1, rFrame: frame / 2, rCut: drv.cutout / 2, depth: drv.depth, inner: true });
    }

    if (port?.kind === 'round') {
      let k = 0;
      for (let c = 0; c < req.cols; c++) {
        const inCol = Math.min(req.perCol, port.count - k);
        const px    = x1 - EDGE - po / 2 - c * (po + GAP);   // contre le bord opposé au HP
        for (let j = 0; j < inCol; j++, k++) {
          const py = y0 + EDGE + po / 2 + j * (po + GAP);   // empilés depuis le bas
          frontHoles.push({ x: px, y: py, r: po / 2 });
          const tb = roundTube(Ltarget, port.d, px, py, zF, zB, bounds, behindMotor(po), 1);
          tubes.push({ ...tb, d: port.d });
          portDisp += Math.PI * (po / 2) ** 2 * Math.max(tb.len - t, 0) / 1000;
          achieved = tb.len; overflow = Math.max(overflow, tb.overflow);
          if (tb.overflow > 0) extra.minD = Di + tb.overflow;
        }
      }
    }

    if (port?.kind === 'slot') {
      // Repère local de la fente : a = épaisseur depuis la paroi, b = largeur
      const bottom = port.pos === 'bottom';
      const wS     = bottom ? Wi : Hi;
      const aMax   = bottom ? Hi : Wi;
      const toWorld = (a0, a1, z0, z1) => {           // boîte [a0,a1]×toute la largeur×[z0,z1]
        const za = (z0 + z1) / 2, sz = Math.abs(z1 - z0);
        return bottom
          ? { size: [Wi, a1 - a0, sz], pos: [0, -Hi / 2 + (a0 + a1) / 2, za] }
          : { size: [a1 - a0, Hi, sz], pos: [Wi / 2 - (a0 + a1) / 2, 0, za] };
      };
      // Sortie intérieure : entre le bout de la planche et l'arrière il faut au
      // moins la largeur de la fente, sinon l'air est étranglé à la sortie.
      const straightMax = Di + t - hs;
      let shelfLen, Lb = 0;
      if (Ltarget <= straightMax || Ltarget - Di - t < 1) {
        shelfLen = Math.min(Ltarget, straightMax);
        achieved = shelfLen;
        overflow = Math.max(Ltarget - shelfLen, 0);   // fente un peu trop longue : on réduit la section
        air.push(toWorld(0, hs, zF, zF - shelfLen));
      } else {
        folded   = true;
        shelfLen = Di + t - hs;
        const want = Ltarget - Di - t;
        const room = aMax - 2 * hs - t;               // garde = hauteur de fente en haut
        Lb       = Math.max(Math.min(want, room), 0);
        overflow = Math.max(want - room, 0);
        achieved = Di + t + Lb;
        const zb = zB + hs;                           // face arrière du retour
        parts.push({ kind: 'box', role: 'port', ...toWorld(hs, hs + Lb, zb, zb + t) });
        air.push(toWorld(0, hs, zF, zB));
        air.push(toWorld(hs, hs + Lb, zB, zb));
        boardDisp += wS * t * Lb / 1000;
        portDisp  += wS * hs * Lb / 1000;
        if (overflow > 0) extra[bottom ? 'minH' : 'minW'] = (bottom ? Hi : Wi) + overflow;
        cuts.push({ name: 'Retour de fente (contre l’arrière)', qty: 1, a: wS, b: Lb });
      }
      parts.push({ kind: 'box', role: 'port', ...toWorld(hs, hs + t, zF, zF - shelfLen) });
      const inside = Math.max(shelfLen - t, 0);
      boardDisp += wS * t * inside / 1000;
      portDisp  += wS * hs * (folded ? Di : inside) / 1000;
      cuts.push({ name: bottom ? 'Plancher de fente' : 'Cloison de fente', qty: 1, a: wS, b: shelfLen });
    }

    const fw = x1 - x0, fh = y1 - y0, fcx = (x0 + x1) / 2, fcy = (y0 + y1) / 2;
    parts.push({ kind: 'holed', w: fw, h: fh, thick: t, pos: [fcx, fcy, zF - t / 2],
                 holes: frontHoles.map(h => ({ ...h, x: h.x - fcx, y: h.y - fcy })) });
    const notes = [`${nDrv} découpe(s) HP Ø ${r1(drv.cutout * 10)} mm`];
    const fl = fcx - fw / 2, fb = fcy - fh / 2;   // coin bas-gauche de la façade (vue de face)
    const at = drivers.filter(d => !d.inner)
      .map(d => `${Math.round((d.x - fl) * 10)} / ${Math.round((d.y - fb) * 10)}`);
    notes.push(`centre HP à ${at.join(', ')} mm (depuis le bord gauche / le bas)`);
    if (port?.kind === 'round') notes.push(`${port.count} trou(s) Ø ${r1(po * 10)} mm`);
    cuts.splice(3, 0, { name: 'Façade', qty: 1, a: fw, b: fh, note: notes.join(' · ') });

    const gross = Wi * Hi * Di / 1000;
    const dispD = nPhys * drv.disp;
    return { W, H, D, Wi, Hi, Di, parts, drivers, tubes, air, cuts, frontHoles,
             disp: { drivers: dispD, port: portDisp, boards: boardDisp },
             gross, net: gross - dispD - portDisp - boardDisp,
             achieved, overflow, folded, extra, noFit, frame };
  }

  /**
   * Conçoit le caisson.
   * spec = {
   *   type, t (cm),
   *   drv:  { count, iso, nominal (cm), cutout (cm), depth (cm), disp (L/HP) },
   *   vnet (L) [clos/évent] | vr, vf (L) [bandpass], fb (Hz),
   *   port: null | { kind:'round', d (cm), count } | { kind:'slot', pos:'bottom'|'side', h (cm)|null, area (cm²) },
   *   custom: null | { W, H, D } (cm, extérieur)
   * }
   */
  function designBox(spec) {
    const { port } = spec;
    // Tube rond en diamètre automatique : on descend dans les tailles PVC
    // jusqu'à ce que le tube tienne (sans passer sous la section minimale).
    if (port?.kind === 'round' && port.sizes) {
      const tries = port.sizes.filter(s => s / 10 <= port.d + 1e-9 &&
        port.count * Math.PI * (s / 20) ** 2 >= 0.9 * port.minArea).sort((a, b) => b - a);
      let geo;
      for (const s of tries.length ? tries : [port.d * 10]) {
        geo = designOnce({ ...spec, port: { ...port, d: s / 10 } });
        if (geo.overflow <= 0.5) break;
      }
      geo.port = { ...port, d: geo.portD };
      geo.areaReduced = geo.portD < port.d - 1e-9;
      return geo;
    }
    // Fente en section automatique : si elle ne tient pas, on réduit la
    // section (évent plus court) — jusqu'à la section minimale admise.
    if (port?.kind === 'slot' && port.h == null) {
      let area = port.area, geo;
      for (let k = 0; k < 30; k++) {
        geo = designOnce({ ...spec, port: { ...port, area } });
        if (geo.overflow <= 0.5 || area * 0.95 < 0.9 * port.minArea) break;
        area *= 0.95;
      }
      geo.areaReduced = area < port.area;
      return geo;
    }
    return designOnce(spec);
  }

  function designOnce(spec) {
    const { t, port, type } = spec;
    // Proportions visées : selon le nombre de HP par rangée (2 × 2 → comme 2 HP)
    const nAll = spec.drv.iso ? 1 : spec.drv.count;
    const n = Math.ceil(nAll / (spec.drv.rows === 2 && nAll >= 4 ? 2 : 1));
    const slot = port?.kind === 'slot';

    // Largeur de la fente = toute la largeur (bas) ou hauteur (côté) intérieure
    const slotWidth = (Wi, Hi) => port.pos === 'bottom' ? Wi : Hi;
    const hsFor = (Wi, Hi) => port.h ?? Math.max(port.area / slotWidth(Wi, Hi), 2);

    const portLen = (vol, Wi, Hi, hs) => {
      if (!port) return 0;
      if (port.kind === 'round') return roundPortLength(spec.fb, vol, port.d, port.count);
      return slotPortLength(spec.fb, vol, slotWidth(Wi, Hi), hs);
    };

    let geo, hs = 0, oversized = false;

    if (type === 'bandpass') {
      const nPhys = spec.drv.iso ? 2 : spec.drv.count;
      const Lauto = roundPortLength(spec.fb, spec.vf, port.d, port.count);
      let pd = 0;
      for (let it = 0; it < 12; it++) {
        const req = requirements(spec, 0);
        let dims;
        if (spec.custom) {
          const Wi = spec.custom.W - 2 * t, Hi = spec.custom.H - 2 * t, Di = spec.custom.D - 2 * t;
          const want = (spec.vr + nPhys * spec.drv.disp) * 1000 / (Wi * Hi);
          const Dr = Math.max(Math.min(want, Di - t - req.minDf), Math.min(req.minDr, Di - t - 5));
          dims = { W: Wi, H: Hi, D: Di, Dr };
        } else {
          dims = solveDims(req, (W, H) => {
            const Dr = (spec.vr + nPhys * spec.drv.disp) * 1000 / (W * H);
            const Df = (spec.vf + pd) * 1000 / (W * H);
            return Dr >= req.minDr && Df >= req.minDf ? { D: Dr + Df + t, Dr } : null;
          }, n);
          if (!dims) {
            oversized = true;
            dims = { W: req.minW, H: req.minH, D: req.minDr + req.minDf + t, Dr: req.minDr };
          }
        }
        spec.bpDr = dims.Dr;
        const vfNow = (dims.W * dims.H * (dims.D - dims.Dr - t)) / 1000 - pd;
        const L = spec.custom || oversized ? roundPortLength(spec.fb, vfNow, port.d, port.count) : Lauto;
        geo = layout(spec, dims.W, dims.H, dims.D, 0, L);
        geo.portTarget = L;
        if (Math.abs(geo.disp.port - pd) < 0.02) break;
        pd = geo.disp.port;
      }
      geo.portArea = port.count * Math.PI * port.d ** 2 / 4;
      geo.fbActual = fbFromLength(geo.achieved, geo.vf, geo.portArea, port.d);
      return finish(geo, spec, oversized);
    }

    // ── Clos / évent ──
    let disp  = (spec.drv.iso ? 2 : spec.drv.count) * spec.drv.disp;
    let extra = { minW: 0, minH: 0, minD: 0 };
    let noGrow = false, lastExtra = null;
    let Wi = 0, Hi = 0, Di = 0;
    for (let it = 0; it < 16; it++) {
      if (slot) hs = Wi ? hsFor(Wi, Hi) : (port.h ?? 5);
      const req = requirements(spec, hs);
      req.minW = Math.max(req.minW, extra.minW); req.minH = Math.max(req.minH, extra.minH);
      req.minD = Math.max(req.minD, extra.minD);

      let vol;
      if (spec.custom) {
        Wi = spec.custom.W - 2 * t; Hi = spec.custom.H - 2 * t; Di = spec.custom.D - 2 * t;
        if (slot) hs = hsFor(Wi, Hi);
        vol = Wi * Hi * Di / 1000 - disp;
      } else {
        const vg = spec.vnet + disp;
        let d = solveDims(req, (W, H) => {
          const D = vg * 1000 / (W * H);
          return D >= req.minD ? { D } : null;
        }, n);
        if (!d && lastExtra) {          // l'agrandissement a rendu le caisson trop gros : on annule
          extra = lastExtra; lastExtra = null; noGrow = true;
          continue;
        }
        oversized = !d;
        if (!d) d = { W: req.minW, H: req.minH, D: req.minD };
        Wi = d.W; Hi = d.H; Di = d.D;
        if (slot) hs = hsFor(Wi, Hi);
        vol = oversized ? Wi * Hi * Di / 1000 - disp : spec.vnet;
      }

      const L = portLen(vol, Wi, Hi, hs);
      geo = layout(spec, Wi, Hi, Di, hs, L);
      geo.portTarget = L;
      const newDisp = geo.disp.drivers + geo.disp.port + geo.disp.boards;

      // Évent trop long : on agrandit la dimension utile au repli (mode auto)
      let grew = false;
      if (!spec.custom && !noGrow && !oversized && geo.overflow > 0.5) {
        lastExtra = { ...extra };
        for (const k of ['minW', 'minH', 'minD']) {
          if (geo.extra[k] > extra[k] + 0.1) { extra[k] = geo.extra[k]; grew = true; }
        }
      }
      if (!grew && Math.abs(newDisp - disp) < 0.02) break;
      disp = newDisp;
    }

    geo.hs = hs;
    if (port) {
      const area = port.kind === 'round'
        ? port.count * Math.PI * port.d ** 2 / 4
        : slotWidth(geo.Wi, geo.Hi) * hs;
      const ecd  = port.kind === 'round' ? port.d : eqDiam(area);
      geo.portArea = area;
      geo.slotW    = slot ? slotWidth(geo.Wi, geo.Hi) : 0;
      geo.fbActual = fbFromLength(geo.achieved, geo.net, area, ecd);
    }
    return finish(geo, spec, oversized);
  }

  /** Volumes minimaux physiques d'un bandpass (L) : HP sur la cloison, moteur à l'arrière. */
  function bandpassMinVolumes(drv, t, portD = 10) {
    const req = requirements({ type: 'bandpass', drv, t, port: { d: portD, count: 1 } }, 0);
    const face = req.minW * req.minH;
    return { vr: face * req.minDr / 1000 - (drv.iso ? 2 : drv.count) * drv.disp,
             vf: face * Math.max(req.minDf, 14) / 1000, face };
  }

  function finish(geo, spec, oversized) {
    const { port } = spec;
    geo.portD = port?.d;
    if (port?.kind === 'round') {
      geo.cuts.push({
        name: `Tube PVC Ø int. ${r1(port.d * 10)} mm`, qty: port.count, a: geo.achieved, b: null,
        note: geo.tubes[0]?.r ? 'avec coude 90° (longueur mesurée sur l’axe)' : 'affleurant la façade',
      });
    }
    geo.oversized = oversized;
    geo.ext = { W: geo.W, H: geo.H, D: geo.D };
    geo.int = { W: geo.Wi, H: geo.Hi, D: geo.Di };
    return geo;
  }

  return { designBox, bandpassMinVolumes };
})();
