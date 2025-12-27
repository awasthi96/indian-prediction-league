import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";

interface TeamDropdownProps {
  label?: Optional[string];
  options: string[]; // The two team names
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
}

export default function TeamDropdown({
  label,
  options,
  value,
  onSelect,
  placeholder = "Select team",
}: TeamDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Label */}
      {label?(
        <Text style={styles.label}>{label}</Text>
      ): null}

      {/* Dropdown Button */}
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={value ? styles.selectedText : styles.placeholderText}>
          {value || placeholder}
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
            <ScrollView>
              {options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    value === option && styles.optionButtonActive,
                  ]}
                  onPress={() => {
                    onSelect(option);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === option && styles.optionTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                  {value === option && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    maxHeight: "50%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 12,
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
});