// src/screens/StatsScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../utils/theme';
import { CATEGORIES } from '../utils/detector';

const STATS = [
  { label:'Total Complaints 2023', value:'14.02 Lakh', color:colors.primary, sub:'Reported to NCRB' },
  { label:'Financial Losses 2023', value:'₹7,488 Cr', color:colors.critical, sub:'Total reported losses' },
  { label:'Avg Loss Per Victim', value:'₹1.5 Lakh', color:colors.high, sub:'Per reported case' },
  { label:'Recovery Rate', value:'~25%', color:colors.medium, sub:'Of reported cases' },
];

const SCAM_TYPES = [
  { type:'Banking/OTP Fraud', pct:32, color:colors.red },
  { type:'Fake Arrest/CBI', pct:18, color:colors.orange },
  { type:'KYC/Account Fraud', pct:15, color:colors.yellow },
  { type:'Tech Support', pct:12, color:colors.primary },
  { type:'Lottery/Prize', pct:10, color:colors.green },
  { type:'Others', pct:13, color:colors.textMuted },
];

const TARGETED = ['Senior citizens (60+)', 'Rural residents', 'First-time smartphone users', 'Job seekers', 'Students'];

export default function StatsScreen() {
  const pillColor = (w) => w >= 3 ? colors.critical : w >= 2.5 ? colors.high : w >= 2 ? colors.medium : colors.low;
  const pillLabel = (w) => w >= 3 ? 'Critical' : w >= 2.5 ? 'High' : w >= 2 ? 'Medium' : 'Low';

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Text style={s.heroIcon}>📊</Text>
          <Text style={s.heroTitle}>India Scam Statistics</Text>
          <Text style={s.heroSub}>Real data on voice scams in India — know what you're up against.</Text>
        </View>

        {/* National stats */}
        <View style={s.statsGrid}>
          {STATS.map(st => (
            <View key={st.label} style={s.statCard}>
              <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
              <Text style={s.statSub}>{st.sub}</Text>
            </View>
          ))}
        </View>

        {/* Scam type breakdown */}
        <Text style={s.sectionTitle}>Top Scam Types (2023)</Text>
        {SCAM_TYPES.map(t => (
          <View key={t.type} style={s.barRow}>
            <Text style={s.barLabel}>{t.type}</Text>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${t.pct}%`, backgroundColor: t.color }]} />
            </View>
            <Text style={[s.barPct, { color: t.color }]}>{t.pct}%</Text>
          </View>
        ))}

        {/* Most targeted */}
        <Text style={s.sectionTitle}>Most Targeted Groups</Text>
        <View style={s.targetedCard}>
          {TARGETED.map(g => (
            <View key={g} style={s.targetedItem}>
              <Text style={s.targetedDot}>⚠️</Text>
              <Text style={s.targetedText}>{g}</Text>
            </View>
          ))}
        </View>

        {/* Peak hours */}
        <View style={s.peakCard}>
          <Text style={s.peakTitle}>⏰ Peak Scam Hours</Text>
          <Text style={s.peakTime}>10 AM – 2 PM  &  6 PM – 9 PM</Text>
          <Text style={s.peakSub}>Be extra cautious during these hours</Text>
        </View>

        {/* Detection categories */}
        <Text style={s.sectionTitle}>VoiceGuard Detection Categories</Text>
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <View key={key} style={s.catCard}>
            <View style={s.catHeader}>
              <Text style={s.catIcon}>{cat.icon}</Text>
              <View style={s.catInfo}>
                <Text style={s.catLabel}>{cat.label}</Text>
                <Text style={s.catPatterns}>{cat.patterns.length} patterns</Text>
              </View>
              <View style={[s.catPill, { borderColor: pillColor(cat.weight) + '66', backgroundColor: pillColor(cat.weight) + '22' }]}>
                <Text style={[s.catPillText, { color: pillColor(cat.weight) }]}>{pillLabel(cat.weight)}</Text>
              </View>
            </View>
            <Text style={s.catDesc}>{cat.description}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex:1, backgroundColor:colors.bg },
  scroll:       { padding:20, paddingBottom:40 },
  hero:         { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                  borderRadius:20, padding:24, marginBottom:20, alignItems:'center' },
  heroIcon:     { fontSize:48, marginBottom:12 },
  heroTitle:    { fontSize:24, fontWeight:'800', color:colors.yellow, marginBottom:8 },
  heroSub:      { fontSize:13, color:colors.textSecond, textAlign:'center', lineHeight:20 },
  statsGrid:    { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:20 },
  statCard:     { width:'47%', backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                  borderRadius:14, padding:14 },
  statValue:    { fontSize:22, fontWeight:'800', marginBottom:4 },
  statLabel:    { fontSize:11, color:colors.textPrimary, fontWeight:'600', marginBottom:2 },
  statSub:      { fontSize:10, color:colors.textMuted },
  sectionTitle: { fontSize:15, fontWeight:'700', color:colors.textPrimary, marginBottom:12 },
  barRow:       { flexDirection:'row', alignItems:'center', marginBottom:10, gap:8 },
  barLabel:     { width:130, fontSize:11, color:colors.textSecond },
  barBg:        { flex:1, height:8, backgroundColor:colors.bgCard, borderRadius:4, overflow:'hidden' },
  barFill:      { height:8, borderRadius:4 },
  barPct:       { width:36, fontSize:11, fontWeight:'700', textAlign:'right' },
  targetedCard: { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                  borderRadius:14, padding:14, marginBottom:16 },
  targetedItem: { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:6,
                  borderBottomWidth:1, borderBottomColor:colors.border },
  targetedDot:  { fontSize:14 },
  targetedText: { fontSize:13, color:colors.textPrimary },
  peakCard:     { backgroundColor:'#1a1500', borderWidth:1, borderColor:colors.yellow+'44',
                  borderRadius:14, padding:16, marginBottom:20, alignItems:'center' },
  peakTitle:    { fontSize:14, fontWeight:'700', color:colors.textPrimary, marginBottom:8 },
  peakTime:     { fontSize:18, fontWeight:'800', color:colors.yellow, marginBottom:4 },
  peakSub:      { fontSize:12, color:colors.textMuted },
  catCard:      { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                  borderRadius:12, padding:14, marginBottom:10 },
  catHeader:    { flexDirection:'row', alignItems:'center', gap:10, marginBottom:8 },
  catIcon:      { fontSize:22 },
  catInfo:      { flex:1 },
  catLabel:     { fontSize:13, fontWeight:'700', color:colors.textPrimary },
  catPatterns:  { fontSize:10, color:colors.textMuted },
  catPill:      { borderWidth:1, borderRadius:10, paddingHorizontal:8, paddingVertical:3 },
  catPillText:  { fontSize:10, fontWeight:'700' },
  catDesc:      { fontSize:12, color:colors.textSecond, lineHeight:18 },
});
