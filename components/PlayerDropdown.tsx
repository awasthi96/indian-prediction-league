import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";

type Props = {
  label?: Optional[string];
  data: string[];
  value: string | null;
  onSelect: (value: string) => void;
  disabled?: boolean;
};

export default function PlayerDropdown({
  label,
  data,
  value,
  onSelect,
  disabled = false,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Label */}
      {label?(
        <Text style={styles.label}>{label}</Text>
      ): null}

      {/* Dropdown Button */}
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          disabled && styles.dropdownButtonDisabled,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text style={value ? styles.selectedText : styles.placeholderText}>
          {value || "Select player"}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      {/* Modal with options */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>
            
            <ScrollView style={styles.scrollView}>
              {data.length === 0 ? (
                <Text style={styles.emptyText}>No players available</Text>
              ) : (
                data.map((player) => (
                  <TouchableOpacity
                    key={player}
                    style={[
                      styles.optionButton,
                      value === player && styles.optionButtonActive,
                    ]}
                    onPress={() => {
                      onSelect(player);
                      setModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        value === player && styles.optionTextActive,
                      ]}
                    >
                      {player}
                    </Text>
                    {value === player && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 6,
  },
  dropdownButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  dropdownButtonDisabled: {
    opacity: 0.5,
  },
  selectedText: {
    color: "#e5e7eb",
    fontSize: 14,
  },
  placeholderText: {
    color: "#6b7280",
    fontSize: 14,
  },
  arrow: {
    color: "#9ca3af",
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1f2937",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 12,
  },
  scrollView: {
    maxHeight: 400,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#111827",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionButtonActive: {
    backgroundColor: "#2563eb",
  },
  optionText: {
    color: "#e5e7eb",
    fontSize: 14,
  },
  optionTextActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#60a5fa",
    fontSize: 14,
    fontWeight: "600",
  },
});