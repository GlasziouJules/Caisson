// ============================================================
//  GRAPHIQUE — courbes en fréquence (axe log), Canvas 2D
// ============================================================

const F_MIN = 10, F_MAX = 300;
const F_TICKS = [10, 20, 30, 40, 50, 60, 80, 100, 150, 200, 300];
const BG = '#061a0a', GRID = 'rgba(154,204,165,0.12)', TXT = 'rgba(200,230,205,0.7)';

export class Chart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
  }

  /**
   * opts = {
   *   series: [{ x[], y[], color, width, dash, fill, label }],
   *   yMin, yMax, yStep, unit,
   *   hLines: [{ y, color, label }], vLines: [{ x, color, label }]
   * }
   */
  draw(opts) {
    const dpr  = window.devicePixelRatio || 1;
    const cssW = this.canvas.clientWidth || 500;
    const cssH = Math.round(cssW * 0.5);
    this.canvas.width  = cssW * dpr;
    this.canvas.height = cssH * dpr;
    this.canvas.style.height = cssH + 'px';
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { t: 14, r: 12, b: 30, l: 44 };
    const w = cssW - pad.l - pad.r, h = cssH - pad.t - pad.b;
    const { yMin, yMax, yStep } = opts;
    const fx = f => pad.l + Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN) * w;
    const fy = v => pad.t + (1 - (v - yMin) / (yMax - yMin)) * h;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.font = '10px ui-monospace, monospace';
    ctx.lineWidth = 1;

    // Grille
    ctx.strokeStyle = GRID; ctx.fillStyle = TXT; ctx.textAlign = 'right';
    for (let v = yMin; v <= yMax + 1e-9; v += yStep) {
      ctx.beginPath(); ctx.moveTo(pad.l, fy(v)); ctx.lineTo(pad.l + w, fy(v)); ctx.stroke();
      ctx.fillText(+v.toFixed(1), pad.l - 5, fy(v) + 3);
    }
    ctx.textAlign = 'center';
    for (const f of F_TICKS) {
      ctx.beginPath(); ctx.moveTo(fx(f), pad.t); ctx.lineTo(fx(f), pad.t + h); ctx.stroke();
      ctx.fillText(f, fx(f), pad.t + h + 13);
    }
    ctx.fillText('Hz', pad.l + w / 2, pad.t + h + 26);
    ctx.save();
    ctx.translate(11, pad.t + h / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(opts.unit, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.rect(pad.l, pad.t, w, h); ctx.clip();

    // Lignes de repère
    for (const l of opts.hLines ?? []) {
      ctx.strokeStyle = l.color; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(pad.l, fy(l.y)); ctx.lineTo(pad.l + w, fy(l.y)); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = l.color; ctx.textAlign = 'left';
      if (l.label) ctx.fillText(l.label, pad.l + 4, fy(l.y) - 4);
    }
    // Repères verticaux : étiquettes décalées en hauteur si elles se touchent
    const rowsEnd = [];
    const vl = (opts.vLines ?? []).filter(l => l.x > F_MIN && l.x < F_MAX).sort((a, b) => a.x - b.x);
    for (const l of vl) {
      const x = fx(l.x);
      ctx.strokeStyle = l.color; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + h); ctx.stroke();
      ctx.setLineDash([]);
      if (!l.label) continue;
      const tw = ctx.measureText(l.label).width;
      let row = 0;
      while (rowsEnd[row] !== undefined && rowsEnd[row] > x - tw / 2 - 4) row++;
      rowsEnd[row] = x + tw / 2;
      ctx.fillStyle = BG; ctx.fillRect(x - tw / 2 - 2, pad.t + 1 + row * 12, tw + 4, 11);
      ctx.fillStyle = l.color; ctx.textAlign = 'center';
      ctx.fillText(l.label, x, pad.t + 10 + row * 12);
    }

    // Courbes
    for (const s of opts.series) {
      const pts = [];
      s.x.forEach((f, i) => { if (f >= F_MIN && f <= F_MAX && isFinite(s.y[i])) pts.push([fx(f), fy(s.y[i])]); });
      if (pts.length < 2) continue;
      if (s.fill) {
        ctx.beginPath(); ctx.moveTo(pts[0][0], fy(yMin));
        pts.forEach(p => ctx.lineTo(p[0], p[1]));
        ctx.lineTo(pts[pts.length - 1][0], fy(yMin)); ctx.closePath();
        ctx.fillStyle = s.fill; ctx.fill();
      }
      ctx.beginPath(); ctx.strokeStyle = s.color; ctx.lineWidth = s.width ?? 2;
      ctx.setLineDash(s.dash ?? []);
      pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    }
    ctx.restore();
  }
}
