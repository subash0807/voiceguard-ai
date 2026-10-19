// src/utils/storage.web.js — localStorage-backed history for the web build
// (expo-sqlite has no web support on Expo SDK 51)
const KEY = 'voiceguard.history';

function load() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function persist(rows) {
  window.localStorage.setItem(KEY, JSON.stringify(rows));
}

export async function saveAnalysis({ filename, language, transcript, risk_score, risk_category, scam_type, findings }) {
  const rows = load();
  const id = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  rows.push({
    id, created_at: new Date().toISOString(), filename, language, transcript,
    risk_score, risk_category, scam_type, findings: findings || [],
  });
  persist(rows);
}

export async function getHistory(limit = 50) {
  return load()
    .sort((a, b) => b.id - a.id)
    .slice(0, limit)
    .map(({ id, created_at, filename, risk_score, risk_category, scam_type }) =>
      ({ id, created_at, filename, risk_score, risk_category, scam_type }));
}

export async function getRecord(id) {
  return load().find((r) => r.id === id) || null;
}

export async function deleteRecord(id) {
  persist(load().filter((r) => r.id !== id));
}

export async function deleteAll() {
  persist([]);
}

export async function getStats() {
  const rows = load();
  const total = rows.length;
  const avg = total ? rows.reduce((s, r) => s + (r.risk_score || 0), 0) / total : 0;
  return {
    total,
    avgScore: Math.round(avg),
    highRisk: rows.filter((r) => ['High', 'Very High'].includes(r.risk_category)).length,
  };
}
