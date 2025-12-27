import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { api } from "@/api/api";

export default function LeaderboardScreen() {
  type LeaderboardRow = {
  rank: number;
  user_id: number;
  username: string;
  total_points: number;
  matches_played: number;
};

const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLeaderboard = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getOverallLeaderboard();
      console.log("LEADERBOARD DATA:", data); // debug in Expo logs
      setLeaderboard(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLeaderboard();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Overall Leaderboard</Text>

      <View style={styles.card}>
        {loading && <ActivityIndicator />}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.user_id.toString()}
          renderItem={({ item }) => (
            <View style={styles.leaderRow}>
              <Text style={styles.leaderRank}>#{item.rank}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.leaderName}>{item.username}</Text>
                <Text style={styles.leaderSub}>
                  Points: {item.total_points} · Matches:{" "}
                  {item.matches_played}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !loading && !error ? (
              <Text style={styles.emptyText}>No data yet.</Text>
            ) : null
          }
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
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: "#fca5a5",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  leaderRank: {
    width: 32,
    fontSize: 16,
    fontWeight: "700",
    color: "#fbbf24",
  },
  leaderName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  leaderSub: {
    fontSize: 12,
    color: "#9ca3af",
  },
});
