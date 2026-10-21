import type { MenuItem } from "@/types/order";

export interface MatchedOrderItem {
  confidence: number;
  id: string;
  lineTotal: number;
  matchedText: string;
  name: string;
  price: number;
  quantity: number;
  status: "matched" | "needs_confirmation";
  notes?: string;
  candidates?: Array<{ id: string; name: string; price: number }>;
}

export interface OrderMatchResult {
  items: MatchedOrderItem[];
  needsConfirmation: MatchedOrderItem[];
  unmatchedPhrases?: string[];
  spokenTotal: string;
  total: number;
}

const QUANTITY_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  single: 1,
  two: 2,
  both: 2,
  couple: 2,
  pair: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  dozen: 12,
};

// Known common aliases / colloquial names for menu items
const MENU_ALIASES: Record<string, string[]> = {
  "wagyu ribeye": ["wagyu rib eye", "wagyu steak", "wagyu", "ribeye", "rib eye"],
  "eye fillet": ["eye filet", "beef fillet", "beef tenderloin"],
  "pan-seared salmon": ["pan seared salmon", "salmon fillet", "seared salmon", "salmon", "king salmon"],
  "truffle mushroom risotto": ["truffle risotto", "mushroom risotto", "truffle mushroom risotto"],
  "wild mushroom risotto": ["mushroom risotto", "wild risotto"],
  "beef carpaccio": ["beef capaccio", "carpaccio"],
  "caesar salad": ["caesar", "cesar salad", "caesar salad"],
  "burrata salad": ["buratta salad", "burrata"],
  "french fries": ["fries", "chips", "french fry"],
  "chocolate fondant": ["fondant", "molten chocolate", "chocolate cake"],
  "creme brulee": ["cream brulee", "creme brule", "crème brûlée"],
  "flat white": ["white coffee", "flat white coffee", "coffee"],
  "sparkling water": ["mineral water", "sparkling mineral water", "sparkling bottle"],
  "espresso martini": ["espresso cocktail"],
  "old fashioned": ["old fashion"],
  "soup of the day": ["today's soup", "daily soup"],
};

// Ambiguous words that appear in multiple menu items and require clarification
const AMBIGUOUS_KEYWORDS: Record<string, string[]> = {
  fillet: ["Eye Fillet", "Market Fish Fillet", "Pan-Seared Salmon"],
  filet: ["Eye Fillet", "Market Fish Fillet", "Pan-Seared Salmon"],
  steak: ["Wagyu Ribeye", "Eye Fillet"],
  salad: ["Caesar Salad", "Burrata Salad"],
  risotto: ["Truffle Mushroom Risotto", "Wild Mushroom Risotto"],
  water: ["Sparkling Water", "Tap Water", "Still Water"],
};

export function normalizeText(value: string): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strips conversational preambles/greetings and trailing politeness phrases.
 */
export function cleanSpeechUtterance(text: string): string {
  if (!text) return "";
  let cleaned = text.trim();

  // Strip leading greetings and conversational fillers (e.g. "Halo.", "Hello,", "Hey", "Excuse me")
  cleaned = cleaned.replace(
    /^(?:halo|hallo|hello|hi|hey|hiya|good evening|good morning|good afternoon|excuse me|um|uh|er|ah|ok|okay|so|please)[,\s.]+/i,
    ""
  );

  // Iteratively strip trailing polite phrases or closing statements (e.g. "please", "that's all", "thank you")
  const trailingRegex =
    /[,\s.]+(?:please|thanks|thank you|that'?s all|that is all|that'?s it|that is it|for now|that will be all|that'll be all|too|as well)[.?!]*$/i;
  while (trailingRegex.test(cleaned)) {
    cleaned = cleaned.replace(trailingRegex, "").trim();
  }

  return cleaned.trim();
}

/**
 * Checks if user speech contains explicit order intent.
 */
export function hasExplicitOrderIntent(text: string): boolean {
  const cleaned = cleanSpeechUtterance(text);
  const norm = normalizeText(cleaned);

  const intentPatterns = [
    /\b(?:i'll have|i will have|i'd like|i would like|can i get|can i have|could i get|could i have|may i have|may i get|can we get|can we have|could we get|could we have)\b/,
    /\b(?:please bring|bring me|give me|add|order|we'll have|we will have|we'd like|we would like)\b/,
    /\b(?:put me down for|i want to order|i want|we want)\b/,
    /^\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|couple|pair|a|an)\s+[a-z]/i,
  ];

  return intentPatterns.some((p) => p.test(norm));
}

