import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { CATEGORY_LABELS, type PolicyEvaluationResult } from '../services/policyEngine';
import { type ParsedReceipt } from '../services/receiptParserBridge';

export interface ResultModalProps {
  visible: boolean;
  onClose: () => void;
  policyResult: PolicyEvaluationResult | null;
  parsedReceipt: ParsedReceipt | null;
  scannedUrl?: string;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  visible,
  onClose,
  policyResult,
  parsedReceipt,
  scannedUrl,
}) => {
  if (!policyResult) return null;

  const isApproved = policyResult.isApproved;
  const items = parsedReceipt?.items || [];
  const evmWallets = parsedReceipt?.evm_wallets || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Verification Result</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Banner */}
          <View
            style={[
              styles.statusBanner,
              isApproved ? styles.statusBannerApproved : styles.statusBannerDenied,
            ]}
          >
            <Ionicons
              name={isApproved ? 'checkmark-circle' : 'close-circle'}
              size={56}
              color={isApproved ? colors.approve : colors.denied}
            />
            <Text
              style={[styles.statusTitle, { color: isApproved ? colors.approve : colors.denied }]}
            >
              {isApproved ? 'POLICY APPROVED' : 'POLICY DENIED'}
            </Text>
            <Text style={styles.statusExplanation}>{policyResult.explanation}</Text>
          </View>

          {/* Quick Metrics */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total Items</Text>
              <Text style={styles.metricValue}>{items.length}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total Sum</Text>
              <Text style={styles.metricValue}>{policyResult.totalAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Violations</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: policyResult.violations.length > 0 ? colors.denied : colors.approve },
                ]}
              >
                {policyResult.violations.length}
              </Text>
            </View>
          </View>

          {/* Violations Section (if any) */}
          {policyResult.violations.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="warning-outline" size={20} color={colors.denied} />
                <Text style={[styles.sectionTitle, { color: colors.denied }]}>
                  Prohibited Items ({policyResult.violations.length})
                </Text>
              </View>

              {policyResult.violations.map((v, idx) => (
                <View key={`violation-${idx}`} style={styles.violationCard}>
                  <View style={styles.itemRowTop}>
                    <Text style={styles.violationItemTitle}>{v.title}</Text>
                    <Text style={styles.violationItemPrice}>{v.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.badgeContainer}>
                    <View style={styles.violationBadge}>
                      <Text style={styles.violationBadgeText}>
                        {CATEGORY_LABELS[v.category] || v.category}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* All Extracted Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extracted Items ({items.length})</Text>
            {items.map((item, idx) => {
              const isViolating = policyResult.violations.includes(item);
              return (
                <View
                  key={`item-${idx}`}
                  style={[styles.itemCard, isViolating && styles.itemCardViolating]}
                >
                  <View style={styles.itemRowTop}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemPrice}>{item.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.badgeContainer}>
                    <View
                      style={[
                        styles.categoryBadge,
                        isViolating ? styles.badgeViolating : styles.badgeNormal,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryBadgeText,
                          isViolating ? styles.badgeTextViolating : styles.badgeTextNormal,
                        ]}
                      >
                        {CATEGORY_LABELS[item.category] || item.category}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* EVM Wallets */}
          {evmWallets.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detected EVM Wallets ({evmWallets.length})</Text>
              {evmWallets.map((wallet, idx) => (
                <View key={`wallet-${idx}`} style={styles.walletCard}>
                  <Ionicons name="wallet-outline" size={16} color={colors.primary} />
                  <Text style={styles.walletText} numberOfLines={1} ellipsizeMode="middle">
                    {wallet}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Scanned URL */}
          {scannedUrl ? (
            <View style={styles.urlContainer}>
              <Text style={styles.urlLabel}>Source URL:</Text>
              <Text style={styles.urlValue} numberOfLines={2}>
                {scannedUrl}
              </Text>
            </View>
          ) : null}

          {/* Action Button */}
          <TouchableOpacity style={styles.primaryActionButton} onPress={onClose}>
            <Text style={styles.primaryActionText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statusBanner: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  statusBannerApproved: {
    backgroundColor: colors.approveBackground,
    borderColor: colors.approveBorder,
  },
  statusBannerDenied: {
    backgroundColor: colors.deniedBackground,
    borderColor: colors.deniedBorder,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
    letterSpacing: 1,
  },
  statusExplanation: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  violationCard: {
    backgroundColor: colors.deniedBackground,
    borderColor: colors.deniedBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  violationItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  violationItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.denied,
  },
  violationBadge: {
    backgroundColor: colors.denied,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  violationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  itemCardViolating: {
    borderColor: colors.deniedBorder,
    backgroundColor: colors.deniedBackground,
  },
  itemRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  badgeContainer: {
    marginTop: 6,
    flexDirection: 'row',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeNormal: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeViolating: {
    backgroundColor: colors.denied,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextNormal: {
    color: colors.textSecondary,
  },
  badgeTextViolating: {
    color: '#fff',
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  walletText: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: 'Courier',
    flex: 1,
  },
  urlContainer: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  urlLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  urlValue: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'Courier',
  },
  primaryActionButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryActionText: {
    color: '#090d16',
    fontSize: 16,
    fontWeight: '700',
  },
});
