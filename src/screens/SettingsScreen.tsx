import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getAppSettings, saveAppSettings, resetAppSettings } from '../services/storage';
import { RESTRICTED_CATEGORIES, CATEGORY_LABELS } from '../services/policyEngine';

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await getAppSettings();
    setApiKey(s.apiKey);
    setModel(s.model);
    setBaseURL(s.baseURL);
  };

  const handleSave = async () => {
    await saveAppSettings({
      apiKey: apiKey.trim(),
      model: model.trim(),
      baseURL: baseURL.trim(),
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
    Alert.alert('Settings Saved', 'LLM configuration updated successfully.');
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to Defaults',
      'Reset API credentials and model configuration to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const defaults = await resetAppSettings();
            setApiKey(defaults.apiKey);
            setModel(defaults.model);
            setBaseURL(defaults.baseURL);
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 24) + 12 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Configuration</Text>
          <Text style={styles.headerSubtitle}>Customize AI provider and review policy rules</Text>
        </View>

        {/* LLM Provider Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="hardware-chip-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>LLM Provider Settings</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>OpenRouter / OpenAI API Key</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.inputFlex}
                placeholder="sk-or-v1-... (optional for cached receipts)"
                placeholderTextColor={colors.textMuted}
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry={!isApiKeyVisible}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setIsApiKeyVisible(!isApiKeyVisible)}
              >
                <Ionicons
                  name={isApiKeyVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Model Identifier</Text>
            <TextInput
              style={styles.input}
              placeholder="inclusionai/ling-3.0-flash-vl:free"
              placeholderTextColor={colors.textMuted}
              value={model}
              onChangeText={setModel}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>API Base URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://openrouter.ai/api/v1"
              placeholderTextColor={colors.textMuted}
              value={baseURL}
              onChangeText={setBaseURL}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Ionicons name="checkmark-outline" size={18} color="#090d16" />
              <Text style={styles.saveButtonText}>{isSaved ? 'Saved!' : 'Save Configuration'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Policy Rules Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.approve} />
            <Text style={styles.cardTitle}>Active Policy Rules</Text>
          </View>
          <Text style={styles.cardDescription}>
            Scanned receipts are evaluated by AI against these restricted categories. Receipts
            containing any items in these categories are marked as Denied.
          </Text>

          {RESTRICTED_CATEGORIES.map((cat) => (
            <View key={cat} style={styles.restrictedItem}>
              <Ionicons name="ban-outline" size={18} color={colors.denied} />
              <View style={styles.restrictedTextContainer}>
                <Text style={styles.restrictedCategoryTitle}>{CATEGORY_LABELS[cat]}</Text>
                <Text style={styles.restrictedCategoryDesc}>
                  {cat === 'unhealthy_drinks' && 'Energy drinks, sugary sodas, sweetened iced teas'}
                  {cat === 'alcohol' && 'Beer, cider, wine, spirits, and alcoholic cocktails'}
                  {cat === 'tobacco' && 'Cigarettes, heated tobacco sticks, vape liquids'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Engine Info */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="git-branch-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.cardTitle}>Engine Info</Text>
          </View>
          <Text style={styles.infoRow}>
            <Text style={styles.infoLabel}>Receipt Parser: </Text>
            <Text style={styles.infoValue}>ai-policy (Cifra-Ruble-backend)</Text>
          </Text>
          <Text style={styles.infoRow}>
            <Text style={styles.infoLabel}>Input Size Limit: </Text>
            <Text style={styles.infoValue}>50 KB</Text>
          </Text>
          <Text style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pre-seeded Cache: </Text>
            <Text style={styles.infoValue}>Enabled (0ms latency for sample receipts)</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputFlex: {
    flex: 1,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
  },
  iconButton: {
    padding: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  saveButtonText: {
    color: '#090d16',
    fontSize: 14,
    fontWeight: '700',
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingVertical: 12,
  },
  resetButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  restrictedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  restrictedTextContainer: {
    flex: 1,
  },
  restrictedCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  restrictedCategoryDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    fontSize: 13,
    marginBottom: 6,
  },
  infoLabel: {
    color: colors.textMuted,
  },
  infoValue: {
    color: colors.text,
    fontWeight: '500',
  },
});
