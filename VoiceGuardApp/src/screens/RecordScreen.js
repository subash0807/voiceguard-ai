// src/screens/RecordScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Animated, Easing,
} from 'react-native';
import { Audio } from 'expo-av';
import { colors } from '../utils/theme';
import { detectScam, classifyScam } from '../utils/detector';
import { saveAnalysis } from '../utils/storage';

const MAX_DURATION_SEC = 120;

function buildActionSteps(categoryHits, category) {
  const steps = ['1️⃣ Hang up the call immediately if still ongoing.'];
  const keys = Object.keys(categoryHits);
  if (keys.includes('otp_credentials') || keys.includes('bank_verification'))
    steps.push('2️⃣ Call your bank fraud helpline immediately if any details were shared.');
  if (keys.includes('remote_access'))
    steps.push('3️⃣ Uninstall AnyDesk/TeamViewer and change all passwords.');
  if (category === 'High' || category === 'Very High')
    steps.push('4️⃣ File a complaint at cybercrime.gov.in or call 1930.');
  steps.push(`${steps.length + 1}️⃣ Tell a trusted family member about this call.`);
  return steps;
}

// ── Animated waveform bars ────────────────────────────────────────────────
function Waveform({ active }) {
  const bars = useRef([...Array(18)].map(() => new Animated.Value(0.15))).current;

  useEffect(() => {
    if (active) {
      const anims = bars.map((bar, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 60),
            Animated.timing(bar, { toValue: 0.2 + Math.random() * 0.8, duration: 300 + Math.random() * 300, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
            Animated.timing(bar, { toValue: 0.1 + Math.random() * 0.3, duration: 300 + Math.random() * 300, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          ])
        )
      );
      Animated.parallel(anims).start();
      return () => anims.forEach(a => a.stop());
    } else {
      bars.forEach(bar => Animated.timing(bar, { toValue: 0.15, duration: 300, useNativeDriver: true }).start());
    }
  }, [active]);

  return (
    <View style={wv.container}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[wv.bar, {
            transform: [{ scaleY: bar }],
            backgroundColor: active ? colors.red : colors.border,
            opacity: active ? 1 : 0.4,
          }]}
        />
      ))}
    </View>
  );
}

const wv = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 60, gap: 3, marginVertical: 16 },
  bar:       { width: 4, height: 48, borderRadius: 3 },
});

// ── Pulse ring around record button ──────────────────────────────────────
function PulseRing({ active }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale,   { toValue: 1.6, duration: 900, useNativeDriver: true }),
            Animated.timing(scale,   { toValue: 1.0, duration: 0,   useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.5, duration: 100, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.0, duration: 800, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      scale.setValue(1); opacity.setValue(0);
    }
  }, [active]);

  return (
    <Animated.View style={[pr.ring, { transform: [{ scale }], opacity }]} />
  );
}

const pr = StyleSheet.create({
  ring: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: colors.red },
});

