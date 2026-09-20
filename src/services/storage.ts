import AsyncStorage from '@react-native-async-storage/async-storage';
import { type ReceiptItem } from './receiptParserBridge';

const STORAGE_KEYS = {
  HISTORY: '@receipt_policy_scanner:history',
  SETTINGS: '@receipt_policy_scanner:settings',
} as const;

export interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  url: string;
  status: 'approved' | 'denied';
  totalAmount: number;
  violatingAmount: number;
  explanation: string;
  itemsCount: number;
  violationsCount: number;
  violations: ReceiptItem[];
  allItems: ReceiptItem[];
  evmWallets: string[];
}

export interface AppSettings {
  apiKey: string;
  model: string;
  baseURL: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '',
  model: process.env.EXPO_PUBLIC_LLM_MODEL || 'inclusionai/ling-3.0-flash-vl:free',
  baseURL: process.env.EXPO_PUBLIC_LLM_BASE_URL || 'https://openrouter.ai/api/v1',
};

/**
 * Retrieves the history of scanned receipts.
 */
export async function getScanHistory(): Promise<ScanHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load scan history:', err);
    return [];
  }
}

/**
 * Saves a new scan result to history.
 */
export async function saveScanResult(
  entry: Omit<ScanHistoryEntry, 'id' | 'timestamp'>,
): Promise<ScanHistoryEntry> {
  const newRecord: ScanHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const existing = await getScanHistory();
    const updated = [newRecord, ...existing].slice(0, 100); // keep last 100 scans
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save scan result to storage:', err);
  }

  return newRecord;
}

/**
 * Deletes a specific history record by ID.
 */
export async function deleteScanEntry(id: string): Promise<void> {
  try {
    const existing = await getScanHistory();
    const filtered = existing.filter((item) => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete history record:', err);
  }
}

/**
 * Clears all scan history.
 */
export async function clearScanHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.HISTORY);
  } catch (err) {
    console.error('Failed to clear scan history:', err);
  }
}

/**
 * Retrieves application settings with fallback to environment defaults.
 */
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : DEFAULT_SETTINGS.apiKey,
      model:
        typeof parsed.model === 'string' && parsed.model.trim()
          ? parsed.model.trim()
          : DEFAULT_SETTINGS.model,
      baseURL:
        typeof parsed.baseURL === 'string' && parsed.baseURL.trim()
          ? parsed.baseURL.trim()
          : DEFAULT_SETTINGS.baseURL,
    };
  } catch (err) {
    console.error('Failed to load settings from storage:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Saves or updates application settings.
 */
export async function saveAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  try {
    const current = await getAppSettings();
    const updated: AppSettings = {
      apiKey: settings.apiKey !== undefined ? settings.apiKey : current.apiKey,
      model:
        settings.model !== undefined && settings.model.trim()
          ? settings.model.trim()
          : current.model,
      baseURL:
        settings.baseURL !== undefined && settings.baseURL.trim()
          ? settings.baseURL.trim()
          : current.baseURL,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save settings:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Resets application settings to default environment configuration.
 */
export async function resetAppSettings(): Promise<AppSettings> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.SETTINGS);
  } catch (err) {
    console.error('Failed to reset settings:', err);
  }
  return { ...DEFAULT_SETTINGS };
}
