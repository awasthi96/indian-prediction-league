import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SectionList,
  Platform,
  StatusBar
} from "react-native";

interface PlayerDropdownProps {
  sections: { title: string; data: string[] }[]; // CHANGED: Now accepts sections
  value: string;
  onSelect: (val: string) => void;
  disabled?: boolean;
}

export default function PlayerDropdown({
  sections,
  value,
  onSelect,
  disabled = false,
}: PlayerDropdownProps) {
  const [visible, setVisible] = useState(false);

  const handleSelect = (val: string) => {
    onSelect(val);
    setVisible(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.button, disabled && styles.disabled]}
        onPress={() => setVisible(true)}
        disabled={disabled}
      >
        <Text style={value ? styles.textSelected : styles.textPlaceholder}>
          {value || "Select Player"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select Player</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>

            <SectionList
              sections={sections}
              keyExtractor={(item, index) => item + index}
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.item, item === value && styles.itemSelected]}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[
                      styles.itemText,
                      item === value && styles.itemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              stickySectionHeadersEnabled={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  disabled: {
    opacity: 0.5,
  },
  textPlaceholder: {
    color: "#9ca3af",
  },
  textSelected: {
    color: "#e5e7eb",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#1f2937",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  headerTitle: {
    color: "#f3f4f6",
    fontSize: 16,
    fontWeight: "600",
  },
  closeText: {
    color: "#60a5fa",
    fontSize: 14,
  },
  sectionHeader: {
    backgroundColor: "#374151",
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginTop: 0,
  },
  sectionHeaderText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  itemSelected: {
    backgroundColor: "#1e3a8a",
  },
  itemText: {
    color: "#d1d5db",
    fontSize: 14,
  },
  itemTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
});