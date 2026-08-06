import type { MenuItem } from "@/types/order";

const MATCH_THRESHOLD = 0.62;
const CONFIRM_THRESHOLD = 0.78;
const ORDER_INTENT_WORDS = [
  "add",
  "another",
  "can",
  "change",
  "delete",
  "get",
  "have",
  "like",
  "make",
  "order",
  "remove",
  "set",
  "take",
  "want",
];

const QUANTITY_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  both: 2,
  couple: 2,
  dozen: 12,
  eight: 8,
  eleven: 11,
  five: 5,
  four: 4,
  nine: 9,
  one: 1,
  seven: 7,
  six: 6,
  ten: 10,
  three: 3,
  twelve: 12,
  two: 2,
};

const MENU_ALIASES: Record<string, string[]> = {
  "beef carpaccio": ["beef capaccio", "carpaccio"],
  "burrata salad": ["buratta salad", "barata salad", "burrata"],
  cheesecake: ["cheese cake"],
  "chocolate fondant": ["chocolate fondant", "fondant"],
  "creme brulee": ["cream brulee", "creme brule"],
  "espresso martini": ["expresso martini", "espresso"],
  "eye fillet": ["eye filet", "eye fill it", "ifile"],
  "herb crusted lamb rack": ["lamb rack", "herb lamb rack"],
  "market fish": ["market fresh", "fresh fish", "fish"],
  "old fashioned": ["old fashion"],
  "soup of the day": ["soup of day", "today soup", "today's soup", "soup"],
  "sparkling water": ["mineral water", "sparkling", "water"],
  "wagyu ribeye": [
    "wagyu rib eye",
    "wag you ribeye",
    "wag you rib eye",
    "your repay",
    "your ribeye",
  ],
  "wild mushroom risotto": ["mushroom risotto", "risotto"],
};

interface Candidate {
  confidence: number;
  end: number;
  item: MenuItem;
  matchedText: string;
  operation: "add" | "remove" | "set";
  quantity: number;
  start: number;
}

export interface MatchedOrderItem {
  confidence: number;
  id: string;
  lineTotal: number;
  matchedText: string;
  name: string;
  price: number;
  quantity: number;
  status: "matched" | "needs_confirmation";
}

export interface OrderMatchResult {
  items: MatchedOrderItem[];
  needsConfirmation: MatchedOrderItem[];
  spokenTotal: string;
  total: number;
}

interface Variant {
  text: string;
  weight: number;
}

export function matchOrderFromTranscript(
  transcript: string,
  menu: MenuItem[]
): OrderMatchResult {
  const tokens = tokenize(stripClearedHistory(transcript));
  const maxWindow = Math.max(
    2,
    ...menu.map((item) => normalizeText(item.name).split(" ").length + 2)
  );
  const candidates: Candidate[] = [];

  for (let start = 0; start < tokens.length; start += 1) {
    for (let size = 1; size <= maxWindow && start + size <= tokens.length; size += 1) {
      const windowTokens = tokens.slice(start, start + size);
      const { phraseTokens, quantity } = stripLeadingQuantity(windowTokens);
      if (phraseTokens.length === 0) continue;

      const phrase = phraseTokens.join(" ");
      const match = findBestMenuMatch(phrase, menu);
      if (!match || match.confidence < MATCH_THRESHOLD) continue;
      if (!shouldAcceptCandidate(tokens, start, start + size - 1, match.confidence)) {
        continue;
      }

      candidates.push({
        confidence: match.confidence,
        end: start + size - 1,
        item: match.item,
        matchedText: phrase,
        operation: detectOperation(tokens, start),
        quantity:
          quantity ??
          readPreviousQuantity(tokens, start) ??
          readFollowingQuantity(tokens, start + size - 1) ??
          1,
        start,
      });
    }
  }

  const selected = selectNonOverlapping(candidates);
  const merged = buildOrderItems(selected);
  const items = merged.filter(
    (item) => item.status === "matched" && item.quantity > 0
  );
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    items,
    needsConfirmation: merged.filter(
      (item) => item.status === "needs_confirmation"
    ),
    spokenTotal:
      total > 0
        ? `This is the total after calculating: $${total.toFixed(2)}.`
        : "",
    total,
  };
}

