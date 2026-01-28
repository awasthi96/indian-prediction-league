import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/api/api';
import { getToken, deleteToken } from '@/auth/storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getToken();

        const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';
        
        if (!token) {
          if (!inAuthGroup) {
            console.log("No token, redirecting to login...");
            router.replace('/login');
          }
          setIsReady(true);
          return;
        }

        // 2. Only call API if token exists
        await api.getMe();
        
      } catch (e) {
        console.log("Token check failed, clearing and redirecting to login...");
        await deleteToken(); // Clear bad token
        router.replace('/login');
      } finally {
        setIsReady(true);
      }
    };

    checkAuth();
  }, [segments]);

  // Show a loading spinner while we check the token
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Hide header for these screens */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}