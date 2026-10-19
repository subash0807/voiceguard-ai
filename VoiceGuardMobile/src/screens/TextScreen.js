// src/screens/TextScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { colors } from '../utils/theme';
import { detectScam, classifyScam } from '../utils/detector';

const SAMPLES = {
  '— Choose Sample —': '',
  '🚨 OTP + Bank Scam': 'Hello, I am calling from SBI Bank fraud department. Your account has been flagged for suspicious activity and will be blocked within 30 minutes. You must share your OTP immediately to verify your identity. Please do not tell anyone about this call. Stay on the line.',
  '⚖️ CBI Arrest Threat': 'This is a CBI officer calling. A criminal case and FIR has been registered against your Aadhaar number for money laundering. You will be arrested unless you pay a fine of Rs. 50,000 immediately via UPI. Transfer the money to this account number right now. Do not contact your family.',
  '🎰 KBC Lottery Scam': 'Congratulations! Your mobile number has been selected as the winner of KBC lucky draw. You have won a prize of 25 lakh rupees. To claim your reward, please provide your account details and pay a processing fee of Rs. 5,000. This offer expires today.',
  '💻 Tech Support Scam': 'This is Microsoft support calling. Your computer has been hacked and we detected a virus on your system. Your IP address has been flagged. Please install AnyDesk immediately so our technician can access your device and fix the issue.',
  '📱 TRAI SIM Block': 'This is a TRAI officer calling. Your mobile number is linked to illegal activities and will be disconnected within 2 hours. To avoid disconnection, verify your Aadhaar number and share the OTP you receive. This is urgent — act now.',
  '✅ Normal Call': 'Hi, this is Priya calling from the customer support team. I wanted to check if you received the package we sent last week. Please let us know at your convenience if you need any help.',
};

export default function TextScreen({ navigation }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSamples, setShowSamples] = useState(false);

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const detection = detectScam(text.trim());
    const scamType = classifyScam(detection.categoryHits);
    const actionSteps = buildActionSteps(detection.categoryHits, detection.category);
    setLoading(false);
    navigation.navigate('Result', {
      result: { ...detection, scamType, actionSteps },
      transcript: text.trim(),
      filename: 'text_input.txt',
      language: 'en',
    });
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <Text style={s.heroIcon}>📝</Text>
          <Text style={s.heroTitle}>Analyze Text</Text>
          <Text style={s.heroSub}>Paste any call transcript, SMS, or WhatsApp message to instantly detect scam patterns.</Text>
        </View>

        {/* Sample picker */}
        <TouchableOpacity style={s.sampleToggle} onPress={() => setShowSamples(!showSamples)}>
          <Text style={s.sampleToggleText}>📋 Load Sample Transcript {showSamples ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showSamples && (
          <View style={s.sampleList}>
            {Object.entries(SAMPLES).map(([label, val]) => (
              <TouchableOpacity key={label} style={s.sampleItem}
                onPress={() => { setText(val); setShowSamples(false); }}>
                <Text style={s.sampleItemText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TextInput
          style={s.input}
          multiline
          numberOfLines={8}
          placeholder="Paste a call transcript, SMS, or suspicious message here…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          textAlignVertical="top"
        />

        <View style={s.inputMeta}>
          <Text style={s.inputMetaText}>{text.length} characters · {text.trim().split(/\s+/).filter(Boolean).length} words</Text>
          {text.length > 0 && (
            <TouchableOpacity onPress={() => setText('')}>
              <Text style={s.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={[s.analyzeBtn, (!text.trim() || loading) && s.analyzeBtnDisabled]}
          onPress={analyze} disabled={!text.trim() || loading} activeOpacity={0.8}>
          {loading
            ? <View style={s.loadingRow}><ActivityIndicator color="#fff" size="small" /><Text style={s.analyzeBtnText}>Analyzing…</Text></View>
            : <Text style={s.analyzeBtnText}>🔎 Analyze Text</Text>
          }
        </TouchableOpacity>

        <View style={s.tipsCard}>
          <Text style={s.tipsTitle}>💡 What to paste here</Text>
          {['A suspicious phone call transcript','An SMS asking for OTP or payment','A WhatsApp message with prize claims','Any message that feels like a scam'].map((t, i) => (
            <Text key={i} style={s.tipItem}>• {t}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function buildActionSteps(categoryHits, category) {
  const steps = ['1️⃣ Hang up the call immediately if still ongoing.'];
  const keys = Object.keys(categoryHits);
  if (keys.includes('otp_credentials') || keys.includes('bank_verification'))
    steps.push('2️⃣ Call your bank fraud helpline to freeze your account if any details were shared.');
  if (keys.includes('remote_access'))
    steps.push('3️⃣ Uninstall AnyDesk/TeamViewer immediately. Change all passwords from a different device.');
  if (category === 'High' || category === 'Very High')
    steps.push('4️⃣ File a complaint at cybercrime.gov.in or call 1930 with the caller\'s number.');
  steps.push(`${steps.length + 1}️⃣ Tell a trusted family member about this call.`);
  return steps;
}

const s = StyleSheet.create({
  root:               { flex:1, backgroundColor:colors.bg },
  scroll:             { padding:20, paddingBottom:40 },
  hero:               { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                        borderRadius:20, padding:24, marginBottom:16, alignItems:'center' },
  heroIcon:           { fontSize:48, marginBottom:12 },
  heroTitle:          { fontSize:24, fontWeight:'800', color:colors.green, marginBottom:8 },
  heroSub:            { fontSize:13, color:colors.textSecond, textAlign:'center', lineHeight:20 },
  sampleToggle:       { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                        borderRadius:12, padding:14, marginBottom:8, alignItems:'center' },
  sampleToggleText:   { color:colors.primary, fontSize:13, fontWeight:'600' },
  sampleList:         { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                        borderRadius:12, marginBottom:12, overflow:'hidden' },
  sampleItem:         { padding:14, borderBottomWidth:1, borderBottomColor:colors.border },
  sampleItemText:     { color:colors.textPrimary, fontSize:13 },
  input:              { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                        borderRadius:14, padding:16, color:colors.textPrimary, fontSize:14,
                        lineHeight:22, minHeight:160, marginBottom:8 },
  inputMeta:          { flexDirection:'row', justifyContent:'space-between', marginBottom:16 },
  inputMetaText:      { fontSize:11, color:colors.textMuted },
  clearText:          { fontSize:11, color:colors.primary, fontWeight:'600' },
  analyzeBtn:         { backgroundColor:colors.green, borderRadius:14, padding:18,
                        alignItems:'center', marginBottom:20 },
  analyzeBtnDisabled: { opacity:0.4 },
  analyzeBtnText:     { color:'#000', fontSize:16, fontWeight:'800' },
  loadingRow:         { flexDirection:'row', alignItems:'center', gap:10 },
  tipsCard:           { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                        borderRadius:14, padding:16 },
  tipsTitle:          { fontSize:13, fontWeight:'700', color:colors.textPrimary, marginBottom:10 },
  tipItem:            { fontSize:12, color:colors.textSecond, lineHeight:22 },
});
