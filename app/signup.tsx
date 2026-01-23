import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StyleSheet, SafeAreaView 
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/api/api";

export default function SignupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "", password: "", full_name: "", mobile_number: "",
    email: "", fav_team_intl: "", fav_team_ipl: "", fav_player: ""
  });

  const handleChange = (k: string, v: string) => setForm({ ...form, [k]: v });

  const handleSignup = async () => {
    if (!form.username || !form.password || !form.mobile_number || !form.full_name) {
      Alert.alert("Error", "Please fill required fields (*)");
      return;
    }
    setLoading(true);
    try {
      await api.register(form);
      Alert.alert("Success", "Account created! Login now.", [{ text: "OK", onPress: () => router.replace("/login") }]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Create Account</Text>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} placeholderTextColor="#6b7280" placeholder="John Doe" onChangeText={t => handleChange("full_name", t)} />

        <Text style={styles.label}>Username *</Text>
        <TextInput style={styles.input} placeholderTextColor="#6b7280" placeholder="johndoe" autoCapitalize="none" onChangeText={t => handleChange("username", t)} />

        <Text style={styles.label}>Password *</Text>
        <TextInput style={styles.input} placeholderTextColor="#6b7280" placeholder="******" secureTextEntry onChangeText={t => handleChange("password", t)} />

        <Text style={styles.label}>Mobile *</Text>
        <TextInput style={styles.input} placeholderTextColor="#6b7280" placeholder="9876543210" keyboardType="phone-pad" onChangeText={t => handleChange("mobile_number", t)} />

        <Text style={styles.sectionHeader}>Preferences (Optional)</Text>
        <TextInput style={styles.input} placeholderTextColor="#6b7280" placeholder="Fav International Team" onChangeText={t => handleChange("fav_team_intl", t)} />
        <TextInput style={styles.input} placeholderTextColor="#6b7280" placeholder="Fav IPL Team" onChangeText={t => handleChange("fav_team_ipl", t)} />
        <TextInput style={styles.input} placeholderTextColor="#6b7280" placeholder="Fav Player" onChangeText={t => handleChange("fav_player", t)} />

        {loading ? <ActivityIndicator color="#60a5fa" /> : (
          <TouchableOpacity style={styles.button} onPress={handleSignup}>
            <Text style={styles.btnText}>Sign Up</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.push("/login")} style={{marginTop: 15}}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  scroll: { padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: "#f3f4f6", marginBottom: 20, textAlign: "center" },
  sectionHeader: { color: "#93c5fd", fontSize: 16, fontWeight: "600", marginTop: 10, marginBottom: 10 },
  label: { color: "#cbd5e1", marginBottom: 6 },
  input: { backgroundColor: "#1e293b", color: "#f3f4f6", padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: "#334155" },
  button: { backgroundColor: "#2563eb", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 10 },
  btnText: { color: "white", fontWeight: "bold" },
  link: { color: "#60a5fa", textAlign: "center", marginTop: 10 }
});