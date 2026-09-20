import { type ParsedReceipt, type ReceiptCategory, type ReceiptItem } from './receiptParserBridge';

export const RESTRICTED_CATEGORIES: readonly ReceiptCategory[] = [
  'unhealthy_drinks',
  'alcohol',
  'tobacco',
] as const;

export const CATEGORY_LABELS: Record<ReceiptCategory, string> = {
  staple_food: 'Staple Food',
  fresh_produce: 'Fresh Produce',
  junk_food: 'Junk Food',
  drinks: 'Healthy Drinks',
  unhealthy_drinks: 'Unhealthy Drinks',
  alcohol: 'Alcohol',
  tobacco: 'Tobacco & Nicotine',
  other: 'Other / Non-Food',
};

export interface PolicyEvaluationResult {
  isApproved: boolean;
  status: 'approved' | 'denied';
  totalAmount: number;
  violatingAmount: number;
  approvedAmount: number;
  violations: ReceiptItem[];
  violationsByCategory: Partial<Record<ReceiptCategory, ReceiptItem[]>>;
  allowedItems: ReceiptItem[];
  explanation: string;
  evaluatedAt: string;
}

/**
 * Checks if a given category is restricted by policy.
 */
export function isCategoryRestricted(category: ReceiptCategory): boolean {
  return RESTRICTED_CATEGORIES.includes(category);
}

/**
 * Evaluates a parsed receipt against policy restrictions.
 */
export function evaluateReceiptPolicy(receipt: ParsedReceipt): PolicyEvaluationResult {
  const violations: ReceiptItem[] = [];
  const allowedItems: ReceiptItem[] = [];
  const violationsByCategory: Partial<Record<ReceiptCategory, ReceiptItem[]>> = {};

  let totalAmount = 0;
  let violatingAmount = 0;
  let approvedAmount = 0;

  for (const item of receipt.items) {
    totalAmount += item.price;

    if (isCategoryRestricted(item.category)) {
      violations.push(item);
      violatingAmount += item.price;

      if (!violationsByCategory[item.category]) {
        violationsByCategory[item.category] = [];
      }
      violationsByCategory[item.category]!.push(item);
    } else {
      allowedItems.push(item);
      approvedAmount += item.price;
    }
  }

  const isApproved = violations.length === 0;

  let explanation: string;
  if (isApproved) {
    explanation =
      receipt.items.length === 0
        ? 'No items found on receipt. Approved by default.'
        : `Policy approved: all ${receipt.items.length} item${receipt.items.length > 1 ? 's' : ''} comply with policy rules.`;
  } else {
    const categorySummary = Object.entries(violationsByCategory)
      .map(([cat, items]) => `${items.length} ${CATEGORY_LABELS[cat as ReceiptCategory] || cat}`)
      .join(', ');

    explanation = `Policy denied: ${violations.length} prohibited item${violations.length > 1 ? 's' : ''} detected (${categorySummary}). Total restricted amount: ${violatingAmount.toFixed(2)}.`;
  }

  return {
    isApproved,
    status: isApproved ? 'approved' : 'denied',
    totalAmount,
    violatingAmount,
    approvedAmount,
    violations,
    violationsByCategory,
    allowedItems,
    explanation,
    evaluatedAt: new Date().toISOString(),
  };
}
