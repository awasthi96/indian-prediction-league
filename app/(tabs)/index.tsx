// app/(tabs)/index.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  Pressable, 
  Alert,
  BackHandler,
  KeyboardAvoidingView,
} from "react-native";
import { api } from "@/api/api";
import PlayerDropdown from "@/components/PlayerDropdown";
import TeamDropdown from "@/components/TeamDropdown";
import { useLogout } from "@/auth/logout";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "expo-router";


const XF_RISK_OPTIONS = [
  { id: "LOW", label: "Low" },
  { id: "MEDIUM", label: "Medium" },
  { id: "HIGH", label: "High" },
];

type ScoringMeta = {
  toss_winner: { correct: number };
  match_winner: { correct: number };
  top_wicket_taker: { correct: number };
  top_run_scorer: { correct: number };
  highest_run_scored: { correct: number };
  powerplay_runs: { correct: number };
  total_wickets: { correct: number };
  x_factor: {
    LOW: { correct: number; wrong: number };
    MEDIUM: { correct: number; wrong: number };
    HIGH: { correct: number; wrong: number };
  };
};

const PredictionResultRow = React.memo(({ label, predicted, actual, showActuals}) => (
  <View style={styles.resultRow}>
    <View style={styles.resultLeft}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.readonlyValue}>You: {predicted ?? "-"}</Text>
    </View>

    {showActuals && (
      <View style={styles.resultRight}>
        <Text style={styles.readonlyValue}>Result: {actual ?? "-"}</Text>
      </View>
    )}
  </View>
));

const ReadonlyPredictionRow = React.memo(({ label, value }) => (
  <View style={styles.resultRow}>
    <View style={styles.resultLeft}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.readonlyValue}>{value ?? "-"}</Text>
    </View>
  </View>
));

const PredictionField = React.memo(({ label, maxPoints, children }) => (
  <View style={{ marginBottom: 14 }}>
    <View style={styles.predictionHeader}>
      <Text style={styles.predictionLabel}>{label}</Text>
      <Text style={styles.pointsHint}>Max points: +{maxPoints}</Text>
    </View>
    {children}
  </View>
));


