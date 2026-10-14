-- ============================================================
--  CAISSON DE BASSE — Base de données MySQL
--  Paramètres Thiele-Small de subwoofers voiture.
--  Générée depuis js/data.js (même contenu que le mode hors-ligne).
--
--  Conventions :
--   - xmax : excursion linéaire UN SENS (mm). GAS / Ground Zero publient
--     souvent la valeur crête-à-crête : elle est divisée par 2 ici.
--   - re   : HP double bobine → 2 bobines en série, sauf mention (note).
--   - sd_cm2, cutout_mm, depth_mm, disp_l : NULL = estimé par le calcul.
--   - rec_* : volume / accord recommandés par le fabricant (NULL = inconnu).
--  Sources vérifiées (oct. 2026) : fiches et manuels fabricants,
--  loudspeakerdatabase.com.
-- ============================================================

CREATE DATABASE IF NOT EXISTS caisson_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE caisson_db;

DROP TABLE IF EXISTS subwoofers;
DROP TABLE IF EXISTS brands;

CREATE TABLE brands (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  name    VARCHAR(60) NOT NULL,
  country VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE subwoofers (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  brand_id         INT NOT NULL,
  model            VARCHAR(100) NOT NULL,
  size_inch        DECIMAL(4,1) NOT NULL,
  diameter_mm      INT NOT NULL            COMMENT 'Diamètre nominal (saladier)',
  fs               DECIMAL(6,2) NOT NULL   COMMENT 'Hz',
  qts              DECIMAL(6,4) NOT NULL,
  qes              DECIMAL(6,4) NOT NULL,
  qms              DECIMAL(6,3) NOT NULL,
  vas              DECIMAL(8,2) NOT NULL   COMMENT 'L',
  xmax             DECIMAL(5,1) NOT NULL   COMMENT 'mm, un sens',
  re               DECIMAL(5,2) NOT NULL   COMMENT 'Ohm',
  sd_cm2           DECIMAL(7,1)            COMMENT 'Surface émissive',
  cutout_mm        INT                     COMMENT 'Diamètre de découpe',
  depth_mm         INT                     COMMENT 'Profondeur de montage',
  disp_l           DECIMAL(5,2)            COMMENT 'Volume déplacé par le HP',
  voice_coil       VARCHAR(20),
  power_rms        INT,
  recommended_type ENUM('sealed','ported','both') DEFAULT 'both',
  rec_sealed_l     DECIMAL(6,1),
  rec_ported_l     DECIMAL(6,1),
  rec_ported_fb    DECIMAL(5,1),
  rec_source       VARCHAR(40),
  note             VARCHAR(255),
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  INDEX idx_brand (brand_id),
  INDEX idx_size  (size_inch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO brands (id, name, country) VALUES
  (1, 'MTX Audio', 'États-Unis'),
  (2, 'Focal', 'France'),
  (3, 'GAS', 'Suède'),
  (4, 'Ground Zero', 'Allemagne');

INSERT INTO subwoofers
  (id, brand_id, model, size_inch, diameter_mm, fs, qts, qes, qms, vas, xmax, re,
   sd_cm2, cutout_mm, depth_mm, disp_l, voice_coil, power_rms, recommended_type,
   rec_sealed_l, rec_ported_l, rec_ported_fb, rec_source, note) VALUES
  (1, 1, 'MTX RT12-04', 12, 305, 28, 0.54, 0.58, 6.87, 68, 16, 3.2, 511, 277, 134, NULL, '4Ω', 250, 'sealed', 35.3, NULL, NULL, 'revendeur', 'Xmax 16 mm (LSDB) — un revendeur indique 14,5 mm.'),
  (2, 1, 'MTX TX812', 12, 305, 32, 0.44, 0.47, 6.63, 30.4, 12.5, 2, NULL, 285, 185, NULL, '2Ω', 1800, 'ported', NULL, 56, 34, 'MTX', 'Paramètres de la fiche MTX Europe actuelle (le manuel d’origine diffère légèrement). MTX conseille 56 L net accordé à 34 Hz.'),
  (3, 1, 'MTX TX815', 15, 380, 31, 0.49, 0.53, 6.3, 69.3, 12.5, 2, 793, NULL, 200, NULL, '2Ω', 2000, 'ported', NULL, 90, 34, 'MTX', 'Fiche MTX Europe. MTX conseille 90 L net à 34 Hz.'),
  (4, 1, 'MTX RFL12', 12, 305, 35, 0.35, 0.37, 7.61, 14.6, 15, 2, 498, 285, 230, NULL, '2Ω', 3000, 'ported', NULL, 56, 34, 'MTX', 'Manuel d’origine. Une révision récente existe (Fs 32 Hz, Qts 0,37, Vas 21 L).'),
  (5, 1, 'MTX RFL15', 15, 380, 35, 0.38, 0.4, 7.03, 44, 15, 2, 838, NULL, 245, NULL, '2Ω', 3500, 'ported', NULL, NULL, NULL, NULL, 'Manuel d’origine. Révision récente : Fs 32 Hz, Qts 0,41, Vas 59,7 L.'),
  (6, 2, 'Focal Sub P25 FE', 10, 260, 31, 0.45, 0.51, 4.5, 29, 14, 3.7, 347, 234, 141, NULL, '4Ω', 300, 'both', NULL, NULL, NULL, NULL, 'Découpe : 234 mm selon LSDB, Focal indique 260 mm (diamètre hors-tout ?). Mesurez avant de découper.'),
  (7, 2, 'Focal Sub P25 FSE', 10, 250, 30, 0.78, 0.95, 5, 25, 11, 3.2, 346, 214, 76, NULL, '4Ω', 280, 'sealed', 15, NULL, NULL, 'Focal', 'Focal conseille un clos de 12 à 18 L.'),
  (8, 2, 'Focal Sub P25 DB', 10, 250, 27.46, 0.431, 0.47, 5.21, 40.72, 8.5, 1.7, 346, NULL, 139, NULL, '2×4Ω', 250, 'both', 12.5, 20, NULL, 'Focal', 'Re = 1,7 Ω selon la fiche Focal (bobines en parallèle probablement).'),
  (9, 2, 'Focal Sub P30F', 12, 300, 28, 0.47, 0.51, 5.6, 70, 14, 3.7, 510, 276, NULL, NULL, '4Ω', 400, 'both', 28.3, 40, NULL, 'Focal', 'Ancienne gamme Expert (archivée). Focal : clos 28 L, bass-reflex 40 L.'),
  (10, 2, 'Focal Sub P30 FSE', 12, 300, 30, 1.1, 1.3, 7.2, 42, 11, 3.2, 510, 276, 109, NULL, '4Ω', 300, 'sealed', NULL, NULL, NULL, NULL, 'Qts très élevé (1,10) : prévu pour un petit clos ou une pose en baffle plan.'),
  (11, 3, 'GAS MAX S1-8D1', 8, 200, 33.1, 0.42, 0.47, 3.78, 8.8, 6, 1.8, 201, 185, 141, NULL, '2×1Ω', 550, 'both', 8, 23.5, NULL, 'GAS', 'GAS annonce 12 mm crête-à-crête, soit 6 mm un sens.'),
  (12, 3, 'GAS MAX S1-10D1', 10, 250, 33.3, 0.47, 0.51, 5.52, 11.7, 10, 1.8, 330, 235, 166, 2.5, '2×1Ω', 1500, 'ported', NULL, 43, 37, 'GAS', 'GAS annonce 20 mm crête-à-crête, soit 10 mm un sens.'),
  (13, 3, 'GAS MAX S1-10D2', 10, 250, 31, 0.49, 0.53, 5.71, 14.9, 10, 3.8, 330, 235, 166, 2.5, '2×2Ω', 1500, 'ported', NULL, NULL, NULL, NULL, 'GAS annonce 20 mm crête-à-crête, soit 10 mm un sens.'),
  (14, 3, 'GAS MAX S1-12D1', 12, 305, 27.4, 0.48, 0.53, 5.81, 33.4, 20, 1.8, 530, 285, 187, NULL, '2×1Ω', 1600, 'ported', 25, 45, 33, 'GAS', 'GAS annonce 40 mm crête-à-crête, soit 20 mm un sens. GAS conseille 45 L à 33 Hz (évent fente).'),
  (15, 3, 'GAS MAX S2-15D1', 15, 380, 31, 0.45, 0.49, 5.44, 59.5, 25, 2.2, 742, 350, 215, 5, '2×1Ω', 2500, 'ported', NULL, 79.5, 32.5, 'GAS', 'GAS conseille 79,5 L à ~32,5 Hz.'),
  (16, 4, 'GZUW 8CF', 8, 215, 57, 0.7, 0.74, 11.92, 4.8, 10, 4.1, 201, 181, 108, NULL, '2×2Ω', 300, 'sealed', NULL, NULL, NULL, NULL, NULL),
  (17, 4, 'GZNW 12Xmax', 12, 305, 35.6, 0.61, 0.67, 6.82, 13.6, 17.5, 1.8, 452, 282, 250, NULL, '2×1Ω', 3000, 'ported', NULL, 70, NULL, 'Ground Zero', 'Ground Zero conseille 60 à 80 L en évent (section 240 cm²).'),
  (18, 4, 'GZNW 12X-D2', 12, 305, 21.8, 0.31, 0.32, 7.76, 35, 31, 4.2, NULL, 282, 210, NULL, '2×2Ω', 2000, 'ported', NULL, 90, NULL, 'Ground Zero', 'Qts recalculé depuis Qes et Qms (0,31) : la valeur publiée 0,33 est incohérente.'),
  (19, 4, 'GZNW 15Xmax', 15, 380, 29.5, 0.33, 0.35, 5.13, 35.7, 12.5, 2, 710, 358, 285, NULL, '2×1Ω', 4000, 'ported', NULL, 90, NULL, 'Ground Zero', 'Ground Zero conseille 80–100 L, évent 400 cm².'),
  (20, 4, 'GZPW 15Xmax', 15, 380, 33.3, 0.442, 0.48, 6.02, 22.8, 23, 2, NULL, NULL, 297, NULL, '2×1Ω', 6000, 'ported', 40, 130, NULL, 'Ground Zero', 'Fs, Qts, Vas : manuel Ground Zero. Qes et Xmax non confirmés par le fabricant.');
