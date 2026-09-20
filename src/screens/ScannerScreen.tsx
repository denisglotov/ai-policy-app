import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  processReceiptFromUrl,
  type ProcessReceiptResult,
  type ScanProcessStep,
} from '../services/scanProcessor';
import { ResultModal } from '../components/ResultModal';

const DEFAULT_SAMPLE_URL =
  process.env.EXPO_PUBLIC_SAMPLE_RECEIPT_URL ||
  'https://raw.githubusercontent.com/denisglotov/ai-policy-account/master/test/fixtures/sample_receipt.txt';

export const ScannerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualUrl, setManualUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<ScanProcessStep>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [lastScannedResult, setLastScannedResult] = useState<ProcessReceiptResult | null>(null);
  const [isResultVisible, setIsResultVisible] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);

  const handleScanUrl = useCallback(async (urlToScan: string) => {
    const trimmed = urlToScan.trim();
    if (!trimmed) {
      Alert.alert('Empty URL', 'Please provide a valid receipt URL.');
      return;
    }

    setIsProcessing(true);
    setIsCameraActive(false);

    try {
      const result = await processReceiptFromUrl(trimmed, {
        onStepChange: (step, msg) => {
          setProcessStep(step);
          setStatusMessage(msg);
        },
      });

      setLastScannedResult(result);
      setIsResultVisible(true);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error during scan';
      Alert.alert('Scan Failed', msg);
    } finally {
      setIsProcessing(false);
      setProcessStep('idle');
      setStatusMessage('');
    }
  }, []);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!isCameraActive || isProcessing || isResultVisible) return;
      if (data.startsWith('http://') || data.startsWith('https://')) {
        handleScanUrl(data);
      } else {
        Alert.alert('Invalid QR Code', `The scanned QR code is not an HTTP/HTTPS URL:\n${data}`);
      }
    },
    [isCameraActive, isProcessing, isResultVisible, handleScanUrl],
  );

  const handleCloseModal = () => {
    setIsResultVisible(false);
    setIsCameraActive(true);
  };

  const handleUseSample = () => {
    setManualUrl(DEFAULT_SAMPLE_URL);
    handleScanUrl(DEFAULT_SAMPLE_URL);
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
        {/* Header Title */}
        <View style={styles.topHeader}>
          <Text style={styles.appTitle}>Receipt Scanner</Text>
          <Text style={styles.appSubtitle}>Point camera at a receipt QR code or enter URL</Text>
        </View>

        {/* Camera Viewfinder Container */}
        <View style={styles.cameraContainer}>
          {!permission ? (
            <View style={styles.cameraPlaceholder}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : !permission.granted ? (
            <View style={styles.cameraPlaceholder}>
              <Ionicons name="camera-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.permissionText}>
                Camera permission is required to scan QR codes
              </Text>
              <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={styles.cameraView}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={isCameraActive && !isProcessing ? handleBarcodeScanned : undefined}
            >
              <View style={styles.overlay}>
                <View style={styles.targetBox}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
              </View>
            </CameraView>
          )}

          {/* Processing Overlay */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingTitle}>
                {processStep === 'fetching' && 'Fetching Receipt'}
                {processStep === 'analyzing' && 'AI Extraction'}
                {processStep === 'evaluating' && 'Policy Verification'}
                {processStep === 'saving' && 'Saving Record'}
                {processStep !== 'fetching' &&
                  processStep !== 'analyzing' &&
                  processStep !== 'evaluating' &&
                  processStep !== 'saving' &&
                  'Analyzing Receipt'}
              </Text>
              <Text style={styles.processingStep}>{statusMessage || 'Processing...'}</Text>
            </View>
          )}
        </View>

        {/* Manual URL Input Section */}
        <View style={styles.manualCard}>
          <Text style={styles.cardHeader}>Or Test with Receipt URL</Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="https://example.com/receipt.txt"
              placeholderTextColor={colors.textMuted}
              value={manualUrl}
              onChangeText={setManualUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!isProcessing}
            />
            <TouchableOpacity
              style={[styles.submitButton, isProcessing && styles.buttonDisabled]}
              onPress={() => handleScanUrl(manualUrl)}
              disabled={isProcessing}
            >
              <Ionicons name="arrow-forward" size={20} color="#090d16" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.sampleButton}
            onPress={handleUseSample}
            disabled={isProcessing}
          >
            <Ionicons name="flash-outline" size={16} color={colors.primary} />
            <Text style={styles.sampleButtonText}>Load Test Sample Receipt</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Result Modal */}
      {lastScannedResult && (
        <ResultModal
          visible={isResultVisible}
          onClose={handleCloseModal}
          policyResult={lastScannedResult.policyResult}
          parsedReceipt={lastScannedResult.parsedReceipt}
          scannedUrl={manualUrl || lastScannedResult.historyEntry.url}
        />
      )}
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
  },
  topHeader: {
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  appSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  cameraContainer: {
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    position: 'relative',
    marginBottom: 20,
  },
  cameraView: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#090d16',
    fontWeight: '700',
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  targetBox: {
    width: 220,
    height: 220,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 13, 22, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  processingTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  processingStep: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  manualCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  sampleButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
