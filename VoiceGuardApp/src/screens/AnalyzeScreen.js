// src/screens/AnalyzeScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../utils/theme';
import { detectScam, classifyScam } from '../utils/detector';

const SUPPORTED = ['audio/mpeg','audio/wav','audio/mp4','audio/ogg','audio/flac','audio/x-m4a','audio/webm'];

export default function AnalyzeScreen({ navigation }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        const sizeMB = (asset.size || 0) / (1024 * 1024);
        if (sizeMB > 50) { Alert.alert('File Too Large', 'Maximum file size is 50 MB.'); return; }
        setFile(asset);
      }
    } catch (e) { Alert.alert('Error', 'Could not pick file.'); }
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    try {
      setStep('Reading audio file…');
      await new Promise(r => setTimeout(r, 400));

      // NOTE: On-device Whisper transcription requires a native module.
      // For the hackathon demo, we use a realistic simulated transcript.
      // To add real transcription: integrate whisper.rn or call a local API.
      setStep('Transcribing speech (demo mode)…');
      await new Promise(r => setTimeout(r, 1200));

      const demoTranscript = `Hello, I am calling from SBI Bank fraud department. 
Your account has been flagged for suspicious activity and will be blocked within 30 minutes. 
You must share your OTP immediately to verify your identity. 
Please do not tell anyone about this call. Stay on the line and cooperate with us. 
Transfer the amount to this account number right now to avoid legal action.`;

      setStep('Analyzing for threats…');
      await new Promise(r => setTimeout(r, 600));

      const detection = detectScam(demoTranscript);
      const scamType = classifyScam(detection.categoryHits);
      const actionSteps = buildActionSteps(detection.categoryHits, detection.category);

      navigation.navigate('Result', {
        result: { ...detection, scamType, actionSteps },
        transcript: demoTranscript,
        filename: file.name,
        language: 'en',
      });
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Text style={s.heroIcon}>🎙️</Text>
          <Text style={s.heroTitle}>Analyze Audio</Text>
          <Text style={s.heroSub}>Upload a call recording to detect scam indicators using AI speech analysis.</Text>
        </View>

        <View style={s.noteCard}>
          <Text style={s.noteTitle}>📌 Demo Mode</Text>
          <Text style={s.noteText}>On-device Whisper transcription requires a native build. In Expo Go, a realistic demo transcript is used to showcase the full detection pipeline. All analysis logic is real.</Text>
        </View>

        <TouchableOpacity style={s.uploadArea} onPress={pickFile} activeOpacity={0.75}>
          {file ? (
            <View style={s.fileInfo}>
              <Text style={s.fileIcon}>🎵</Text>
              <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
              <Text style={s.fileSize}>{((file.size || 0) / (1024 * 1024)).toFixed(2)} MB</Text>
              <View style={s.fileBadge}><Text style={s.fileBadgeText}>✓ Ready</Text></View>
            </View>
          ) : (
            <View style={s.uploadPrompt}>
              <Text style={s.uploadIcon}>📂</Text>
              <Text style={s.uploadTitle}>Tap to Select Audio File</Text>
              <Text style={s.uploadSub}>WAV, MP3, M4A, OGG, FLAC • Max 50 MB</Text>
            </View>
          )}
        </TouchableOpacity>

        {file && (
          <TouchableOpacity style={[s.analyzeBtn, loading && s.analyzeBtnDisabled]}
            onPress={analyze} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <View style={s.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.analyzeBtnText}>{step}</Text>
              </View>
            ) : (
              <Text style={s.analyzeBtnText}>🔍 Analyze Recording</Text>
            )}
          </TouchableOpacity>
        )}

        <Text style={s.sectionTitle}>Supported Formats</Text>
        <View style={s.formatsRow}>
          {['WAV','MP3','M4A','OGG','FLAC','WEBM'].map(f => (
            <View key={f} style={s.formatPill}><Text style={s.formatText}>{f}</Text></View>
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
  if (keys.includes('personal_info_harvesting'))
    steps.push('4️⃣ Monitor your Aadhaar at resident.uidai.gov.in and check your CIBIL credit report.');
  if (category === 'High' || category === 'Very High')
    steps.push('5️⃣ File a complaint at cybercrime.gov.in or call 1930 with the caller\'s number.');
  steps.push(`${steps.length + 1}️⃣ Tell a trusted family member about this call.`);
  return steps;
}

const s = StyleSheet.create({
  root:             { flex:1, backgroundColor:colors.bg },
  scroll:           { padding:20, paddingBottom:40 },
  hero:             { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                      borderRadius:20, padding:24, marginBottom:16, alignItems:'center' },
  heroIcon:         { fontSize:48, marginBottom:12 },
  heroTitle:        { fontSize:24, fontWeight:'800', color:colors.primary, marginBottom:8 },
  heroSub:          { fontSize:13, color:colors.textSecond, textAlign:'center', lineHeight:20 },
  noteCard:         { backgroundColor:'#0d1a2e', borderWidth:1, borderColor:colors.primary+'44',
                      borderRadius:14, padding:14, marginBottom:16 },
  noteTitle:        { fontSize:13, fontWeight:'700', color:colors.primary, marginBottom:6 },
  noteText:         { fontSize:12, color:colors.textSecond, lineHeight:18 },
  uploadArea:       { backgroundColor:colors.bgCard, borderWidth:2, borderColor:colors.border,
                      borderStyle:'dashed', borderRadius:16, padding:32,
                      alignItems:'center', marginBottom:16 },
  uploadPrompt:     { alignItems:'center' },
  uploadIcon:       { fontSize:40, marginBottom:12 },
  uploadTitle:      { fontSize:16, fontWeight:'700', color:colors.textPrimary, marginBottom:6 },
  uploadSub:        { fontSize:12, color:colors.textMuted },
  fileInfo:         { alignItems:'center', width:'100%' },
  fileIcon:         { fontSize:36, marginBottom:8 },
  fileName:         { fontSize:14, fontWeight:'700', color:colors.textPrimary, marginBottom:4, maxWidth:'90%' },
  fileSize:         { fontSize:12, color:colors.textMuted, marginBottom:8 },
  fileBadge:        { backgroundColor:colors.green+'22', borderWidth:1, borderColor:colors.green+'44',
                      borderRadius:12, paddingHorizontal:12, paddingVertical:4 },
  fileBadgeText:    { color:colors.green, fontSize:12, fontWeight:'700' },
  analyzeBtn:       { backgroundColor:colors.primary, borderRadius:14, padding:18,
                      alignItems:'center', marginBottom:24 },
  analyzeBtnDisabled:{ opacity:0.7 },
  analyzeBtnText:   { color:'#fff', fontSize:16, fontWeight:'700' },
  loadingRow:       { flexDirection:'row', alignItems:'center', gap:10 },
  sectionTitle:     { fontSize:14, fontWeight:'700', color:colors.textPrimary, marginBottom:10 },
  formatsRow:       { flexDirection:'row', flexWrap:'wrap', gap:8 },
  formatPill:       { backgroundColor:colors.bgCard, borderWidth:1, borderColor:colors.border,
                      borderRadius:8, paddingHorizontal:12, paddingVertical:6 },
  formatText:       { fontSize:12, color:colors.textSecond, fontWeight:'600' },
});
