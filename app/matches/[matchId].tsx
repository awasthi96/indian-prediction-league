import { useLocalSearchParams, router, Stack } from "expo-router";
import { api } from "@/api/api";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  StatusBar,
  Platform,
  SectionList,
  KeyboardAvoidingView,
} from "react-native";
import PlayerDropdown from "@/components/PlayerDropdown";
import TeamDropdown from "@/components/TeamDropdown";

// ... (Keep XF_RISK_OPTIONS, ScoringMeta, Helper Components exactly as they were) ...
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

const PredictionResultRow = React.memo(({ label, predicted, actual, showActuals }: any) => (
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

const ReadonlyPredictionRow = React.memo(({ label, value }: any) => (
  <View style={styles.resultRow}>
    <View style={styles.resultLeft}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.readonlyValue}>{value ?? "-"}</Text>
    </View>
  </View>
));

const PredictionField = React.memo(({ label, maxPoints, children }: any) => (
  <View style={{ marginBottom: 14 }}>
    <View style={styles.predictionHeader}>
      <Text style={styles.predictionLabel}>{label}</Text>
      <Text style={styles.pointsHint}>Max points: +{maxPoints}</Text>
    </View>
    {children}
  </View>
));

export default function MatchPredictionScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  // ... (Keep all state variables exactly as they were) ...
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tossWinner, setTossWinner] = useState("");
  const [matchWinner, setMatchWinner] = useState("");
  const [topWicketTaker, setTopWicketTaker] = useState("");
  const [topRunScorer, setTopRunScorer] = useState("");
  const [highestRuns, setHighestRuns] = useState("");
  const [powerplayRuns, setPowerplayRuns] = useState("");
  const [totalWickets, setTotalWickets] = useState("");
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionMessage, setPredictionMessage] = useState("");
  const [playerSections, setPlayerSections] = useState<{ title: string; data: string[] }[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState("");
  const [myPrediction, setMyPrediction] = useState<any | null>(null);
  const [xFactors, setXFactors] = useState<any[]>([]);
  const [xfactorDefs, setXfactorDefs] = useState<any[]>([]);
  const [xfModalVisible, setXfModalVisible] = useState(false);
  const [xfRisk, setXfRisk] = useState<string | null>(null);
  const [xfCondition, setXfCondition] = useState<{ id: string; category: string; description: string; } | null>(null);
  const [xfPlayer, setXfPlayer] = useState<string>("");
  const [warning, setWarning] = useState<string | null>(null);
  const [scoringMeta, setScoringMeta] = useState<ScoringMeta | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const showActuals = match?.status === "completed";
  const actualXFactors = match?.actual_x_factors || [];
  const isCompleted = match?.status === "completed";
  const hasPrediction = !!myPrediction;
  const showForm = !isCompleted && (!hasPrediction || isEditMode);

  // ... (Keep useMemo and useCallback hooks exactly as they were) ...
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

  const validationTimeoutRef = useRef<NodeJS.Timeout>();
  const validatePredictionDebounced = useCallback((runs: string, wickets: string) => {
      if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = setTimeout(() => {
        let warnings: string[] = [];
        const wicketsNum = Number(wickets);
        const runsNum = Number(runs);
        if (!isNaN(wicketsNum) && wicketsNum > 20) warnings.push("Wickets > 20 is unusual");
        if (!isNaN(runsNum) && runsNum > 500) warnings.push("Runs > 500 is unrealistic");
        setWarning(warnings.length ? warnings.join(" • ") : null);
      }, 500);
    }, []);

  const openXfModal = () => { setXfModalVisible(true); setXfRisk(null); setXfCondition(null); setXfPlayer(""); setPredictionMessage(""); };
  const closeXfModal = () => setXfModalVisible(false);
  const handleAddXfFromModal = useCallback(() => {
    if (!xfRisk || !xfCondition || !xfPlayer.trim()) { setPredictionMessage("Please select risk, condition and player."); return; }
    setXFactors((prev) => [...prev, { xf_id: xfCondition.id, risk: xfRisk, condition_label: xfCondition.description, player_name: xfPlayer.trim() }]);
    setXfRisk(null); setXfCondition(null); setXfPlayer(""); setXfModalVisible(false);
  }, [xfRisk, xfCondition, xfPlayer]);
  const handleRemoveXFactor = useCallback((index: number) => { setXFactors((prev) => prev.filter((_, i) => i !== index)); }, []);

  // ... (Keep API useEffects exactly as they were) ...
  useEffect(() => { api.getXFactors().then(setXfactorDefs).catch(console.error); }, []);
  useEffect(() => {
    if (!matchId) return;
    setPlayersLoading(true);
    api.getMatchPlayers(matchId).then((res: any) => {
        if (Array.isArray(res) && res.length > 0 && res[0].data) setPlayerSections(res);
        else setPlayerSections([{ title: "Players", data: res }]);
      }).catch(() => { setPlayerSections([]); setPlayersError("No players available for this match"); }).finally(() => setPlayersLoading(false));
  }, [matchId]);
  useEffect(() => {
    if (!matchId) return;
    setPredictionLoading(true);
    api.getMyPrediction(matchId).then(setMyPrediction).catch((err) => { if (err.status !== 404) console.error(err); }).finally(() => setPredictionLoading(false));
  }, [matchId]);
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
    if (!matchId) return;
    setLoading(true);
    api.getMatch(matchId).then(setMatch).catch(console.error).finally(() => setLoading(false));
  }, [matchId]);
  useEffect(() => { api.getScoringMeta().then(setScoringMeta).catch(console.error); }, []);

  const handleSubmitPrediction = async () => {
    if (!match) return;
    if (!tossWinner || !matchWinner) {
      setPredictionMessage("Please choose Toss Winner and Match Winner.");
      return;
    }
    const payload = {
      toss_winner: tossWinner,
      match_winner: matchWinner,
      top_wicket_taker: topWicketTaker,
      top_run_scorer: topRunScorer,
      // IMPORTANT: Backend must accept null (None) for these to be optional!
      highest_run_scored: highestRuns !== "" ? Number(highestRuns) : null,
      powerplay_runs: powerplayRuns !== "" ? Number(powerplayRuns) : null,
      total_wickets: totalWickets !== "" ? Number(totalWickets) : null,
      x_factors: xFactors.map((xf) => ({ xf_id: xf.xf_id, player_name: xf.player_name })),
    };
    setPredictionLoading(true);
    setPredictionMessage("");
    try {
      const prediction = isEditMode ? await api.updatePrediction(matchId, payload) : await api.submitPrediction(matchId, payload);
      setMyPrediction(prediction);
      setIsEditMode(false);
      setPredictionMessage("Prediction submitted ✅");
    } catch (e: any) {
      setPredictionMessage(typeof e.message === "string" ? e.message : "Prediction failed");
    } finally { setPredictionLoading(false); }
  };

  const renderXfModal = useMemo(() => (
    <Modal visible={xfModalVisible} transparent animationType="slide" onRequestClose={closeXfModal}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>X-Factor Prediction</Text>
          <Text style={styles.modalLabel}>1. Risk (+correct/-wrong)</Text>
          <View style={styles.modalChipRow}>
            {XF_RISK_OPTIONS.map((r) => (
              <TouchableOpacity key={r.id} style={[styles.modalChip, xfRisk === r.id && styles.modalChipActive]} onPress={() => { setXfRisk(r.id); setXfCondition(null); }}>
                <Text style={[styles.modalChipText, xfRisk === r.id && styles.modalChipTextActive]}>{r.label}{scoringMeta?.x_factor?.[r.id] && ` (+${scoringMeta.x_factor[r.id].correct}/${scoringMeta.x_factor[r.id].wrong})`}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalDivider} />
          <Text style={styles.modalLabel}>2. Condition</Text>
          {!xfRisk ? <Text style={styles.modalHint}>Select risk first.</Text> : (
            <View style={styles.modalChipColumn}>
              {(xfactorsByRisk[xfRisk] || []).map((c) => (
                <TouchableOpacity key={c.id} style={[styles.modalChipFull, xfCondition?.id === c.id && styles.modalChipActive]} onPress={() => setXfCondition({ id: c.id, category: c.category, description: c.description })}>
                  <Text style={[styles.modalChipText, xfCondition?.id === c.id && styles.modalChipTextActive]}>{c.description}</Text>
                  <Text style={styles.modalHint}>{c.category}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.modalDivider} />
          <Text style={styles.modalLabel}>3. Player</Text>
          {!xfCondition ? <Text style={styles.modalHint}>Select condition to choose player.</Text> : playersLoading ? <Text style={styles.modalHint}>Loading players…</Text> : playersError ? (
            <><Text style={styles.modalHint}>{playersError} Type manually:</Text><TextInput style={styles.modalInput} placeholder="Player name" placeholderTextColor="#6b7280" value={xfPlayer} onChangeText={setXfPlayer} /></>
          ) : (
            <>
              {xfPlayer ? <Text style={styles.modalHint}>Selected: {xfPlayer}</Text> : <Text style={styles.modalHint}>Tap a player to select.</Text>}
              <View style={styles.modalPlayerList}>
                <SectionList sections={playerSections} keyExtractor={(item, i) => item + i} style={{ maxHeight: 200 }} renderSectionHeader={({ section: { title } }) => <Text style={styles.modalSectionHeader}>{title}</Text>} renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.modalChipFull, xfPlayer === item && styles.modalChipActive]} onPress={() => setXfPlayer(item)}>
                      <Text style={[styles.modalChipText, xfPlayer === item && styles.modalChipTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  )} />
              </View>
            </>
          )}
          <View style={styles.modalButtonsRow}>
            <TouchableOpacity style={[styles.modalButton, styles.modalButtonSecondary]} onPress={closeXfModal}><Text style={styles.modalButtonTextSecondary}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, (!xfRisk || !xfCondition || !xfPlayer.trim()) && styles.modalButtonDisabled]} disabled={!xfRisk || !xfCondition || !xfPlayer.trim()} onPress={handleAddXfFromModal}><Text style={styles.modalButtonText}>Add</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  ), [xfModalVisible, xfRisk, xfCondition, xfPlayer, playerSections, playersLoading, playersError, scoringMeta, xfactorsByRisk, closeXfModal, handleAddXfFromModal]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {renderXfModal}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : match ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView}>
          <ScrollView contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Match Prediction</Text>
            <Text style={styles.subtitle}>{match.home_team} vs {match.away_team}</Text>

            <View style={styles.bannerContainer}>
              <View style={styles.bannerRow}>
                <Text style={styles.bannerTeam}>{match.home_team}</Text>
                <View style={styles.bannerCenter}>
                  <Text style={styles.vsText}>VS</Text>
                  <Text style={styles.venueBanner}>{match.venue}</Text>
                </View>
                <Text style={styles.bannerTeam}>{match.away_team}</Text>
              </View>
              <View style={styles.bannerFooter}>
                <Text style={styles.footerText}>{new Date(match.start_time).toLocaleString()}</Text>
                <Text style={styles.footerText}>Status: {match.status}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{isCompleted ? "Match Result" : hasPrediction && !isEditMode ? "Your Prediction (Locked)" : "Your Prediction"}</Text>

              {predictionLoading ? (
                <ActivityIndicator />
              ) : isCompleted ? (
                // ... (Keep Read-Only Result Logic) ...
                <>
                  {!hasPrediction && <Text style={styles.warningText}>You did not make a prediction for this match.</Text>}
                  {hasPrediction && <Text style={styles.okText}>You have already submitted a prediction for this match.</Text>}
                  {hasPrediction && myPrediction.points_earned !== null && <Text style={styles.pointsText}>Total points: {myPrediction.points_earned}</Text>}
                  <PredictionResultRow label="Toss winner" predicted={hasPrediction ? myPrediction.toss_winner : "-"} actual={match?.actual_toss_winner ?? "-"} showActuals={showActuals} />
                  <PredictionResultRow label="Match winner" predicted={hasPrediction ? myPrediction.match_winner : "-"} actual={match?.actual_match_winner ?? "-"} showActuals={showActuals} />
                  <View style={styles.resultRow}>
                    <View style={styles.resultLeft}><Text style={styles.label}>Top wicket taker</Text><Text style={styles.readonlyValue}>You: {hasPrediction ? myPrediction.top_wicket_taker : "-"}</Text></View>
                    {showActuals && <View style={styles.resultRight}><Text style={styles.label}>Result</Text>{(match?.actual_top_wicket_taker || "").split(",").map((n: string, i: number) => <Text key={i} style={styles.readonlyValue}>{n.trim()}</Text>)}</View>}
                  </View>
                  <PredictionResultRow label="Top run scorer" predicted={hasPrediction ? myPrediction.top_run_scorer : "-"} actual={match?.actual_top_run_scorer ?? "-"} showActuals={showActuals} />
                  <PredictionResultRow label="Highest run total" predicted={hasPrediction ? myPrediction.highest_run_scored : "-"} actual={match?.actual_highest_run_scored ?? "-"} showActuals={showActuals} />
                  <PredictionResultRow label="Highest powerplay run total" predicted={hasPrediction ? myPrediction.powerplay_runs : "-"} actual={match?.actual_powerplay_runs ?? "-"} showActuals={showActuals} />
                  <PredictionResultRow label="Total wickets" predicted={hasPrediction ? myPrediction.total_wickets : "-"} actual={match?.actual_total_wickets ?? "-"} showActuals={showActuals} />
                  {(myPrediction?.x_factors?.length > 0 || (showActuals && actualXFactors.length > 0)) && (<View style={styles.xfactorContainer}><Text style={styles.sectionTitle}>X-Factors</Text></View>)}
                </>
              ) : hasPrediction && !isEditMode ? (
                // ... (Keep Locked Prediction Logic) ...
                <>
                  <Text style={styles.okText}>You have already submitted a prediction for this match.</Text>
                  <ReadonlyPredictionRow label="Toss winner" value={myPrediction.toss_winner} />
                  <ReadonlyPredictionRow label="Match winner" value={myPrediction.match_winner} />
                  <ReadonlyPredictionRow label="Top wicket taker" value={myPrediction.top_wicket_taker} />
                  <ReadonlyPredictionRow label="Top run scorer" value={myPrediction.top_run_scorer} />
                  <ReadonlyPredictionRow label="Highest team total" value={myPrediction.highest_run_scored}/>
                  <ReadonlyPredictionRow label="Powerplay runs" value={myPrediction.powerplay_runs} />
                  <ReadonlyPredictionRow label="Total wickets" value={myPrediction.total_wickets} />
                </>
              ) : showForm ? (
                <>
                  <PredictionField label="Toss winner" maxPoints={scoringMeta?.toss_winner?.correct}>
                    <TeamDropdown options={[match.home_team, match.away_team]} value={tossWinner} onSelect={setTossWinner} placeholder="Select team" />
                  </PredictionField>

                  <PredictionField label="Match winner" maxPoints={scoringMeta?.match_winner?.correct}>
                    <TeamDropdown options={[match.home_team, match.away_team]} value={matchWinner} onSelect={setMatchWinner} placeholder="Select team" />
                  </PredictionField>

                  <PredictionField label="Top wicket taker" maxPoints={scoringMeta?.top_wicket_taker?.correct}>
                    <PlayerDropdown sections={playerSections} value={topWicketTaker} onSelect={setTopWicketTaker} disabled={playersLoading || playerSections.length === 0} />
                  </PredictionField>

                  <PredictionField label="Top run scorer" maxPoints={scoringMeta?.top_run_scorer?.correct}>
                    <PlayerDropdown sections={playerSections} value={topRunScorer} onSelect={setTopRunScorer} disabled={playersLoading || playerSections.length === 0} />
                  </PredictionField>

                  <PredictionField label="Highest team total (runs)" maxPoints={scoringMeta?.highest_run_scored?.correct}>
                    <TextInput style={styles.input} keyboardType="numeric" value={highestRuns} onChangeText={(v) => { if (/^\d*$/.test(v)) { setHighestRuns(v); validatePredictionDebounced(v, totalWickets); }}} placeholder="e.g. 180" placeholderTextColor="#6b7280" />
                  </PredictionField>

                  <PredictionField label="Highest powerplay total" maxPoints={scoringMeta?.powerplay_runs?.correct}>
                    <TextInput style={styles.input} keyboardType="numeric" value={powerplayRuns} onChangeText={(v) => { if (/^\d*$/.test(v)) setPowerplayRuns(v); }} placeholder="e.g. 55" placeholderTextColor="#6b7280" />
                  </PredictionField>

                  <PredictionField label="Total fall of wickets in match" maxPoints={scoringMeta?.total_wickets?.correct}>
                    <TextInput style={styles.input} keyboardType="numeric" value={totalWickets} onChangeText={(v) => { if (/^\d*$/.test(v)) { setTotalWickets(v); validatePredictionDebounced(highestRuns, v); }}} placeholder="e.g. 12" placeholderTextColor="#6b7280" />
                  </PredictionField>

                  <View style={styles.xfactorAddContainer}>
                    <TouchableOpacity onPress={openXfModal} disabled={isCompleted || (hasPrediction && !isEditMode)}>
                      <Text style={styles.linkText}>+ Add X-Factor</Text>
                    </TouchableOpacity>
                    {xFactors.length > 0 && (
                      <View style={styles.xfactorListContainer}>
                        <Text style={styles.label}>X-Factors added</Text>
                        {xFactors.map((xf, index) => (
                          <View key={index} style={styles.xfRow}>
                            <View style={styles.xfRowContent}>
                              <Text style={styles.xfTitle}>{xf.player_name} {xfDefById[xf.xf_id]?.description || "Condition"}</Text>
                              <Text style={styles.xfDescription}>Risk: {xfDefById[xf.xf_id]?.risk || xf.risk}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleRemoveXFactor(index)}><Text style={styles.xfRemove}>Remove</Text></TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.warningContainer}>{warning && <Text style={styles.warningText}>⚠️ {warning}</Text>}</View>
                  <View style={styles.messageContainer}>{predictionMessage ? <Text style={predictionMessage.includes("✅") ? styles.okText : styles.errorText}>{predictionMessage}</Text> : null}</View>
                </>
              ) : null}
            </View>

            {/* IMPROVED BACK BUTTON STYLE */}
            <View style={styles.actionContainer}>
              {/* Show SUBMIT only when the form is open */}
              {showForm && (
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmitPrediction}>
                  {predictionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>SUBMIT PREDICTION</Text>}
                </TouchableOpacity>
              )}

              {/* Show EDIT only when a prediction exists and we aren't editing yet */}
              {hasPrediction && !isEditMode && !isCompleted && (
                <TouchableOpacity style={styles.submitButton} onPress={() => setIsEditMode(true)}>
                  <Text style={styles.buttonText}>EDIT PREDICTION</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>BACK TO MATCHES</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Text style={{ color: "white" }}>Match not found</Text></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 16,
    width: '100%',
    alignSelf: 'stretch', // Centers the app on monitor
  },
  title: { 
    fontSize: 22,
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 14, 
    color: "#9ca3af", 
    marginBottom: 16 
  },
  card: { 
    backgroundColor: "#1f2937", 
    borderRadius: 12,
    padding: 24, 
    marginBottom: 12, 
    width: '100%' 
  },
  sectionTitle: { fontSize: 16, 
    fontWeight: "600", 
    color: "#e5e7eb", 
    marginBottom: 8 
  },
  input: { 
    backgroundColor: "#111827", 
    color: "#e5e7eb", 
    padding: 16, 
    width: '100%', 
    borderRadius: 8, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: "#374151" 
  },
  label: { 
    fontSize: 13, 
    color: "#9ca3af", 
    marginBottom: 4, 
    marginTop: 6 
  },
  errorText: { 
    color: "#fca5a5", 
    marginTop: 8 
  },
  okText: { 
    color: "#bbf7d0", 
    marginTop: 8 
  },
  matchInfo: { 
    fontSize: 13, 
    color: "#9ca3af" 
  },
  matchStatus: { 
    fontSize: 12, 
    color: "#93c5fd", 
    marginTop: 4 
  },
  readonlyValue: { 
    fontSize: 14, 
    color: "#e5e7eb", 
    marginBottom: 6 
  },
  pointsText: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#fbbf24", 
    marginTop: 8, 
    marginBottom: 8 
  },
  emptyText: { 
    fontSize: 12, 
    color: "#6b7280", 
    marginTop: 4 
  },
  linkText: { 
    color: "#60a5fa", 
    fontSize: 13, 
    marginTop: 4 
  },
  xfRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 4, 
    borderBottomWidth: 1, 
    borderBottomColor: "#111827" 
  },
  xfRowContent:{ 
    flex: 1 
  },
  xfTitle: { 
    fontSize: 13, 
    color: "#e5e7eb" 
  },
  xfDescription: { 
    fontSize: 11, 
    color: "#9ca3af" 
  },
  xfResult: { 
    fontSize: 13, 
    color: "#e5e7eb", 
    marginTop: 4, 
    fontWeight: 400 
  },
  xfRemove: { 
    fontSize: 12, 
    color: "#fca5a5", 
    marginLeft: 8 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(2,6,23,0.85)", 
    justifyContent: "center", 
    alignItems: "center", 
    paddingHorizontal: 16 
  },
  modalCard: { 
    backgroundColor: "#111827", 
    borderRadius: 12, 
    padding: 16, 
    width: "100%" 
  },
  modalTitle: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#e5e7eb", 
    marginBottom: 8 
  },
  modalLabel: { 
    fontSize: 13, 
    color: "#9ca3af", 
    marginTop: 10, 
    marginBottom: 4 
  },
  modalHint: { 
    fontSize: 11, 
    color: "#6b7280", 
    marginBottom: 4 
  },
  modalChipRow: { 
    flexDirection: "row", 
    marginBottom: 4 
  },
  modalChipColumn: { 
    marginBottom: 4 
  },
  modalChip: { 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 999, 
    borderWidth: 1, 
    borderColor: "#4b5563", 
    marginRight: 8, 
    backgroundColor: "#111827" 
  },
  modalChipFull: { 
    paddingHorizontal: 10, 
    paddingVertical: 8, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: "#4b5563", 
    backgroundColor: "#111827", 
    marginBottom: 6 
  },
  modalChipActive: { 
    backgroundColor: "#2563eb", 
    borderColor: "#2563eb" 
  },
  modalChipText: { 
    fontSize: 13, 
    color: "#e5e7eb" 
  },
  modalChipTextActive: { 
    color: "#f9fafb", 
    fontWeight: "600" 
  },
  modalInput: { 
    backgroundColor: "#111827", 
    color: "#e5e7eb", 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: "#4b5563", 
    paddingHorizontal: 10, 
    paddingVertical: 8, 
    marginTop: 4 
  },
  modalButtonsRow: { 
    flexDirection: "row", 
    justifyContent: "flex-end", 
    marginTop: 14 
  },
  modalButton: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 999, 
    backgroundColor: "#2563eb", 
    marginLeft: 8 
  },
  modalButtonDisabled: { 
    backgroundColor: "#1d4ed8", 
    opacity: 0.6 
  },
  modalButtonText: { 
    fontSize: 13, 
    color: "#f9fafb", 
    fontWeight: "600" 
  },
  modalButtonSecondary: { 
    backgroundColor: "transparent", 
    borderWidth: 1, 
    borderColor: "#4b5563" 
  },
  modalButtonTextSecondary: { 
    fontSize: 13, 
    color: "#e5e7eb" 
  },
  modalPlayerList: { 
    marginTop: 4 
  },
  modalDivider: { 
    height: 1, 
    backgroundColor: "#374151", 
    marginVertical: 8 
  },
  warningText: { 
    color: "#fbbf24", 
    fontSize: 12, 
    marginBottom: 8 
  },
  resultRow: { 
    flexDirection: "row", 
    marginBottom: 10 
  },
  resultLeft: { 
    flex: 1 
  },
  resultRight: { 
    flex: 1, 
    alignItems: "flex-end", 
    justifyContent: "flex-end" 
  },
  pointsHint: { 
    fontSize: 12, 
    color: "#94a3b8" 
  },
  predictionHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 6 
  },
  predictionLabel: { 
    fontSize: 13, 
    color: "#cbd5e1", 
    fontWeight: "500" 
  },
  keyboardAvoidingView: { 
    flex: 1 
  },
  scrollViewContent: { 
    paddingBottom: 24 
  },
  xfactorContainer: { 
    marginTop: 12 
  },
  editButtonContainer: { 
    marginTop: 8 
  },
  xfactorAddContainer: { 
    marginTop: 12, 
    marginBottom: 8 
  },
  xfactorListContainer: { 
    marginTop: 8 
  },
  loadingIndicator: { 
    marginVertical: 8 
  },
  warningContainer: { 
    minHeight: 20 
  },
  messageContainer: { 
    minHeight: 20 
  },
  modalSectionHeader: { 
    fontSize: 12, 
    fontWeight: "700", 
    color: "#9ca3af", 
    backgroundColor: "#1f2937", 
    paddingVertical: 4, 
    paddingHorizontal: 8, 
    marginTop: 8, 
    marginBottom: 4, 
    borderRadius: 4 
  },
  bannerContainer: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bannerTeam: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  bannerCenter: {
    alignItems: 'center',
    flex: 0.5,
  },
  vsText: {
    color: '#3b82f6',
    fontSize: 22,
    fontWeight: '900',
  },
  venueBanner: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  bannerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  footerText: {
    color: '#64748b',
    fontSize: 12,
  },
  actionContainer: {
    marginTop: 10,
    gap: 12,
  },
  submitButton: {
    backgroundColor: "#3b82f6",
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#60a5fa", 
  },
  buttonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: "#1e293b", // Matches bannerCard color
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#334155",
    marginTop: 8,
  },
  backButtonText: {
    color: "#94a3b8",
    fontWeight: '700',
  },
});