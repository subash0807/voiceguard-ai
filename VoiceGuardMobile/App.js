// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

import HomeScreen      from './src/screens/HomeScreen';
import AnalyzeScreen   from './src/screens/AnalyzeScreen';
import TextScreen      from './src/screens/TextScreen';
import EmergencyScreen from './src/screens/EmergencyScreen';
import StatsScreen     from './src/screens/StatsScreen';
import ResultScreen    from './src/screens/ResultScreen';
import { colors }      from './src/utils/theme';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const screenOpts = {
  headerStyle:      { backgroundColor: colors.bgDeep, borderBottomWidth: 1, borderBottomColor: colors.border, elevation: 0, shadowOpacity: 0 },
  headerTintColor:  colors.textPrimary,
  headerTitleStyle: { fontWeight: '700', fontSize: 16 },
};

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...screenOpts,
        tabBarStyle: {
          backgroundColor: colors.bgDeep,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const icons = { Home:'🏠', Analyze:'🎙️', Text:'📝', Emergency:'🚨', Stats:'📊' };
          return <StatusBarIcon name={icons[route.name]} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen}      options={{ title:'Home',      tabBarLabel:'Home' }} />
      <Tab.Screen name="Analyze"   component={AnalyzeScreen}   options={{ title:'Analyze Audio', tabBarLabel:'Audio' }} />
      <Tab.Screen name="Text"      component={TextScreen}      options={{ title:'Analyze Text',  tabBarLabel:'Text' }} />
      <Tab.Screen name="Emergency" component={EmergencyScreen} options={{ title:'Emergency',  tabBarLabel:'Emergency' }} />
      <Tab.Screen name="Stats"     component={StatsScreen}     options={{ title:'Statistics', tabBarLabel:'Stats' }} />
    </Tab.Navigator>
  );
}

function StatusBarIcon({ name, color }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20 }}>{name}</Text>;
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={colors.bgDeep} />
      <Stack.Navigator screenOptions={screenOpts}>
        <Stack.Screen name="Main"   component={HomeTabs}    options={{ headerShown: false }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: '🛡️ Analysis Result', headerBackTitle: 'Back' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
