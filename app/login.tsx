// app/login.tsx
import { useState } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from "@/api/api";
import { saveToken } from '@/auth/token';


export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      await saveToken(response.access_token);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
        {/* existing login UI */}
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to </Text>
      

        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="cover"
        />
      

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor='#6b7280'
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor='#6b7280'
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <Button title="Login" onPress={handleLogin} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'top',
    padding: 20,
    paddingTop: 100,
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    color: "#e5e7eb",
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#111827',
    color: '#05e7eb',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  error: {
    color: 'red',
    marginBottom: 12,
    textAlign: 'center',
  },
  logo: {
    width: 300,
    height: 150,
    alignSelf: "center",
    marginVertical: 24,
    borderRadius: 16,
    backgroundColor: "#0f172a",
  },
});