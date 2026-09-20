import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateReceiptPolicy,
  isCategoryRestricted,
  RESTRICTED_CATEGORIES,
} from '../src/services/policyEngine';
import { type ParsedReceipt } from '../src/services/receiptParserBridge';

test('isCategoryRestricted accurately identifies restricted categories', () => {
  assert.strictEqual(RESTRICTED_CATEGORIES.length, 3);
  assert.strictEqual(isCategoryRestricted('unhealthy_drinks'), true);
  assert.strictEqual(isCategoryRestricted('alcohol'), true);
  assert.strictEqual(isCategoryRestricted('tobacco'), true);

  assert.strictEqual(isCategoryRestricted('staple_food'), false);
  assert.strictEqual(isCategoryRestricted('fresh_produce'), false);
  assert.strictEqual(isCategoryRestricted('junk_food'), false);
  assert.strictEqual(isCategoryRestricted('drinks'), false);
  assert.strictEqual(isCategoryRestricted('other'), false);
});

test('evaluateReceiptPolicy approves receipt with only healthy/allowed items', () => {
  const receipt: ParsedReceipt = {
    items: [
      { title: 'Молоко 1л', price: 85.0, category: 'staple_food' },
      { title: 'Яблоки Голден', price: 120.5, category: 'fresh_produce' },
      { title: 'Минеральная вода', price: 55.0, category: 'drinks' },
      { title: 'Печенье овсяное', price: 65.0, category: 'junk_food' },
    ],
    evm_wallets: ['0x9793Dd93D46F153a2A879165cd163A01b54d8A00'],
  };

  const result = evaluateReceiptPolicy(receipt);

  assert.strictEqual(result.isApproved, true);
  assert.strictEqual(result.status, 'approved');
  assert.strictEqual(result.violations.length, 0);
  assert.strictEqual(result.allowedItems.length, 4);
  assert.strictEqual(result.violatingAmount, 0);
  assert.strictEqual(result.totalAmount, 325.5);
  assert.ok(result.explanation.includes('approved'));
});

test('evaluateReceiptPolicy denies receipt with alcohol', () => {
  const receipt: ParsedReceipt = {
    items: [
      { title: 'Хлеб бородинский', price: 45.0, category: 'staple_food' },
      { title: 'Пиво Светлое 0.5л', price: 95.0, category: 'alcohol' },
    ],
    evm_wallets: [],
  };

  const result = evaluateReceiptPolicy(receipt);

  assert.strictEqual(result.isApproved, false);
  assert.strictEqual(result.status, 'denied');
  assert.strictEqual(result.violations.length, 1);
  assert.strictEqual(result.violations[0]?.title, 'Пиво Светлое 0.5л');
  assert.strictEqual(result.violations[0]?.category, 'alcohol');
  assert.strictEqual(result.violatingAmount, 95.0);
  assert.strictEqual(result.totalAmount, 140.0);
  assert.ok(result.explanation.includes('denied'));
  assert.ok(result.explanation.includes('Alcohol'));
});

test('evaluateReceiptPolicy denies receipt with tobacco and unhealthy drinks', () => {
  const receipt: ParsedReceipt = {
    items: [
      { title: 'Сигареты Winston', price: 210.0, category: 'tobacco' },
      { title: 'Энергетический напиток Red Bull', price: 150.0, category: 'unhealthy_drinks' },
      { title: 'Бананы', price: 70.0, category: 'fresh_produce' },
    ],
    evm_wallets: [],
  };

  const result = evaluateReceiptPolicy(receipt);

  assert.strictEqual(result.isApproved, false);
  assert.strictEqual(result.status, 'denied');
  assert.strictEqual(result.violations.length, 2);
  assert.strictEqual(result.violatingAmount, 360.0);
  assert.strictEqual(result.totalAmount, 430.0);
  assert.ok(result.explanation.includes('Tobacco'));
  assert.ok(result.explanation.includes('Unhealthy Drinks'));
});

test('evaluateReceiptPolicy handles empty receipt gracefully', () => {
  const receipt: ParsedReceipt = {
    items: [],
    evm_wallets: [],
  };

  const result = evaluateReceiptPolicy(receipt);

  assert.strictEqual(result.isApproved, true);
  assert.strictEqual(result.status, 'approved');
  assert.strictEqual(result.totalAmount, 0);
  assert.strictEqual(result.violations.length, 0);
});
