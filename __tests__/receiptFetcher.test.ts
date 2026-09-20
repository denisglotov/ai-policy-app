import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cleanHtmlToReceiptText,
  isHtmlContent,
  fetchReceiptFromUrl,
} from '../src/services/receiptFetcher';

test('isHtmlContent correctly detects HTML markup', () => {
  assert.strictEqual(isHtmlContent('<!DOCTYPE html><html><body>Receipt</body></html>'), true);
  assert.strictEqual(isHtmlContent('<div><p>Milk 85.00</p></div>'), true);
  assert.strictEqual(isHtmlContent('Чек № 12345\nХлеб 42.00\nМолоко 85.00'), false);
});

test('cleanHtmlToReceiptText strips scripts, styles, and tags while preserving lines', () => {
  const rawHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>body { font-size: 14px; }</style>
        <script>console.log("tracking");</script>
      </head>
      <body>
        <div>Кассовый чек № 102</div>
        <p>Молоко 1л &nbsp; = 85.00</p>
        <p>Хлеб &amp; Батон = 42.00</p>
        <div>0x9793Dd93D46F153a2A879165cd163A01b54d8A00</div>
      </body>
    </html>
  `;

  const cleaned = cleanHtmlToReceiptText(rawHtml);

  assert.ok(!cleaned.includes('<script>'));
  assert.ok(!cleaned.includes('tracking'));
  assert.ok(!cleaned.includes('<style>'));
  assert.ok(!cleaned.includes('<div>'));
  assert.ok(!cleaned.includes('&nbsp;'));
  assert.ok(!cleaned.includes('&amp;'));

  assert.ok(cleaned.includes('Кассовый чек № 102'));
  assert.ok(cleaned.includes('Молоко 1л = 85.00'));
  assert.ok(cleaned.includes('Хлеб & Батон = 42.00'));
  assert.ok(cleaned.includes('0x9793Dd93D46F153a2A879165cd163A01b54d8A00'));
});

test('fetchReceiptFromUrl rejects non-http protocols', async () => {
  await assert.rejects(
    async () => {
      await fetchReceiptFromUrl('ftp://invalid-url.com');
    },
    { message: /Invalid URL: must start with http:\/\/ or https:\/\// },
  );
});
