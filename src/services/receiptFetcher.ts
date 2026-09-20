import { MAX_RECEIPT_INPUT_SIZE_BYTES, getReceiptByteLength } from './receiptParserBridge';

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Strips HTML tags, scripts, styles, and decodes HTML entities to produce clean plain text.
 */
export function cleanHtmlToReceiptText(html: string): string {
  let text = html;

  // 1. Remove scripts, styles, and SVGs
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');

  // 2. Insert line breaks before block-level elements
  text = text.replace(/<(?:div|p|h[1-6]|tr|li|br|header|footer|section|article)[^>]*>/gi, '\n');

  // 3. Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // 4. Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // 5. Clean up redundant spaces and blank lines while preserving line structure
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * Checks if a string contains HTML markup.
 */
export function isHtmlContent(content: string): boolean {
  return /<!DOCTYPE\s+html|<(?:html|head|body|div|p|span|table)\b/i.test(content);
}

export interface FetchReceiptOptions {
  timeoutMs?: number;
  customHeaders?: Record<string, string>;
}

/**
 * Fetches content from a URL and extracts clean receipt text.
 */
export async function fetchReceiptFromUrl(
  rawUrl: string,
  options: FetchReceiptOptions = {},
): Promise<string> {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    throw new Error('Invalid URL: must start with http:// or https://');
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let responseText: string;
  try {
    const response = await fetch(trimmedUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html, text/plain, application/json, */*',
        'User-Agent': 'ReceiptPolicyScanner/1.0',
        ...options.customHeaders,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch receipt: HTTP ${response.status} ${response.statusText}`);
    }

    responseText = await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Receipt fetch timed out after ${timeoutMs}ms`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  // Clean HTML if detected, otherwise trim plain text
  const cleanText = isHtmlContent(responseText)
    ? cleanHtmlToReceiptText(responseText)
    : responseText.trim();

  if (!cleanText) {
    throw new Error('Fetched receipt content is empty');
  }

  const byteLength = getReceiptByteLength(cleanText);
  if (byteLength > MAX_RECEIPT_INPUT_SIZE_BYTES) {
    throw new Error(
      `Extracted receipt text (${byteLength} bytes) exceeds the maximum allowed size of 50KB (${MAX_RECEIPT_INPUT_SIZE_BYTES} bytes)`,
    );
  }

  return cleanText;
}
