import { useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '../../lib/theme';
import { NAME_MAX, useLogin, validateLogin } from './api';

export function LoginScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const login = useLogin();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const phoneRef = useRef<ComponentRef<typeof TextInput>>(null);

  const errors = validateLogin(name, phone);
  const hasErrors = Object.keys(errors).length > 0;

  const submit = () => {
    setTouched(true);
    if (hasErrors || login.isPending) return;
    login.mutate({ name: name.trim(), phone: phone.trim() });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Text style={styles.logoText}>💬</Text>
          </View>
          <Text style={styles.title}>Chat with Support</Text>
          <Text style={styles.subtitle}>Tell us who you are and we'll pick up right where you left off.</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={[styles.input, touched && errors.name && styles.inputError]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={NAME_MAX}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            editable={!login.isPending}
          />
          {touched && errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}

          <Text style={styles.label}>Phone</Text>
          <TextInput
            ref={phoneRef}
            style={[styles.input, touched && errors.phone && styles.inputError]}
            value={phone}
            onChangeText={setPhone}
            placeholder="+95 9 123 456 789"
            placeholderTextColor={theme.textMuted}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={20}
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!login.isPending}
          />
          {touched && errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}

          {login.error ? (
            <View style={styles.serverError}>
              <Text style={styles.serverErrorText}>{login.error.message}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (login.isPending || (touched && hasErrors)) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={submit}
            disabled={login.isPending}
            accessibilityRole="button"
          >
            {login.isPending ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <Text style={styles.buttonText}>Start chatting</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.background },
    flex: { flex: 1 },
    container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    logo: {
      alignSelf: 'center',
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    logoText: { fontSize: 34 },
    title: { fontSize: 26, fontWeight: '700', color: t.text, textAlign: 'center' },
    subtitle: { fontSize: 15, color: t.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 28 },
    label: { fontSize: 13, fontWeight: '600', color: t.textMuted, marginBottom: 6, marginTop: 12 },
    input: {
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      color: t.text,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 14 : 10,
      fontSize: 16,
    },
    inputError: { borderColor: t.danger },
    fieldError: { color: t.danger, fontSize: 13, marginTop: 6 },
    serverError: { marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: t.surface },
    serverErrorText: { color: t.danger, fontSize: 14, textAlign: 'center' },
    button: {
      marginTop: 28,
      height: 50,
      borderRadius: 25,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: { opacity: 0.6 },
    buttonPressed: { opacity: 0.85 },
    buttonText: { color: t.onAccent, fontSize: 16, fontWeight: '600' },
  });
