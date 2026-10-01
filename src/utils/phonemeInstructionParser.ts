export interface ArticulationStep {
  stepNumber: number;
  title: string;
  rawHtml: string;
}

export interface MinimalPair {
  left: string;
  right: string;
}

export interface PhonemeRule {
  label: string;
  valueHtml: string;
}

export type InstructionBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; html: string; isTip: boolean }
  | { type: "ordered_list"; items: string[] }
  | { type: "unordered_list"; items: string[] };

export interface ParsedPhonemeInstructions {
  title: string;
  soundTag: string;
  overviewHtml: string;
  steps: ArticulationStep[];
  comparisonHtml: string;
  minimalPairs: MinimalPair[];
  rules: PhonemeRule[];
  tipsHtml: string;
}

export interface InlineTextToken {
  text: string;
  isBold: boolean;
  isItalic: boolean;
}

/**
 * Tokenize simple HTML string with <strong> and <em> tags into structured tokens for React Native Text.
 */
export function parseInlineHtml(html: string): InlineTextToken[] {
  if (!html) return [];

  const clean = html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  const tagRegex = /<(\/)?(strong|b|em|i|code)[^>]*>|<[^>]+>/gi;
  const tokens: InlineTextToken[] = [];
  let lastIndex = 0;
  let isBold = false;
  let isItalic = false;

  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      const text = clean.substring(lastIndex, match.index);
      if (text) {
        tokens.push({ text, isBold, isItalic });
      }
    }
    const isClosing = match[1] === "/";
    const tag = (match[2] || "").toLowerCase();
    if (tag === "strong" || tag === "b") {
      isBold = !isClosing;
    } else if (tag === "em" || tag === "i") {
      isItalic = !isClosing;
    }
    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < clean.length) {
    const text = clean.substring(lastIndex);
    if (text) {
      tokens.push({ text, isBold, isItalic });
    }
  }

  return tokens;
}

/**
 * Heuristically generate an intuitive step title based on step number and language/keywords.
 */
function inferStepTitle(stepNumber: number, text: string, isVi: boolean): string {
  const lower = text.toLowerCase();
  if (isVi) {
    if (lower.includes("lưỡi") || lower.includes("sống lợi")) return "Vị trí lưỡi & hàm";
    if (lower.includes("khe hẹp") || lower.includes("hơi") || lower.includes("ma sát")) return "Luồng hơi & ma sát";
    if (lower.includes("dây thanh") || lower.includes("rung") || lower.includes("cổ họng")) return "Bật rung thanh quản";
    if (lower.includes("môi") || lower.includes("hàm")) return "Khẩu hình môi & hàm";
    if (lower.includes("kéo dài") || lower.includes("mượt mà")) return "Duy trì âm mượt mà";
    return `Bước ${stepNumber}`;
  } else {
    if (lower.includes("tongue") || lower.includes("ridge")) return "Tongue & Ridge Position";
    if (lower.includes("gap") || lower.includes("air") || lower.includes("friction")) return "Airflow & Friction";
    if (lower.includes("voice") || lower.includes("vibrate") || lower.includes("throat") || lower.includes("buzz")) return "Vocal Cord Vibration";
    if (lower.includes("lips") || lower.includes("jaw")) return "Lips & Jaw Shape";
    if (lower.includes("hold") || lower.includes("smoothly")) return "Sustain Sound Smoothly";
    return `Step ${stepNumber}`;
  }
}

/**
 * Parse structured phoneme instruction HTML from backend.
 */
