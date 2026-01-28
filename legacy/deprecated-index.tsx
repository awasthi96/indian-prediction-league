import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  StatusBar,
  Platform,
} from "react-native";
import { api } from "../../api";
import PlayerDropdown from "@/components/PlayerDropdown";
import TeamDropdown from "@/components/TeamDropdown";
import { useLogout } from "@/auth/logout";

const XF_RISK_OPTIONS = [
  { id: "LOW", label: "Low risk" },
  { id: "MEDIUM", label: "Medium risk" },
  { id: "HIGH", label: "High risk" },
];

const logout = useLogout();

// Map risk -> list of conditions (each maps to a backend xf_id)
const XF_CONDITION_BY_RISK: Record<
  string,
  { id: string; label: string; xf_id: string; description: string }[] > = {
  LOW: [
    {
      id: "BAT_50",
      xf_id: "XF_BAT_50_RUNS",
      label: "Batter scores 50+ runs",
      description: "Player scores at least 50 runs",
    },
    {
      id: "BOWL_9_DOTS",
      xf_id: "XF_BOWL_9_DOTS",
      label: "Bowler bowls 9+ dot balls",
      description: "At least 9 dot balls in the match",
    },
    {
      id: "FIELD_CATCH",
      xf_id: "XF_FIELD_CATCH",
      label: "Player takes a catch",
      description: "At least 1 catch",
    },
  ],
  MEDIUM: [
    {
      id: "BAT_SR_180",
      xf_id: "XF_BAT_SR_180_10B",
      label: "Strike rate ≥ 180 (10+ balls)",
      description: "Min 10 balls, SR 180 or more",
    },
    {
      id: "BAT_8_BOUNDARIES",
      xf_id: "XF_BAT_8_BOUNDARIES",
      label: "Batter hits 8+ boundaries",
      description: "Fours + sixes ≥ 8",
    },
    {
      id: "BOWL_3_WICKETS",
      xf_id: "XF_BOWL_3_WICKETS",
      label: "Bowler takes 3+ wickets",
      description: "3 or more wickets",
    },
  ],
  HIGH: [
    {
      id: "BAT_15_RUNS_OVER",
      xf_id: "XF_BAT_15_RUNS_OVER",
      label: "15+ runs in an over",
      description: "Player scores 15+ in any over",
    },
    {
      id: "BOWL_ECON_7",
      xf_id: "XF_BOWL_7_ECONOMY",
      label: "Economy ≤ 7",
      description: "Bowler economy 7 or less",
    },
  ],
};


