import React, { useState, useEffect, useMemo } from "react";
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";

const SERVER_URL = "https://famous-views-matter.loca.lt"; // replace with your Flask server URL

const PALETTE = [
  "#22B8A6",
  "#16A34A",
  "#EF4444",
  "#F59E0B",
  "#3B82F6",
  "#8B5CF6",
];

export default function App() {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [servingCount, setServingCount] = useState(1);
  const [tags, setTags] = useState("");

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Camera access is required to take photos."
          );
        }
      }
    })();
  }, []);

  const takePhoto = async () => {
    try {
      const pickerResult = await ImagePicker.launchCameraAsync({
        quality: 1,
      });

      if (!pickerResult.canceled) {
        const uri = pickerResult.assets[0].uri;
        setImage(uri);
        uploadPhoto(uri);
      }
    } catch (error) {
      Alert.alert("Error", "Cannot open camera: " + error.message);
      console.log(error);
    }
  };

  const uploadPhoto = async (uri) => {
    const formData = new FormData();
    const filename = uri.split("/").pop();
    const match = /\.(\w+)$/.exec(filename ?? "");
    const type = match ? `image/${match[1]}` : "image";

    formData.append("photo", {
      uri,
      name: filename,
      type,
    });

    try {
      const response = await fetch(`${SERVER_URL}/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      setResult(data.result ?? data);
    } catch (error) {
      Alert.alert("Upload Failed", error.message);
      console.log(error);
    } finally {
      setIsUploading(false);
    }
  };

  const totals = useMemo(() => {
    if (!result || !Array.isArray(result.ingredients)) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }

    const calories =
      typeof result.total_calories === "number"
        ? result.total_calories
        : result.ingredients.reduce(
            (sum, ing) => sum + (ing.calories_kcal || 0),
            0
          );

    const protein = result.ingredients.reduce(
      (sum, ing) => sum + (ing.protein_g || 0),
      0
    );
    const carbs = result.ingredients.reduce(
      (sum, ing) => sum + (ing.carbs_g || 0),
      0
    );
    const fat = result.ingredients.reduce(
      (sum, ing) => sum + (ing.fat_g || 0),
      0
    );

    return { calories, protein, carbs, fat };
  }, [result]);

  const resetSession = () => {
    setResult(null);
    setImage(null);
    setTags("");
    setServingCount(1);
  };

  const renderPlaceholder = () => (
    <View style={styles.placeholderWrapper}>
      <View style={styles.placeholderHeader}>
        <Text style={styles.placeholderTitle}>Nutrition Snapshot</Text>
        <Text style={styles.placeholderSubtitle}>
          Snap a photo of your meal and let the AI break it down.
        </Text>
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={takePhoto}>
        <Feather name="camera" size={20} color="#fff" />
        <Text style={styles.primaryButtonText}>Take Photo</Text>
      </TouchableOpacity>
      {image ? (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Latest Photo</Text>
          <Image source={{ uri: image }} style={styles.previewImage} />
        </View>
      ) : null}
    </View>
  );

  const renderIngredientCard = (ingredient, index) => {
    const color = PALETTE[index % PALETTE.length];
    const confidenceValue = ingredient.confidence || 0;
    const confidencePercent = Math.round(
      confidenceValue > 1 ? confidenceValue : confidenceValue * 100
    );

    const protein =
      ingredient.protein_g !== undefined
        ? `${ingredient.protein_g.toFixed(1)}g`
        : "--";
    const carbs =
      ingredient.carbs_g !== undefined
        ? `${ingredient.carbs_g.toFixed(1)}g`
        : "--";
    const fat =
      ingredient.fat_g !== undefined
        ? `${ingredient.fat_g.toFixed(1)}g`
        : "--";

    return (
      <View key={`${ingredient.name}-${index}`} style={styles.ingredientCard}>
        <View style={styles.ingredientHeader}>
          <View style={styles.ingredientTitleRow}>
            <View style={[styles.colorDot, { backgroundColor: color }]} />
            <Text style={styles.ingredientName}>{ingredient.name}</Text>
            {ingredient.weight_g ? (
              <Text style={styles.ingredientWeight}>
                ({ingredient.weight_g.toFixed(0)}g)
              </Text>
            ) : null}
          </View>
          <Text style={styles.ingredientCalories}>
            {Math.round(ingredient.calories_kcal || 0)} kcal
          </Text>
        </View>

        <View style={styles.macrosRow}>
          <View style={[styles.macroPill, styles.proteinPill]}>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroValue}>{protein}</Text>
          </View>
          <View style={[styles.macroPill, styles.carbsPill]}>
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroValue}>{carbs}</Text>
          </View>
          <View style={[styles.macroPill, styles.fatPill]}>
            <Text style={styles.macroLabel}>Fat</Text>
            <Text style={styles.macroValue}>{fat}</Text>
          </View>
        </View>

        <View style={styles.confidenceWrapper}>
          <View style={styles.confidenceHeader}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <Text style={styles.confidenceValue}>{confidencePercent}%</Text>
          </View>
          <View style={styles.confidenceBarBackground}>
            <View
              style={[
                styles.confidenceBarFill,
                { width: `${Math.min(confidencePercent, 100)}%`, backgroundColor: color },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderResult = () => (
    <View style={styles.resultWrapper}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.iconButton} onPress={resetSession}>
          <Feather name="chevron-left" size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition Breakdown</Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {image ? (
          <View style={styles.heroImageWrapper}>
            <Image source={{ uri: image }} style={styles.heroImage} />
            <TouchableOpacity style={styles.retakeButton} onPress={takePhoto}>
              <Feather name="camera" size={16} color="#22B8A6" />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.totalCard}>
          <Text style={styles.totalCardTitle}>Total Nutrition</Text>
          <View style={styles.totalCaloriesRow}>
            <Text style={styles.totalCaloriesValue}>{Math.round(totals.calories)}</Text>
            <Text style={styles.totalCaloriesUnit}>kcal</Text>
          </View>
          <View style={styles.totalMacrosRow}>
            <View>
              <Text style={styles.totalMacroLabel}>Protein</Text>
              <Text style={styles.totalMacroValue}>
                {totals.protein ? totals.protein.toFixed(1) : "--"}g
              </Text>
            </View>
            <View>
              <Text style={styles.totalMacroLabel}>Carbs</Text>
              <Text style={styles.totalMacroValue}>
                {totals.carbs ? totals.carbs.toFixed(1) : "--"}g
              </Text>
            </View>
            <View>
              <Text style={styles.totalMacroLabel}>Fat</Text>
              <Text style={styles.totalMacroValue}>
                {totals.fat ? totals.fat.toFixed(1) : "--"}g
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionTitle}>Ingredient Breakdown</Text>
          <View style={styles.sectionSpacing}>
            {Array.isArray(result?.ingredients) && result.ingredients.length > 0 ? (
              result.ingredients.map((ingredient, index) =>
                renderIngredientCard(ingredient, index)
              )
            ) : (
              <View style={styles.emptyStateCard}>
                <Feather name="alert-circle" size={16} color="#6B7280" />
                <Text style={styles.emptyStateText}>
                  No ingredients detected in this meal.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionWrapper}>
          <TouchableOpacity style={styles.addHiddenButton}>
            <Feather name="plus" size={18} color="#4B5563" />
            <Text style={styles.addHiddenText}>
              Add hidden ingredients (e.g., salt/oil)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionLabel}>Serving Count</Text>
          <View style={styles.servingsRow}>
            <TouchableOpacity
              style={styles.servingButton}
              onPress={() => setServingCount(Math.max(1, servingCount - 1))}
            >
              <Text style={styles.servingButtonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.servingInput}
              value={String(servingCount)}
              editable={false}
            />
            <TouchableOpacity
              style={[styles.servingButton, styles.servingButtonPrimary]}
              onPress={() => setServingCount(servingCount + 1)}
            >
              <Text style={styles.servingButtonPrimaryText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionLabel}>Tags</Text>
          <View style={styles.inputWrapper}>
            <Feather name="hash" size={14} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              placeholder="Add tags (e.g., homemade, restaurant)"
              placeholderTextColor="#9CA3AF"
              style={styles.tagInput}
              value={tags}
              onChangeText={setTags}
            />
          </View>
          <View style={styles.tagChipsRow}>
            <View style={styles.tagChip}>
              <Text style={styles.tagChipText}>healthy</Text>
            </View>
            <View style={styles.tagChip}>
              <Text style={styles.tagChipText}>high-protein</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Values are calculated using food database and custom density tables.
            Tap ingredients to view detailed micronutrients.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Save Meal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.appContainer}>
        {result ? renderResult() : renderPlaceholder()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAF9",
  },
  appContainer: {
    flex: 1,
  },
  placeholderWrapper: {
    flex: 1,
    backgroundColor: "#F7FAF9",
    padding: 24,
    justifyContent: "center",
  },
  placeholderHeader: {
    marginBottom: 32,
    gap: 8,
  },
  placeholderTitle: {
    fontSize: 28,
    color: "#111827",
    fontWeight: "700",
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: "#4B5563",
    lineHeight: 22,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#22B8A6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  previewContainer: {
    marginTop: 32,
    alignItems: "center",
    gap: 12,
  },
  previewLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  previewImage: {
    width: 220,
    height: 220,
    borderRadius: 20,
  },
  resultWrapper: {
    flex: 1,
    backgroundColor: "#F7FAF9",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  iconButtonPlaceholder: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  scrollContent: {
    paddingBottom: 140,
  },
  heroImageWrapper: {
    marginTop: 16,
    marginHorizontal: 24,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 200,
    borderRadius: 24,
  },
  retakeButton: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },

  retakeText: {
    color: "#22B8A6",
    fontWeight: "600",
  },
  totalCard: {
    marginTop: 20,
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 28,
    backgroundColor: "#22B8A6",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 6,
  },
  totalCardTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginBottom: 12,
  },
  totalCaloriesRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 24,
  },
  totalCaloriesValue: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "700",
  },
  totalCaloriesUnit: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 18,
    marginBottom: 6,
  },
  totalMacrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalMacroLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginBottom: 4,
  },
  totalMacroValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  sectionWrapper: {
    marginHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  sectionSpacing: {
    gap: 12,
  },
  ingredientCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  ingredientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ingredientTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    textTransform: "capitalize",
  },
  ingredientWeight: {
    fontSize: 12,
    color: "#6B7280",
  },
  ingredientCalories: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  macrosRow: {
    flexDirection: "row",
    gap: 12,
  },
  macroPill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    gap: 6,
  },
  macroLabel: {
    fontSize: 11,
    color: "#4B5563",
  },
  macroValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  proteinPill: {
    backgroundColor: "#DBEAFE",
  },
  carbsPill: {
    backgroundColor: "#FEF3C7",
  },
  fatPill: {
    backgroundColor: "#FEFCE8",
  },
  confidenceWrapper: {
    gap: 6,
  },
  confidenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confidenceLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  confidenceValue: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },
  confidenceBarBackground: {
    width: "100%",
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
  },
  confidenceBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  emptyStateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  emptyStateText: {
    color: "#4B5563",
    fontSize: 13,
  },
  addHiddenButton: {
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fff",
  },
  addHiddenText: {
    color: "#4B5563",
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  servingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  servingButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  servingButtonText: {
    fontSize: 24,
    color: "#6B7280",
  },
  servingInput: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    textAlign: "center",
    fontSize: 18,
    color: "#111827",
  },
  servingButtonPrimary: {
    backgroundColor: "#22B8A6",
    borderColor: "#22B8A6",
  },
  servingButtonPrimaryText: {
    fontSize: 24,
    color: "#fff",
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 16,
  },
  tagInput: {
    height: 52,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingLeft: 40,
    paddingRight: 16,
    fontSize: 14,
    color: "#111827",
  },
  tagChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E8F5F3",
  },
  tagChipText: {
    color: "#22B8A6",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "lowercase",
  },
  infoCard: {
    marginHorizontal: 24,
    marginTop: 24,
    backgroundColor: "#DBEAFE",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 20,
    padding: 16,
  },
  infoText: {
    fontSize: 13,
    color: "#1E3A8A",
    lineHeight: 20,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
});
