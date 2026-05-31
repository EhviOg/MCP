import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { BannerHost } from '@/components/Banner';
import { Palette } from '@/constants/palette';
import { StoreProvider } from '@/lib/store';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Palette.bg,
    card: Palette.surface,
    text: Palette.text,
    border: Palette.border,
    primary: Palette.accent,
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: Palette.surface },
  headerTitleStyle: { color: Palette.text, fontWeight: '700' as const },
  headerTintColor: Palette.accent,
  contentStyle: { backgroundColor: Palette.bg },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StoreProvider>
        <ThemeProvider value={navTheme}>
          <Stack screenOptions={screenOptions}>
            <Stack.Screen name="index" options={{ title: 'Solar Charging Station' }} />
            <Stack.Screen name="add-device" options={{ title: 'Add Device' }} />
            <Stack.Screen name="ticket" options={{ title: 'Ticket' }} />
            <Stack.Screen name="slots" options={{ title: 'Slots' }} />
            <Stack.Screen name="slot-detail" options={{ title: 'Slot Detail' }} />
            <Stack.Screen
              name="release"
              options={{ title: 'Release Device', presentation: 'modal' }}
            />
            <Stack.Screen name="systems" options={{ title: 'Systems' }} />
          </Stack>
          <BannerHost />
          <StatusBar style="light" />
        </ThemeProvider>
      </StoreProvider>
    </GestureHandlerRootView>
  );
}
