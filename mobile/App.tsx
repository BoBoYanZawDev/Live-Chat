import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { ChatScreen } from './src/features/chat/ChatScreen';
import { queryClient } from './src/lib/queryClient';
import { useTheme } from './src/lib/theme';
import { useAuthStore } from './src/stores/auth.store';
import { useChatStore } from './src/stores/chat.store';

function AuthGate() {
  const theme = useTheme();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);

  // Logged out (explicitly or via a 401): drop everything cached for the previous customer.
  useEffect(() => {
    if (!token) {
      queryClient.clear();
      useChatStore.getState().reset();
    }
  }, [token]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  return token ? <ChatScreen /> : <LoginScreen />;
}

export default function App() {
  const theme = useTheme();
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
        <AuthGate />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
