import { fetchReceiptFromUrl } from './receiptFetcher';
import { parseReceipt, type ParsedReceipt } from './receiptParserBridge';
import { evaluateReceiptPolicy, type PolicyEvaluationResult } from './policyEngine';
import { getAppSettings, saveScanResult, type ScanHistoryEntry } from './storage';

export type ScanProcessStep =
  'idle' | 'fetching' | 'analyzing' | 'evaluating' | 'saving' | 'completed' | 'failed';

export interface ProcessReceiptResult {
  rawReceiptText: string;
  parsedReceipt: ParsedReceipt;
  policyResult: PolicyEvaluationResult;
  historyEntry: ScanHistoryEntry;
}

export interface ProcessReceiptOptions {
  onStepChange?: (step: ScanProcessStep, message: string) => void;
  overrideApiKey?: string;
  overrideModel?: string;
  overrideBaseURL?: string;
}

/**
 * Executes the end-to-end receipt pipeline:
 * 1. Fetch & clean receipt text from URL
 * 2. Load LLM credentials
 * 3. Send text to LLM parser (or cache)
 * 4. Run policy checks for unhealthy drinks, alcohol, tobacco
 * 5. Persist record into history
 */
export async function processReceiptFromUrl(
  url: string,
  options: ProcessReceiptOptions = {},
): Promise<ProcessReceiptResult> {
  const { onStepChange } = options;

  // Step 1: Fetch and clean URL content
  onStepChange?.('fetching', 'Fetching receipt from URL...');
  const rawReceiptText = await fetchReceiptFromUrl(url);

  // Step 2: Prepare LLM credentials
  const settings = await getAppSettings();
  const apiKey = options.overrideApiKey ?? settings.apiKey;
  const model = options.overrideModel ?? settings.model;
  const baseURL = options.overrideBaseURL ?? settings.baseURL;

  // Step 3: LLM Parsing
  onStepChange?.('analyzing', 'Extracting items with AI...');
  const parsedReceipt = await parseReceipt(rawReceiptText, {
    apiKey,
    model,
    baseURL,
    dangerouslyAllowBrowser: true,
  });

  // Step 4: Policy evaluation
  onStepChange?.('evaluating', 'Checking compliance rules...');
  const policyResult = evaluateReceiptPolicy(parsedReceipt);

  // Step 5: Save to local history
  onStepChange?.('saving', 'Saving scan to history...');
  const historyEntry = await saveScanResult({
    url,
    status: policyResult.status,
    totalAmount: policyResult.totalAmount,
    violatingAmount: policyResult.violatingAmount,
    explanation: policyResult.explanation,
    itemsCount: parsedReceipt.items.length,
    violationsCount: policyResult.violations.length,
    violations: policyResult.violations,
    allItems: parsedReceipt.items,
    evmWallets: parsedReceipt.evm_wallets,
  });

  onStepChange?.('completed', 'Scan finished successfully');

  return {
    rawReceiptText,
    parsedReceipt,
    policyResult,
    historyEntry,
  };
}