export default function App() {
  const [healthStatus, setHealthStatus] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [completedMatches, setCompletedMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState("");

  
  // Prediction form state
  const [tossWinner, setTossWinner] = useState("");
  const [matchWinner, setMatchWinner] = useState("");
  const [topWicketTaker, setTopWicketTaker] = useState("");
  const [topRunScorer, setTopRunScorer] = useState("");
  const [highestRuns, setHighestRuns] = useState("");
  const [powerplayRuns, setPowerplayRuns] = useState("");
  const [totalWickets, setTotalWickets] = useState("");
  // For now, we’ll keep X-factors empty in the app
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionMessage, setPredictionMessage] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const handleSelectMatch = (match: any) => {
    setSelectedMatch(match);
    setMyPrediction(null);
    setXfModalVisible(false);
    resetPredictionForm();
  };
  const [players, setPlayers] = useState<string[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState("");


  // NEW:
  const [myPrediction, setMyPrediction] = useState<any | null>(null);
  const [myPredictionLoading, setMyPredictionLoading] = useState(false);
 
  // X-factor list for this prediction
  const [xFactors, setXFactors] = useState<
    { xf_id: string; risk: string; condition_label: string; player_name: string }[]
  >([]);

  // Modal visibility
  const [xfModalVisible, setXfModalVisible] = useState(false);

  // Modal draft fields
  const [xfRisk, setXfRisk] = useState<string | null>(null);
  const [xfCondition, setXfCondition] = useState<
    { xf_id: string; label: string; description: string } | null
  >(null);
  const [xfPlayer, setXfPlayer] = useState<string>("");

  // Fetch players when match loads
  useEffect(() => {
    if (!selectedMatch?.id) return;

    setPlayersLoading(true);

    api
      .getMatchPlayers(selectedMatch.id)
      .then((res) => {
        setPlayers(res);
      })
      .catch(() => {
        setPlayers([]);
        setPlayersError("No players available for this match");
      })
      .finally(() => {
        setPlayersLoading(false);
      });
  }, [selectedMatch?.id]);
  useEffect(() => {
    console.log("PLAYERS LOADED:", players);
  }, [players]);

  useEffect(() => {
    if (!selectedMatch?.id) return;

    setPredictionLoading(true);

    api
      .getMyPrediction(selectedMatch.id)
      .then((res) => {
        setMyPrediction(res);
      })
      .catch((err) => {
        if (err.status === 404) {
          setMyPrediction(null); // normal
        } else {
          console.error(err);
        }
      })
      .finally(() => {
        setPredictionLoading(false);
      });
  }, [selectedMatch?.id]);

  useEffect(() => {
    if (!myPrediction) return;

    setForm({
      tossWinner: myPrediction.toss_winner,
      matchWinner: myPrediction.match_winner,
      topRunScorer: myPrediction.top_run_scorer,
      topWicketTaker: myPrediction.top_wicket_taker,
      highestRunScored: myPrediction.highest_run_scored,
      powerplayRuns: myPrediction.powerplay_runs,
      totalWickets: myPrediction.total_wickets,
      xFactors: myPrediction.x_factors,
    });
  }, [myPrediction]);




  // 1) Check backend health
  const handleCheckHealth = async () => {
    setError("");
    setHealthStatus(null);
    try {
      const res = await api.health();
      setHealthStatus(res.status);
    } catch (e: any) {
      setError(e.message);
    }
  };


  // 3) Load upcoming and completed matches
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



  const resetPredictionForm = () => {
    setTossWinner("");
    setMatchWinner("");
    setTopWicketTaker("");
    setTopRunScorer("");
    setHighestRuns("");
    setPowerplayRuns("");
    setTotalWickets("");
    setPredictionMessage("");
    setXFactors([]);
    setXfRisk(null);
    setXfCondition(null);
    setXfPlayer("");
  };

  const openXfModal = () => {
    setXfModalVisible(true);
    setXfRisk(null);
    setXfCondition(null);
    setXfPlayer("");
    setPredictionMessage("");
  };

  const closeXfModal = () => {
    setXfModalVisible(false);
  };

  const handleAddXfFromModal = () => {
    if (!xfRisk || !xfCondition || !xfPlayer.trim()) {
      setPredictionMessage("Please select risk, condition and player.");
      return;
    }

    setXFactors((prev) => [
      ...prev,
      {
        xf_id: xfCondition.xf_id,
        risk: xfRisk,
        condition_label: xfCondition.label,
        player_name: xfPlayer.trim(),
      },
    ]);

    // reset draft + close modal
    setXfRisk(null);
    setXfCondition(null);
    setXfPlayer("");
    setXfModalVisible(false);
  };

  const handleRemoveXFactor = (index: number) => {
    setXFactors((prev) => prev.filter((_, i) => i !== index));
  };


  const handleSubmitPrediction = async () => {
    if (!selectedMatch) return;

    // basic validation
    if (
      !tossWinner ||
      !matchWinner ||
      !topWicketTaker ||
      !topRunScorer ||
      !highestRuns ||
      !powerplayRuns ||
      !totalWickets
    ) {
      setPredictionMessage("Please fill all fields.");
      return;
    }

    const payload = {
      toss_winner: tossWinner,
      match_winner: matchWinner,
      top_wicket_taker: topWicketTaker,
      top_run_scorer: topRunScorer,
      highest_run_scored: Number(highestRuns),
      powerplay_runs: Number(powerplayRuns),
      total_wickets: Number(totalWickets),
      x_factors: xFactors.map((xf) => ({
        xf_id: xf.xf_id,
        player_name: xf.player_name,
      })),
    };

    setPredictionLoading(true);
    setPredictionMessage("");

    try {
      const prediction = await api.submitPrediction(
        selectedMatch.id,
        payload
      );

      setMyPrediction(prediction); // store what backend returns
      setPredictionMessage("Prediction submitted ✅");
    } catch (e: any) {
      setPredictionMessage(e.message);
    } finally {
      setPredictionLoading(false);
    }
  };

  // ---------- UI RENDERING ----------

  // X-Factor modal UI (stays mounted, controlled by state)
  const renderXfModal = () => (
    <Modal
      visible={xfModalVisible}
      transparent
      animationType="slide"
      onRequestClose={closeXfModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>X-Factor Prediction</Text>

          {/* Risk selection */}
          <Text style={styles.modalLabel}>1. Risk</Text>
          <View style={styles.modalChipRow}>
            {XF_RISK_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.modalChip,
                  xfRisk === r.id && styles.modalChipActive,
                ]}
                onPress={() => {
                  setXfRisk(r.id);
                  setXfCondition(null); // reset condition when risk changes
                }}
              >
                <Text
                  style={[
                    styles.modalChipText,
                    xfRisk === r.id && styles.modalChipTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Condition */}
          <Text style={styles.modalLabel}>2. Condition</Text>
          {!xfRisk ? (
            <Text style={styles.modalHint}>Select risk first.</Text>
          ) : (
            <View style={styles.modalChipColumn}>
              {XF_CONDITION_BY_RISK[xfRisk].map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.modalChipFull,
                    xfCondition?.xf_id === c.xf_id && styles.modalChipActive,
                  ]}
                  onPress={() =>
                    setXfCondition({
                      xf_id: c.xf_id,
                      label: c.label,
                      description: c.description,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.modalChipText,
                      xfCondition?.xf_id === c.xf_id &&
                        styles.modalChipTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                  <Text style={styles.modalHint}>{c.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Player */}
          <Text style={styles.modalLabel}>3. Player</Text>
          {!xfCondition ? (
            <Text style={styles.modalHint}>
              Select condition to choose player.
            </Text>
          ) : playersLoading ? (
            <Text style={styles.modalHint}>Loading players…</Text>
          ) : playersError ? (
            <>
              <Text style={styles.modalHint}>
                {playersError} Type player manually:
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Player name"
                placeholderTextColor="#6b7280"
                value={xfPlayer}
                onChangeText={setXfPlayer}
              />
            </>
          ) : (
            <>
              {xfPlayer ? (
                <Text style={styles.modalHint}>Selected: {xfPlayer}</Text>
              ) : (
                <Text style={styles.modalHint}>Tap a player to select.</Text>
              )}

              <View style={styles.modalPlayerList}>
                <ScrollView style={{ maxHeight: 200 }}>
                  {players.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.modalChipFull,
                        xfPlayer === p && styles.modalChipActive,
                      ]}
                      onPress={() => setXfPlayer(p)}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          xfPlayer === p && styles.modalChipTextActive,
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          )}


          {/* Buttons */}
          <View style={styles.modalButtonsRow}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={closeXfModal}
            >
              <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                (!xfRisk || !xfCondition || !xfPlayer.trim()) &&
                  styles.modalButtonDisabled,
              ]}
              disabled={!xfRisk || !xfCondition || !xfPlayer.trim()}
              onPress={handleAddXfFromModal}
            >
              <Text style={styles.modalButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  


  // If logged in & match selected: show match detail + prediction form
  if (user && selectedMatch) {
    return (
      <SafeAreaView style={styles.container}>
        {renderXfModal()}
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <Text style={styles.title}>Match Prediction</Text>
          <Text style={styles.subtitle}>
            {selectedMatch.home_team} vs {selectedMatch.away_team}
          </Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Match Info</Text>
            <Text style={styles.matchInfo}>Venue: {selectedMatch.venue}</Text>
            <Text style={styles.matchInfo}>
              Starts at:{" "}
              {new Date(selectedMatch.start_time).toLocaleString()}
            </Text>
            <Text style={styles.matchStatus}>
              Status: {selectedMatch.status}
            </Text>
          </View>

                    <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your Prediction</Text>

            {myPredictionLoading ? (
              <ActivityIndicator />
            ) : myPrediction ? (
              <>
                <Text style={styles.okText}>
                  You have already submitted a prediction for this match.
                </Text>

                {/* If match is completed and points exist, show total points */}
                {selectedMatch.status === "completed" &&
                  myPrediction.points_earned !== null &&
                  myPrediction.points_earned !== undefined && (
                    <Text style={styles.pointsText}>
                      Total points: {myPrediction.points_earned}
                    </Text>
                  )}


                <Text style={styles.label}>Toss winner</Text>
                <Text style={styles.readonlyValue}>
                  {myPrediction.toss_winner}
                </Text>

                <Text style={styles.label}>Match winner</Text>
                <Text style={styles.readonlyValue}>
                  {myPrediction.match_winner}
                </Text>

                <Text style={styles.label}>Top wicket taker</Text>
                <Text style={styles.readonlyValue}>
                  {myPrediction.top_wicket_taker}
                </Text>

                <Text style={styles.label}>Top run scorer</Text>
                <Text style={styles.readonlyValue}>
                  {myPrediction.top_run_scorer}
                </Text>

                <Text style={styles.label}>Highest team total</Text>
                <Text style={styles.readonlyValue}>
                  {myPrediction.highest_run_scored}
                </Text>

                <Text style={styles.label}>Powerplay runs</Text>
                <Text style={styles.readonlyValue}>
                  {myPrediction.powerplay_runs}
                </Text>

                <Text style={styles.label}>Total wickets</Text>
                <Text style={styles.readonlyValue}>
                  {myPrediction.total_wickets}
                </Text>

                {/* X-Factor results */}
                {myPrediction.x_factors && myPrediction.x_factors.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.sectionTitle}>X-Factors</Text>
                    {myPrediction.x_factors.map((xf: any, index: number) => (
                      <Text key={index} style={styles.xfResult}>
                        {xf.correct === true
                          ? "✅"
                          : xf.correct === false
                          ? "❌"
                          : "•"}{" "}
                        {xf.xf_id} – {xf.player_name}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <>
                {/* ORIGINAL FORM STARTS HERE */}

                <TeamDropdown
                  label="Toss winner"
                  options={[selectedMatch.home_team, selectedMatch.away_team]}
                  value={tossWinner}
                  onSelect={setTossWinner}
                  placeholder="Select team"
                />

                <TeamDropdown
                  label="Match winner"
                  options={[selectedMatch.home_team, selectedMatch.away_team]}
                  value={matchWinner}
                  onSelect={setMatchWinner}
                  placeholder="Select team"
                />

                <PlayerDropdown
                  label="Top wicket taker"
                  data={players}
                  value={topWicketTaker}
                  onSelect={setTopWicketTaker}
                  disabled={playersLoading || players.length === 0}
                />


                <PlayerDropdown
                  label="Top run scorer"
                  data={players}
                  value={topRunScorer}
                  onSelect={setTopRunScorer}
                  disabled={playersLoading || players.length === 0}
                />

                <Text style={styles.label}>Highest team total (runs)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={highestRuns}
                  onChangeText={setHighestRuns}
                  placeholder="e.g. 180"
                  placeholderTextColor="#6b7280"  // ADD THIS LINE
                />

                <Text style={styles.label}>Powerplay runs</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={powerplayRuns}
                  onChangeText={setPowerplayRuns}
                  placeholder="e.g. 55"
                  placeholderTextColor="#6b7280"  // ADD THIS LINE
                />

                <Text style={styles.label}>Total wickets in match</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={totalWickets}
                  onChangeText={setTotalWickets}
                  placeholder="e.g. 12"
                  placeholderTextColor="#6b7280"  // ADD THIS LINE
                />

                {/* X-Factors */}
                <View style={{ marginTop: 12, marginBottom: 8 }}>
                  <TouchableOpacity
                    onPress={openXfModal}
                    disabled={selectedMatch.status === "completed"}
                  >
                    <Text style={styles.linkText}>+ Add X-Factor</Text>
                  </TouchableOpacity>

                  {xFactors.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.label}>X-Factors added</Text>
                      {xFactors.map((xf, index) => (
                        <View key={index} style={styles.xfRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.xfTitle}>
                              [{xf.risk}] {xf.condition_label}
                            </Text>
                            <Text style={styles.xfDescription}>
                              Player: {xf.player_name}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleRemoveXFactor(index)}
                          >
                            <Text style={styles.xfRemove}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {playersLoading && (
                  <ActivityIndicator color="#60a5fa" style={{ marginVertical: 8 }} />
                )}

                {!playersLoading && players.length === 0 && (
                  <Text style={{ color: "#aaa", fontSize: 12 }}>
                    Players not available for this match
                  </Text>
                )}



                {predictionLoading ? (
                  <ActivityIndicator />
                ) : (
                  <Button
                    title="Submit prediction"
                    onPress={handleSubmitPrediction}
                  />
                )}

                {predictionMessage ? (
                  <Text
                    style={
                      predictionMessage.includes("✅")
                        ? styles.okText
                        : styles.errorText
                    }
                  >
                    {predictionMessage}
                  </Text>
                ) : null}

                {/* ORIGINAL FORM ENDS HERE */}
              </>
            )}
          </View>


          <View style={styles.card}>
            <Button
              title="Back to matches"
              onPress={() => {
                setSelectedMatch(null);
                resetPredictionForm();
                setPlayersError("");
              }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Logged in, no match selected: show matches list (upcoming + completed)
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Indian Prediction League</Text>
      <Text style={styles.subtitle}>brought to you by Saumya Awasthi</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Matches</Text>
        <Button title="Load matches" onPress={handleLoadMatches} />

        {matchesLoading && <ActivityIndicator />}

        {matchesError ? (
          <Text style={styles.errorText}>{matchesError}</Text>
        ) : null}

        {/* Upcoming section */}
        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
          Upcoming Matches
        </Text>
        {upcomingMatches.length === 0 && !matchesLoading ? (
          <Text style={styles.emptyText}>No upcoming matches.</Text>
        ) : (
          <FlatList
            data={upcomingMatches}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelectMatch(item)}
                style={styles.matchCard}
              >
                <Text style={styles.matchTeams}>
                  {item.home_team} vs {item.away_team}
                </Text>
                <Text style={styles.matchInfo}>Venue: {item.venue}</Text>
                <Text style={styles.matchInfo}>
                  Starts at: {new Date(item.start_time).toLocaleString()}
                </Text>
                <Text style={styles.matchStatus}>Status: {item.status}</Text>
                <Text style={styles.tapHint}>Tap to predict</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Completed section */}
        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
          Completed Matches
        </Text>
        {completedMatches.length === 0 && !matchesLoading ? (
          <Text style={styles.emptyText}>No completed matches yet.</Text>
        ) : (
          <FlatList
            data={completedMatches}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelectMatch(item)}
                style={styles.matchCard}
              >
                <Text style={styles.matchTeams}>
                  {item.home_team} vs {item.away_team}
                </Text>
                <Text style={styles.matchInfo}>Venue: {item.venue}</Text>
                <Text style={styles.matchInfo}>
                  Started at: {new Date(item.start_time).toLocaleString()}
                </Text>
                <Text style={styles.matchStatus}>Status: {item.status}</Text>
                <Text style={styles.tapHint}>Tap to view your points</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
      <View style={styles.card}>
        <Button title="Logout" onPress={logout} />
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
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#111827",
    color: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  label: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 4,
    marginTop: 6,
  },
  errorText: {
    color: "#fca5a5",
    marginTop: 8,
  },
  okText: {
    color: "#bbf7d0",
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
  readonlyValue: {
    fontSize: 14,
    color: "#e5e7eb",
    marginBottom: 6,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fbbf24",
    marginTop: 8,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  linkText: {
    color: "#60a5fa",
    fontSize: 13,
    marginTop: 4,
  },
  xfRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  xfTitle: {
    fontSize: 13,
    color: "#e5e7eb",
  },
  xfDescription: {
    fontSize: 11,
    color: "#9ca3af",
  },
  xfRemove: {
    fontSize: 12,
    color: "#fca5a5",
    marginLeft: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 16,
    width: "100%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 10,
    marginBottom: 4,
  },
  modalHint: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
  },
  modalChipRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  modalChipColumn: {
    marginBottom: 4,
  },
  modalChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4b5563",
    marginRight: 8,
    backgroundColor: "#020617",
  },
  modalChipFull: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4b5563",
    backgroundColor: "#020617",
    marginBottom: 6,
  },
  modalChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  modalChipText: {
    fontSize: 13,
    color: "#e5e7eb",
  },
  modalChipTextActive: {
    color: "#f9fafb",
    fontWeight: "600",
  },
  modalInput: {
    backgroundColor: "#020617",
    color: "#e5e7eb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4b5563",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
  },
  modalButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#2563eb",
    marginLeft: 8,
  },
  modalButtonDisabled: {
    backgroundColor: "#1d4ed8",
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 13,
    color: "#f9fafb",
    fontWeight: "600",
  },
  modalButtonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#4b5563",
  },
  modalButtonTextSecondary: {
    fontSize: 13,
    color: "#e5e7eb",
  },
  modalPlayerList: {
    marginTop: 4,
  },
});
