// src/screens/HistoryScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, riskColors } from '../utils/theme';
import { getHistory, getRecord, deleteRecord, deleteAll, getStats } from '../utils/storage';

export default function HistoryScreen({ navigation }) {
  const [history, setHistory]   = useState([]);
  const [stats, setStats]       = useState({ total: 0, avgScore: 0, highRisk: 0 });
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail]     = useState(null);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const load = async () => {
    setLoading(true);
    const [h, st] = await Promise.all([getHistory(), getStats()]);
    setHistory(h);
    setStats(st);
    setLoading(false);
  };

  const loadDetail = async (id) => {
    if (expanded === id) { setExpanded(null); setDetail(null); return; }
    const rec = await getRecord(id);
    setExpanded(id);
    setDetail(rec);
  };

  const confirmDelete = (id) => {
    Alert.alert('Delete Record', 'Delete this analysis record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRecord(id); load(); } },
    ]);
  };

  const confirmDeleteAll = () => {
    Alert.alert('Delete All History', 'This will permanently delete all analysis records. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete All', style: 'destructive', onPress: async () => { await deleteAll(); load(); } },
    ]);
  };

  const riskColor = (cat) => (riskColors[cat] || riskColors['Low']).border;
  const riskText  = (cat) => (riskColors[cat] || riskColors['Low']).text;

  const fmtDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
             ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            ['📋', stats.total,    'Total Scans',  colors.primary],
            ['📊', stats.avgScore, 'Avg Score',    colors.yellow],
            ['🔴', stats.highRisk, 'High Risk',    colors.red],
          ].map(([icon, val, lbl, col]) => (
            <View key={lbl} style={s.statCard}>
              <Text style={s.statIcon}>{icon}</Text>
              <Text style={[s.statVal, { color: col }]}>{val}</Text>
              <Text style={s.statLbl}>{lbl}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={s.loadingBox}><ActivityIndicator color={colors.primary} size="large" /></View>
        ) : history.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>📭</Text>
            <Text style={s.emptyTitle}>No History Yet</Text>
            <Text style={s.emptyText}>Analyze a recording or text to see results here.</Text>
          </View>
        ) : (
          <>
            <View style={s.listHeader}>
              <Text style={s.listTitle}>Recent Analyses</Text>
              <TouchableOpacity onPress={confirmDeleteAll}>
                <Text style={s.deleteAllText}>🗑️ Clear All</Text>
              </TouchableOpacity>
            </View>

            {history.map(item => (
              <View key={item.id} style={[s.card, { borderLeftColor: riskColor(item.risk_category) }]}>
                <TouchableOpacity onPress={() => loadDetail(item.id)} activeOpacity={0.8}>
                  <View style={s.cardHeader}>
                    <View style={s.cardLeft}>
                      <Text style={s.cardFile} numberOfLines={1}>{item.filename || 'Recording'}</Text>
                      <Text style={s.cardDate}>{fmtDate(item.created_at)}</Text>
                      {item.scam_type && item.scam_type !== 'Unknown' && (
                        <Text style={s.cardScam}>{item.scam_type}</Text>
                      )}
                    </View>
                    <View style={s.cardRight}>
                      <Text style={[s.cardScore, { color: riskColor(item.risk_category) }]}>{item.risk_score}</Text>
                      <Text style={[s.cardCat, { color: riskText(item.risk_category) }]}>{item.risk_category}</Text>
                    </View>
                  </View>
                  <Text style={s.expandHint}>{expanded === item.id ? '▲ Hide details' : '▼ View details'}</Text>
                </TouchableOpacity>

                {expanded === item.id && detail && (
                  <View style={s.detail}>
                    <Text style={s.detailLabel}>Transcript</Text>
                    <Text style={s.detailTranscript} numberOfLines={6}>{detail.transcript}</Text>
                    <View style={s.detailActions}>
                      <TouchableOpacity style={s.detailBtn} onPress={() => navigation.navigate('Result', {
                        result: {
                          score: detail.risk_score, category: detail.risk_category,
                          icon: '🔴', categoryHits: {}, scamType: { name: detail.scam_type, icon: '⚠️', stat: '' },
                          actionSteps: [], manipulation_tactics: [],
                        },
                        transcript: detail.transcript,
                        filename: detail.filename,
                        language: detail.language || 'en',
                      })}>
                        <Text style={s.detailBtnText}>📊 Full Report</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.detailBtn, s.detailBtnDel]} onPress={() => confirmDelete(item.id)}>
                        <Text style={[s.detailBtnText, { color: colors.critical }]}>🗑️ Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: colors.bg },
  scroll:         { padding: 16, paddingBottom: 40 },
  statsRow:       { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard:       { flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, alignItems: 'center' },
  statIcon:       { fontSize: 20, marginBottom: 4 },
  statVal:        { fontSize: 22, fontWeight: '800' },
  statLbl:        { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  loadingBox:     { padding: 60, alignItems: 'center' },
  emptyCard:      { backgroundColor: colors.bgCard, borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20 },
  emptyIcon:      { fontSize: 48, marginBottom: 12 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  emptyText:      { fontSize: 13, color: colors.textSecond, textAlign: 'center' },
  listHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listTitle:      { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  deleteAllText:  { fontSize: 12, color: colors.critical, fontWeight: '600' },
  card:           { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft:       { flex: 1, marginRight: 12 },
  cardFile:       { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  cardDate:       { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  cardScam:       { fontSize: 11, color: colors.primary, fontWeight: '600' },
  cardRight:      { alignItems: 'flex-end' },
  cardScore:      { fontSize: 24, fontWeight: '800' },
  cardCat:        { fontSize: 11, fontWeight: '600' },
  expandHint:     { fontSize: 11, color: colors.textMuted, marginTop: 8 },
  detail:         { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 10 },
  detailLabel:    { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailTranscript:{ fontSize: 12, color: colors.textSecond, lineHeight: 18, marginBottom: 12 },
  detailActions:  { flexDirection: 'row', gap: 10 },
  detailBtn:      { flex: 1, backgroundColor: colors.primary + '22', borderWidth: 1, borderColor: colors.primary + '44', borderRadius: 10, padding: 10, alignItems: 'center' },
  detailBtnDel:   { backgroundColor: colors.red + '11', borderColor: colors.red + '33' },
  detailBtnText:  { fontSize: 12, fontWeight: '700', color: colors.primary },
});
