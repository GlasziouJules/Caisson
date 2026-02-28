-- ============================================================
--  CAISSON DE BASSE — Base de données MySQL
--  Paramètres de Thiele-Small pour subwoofers car audio
--  Sources : loudspeakerdatabase.com, datasheets officiels
--  fabricants (MTX, Focal, GAS, Ground Zero)
-- ============================================================

CREATE DATABASE IF NOT EXISTS caisson_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE caisson_db;

-- ── Marques ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(60)  NOT NULL,
  country    VARCHAR(50),
  website    VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Subwoofers ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subwoofers (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  brand_id         INT NOT NULL,
  model            VARCHAR(100) NOT NULL,
  size_inch        DECIMAL(4,1) NOT NULL,
  diameter_mm      INT NOT NULL,

  -- Thiele-Small
  fs               DECIMAL(6,2)  NOT NULL COMMENT 'Fréquence de résonance (Hz)',
  qts              DECIMAL(6,4)  NOT NULL COMMENT 'Facteur de qualité total',
  qes              DECIMAL(6,4)  NOT NULL COMMENT 'Facteur de qualité électrique',
  qms              DECIMAL(6,3)  NOT NULL COMMENT 'Facteur de qualité mécanique',
  vas              DECIMAL(8,2)  NOT NULL COMMENT 'Volume compliance équivalent (L)',
  xmax             DECIMAL(5,1)  NOT NULL COMMENT 'Excursion maximale linéaire (mm)',
  re               DECIMAL(5,2)  NOT NULL COMMENT 'Résistance DC bobine (Ω)',

  -- Électrique
  voice_coil       VARCHAR(20)   COMMENT 'Ex: 2×2Ω, 4Ω, 2×4Ω',
  power_rms        INT           COMMENT 'Puissance nominale RMS (W)',
  power_peak       INT           COMMENT 'Puissance crête (W)',

  -- Recommandation caisson
  recommended_type ENUM('sealed','ported','both') DEFAULT 'both',

  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  INDEX idx_brand (brand_id),
  INDEX idx_size  (size_inch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
--  DONNÉES — Paramètres T/S vérifiés
-- ============================================================

INSERT INTO brands (name, country, website) VALUES
  ('MTX Audio',   'États-Unis', 'https://www.mtxaudio.fr'),
  ('Focal',       'France',     'https://www.focal.com'),
  ('GAS',         'Suède',      'https://www.gasaudiopower.com'),
  ('GroundZero',  'Allemagne',  'https://www.ground-zero-audio.com');


-- ── MTX Audio (brand_id = 1) ─────────────────────────────────
-- Sources : loudspeakerdatabase.com/MTX, mtxaudio.eu datasheets
INSERT INTO subwoofers
  (brand_id, model,         size_inch, diameter_mm, fs,    qts,   qes,   qms,   vas,   xmax, re,   voice_coil, power_rms, power_peak, recommended_type) VALUES
  -- RT12-04 : entrée de gamme 12", bobine 4Ω
  (1, 'MTX RT12-04',        12.0, 305, 28.00, 0.5400, 0.5800, 6.870,  68.00, 16.0, 3.20, '4Ω',    250,   750, 'both'),
  -- TX8 Series : competition 1800-2000W, bobine 2Ω
  (1, 'MTX TX812',          12.0, 305, 35.00, 0.4200, 0.4600, 5.120,  24.60, 12.5, 2.00, '2Ω',   1800,  5400, 'both'),
  (1, 'MTX TX815',          15.0, 380, 31.00, 0.4900, 0.5300, 6.300,  69.30, 12.5, 2.00, '2Ω',   2000,  6000, 'both'),
  -- RFL Series : ultra-competition 3000-3500W, faible Qts → évent obligatoire
  (1, 'MTX RFL12',          12.0, 305, 35.00, 0.3500, 0.3700, 7.610,  14.60, 15.0, 2.00, '2Ω',   3000,  9000, 'ported'),
  (1, 'MTX RFL15',          15.0, 380, 35.00, 0.3800, 0.4000, 7.030,  44.00, 15.0, 2.00, '2Ω',   3500, 10500, 'ported');


-- ── Focal (brand_id = 2) ─────────────────────────────────────
-- Sources : focal-audio.jp datasheets PDF, focal-america.com, loudspeakerdatabase.com/Focal
INSERT INTO subwoofers
  (brand_id, model,         size_inch, diameter_mm, fs,    qts,   qes,   qms,   vas,   xmax, re,   voice_coil, power_rms, power_peak, recommended_type) VALUES
  -- Sub P25 FE (Flax Expert) 10" 4Ω — Fs=31Hz, Qts=0.45
  (2, 'Focal Sub P25 FE',   10.0, 250, 31.00, 0.4500, 0.5100, 4.500,  29.00, 14.0, 3.70, '4Ω',    300,   600, 'both'),
  -- Sub P25 FSE (Flax EVO, compact) 10" 4Ω — Qts=0.78 → caisson clos
  (2, 'Focal Sub P25 FSE',  10.0, 250, 30.00, 0.7800, 0.9500, 5.000,  25.00, 11.0, 3.20, '4Ω',    280,   560, 'sealed'),
  -- Sub P25 DB (Double Bobine) 10" 2×1Ω — très faible Fs, idéal évent
  (2, 'Focal Sub P25 DB',   10.0, 250, 27.46, 0.4310, 0.4700, 5.210,  40.72,  8.5, 1.70, '2×1Ω', 300,   600, 'both'),
  -- Sub P30F (Expert Flax) 12" 4Ω — Fs=28Hz, large Vas=70L
  (2, 'Focal Sub P30F',     12.0, 300, 28.00, 0.4700, 0.5100, 5.600,  70.00, 14.0, 3.70, '4Ω',    400,   800, 'both'),
  -- Sub P30 FSE (Flax EVO, encastrable) 12" 4Ω — très haut Qts → clos/encastré
  (2, 'Focal Sub P30 FSE',  12.0, 300, 30.00, 1.1000, 1.3000, 7.200,  42.00, 11.0, 3.20, '4Ω',    300,   600, 'sealed');


-- ── GAS Audio Power (brand_id = 3) ──────────────────────────
-- Sources : gasaudiopower.com datasheets, bassbrothers.no PDF officiel, loudspeakerdatabase.com
INSERT INTO subwoofers
  (brand_id, model,         size_inch, diameter_mm, fs,    qts,   qes,   qms,   vas,   xmax, re,   voice_coil, power_rms, power_peak, recommended_type) VALUES
  -- MAX S1-8D1 : 8" 550W RMS, 2×1Ω — Xmax=12mm
  (3, 'GAS MAX S1-8D1',      8.0, 200, 33.10, 0.4200, 0.4700, 3.780,   8.80, 12.0, 1.80, '2×1Ω', 550,  1100, 'both'),
  -- MAX S1-10D1 : 10" 1500W RMS, 2×1Ω — Xmax=20mm
  (3, 'GAS MAX S1-10D1',    10.0, 250, 33.30, 0.4700, 0.5100, 5.520,  11.70, 20.0, 1.80, '2×1Ω',1500,  3000, 'both'),
  -- MAX S1-10D2 : 10" 1500W RMS, 2×2Ω — Xmax=20mm
  (3, 'GAS MAX S1-10D2',    10.0, 250, 31.00, 0.4900, 0.5300, 5.710,  14.90, 20.0, 3.80, '2×2Ω',1500,  3000, 'both'),
  -- MAX S1-12D1 : 12" 1600W RMS, 2×1Ω — Xmax=40mm exceptionnel
  (3, 'GAS MAX S1-12D1',    12.0, 305, 27.40, 0.4800, 0.5300, 5.810,  33.40, 40.0, 1.80, '2×1Ω',1600,  3200, 'both'),
  -- MAX S2-15D1 : 15" 2500W RMS, 2×1Ω — Vas=59.5L
  (3, 'GAS MAX S2-15D1',    15.0, 380, 31.00, 0.4500, 0.4900, 5.440,  59.50, 25.0, 2.20, '2×1Ω',2500,  5000, 'both');


-- ── Ground Zero (brand_id = 4) ────────────────────────────────
-- Sources : loudspeakerdatabase.com/GroundZero, ground-zero-audio.com datasheets PDF
INSERT INTO subwoofers
  (brand_id, model,         size_inch, diameter_mm, fs,    qts,   qes,   qms,   vas,   xmax, re,   voice_coil, power_rms, power_peak, recommended_type) VALUES
  -- GZUW 8CF : 8" Uranium Carbon Fiber — Fs élevé, idéal caisson clos compact
  (4, 'GZUW 8CF',            8.0, 215, 57.00, 0.7000, 0.7400,11.920,   4.80, 10.0, 4.10, '2×2Ω', 300,   600, 'sealed'),
  -- GZNW 12Xmax : 12" Nuclear SPL 3000W, 2×1Ω
  (4, 'GZNW 12Xmax',        12.0, 305, 35.60, 0.6100, 0.6700, 6.820,  13.60, 17.5, 1.80, '2×1Ω',3000,  6000, 'both'),
  -- GZNW 12X-D2 : 12" Nuclear ultra-basse fréquence (Fs=21.8Hz !), 2×2Ω
  (4, 'GZNW 12X-D2',        12.0, 305, 21.80, 0.3300, 0.3200, 7.760,  35.00, 31.0, 4.20, '2×2Ω',2000,  3500, 'ported'),
  -- GZNW 15Xmax : 15" Nuclear 4000W, faible Qts → évent
  (4, 'GZNW 15Xmax',        15.0, 380, 29.50, 0.3300, 0.3500, 5.130,  35.70, 12.5, 2.00, '2×1Ω',4000,  8000, 'ported'),
  -- GZPW 15Xmax : 15" Plutonium 6000W compétition, Xmax=23mm, évent
  (4, 'GZPW 15Xmax',        15.0, 380, 31.60, 0.4000, 0.4470, 6.020,  24.00, 23.0, 2.00, '2×1Ω',6000, 12000, 'ported');