export function parsePhonemeInstructions(html: string): ParsedPhonemeInstructions | null {
  if (!html || typeof html !== "string") return null;

  const isVi = /cách phát âm|hữu thanh|vô thanh|bước|lưỡi|rung/i.test(html);

  // 1. Title (h3)
  const titleMatch = html.match(/<h3[^>]*>(.*?)<\/h3>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  // 2. Overview paragraph (p)
  const pMatches = Array.from(html.matchAll(/<p[^>]*>(.*?)<\/p>/gi)).map((m) => m[1]);
  const overviewHtml = pMatches.length > 0 ? pMatches[0] : "";

  // Extract sound classification tag (e.g. "phụ âm xát lợi hữu thanh" or "voiced alveolar fricative")
  const tagMatch = overviewHtml.match(/<strong[^>]*>(.*?)<\/strong>/i);
  const soundTag = tagMatch ? tagMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  // 3. Step-by-step Articulation Guide (ol -> li)
  const olMatch = html.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i);
  const steps: ArticulationStep[] = [];
  if (olMatch) {
    const liMatches = Array.from(olMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
    liMatches.forEach((m, idx) => {
      const rawHtml = m[1].trim();
      const plain = rawHtml.replace(/<[^>]+>/g, "");
      steps.push({
        stepNumber: idx + 1,
        title: inferStepTitle(idx + 1, plain, isVi),
        rawHtml,
      });
    });
  }

  // 4. Comparison (paragraph with "So sánh" or "Compare")
  let comparisonHtml = "";
  for (const p of pMatches) {
    if (/so sánh|compare/i.test(p)) {
      comparisonHtml = p;
      break;
    }
  }

  // Extract minimal pairs from comparison text (e.g. sip–zip, bus–buzz)
  const minimalPairs: MinimalPair[] = [];
  if (comparisonHtml) {
    const pairRegex = /([a-zA-Z]+)[–—\-]([a-zA-Z]+)/g;
    let match: RegExpExecArray | null;
    while ((match = pairRegex.exec(comparisonHtml)) !== null) {
      minimalPairs.push({ left: match[1], right: match[2] });
    }
  }

  // 5. Sound positions and rules (ul -> li)
  const ulMatch = html.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);
  const rules: PhonemeRule[] = [];
  if (ulMatch) {
    const liMatches = Array.from(ulMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
    for (const m of liMatches) {
      const content = m[1].trim();
      const strongMatch = content.match(/<strong[^>]*>(.*?)<\/strong>/i);
      if (strongMatch) {
        const label = strongMatch[1].replace(/[:：]/g, "").trim();
        const value = content.replace(/<strong[^>]*>.*?<\/strong>[:：]?/i, "").trim();
        rules.push({ label, valueHtml: value });
      } else {
        rules.push({ label: "", valueHtml: content });
      }
    }
  }

  // 6. Practice Tips (paragraph with "Mẹo luyện tập" or "Practice tips")
  let tipsHtml = "";
  for (const p of pMatches) {
    if (/mẹo luyện tập|practice tips|mẹo hay|pro tip/i.test(p)) {
      tipsHtml = p;
      break;
    }
  }

  return {
    title,
    soundTag,
    overviewHtml,
    steps,
    comparisonHtml,
    minimalPairs,
    rules,
    tipsHtml,
  };
}

/**
 * Sequentially parse HTML content into linear blocks (headings, paragraphs, lists)
 * preserving the exact original ordering of the curriculum instructions.
 */
export function parseSequentialHtml(html: string): InstructionBlock[] {
  if (!html || typeof html !== "string") return [];

  const blockRegex = /<(h[1-6]|p|ol|ul|div|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
  const blocks: InstructionBlock[] = [];
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const content = match[2].trim();
    if (!content) continue;

    if (tag.startsWith("h")) {
      const plainText = content.replace(/<[^>]+>/g, "").trim();
      if (plainText) {
        blocks.push({ type: "heading", text: plainText });
      }
    } else if (tag === "ol") {
      const liMatches = Array.from(content.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
        .map((m) => m[1].trim())
        .filter(Boolean);
      if (liMatches.length > 0) {
        blocks.push({ type: "ordered_list", items: liMatches });
      }
    } else if (tag === "ul") {
      const liMatches = Array.from(content.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
        .map((m) => m[1].trim())
        .filter(Boolean);
      if (liMatches.length > 0) {
        blocks.push({ type: "unordered_list", items: liMatches });
      }
    } else {
      // p, div, blockquote
      const isTip = /mẹo|practice tip|tip:|lưu ý|pro tip/i.test(content);
      blocks.push({ type: "paragraph", html: content, isTip });
    }
  }

  // Fallback if no supported HTML blocks matched: split by double newlines or whole text
  if (blocks.length === 0 && html.trim()) {
    const rawParagraphs = html
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (rawParagraphs.length > 0) {
      for (const p of rawParagraphs) {
        const isTip = /mẹo|practice tip|tip:|lưu ý|pro tip/i.test(p);
        blocks.push({ type: "paragraph", html: p, isTip });
      }
    } else {
      blocks.push({ type: "paragraph", html: html.trim(), isTip: false });
    }
  }

  return blocks;
}
