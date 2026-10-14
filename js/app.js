// ============================================================
//  APPLICATION — interface et enchaînement des calculs
//  1. paramètres du HP   2. volume / accord visés
//  3. section d'évent    4. géométrie (volume net réel)
//  5. simulation finale sur le caisson réellement construit
// ============================================================

// Scripts classiques (pas de modules) : le site s'ouvre aussi en double-clic
// sur index.html, sans serveur. A, DATA, GEO, CHART, VIEWER sont chargés avant.
const { BRANDS, SUBS, GENERIC, NOMINAL_MM, PVC_SIZES } = DATA;
const { designBox, bandpassMinVolumes } = GEO;
const { Chart } = CHART;
const { EnclosureViewer } = VIEWER;

const V_PORT_TARGET = 18;   // m/s : pas de souffle audible
const V_PORT_MAX    = 30;   // m/s : limite basse si l'évent ne tient pas

const $   = id => document.getElementById(id);
const num = (id, d = null) => { const v = parseFloat($(id)?.value); return Number.isFinite(v) ? v : d; };
const fmt = (v, d = 1) => Number(v).toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const mm  = cm => Math.round(cm * 10);

/** Erreur de saisie : affichée à l'utilisateur, pas un bug. */
class InputError extends Error {}

/** Complète une fiche HP (valeurs absentes → null). */
function normalizeSub(r) {
  const n = v => (v == null || v === '' ? null : +v);
  return {
    ...r, diameter_mm: n(r.diameter_mm), sd: n(r.sd), cutout_mm: n(r.cutout_mm),
    depth_mm: n(r.depth_mm), disp_l: n(r.disp_l), power_rms: n(r.power_rms),
    rec: r.rec?.sealed || r.rec?.ported ? r.rec : null, note: r.note ?? '',
  };
}

// ── « Mes subs » : fiches enregistrées dans ce navigateur ─────
const MY_KEY = 'swd.mySubs';
const isMine = s => String(s?.id ?? '').startsWith('u');
function loadMine() {
  try { const v = JSON.parse(localStorage.getItem(MY_KEY)); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function storeMine(list) {
  try { localStorage.setItem(MY_KEY, JSON.stringify(list)); return true; } catch { return false; }
}

/** "2×4Ω" → { coils: 2, z: 4 } ; "4Ω" → { coils: 1, z: 4 }. */
function parseCoil(vc) {
  const m = /(?:(\d)\s*×\s*)?(\d+(?:[.,]\d+)?)\s*Ω/.exec(vc ?? '');
  return m ? { coils: m[1] ? +m[1] : 1, z: +m[2].replace(',', '.') } : null;
}

// ── Lien de partage : réglages encodés dans l'adresse (#p=…) ───
const b64enc = str => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64dec = str => decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))));

class App {
  constructor() {
    this.type      = 'sealed';
    this.simple    = true;
    this.sub       = null;      // fiche chargée depuis la base
    this.chartMode = 'resp';

    this._bindDb();
    this._bindModes();
    this._bindEnclosure();
    this._bindResults();
    this._updateSimpleInfo();
    this._updateQts();
    this._applyShowRules();
    this._loadBrands();
    this._bindMine();
    this._restoreFromLink();
  }

  _allSubs() { return [...SUBS, ...loadMine()]; }

