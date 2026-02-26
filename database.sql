-- ============================================================
--  CAISSON DE BASSE — Base de données MySQL
--  Paramètres de Thiele-Small pour subwoofers car audio
--  Valeurs de référence — vérifier les datasheets officiels
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
--  DONNÉES
-- ============================================================

INSERT INTO brands (name, country, website) VALUES
  ('MTX Audio',   'États-Unis', 'https://www.mtx.com'),
  ('Focal',       'France',     'https://www.focal.com'),
  ('GAS',         'Suède',      'https://www.gasaudio.com'),
  ('GroundZero',  'Allemagne',  'https://www.ground-zero-audio.com'),
  ('JBL',         'États-Unis', 'https://www.jbl.com');


-- ── MTX Audio (brand_id = 1) ─────────────────────────────────
INSERT INTO subwoofers
  (brand_id, model,            size_inch, diameter_mm, fs,    qts,   qes,   qms,  vas,   xmax, re,   voice_coil, power_rms, power_peak, recommended_type) VALUES
  (1, 'MTX RT8D 8"',           8.0,  200, 48.00, 0.5200, 0.6800, 3.20,  9.00, 7.5,  3.60, '2×4Ω',  150,  450, 'sealed'),
  (1, 'MTX RT10D 10"',         10.0, 250, 42.00, 0.4500, 0.5700, 3.30, 16.00, 9.5,  3.50, '2×4Ω',  200,  600, 'both'),
  (1, 'MTX 55DOIT 12"',        12.0, 305, 36.00, 0.3800, 0.4700, 3.00, 38.00,13.0,  3.50, '2×4Ω',  500, 1500, 'both'),
  (1, 'MTX 9512D2 12"',        12.0, 305, 27.00, 0.2800, 0.3500, 2.30, 82.00,22.0,  1.70, '2×2Ω', 1200, 3600, 'ported'),
  (1, 'MTX 9500D2 15"',        15.0, 380, 22.00, 0.2500, 0.3100, 2.10,140.00,27.0,  1.50, '2×2Ω', 1500, 4500, 'ported');


-- ── Focal (brand_id = 2) ─────────────────────────────────────
INSERT INTO subwoofers
  (brand_id, model,            size_inch, diameter_mm, fs,    qts,   qes,   qms,  vas,   xmax, re,   voice_coil, power_rms, power_peak, recommended_type) VALUES
  (2, 'Focal Sub P20F 8"',     8.0,  210, 52.00, 0.5200, 0.6800, 3.50,  9.00, 6.5,  3.50, '4Ω',    150,  450, 'sealed'),
  (2, 'Focal Sub P25F 10"',   10.0,  250, 44.00, 0.4800, 0.6200, 3.50, 15.00, 8.0,  3.50, '4Ω',    200,  600, 'sealed'),
  (2, 'Focal Sub P30F 12"',   12.0,  300, 36.00, 0.4000, 0.5000, 3.00, 32.00,12.0,  3.30, '4Ω',    300,  900, 'both'),
  (2, 'Focal Sub P33F 13"',   13.0,  330, 30.00, 0.3600, 0.4500, 2.80, 52.00,16.0,  3.00, '4Ω',    400, 1200, 'both'),
  (2, 'Focal Utopia Be W33',  13.0,  330, 22.00, 0.2800, 0.3400, 2.30, 80.00,24.0,  2.40, '4Ω',    500, 1500, 'ported');


-- ── GAS (brand_id = 3) ──────────────────────────────────────
INSERT INTO subwoofers
  (brand_id, model,            size_inch, diameter_mm, fs,    qts,   qes,   qms,  vas,   xmax, re,   voice_coil, power_rms, power_peak, recommended_type) VALUES
  (3, 'GAS SQ8D4 8"',          8.0,  200, 48.00, 0.4800, 0.6200, 3.30, 10.00,10.0,  3.50, '2×4Ω',  300,  900, 'sealed'),
  (3, 'GAS SQ10D4 10"',       10.0,  250, 40.00, 0.4200, 0.5300, 3.20, 20.00,13.0,  3.40, '2×4Ω',  450, 1350, 'both'),
  (3, 'GAS SQ12D4 12"',       12.0,  305, 33.00, 0.3600, 0.4500, 3.00, 40.00,16.0,  3.30, '2×4Ω',  600, 1800, 'both'),
  (3, 'GAS Octane 10D4',      10.0,  250, 36.00, 0.3400, 0.4300, 2.80, 28.00,16.0,  3.30, '2×4Ω',  700, 2100, 'ported'),
  (3, 'GAS Octane 12D4',      12.0,  305, 26.00, 0.2800, 0.3500, 2.50, 60.00,22.0,  3.00, '2×4Ω', 1000, 3000, 'ported');


-- ── GroundZero (brand_id = 4) ────────────────────────────────
INSERT INTO subwoofers
  (brand_id, model,            size_inch, diameter_mm, fs,    qts,   qes,   qms,  vas,   xmax, re,   voice_coil, power_rms, power_peak, recommended_type) VALUES
  (4, 'GZPW 8D4 8"',           8.0,  200, 50.00, 0.5200, 0.6800, 3.60, 12.00, 9.0,  3.50, '2×4Ω',  250,  750, 'sealed'),
  (4, 'GZPW 10D4 10"',        10.0,  250, 38.00, 0.4200, 0.5300, 3.20, 22.00,12.0,  3.40, '2×4Ω',  400, 1200, 'both'),
  (4, 'GZPW 12D4 12"',        12.0,  305, 30.00, 0.3500, 0.4300, 3.00, 50.00,17.0,  3.40, '2×4Ω',  650, 1950, 'both'),
  (4, 'GZPW 15D2 15"',        15.0,  380, 24.00, 0.2800, 0.3500, 2.60,100.00,22.0,  1.80, '2×2Ω',  900, 2700, 'ported'),
  (4, 'GZPW 3000SPL 12"',     12.0,  305, 35.00, 0.3000, 0.3700, 2.50, 45.00,28.0,  2.50, '2×2Ω', 1500, 4500, 'ported');


-- ── JBL (brand_id = 5) ──────────────────────────────────────
INSERT INTO subwoofers
  (brand_id, model,            size_inch, diameter_mm, fs,    qts,   qes,   qms,  vas,   xmax, re,   voice_coil, power_rms, power_peak, recommended_type) VALUES
  (5, 'JBL Club WS1000 10"',  10.0,  250, 37.00, 0.4000, 0.5000, 3.00, 30.00,12.0,  3.50, '4Ω',    400, 1200, 'both'),
  (5, 'JBL CS-WQ12 12"',      12.0,  305, 38.00, 0.4100, 0.5200, 2.90, 30.00,11.0,  3.50, '4Ω',    450, 1350, 'both'),
  (5, 'JBL GT-BassPro 12"',   12.0,  305, 33.00, 0.3700, 0.4600, 2.80, 48.00,14.0,  3.30, '4Ω',    500, 1500, 'both'),
  (5, 'JBL Stage 1210 12"',   12.0,  305, 35.00, 0.3800, 0.4700, 3.00, 35.00,12.0,  3.50, '4Ω',    400, 1200, 'both'),
  (5, 'JBL W15GTI MkII 15"',  15.0,  380, 19.00, 0.2400, 0.3000, 2.00,165.00,32.0,  2.00, '2×2Ω', 2000, 6000, 'ported');
