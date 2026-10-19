// src/screens/EmergencyScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { colors } from '../utils/theme';
import { EMERGENCY_CONTACTS, BANK_HELPLINES } from '../utils/detector';

function callNumber(number) {
  const url = `tel:${number.replace(/[^0-9+]/g, '')}`;
  Linking.canOpenURL(url).then(ok => {
    if (ok) Linking.openURL(url);
    else Alert.alert('Cannot Call', 'Phone calls are not supported on this device.');
  });
}

export default function EmergencyScreen() {
  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Text style={s.heroIcon}>🚨</Text>
          <Text style={s.heroTitle}>Emergency Contacts</Text>
          <Text style={s.heroSub}>Tap any number to call immediately. Save these contacts on your phone.</Text>
        </View>

        <Text style={s.sectionTitle}>🚔 Cybercrime & Emergency</Text>
        {EMERGENCY_CONTACTS.map(e => (
          <TouchableOpacity key={e.name} style={[s.emergencyCard, { borderColor: e.color + '66' }]}
            onPress={() => callNumber(e.number)} activeOpacity={0.75}>
            <View style={s.emergencyLeft}>
              <Text style={[s.emergencyName, { color: e.color }]}>{e.name}</Text>
              <Text style={s.emergencyAvail}>{e.available}</Text>
            </View>
            <View style={s.emergencyRight}>
              <Text style={[s.emergencyNum, { color: e.color }]}>{e.number}</Text>
              <View style={[s.callBtn, { backgroundColor: e.color + '22', borderColor: e.color + '44' }]}>
                <Text style={[s.callBtnText, { color: e.color }]}>📞 Call</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={s.sectionTitle}>🏦 Bank Fraud Helplines</Text>
        {BANK_HELPLINES.map(b => (
          <TouchableOpacity key={b.bank} style={s.bankCard} onPress={() => callNumber(b.number)} activeOpacity={0.75}>
            <Text style={s.bankName}>{b.bank}</Text>
            <View style={s.bankRight}>
              <Text style={s.bankNum}>{b.number}</Text>
              <View style={s.callBtnSmall}><Text style={s.callBtnSmallText}>Call</Text></View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={s.reportCard}>
          <Text style={s.reportTitle}>📋 File a Cybercrime Complaint</Text>
          <Text style={s.reportText}>Visit <Text style={s.reportLink}>cybercrime.gov.in</Text> to file an online complaint with evidence (call recordings, screenshots, transaction IDs).</Text>
          <TouchableOpacity style={s.reportBtn} onPress={() => Linking.openURL('https://cybercrime.gov.in')}>
            <Text style={s.reportBtnText}>🌐 Open cybercrime.gov.in</Text>
          </TouchableOpacity>
        </View>

        <View style={s.tipsCard}>
          <Text style={s.tipsTitle}>📌 What to Tell the Helpline</Text>
          {[
            "Caller's phone number and time of call",
            "What they asked for (OTP, money, details)",
            "Any amount transferred or details shared",
            "Screenshots or call recordings if available",
          ].map((t, i) => <Text key={i} style={s.tipItem}>• {t}</Text>)}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex:1, backgroundColor:colors.bg },
  scroll:         { padding:20, paddingBottom:40 },
  hero:           { backgroundColor:'#150505', borderWidth:1, borderColor:colors.red+'44',
                    borderRadius:20, padding:24, marginBottom:20, alignItems:'center' },
  heroIcon:       { fontSize:48, marginBottom:12 },
  heroTitle:      { fontSize:24, fontWeight:'800', color:colors.critical, marginBottom:8 },
  heroSub:        { fontSize:13, color:colors.textSecond, textAlign:'center', lineHeight:20 },
  sectionTitle:   { fontSize:15, fontWeight:'700', color:colors.textPrimary, marginBottom:12 },
  emergencyCard:  { borderWidth:1, borderRadius:14, padding:16, marginBottom:10,
                    backgroundColor:'#0d0808', flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  emergencyLeft:  { flex:1 },
  emergencyName:  { fontSize:14, fontWeight:'700', marginBottom:4 },
  emergencyAvail: { fontSize:11, color:colors.textMuted },
  emergencyRight: { alignItems:'flex-end', gap:8 },
  emergencyNum:   { fontSize:22, fontWeight:'800' },
  callBtn:        { borderWidth:1, borderRadius:10, paddingHorizontal:12, paddingVertical:6 },
  callBtnText:    { fontSize:12, fontWeight:'700' },
  bankCard:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center',
                    backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                    borderRadius:12, padding:14, marginBottom:8 },
  bankName:       { fontSize:15, fontWeight:'700', color:colors.textPrimary },
  bankRight:      { flexDirection:'row', alignItems:'center', gap:12 },
  bankNum:        { fontSize:14, fontWeight:'700', color:colors.green },
  callBtnSmall:   { backgroundColor:colors.green+'22', borderWidth:1, borderColor:colors.green+'44',
                    borderRadius:8, paddingHorizontal:10, paddingVertical:5 },
  callBtnSmallText:{ color:colors.green, fontSize:12, fontWeight:'700' },
  reportCard:     { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                    borderRadius:14, padding:16, marginTop:8, marginBottom:16 },
  reportTitle:    { fontSize:14, fontWeight:'700', color:colors.textPrimary, marginBottom:8 },
  reportText:     { fontSize:13, color:colors.textSecond, lineHeight:20, marginBottom:12 },
  reportLink:     { color:colors.primary, fontWeight:'600' },
  reportBtn:      { backgroundColor:colors.primary+'22', borderWidth:1, borderColor:colors.primary+'44',
                    borderRadius:10, padding:12, alignItems:'center' },
  reportBtnText:  { color:colors.primary, fontSize:13, fontWeight:'700' },
  tipsCard:       { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                    borderRadius:14, padding:16 },
  tipsTitle:      { fontSize:13, fontWeight:'700', color:colors.textPrimary, marginBottom:10 },
  tipItem:        { fontSize:12, color:colors.textSecond, lineHeight:22 },
});