export default function App() {
  const logout = useLogout();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming");

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
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionMessage, setPredictionMessage] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  const [players, setPlayers] = useState<string[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState("");

  // Existing prediction
  const [myPrediction, setMyPrediction] = useState<any | null>(null);

  // X-factor list for this prediction
  const [xFactors, setXFactors] = useState<any[] >([]);
  const [xfactorDefs, setXfactorDefs] = useState<any[]>([]);
  const xfactorsByRisk = useMemo(() => {
    return xfactorDefs.reduce((acc, xf) => {
      acc[xf.risk] = acc[xf.risk] || [];
      acc[xf.risk].push(xf);
      return acc;
    }, {} as Record<string, any[]>);
  }, [xfactorDefs]);

  const xfDefById = useMemo(() => {
    const map: Record<string, any> = {};
    xfactorDefs.forEach((xf) => {
      map[xf.id] = xf;
    });
    return map;
  }, [xfactorDefs]);

  // Modal visibility
  const [xfModalVisible, setXfModalVisible] = useState(false);

  // Modal draft fields
  const [xfRisk, setXfRisk] = useState<string | null>(null);
  const [xfCondition, setXfCondition] = useState<{
    id: string;
    category: string;
    description: string;
  } | null>(null);
  const [xfPlayer, setXfPlayer] = useState<string>("");
  const [warning, setWarning] = useState<string | null>(null);

  const showActuals = selectedMatch?.status === "completed";
  
  const [scoringMeta, setScoringMeta] = useState<ScoringMeta | null>(null);

  const actualXFactors = selectedMatch?.actual_x_factors || [];

  const isCompleted = selectedMatch?.status === "completed";
  const hasPrediction = !!myPrediction;

  const [isEditMode, setIsEditMode] = useState(false);

  const validationTimeoutRef = useRef<NodeJS.Timeout>();

  const validatePredictionDebounced = useCallback((runs: string, wickets: string) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    validationTimeoutRef.current = setTimeout(() => {
      let warnings: string[] = [];
      const wicketsNum = Number(wickets);
      const runsNum = Number(runs);

      if (!isNaN(wicketsNum) && wicketsNum > 20) {
        warnings.push("Wickets greater than 20 is unusual");
      }
      if (!isNaN(runsNum) && runsNum > 500) {
        warnings.push("Runs greater than 500 is unrealistic");
      }

      setWarning(warnings.length ? warnings.join(" • ") : null);
    }, 500); // Validate after 500ms of no typing
  }, []);

  const handleSelectMatch = useCallback((match: any) => {
    setSelectedMatch(match);
    setIsEditMode(false);
    setPredictionLoading(false);
    setXfModalVisible(false);
    resetPredictionForm();
    setWarning("");
  }, []);

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
    setWarning("");
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

  const handleAddXfFromModal = useCallback(() => {
    if (!xfRisk || !xfCondition || !xfPlayer.trim()) {
      setPredictionMessage("Please select risk, condition and player.");
      return;
    }

    setXFactors((prev) => [
      ...prev,
      {
        xf_id: xfCondition.id,
        risk: xfRisk,
        condition_label: xfCondition.description,
        player_name: xfPlayer.trim(),
      },
    ]);

    // reset draft + close modal
    setXfRisk(null);
    setXfCondition(null);
    setXfPlayer("");
    setXfModalVisible(false);
  }, [xfRisk, xfCondition, xfPlayer]);

  const handleRemoveXFactor = useCallback((index: number) => {
    setXFactors((prev) => prev.filter((_, i) => i !== index));
  },[]);
  
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (selectedMatch) {
            // Go back to matches instead of exiting app
            setSelectedMatch(null);
            resetPredictionForm();
            setPlayersError("");
            setWarning("");
            return true; // ⛔ prevent app exit
          }

          return false; // allow default (exit app)
        }
      );

      return () => subscription.remove();
    }, [selectedMatch, resetPredictionForm])
  );

  useEffect(() => {
    api.getXFactors()
      .then(setXfactorDefs)
      .catch(console.error);
  }, []);
  
  useEffect(() => {
    handleLoadMatches();
  }, []);

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

    setTossWinner(myPrediction.toss_winner || "");
    setMatchWinner(myPrediction.match_winner || "");
    setTopRunScorer(myPrediction.top_run_scorer || "");
    setTopWicketTaker(myPrediction.top_wicket_taker || "");
    setHighestRuns(myPrediction.highest_run_scored?.toString() || "");
    setPowerplayRuns(myPrediction.powerplay_runs?.toString() || "");
    setTotalWickets(myPrediction.total_wickets?.toString() || "");
    setXFactors(myPrediction.x_factors || []);
  }, [myPrediction]);

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
    api.getScoringMeta()
      .then(data =>{
        setScoringMeta(data);
      })
      .catch(err => {
        console.error("Failed to load scoring meta", err);
      });
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

  const handleSubmitPrediction = async () => {
    if (!selectedMatch) return;

    if (!tossWinner || !matchWinner) {
      setPredictionMessage("Please choose Toss Winner and Match Winner.");
      return;
    }


    const payload = {
      toss_winner: tossWinner,
      match_winner: matchWinner,
      top_wicket_taker: topWicketTaker,
      top_run_scorer: topRunScorer,
      highest_run_scored: highestRuns!== "" ? Number(highestRuns) : null,
      powerplay_runs: powerplayRuns!== "" ? Number(powerplayRuns) : null,
      total_wickets: totalWickets !== "" ? Number(totalWickets) : null,
      x_factors: xFactors.map((xf) => ({
        xf_id: xf.xf_id,
        player_name: xf.player_name,
      })),
    };

    setPredictionLoading(true);
    setPredictionMessage("");

    try {
      const prediction = isEditMode
        ? await api.updatePrediction(selectedMatch.id, payload)
        : await api.submitPrediction(selectedMatch.id, payload);

      setMyPrediction(prediction); // store what backend returns
      setIsEditMode(false);
      setPredictionMessage("Prediction submitted ✅");
    } catch (e: any) {
      const msg =
        typeof e.message === "string"
          ? e.message
          : e.message?.msg
          ? e.message.msg
          : "Prediction failed";

      setPredictionMessage(msg);
    } finally {
      setPredictionLoading(false);
    }
  };

  const canEdit = !isCompleted && hasPrediction;
  const showForm = !isCompleted && (!hasPrediction || isEditMode);

  // ---------- UI RENDERING ----------

  // X-Factor modal UI (stays mounted, controlled by state)
  const renderXfModal = useMemo(() => (
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
          <Text style={styles.modalLabel}>1. Risk (+correct/-wrong)</Text>
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
                  {scoringMeta?.x_factor?.[r.id] && 
                  ` (+${scoringMeta.x_factor[r.id].correct}/${scoringMeta.x_factor[r.id].wrong})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalDivider} />

          {/* Condition */}
          <Text style={styles.modalLabel}>2. Condition</Text>
          {!xfRisk ? (
            <Text style={styles.modalHint}>Select risk first.</Text>
          ) : (
            <View style={styles.modalChipColumn}>
              {(xfactorsByRisk[xfRisk]||[]).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.modalChipFull,
                    xfCondition?.id === c.id && styles.modalChipActive,
                  ]}
                  onPress={() =>
                    setXfCondition({
                      id: c.id,
                      category: c.category,
                      description: c.description,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.modalChipText,
                      xfCondition?.id === c.id && styles.modalChipTextActive,
                    ]}
                  >
                    {c.description}
                  </Text>
                  <Text style={styles.modalHint}>{c.category}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.modalDivider} />

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
                <ScrollView 
                  style={styles.modalPlayerScrollView}
                  keyboardShouldPersistTaps="handled"
                >
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
  ), [xfModalVisible, xfRisk, xfCondition, xfPlayer, players, playersLoading, playersError, scoringMeta, xfactorsByRisk,closeXfModal, handleAddXfFromModal]);

  // If match selected: show match detail + prediction form
  if (selectedMatch) {
    return (
      <SafeAreaView style={styles.container}>
        {renderXfModal}
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Match Prediction</Text>
            <Text style={styles.subtitle}>
              {selectedMatch.home_team} vs {selectedMatch.away_team}
            </Text>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Match Info</Text>
              <Text style={styles.matchInfo}>Venue: {selectedMatch.venue}</Text>
              <Text style={styles.matchInfo}>
                Starts at: {new Date(selectedMatch.start_time).toLocaleString()}
              </Text>
              <Text style={styles.matchStatus}>
                Status: {selectedMatch.status}
              </Text>
            </View>
          
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {isCompleted 
                  ? "Match Result" 
                  : hasPrediction && !isEditMode 
                  ? "Your Prediction (Locked)"
                  : "Your Prediction"}
              </Text>

              {predictionLoading ? (
                <ActivityIndicator />
              ) : isCompleted ? (
                <>
                  {!hasPrediction && (
                    <Text style={styles.warningText}>
                      You did not make a prediction for this match.
                    </Text>
                  )}

                  {hasPrediction && (
                    <Text style={styles.okText}>
                      You have already submitted a prediction for this match.
                    </Text>
                  )}
                

                  {/* If match is completed and points exist, show total points */}
                  {isCompleted &&
                    hasPrediction &&
                    myPrediction.points_earned !== null &&
                    myPrediction.points_earned !== undefined && (
                      <Text style={styles.pointsText}>
                        Total points: {myPrediction.points_earned}
                      </Text>
                    )
                  }
              
                  <PredictionResultRow
                    label="Toss winner"
                    predicted={hasPrediction ? myPrediction.toss_winner : "-"}
                    actual={selectedMatch?.actual_toss_winner ?? "-"}
                    showActuals={showActuals}
                  />
                  <PredictionResultRow
                    label="Match winner"
                    predicted={hasPrediction ? myPrediction.match_winner : "-"}
                    actual={selectedMatch?.actual_match_winner ?? "-"}
                    showActuals={showActuals}
                  />
                  <View style={styles.resultRow}>
                    <View style={styles.resultLeft}>
                      <Text style={styles.label}>Top wicket taker</Text>
                      <Text style={styles.readonlyValue}>
                        You: {hasPrediction ? myPrediction.top_wicket_taker : "-"}
                      </Text>
                    </View>
                  
                    {showActuals && (
                      <View style={styles.resultRight}>
                        <Text style={styles.label}>Result</Text>

                        {(selectedMatch?.actual_top_wicket_taker || "")
                          .split(",")
                          .map((name: string, idx: number) => (
                            <Text key={idx} style={styles.readonlyValue}>
                              • {name.trim()}
                            </Text>
                          ))}
                      </View>
                    )}
                  </View>

                  <PredictionResultRow
                    label="Top run scorer"
                    predicted={hasPrediction ? myPrediction.top_run_scorer : "-"}
                    actual={selectedMatch?.actual_top_run_scorer ?? "-"}
                    showActuals={showActuals}
                  />
                  <PredictionResultRow
                    label="Highest run total"
                    predicted={hasPrediction ? myPrediction.highest_run_scored : "-"}
                    actual={selectedMatch?.actual_highest_run_scored ?? "-"}
                    showActuals={showActuals}
                  />
                  <PredictionResultRow
                    label="Highest powerplay run total"
                    predicted={hasPrediction ? myPrediction.powerplay_runs : "-"}
                    actual={selectedMatch?.actual_powerplay_runs ?? "-"}
                    showActuals={showActuals}
                  />
                  <PredictionResultRow
                    label="Total wickets"
                    predicted={hasPrediction ? myPrediction.total_wickets : "-"}
                    actual={selectedMatch?.actual_total_wickets ?? "-"}
                    showActuals={showActuals}
                  />

                  {/*X-Factors */}
                  {(myPrediction?.x_factors?.length > 0 ||
                    (showActuals && actualXFactors.length > 0)) && (
                    <View style={styles.xfactorContainer}>
                      <Text style={styles.sectionTitle}>X-Factors</Text>
                      <View style={styles.xfactorRow}>
                        <View style={styles.xfactorColumn}>
                          <Text style={styles.label}>Your X-Factors</Text>

                          {myPrediction?.x_factors?.length > 0 ? (
                            myPrediction.x_factors.map((xf: any, index: number) => {
                              const def = xfDefById[xf.xf_id];

                              return (
                                <Text
                                  key={index}
                                  style={styles.xfResult}
                                  numberOfLines={2}
                                  ellipsizeMode="tail"
                                >
                                  • {xf.player_name || "-"}{" "}
                                  {def?.description ?? "X-Factor condition"}
                                </Text>
                              );
                            })
                          ) : (
                            <Text style={styles.emptyText}>No X-Factors predicted</Text>
                          )}
                        </View>
                        <View style={styles.xfactorColumn}>
                          <Text style={styles.label}>Match X-Factors</Text>
                        
                          {showActuals && actualXFactors.length > 0 ? (
                            actualXFactors.map((xf: any, index: number) => {
                              const def = xfDefById[xf.xf_id];

                              return (
                                <Text
                                  key={index}
                                  style={styles.xfResult}
                                  numberOfLines={2}
                                  ellipsizeMode="tail"
                                >
                                  • {xf.player_name || "-"}{" "}
                                    {def?.result_description ??
                                    def?.description ??
                                    "X-Factor impact"}
                                </Text>
                              );
                            })
                          ) : (
                            <Text style={styles.emptyText}>Results not available</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  )}
                </>
              ) : hasPrediction && !isEditMode ? (
                //Upcoming + Already Predicted -> Read-Only View
                <>
                  <Text style={styles.okText}>
                    You have already submitted a prediction for this match.
                  </Text>
                  {/* READ-ONLY SUMMARY */}
                    <ReadonlyPredictionRow label="Toss winner" value={myPrediction.toss_winner} />
                    <ReadonlyPredictionRow label="Match winner" value={myPrediction.match_winner} />
                    <ReadonlyPredictionRow label="Top wicket taker" value={myPrediction.top_wicket_taker} />
                    <ReadonlyPredictionRow label="Top run scorer" value={myPrediction.top_run_scorer} />
                    <ReadonlyPredictionRow label="Highest team total" value={myPrediction.highest_run_scored}/>
                    <ReadonlyPredictionRow label="Powerplay runs" value={myPrediction.powerplay_runs} />
                    <ReadonlyPredictionRow label="Total wickets" value={myPrediction.total_wickets} />
                  
                    {/* READ-ONLY X-FACTORS (single column, concise) */}
                    {myPrediction?.x_factors?.length > 0 && (
                      <View style={styles.xfactorReadonlyContainer}>
                        <Text style={styles.label}>X-Factors</Text>
                        {myPrediction.x_factors.map((xf, idx) => {
                          const def = xfDefById[xf.xf_id];
                          return (
                            <Text key={idx} style={styles.xfResult} numberOfLines={2}>
                              • {xf.player_name} {def?.description ?? ""}
                            </Text>
                          );
                        })}
                      </View>
                    )}
                  
                    <View style={styles.editButtonContainer}>
                      <Button title="Edit prediction" onPress={() => setIsEditMode(true)} />
                    </View>
                </>
              ) : showForm ? (
                <>                
                  {/* PREDICTION FORM */}
                  <PredictionField
                    label="Toss winner"
                    maxPoints={scoringMeta?.toss_winner?.correct}
                  >
                    <TeamDropdown
                      options={[selectedMatch.home_team, selectedMatch.away_team]}
                      value={tossWinner}
                      onSelect={setTossWinner}
                      placeholder="Select team"
                    />
                  </PredictionField>

                  <PredictionField
                    label="Match winner"
                    maxPoints={scoringMeta?.match_winner?.correct}
                  >
                    <TeamDropdown
                      options={[selectedMatch.home_team, selectedMatch.away_team]}
                      value={matchWinner}
                      onSelect={setMatchWinner}
                      placeholder="Select team"
                    />
                  </PredictionField>

                  <PredictionField
                    label="Top wicket taker"
                    maxPoints={scoringMeta?.top_wicket_taker?.correct}
                  >
                    <PlayerDropdown
                      data={players}
                      value={topWicketTaker}
                      onSelect={setTopWicketTaker}
                      disabled={playersLoading || players.length === 0}
                    />
                  </PredictionField>

                  <PredictionField
                    label="Top run scorer"
                    maxPoints={scoringMeta?.top_run_scorer?.correct}
                  >
                    <PlayerDropdown
                      data={players}
                      value={topRunScorer}
                      onSelect={setTopRunScorer}
                      disabled={playersLoading || players.length === 0}
                    />
                  </PredictionField>

                  <PredictionField
                    label="Highest team total (runs)"
                    maxPoints={scoringMeta?.highest_run_scored?.correct}
                  >
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={highestRuns}
                      onChangeText={(v) => {
                        if (/^\d*$/.test(v)) {
                          setHighestRuns(v);
                          validatePredictionDebounced(v, totalWickets);
                        }
                      }}
                      placeholder="e.g. 180"
                      placeholderTextColor="#6b7280"
                    />
                  </PredictionField>

                  <PredictionField
                    label="Highest powerplay total"
                    maxPoints={scoringMeta?.powerplay_runs?.correct}
                  >
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={powerplayRuns}
                      onChangeText={(v) => {
                        if (/^\d*$/.test(v)) setPowerplayRuns(v);
                      }}
                      placeholder="e.g. 55"
                      placeholderTextColor="#6b7280"
                    />
                  </PredictionField>

                  <PredictionField
                    label="Total fall of wickets in match"
                    maxPoints={scoringMeta?.total_wickets?.correct}
                  >
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={totalWickets}
                      onChangeText={(v) => {
                        if (/^\d*$/.test(v)) {
                          setTotalWickets(v);
                          validatePredictionDebounced(highestRuns, v);
                        } 
                      }}
                      placeholder="e.g. 12"
                      placeholderTextColor="#6b7280"
                    />
                  </PredictionField>                                    
                

                  {/* X-Factors */}
                  <View style={styles.xfactorAddContainer}>
                    <TouchableOpacity
                      onPress={openXfModal}
                      disabled={isCompleted || (hasPrediction && !isEditMode)}
                    >
                      <Text style={styles.linkText}>+ Add X-Factor</Text>
                    </TouchableOpacity>

                    {xFactors.length > 0 && (
                      <View style={styles.xfactorListContainer}>
                        <Text style={styles.label}>X-Factors added</Text>
                        {xFactors.map((xf, index) => (
                          <View key={index} style={styles.xfRow}>
                            <View style={styles.xfRowContent}>
                              <Text style={styles.xfTitle}>
                                {xf.player_name} {xfDefById[xf.xf_id].description}
                              </Text>
                              <Text style={styles.xfDescription}>
                                Risk: {xfDefById[xf.xf_id].risk}
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
                    <ActivityIndicator
                      color="#60a5fa"
                      style={styles.loadingIndicator}
                    />
                  )}

                  {!playersLoading && players.length === 0 && (
                    <Text style={styles.noPlayersText}>
                      Players not available for this match
                    </Text>
                  )}
                  <View style={styles.warningContainer}>    
                    {warning && (
                      <Text style={styles.warningText}>⚠️ {warning}</Text>
                    )}
                  </View>

                  {predictionLoading ? (
                    <ActivityIndicator />
                  ) : (
                    <Button
                      title="Submit prediction"
                      onPress={handleSubmitPrediction}
                    />
                  )}
                  <View style={styles.messageContainer}>
                    {predictionMessage ? (
                      <Text style={predictionMessage.includes("✅") ? styles.okText : styles.errorText}>
                        {String(predictionMessage)}
                      </Text>
                    ):null}
                  </View>
                </>
              ) : null}
            </View>

            <View style={styles.card}>
              <Button
                title="Back to matches"
                onPress={() => {
                  setSelectedMatch(null);
                  resetPredictionForm();
                  setPlayersError("");
                  setWarning("");
                }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // No match selected: show matches list (upcoming + completed)
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
              onPress={() => handleSelectMatch(item)}
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
  xfRowContent:{
    flex: 1,
  },
  xfTitle: {
    fontSize: 13,
    color: "#e5e7eb",
  },
  xfDescription: {
    fontSize: 11,
    color: "#9ca3af",
  },
  xfResult: {
    fontSize: 13,
    color: "#e5e7eb",
    marginTop: 4,
    fontWeight: 400,
  },
  xfRemove: {
    fontSize: 12,
    color: "#fca5a5",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    width: "100%",
  },
  modalTitle: {
    fontSize: 16,
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
    backgroundColor: "#111827",
  },
  modalChipFull: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4b5563",
    backgroundColor: "#111827",
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
    backgroundColor: "#111827",
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
  modalPlayerScrollView: {
    maxHeight: 200,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#374151",
    marginVertical: 8,
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
  warningText: {
    color: "#fbbf24",
    fontSize: 12,
    marginBottom: 8,
  },
  resultRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  resultLeft: {
    flex: 1,
  },
  resultRight: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  pointsHint: {
    fontSize: 12,
    color: "#94a3b8",
  },
  predictionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  predictionLabel: {
    fontSize: 13,
    color: "#cbd5e1",
    fontWeight: "500",
  },
  predictionFieldContainer: {
    marginBottom: 14,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 24,
  },
  logoutButton: {
    marginRight: 16,
  },
  xfactorContainer: {
    marginTop: 12,
  },
  xfactorRow: {
    flexDirection: "row",
    gap: 12,
  },
  xfactorColumn: {
    flex: 1,
  },
  xfactorReadonlyContainer: {
    marginTop: 8,
  },
  editButtonContainer: {
    marginTop: 8,
  },
  xfactorAddContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  xfactorListContainer: {
    marginTop: 8,
  },
  loadingIndicator: {
    marginVertical: 8,
  },
  noPlayersText: {
    color: "#aaa",
    fontSize: 12,
  },
  warningContainer: {
    minHeight: 20,
  },
  messageContainer: {
    minHeight: 20,
  },
});