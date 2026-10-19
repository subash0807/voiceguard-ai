// App.js — Expo SDK 51, React Navigation v6
import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

import HomeScreen      from './src/screens/HomeScreen';
import RecordScreen    from './src/screens/RecordScreen';
import AnalyzeScreen   from './src/screens/AnalyzeScreen';
import TextScreen      from './src/screens/TextScreen';
import EmergencyScreen from './src/screens/EmergencyScreen';
import StatsScreen     from './src/screens/StatsScreen';
import HistoryScreen   from './src/screens/HistoryScreen';
import ResultScreen    from './src/screens/ResultScreen';
import { colors }      from './src/utils/theme';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const headerOpts = {
  headerStyle:      { backgroundColor: colors.bgDeep, borderBottomWidth: 1, borderBottomColor: colors.border, elevation: 0, shadowOpacity: 0 },
  headerTintColor:  colors.textPrimary,
  headerTitleStyle: { fontWeight: '700', fontSize: 16 },
};

const TAB_ICONS = {
  Home: '🏠', Record: '🎙️', Analyze: '📂',
  Text: '📝', History: '📋', Emergency: '🚨', Stats: '📊',
};

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...headerOpts,
        tabBarStyle: {
          backgroundColor: colors.bgDeep,
          borderTopColor:  colors.border,
          borderTopWidth:  1,
          height:          64,
          paddingBottom:   10,
          paddingTop:      4,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '600' },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{TAB_ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen}      options={{ title: 'VoiceGuard AI', tabBarLabel: 'Home' }} />
      <Tab.Screen name="Record"    component={RecordScreen}    options={{ title: '🎙️ Record Audio', tabBarLabel: 'Record',
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>🎙️</Text>
        ),
        tabBarActiveTintColor: colors.red,
      }} />
      <Tab.Screen name="Analyze"   component={AnalyzeScreen}   options={{ title: 'Analyze Audio',  tabBarLabel: 'Upload' }} />
      <Tab.Screen name="Text"      component={TextScreen}      options={{ title: 'Analyze Text',   tabBarLabel: 'Text' }} />
      <Tab.Screen name="History"   component={HistoryScreen}   options={{ title: '📋 History',     tabBarLabel: 'History' }} />
      <Tab.Screen name="Emergency" component={EmergencyScreen} options={{ title: '🚨 Emergency',   tabBarLabel: 'SOS' }} />
      <Tab.Screen name="Stats"     component={StatsScreen}     options={{ title: '📊 Statistics',  tabBarLabel: 'Stats' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={colors.bgDeep} />
      <Stack.Navigator screenOptions={headerOpts}>
        <Stack.Screen name="Main"   component={HomeTabs}    options={{ headerShown: false }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: '🛡️ Analysis Result' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
