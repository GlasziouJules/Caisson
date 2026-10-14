// ============================================================
//  DONNÉES — subwoofers intégrés au site (aucun serveur requis)
//  Conventions :
//   - xmax : excursion linéaire UN SENS (mm). GAS et Ground Zero
//     publient la course crête-à-crête (×2) : divisée par 2 ici.
//   - re   : HP double bobine → valeur des 2 bobines EN SÉRIE, sauf note.
//   - sd (cm²), cutout / depth (mm), disp (L) : null = estimé par le calcul.
//   - rec  : caisson recommandé (volume NET en L, accord en Hz si publié).
//  Vérifié le 14/10/2026 contre les fiches et manuels fabricants
//  (mtxaudio.eu/.fr, focal.com, gasaudiopower.com, ground-zero-audio.com),
//  recoupés avec loudspeakerdatabase.com. Écarts signalés dans `note`.
// ============================================================

const DATA = (() => {
  const BRANDS = [
    { id: 1, name: 'MTX Audio',  country: 'États-Unis' },
    { id: 2, name: 'Focal',      country: 'France'     },
    { id: 3, name: 'GAS',        country: 'Suède'      },
    { id: 4, name: 'Ground Zero', country: 'Allemagne' },
  ];

  const SUBS = [
    // ── MTX Audio ──────────────────────────────────────────────
    { id: 1, brand_id: 1, model: 'MTX RT12-04', size_inch: 12, diameter_mm: 305,
      fs: 28, qts: 0.54, qes: 0.58, qms: 6.87, vas: 68, xmax: 16, re: 3.2,
      sd: 511, cutout_mm: 278, depth_mm: 134, disp_l: null,
      voice_coil: '4Ω', power_rms: 250, recommended_type: 'both',
      rec: { sealed: 35.3, ported: { vb: 56.7, fb: 30 }, src: 'MTX' },
      note: 'MTX : clos 35,3 L ou évent 56,7 L accordé à 30 Hz. Xmax 16 mm (une autre source indique 14,5 mm).' },
    { id: 2, brand_id: 1, model: 'MTX TX812', size_inch: 12, diameter_mm: 305,
      fs: 32, qts: 0.44, qes: 0.47, qms: 6.63, vas: 30.4, xmax: 12.5, re: 2.0,
      sd: 497, cutout_mm: 285, depth_mm: 185, disp_l: null,
      voice_coil: '2Ω', power_rms: 1800, recommended_type: 'ported',
      rec: { ported: { vb: 56, fb: 34 }, src: 'MTX' },
      note: 'Paramètres de la page produit MTX Europe (le manuel donne Fs 35 Hz, Qts 0,42, Vas 24,6 L). MTX : 56 L net accordé à 34 Hz, 1 évent de 100 mm.' },
    { id: 3, brand_id: 1, model: 'MTX TX815', size_inch: 15, diameter_mm: 380,
      fs: 31, qts: 0.49, qes: 0.53, qms: 6.30, vas: 69.3, xmax: 12.5, re: 2.0,
      sd: 793, cutout_mm: null, depth_mm: 200, disp_l: null,
      voice_coil: '2Ω', power_rms: 2000, recommended_type: 'ported',
      rec: { ported: { vb: 90, fb: 34 }, src: 'MTX' },
      note: 'Fiche MTX France/Europe. MTX : 90 L net accordé à 34 Hz, 2 évents de 100 mm. (loudspeakerdatabase indique Fs 35 Hz, Vas 44,7 L.)' },
    { id: 4, brand_id: 1, model: 'MTX RFL12', size_inch: 12, diameter_mm: 305,
      fs: 35, qts: 0.35, qes: 0.37, qms: 7.61, vas: 14.6, xmax: 15, re: 2.0,
      sd: 498, cutout_mm: 285, depth_mm: 230, disp_l: null,
      voice_coil: '2Ω', power_rms: 3000, recommended_type: 'ported',
      rec: { sealed: 36, ported: { vb: 63 }, src: 'MTX' },
      note: 'Manuel actuel. MTX : clos 36 L ou évent 63 L. Une ancienne fiche donne Fs 32 Hz, Qts 0,37, Vas 21 L.' },
    { id: 5, brand_id: 1, model: 'MTX RFL15', size_inch: 15, diameter_mm: 380,
      fs: 35, qts: 0.38, qes: 0.40, qms: 7.03, vas: 44, xmax: 15, re: 2.0,
      sd: 838, cutout_mm: null, depth_mm: 245, disp_l: null,
      voice_coil: '2Ω', power_rms: 3500, recommended_type: 'ported',
      rec: { ported: { vb: 80, fb: 34 }, src: 'MTX' },
      note: 'Manuel. MTX : 80 L net accordé à 34 Hz, 2 évents de 100 mm. La page produit donne Fs 32 Hz, Qts 0,41, Vas 59,7 L.' },

    // ── Focal ─────────────────────────────────────────────────
    { id: 6, brand_id: 2, model: 'Focal Sub P25 FE', size_inch: 10, diameter_mm: 260,
      fs: 31, qts: 0.45, qes: 0.51, qms: 4.5, vas: 29, xmax: 14, re: 3.7,
      sd: 347, cutout_mm: 234, depth_mm: 141, disp_l: null,
      voice_coil: '4Ω', power_rms: 300, recommended_type: 'both',
      rec: { sealed: 17, ported: { vb: 30 }, src: 'Focal' },
      note: 'Focal : clos 10 à 25 L, bass-reflex 25 à 35 L (milieu de plage retenu). Découpe 234 mm (LSDB) : mesurez avant de découper.' },
    { id: 7, brand_id: 2, model: 'Focal Sub P25 FSE', size_inch: 10, diameter_mm: 250,
      fs: 30, qts: 0.78, qes: 0.95, qms: 5.0, vas: 25, xmax: 11, re: 3.2,
      sd: 346, cutout_mm: 214, depth_mm: 76, disp_l: null,
      voice_coil: '4Ω', power_rms: 280, recommended_type: 'sealed',
      rec: { sealed: 15, src: 'Focal' },
      note: 'Focal : clos de 12 à 18 L. Découpe 214 mm / profondeur 76 mm selon Focal (LSDB : 234 / 88 mm).' },
    { id: 8, brand_id: 2, model: 'Focal Sub P25 DB', size_inch: 10, diameter_mm: 250,
      fs: 27.46, qts: 0.431, qes: 0.47, qms: 5.21, vas: 40.72, xmax: 8.5, re: 1.7,
      sd: 346, cutout_mm: null, depth_mm: 139, disp_l: null,
      voice_coil: '2×4Ω', power_rms: 250, recommended_type: 'both',
      rec: { sealed: 12.5, ported: { vb: 20 }, src: 'Focal' },
      note: 'Focal : clos 10 à 15 L, bass-reflex 15 à 25 L. Re 1,7 Ω et Bl 9,45 selon la fiche Focal (paramètres mesurés bobines en parallèle).' },
    { id: 9, brand_id: 2, model: 'Focal Sub P30F', size_inch: 12, diameter_mm: 300,
      fs: 28, qts: 0.47, qes: 0.51, qms: 5.6, vas: 70, xmax: 14, re: 3.7,
      sd: 510, cutout_mm: 276, depth_mm: null, disp_l: null,
      voice_coil: '4Ω', power_rms: 400, recommended_type: 'both',
      rec: { sealed: 28.3, ported: { vb: 40 }, src: 'Focal' },
      note: 'Ancienne gamme Expert. Focal : clos 28,3 L, bass-reflex 40 L.' },
    { id: 10, brand_id: 2, model: 'Focal Sub P30 FSE', size_inch: 12, diameter_mm: 300,
      fs: 30, qts: 1.10, qes: 1.30, qms: 7.2, vas: 42, xmax: 11, re: 3.2,
      sd: 510, cutout_mm: 276, depth_mm: 109, disp_l: null,
      voice_coil: '4Ω', power_rms: 300, recommended_type: 'sealed',
      note: 'Qts très élevé (1,10) : HP extra-plat prévu pour un petit clos. Paramètres T/S issus de revendeurs (non publiés par Focal).' },

    // ── GAS Audio Power ───────────────────────────────────────
    { id: 11, brand_id: 3, model: 'GAS MAX S1-8D1', size_inch: 8, diameter_mm: 200,
      fs: 33.1, qts: 0.42, qes: 0.47, qms: 3.78, vas: 8.8, xmax: 6, re: 1.8,
      sd: 201, cutout_mm: 185, depth_mm: 141, disp_l: null,
      voice_coil: '2×1Ω', power_rms: 550, recommended_type: 'both',
      rec: { sealed: 8, ported: { vb: 23.5, fb: 37 }, src: 'GAS' },
      note: 'GAS annonce 12 mm (crête-à-crête) → 6 mm un sens. Clos 8 L ou évent 23,5 L à 37 Hz (fiche GAS) ; le manuel général cite aussi 17 L clos / 27,5 L à 36 Hz.' },
    { id: 12, brand_id: 3, model: 'GAS MAX S1-10D1', size_inch: 10, diameter_mm: 250,
      fs: 33.3, qts: 0.47, qes: 0.51, qms: 5.52, vas: 11.7, xmax: 10, re: 1.8,
      sd: 330, cutout_mm: 235, depth_mm: 166, disp_l: 2.5,
      voice_coil: '2×1Ω', power_rms: 1500, recommended_type: 'ported',
      rec: { ported: { vb: 43, fb: 37 }, src: 'GAS' },
      note: 'GAS annonce 20 mm (crête-à-crête) → 10 mm un sens. Manuel : 43 L à 37 Hz, fente.' },
    { id: 13, brand_id: 3, model: 'GAS MAX S1-10D2', size_inch: 10, diameter_mm: 250,
      fs: 31, qts: 0.49, qes: 0.53, qms: 5.71, vas: 14.9, xmax: 10, re: 3.8,
      sd: 330, cutout_mm: 235, depth_mm: 166, disp_l: 2.5,
      voice_coil: '2×2Ω', power_rms: 1500, recommended_type: 'ported',
      rec: { ported: { vb: 43, fb: 37 }, src: 'GAS' },
      note: 'GAS annonce 20 mm (crête-à-crête) → 10 mm un sens. Même caisson conseillé que la version D1.' },
    { id: 14, brand_id: 3, model: 'GAS MAX S1-12D1', size_inch: 12, diameter_mm: 305,
      fs: 27.4, qts: 0.48, qes: 0.53, qms: 5.81, vas: 33.4, xmax: 20, re: 1.8,
      sd: 530, cutout_mm: 285, depth_mm: 187, disp_l: null,
      voice_coil: '2×1Ω', power_rms: 1600, recommended_type: 'ported',
      rec: { sealed: 25, ported: { vb: 45 }, src: 'GAS' },
      note: 'GAS annonce 40 mm (crête-à-crête) → 20 mm un sens. GAS : clos 25 L ou évent fente 45 L (accord non publié : calculé).' },
    { id: 15, brand_id: 3, model: 'GAS MAX S2-15D1', size_inch: 15, diameter_mm: 380,
      fs: 31, qts: 0.45, qes: 0.49, qms: 5.44, vas: 59.5, xmax: 25, re: 2.2,
      sd: 742, cutout_mm: 350, depth_mm: 215, disp_l: 5,
      voice_coil: '2×1Ω', power_rms: 2500, recommended_type: 'ported',
      note: 'GAS annonce 50 mm (crête-à-crête) → 25 mm un sens. Pas de volume recommandé publié de façon fiable : le calcul le détermine.' },

    // ── Ground Zero ───────────────────────────────────────────
    { id: 16, brand_id: 4, model: 'GZUW 8CF', size_inch: 8, diameter_mm: 215,
      fs: 56.9, qts: 0.69, qes: 0.74, qms: 11.92, vas: 4.8, xmax: 10, re: 4.1,
      sd: 201, cutout_mm: 181, depth_mm: 108, disp_l: null,
      voice_coil: '2×2Ω', power_rms: 300, recommended_type: 'sealed',
      rec: { sealed: 14, ported: { vb: 18, fb: 46 }, src: 'revendeur' },
      note: 'Ground Zero annonce 20 mm (crête-à-crête) → 10 mm un sens. Clos 8 à 20 L ou évent 18 L à 46 Hz (revendeur).' },
    { id: 17, brand_id: 4, model: 'GZNW 12Xmax', size_inch: 12, diameter_mm: 305,
      fs: 35.6, qts: 0.61, qes: 0.67, qms: 6.82, vas: 13.6, xmax: 30, re: 1.8,
      sd: 452, cutout_mm: 282, depth_mm: 250, disp_l: null,
      voice_coil: '2×1Ω', power_rms: 3000, recommended_type: 'ported',
      rec: { sealed: 35, ported: { vb: 80 }, src: 'revendeur' },
      note: 'Ground Zero annonce 60 mm (crête-à-crête) → 30 mm un sens (LSDB : 17,5 mm). Clos 25–45 L ou évent 60–100 L net (revendeurs).' },
    { id: 18, brand_id: 4, model: 'GZNW 12X-D2', size_inch: 12, diameter_mm: 305,
      fs: 21.8, qts: 0.31, qes: 0.32, qms: 7.76, vas: 35, xmax: 31, re: 4.2,
      sd: null, cutout_mm: 282, depth_mm: 210, disp_l: null,
      voice_coil: '2×2Ω', power_rms: 2000, recommended_type: 'ported',
      rec: { ported: { vb: 90 }, src: 'Ground Zero' },
      note: 'Ground Zero annonce 62 mm (crête-à-crête) → 31 mm un sens. Qts recalculé depuis Qes et Qms (0,31 ; publié 0,33). GZ : 90 L net, 2 évents de 250 cm².' },
    { id: 19, brand_id: 4, model: 'GZNW 15Xmax', size_inch: 15, diameter_mm: 380,
      fs: 29.5, qts: 0.33, qes: 0.35, qms: 5.13, vas: 35.7, xmax: 40, re: 2.0,
      sd: 710, cutout_mm: 358, depth_mm: 285, disp_l: null,
      voice_coil: '2×1Ω', power_rms: 4000, recommended_type: 'ported',
      rec: { sealed: 40, ported: { vb: 90 }, src: 'Ground Zero' },
      note: 'Ground Zero annonce 80 mm (crête-à-crête) → 40 mm un sens. GZ : évent 80–100 L, section 400 cm² ; clos 40 L possible.' },
    { id: 20, brand_id: 4, model: 'GZPW 15Xmax', size_inch: 15, diameter_mm: 380,
      fs: 33.3, qts: 0.442, qes: 0.477, qms: 6.022, vas: 22.81, xmax: 40, re: 2.0,
      sd: null, cutout_mm: null, depth_mm: 297, disp_l: null,
      voice_coil: '2×1Ω', power_rms: 6000, recommended_type: 'ported',
      rec: { sealed: 40, ported: { vb: 120 }, src: 'Ground Zero' },
      note: 'Manuel Ground Zero 2017. Xmax annoncé 80 mm (crête-à-crête) → 40 mm un sens. GZ : fente 120 L net (400 cm²) ou clos 40 L.' },
  ];

  /**
   * HP génériques du mode simple : moyennes réalistes de subs voiture
   * (Qts 0,43–0,50, Vas compact). sd null → estimé.
   */
  const GENERIC = {
    8:  { fs: 40, qes: 0.55, qms: 5.0, vas: 12,  xmax: 10, re: 3.4, power: 250  },
    10: { fs: 34, qes: 0.52, qms: 5.5, vas: 25,  xmax: 12, re: 3.4, power: 400  },
    12: { fs: 31, qes: 0.50, qms: 6.0, vas: 45,  xmax: 14, re: 3.4, power: 600  },
    15: { fs: 29, qes: 0.48, qms: 6.0, vas: 80,  xmax: 16, re: 3.4, power: 1000 },
    18: { fs: 27, qes: 0.46, qms: 6.0, vas: 140, xmax: 18, re: 3.4, power: 1500 },
  };

  /** Diamètre nominal (mm) d'un HP de N pouces. */
  const NOMINAL_MM = { 8: 205, 10: 255, 12: 305, 15: 380, 18: 460 };

  /** Diamètres intérieurs de tubes PVC courants (mm). */
  const PVC_SIZES = [50, 63, 75, 80, 90, 100, 110, 125, 140, 160, 200];

  return { BRANDS, SUBS, GENERIC, NOMINAL_MM, PVC_SIZES };
})();
