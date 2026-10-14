/**
 * Caisson Calculator — API Backend
 * Express + MySQL2
 * Usage: node server.js  (ou: npm start)
 * Setup: cp .env.example .env && npm install && mysql -u root -p < database.sql
 */
'use strict';

require('dotenv').config();

const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));   // sert les fichiers statiques

// ── Pool MySQL ────────────────────────────────────────────────
const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:   parseInt(process.env.DB_PORT     || '3306'),
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASS     || '',
  database:        process.env.DB_NAME     || 'caisson_db',
  waitForConnections: true,
  connectionLimit:    10,
  charset:         'utf8mb4',
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// ── Routes API ───────────────────────────────────────────────

/**
 * GET /api/health
 * Test de connexion à la BDD
 */
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, message: 'Connexion MySQL OK' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/brands
 * Liste de toutes les marques
 */
app.get('/api/brands', async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, name, country FROM brands ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subwoofers?brand_id=1&size=12
 * Liste des subwoofers (filtrables par marque et taille)
 */
app.get('/api/subwoofers', async (req, res) => {
  try {
    const { brand_id, size } = req.query;
    let sql    = `SELECT id, brand_id, model, size_inch, diameter_mm,
                         power_rms, voice_coil, recommended_type
                  FROM subwoofers WHERE 1=1`;
    const params = [];

    if (brand_id) {
      sql += ' AND brand_id = ?';
      params.push(parseInt(brand_id));
    }
    if (size) {
      sql += ' AND size_inch = ?';
      params.push(parseFloat(size));
    }
    sql += ' ORDER BY size_inch, model';

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subwoofers/:id
 * Détails complets d'un subwoofer (tous les paramètres T/S)
 */
app.get('/api/subwoofers/:id', async (req, res) => {
  try {
    const rows = await query(
      'SELECT s.*, b.name AS brand_name FROM subwoofers s JOIN brands b ON b.id = s.brand_id WHERE s.id = ?',
      [parseInt(req.params.id)]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Subwoofer introuvable' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subwoofers/:id/recommendations
 * Calcul des recommandations de caisson pour un subwoofer donné
 */
app.get('/api/subwoofers/:id/recommendations', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM subwoofers WHERE id = ?', [parseInt(req.params.id)]);
    if (rows.length === 0)
      return res.status(404).json({ error: 'Subwoofer introuvable' });

    const s   = rows[0];
    const qts = parseFloat(s.qts), vas = parseFloat(s.vas), fs = parseFloat(s.fs);
    const rec = {
      subwoofer_id: s.id,
      model:        s.model,
      manufacturer: {
        sealed_l: s.rec_sealed_l, ported_l: s.rec_ported_l, ported_fb: s.rec_ported_fb, source: s.rec_source,
      },
      sealed: null,
      ported: null,
    };

    // Clos, Qtc 0,707 (possible seulement si Qts < 0,707)
    if (qts < 0.68) {
      const alpha = (0.707 / qts) ** 2 - 1;
      rec.sealed = { Vb: +(vas / alpha).toFixed(1), Fc: +(fs * Math.sqrt(1 + alpha)).toFixed(1), Qtc: 0.707 };
    }

    // Évent, alignement plat (Keele) — le site affine l'accord par simulation
    if (qts <= 0.6) {
      rec.ported = {
        Vb: +(15 * vas * qts ** 2.87).toFixed(1),
        Fb: +(0.42 * fs * qts ** -0.9).toFixed(1),
        f3: +(0.26 * fs * qts ** -1.4).toFixed(1),
      };
    }

    res.json(rec);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔊 Caisson Calculator API — http://localhost:${PORT}`);
  console.log(`   Fichiers statiques  : http://localhost:${PORT}/index.html`);
  console.log(`   API marques         : http://localhost:${PORT}/api/brands`);
  console.log(`   API subwoofers      : http://localhost:${PORT}/api/subwoofers?brand_id=1`);
  console.log('\n   Pour configurer MySQL: cp .env.example .env');
  console.log('   Puis: mysql -u root -p < database.sql\n');
});
