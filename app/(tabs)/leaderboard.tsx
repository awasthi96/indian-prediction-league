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
  type Leader = {
    rank: number;
    username: string;
    points: number;
  };

  type TournamentLeaderboard = {
    tournament_id: number;
    tournament_name: string;
    leaders: Leader[];
  };

  const [tournaments, setTournaments] = useState<TournamentLeaderboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLeaderboard = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getTournamentLeaderboards();
      console.log("LEADERBOARD DATA:", data); // debug in Expo logs
      setTournaments(data.tournaments);
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
          data={tournaments}
          keyExtractor={(item) => item.tournament_id.toString()}
          renderItem={({ item }) => (
            <View style={styles.tournamentCard}>
              
              <Text style={styles.tournamentTitle}>
                {item.tournament_name}
              </Text>

              {item.leaders.map((leader) => (
                <View key={leader.rank} style={styles.leaderRow}>
                  <Text style={styles.leaderRank}>
                    {leader.rank === 1 ? "🥇" : leader.rank === 2 ? "🥈" : "🥉"}
                  </Text>

                  <Text style={styles.leaderName}>
                    {leader.username}
                  </Text>

                  <Text style={styles.leaderPoints}>
                    {leader.points} pts
                  </Text>
                </View>
              ))}

            </View>
          )}
          ListEmptyComponent={
            !loading && !error ? (
              <Text style={styles.emptyText}>No tournaments yet.</Text>
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
  tournamentCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  tournamentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: 10,
  },
  leaderPoints: {
    fontSize: 13,
    color: "#93c5fd",
    marginLeft: "auto",
  },
});