  _toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.add('hidden'), 2400);
  }

  // ── Base de données intégrée (js/data.js) ───────────────────
  _loadBrands() {
    $('api-status').textContent = `${SUBS.length} modèles intégrés`;
    $('hero-count').textContent = SUBS.length;
    const sel = $('db-brand');
    BRANDS.forEach(b => sel.add(new Option(b.name, b.id)));
    $('brand-chips').innerHTML = BRANDS.map(b => `<span class="brand-chip">${b.name}</span>`).join('');
    this._refreshMine();
  }

  /** Ajoute / retire « Mes subs » de la liste des marques. */
  _refreshMine() {
    const sel = $('db-brand'), n = loadMine().length;
    let opt = sel.querySelector('option[value="mine"]');
    if (n && !opt) { opt = new Option('', 'mine'); sel.add(opt, 1); }
    if (opt) {
      if (n) opt.textContent = `★ Mes subs (${n})`;
      else { if (sel.value === 'mine') { sel.value = ''; sel.dispatchEvent(new Event('change')); } opt.remove(); }
    }
    if (sel.value === 'mine') sel.dispatchEvent(new Event('change'));
  }

  _bindDb() {
    const brand = $('db-brand'), model = $('db-model'), btn = $('db-load-btn');
    brand.addEventListener('change', () => {
      model.innerHTML = '<option value="">— Choisir un modèle —</option>';
      btn.disabled = true;
      if (!brand.value) { model.disabled = true; return; }
      (brand.value === 'mine' ? loadMine() : SUBS.filter(s => s.brand_id == brand.value))
        .slice().sort((a, b) => a.size_inch - b.size_inch || a.model.localeCompare(b.model, 'fr', { numeric: true }))
        .forEach(s => model.add(new Option(
        `${s.model} — ${s.size_inch}" · ${s.power_rms ?? '?'} W · ${s.voice_coil ?? ''}`, s.id)));
      model.disabled = false;
    });
    model.addEventListener('change', () => { btn.disabled = !model.value; });
    btn.addEventListener('click', () => this._loadSub(model.value));
  }

  _loadSub(id) {
    const row = this._allSubs().find(s => String(s.id) === String(id));
    if (!row) return;
    const s = this.sub = normalizeSub(row);

    const set = (k, v) => { $(k).value = v ?? ''; };
    const sizes = [...$('size').options].map(o => +o.value);
    set('size', sizes.reduce((a, b) => Math.abs(b - s.size_inch) < Math.abs(a - s.size_inch) ? b : a));
    set('Fs', s.fs); set('Qes', s.qes); set('Qms', s.qms); set('Vas', s.vas);
    set('Re', s.re); set('Xmax', s.xmax); set('power', s.power_rms ?? 300);
    set('Sd', s.sd); set('cutout', s.cutout_mm); set('depth', s.depth_mm); set('disp', s.disp_l);
    const coil = parseCoil(s.voice_coil);
    if (coil) { set('coils', coil.coils); if ([1, 2, 4, 8].includes(coil.z)) set('coil-z', coil.z); }
    set('mysub-name', isMine(s) ? s.model : '');
    $('btn-del-sub').classList.toggle('hidden', !isMine(s));
    this._updateQts();
    this._setMode(false);
    // Qts élevé : un Qtc de 0,707 est impossible, on propose 25 % au-dessus du Qts
    if (num('Qtc', 0.707) <= s.qts * 1.1) set('Qtc', +(Math.max(0.707, s.qts * 1.25)).toFixed(2));

    $('db-loaded-name').textContent = s.model;
    $('db-note').textContent = s.note ? ` — ${s.note}` : '';
    $('db-loaded-band').classList.remove('hidden');

    // Recommandation fabricant disponible ?
    const showMaker = (selId, ok) => {
      const opt = $(selId).querySelector('option[value="maker"]');
      opt.hidden = !ok;
      opt.textContent = ok ? `Recommandation ${s.rec.src ?? 'fabricant'}` + (selId === 'sealed-goal'
        ? ` (${fmt(s.rec.sealed)} L)` : ` (${fmt(s.rec.ported.vb)} L${s.rec.ported.fb ? ' à ' + fmt(s.rec.ported.fb) + ' Hz' : ''})`) : 'Recommandation fabricant';
      $(selId).value = ok ? 'maker' : ($(selId).value === 'maker' ? $(selId).options[0].value : $(selId).value);
    };
    showMaker('sealed-goal', !!s.rec?.sealed);
    showMaker('ported-goal', !!s.rec?.ported);
    this._applyShowRules();

    if (s.recommended_type === 'sealed' || s.recommended_type === 'ported') {
      document.querySelector(`.tab-btn[data-type="${s.recommended_type}"]`).click();
    }
  }

  // ── Mode simple / avancé ────────────────────────────────────
  _bindModes() {
    $('mode-simple').addEventListener('click', () => this._setMode(true));
    $('mode-advanced').addEventListener('click', () => this._setMode(false));
    $('simple-size').addEventListener('change', () => this._updateSimpleInfo());
    ['Qes', 'Qms'].forEach(id => $(id).addEventListener('input', () => this._updateQts()));
    $('size').addEventListener('change', () => {
      this.sub = null;
      $('db-loaded-band').classList.add('hidden');
      $('btn-del-sub').classList.add('hidden');
      this._syncMakerOption();
    });
  }

  _setMode(simple) {
    this.simple = simple;
    $('mode-simple').classList.toggle('active', simple);
    $('mode-advanced').classList.toggle('active', !simple);
    $('simple-panel').classList.toggle('hidden', !simple);
    $('advanced-panel').classList.toggle('hidden', simple);
    this._syncMakerOption();
  }

  /** « Recommandation fabricant » n'a de sens qu'avec un sub chargé, en mode avancé. */
  _syncMakerOption() {
    for (const [id, key] of [['sealed-goal', 'sealed'], ['ported-goal', 'ported']]) {
      const sel = $(id), ok = !this.simple && !!this.sub?.rec?.[key];
      sel.querySelector('option[value="maker"]').hidden = !ok;
      if (!ok && sel.value === 'maker') sel.value = sel.options[0].value;
    }
    this._applyShowRules();
  }

  _updateSimpleInfo() {
    const size = +$('simple-size').value, g = GENERIC[size];
    $('simple-info').innerHTML =
      `<strong>${size}" générique :</strong> Fs ${g.fs} Hz · Qts ${fmt(A.qtsOf(g.qes, g.qms), 2)} · ` +
      `Vas ${g.vas} L · Xmax ${g.xmax} mm — valeurs moyennes de subs voiture. ` +
      `Pour un résultat exact, choisissez votre modèle ci-dessus ou passez en mode Avancé.`;
    $('simple-power').value = g.power;
  }

  _updateQts() {
    const qes = num('Qes'), qms = num('Qms');
    $('Qts').textContent = qes > 0 && qms > 0 ? fmt(A.qtsOf(qes, qms), 3) : '—';
  }

  // ── Options du caisson ──────────────────────────────────────
  _bindEnclosure() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      this.type = btn.dataset.type;
      document.querySelectorAll('.type-options').forEach(o => o.classList.add('hidden'));
      $(`opts-${this.type}`).classList.remove('hidden');
    }));
    document.querySelectorAll('input[name="port-type"]').forEach(r => r.addEventListener('change', () => {
      const slot = r.value === 'slot' && r.checked;
      $('port-round-opts').classList.toggle('hidden', slot);
      $('port-slot-opts').classList.toggle('hidden', !slot);
    }));
    ['sealed-goal', 'ported-goal'].forEach(id => $(id).addEventListener('change', () => this._applyShowRules()));
    $('custom-dims-toggle').addEventListener('change', e => $('custom-dims-opts').classList.toggle('hidden', !e.target.checked));
    $('btn-calculate').addEventListener('click', () => this._run());
  }

  /** Affiche les champs data-show="select:valeur" selon le choix courant. */
  _applyShowRules() {
    document.querySelectorAll('[data-show]').forEach(el => {
      const [sel, val] = el.dataset.show.split(':');
      el.classList.toggle('hidden', $(sel).value !== val);
    });
  }

  // ── Lecture des paramètres ──────────────────────────────────
  _readDriver() {
    if (this.simple) {
      const size = +$('simple-size').value, g = GENERIC[size];
      return { name: `${size}" générique`, size, ...g, power: num('simple-power', g.power),
               sd: A.estimate.sd(size), nominal: NOMINAL_MM[size] };
    }
    const size = +$('size').value;
    const p = { size, fs: num('Fs'), qes: num('Qes'), qms: num('Qms'), vas: num('Vas'),
                re: num('Re'), xmax: num('Xmax'), power: num('power') };
    const labels = { fs: 'Fs', qes: 'Qes', qms: 'Qms', vas: 'Vas', re: 'Re', xmax: 'Xmax', power: 'Puissance' };
    for (const [k, l] of Object.entries(labels)) {
      if (!(p[k] > 0)) throw new InputError(`Paramètre « ${l} » manquant ou invalide.`);
    }
    const nominal = this.sub?.diameter_mm ?? NOMINAL_MM[size] ?? Math.round(size * 25.4);
    return { ...p, name: this.sub?.model ?? `HP ${size}"`, nominal,
             sd: num('Sd') ?? A.estimate.sd(size),
             cutout: num('cutout'), depth: num('depth'), disp: num('disp') };
  }

  _pickPvc(areaCm2, count) {
    const need = Math.sqrt(4 * areaCm2 / (Math.PI * count)) * 10;   // mm
    return PVC_SIZES.find(s => s >= need) ?? PVC_SIZES[PVC_SIZES.length - 1];
  }

  // ── Calcul complet ─────────────────────────────────────────
  _run() {
    const errBox = $('calc-error');
    try {
      this._compute();
      errBox.classList.add('hidden');
      this._render();
      $('section-results').classList.remove('hidden');
      $('section-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      if (!(e instanceof InputError)) console.error(e);
      errBox.innerHTML = `<ul><li>${e.message}</li></ul>`;
      errBox.classList.remove('hidden');
    }
  }

  _compute() {
    const d   = this._readDriver();
    const drv = A.driverModel({ fs: d.fs, qes: d.qes, qms: d.qms, vas: d.vas, re: d.re, sd: d.sd, xmax: d.xmax });
    const cfgSel = $('config').value;
    const iso    = cfgSel === 'iso';
    const count  = iso ? 2 : +cfgSel;
    const mult   = iso ? 0.5 : count;           // facteur de volume
    const vasEq  = d.vas * mult;
    const base   = { drv, count, iso, power: d.power };
    const type   = this.type;
    const notes  = [];
    const rec    = this.simple ? null : this.sub?.rec;

    const t = num('thick', 18) / 10;
    if (t < 0.9 || t > 4) throw new InputError('Épaisseur de panneau entre 9 et 40 mm.');
    const custom = $('custom-dims-toggle').checked
      ? { W: num('custom-W'), H: num('custom-H'), D: num('custom-D') } : null;
    if (custom && !(custom.W > 0 && custom.H > 0 && custom.D > 0)) throw new InputError('Dimensions imposées incomplètes.');

    let vb = null, fb = null, vr = null, vf = null, port = null, goalTxt = '';

    // Section d'évent : vitesse d'air visée à pleine puissance, bornée par la
    // pratique des fabricants (≈ 2 à 4,5 cm² par litre de volume net).
    const sizePort = (cfg, kind, vol, nForced = null) => {
      const U     = A.portVolumeVelocity(cfg);                  // m³/s
      const area  = Math.min(Math.max(U / V_PORT_TARGET * 1e4, 2.2 * vol), 4.5 * vol);
      const minArea = Math.min(area, 2.0 * vol);
      if (kind === 'slot') {
        return { kind: 'slot', pos: $('slot-pos').value, h: num('slot-h'), area, minArea };
      }
      const pre = type === 'bandpass' ? 'bp' : 'port';
      const n = nForced ?? Math.max(1, Math.round(num(`${pre}-count`, 1)));
      const userD = num(type === 'bandpass' ? 'bp-diam' : 'port-diam');
      if (userD) return { kind: 'round', d: userD / 10, count: n };
      const dmm = this._pickPvc(area, n);
      if (!nForced && n * Math.PI * (dmm / 20) ** 2 < area * 0.8) {
        notes.push(`Un seul tube de ${dmm} mm est juste pour cette puissance : passez à ${n + 1} tubes ou à un évent en fente.`);
      }
      return { kind: 'round', d: dmm / 10, count: n, sizes: PVC_SIZES, area, minArea };
    };

    // Encombrement physique du HP
    const geoDrv = {
      count, iso,
      nominal: d.nominal / 10,
      cutout:  (d.cutout ?? A.estimate.cutout(d.nominal)) / 10,
      depth:   (d.depth  ?? A.estimate.depth(d.nominal)) / 10,
      disp:     d.disp   ?? A.estimate.disp(d.size),
    };

    if (type === 'sealed') {
      const goal = $('sealed-goal').value;
      if (goal === 'maker' && rec?.sealed) { vb = rec.sealed * mult; goalTxt = `recommandation ${rec.src}`; }
      else if (goal === 'custom') { vb = num('vb-sealed'); goalTxt = 'volume personnalisé'; }
      else {
        const qtc = num('Qtc', 0.707);
        if (qtc <= drv.qts * 1.03) {
          throw new InputError(`Le Qtc visé (${fmt(qtc, 2)}) doit être supérieur au Qts du HP (${fmt(drv.qts, 2)}). ` +
            `Visez au moins ${fmt(drv.qts * 1.15, 2)}, ou choisissez un volume personnalisé.`);
        }
        vb = A.sealedVolume(drv.qts, vasEq, qtc);
        goalTxt = `Qtc ${fmt(qtc, 2)}`;
      }
      if (!(vb > 0)) throw new InputError('Volume du caisson clos invalide.');
    }

    if (type === 'ported') {
      const goal = $('ported-goal').value;
      if (goal === 'car' || goal === 'spl') {
        fb = goal === 'car' ? 34 : 40;
        vb = A.carPortedVolume(d.size) * mult * (goal === 'spl' ? 1.1 : 1);
        goalTxt = goal === 'car' ? 'voiture polyvalent' : 'SPL';
      } else if (goal === 'maker' && rec?.ported) {
        vb = rec.ported.vb * mult;
        // Volume seul publié : accord "plat", mais pas sous 32 Hz (usage voiture)
        fb = rec.ported.fb ?? Math.max(32, A.optimizeFb({ ...base, vb }));
        goalTxt = `recommandation ${rec.src}` + (rec.ported.fb ? '' : ' (accord calculé)');
      } else if (goal === 'custom') {
        vb = num('vb-ported'); fb = num('Fb');
        if (vb && !fb) fb = A.optimizeFb({ ...base, vb });
        if (fb && !vb) vb = A.optimizeVb(base, fb);
        goalTxt = 'personnalisé';
      }
      if (!vb || !fb) {
        vb = A.portedDefaultVolume(drv.qts, vasEq);
        fb = A.optimizeFb({ ...base, vb });
        if (!goalTxt) goalTxt = 'alignement plat';
      }
      const kind = document.querySelector('input[name="port-type"]:checked').value;
      port = sizePort({ ...base, type, vb, fb }, kind, vb);
    }

    if (type === 'bandpass') {
      let qtcR = num('bp-qtc', 0.85);
      if (qtcR <= drv.qts * 1.03) {
        notes.push(`Qtc arrière porté à ${fmt(drv.qts * 1.25, 2)} : il doit dépasser le Qts du HP (${fmt(drv.qts, 2)}).`);
        qtcR = drv.qts * 1.25;
      }
      const mins = bandpassMinVolumes(geoDrv, t, (num('bp-diam') ?? 100) / 10);
      ({ vr, vf, fb } = A.optimizeBandpass(base, qtcR, num('bp-fb'), mins));
      port = sizePort({ ...base, type, vr, vf, fb }, 'round', vf);
      goalTxt = `Qtc arrière ${fmt(qtcR, 2)}`;
    }

    let geo = designBox({ type, t, drv: geoDrv, vnet: vb, vr, vf, fb, port, custom });

    // Dimensions imposées : le volume réel peut être bien plus grand (ou plus
    // petit) que le volume visé. L'évent est redimensionné sur le volume réel,
    // sinon un grand caisson garde un évent minuscule (court, bruyant).
    if (custom && type === 'ported' && port && geo.net > 1) {
      const autoSize = port.kind === 'slot' ? !num('slot-h') : !num('port-diam');
      for (let i = 0; i < 2 && autoSize && Math.abs(geo.net / vb - 1) > 0.05; i++) {
        vb = geo.net;
        port = sizePort({ ...base, type, vb, fb }, port.kind, vb);
        geo = designBox({ type, t, drv: geoDrv, vnet: vb, vr, vf, fb, port, custom });
      }
    }

    // Bandpass, nombre de tubes "auto" : la chambre avant est peu profonde,
    // un seul gros tube n'y tient souvent pas. On ajoute des tubes (jusqu'à 4)
    // tant que la section logeable augmente.
    if (type === 'bandpass' && !num('bp-count') && !num('bp-diam')) {
      const want = port.area ?? port.minArea;
      for (let n = 2; n <= 4 && (geo.overflow > 0.5 || geo.portArea < 0.9 * want); n++) {
        const p2 = sizePort({ ...base, type, vr, vf, fb }, 'round', vf, n);
        const g2 = designBox({ type, t, drv: geoDrv, vnet: vb, vr, vf, fb, port: p2, custom });
        const better = (g2.overflow <= 0.5 && geo.overflow > 0.5) ||
          ((g2.overflow <= 0.5) === (geo.overflow <= 0.5) && g2.portArea > geo.portArea * 1.05);
        if (better) { geo = g2; port = p2; }
      }
    }
    if (port?.kind === 'round') port.d = geo.portD;
    if ((geo.net ?? Math.min(geo.vr, geo.vf)) <= 1) {
      throw new InputError('Dimensions trop petites : il ne reste pas de volume utile une fois le HP et l’évent placés.');
    }

    // Simulation du caisson réellement construit
    const fin = { ...base, type };
    if (type === 'sealed') fin.vb = geo.net;
    if (type === 'ported') { fin.vb = geo.net; fin.fb = geo.fbActual; }
    if (type === 'bandpass') { fin.vr = geo.vr; fin.vf = geo.vf; fin.fb = geo.fbActual; }
    if (geo.portArea) fin.portArea = geo.portArea / 1e4;
    const an = A.analyze(fin);

    this.r = { d, drv, count, iso, vasEq, type, t, custom, geo, an, fin, port, notes, goalTxt,
               target: { vb, fb, vr, vf }, geoDrv };
  }

  // ── Affichage ───────────────────────────────────────────────
  _render() {
    this._renderMetrics();
    this._renderDims();
    this._renderCuts();
    this._renderWarnings();
    this._renderChart();
    this._renderWiring();
    this._render3d();
  }

  /** Three.js arrive du CDN : on attend qu'il soit chargé (ou on s'en passe hors connexion). */
  _render3d() {
    if (!window.THREE) {
      if (!this._waiting3d) {
        this._waiting3d = true;
        window.addEventListener('three-ready', () => this.r && this._render3d(), { once: true });
      }
      return;
    }
    if (!this.viewer) this.viewer = new EnclosureViewer($('three-canvas'));
    this.viewer.build(this.r.geo);
  }

  _renderMetrics() {
    const { type, an, fin, drv, vasEq, d } = this.r;
    const cards = [];
    const add = (label, val, unit = '', cls = '') => cards.push(
      `<div class="metric-card ${cls}"><div class="metric-label">${label}</div>` +
      `<div class="metric-value">${val}<span class="metric-unit"> ${unit}</span></div></div>`);

    if (type === 'sealed') {
      const a = vasEq / fin.vb;
      add('Volume net', fmt(fin.vb), 'L', 'highlight');
      add('Qtc obtenu', fmt(drv.qts * Math.sqrt(1 + a), 2));
      add('Fc', fmt(drv.fs * Math.sqrt(1 + a), 0), 'Hz');
      add('f −3 dB', fmt(an.f3, 0), 'Hz', 'highlight');
    } else if (type === 'ported') {
      add('Volume net', fmt(fin.vb), 'L', 'highlight');
      add('Accord Fb', fmt(fin.fb), 'Hz', 'highlight');
      add('f −3 dB', fmt(an.f3, 0), 'Hz');
      add('Bosse max', (an.peak >= 0 ? '+' : '') + fmt(an.peak), 'dB', an.peak > 3 ? 'warn' : '');
    } else {
      add('Chambre arrière', fmt(fin.vr), 'L', 'highlight');
      add('Chambre avant', fmt(fin.vf), 'L', 'highlight');
      add('Bande −3 dB', `${fmt(an.f3, 0)}–${fmt(an.fHigh, 0)}`, 'Hz');
      add('Gain / clos', (an.gain >= 0 ? '+' : '') + fmt(an.gain), 'dB');
      add('Accord avant', fmt(fin.fb), 'Hz');
    }
    add(`SPL max (${fmt(d.power, 0)} W)`, fmt(an.splMax, 0), 'dB', 'highlight');
    const xr = an.xMax / drv.xmax;
    add('Excursion max', `${fmt(an.xMax)} / ${fmt(drv.xmax)}`, 'mm', xr > 1 ? 'warn' : '');
    add('Puissance limite Xmax', an.pXmax > 20000 ? '> 20 000' : fmt(an.pXmax, 0), 'W', xr > 1 ? 'warn' : '');
    if (type !== 'sealed') {
      add('Air dans l’évent', fmt(an.vPortMax), 'm/s', an.vPortMax > 26 ? 'warn' : '');
      add('Filtre subsonique', fmt(an.fSub, 0), 'Hz');
    }
    $('metrics-grid').innerHTML = cards.join('');
  }

  _renderDims() {
    const { geo, type, target, fin, port } = this.r;
    const row = (l, v) => `<div class="dim-row"><span class="dim-label">${l}</span><span class="dim-val">${v}</span></div>`;
    const sec = s => `<div class="dims-section-title">${s}</div>`;
    const box = o => `${fmt(o.W)} × ${fmt(o.H)} × ${fmt(o.D)} <span>cm</span>`;
    let h = sec('Dimensions (L × H × P)') +
      row('Extérieur', box(geo.ext)) + row('Intérieur', box(geo.int));

    h += sec('Volumes') + row('Volume intérieur brut', `${fmt(geo.gross)} <span>L</span>`);
    h += row('− HP', `${fmt(geo.disp.drivers)} <span>L</span>`);
    if (geo.disp.port)   h += row('− Évent (air + tube)', `${fmt(geo.disp.port)} <span>L</span>`);
    if (geo.disp.boards) h += row('− Planches de fente', `${fmt(geo.disp.boards)} <span>L</span>`);
    if (type === 'bandpass') {
      h += row('Cloison', `${fmt(geo.int.W * geo.int.H * this.r.t / 1000)} <span>L</span>`);
      h += row('= Chambre arrière', `<b>${fmt(geo.vr)}</b> <span>L (visé ${fmt(target.vr)})</span>`);
      h += row('= Chambre avant', `<b>${fmt(geo.vf)}</b> <span>L (visé ${fmt(target.vf)})</span>`);
    } else {
      const tgt = this.r.custom ? '' : ` (visé ${fmt(target.vb)})`;
      h += row('= Volume net', `<b>${fmt(geo.net)}</b> <span>L${tgt}</span>`);
    }

    if (port) {
      h += sec('Évent');
      if (port.kind === 'round') {
        h += row('Tubes', `${port.count} × Ø ${mm(port.d)} mm <span>(${fmt(geo.portArea, 0)} cm²)</span>`);
        h += row('Longueur par tube', `${fmt(geo.achieved)} <span>cm${geo.tubes[0]?.r ? ', coude 90°' : ''}, façade incluse</span>`);
      } else {
        h += row('Fente', `${fmt(geo.hs)} × ${fmt(geo.slotW)} <span>cm (${fmt(geo.portArea, 0)} cm², ${port.pos === 'bottom' ? 'en bas' : 'sur le côté'})</span>`);
        h += row('Longueur (axe)', `${fmt(geo.achieved)} <span>cm${geo.folded ? ', repliée contre l’arrière' : ''}</span>`);
      }
      const dfb = Math.abs(geo.fbActual - target.fb);
      h += row('Accord', `${fmt(fin.fb)} <span>Hz${dfb > 0.5 && !this.r.custom ? ` (visé ${fmt(target.fb)})` : ''}</span>`);
    }
    h += sec('Réglage') + row('Objectif', this.r.goalTxt) + row('HP', this.r.d.name);
    $('dims-table').innerHTML = h;
  }

  _renderCuts() {
    const { geo, t } = this.r;
    const rows = geo.cuts.map(c =>
      `<tr><td>${c.name}</td><td class="c">${c.qty}</td>` +
      `<td class="c">${c.b != null ? `${mm(c.a)} × ${mm(c.b)}` : `${mm(c.a)} (longueur)`}</td>` +
      `<td class="n">${c.note ?? ''}</td></tr>`).join('');
    $('cut-table').innerHTML =
      '<thead><tr><th>Pièce</th><th>Qté</th><th>Dimensions (mm)</th><th>Remarque</th></tr></thead>' + `<tbody>${rows}</tbody>`;
    const area = geo.cuts.filter(c => c.b != null).reduce((s, c) => s + c.qty * c.a * c.b, 0) / 1e4;
    $('cut-sub').textContent = `— panneaux ${mm(t)} mm, ≈ ${fmt(area, 2)} m² · dessus/dessous pleine taille, côtés entre les deux, façade et arrière à l'intérieur`;
  }

  _renderWarnings() {
    const { geo, an, drv, type, port, target, fin, d, notes, custom } = this.r;
    const w = [...new Set(notes)];

    if (geo.oversized) {
      w.push(`Le volume visé est trop petit pour loger ${this.r.count > 1 ? 'ces HP' : 'ce HP'} : le caisson a été agrandi au minimum physique. ` +
             `Le calcul utilise le volume réel.` +
             (type === 'sealed' && drv.vas < 40 ? ' Ce HP à faible Vas est conçu pour un caisson à évent.' : ''));
    }
    if (geo.overflow > 0.5) {
      let msg = `L'évent ne tient pas dans le caisson : il manque ${fmt(geo.overflow, 0)} cm de longueur. ` +
                `Accord réel ${fmt(fin.fb)} Hz au lieu de ${fmt(target.fb)} Hz.`;
      if (port.kind === 'slot') {
        const fit = A.slotAreaForLength(target.fb, fin.vb, geo.achieved);
        msg += ` Réduisez la largeur de fente à ≈ ${fmt(fit / geo.slotW)} cm (${fmt(fit, 0)} cm²).`;
      } else if (geo.areaReduced || this.r.port.sizes) {
        msg += ' Le tube est déjà au plus petit diamètre admis : passez à un évent en fente (plus long, replié) ou agrandissez le caisson.';
      } else {
        msg += ' Utilisez un diamètre plus petit, un évent en fente, ou un caisson plus profond.';
      }
      w.push(msg);
    }
    if (geo.areaReduced) {
      w.push(`Section d'évent réduite à ${fmt(geo.portArea, 0)} cm² pour que ${port.kind === 'slot' ? 'la fente' : 'le tube'} tienne dans le caisson.`);
    }
    if (an.xMax > drv.xmax) {
      w.push(`À ${fmt(d.power, 0)} W l'excursion atteint ${fmt(an.xMax)} mm (Xmax ${fmt(drv.xmax)} mm vers ${fmt(an.xMaxF, 0)} Hz). ` +
             `Limitez à ~${fmt(an.pXmax, 0)} W ou ${type === 'sealed' ? 'augmentez le volume' : 'abaissez l’accord'}.`);
    }
    if (type !== 'sealed' && an.vPortMax > 26) {
      w.push(`Air à ${fmt(an.vPortMax)} m/s dans l'évent à pleine puissance (sinus) : souffle possible. ` +
             (port.kind === 'round' ? 'Un évent en fente ou un 2e tube donne plus de section.' : 'Élargissez la fente ou le caisson.'));
    }
    if (type !== 'sealed') {
      w.push(`Réglez un filtre subsonique vers ${fmt(an.fSub, 0)} Hz : sous l'accord, le HP n'est plus freiné par l'évent.`);
    }
    if (type === 'bandpass' && an.fHigh / an.f3 < 1.6) {
      w.push(`Bande étroite (${fmt(an.f3, 0)}–${fmt(an.fHigh, 0)} Hz) : à cette puissance, une bande plus large ` +
             `demanderait un évent impossible à loger sans souffle. Pour ce HP, un caisson à évent est plus polyvalent.`);
    }
    if (type === 'ported' && drv.qts > 0.6) w.push(`Qts élevé (${fmt(drv.qts, 2)}) : ce HP est plus à l'aise en caisson clos.`);
    if (type === 'sealed' && drv.qts < 0.3) w.push(`Qts faible (${fmt(drv.qts, 2)}) : ce HP donnera plus de grave en caisson à évent.`);
    if (type === 'ported' && an.peak > 3) w.push(`Bosse de +${fmt(an.peak)} dB vers l'accord : grave "boomy". Un volume plus petit ou un accord plus bas l'atténue.`);
    if (custom) {
      w.push(`Dimensions imposées : volume net réel ${fmt(geo.net ?? geo.vr + geo.vf)} L` +
             (type === 'ported' ? `, évent recalculé pour ${fmt(target.fb)} Hz.` : '.'));
    }
    if (this.r.d.sd && !this.simple && !num('Sd')) w.push('Sd estimé d’après la taille : renseignez la valeur constructeur pour un SPL et une excursion exacts.');
    if (this.sub?.note && !this.simple) w.push(`${this.sub.model} : ${this.sub.note}`);

    const box = $('warnings-box');
    box.classList.toggle('hidden', !w.length);
    box.innerHTML = `<ul>${w.map(x => `<li>${x}</li>`).join('')}</ul>`;
  }

  // ── Graphique ───────────────────────────────────────────────
  _bindResults() {
    document.querySelectorAll('.chart-tab').forEach(b => b.addEventListener('click', () => {
      this.chartMode = b.dataset.chart;
      document.querySelectorAll('.chart-tab').forEach(x => x.classList.toggle('active', x === b));
      this._renderChart();
    }));
    $('chk-cabin').addEventListener('change', () => this._renderChart());
    $('btn-xray').addEventListener('click', e => e.currentTarget.classList.toggle('active', this.viewer?.toggleXray()));
    $('btn-wireframe').addEventListener('click', e => e.currentTarget.classList.toggle('active', this.viewer?.toggleWireframe()));
    $('btn-reset-cam').addEventListener('click', () => this.viewer?.resetCamera());
    $('btn-copy').addEventListener('click', () => this._copy());
    $('btn-share').addEventListener('click', () => this._share());
    $('amp-min').addEventListener('change', () => this._renderWiring());
    new ResizeObserver(() => { this.viewer?.resize(); if (this.r) this._renderChart(); }).observe($('viewer-container'));
  }

  // ── « Mes subs » ────────────────────────────────────────────
  _bindMine() {
    $('btn-save-sub').addEventListener('click', () => {
      const v = id => num(id);
      const p = { fs: v('Fs'), qes: v('Qes'), qms: v('Qms'), vas: v('Vas'), re: v('Re'), xmax: v('Xmax'), power: v('power') };
      if (!Object.values(p).every(x => x > 0)) {
        this._toast('Renseignez Fs, Qes, Qms, Vas, Re, Xmax et la puissance avant d’enregistrer.');
        return;
      }
      const size = +$('size').value, coils = +$('coils').value, z = +$('coil-z').value;
      const name = $('mysub-name').value.trim() || `Mon sub ${String(size).replace('.', ',')}"`;
      const list = loadMine();
      const id = isMine(this.sub) && list.some(x => x.id === this.sub.id) ? this.sub.id : 'u' + Date.now().toString(36);
      const row = {
        id, brand_id: 'mine', model: name, size_inch: size, diameter_mm: null,
        fs: p.fs, qes: p.qes, qms: p.qms, qts: +A.qtsOf(p.qes, p.qms).toFixed(3), vas: p.vas, xmax: p.xmax, re: p.re,
        sd: v('Sd'), cutout_mm: v('cutout'), depth_mm: v('depth'), disp_l: v('disp'),
        voice_coil: coils === 2 ? `2×${z}Ω` : `${z}Ω`, power_rms: p.power, recommended_type: 'both',
        note: 'Sub enregistré dans ce navigateur.',
      };
      const i = list.findIndex(x => x.id === id);
      if (i >= 0) list[i] = row; else list.push(row);
      if (!storeMine(list)) { this._toast('Enregistrement impossible : le stockage du navigateur est bloqué.'); return; }
      this.sub = normalizeSub(row);
      $('db-loaded-name').textContent = row.model;
      $('db-note').textContent = ' — enregistré dans Mes subs';
      $('db-loaded-band').classList.remove('hidden');
      $('btn-del-sub').classList.remove('hidden');
      this._refreshMine();
      this._toast(i >= 0 ? `« ${name} » mis à jour` : `« ${name} » ajouté à Mes subs`);
    });
    $('btn-del-sub').addEventListener('click', () => {
      if (!isMine(this.sub)) return;
      const name = this.sub.model;
      storeMine(loadMine().filter(x => x.id !== this.sub.id));
      this.sub = null;
      $('db-loaded-band').classList.add('hidden');
      $('btn-del-sub').classList.add('hidden');
      $('mysub-name').value = '';
      this._refreshMine();
      this._syncMakerOption();
      this._toast(`« ${name} » supprimé`);
    });
  }

  // ── Câblage des bobines ─────────────────────────────────────
  _renderWiring() {
    const box = $('wiring-box');
    if (!this.r || this.simple) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const { count, iso } = this.r;
    const n = iso ? 2 : count;
    const coils = +$('coils').value, z = +$('coil-z').value, ampMin = +$('amp-min').value;

    const perHp = coils === 2
      ? [{ z: 2 * z, t: 'bobines en série' }, { z: z / 2, t: 'bobines en parallèle' }]
      : [{ z, t: 'bobine unique' }];
    const opts = [];
    for (const h of perHp) {
      if (n === 1) { opts.push({ z: h.z, t: coils === 2 ? `Les 2 ${h.t}` : 'Branchement direct', d: '' }); continue; }
      const each = coils === 2 ? `chaque HP : ${h.t}` : '';
      opts.push({ z: h.z * n, t: `${n} HP en série`, d: each });
      opts.push({ z: h.z / n, t: `${n} HP en parallèle`, d: each });
      if (n === 4) opts.push({ z: h.z, t: '2 paires en série, mises en parallèle', d: each });
    }
    // Une seule ligne par impédance finale
    const byZ = new Map();
    for (const o of opts) if (!byZ.has(o.z)) byZ.set(o.z, o);
    const list = [...byZ.values()].sort((a, b) => a.z - b.z);
    const best = list.find(o => o.z >= ampMin);

    const zTxt = v => fmt(v, 2) + ' Ω';
    $('wiring-list').innerHTML = list.map(o => {
      const cls = o === best ? 'ok best' : o.z >= ampMin ? 'ok' : 'no';
      return `<div class="wire-opt ${cls}"><b>${zTxt(o.z)}</b><span>${o.t}</span>` +
             `<small>${[o.d, o.z < ampMin ? 'trop bas pour cet ampli' : ''].filter(Boolean).join(' · ') || 'charge vue par l’ampli'}</small></div>`;
    }).join('') +
      `<p class="wiring-note">${best
        ? `La puissance d’un ampli dépend de la charge : vérifiez qu’il délivre bien ${fmt(this.r.d.power, 0)} W RMS à ${zTxt(best.z)}.`
        : `Aucun câblage ne descend à ${zTxt(ampMin)} ou plus haut sans risque : choisissez un ampli stable plus bas ou d’autres HP.`}` +
      ' Ne mélangez jamais série et parallèle sur les deux bobines d’un même HP.</p>';
  }

  // ── Lien de partage ─────────────────────────────────────────
  _formFields() {
    return [...document.querySelectorAll('#section-params [id], #section-type [id]')]
      .filter(el => /^(INPUT|SELECT)$/.test(el.tagName) && el.type !== 'radio' && el.id !== 'mysub-name');
  }

  _share() {
    const f = {};
    for (const el of this._formFields()) f[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    f['port-type'] = document.querySelector('input[name="port-type"]:checked').value;
    const st = { v: 1, m: this.simple ? 's' : 'a', t: this.type, sub: this.sub && !isMine(this.sub) ? this.sub.id : null, f };
    const url = location.href.split('#')[0] + '#p=' + b64enc(JSON.stringify(st));
    history.replaceState(null, '', url);
    const done = () => this._toast('Lien copié : il rouvre exactement ce caisson');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, () => prompt('Copiez ce lien :', url));
    else prompt('Copiez ce lien :', url);
  }

  _restoreFromLink() {
    const m = /^#p=([\w-]+)$/.exec(location.hash);
    if (!m) return;
    let st;
    try { st = JSON.parse(b64dec(m[1])); } catch { return; }
    if (!st?.f) return;
    if (st.sub != null) this._loadSub(st.sub);
    const f = st.f;
    if (f['simple-size']) { $('simple-size').value = f['simple-size']; this._updateSimpleInfo(); }
    for (const el of this._formFields()) {
      if (!(el.id in f)) continue;
      if (el.type === 'checkbox') el.checked = !!f[el.id];
      else el.value = f[el.id];
    }
    const radio = document.querySelector(`input[name="port-type"][value="${f['port-type']}"]`);
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
    $('custom-dims-opts').classList.toggle('hidden', !$('custom-dims-toggle').checked);
    const tab = document.querySelector(`.tab-btn[data-type="${st.t}"]`);
    if (tab) tab.click();
    this._setMode(st.m === 's');
    this._updateQts();
    this._applyShowRules();
    this._run();
  }

  _renderChart() {
    if (!this.r) return;
    const { an, type, fin, drv, d } = this.r;
    const { sim } = an;
    if (!this.chart) this.chart = new Chart($('freq-chart'));
    const portTab = document.querySelector('.chart-tab[data-chart="port"]');
    portTab.classList.toggle('hidden', type === 'sealed');
    if (type === 'sealed' && this.chartMode === 'port') this.chartMode = 'resp';
    document.querySelectorAll('.chart-tab').forEach(x => x.classList.toggle('active', x.dataset.chart === this.chartMode));
    $('chk-cabin').parentElement.classList.toggle('hidden', this.chartMode !== 'resp');

    const marks = [];
    if (type === 'sealed') marks.push({ x: drv.fs * Math.sqrt(1 + this.r.vasEq / fin.vb), color: '#3ddc97', label: 'Fc' });
    else marks.push({ x: fin.fb, color: '#3ddc97', label: 'Fb' });
    if (type !== 'sealed') marks.push({ x: an.fSub, color: '#ff5c62', label: 'subso' });
    const gold = '#ffa53d';
    let note = '';

    if (this.chartMode === 'resp') {
      const series = [{ x: sim.f, y: sim.rel, color: gold, width: 2.5, fill: 'rgba(255,165,61,0.09)' }];
      if ($('chk-cabin').checked) {
        series.push({ x: sim.f, y: sim.f.map((f, i) => sim.rel[i] + A.cabinGain(f)), color: '#5ec8ff', width: 2, dash: [6, 4] });
        note = 'Pointillés : réponse estimée dans une voiture (gain habitacle moyen, +12 dB/oct sous ~55 Hz).';
      } else {
        note = `0 dB = niveau du HP au-dessus du grave. SPL absolu : 0 dB ≈ ${fmt(sim.splRef, 0)} dB à ${fmt(d.power, 0)} W (1 m, demi-espace).`;
      }
      marks.push({ x: an.f3, color: '#ffcf8a', label: 'f3' });
      this.chart.draw({ series, yMin: -30, yMax: 15, yStep: 5, unit: 'dB',
                        hLines: [{ y: -3, color: 'rgba(251,146,60,0.7)', label: '−3 dB' }], vLines: marks });
    } else if (this.chartMode === 'exc') {
      const yMax = Math.ceil(Math.max(drv.xmax * 1.5, Math.min(Math.max(...sim.xmm), drv.xmax * 4)) / 5) * 5;
      this.chart.draw({ series: [{ x: sim.f, y: sim.xmm, color: gold, width: 2.5 }],
                        yMin: 0, yMax, yStep: yMax / 5, unit: 'mm',
                        hLines: [{ y: drv.xmax, color: '#ff5c62', label: `Xmax ${fmt(drv.xmax)} mm` }], vLines: marks });
      note = `Excursion de chaque HP à ${fmt(d.power, 0)} W. Sous l'accord d'un évent elle s'envole : d'où le filtre subsonique.`;
    } else {
      const yMax = Math.max(35, Math.ceil(Math.max(...sim.vport.filter((v, i) => sim.f[i] >= an.fSub)) / 5) * 5);
      this.chart.draw({ series: [{ x: sim.f, y: sim.vport, color: gold, width: 2.5 }],
                        yMin: 0, yMax, yStep: yMax / 7, unit: 'm/s',
                        hLines: [{ y: 17, color: '#ffcf8a', label: '17 m/s' }, { y: 26, color: '#ff5c62', label: '26 m/s : souffle' }],
                        vLines: marks });
      note = `Vitesse de l'air dans l'évent à ${fmt(d.power, 0)} W.`;
    }
    $('chart-note').textContent = note;
  }

  // ── Copier ──────────────────────────────────────────────────
  _copy() {
    if (!this.r) return;
    const { geo, an, fin, type, d } = this.r;
    const names = { sealed: 'clos', ported: 'évent', bandpass: 'bandpass 4e ordre' };
    let s = `=== Caisson ${names[type]} — ${d.name} ===\n`;
    s += `Extérieur : ${fmt(geo.W)} × ${fmt(geo.H)} × ${fmt(geo.D)} cm (L×H×P)\n`;
    if (type === 'bandpass') s += `Chambres nettes : arrière ${fmt(fin.vr)} L, avant ${fmt(fin.vf)} L, accord ${fmt(fin.fb)} Hz\n`;
    else s += `Volume net : ${fmt(fin.vb)} L${fin.fb ? `, accord ${fmt(fin.fb)} Hz` : ''}\n`;
    s += `f −3 dB : ${fmt(an.f3, 0)} Hz · SPL max ${fmt(an.splMax, 0)} dB @ ${fmt(d.power, 0)} W\n\nPlan de découpe (mm) :\n`;
    for (const c of geo.cuts) s += `- ${c.qty} × ${c.name} : ${c.b != null ? `${mm(c.a)} × ${mm(c.b)}` : `${mm(c.a)} de long`}${c.note ? ` (${c.note})` : ''}\n`;
    navigator.clipboard.writeText(s).then(() => {
      this._toast('Résumé copié dans le presse-papiers');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => new App());
