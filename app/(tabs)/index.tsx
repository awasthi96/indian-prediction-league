// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Pressable, 
  Alert,
} from "react-native";
import { api } from "@/api/api";
import { useLogout } from "@/auth/logout";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, router } from "expo-router";

export default function App() {
  const logout = useLogout();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming");

  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [completedMatches, setCompletedMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState("");

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() =>
            Alert.alert(
              "Logout",
              "Are you sure you want to logout?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: logout },
              ]
            )
          }
          style={styles.logoutButton}
        >
          <Ionicons name="log-out-outline" size={22} color="#e5e7eb" />
        </Pressable>
      ),
    });
  }, [navigation, logout]);

  useEffect(() => {
    handleLoadMatches();
  }, []);

  const handleLoadMatches = async () => {
    setMatchesLoading(true);
    setMatchesError("");
    try {
      const upcoming = await api.getUpcomingMatches();
      const completed = await api.getCompletedMatches();
      setUpcomingMatches(upcoming);
      setCompletedMatches(completed);
    } catch (e: any) {
      setMatchesError(e.message);
    } finally {
      setMatchesLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Indian Prediction League</Text>
          <Text style={styles.subtitle}>brought to you by Saumya Awasthi</Text>
        </View>

        <TouchableOpacity onPress={logout} >
          <Ionicons name="log-out-outline" size={26} color="#e5e7eb" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Matches</Text>

        {/* Segmented Tabs */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === "upcoming" && styles.segmentActive,
            ]}
            onPress={() => setActiveTab("upcoming")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "upcoming" && styles.segmentTextActive,
              ]}
            >
              Upcoming
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === "completed" && styles.segmentActive,
            ]}
            onPress={() => setActiveTab("completed")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "completed" && styles.segmentTextActive,
              ]}
            >
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        {matchesLoading && <ActivityIndicator />}

        {matchesError ? (
          <Text style={styles.errorText}>{matchesError}</Text>
        ) : null}

        {/* MATCH LIST */}
        <FlatList
          data={activeTab === "upcoming" ? upcomingMatches : completedMatches}
          keyExtractor={(item) => item.id.toString()}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !matchesLoading ? (
              <Text style={styles.emptyText}>
                {activeTab === "upcoming"
                  ? "No upcoming matches."
                  : "No completed matches yet."}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({
                pathname: "/matches/[matchId]",
                params: { matchId: String(item.id) },
              })}
              style={styles.matchCard}
            >
              <Text style={styles.matchTeams}>
                {item.home_team} vs {item.away_team}
              </Text>
              <Text style={styles.matchInfo}>Venue: {item.venue}</Text>
              <Text style={styles.matchInfo}>
                {activeTab === "upcoming" ? "Starts at:" : "Started at:"}{" "}
                {new Date(item.start_time).toLocaleString()}
              </Text>
              <Text style={styles.matchStatus}>Status: {item.status}</Text>
              <Text style={styles.tapHint}>
                {activeTab === "upcoming"
                  ? "Tap to predict"
                  : "Tap to view result"}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  errorText: {
    color: "#fca5a5",
    marginTop: 8,
  },
  matchCard: {
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  matchTeams: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  matchInfo: {
    fontSize: 13,
    color: "#9ca3af",
  },
  matchStatus: {
    fontSize: 12,
    color: "#93c5fd",
    marginTop: 4,
  },
  tapHint: {
    fontSize: 11,
    color: "#a5b4fc",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#111827",
    borderRadius: 999,
    padding: 4,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: "#2563eb",
  },
  segmentText: {
    fontSize: 13,
    color: "#9ca3af",
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#f9fafb",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  logoutButton: {
    marginRight: 16,
  },
});