/**
 * Checks if a sentence is an inquiry/question rather than an order placement.
 */
export function isQuestionOrInquiry(text: string): boolean {
  const norm = normalizeText(text);
  if (!norm) return false;

  const inquiryTriggers = [
    /\b(what is|what's|what are|what do you have|what drinks|what food)\b/,
    /\b(how much is|how much are|how much does|how much for|price of|cost of)\b/,
    /\b(do you have|do you serve|do you offer|do you make)\b/,
    /\b(is there|are there|can you tell me|could you tell me|tell me about)\b/,
    /\b(what do you recommend|any recommendations|any specials|what's popular)\b/,
    /\b(what kind of|what type of|what sort of)\b/,
    /\b(is the [a-z\s]+ gluten free|does the [a-z\s]+ have|does it contain|any dairy|allergens)\b/,
    /\b(how big is|what size is|how is it cooked|what comes with)\b/,
  ];

  if (inquiryTriggers.some((trigger) => trigger.test(norm))) {
    return true;
  }

  // If text contains explicit ordering intent like "can I have", "can I get", "could I have", "i'd like",
  // it is an ORDER, NOT an inquiry, even if transcribed with a question mark "?"!
  if (hasExplicitOrderIntent(text)) {
    return false;
  }

  return text.includes("?");
}

/**
 * Checks if a statement requests order cancellation or clearing all items.
 */
export function isCancellationOrClear(text: string): boolean {
  const norm = normalizeText(text);
  const clearCommands = [
    "cancel order",
    "clear order",
    "delete order",
    "empty order",
    "remove everything",
    "cancel everything",
    "start again",
    "start over",
    "reset order",
  ];
  return clearCommands.some((cmd) => norm.includes(cmd));
}

/**
 * Parses numeric or word quantities.
 */
export function parseWordQuantity(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const num = parseInt(val, 10);
  if (!isNaN(num) && num > 0) return num;
  return QUANTITY_WORDS[val.toLowerCase()];
}

/**
 * Extracts cooking / dietary preferences (e.g. "medium rare", "no onions").
 */
export function extractNotes(text: string): { notes?: string; cleanedText: string } {
  let cleaned = text;
  const notesMatch = text.match(
    /\b(rare|medium rare|medium well|medium|well done|no onions?|no dairy|no ice|gluten free|extra spicy|dressing on the side|on the rocks|with ice|extra sauce)\b/i
  );
  if (notesMatch) {
    const notes = notesMatch[0].trim();
    cleaned = cleaned.replace(notesMatch[0], " ").replace(/\s+/g, " ").trim();
    return { notes, cleanedText: cleaned };
  }
  return { cleanedText: text };
}

/**
 * Detects quantity corrections like:
 * "make that two, not three", "change to two", "make it 2 instead of 3", "two not three"
 */
export function parseCorrection(text: string): {
  isCorrection: boolean;
  targetQuantity?: number;
  rejectedQuantity?: number;
  itemHint?: string;
} {
  const norm = normalizeText(text);
  // Strip leading filler words
  const cleaned = norm.replace(/^(?:actually|please|oh|wait|so|hey|hi)\s+/i, "").trim();

  // Pattern 1: "[make that/change to] [qty] [optional item] not/instead of [rejectedQty]"
  const notPattern =
    /^(?:(?:make that|change that to|change to|make it|set to)\s+)?([a-z0-9]+)(?:\s+([a-z\s]+?))?\s+(?:not|instead of)\s+([a-z0-9]+)$/i;
  const match = cleaned.match(notPattern);

  if (match) {
    const targetQty = parseWordQuantity(match[1]);
    const rejectedQty = parseWordQuantity(match[3]);
    if (targetQty !== undefined) {
      return {
        isCorrection: true,
        targetQuantity: targetQty,
        rejectedQuantity: rejectedQty,
        itemHint: match[2]?.trim() || undefined,
      };
    }
  }

  // Pattern 2: "change [item] to [qty]" or "make the [item] [qty]"
  const changePattern =
    /^(?:change|make|set|update)\s+(?:the\s+)?([a-z\s]+?)\s+(?:to|be)\s+([a-z0-9]+)$/i;
  const changeMatch = cleaned.match(changePattern);
  if (changeMatch) {
    const targetQty = parseWordQuantity(changeMatch[2]);
    if (targetQty !== undefined) {
      return {
        isCorrection: true,
        targetQuantity: targetQty,
        itemHint: changeMatch[1].trim(),
      };
    }
  }

  // Pattern 3: "just [qty] [optional item]"
  const justPattern =
    /^(?:just|only)\s+([a-z0-9]+)(?:\s+(?:of\s+)?([a-z\s]+))?$/i;
  const justMatch = cleaned.match(justPattern);
  if (justMatch) {
    const targetQty = parseWordQuantity(justMatch[1]);
    if (targetQty !== undefined) {
      return {
        isCorrection: true,
        targetQuantity: targetQty,
        itemHint: justMatch[2]?.trim() || undefined,
      };
    }
  }

  return { isCorrection: false };
}


/**
 * Detects negative statements / item removals:
 * "I don't want fries", "No fries", "Without fries", "Cancel the salad", "Remove wagyu"
 */
export function parseRemovalOrNegation(
  text: string,
  menu: MenuItem[]
): { isRemoval: boolean; matchedItem?: MenuItem; quantityToRemove?: number } {
  const norm = normalizeText(text);

  const negationPatterns = [
    /\b(?:i\s+)?(?:don't|dont|do not)\s+want\s+(?:any\s+|the\s+|an?\s+)?([a-z\s]+)/i,
    /\b(?:no|without|not)\s+(?:any\s+|the\s+|an?\s+)?([a-z\s]+)/i,
    /\b(?:cancel|remove|delete|drop|take off)\s+(?:the\s+|an?\s+)?([a-z\s]+)/i,
    /\b([a-z\s]+)\s+(?:no thank you|no thanks|actually no|not that)\b/i,
  ];

  for (const pattern of negationPatterns) {
    const match = norm.match(pattern);
    if (match) {
      const phrase = match[1]
        .replace(/\b(thanks|thank you|please|for me)\b/gi, "")
        .trim();
      const matchResult = findBestMenuMatch(phrase, menu);
      if (matchResult && matchResult.confidence >= 0.72) {
        return {
          isRemoval: true,
          matchedItem: matchResult.item,
          quantityToRemove: 1,
        };
      }
    }
  }

  return { isRemoval: false };
}



/**
 * Check if a word/query is a known ambiguous generic term matching multiple items.
 */
export function checkAmbiguity(
  query: string,
  menu: MenuItem[]
): { isAmbiguous: boolean; candidates: MenuItem[] } {
  const normQuery = normalizeText(query);
  const words = normQuery.split(" ").filter((w) => w.length > 2);

  for (const word of words) {
    if (AMBIGUOUS_KEYWORDS[word]) {
      // Find matching items currently in active menu
      const matchingItems = menu.filter((item) => {
        const normName = normalizeText(item.name);
        return (
          normName.includes(word) ||
          AMBIGUOUS_KEYWORDS[word].some((cand) =>
            normalizeText(cand) === normName
          )
        );
      });

      if (matchingItems.length > 1) {
        return { isAmbiguous: true, candidates: matchingItems };
      }
    }
  }

  return { isAmbiguous: false, candidates: [] };
}

/**
 * Match a single phrase to the best menu item.
 */
export function findBestMenuMatch(
  phrase: string,
  menu: MenuItem[]
): { confidence: number; item: MenuItem } | null {
  const normQuery = normalizeText(phrase);
  if (!normQuery || menu.length === 0) return null;

  // 1. Direct exact name match
  const exact = menu.find((m) => normalizeText(m.name) === normQuery);
  if (exact) {
    return { confidence: 1.0, item: exact };
  }

  // 2. Direct alias match
  for (const item of menu) {
    const normName = normalizeText(item.name);
    const aliases = MENU_ALIASES[normName] || [];
    for (const alias of aliases) {
      if (normQuery === normalizeText(alias)) {
        return { confidence: 0.98, item };
      }
      if (normQuery.includes(normalizeText(alias)) || normalizeText(alias).includes(normQuery)) {
        const lenRatio = Math.min(normQuery.length, alias.length) / Math.max(normQuery.length, alias.length);
        if (lenRatio >= 0.7) {
          return { confidence: 0.92, item };
        }
      }
    }
  }

  // 3. String similarity & token scoring
  let best: { confidence: number; item: MenuItem } | null = null;

  for (const item of menu) {
    const normItemName = normalizeText(item.name);

    if (normQuery === normItemName) {
      return { confidence: 1.0, item };
    }

    // Levenshtein & token match
    const sim = calculateSimilarity(normQuery, normItemName);
    const queryTokens = normQuery.split(" ").filter((w) => w.length > 2);
    const itemTokens = normItemName.split(" ").filter((w) => w.length > 2);

    let matchedTokens = 0;
    for (const qt of queryTokens) {
      if (itemTokens.some((it) => it === qt || calculateSimilarity(qt, it) > 0.8)) {
        matchedTokens++;
      }
    }

    const tokenRatio = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0;
    const score = Math.max(sim, tokenRatio * 0.9);

    if (!best || score > best.confidence) {
      best = { confidence: score, item };
    }
  }

  return best;
}

function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshtein(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

function levenshtein(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];
  for (let i = 0; i <= an; i++) matrix[i] = [i];
  for (let j = 0; j <= bn; j++) matrix[0][j] = j;

  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[an][bn];
}

/**
 * Main Order Matcher that processes utterances sequentially into an accurate draft order.
 */
export function matchOrderFromTranscript(
  transcript: string,
  menu: MenuItem[]
): OrderMatchResult {
  if (!transcript || !transcript.trim() || !menu || menu.length === 0) {
    return {
      items: [],
      needsConfirmation: [],
      spokenTotal: "",
      total: 0,
    };
  }

  // Split transcript into discrete statements by newline, semicolon, 'and', or sentence boundaries
  const statements = transcript
    .split(/(?:\r?\n|;|\band\b|(?<!\d)\.(?!\d))+/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const draftItems = new Map<string, MatchedOrderItem>();
  const needsConfirmationMap = new Map<string, MatchedOrderItem>();
  const unmatchedPhrases: string[] = [];
  let lastOrderedItemId: string | null = null;

  for (const rawStatement of statements) {
    const cleanStmt = cleanSpeechUtterance(rawStatement);
    if (!cleanStmt && !rawStatement) continue;

    // 1. Check for cancellation / clear
    if (isCancellationOrClear(cleanStmt) || isCancellationOrClear(rawStatement)) {
      draftItems.clear();
      needsConfirmationMap.clear();
      unmatchedPhrases.length = 0;
      lastOrderedItemId = null;
      continue;
    }

    // 2. Check for Inquiry / Question (e.g. "Do you have sparkling water?")
    // Inquiries MUST NEVER add or modify draft items!
    if (isQuestionOrInquiry(cleanStmt) || isQuestionOrInquiry(rawStatement)) {
      continue;
    }

    // 3. Check for Correction (e.g. "make that two, not three")
    const correction = parseCorrection(cleanStmt);
    if (correction.isCorrection && correction.targetQuantity !== undefined) {
      let targetItem: MatchedOrderItem | undefined = undefined;

      if (correction.itemHint) {
        const hintMatch = findBestMenuMatch(correction.itemHint, menu);
        if (hintMatch && hintMatch.confidence >= 0.7) {
          targetItem = draftItems.get(hintMatch.item.id || hintMatch.item.name);
        }
      }

      if (!targetItem && lastOrderedItemId) {
        targetItem = draftItems.get(lastOrderedItemId);
      }

      if (targetItem) {
        targetItem.quantity = correction.targetQuantity;
        targetItem.lineTotal = Number((targetItem.quantity * targetItem.price).toFixed(2));
        if (targetItem.quantity <= 0) {
          draftItems.delete(targetItem.id);
        }
      }
      continue;
    }

    // 4. Check for Removal / Negation (e.g. "I don't want fries", "no fries")
    const removal = parseRemovalOrNegation(cleanStmt, menu);
    if (removal.isRemoval && removal.matchedItem) {
      const key = removal.matchedItem.id || removal.matchedItem.name;
      const existing = draftItems.get(key);
      if (existing) {
        existing.quantity -= removal.quantityToRemove || 1;
        existing.lineTotal = Number((existing.quantity * existing.price).toFixed(2));
        if (existing.quantity <= 0) {
          draftItems.delete(key);
        }
      }
      // If item was not in the draft, doing nothing is correct. Never add it!
      continue;
    }

    // 5. Must have explicit ordering intent or clear quantity + item structure
    if (!hasExplicitOrderIntent(rawStatement) && !hasExplicitOrderIntent(cleanStmt)) {
      // If there's no explicit order intent, do not add random words from casual conversation
      continue;
    }

    // 6. Extract quantity, cooking preferences, and menu item phrase
    const { notes, cleanedText } = extractNotes(cleanStmt);

    // Extract leading quantity
    let quantity = 1;
    let itemPhrase = cleanedText;

    const qtyMatch = cleanedText.match(
      /^(?:i'll have|i will have|i'd like|i would like|can i get|can i have|could i get|could i have|may i have|may i get|can we get|can we have|could we get|could we have|please bring|bring me|give me|add|order)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|couple|pair|a|an)\s+(?:orders?|portions?|plates?|glasses?|bottles?|of\s+)?(.*)$/i
    );

    if (qtyMatch) {
      const parsedQty = parseWordQuantity(qtyMatch[1]);
      if (parsedQty !== undefined && parsedQty > 0) {
        quantity = parsedQty;
        itemPhrase = qtyMatch[2].trim();
      }
    } else {
      // Strip conversational prefixes
      itemPhrase = cleanedText
        .replace(
          /^(?:i'll have|i will have|i'd like|i would like|can i get|can i have|could i get|could i have|may i have|may i get|can we get|can we have|could we get|could we have|please bring|bring me|give me|add|order)\s+/i,
          ""
        )
        .trim();
    }

    // Strip leading "the", "a", or "an" from item phrase (e.g. "the Wagyu Ribeye" -> "Wagyu Ribeye")
    itemPhrase = itemPhrase.replace(/^(?:the|an?)\s+/i, "").trim();

    // Clean any trailing filler again from itemPhrase
    itemPhrase = cleanSpeechUtterance(itemPhrase);

    // Check for Ambiguity (e.g. "fillet" matching multiple items)
    const ambiguity = checkAmbiguity(itemPhrase, menu);
    if (ambiguity.isAmbiguous && ambiguity.candidates.length > 1) {
      const ambKey = `ambiguous:${itemPhrase}`;
      needsConfirmationMap.set(ambKey, {
        id: ambKey,
        name: `Clarification needed: ${ambiguity.candidates.map((c) => c.name).join(" or ")}`,
        quantity,
        price: 0,
        lineTotal: 0,
        confidence: 0.7,
        matchedText: itemPhrase,
        status: "needs_confirmation",
        candidates: ambiguity.candidates.map((c) => ({
          id: c.id || c.name,
          name: c.name,
          price: c.price,
        })),
      });
      continue;
    }

    // Match against active menu
    const match = findBestMenuMatch(itemPhrase, menu);
    if (!match || match.confidence < 0.75) {
      if (itemPhrase && itemPhrase.length >= 2) {
        unmatchedPhrases.push(itemPhrase);
      }
      continue;
    }

    const item = match.item;
    const key = item.id || item.name;
    const price = Number(item.price);

    const existing = draftItems.get(key);
    if (existing) {
      existing.quantity += quantity;
      existing.lineTotal = Number((existing.quantity * price).toFixed(2));
      if (notes && !existing.notes?.includes(notes)) {
        existing.notes = existing.notes ? `${existing.notes}; ${notes}` : notes;
      }
      lastOrderedItemId = key;
    } else {
      draftItems.set(key, {
        id: item.id || item.name,
        name: item.name,
        quantity,
        price,
        lineTotal: Number((quantity * price).toFixed(2)),
        confidence: match.confidence,
        matchedText: itemPhrase,
        status: "matched",
        notes,
      });
      lastOrderedItemId = key;
    }
  }

  const items = Array.from(draftItems.values());
  const needsConfirmation = Array.from(needsConfirmationMap.values());
  const total = Number(
    items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
  );

  return {
    items,
    needsConfirmation,
    unmatchedPhrases,
    spokenTotal:
      total > 0
        ? `This is the total after calculating: $${total.toFixed(2)}.`
        : "",
    total,
  };
}
