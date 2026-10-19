// src/screens/HomeScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../utils/theme';
import { getStats } from '../utils/storage';

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({ total: 0, avgScore: 0, highRisk: 0 });

  useFocusEffect(useCallback(() => {
    getStats().then(setStats).catch(() => {});
  }, []));

  const actions = [
    { icon: '🎙️', label: 'Record Audio',  sub: 'Record a live call',      screen: 'Record',    color: colors.red },
    { icon: '📂', label: 'Upload Audio',  sub: 'Analyze a recording',     screen: 'Analyze',   color: colors.primary },
    { icon: '📝', label: 'Analyze Text',  sub: 'Paste a transcript',       screen: 'Text',      color: colors.green },
    { icon: '📋', label: 'History',       sub: 'Past analyses',            screen: 'History',   color: colors.yellow },
    { icon: '🚨', label: 'Emergency',     sub: 'Helplines & contacts',     screen: 'Emergency', color: colors.critical },
    { icon: '📊', label: 'Statistics',    sub: 'India scam data',          screen: 'Stats',     color: colors.medium },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgDeep} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroBadge}><Text style={s.heroBadgeText}>🛡️ AI-POWERED • LOCAL • PRIVATE</Text></View>
          <Text style={s.heroTitle}>VoiceGuard AI</Text>
          <Text style={s.heroSub}>Detect scams, manipulation tactics and fraud in voice calls — 100% on-device.</Text>
          <View style={s.heroStats}>
            {[
              [stats.total,    'Total Scans'],
              [stats.highRisk, 'High Risk Found'],
              ['12',           'Threat Categories'],
            ].map(([v, l]) => (
              <View key={l} style={s.heroStat}>
                <Text style={s.heroStatVal}>{v}</Text>
                <Text style={s.heroStatLbl}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Record CTA */}
        <TouchableOpacity style={s.recordCTA} onPress={() => navigation.navigate('Record')} activeOpacity={0.8}>
          <Text style={s.recordCTAIcon}>🎙️</Text>
          <View style={s.recordCTAText}>
            <Text style={s.recordCTATitle}>Record a Suspicious Call</Text>
            <Text style={s.recordCTASub}>Tap to start live recording & instant analysis</Text>
          </View>
          <Text style={s.recordCTAArrow}>›</Text>
        </TouchableOpacity>

        {/* Quick actions */}
        <Text style={s.sectionTitle}>All Features</Text>
        <View style={s.grid}>
          {actions.map(a => (
            <TouchableOpacity key={a.screen} style={[s.actionCard, { borderColor: a.color + '44' }]}
              onPress={() => navigation.navigate(a.screen)} activeOpacity={0.75}>
              <Text style={s.actionIcon}>{a.icon}</Text>
              <Text style={[s.actionLabel, { color: a.color }]}>{a.label}</Text>
              <Text style={s.actionSub}>{a.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* How it works */}
        <Text style={s.sectionTitle}>How It Works</Text>
        {[
          ['1', '🎙️ Record or Upload', 'Record a live call or upload an existing audio file.'],
          ['2', '🔎 AI Detection',     '12 threat categories scanned using 150+ patterns.'],
          ['3', '📊 Risk Score',       'Weighted heuristic score 0–100 with scam type ID.'],
          ['4', '🛡️ Action Plan',      'Step-by-step safety advice and emergency helplines.'],
        ].map(([n, title, desc]) => (
          <View key={n} style={s.stepCard}>
            <View style={s.stepNum}><Text style={s.stepNumText}>{n}</Text></View>
            <View style={s.stepBody}>
              <Text style={s.stepTitle}>{title}</Text>
              <Text style={s.stepDesc}>{desc}</Text>
            </View>
          </View>
        ))}

        {/* Privacy */}
        <View style={s.privacyCard}>
          <Text style={s.privacyTitle}>🔒 Privacy First</Text>
          <Text style={s.privacyText}>
            {'• Audio never stored permanently\n• All processing done on-device\n• No data sent to any server\n• History stored in local SQLite only'}
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.bg },
  scroll:        { padding: 20, paddingBottom: 40 },
  hero:          { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 24, marginBottom: 16 },
  heroBadge:     { backgroundColor: 'rgba(0,200,83,0.12)', borderWidth: 1, borderColor: 'rgba(0,200,83,0.3)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 12 },
  heroBadgeText: { color: colors.green, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  heroTitle:     { fontSize: 32, fontWeight: '800', color: colors.primary, marginBottom: 8 },
  heroSub:       { fontSize: 14, color: colors.textSecond, lineHeight: 22, marginBottom: 16 },
  heroStats:     { flexDirection: 'row', gap: 20 },
  heroStat:      { alignItems: 'center' },
  heroStatVal:   { fontSize: 22, fontWeight: '800', color: colors.primary },
  heroStatLbl:   { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  recordCTA:     { backgroundColor: '#1a0000', borderWidth: 2, borderColor: colors.red + '88', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 14 },
  recordCTAIcon: { fontSize: 32 },
  recordCTAText: { flex: 1 },
  recordCTATitle:{ fontSize: 15, fontWeight: '800', color: colors.critical, marginBottom: 3 },
  recordCTASub:  { fontSize: 12, color: colors.textSecond },
  recordCTAArrow:{ fontSize: 24, color: colors.red, fontWeight: '700' },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 12, marginTop: 4 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionCard:    { width: '47%', backgroundColor: colors.bgCard, borderWidth: 1, borderRadius: 16, padding: 18, alignItems: 'center' },
  actionIcon:    { fontSize: 28, marginBottom: 8 },
  actionLabel:   { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  actionSub:     { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  stepCard:      { flexDirection: 'row', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, marginBottom: 10, alignItems: 'flex-start', gap: 14 },
  stepNum:       { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '22', borderWidth: 1, borderColor: colors.primary + '44', alignItems: 'center', justifyContent: 'center' },
  stepNumText:   { color: colors.primary, fontWeight: '800', fontSize: 14 },
  stepBody:      { flex: 1 },
  stepTitle:     { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  stepDesc:      { fontSize: 12, color: colors.textSecond, lineHeight: 18 },
  privacyCard:   { backgroundColor: '#0a1220', borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 18, marginTop: 8 },
  privacyTitle:  { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  privacyText:   { fontSize: 12, color: colors.textSecond, lineHeight: 22 },
});
