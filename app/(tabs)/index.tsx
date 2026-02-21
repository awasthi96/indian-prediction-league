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
  Image,
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

  const parseDate = (dateString: string) => {
    // Convert "2026-02-07 11:00:00" to ISO-safe format
    return new Date(dateString.replace(" ", "T"));
  };

  const getShortName = (team: string) => {
    return team?.slice(0, 3).toUpperCase();
  };

  const categorizeMatches = (matches: any[]) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    const sorted = [...matches].sort(
      (a, b) =>
        parseDate(a.start_time).getTime() -
        parseDate(b.start_time).getTime()
    );

    return {
      today: sorted.filter(m => isSameDay(parseDate(m.start_time), today)),
      tomorrow: sorted.filter(m => isSameDay(parseDate(m.start_time), tomorrow)),
      others: sorted.filter(m =>
        !isSameDay(parseDate(m.start_time), today) &&
        !isSameDay(parseDate(m.start_time), tomorrow)
      ),
    };
  };

  const categorizedUpcoming = (() => {
    if (activeTab !== "upcoming") return [];

    const { today, tomorrow, others } = categorizeMatches(upcomingMatches);

    const sections: any[] = [];

    if (today.length) {
      sections.push({ type: "header", title: "Today" });
      today.forEach(m => sections.push({ type: "match", data: m, category: "today" }));
    }

    if (tomorrow.length) {
      sections.push({ type: "header", title: "Tomorrow" });
      tomorrow.forEach(m => sections.push({ type: "match", data: m, category: "tomorrow" }));
    }

    if (others.length) {
      sections.push({ type: "header", title: "Other Matches" });
      others.forEach(m => sections.push({ type: "match", data: m, category: "others" }));
    }

    return sections;
  })();

  const formatTime = (dateString: string) => {
    const d = parseDate(dateString);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatDateTime = (dateString: string) => {
    const d = parseDate(dateString);

    const datePart = d.toLocaleDateString([], {
      day: "numeric",
      month: "short",
    });

    const timePart = d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    return `${datePart} • ${timePart}`;
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
          data={activeTab === "upcoming" ? categorizedUpcoming : completedMatches}
          keyExtractor={(item, index) =>
            activeTab === "upcoming"
              ? index.toString()
              : item.id.toString()
          }
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
          renderItem={({ item }) => {
            if (activeTab === "upcoming") {

              if (item.type === "header") {
                return (
                  <Text style={styles.categoryHeader}>
                    {item.title}
                  </Text>
                );
              }

              const match = item.data;
              const isToday = item.category === "today";

              return (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/matches/[matchId]",
                      params: { matchId: String(match.id) },
                    })
                  }
                  style={[
                    styles.matchCard,
                    isToday && styles.todayCard
                  ]}
                >
                  <View style={styles.teamsRow}>

                    {isToday && (
                      match.home_team_logo_url ? (
                        <Image
                          source={{ uri: match.home_team_logo_url }}
                          style={styles.logo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.logoPlaceholder} />
                      )
                    )}

                    <Text style={[
                      styles.teamText,
                      isToday && styles.todayTeamText
                    ]}>
                      {match.home_team_short_name || match.home_team}
                    </Text>

                    <Text style={styles.vsText}>vs</Text>

                    <Text style={[
                      styles.teamText,
                      isToday && styles.todayTeamText
                    ]}>
                      {match.away_team_short_name || match.away_team}
                    </Text>

                    {isToday && (
                      match.home_team_logo_url ? (
                        <Image
                          source={{ uri: match.away_team_logo_url }}
                          style={styles.logo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.logoPlaceholder} />
                      )
                    )}
                  </View>

                  <Text style={styles.timeText}>
                    {isToday
                      ? formatTime(match.start_time)
                      : formatDateTime(match.start_time)}
                  </Text>
                </TouchableOpacity>
              );
            }

            // COMPLETED TAB (leave your existing completed UI logic here)
            return (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/matches/[matchId]",
                    params: { matchId: String(item.id) },
                  })
                }
                style={styles.matchCard}
              >
                <Text style={styles.matchTeams}>
                  {item.home_team} vs {item.away_team}
                </Text>
                <Text style={styles.matchInfo}>
                  {new Date(item.start_time).toLocaleString()}
                </Text>
                <Text style={styles.tapHint}>
                  Tap to view result
                </Text>
              </TouchableOpacity>
            );
          }}
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
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  teamText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  todayTeamText: {
    fontSize: 18,
  },
  vsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
  },
  timeText: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 13,
    color: "#93c5fd",
  },
  todayCard: {
    paddingVertical: 18,
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#374151",

  },
  categoryHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#93c5fd",
    marginTop: 14,
    marginBottom: 6,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
});