function findBestMenuMatch(
  phrase: string,
  menu: MenuItem[]
): { confidence: number; item: MenuItem } | null {
  let best: { confidence: number; item: MenuItem } | null = null;

  menu.forEach((item) => {
    const confidence = Math.max(
      ...getItemVariants(item.name).map((variant) =>
        scorePhraseAgainstVariant(phrase, variant)
      )
    );

    if (!best || confidence > best.confidence) {
      best = { confidence, item };
    }
  });

  return best;
}

function scorePhraseAgainstVariant(phrase: string, variant: Variant): number {
  if (!phrase || !variant.text) return 0;
  if (phrase === variant.text) return variant.weight;

  const phraseTokens = phrase.split(" ");
  const variantTokens = variant.text.split(" ");

  if (phrase.includes(variant.text) || variant.text.includes(phrase)) {
    const coverage =
      Math.min(phraseTokens.length, variantTokens.length) /
      Math.max(phraseTokens.length, variantTokens.length);
    return (0.68 + coverage * 0.2) * variant.weight;
  }

  const typoScore = averageBestTokenScore(phraseTokens, variantTokens, levenshteinScore);
  const phoneticScore = averageBestTokenScore(phraseTokens, variantTokens, phoneticScoreForWords);

  if (phraseTokens.length < variantTokens.length) {
    return Math.max(typoScore * 0.72, phoneticScore * 0.68) * variant.weight;
  }

  return Math.max(typoScore * 0.86, phoneticScore * 0.78) * variant.weight;
}

function getItemVariants(name: string): Variant[] {
  const normalizedName = normalizeText(name);
  const words = normalizedName.split(" ");
  const compactWords = words.filter((word) => !["and", "of", "the"].includes(word));
  const aliases = MENU_ALIASES[normalizedName] ?? [];
  const partials = new Set<string>();

  if (compactWords.length > 1) partials.add(compactWords.join(" "));
  if (words.length > 1) partials.add(words.slice(-2).join(" "));
  words.forEach((word) => {
    if (word.length >= 5) partials.add(word);
  });

  return [
    { text: normalizedName, weight: 1 },
    ...aliases.map((alias) => ({ text: normalizeText(alias), weight: 0.9 })),
    ...Array.from(partials).map((partial) => ({ text: partial, weight: 0.82 })),
  ];
}

function selectNonOverlapping(candidates: Candidate[]): Candidate[] {
  const selected: Candidate[] = [];
  const sorted = [...candidates].sort((left, right) => {
    const leftLength = left.end - left.start;
    const rightLength = right.end - right.start;
    return right.confidence - left.confidence || rightLength - leftLength;
  });

  sorted.forEach((candidate) => {
    const overlaps = selected.some(
      (item) => candidate.start <= item.end && candidate.end >= item.start
    );
    if (!overlaps) selected.push(candidate);
  });

  return selected.sort((left, right) => left.start - right.start);
}

function buildOrderItems(candidates: Candidate[]): MatchedOrderItem[] {
  const byId = new Map<string, MatchedOrderItem>();

  candidates.forEach((candidate) => {
    const id = candidate.item.id ?? candidate.item.name;
    const status =
      candidate.confidence >= CONFIRM_THRESHOLD ? "matched" : "needs_confirmation";
    const existing = byId.get(`${id}:${status}`);
    const nextQuantity = calculateNextQuantity(existing?.quantity ?? 0, candidate);

    if (!existing) {
      if (candidate.operation === "remove") return;

      byId.set(`${id}:${status}`, {
        confidence: roundConfidence(candidate.confidence),
        id,
        lineTotal: status === "matched" ? nextQuantity * candidate.item.price : 0,
        matchedText: candidate.matchedText,
        name: candidate.item.name,
        price: candidate.item.price,
        quantity: nextQuantity,
        status,
      });
      return;
    }

    existing.quantity = nextQuantity;
    existing.confidence = Math.max(existing.confidence, roundConfidence(candidate.confidence));
    existing.matchedText = `${existing.matchedText}, ${candidate.matchedText}`;
    existing.lineTotal =
      existing.status === "matched" ? existing.quantity * existing.price : 0;

    if (existing.quantity <= 0) {
      byId.delete(`${id}:${status}`);
    }
  });

  return Array.from(byId.values());
}

function calculateNextQuantity(currentQuantity: number, candidate: Candidate): number {
  if (candidate.operation === "set") {
    return candidate.quantity;
  }

  if (candidate.operation === "remove") {
    return Math.max(0, currentQuantity - candidate.quantity);
  }

  return currentQuantity + candidate.quantity;
}

