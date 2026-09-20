import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  getScanHistory,
  clearScanHistory,
  deleteScanEntry,
  type ScanHistoryEntry,
} from '../services/storage';
import { ResultModal } from '../components/ResultModal';
import { type PolicyEvaluationResult } from '../services/policyEngine';
import { type ParsedReceipt } from '../services/receiptParserBridge';

export const HistoryScreen: React.FC = () => {
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ScanHistoryEntry | null>(null);

  const loadHistory = useCallback(async () => {
    const records = await getScanHistory();
    setHistory(records);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleClearHistory = () => {
    if (history.length === 0) return;
    Alert.alert('Clear History', 'Are you sure you want to remove all saved scan records?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await clearScanHistory();
          await loadHistory();
        },
      },
    ]);
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert('Delete Record', 'Remove this scan record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteScanEntry(id);
          await loadHistory();
        },
      },
    ]);
  };

  const renderHistoryItem = ({ item }: { item: ScanHistoryEntry }) => {
    const isApproved = item.status === 'approved';
    const formattedDate = new Date(item.timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => setSelectedEntry(item)}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.statusBadge,
              isApproved ? styles.statusBadgeApproved : styles.statusBadgeDenied,
            ]}
          >
            <Ionicons
              name={isApproved ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={isApproved ? colors.approve : colors.denied}
            />
            <Text
              style={[
                styles.statusBadgeText,
                { color: isApproved ? colors.approve : colors.denied },
              ]}
            >
              {isApproved ? 'APPROVED' : 'DENIED'}
            </Text>
          </View>
          <Text style={styles.timestamp}>{formattedDate}</Text>
        </View>

        <Text style={styles.urlText} numberOfLines={1}>
          {item.url}
        </Text>

        <Text style={styles.explanationText} numberOfLines={2}>
          {item.explanation}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.footerStats}>
            <Text style={styles.statLabel}>Items: </Text>
            <Text style={styles.statValue}>{item.itemsCount}</Text>
            <Text style={styles.statDivider}>•</Text>
            <Text style={styles.statLabel}>Total: </Text>
            <Text style={styles.statValue}>{item.totalAmount.toFixed(2)}</Text>
            {item.violationsCount > 0 && (
              <>
                <Text style={styles.statDivider}>•</Text>
                <Text style={[styles.statLabel, { color: colors.denied }]}>Violations: </Text>
                <Text style={[styles.statValue, { color: colors.denied }]}>
                  {item.violationsCount}
                </Text>
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteItem(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Convert selected history entry to PolicyEvaluationResult & ParsedReceipt for ResultModal
  const modalPolicyResult: PolicyEvaluationResult | null = selectedEntry
    ? {
        isApproved: selectedEntry.status === 'approved',
        status: selectedEntry.status,
        totalAmount: selectedEntry.totalAmount,
        violatingAmount: selectedEntry.violatingAmount,
        approvedAmount: selectedEntry.totalAmount - selectedEntry.violatingAmount,
        violations: selectedEntry.violations,
        violationsByCategory: {},
        allowedItems: selectedEntry.allItems.filter(
          (i) => !selectedEntry.violations.some((v) => v.title === i.title && v.price === i.price),
        ),
        explanation: selectedEntry.explanation,
        evaluatedAt: selectedEntry.timestamp,
      }
    : null;

  const modalParsedReceipt: ParsedReceipt | null = selectedEntry
    ? {
        items: selectedEntry.allItems,
        evm_wallets: selectedEntry.evmWallets,
      }
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Scan History</Text>
          <Text style={styles.headerSubtitle}>
            {history.length} {history.length === 1 ? 'record' : 'records'} logged
          </Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearHistory}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Scans Yet</Text>
          <Text style={styles.emptySubtitle}>
            Receipts you scan from QR codes or URLs will appear here with verification details.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {selectedEntry && (
        <ResultModal
          visible={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          policyResult={modalPolicyResult}
          parsedReceipt={modalParsedReceipt}
          scannedUrl={selectedEntry.url}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  clearButtonText: {
    color: colors.denied,
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeApproved: {
    backgroundColor: colors.approveBackground,
  },
  statusBadgeDenied: {
    backgroundColor: colors.deniedBackground,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textMuted,
  },
  urlText: {
    fontSize: 13,
    color: colors.text,
    fontFamily: 'Courier',
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 10,
  },
  footerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  statDivider: {
    marginHorizontal: 6,
    color: colors.textMuted,
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
