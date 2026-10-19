// src/utils/storage.js
import * as SQLite from 'expo-sqlite';

let _db = null;

async function db() {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('voiceguard.db');
    await _db.execAsync(`
      CREATE TABLE IF NOT EXISTS history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at  TEXT NOT NULL,
        filename    TEXT,
        language    TEXT,
        transcript  TEXT,
        risk_score  INTEGER,
        risk_category TEXT,
        scam_type   TEXT,
        findings    TEXT
      );
    `);
  }
  return _db;
}

export async function saveAnalysis({ filename, language, transcript, risk_score, risk_category, scam_type, findings }) {
  const d = await db();
  await d.runAsync(
    `INSERT INTO history (created_at,filename,language,transcript,risk_score,risk_category,scam_type,findings)
     VALUES (?,?,?,?,?,?,?,?)`,
    [new Date().toISOString(), filename, language, transcript, risk_score, risk_category, scam_type, JSON.stringify(findings)]
  );
}

export async function getHistory(limit = 50) {
  const d = await db();
  return await d.getAllAsync(
    `SELECT id,created_at,filename,risk_score,risk_category,scam_type FROM history ORDER BY id DESC LIMIT ?`,
    [limit]
  );
}

export async function getRecord(id) {
  const d = await db();
  const row = await d.getFirstAsync(`SELECT * FROM history WHERE id=?`, [id]);
  if (!row) return null;
  return { ...row, findings: JSON.parse(row.findings || '[]') };
}

export async function deleteRecord(id) {
  const d = await db();
  await d.runAsync(`DELETE FROM history WHERE id=?`, [id]);
}

export async function deleteAll() {
  const d = await db();
  await d.runAsync(`DELETE FROM history`);
}

export async function getStats() {
  const d = await db();
  const total = await d.getFirstAsync(`SELECT COUNT(*) as c FROM history`);
  const avg   = await d.getFirstAsync(`SELECT AVG(risk_score) as a FROM history`);
  const high  = await d.getFirstAsync(`SELECT COUNT(*) as c FROM history WHERE risk_category IN ('High','Very High')`);
  return {
    total:     total?.c || 0,
    avgScore:  Math.round(avg?.a || 0),
    highRisk:  high?.c || 0,
  };
}