function stripLeadingQuantity(tokens: string[]): {
  phraseTokens: string[];
  quantity?: number;
} {
  const first = tokens[0];
  const quantity = first ? readQuantity(first) : undefined;

  if (quantity && tokens.length > 1) {
    return {
      phraseTokens: tokens.slice(1),
      quantity,
    };
  }

  return {
    phraseTokens: tokens,
  };
}

function readPreviousQuantity(tokens: string[], start: number): number | undefined {
  if (start === 0) return undefined;

  const previous = tokens[start - 1];
  const quantity = readQuantity(previous);

  return quantity || undefined;
}

function readFollowingQuantity(tokens: string[], end: number): number | undefined {
  const next = tokens[end + 1];
  const afterNext = tokens[end + 2];

  return readQuantity(next) ?? (next === "to" ? readQuantity(afterNext) : undefined);
}

function readQuantity(value: string | undefined): number | undefined {
  if (!value) return undefined;

  const numericQuantity = Number.parseInt(value, 10);
  if (Number.isFinite(numericQuantity)) return numericQuantity;

  return QUANTITY_WORDS[value];
}

function detectOperation(tokens: string[], start: number): Candidate["operation"] {
  const nearby = tokens.slice(Math.max(0, start - 5), start);

  if (
    nearby.some((token) =>
      ["cancel", "delete", "dont", "don't", "minus", "no", "not", "remove", "without"].includes(token)
    )
  ) {
    return "remove";
  }

  if (
    nearby.some((token) =>
      ["change", "make", "set", "update"].includes(token)
    )
  ) {
    return "set";
  }

  return "add";
}

function shouldAcceptCandidate(
  tokens: string[],
  start: number,
  end: number,
  confidence: number
): boolean {
  if (confidence >= 0.92) return true;

  const nearby = tokens.slice(Math.max(0, start - 5), Math.min(tokens.length, end + 4));
  return nearby.some((token) => ORDER_INTENT_WORDS.includes(token));
}

function stripClearedHistory(transcript: string): string {
  const normalized = normalizeText(transcript);
  const clearCommands = [
    "cancel order",
    "clear order",
    "delete order",
    "remove everything",
    "start again",
    "start over",
  ];
  let clearIndex = -1;

  clearCommands.forEach((command) => {
    const index = normalized.lastIndexOf(command);
    if (index > clearIndex) clearIndex = index + command.length;
  });

  return clearIndex === -1 ? transcript : normalized.slice(clearIndex);
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 0);
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function averageBestTokenScore(
  sourceTokens: string[],
  targetTokens: string[],
  scorer: (source: string, target: string) => number
): number {
  if (sourceTokens.length === 0 || targetTokens.length === 0) return 0;

  const scores = sourceTokens.map((source) =>
    Math.max(...targetTokens.map((target) => scorer(source, target)))
  );

  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

function levenshteinScore(left: string, right: string): number {
  if (left === right) return 1;

  const distance = levenshteinDistance(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function phoneticScoreForWords(left: string, right: string): number {
  return soundex(left) === soundex(right) ? 1 : 0;
}

function soundex(value: string): string {
  const cleaned = value.replace(/[^a-z]/g, "");
  if (!cleaned) return "";

  const [firstLetter] = cleaned;
  const encoded = cleaned
    .slice(1)
    .split("")
    .map((letter) => {
      if ("bfpv".includes(letter)) return "1";
      if ("cgjkqsxz".includes(letter)) return "2";
      if ("dt".includes(letter)) return "3";
      if (letter === "l") return "4";
      if ("mn".includes(letter)) return "5";
      if (letter === "r") return "6";
      return "";
    })
    .filter((code, index, codes) => code && code !== codes[index - 1])
    .join("");

  return `${firstLetter}${encoded}000`.slice(0, 4);
}

function levenshteinDistance(left: string, right: string): number {
  const distances = Array.from({ length: left.length + 1 }, (_, index) => index);

  for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
    let previous = rightIndex;

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      const current = distances[leftIndex];
      distances[leftIndex] =
        left[leftIndex - 1] === right[rightIndex - 1]
          ? previous
          : Math.min(previous, distances[leftIndex], distances[leftIndex - 1]) + 1;
      previous = current;
    }

    distances[0] = rightIndex;
  }

  return distances[left.length];
}

function roundConfidence(confidence: number): number {
  return Math.round(confidence * 100) / 100;
}
