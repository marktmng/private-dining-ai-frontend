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
  hasOrderOperations?: boolean;
  wasCleared?: boolean;
  lastAction?: {
    type: "add" | "remove" | "clear" | "correction";
    itemName?: string;
    quantity?: number;
  };
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

// Known common aliases / colloquial names for menu items across various English accents
const MENU_ALIASES: Record<string, string[]> = {
  "wagyu ribeye": [
    "anything from menu",
    "anything from the menu",
    "something from menu",
    "something from the menu",
    "chef's special",
    "chef special",
    "signature dish",
    "signature steak",
    "giveaway",
    "give away",
    "give a rib eye",
    "give a ribeye",
    "give ribeye",
    "give me ribeye",
    "wagyu rib eye",
    "wagyu steak",
    "wagyu",
    "ribeye",
    "rib eye",
    "wagyu beef",
    "wagyu rebeye",
    "wagu ribeye",
    "wagu rebeye",
    "wagy ribeye",
    "wagy rebeye",
    "wagi ribeye",
    "wagi rebeye",
    "wagu",
    "rebeye",
    "repay",
    "wagyu rib",
    "wagyu rebye",
    "banky repay",
    "banky ribeye",
    "banky rebeye",
    "bank repay",
    "wanky repay",
    "wank repay",
    "wanky ribeye",
    "wagyu rib-eye",
    "the ribeye",
    "the wagyu",
    "wagyu cut",
    "wagyu beef steak",
    "japanese steak",
    "japanese beef",
  ],
  "eye fillet": [
    "i feel it",
    "can you give me i feel it",
    "give me i feel it",
    "eye feel it",
    "feel it",
    "i fill it",
    "eye fill it",
    "i fell it",
    "eye fell it",
    "feel it steak",
    "fill it steak",
    "fill it",
    "the feel it",
    "the fillet",
    "the filet",
    "can you give me eye fillet",
    "affiliate",
    "an affiliate",
    "the affiliate",
    "a affiliate",
    "affiliates",
    "affilate",
    "affilite",
    "eye fillet",
    "eye filet",
    "beef fillet",
    "beef tenderloin",
    "eye fillete",
    "i fillet",
    "i filet",
    "ai fillet",
    "ai filet",
    "aye fillet",
    "aye filet",
    "high fillet",
    "hi fillet",
    "eye fellit",
    "eye philip",
    "eye philet",
    "i-fillet",
    "tenderloin",
    "fillet steak",
    "beef eye fillet",
    "the eye fillet",
    "grass fed fillet",
    "eye-fillet",
  ],
  "pan seared salmon": [
    "pan-seared salmon",
    "pan seared salmon",
    "pan seared samon",
    "salmon fillet",
    "seared salmon",
    "salmon",
    "king salmon",
    "bench here at salmon",
    "bench here salmon",
    "bench seared salmon",
    "pan share at salmon",
    "pan share salmon",
    "punch here at salmon",
    "pen seared salmon",
    "pan steer salmon",
    "pan seared",
    "pan-seared",
    "seared salmon fillet",
    "salmon steak",
    "crispy salmon",
    "crispy skin salmon",
    "king salmon fillet",
    "the salmon",
  ],
  "truffle mushroom risotto": [
    "truffle risotto",
    "mushroom risotto",
    "truffle mushroom risotto",
    "wild mushroom risotto",
    "mushroom risotto",
    "risotto",
    "truffle mushroom",
    "truffle rise otto",
    "truffle resotto",
    "resotto",
    "resoto",
    "mushroom risoto",
    "truffle rice",
    "mushroom rice",
    "arborio rice",
    "black truffle risotto",
    "the risotto",
  ],
  "wild mushroom risotto": ["mushroom risotto", "wild risotto", "risotto"],
  "beef carpaccio": [
    "beef capaccio",
    "carpaccio",
    "beef carpacio",
    "beef carpaco",
    "beef carpatchio",
    "beef car patchio",
    "car patchio",
    "carpatchio",
    "carpacio",
    "beef carpasho",
    "raw beef",
    "the carpaccio",
  ],
  "caesar salad": [
    "caesar",
    "cesar salad",
    "caesar salad",
    "ceaser salad",
    "caeser salad",
    "seasar salad",
    "seizer salad",
    "scissor salad",
    "seize a salad",
    "sizer salad",
    "cesar",
    "ceaser",
    "cos salad",
    "the caesar",
    "the salad",
  ],
  "burrata salad": ["buratta salad", "burrata"],
  "french fries": [
    "fries",
    "chips",
    "french fry",
    "potato fries",
    "crispy fries",
    "french fri",
    "hot chips",
    "bowl of fries",
    "side of fries",
    "the fries",
  ],
  "chocolate fondant": [
    "fondant",
    "molten chocolate",
    "chocolate cake",
    "molten fondant",
    "chocolate lava",
    "chocolate lava cake",
    "molten lava cake",
    "warm chocolate fondant",
    "choco fondant",
    "chocolate fondue",
    "chocolate fontant",
    "chocolate foundant",
    "the fondant",
  ],
  "creme brulee": ["cream brulee", "creme brule", "crème brûlée", "crem brulee"],
  "flat white": [
    "white coffee",
    "flat white coffee",
    "coffee",
    "latte",
    "flight white",
    "flood white",
    "flat lite",
    "flat-white",
    "cup of coffee",
    "the flat white",
  ],
  "sparkling water": [
    "mineral water",
    "sparkling mineral water",
    "sparkling bottle",
    "bottle of sparkling water",
    "sparkling",
    "san pellegrino",
    "bubbly water",
    "soda water",
    "fizzy water",
    "carbonated water",
    "the sparkling water",
  ],
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
 * Detects if user speech commands order confirmation / dispatch to kitchen.
 * Supports direct affirmative answers ('yes', 'yeah', 'sure', 'confirm', etc.)
 */
export function isVoiceConfirmation(text: string): boolean {
  if (!text) return false;
  const norm = normalizeText(text);

  // Exact or direct affirmative responses
  if (
    /^(?:yes|yeah|yep|sure|yup|ok|okay|alright|correct|definitely|absolutely|go ahead|please do|sounds good|yes please|yes confirm|yes confirm it|yes confirm the order|confirm it|confirm order)$/i.test(
      norm
    )
  ) {
    return true;
  }

  // Affirmative with confirmation phrases
  const confirmPatterns = [
    /\b(?:yes|yeah|yep|sure|please)\s+(?:confirm|do|send|place|submit|go ahead|prepare)\b/,
    /\b(?:confirm|confirmed|confirm the order|confirm my order|confirm order|confirmation)\b/,
    /\b(?:let the chef know|tell the chef|notify the chef|inform the chef|prepare it|prepare the order|have the chef prepare|prepare for us|go ahead and prepare|please prepare|yes prepare)\b/,
    /\b(?:send it to order|send to order|send it to kitchen|send to kitchen|send order to kitchen|send to the kitchen|send it to the kitchen|send it now|send it)\b/,
    /\b(?:place order|place the order|submit order|submit the order|dispatch order|dispatch to kitchen|send order)\b/,
    /\b(?:that's all send it|that is all send it|we're ready to order|ready to order|order is ready|ready for the chef)\b/,
    /\b(?:finalize order|finalize the order|transmit order|transmit to kitchen)\b/,
  ];
  return confirmPatterns.some((pattern) => pattern.test(norm));
}

/**
 * Detects conversational meta directives (e.g. "put this on the order list",
 * "display total amount", "should I confirm") so they are never flagged as unrecognized dishes.
 */
export function isMetaDirective(text: string): boolean {
  if (!text) return false;
  const norm = normalizeText(text);

  const listDirectives = [
    /^(?:can you\s+|could you\s+|please\s+)?(?:put|add|include|place|write)\s+(?:this|that|it|item)\s+(?:on|in|to)\s+(?:the\s+|my\s+)?(?:order\s*list|order|ticket|bill|tab)\b/i,
    /^(?:put|add|include|place|write)\s+(?:on|in|to)\s+(?:the\s+|my\s+)?(?:order\s*list|order|ticket|bill|tab)\b/i,
    /^(?:this|that|it)\s+(?:on|in|to)\s+(?:the\s+|my\s+)?(?:order\s*list|order|ticket|bill|tab)\b/i,
    /^(?:on|in|to)\s+(?:the\s+|my\s+)?(?:order\s*list|order|ticket|bill|tab)$/i,
    /^(?:order\s*list|my\s*order\s*list|the\s*order\s*list)$/i,
  ];

  const totalDirectives = [
    /^(?:can you\s+|could you\s+|please\s+)?(?:display|show|calculate|tell me|what is|what's|how much is)\s+(?:the\s+)?(?:total\s*amount|total\s*price|total|bill|amount)\b/i,
    /^(?:the\s+)?(?:total\s*amount|total\s*price|total)$/i,
    /^(?:and\s+)?(?:display|show|calculate)\s+(?:the\s+)?(?:total\s*amount|total)\b/i,
  ];

  const confirmInquiries = [
    /^(?:before\s+it\s+confirmed|before\s+confirming|should\s+i\s+confirm|can\s+you\s+confirm|shall\s+we\s+confirm|would\s+you\s+like\s+to\s+confirm)\b/i,
  ];

  return (
    listDirectives.some((p) => p.test(norm)) ||
    totalDirectives.some((p) => p.test(norm)) ||
    confirmInquiries.some((p) => p.test(norm))
  );
}

/**
 * Strips conversational preambles/greetings and trailing politeness phrases.
 */
export function cleanSpeechUtterance(text: string): string {
  if (!text) return "";
  let cleaned = text.trim();

  // Strip leading greetings, conjunctions, and conversational fillers
  cleaned = cleaned.replace(
    /^(?:also|and|so|well|now|actually|halo|hallo|hello|hi|hey|hiya|good evening|good morning|good afternoon|excuse me|um|uh|er|ah|ok|okay|please|oh)[,\s.]+/i,
    ""
  );

  // Iteratively strip trailing polite phrases or closing statements
  const trailingRegex =
    /[,\s.]+(?:please|thanks|thank you|that'?s all|that is all|that'?s it|that is it|for now|that will be all|that'll be all|too|as well)[.?!]*$/i;
  while (trailingRegex.test(cleaned)) {
    cleaned = cleaned.replace(trailingRegex, "").trim();
  }

  return cleaned.trim();
}

/**
 * Comprehensive order prefix pattern to strip speech ordering wrappers with strict word boundaries.
 */
export const ORDER_PREFIX_PATTERN =
  /^(?:(?:also|and|so|please|now|hey|actually|hello|hi)?\s*(?:(?:can|could|may|would|will)\s+(?:you|we|i)\s+(?:please\s+)?(?:give|get|bring|serve|prepare|make|provide|add|send)\s+(?:me|us)?|(?:can|could|may)\s+(?:i|we)\s+(?:please\s+)?(?:have|get|take|order|add)|(?:i'll|i\s+will|we'll|we\s+will)\s+(?:have|take|get|order)|(?:i'd|i\s+would|we'd|we\s+would)\s+(?:like\s+(?:to\s+(?:have|get|take|order|add)\s+)?|love\s+(?:to\s+(?:have|get|take|order)\s+)?)|(?:i|we)\s+(?:want|need)\s+(?:to\s+(?:order|have|get|add)\s+)?|(?:please\s+)?(?:give|bring|serve|prepare|make|send|add|order)\s+(?:me|us)?|(?:let's\s+(?:have|get|order))|(?:put\s+(?:me|us)\s+down\s+for))\s+(?:\b(?:an?|the|some)\b\s+)?|^(?:(?:can you add|could you add|can we add|could we add|can you please add|can you get me|can you get us|can you give me|can you give us|could you give me|could you give us|can you bring|could you bring|can i get|can i have|could i get|could i have|may i have|may i get|can we get|can we have|could we get|could we have|i'll have|i will have|i'd like to add|i'd like to get|i'd like|i would like to add|i would like|i want to add|i want|we want|we'd like|we would like|we'll have|we will have|we'll take|i'll take|let's get|let's have|put me down for|please bring|bring me|bring us|give me|give us|to add|add|order)\s+(?:\b(?:an?|the|some)\b\s+)?|(?:\b(?:an?|the)\b)\s+))/i;

/**
 * Checks if user speech contains explicit order intent or mentions a menu item.
 */
export function hasExplicitOrderIntent(text: string, menu?: MenuItem[]): boolean {
  const cleaned = cleanSpeechUtterance(text);
  const norm = normalizeText(cleaned);

  // Check confirmation commands or meta directives
  if (isVoiceConfirmation(norm) || isMetaDirective(norm)) {
    return false;
  }

  const intentPatterns = [
    /\b(?:can you give me|could you give me|can you give us|could you give us|can you get me|can you get us|can you bring me|can you bring us|give me|give us)\b/,
    /\b(?:i'll have|i will have|i'd like|i would like|can i get|can i have|could i get|could i have|may i have|may i get|can we get|can we have|could we get|could we have)\b/,
    /\b(?:can you add|could you add|can we add|could we add|please bring|bring me|bring us|add|order|we'll have|we will have|we'd like|we would like|we'll take|i'll take)\b/,
    /\b(?:put me down for|i want to order|i want|we want)\b/,
    /^\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|couple|pair|a|an)\s+[a-z]/i,
  ];

  if (intentPatterns.some((p) => p.test(norm))) {
    return true;
  }

  // If the speech phrase mentions any menu item or known alias directly, it is a valid order!
  if (menu && menu.length > 0) {
    if (/\b(?:recommends?|suggests?|suggestion|specials? for tonight)\b/i.test(norm)) {
      return false;
    }

    for (const item of menu) {
      const normItem = normalizeText(item.name);
      const regex = new RegExp(`(?:^|\\s)${normItem.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}(?:$|\\s)`, "i");
      if (regex.test(norm)) {
        return true;
      }
      const aliases = MENU_ALIASES[normItem] || [];
      for (const a of aliases) {
        const normAlias = normalizeText(a);
        if (normAlias.length < 3) continue;
        const aliasRegex = new RegExp(`(?:^|\\s)${normAlias.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}(?:$|\\s)`, "i");
        if (aliasRegex.test(norm)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Checks if a sentence is an inquiry/question rather than an order placement.
 */
export function isQuestionOrInquiry(text: string): boolean {
  const norm = normalizeText(text);
  if (!norm) return false;

  const inquiryTriggers = [
    /\b(where is|where are|where's|where can i find|where do you have|where)\b/,
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
  if (!norm) return false;

  return (
    /\b(?:clear|cancel|delete|empty|remove|reset|wipe|scratch)\s+(?:the\s+|my\s+|our\s+|this\s+)?(?:order|cart|items?|everything|all(?:\s+items?)?|selection)\b/i.test(norm) ||
    /\b(?:start\s+(?:over|again)|reset\s+everything|empty\s+(?:the\s+)?cart|clear\s+(?:the\s+)?cart)\b/i.test(norm) ||
    /^(?:clear(?:\s+order)?|cancel(?:\s+order)?|reset(?:\s+order)?|start\s+over)$/i.test(norm)
  );
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
    /\b(rare|medium rare|medium well|medium|well done|blue rare|gluten free|dairy free|nut free|vegan|vegetarian|no onions?|no garlic|no dairy|no butter|dressing on the side|sauce on the side|extra sauce|extra spicy|mild|no ice|on the rocks|with ice)\b/i
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
): {
  isRemoval: boolean;
  matchedItem?: MenuItem;
  quantityToRemove?: number;
  removeAll?: boolean;
} {
  const norm = normalizeText(text);
  if (!norm) return { isRemoval: false };

  // Don't treat whole order cancellations as single item removal
  if (isCancellationOrClear(norm)) {
    return { isRemoval: false };
  }

  // 1. Action verbs: "remove [qty] [dish]", "delete [qty] [dish]", "take off [qty] [dish]", etc.
  const actionPattern =
    /\b(?:remove|delete|cancel|drop|take\s+off|take\s+away|scratch|cut|exclude)\s+(?:the\s+|an?\s+)?(?:all\s+)?(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten|couple|pair)\s+)?(?:orders?\s+of\s+|portions?\s+of\s+)?([a-z\s]+)/i;

  // 2. "I don't want [qty] [dish]", "don't need [qty] [dish]"
  const dontWantPattern =
    /\b(?:i\s+)?(?:don't|dont|do not)\s+(?:want|need)\s+(?:any\s+|the\s+|an?\s+)?(?:all\s+)?(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+)?([a-z\s]+)/i;

  // 3. "no [qty] [dish]", "actually no [qty] [dish]", "without [dish]"
  const noPattern =
    /\b(?:actually\s+no|no\s+more|no|without|not)\s+(?:the\s+|an?\s+)?(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+)?([a-z\s]+)/i;

  // 4. "[dish] no thank you", "[dish] actually no", "[dish] instead"
  const suffixPattern =
    /\b([a-z\s]+)\s+(?:no thank you|no thanks|actually no|not that|instead|remove that)\b/i;

  const patterns = [
    { regex: actionPattern, qtyIndex: 1, dishIndex: 2 },
    { regex: dontWantPattern, qtyIndex: 1, dishIndex: 2 },
    { regex: noPattern, qtyIndex: 1, dishIndex: 2 },
    { regex: suffixPattern, qtyIndex: -1, dishIndex: 1 },
  ];

  for (const { regex, qtyIndex, dishIndex } of patterns) {
    const match = norm.match(regex);
    if (match) {
      const rawDish = match[dishIndex] || "";
      const cleanedDish = rawDish
        .replace(/\b(thanks|thank you|please|for me|from the order|from my order|from order|off the order|off my order|to the order)\b/gi, "")
        .trim();

      if (!cleanedDish || cleanedDish.length < 2) continue;

      const matchResult = findBestMenuMatch(cleanedDish, menu);
      if (matchResult && matchResult.confidence >= 0.7) {
        let quantityToRemove: number | undefined = undefined;
        let removeAll = false;

        if (qtyIndex > 0 && match[qtyIndex]) {
          quantityToRemove = parseWordQuantity(match[qtyIndex]);
        }

        if (/\ball\b/i.test(match[0]) || !quantityToRemove) {
          removeAll = true;
        }

        return {
          isRemoval: true,
          matchedItem: matchResult.item,
          quantityToRemove: quantityToRemove ?? 1,
          removeAll,
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
  if (!normQuery) return { isAmbiguous: false, candidates: [] };

  // If query is an exact dish name or direct alias, it is NOT ambiguous
  const exact = menu.find((m) => normalizeText(m.name) === normQuery);
  if (exact) {
    return { isAmbiguous: false, candidates: [] };
  }
  for (const item of menu) {
    const normName = normalizeText(item.name);
    const aliases = MENU_ALIASES[normName] || [];
    if (aliases.some((a) => normalizeText(a) === normQuery)) {
      return { isAmbiguous: false, candidates: [] };
    }
  }

  const words = normQuery.split(" ").filter((w) => w.length > 2);

  for (const word of words) {
    if (AMBIGUOUS_KEYWORDS[word]) {
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

export function phoneticKey(value: string): string {
  if (!value) return "";
  return normalizeText(value)
    .replace(/ph/g, "f")
    .replace(/\bkn/g, "n")
    .replace(/\bwr/g, "r")
    .replace(/\beye\b/g, "i")
    .replace(/\baye\b/g, "i")
    .replace(/\bai\b/g, "i")
    .replace(/ee+/g, "i")
    .replace(/ea/g, "i")
    .replace(/oo+/g, "u")
    .replace(/(.)\1+/g, "$1") // collapse double letters (ll -> l, tt -> t, etc.)
    .replace(/e\b/g, "") // strip trailing silent e
    .trim();
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
      const normAlias = normalizeText(alias);
      if (normQuery === normAlias) {
        return { confidence: 0.98, item };
      }
      if (normQuery.includes(normAlias) || normAlias.includes(normQuery)) {
        const lenRatio = Math.min(normQuery.length, normAlias.length) / Math.max(normQuery.length, normAlias.length);
        if (lenRatio >= 0.7) {
          return { confidence: 0.92, item };
        }
      }
    }
  }

  // 3. Subphrase / Contains Match (longest candidate item or alias first)
  let bestSub: { confidence: number; item: MenuItem; len: number } | null = null;
  for (const item of menu) {
    const normName = normalizeText(item.name);
    const candidates = [normName, ...(MENU_ALIASES[normName]?.map(normalizeText) || [])];
    candidates.sort((a, b) => b.length - a.length);

    for (const cand of candidates) {
      if (cand.length < 3) continue;
      const regex = new RegExp(`(?:^|\\s)${cand.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}(?:$|\\s)`, "i");
      if (regex.test(normQuery)) {
        if (!bestSub || cand.length > bestSub.len) {
          bestSub = { item, confidence: 0.95, len: cand.length };
        }
      }
    }
  }
  if (bestSub) {
    return { confidence: bestSub.confidence, item: bestSub.item };
  }

  // 3.5 Phonetic Accent Normalization Match (matches any accent pronunciation)
  const phonQuery = phoneticKey(phrase);
  if (phonQuery && phonQuery.length >= 3) {
    for (const item of menu) {
      const normName = normalizeText(item.name);
      const phonName = phoneticKey(item.name);
      if (phonQuery === phonName || calculateSimilarity(phonQuery, phonName) >= 0.85) {
        return { confidence: 0.94, item };
      }
      const aliases = MENU_ALIASES[normName] || [];
      for (const alias of aliases) {
        const phonAlias = phoneticKey(alias);
        if (phonQuery === phonAlias || calculateSimilarity(phonQuery, phonAlias) >= 0.85) {
          return { confidence: 0.94, item };
        }
      }
    }
  }

  // 4. String similarity & token scoring
  let best: { confidence: number; item: MenuItem } | null = null;

  for (const item of menu) {
    const normItemName = normalizeText(item.name);

    if (normQuery === normItemName) {
      return { confidence: 1.0, item };
    }

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

  // 1. Split transcript into major sentence blocks
  const rawSentences = transcript
    .split(/(?:\r?\n|;|\.\s+|[?!])+/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const statements: string[] = [];
  for (const sentence of rawSentences) {
    if (
      /\b(?:(?:the\s+)?chef recommends?|i recommend|we recommend|(?:the\s+)?chef suggests?|i suggest|we suggest|our recommendation)\b/i.test(
        sentence
      )
    ) {
      continue;
    }
    // Split discrete clauses by 'and'
    const subs = sentence
      .split(/(?:\band\b)+/gi)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    statements.push(...subs);
  }

  const draftItems = new Map<string, MatchedOrderItem>();
  const needsConfirmationMap = new Map<string, MatchedOrderItem>();
  const unmatchedPhrases: string[] = [];
  let lastOrderedItemId: string | null = null;

  let hasOrderOperations = false;
  let wasCleared = false;
  let lastAction:
    | {
        type: "add" | "remove" | "clear" | "correction";
        itemName?: string;
        quantity?: number;
      }
    | undefined = undefined;

  for (const rawStatement of statements) {
    const cleanStmt = cleanSpeechUtterance(rawStatement);
    if (!cleanStmt && !rawStatement) continue;

    // Ignore voice confirmation commands from being marked as food items
    if (isVoiceConfirmation(cleanStmt) || isVoiceConfirmation(rawStatement)) {
      continue;
    }

    // Ignore meta directives (e.g. "put this on the order list", "display total amount")
    if (isMetaDirective(cleanStmt) || isMetaDirective(rawStatement)) {
      continue;
    }

    // 1. Check for cancellation / clear
    if (isCancellationOrClear(cleanStmt) || isCancellationOrClear(rawStatement)) {
      draftItems.clear();
      needsConfirmationMap.clear();
      unmatchedPhrases.length = 0;
      lastOrderedItemId = null;
      hasOrderOperations = true;
      wasCleared = true;
      lastAction = { type: "clear" };
      continue;
    }

    // 2. Check for Inquiry / Question (e.g. "Do you have sparkling water?")
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
        hasOrderOperations = true;
        lastAction = {
          type: "correction",
          itemName: targetItem.name,
          quantity: correction.targetQuantity,
        };
        targetItem.quantity = correction.targetQuantity;
        targetItem.lineTotal = Number((targetItem.quantity * targetItem.price).toFixed(2));
        if (targetItem.quantity <= 0) {
          draftItems.delete(targetItem.id);
        }
      }
      continue;
    }

    // 4. Check for Removal / Negation (e.g. "remove the eye fillet", "I don't want fries", "delete wagyu")
    const removal = parseRemovalOrNegation(cleanStmt, menu) || parseRemovalOrNegation(rawStatement, menu);
    if (removal.isRemoval && removal.matchedItem) {
      hasOrderOperations = true;
      const key = removal.matchedItem.id || removal.matchedItem.name;
      let foundKey: string | null = draftItems.has(key) ? key : null;
      let existing = foundKey ? draftItems.get(foundKey) : undefined;
      if (!existing) {
        for (const [k, v] of draftItems.entries()) {
          if (v.name.toLowerCase() === removal.matchedItem.name.toLowerCase()) {
            foundKey = k;
            existing = v;
            break;
          }
        }
      }

      if (existing && foundKey) {
        lastAction = {
          type: "remove",
          itemName: existing.name,
          quantity: removal.quantityToRemove,
        };
        if (removal.removeAll || removal.quantityToRemove === undefined) {
          draftItems.delete(foundKey);
        } else {
          existing.quantity -= removal.quantityToRemove;
          existing.lineTotal = Number((existing.quantity * existing.price).toFixed(2));
          if (existing.quantity <= 0) {
            draftItems.delete(foundKey);
          }
        }
      }
      continue;
    }

    // 5. Must have explicit ordering intent or clear quantity + item structure
    if (!hasExplicitOrderIntent(rawStatement, menu) && !hasExplicitOrderIntent(cleanStmt, menu)) {
      continue;
    }

    // 6. Extract quantity, cooking preferences, and menu item phrase
    const { notes, cleanedText } = extractNotes(cleanStmt);

    // Strip conversational / ordering prefixes first (e.g. "can I have", "i'd like to order")
    let phraseAfterPrefix = cleanedText.replace(ORDER_PREFIX_PATTERN, "").trim();

    // Extract quantity from the stripped phrase
    let quantity = 1;
    let itemPhrase = phraseAfterPrefix;

    const qtyMatch = phraseAfterPrefix.match(
      /^(\d+|one|two|three|four|five|six|seven|eight|nine|ten|couple|pair|a|an)\s+(?:orders?|portions?|plates?|glasses?|bottles?|of\s+)?(.*)$/i
    );

    if (qtyMatch) {
      const parsedQty = parseWordQuantity(qtyMatch[1]);
      if (parsedQty !== undefined && parsedQty > 0) {
        quantity = parsedQty;
        itemPhrase = qtyMatch[2].trim();
      }
    }

    // Strip standalone leading article "the", "a", or "an"
    itemPhrase = itemPhrase.replace(/^(?:the|an?)\b\s+/i, "").trim();

    // Clean trailing filler words
    itemPhrase = cleanSpeechUtterance(itemPhrase);

    // Strip trailing conversational meta directives attached to the dish name
    // e.g. "can I have Wagyu Ribeye and put this on the order list" or "Wagyu Ribeye on the order list"
    itemPhrase = itemPhrase
      .replace(
        /\s+(?:and\s+)?(?:please\s+)?(?:put|add|place)\s+(?:this|that|it)?\s+(?:on|in|to)\s+(?:the\s+|my\s+)?(?:order\s*list|order|ticket|list)\s*$/i,
        ""
      )
      .replace(/\s+(?:on|in|to)\s+(?:the\s+|my\s+)?(?:order\s*list|order|ticket|list)\s*$/i, "")
      .replace(
        /\s+(?:and\s+)?(?:display|show|calculate|tell me)\s+(?:the\s+)?(?:total\s*amount|total|bill)\s*$/i,
        ""
      )
      .trim();

    // If phrase reduced to empty or is a meta directive/confirmation/inquiry, do not treat as an item
    if (
      !itemPhrase ||
      isMetaDirective(itemPhrase) ||
      isVoiceConfirmation(itemPhrase) ||
      isQuestionOrInquiry(itemPhrase) ||
      /^(?:where|where's|where is|what is|how much)\b/i.test(itemPhrase)
    ) {
      continue;
    }

    // Handle "anything from menu" / "anything from the menu" / "something from the menu"
    if (/\b(?:anything|something)\s+(?:from|on)\s+(?:the\s+)?menu\b/i.test(itemPhrase)) {
      const chefSpecial = menu.find((m) => m.name.toLowerCase().includes("wagyu")) || menu[0];
      if (chefSpecial) {
        const key = chefSpecial.id || chefSpecial.name;
        const price = Number(chefSpecial.price);
        draftItems.set(key, {
          id: chefSpecial.id || chefSpecial.name,
          name: chefSpecial.name,
          quantity: 1,
          price,
          lineTotal: price,
          confidence: 1.0,
          matchedText: itemPhrase,
          status: "matched",
        });
        lastOrderedItemId = key;
        hasOrderOperations = true;
        lastAction = { type: "add", itemName: chefSpecial.name, quantity: 1 };
        continue;
      }
    }

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
      if (
        itemPhrase &&
        itemPhrase.length >= 2 &&
        !isVoiceConfirmation(itemPhrase) &&
        !isMetaDirective(itemPhrase)
      ) {
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
      hasOrderOperations = true;
      lastAction = { type: "add", itemName: item.name, quantity };
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
      hasOrderOperations = true;
      lastAction = { type: "add", itemName: item.name, quantity };
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
    hasOrderOperations,
    wasCleared,
    lastAction,
  };
}
