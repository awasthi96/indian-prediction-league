import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StyleSheet, SafeAreaView 
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/api/api";
import { Platform } from "react-native";

export default function SignupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "", password: "", full_name: "", mobile_number: "",
    email: ""
  });

  const handleChange = (k: string, v: string) => setForm({ ...form, [k]: v });

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const showSuccessAndRedirect = (message: string) => {
    if (Platform.OS === "web") {
      window.alert(message);
      router.replace("/login");
    } else {
      Alert.alert(
        "Success 🎉",
        message,
        [
          {
            text: "Go to Login",
            onPress: () => router.replace("/login")
          }
        ],
        { cancelable: false }
      );
    }
  };

  const handleSignup = async () => {
    if (!form.username || !form.password || !form.mobile_number || !form.full_name) {
      showAlert("Error", "Please fill required fields (*)");
      return;
    }
    setLoading(true);
    try {
      await api.register(form);

      setForm({
        username: "",
        password: "",
        full_name: "",
        mobile_number: "",
        email: ""
      });

      showSuccessAndRedirect(
        "Account created successfully.\nPlease continue to login"
      );

    } catch (error: any) {
      console.log("Signup error:", error);
      showAlert("Signup Failed", error.message);
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

        {loading ? <ActivityIndicator color="#60a5fa" /> : (
          <TouchableOpacity style={[styles.button, loading &&{opacity:0.7}]} onPress={handleSignup} disabled={loading}>
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
  title: { fontSize: 28, fontWeight: "bold", color: "#f3f4f6", marginBottom: 30, textAlign: "center" },
  sectionHeader: { color: "#93c5fd", fontSize: 16, fontWeight: "600", marginTop: 10, marginBottom: 10 },
  label: { color: "#cbd5e1", marginBottom: 6 },
  input: { backgroundColor: "#1e293b", color: "#f3f4f6", padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: "#334155" },
  button: { backgroundColor: "#2563eb", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 10 },
  btnText: { color: "white", fontWeight: "bold" },
  link: { color: "#60a5fa", textAlign: "center", marginTop: 10 }
});