// ── Main screen ───────────────────────────────────────────────────────────
export default function RecordScreen({ navigation }) {
  const [state, setState] = useState('idle'); // idle | recording | recorded | playing | analyzing
  const [elapsed, setElapsed] = useState(0);
  const [uri, setUri] = useState(null);
  const [step, setStep] = useState('');
  const recordingRef = useRef(null);
  const soundRef    = useRef(null);
  const timerRef    = useRef(null);

  useEffect(() => () => {
    timerRef.current && clearInterval(timerRef.current);
    soundRef.current?.unloadAsync();
    recordingRef.current?.stopAndUnloadAsync();
  }, []);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Start recording ──
  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Permission Required', 'Microphone permission is needed to record audio.'); return; }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          if (e + 1 >= MAX_DURATION_SEC) { stopRecording(); return e; }
          return e + 1;
        });
      }, 1000);
    } catch (e) {
      Alert.alert('Error', `Could not start recording: ${e.message}`);
    }
  };

  // ── Stop recording ──
  const stopRecording = async () => {
    clearInterval(timerRef.current);
    try {
      await recordingRef.current?.stopAndUnloadAsync();
      const fileUri = recordingRef.current?.getURI();
      setUri(fileUri);
      setState('recorded');
    } catch (e) {
      Alert.alert('Error', 'Could not stop recording.');
      setState('idle');
    }
  };

  // ── Play back ──
  const playRecording = async () => {
    if (!uri) return;
    try {
      if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
      setState('playing');
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) setState('recorded');
      });
    } catch (e) {
      Alert.alert('Error', 'Could not play recording.');
      setState('recorded');
    }
  };

  const stopPlayback = async () => {
    await soundRef.current?.stopAsync();
    setState('recorded');
  };

  // ── Analyze ──
  const analyze = async () => {
    setState('analyzing');
    try {
      setStep('Processing audio…');
      await new Promise(r => setTimeout(r, 600));

      setStep('Transcribing speech…');
      await new Promise(r => setTimeout(r, 1000));

      // Demo transcript — replace with whisper.rn for real transcription
      const transcript = `Hello, I am calling from SBI Bank fraud department. Your account has been flagged for suspicious activity and will be blocked within 30 minutes. You must share your OTP immediately to verify your identity. Please do not tell anyone about this call. Stay on the line and cooperate with us. Transfer the amount to this account number right now to avoid legal action.`;

      setStep('Detecting threats…');
      await new Promise(r => setTimeout(r, 500));

      const detection  = detectScam(transcript);
      const scamType   = classifyScam(detection.categoryHits);
      const actionSteps = buildActionSteps(detection.categoryHits, detection.category);

      await saveAnalysis({
        filename: `recording_${Date.now()}.m4a`,
        language: 'en',
        transcript,
        risk_score:    detection.score,
        risk_category: detection.category,
        scam_type:     scamType?.name || 'Unknown',
        findings:      Object.entries(detection.categoryHits).map(([k, v]) => ({ category: k, hits: v })),
      });

      navigation.navigate('Result', {
        result: { ...detection, scamType, actionSteps },
        transcript,
        filename: `recording_${Date.now()}.m4a`,
        language: 'en',
      });
    } finally {
      setState('recorded');
      setStep('');
    }
  };

  const reset = () => { setUri(null); setElapsed(0); setState('idle'); };

  const isRecording = state === 'recording';
  const isRecorded  = state === 'recorded' || state === 'playing';
  const isAnalyzing = state === 'analyzing';

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.hero}>
          <View style={s.heroBadge}><Text style={s.heroBadgeText}>🎙️ LIVE RECORDING</Text></View>
          <Text style={s.heroTitle}>Record & Analyze</Text>
          <Text style={s.heroSub}>Record a suspicious call in real-time and instantly detect scam patterns.</Text>
        </View>

        {/* Waveform */}
        <View style={s.visualizerCard}>
          <Waveform active={isRecording} />

          {/* Timer */}
          <Text style={[s.timer, isRecording && { color: colors.red }]}>{fmt(elapsed)}</Text>
          {isRecording && (
            <Text style={s.maxNote}>Max {fmt(MAX_DURATION_SEC)}</Text>
          )}

          {/* Progress bar */}
          {isRecording && (
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${(elapsed / MAX_DURATION_SEC) * 100}%` }]} />
            </View>
          )}
        </View>

        {/* Record button */}
        <View style={s.btnArea}>
          {state === 'idle' && (
            <View style={s.recordWrap}>
              <TouchableOpacity style={s.recordBtn} onPress={startRecording} activeOpacity={0.8}>
                <Text style={s.recordBtnIcon}>🎙️</Text>
                <Text style={s.recordBtnText}>Tap to Record</Text>
              </TouchableOpacity>
            </View>
          )}

          {isRecording && (
            <View style={s.recordWrap}>
              <PulseRing active />
              <TouchableOpacity style={[s.recordBtn, s.recordBtnActive]} onPress={stopRecording} activeOpacity={0.8}>
                <View style={s.stopIcon} />
                <Text style={s.recordBtnText}>Stop</Text>
              </TouchableOpacity>
            </View>
          )}

          {isRecorded && (
            <View style={s.actionRow}>
              <TouchableOpacity style={s.actionBtn} onPress={reset} activeOpacity={0.8}>
                <Text style={s.actionBtnIcon}>🔄</Text>
                <Text style={s.actionBtnText}>Re-record</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, s.actionBtnPlay]}
                onPress={state === 'playing' ? stopPlayback : playRecording}
                activeOpacity={0.8}>
                <Text style={s.actionBtnIcon}>{state === 'playing' ? '⏹️' : '▶️'}</Text>
                <Text style={[s.actionBtnText, { color: colors.green }]}>{state === 'playing' ? 'Stop' : 'Play'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.actionBtnAnalyze]} onPress={analyze} activeOpacity={0.8}>
                <Text style={s.actionBtnIcon}>🔍</Text>
                <Text style={[s.actionBtnText, { color: colors.primary }]}>Analyze</Text>
              </TouchableOpacity>
            </View>
          )}

          {isAnalyzing && (
            <View style={s.analyzingCard}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={s.analyzingStep}>{step}</Text>
              <Text style={s.analyzingNote}>Scanning 150+ threat patterns…</Text>
            </View>
          )}
        </View>

        {/* Recording info */}
        {isRecorded && (
          <View style={s.recordedCard}>
            <Text style={s.recordedTitle}>✅ Recording Ready</Text>
            <View style={s.recordedRow}>
              <View style={s.recordedStat}>
                <Text style={s.recordedStatVal}>{fmt(elapsed)}</Text>
                <Text style={s.recordedStatLbl}>Duration</Text>
              </View>
              <View style={s.recordedStat}>
                <Text style={s.recordedStatVal}>M4A</Text>
                <Text style={s.recordedStatLbl}>Format</Text>
              </View>
              <View style={s.recordedStat}>
                <Text style={s.recordedStatVal}>HQ</Text>
                <Text style={s.recordedStatLbl}>Quality</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tips */}
        <View style={s.tipsCard}>
          <Text style={s.tipsTitle}>💡 Recording Tips</Text>
          {[
            'Hold the phone normally — microphone picks up both sides',
            'Record in a quiet environment for best results',
            'Maximum recording length is 2 minutes',
            'Recording is never uploaded — processed on-device only',
          ].map((t, i) => <Text key={i} style={s.tipItem}>• {t}</Text>)}
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: colors.bg },
  scroll:           { padding: 20, paddingBottom: 40 },
  hero:             { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 24, marginBottom: 16, alignItems: 'center' },
  heroBadge:        { backgroundColor: 'rgba(213,0,0,0.12)', borderWidth: 1, borderColor: 'rgba(213,0,0,0.3)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  heroBadgeText:    { color: colors.red, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  heroTitle:        { fontSize: 24, fontWeight: '800', color: colors.critical, marginBottom: 8 },
  heroSub:          { fontSize: 13, color: colors.textSecond, textAlign: 'center', lineHeight: 20 },
  visualizerCard:   { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 20, marginBottom: 20, alignItems: 'center' },
  timer:            { fontSize: 48, fontWeight: '800', color: colors.textPrimary, letterSpacing: 4, fontVariant: ['tabular-nums'] },
  maxNote:          { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  progressBg:       { width: '100%', height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  progressFill:     { height: 4, backgroundColor: colors.red, borderRadius: 2 },
  btnArea:          { alignItems: 'center', marginBottom: 20 },
  recordWrap:       { alignItems: 'center', justifyContent: 'center', width: 90, height: 90 },
  recordBtn:        { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.bgCard, borderWidth: 3, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  recordBtnActive:  { borderColor: colors.red, backgroundColor: '#1a0000' },
  recordBtnIcon:    { fontSize: 28, marginBottom: 2 },
  recordBtnText:    { fontSize: 10, color: colors.textSecond, fontWeight: '600' },
  stopIcon:         { width: 22, height: 22, backgroundColor: colors.red, borderRadius: 4, marginBottom: 4 },
  actionRow:        { flexDirection: 'row', gap: 12 },
  actionBtn:        { flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, alignItems: 'center' },
  actionBtnPlay:    { borderColor: colors.green + '44', backgroundColor: colors.green + '11' },
  actionBtnAnalyze: { borderColor: colors.primary + '44', backgroundColor: colors.primary + '11' },
  actionBtnIcon:    { fontSize: 22, marginBottom: 6 },
  actionBtnText:    { fontSize: 12, fontWeight: '700', color: colors.textSecond },
  analyzingCard:    { alignItems: 'center', padding: 24, gap: 12 },
  analyzingStep:    { fontSize: 15, fontWeight: '600', color: colors.primary },
  analyzingNote:    { fontSize: 12, color: colors.textMuted },
  recordedCard:     { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.green + '44', borderRadius: 14, padding: 16, marginBottom: 16 },
  recordedTitle:    { fontSize: 14, fontWeight: '700', color: colors.green, marginBottom: 12 },
  recordedRow:      { flexDirection: 'row', justifyContent: 'space-around' },
  recordedStat:     { alignItems: 'center' },
  recordedStatVal:  { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  recordedStatLbl:  { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  tipsCard:         { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16 },
  tipsTitle:        { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  tipItem:          { fontSize: 12, color: colors.textSecond, lineHeight: 22 },
});
