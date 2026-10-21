import {
  matchOrderFromTranscript,
  isQuestionOrInquiry,
  parseCorrection,
  parseRemovalOrNegation,
  checkAmbiguity,
} from "./orderMatcher";
import type { MenuItem } from "@/types/order";

const sampleMenu: MenuItem[] = [
  { id: "item-1", name: "Wagyu Ribeye", price: 48, category: "Mains", active: true },
  { id: "item-2", name: "Eye Fillet", price: 42, category: "Mains", active: true },
  { id: "item-3", name: "Pan-Seared Salmon", price: 32, category: "Mains", active: true },
  { id: "item-4", name: "Truffle Mushroom Risotto", price: 26, category: "Mains", active: true },
  { id: "item-5", name: "Beef Carpaccio", price: 19, category: "Starters", active: true },
  { id: "item-6", name: "Caesar Salad", price: 18, category: "Starters", active: true },
  { id: "item-7", name: "French Fries", price: 9, category: "Sides", active: true },
  { id: "item-8", name: "Chocolate Fondant", price: 15, category: "Desserts", active: true },
  { id: "item-9", name: "Flat White", price: 5.5, category: "Drinks", active: true },
  { id: "item-10", name: "Sparkling Water", price: 6, category: "Drinks", active: true },
  { id: "item-11", name: "Market Fish Fillet", price: 38, category: "Mains", active: true },
];

let total = 0;
let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${name}`);
  }
}

console.log("\n=======================================================");
console.log("   VOICE ORDERING ACCURACY & MATCHER TEST SUITE       ");
console.log("=======================================================\n");

// 1. Question / Inquiry filtering
console.log("--- 1. Inquiries and Questions (Must Never Add Items) ---");
assert(isQuestionOrInquiry("What kind of water do you have?"), "Identifies 'What kind of water do you have?' as inquiry");
assert(isQuestionOrInquiry("How much is the Wagyu Ribeye?"), "Identifies 'How much is the Wagyu Ribeye?' as inquiry");
assert(isQuestionOrInquiry("Do you have French Fries?"), "Identifies 'Do you have French Fries?' as inquiry");
assert(isQuestionOrInquiry("Can you tell me about the Chocolate Fondant"), "Identifies 'Can you tell me about...' as inquiry");
assert(isQuestionOrInquiry("Does the Pan-Seared Salmon contain gluten?"), "Identifies allergen question as inquiry");

const inquiryResult1 = matchOrderFromTranscript("What kind of water do you have?", sampleMenu);
assert(inquiryResult1.items.length === 0, "Zero items added when asking what kind of water is available");

const inquiryResult2 = matchOrderFromTranscript("Can you tell me about the Wagyu Ribeye and how much it costs?", sampleMenu);
assert(inquiryResult2.items.length === 0, "Zero items added when asking about Wagyu price");

const inquiryResult3 = matchOrderFromTranscript("Do you serve sparkling water or french fries?", sampleMenu);
assert(inquiryResult3.items.length === 0, "Zero items added when asking about menu availability");

// 2. Negative Statements (Must Never Add Unwanted Items)
console.log("\n--- 2. Negative Statements & Removals ---");
const neg1 = parseRemovalOrNegation("I don't want fries", sampleMenu);
assert(neg1.isRemoval === true && neg1.matchedItem?.name === "French Fries", "Identifies 'I don't want fries' as removal");

const neg2 = parseRemovalOrNegation("No sparkling water thanks", sampleMenu);
assert(neg2.isRemoval === true && neg2.matchedItem?.name === "Sparkling Water", "Identifies 'No sparkling water' as removal");

const negOrderResult = matchOrderFromTranscript("I don't want fries", sampleMenu);
assert(negOrderResult.items.length === 0, "'I don't want fries' does NOT add fries to the order");

const negOrderResult2 = matchOrderFromTranscript(
  "I'll have a Wagyu Ribeye\nActually, I don't want fries",
  sampleMenu
);
assert(negOrderResult2.items.length === 1, "Only Wagyu Ribeye is in order");
assert(negOrderResult2.items[0].name === "Wagyu Ribeye", "Item is Wagyu Ribeye");
assert(!negOrderResult2.items.some((i) => i.name === "French Fries"), "French Fries was not added");

// Removal of existing item
const removalResult = matchOrderFromTranscript(
  "I'll have a Wagyu Ribeye and french fries\nCancel the fries please",
  sampleMenu
);
assert(removalResult.items.length === 1, "Fries successfully removed from order");
assert(removalResult.items[0].name === "Wagyu Ribeye", "Wagyu Ribeye remains in order");

// 3. Corrections ("make that two, not three")
console.log("\n--- 3. Quantity Corrections ('make that two, not three') ---");
const corr1 = parseCorrection("make that two, not three");
assert(corr1.isCorrection === true && corr1.targetQuantity === 2 && corr1.rejectedQuantity === 3, "Parses 'make that two, not three' -> target 2, reject 3");

const corrResult = matchOrderFromTranscript(
  "I'll have three Wagyu Ribeyes\nActually, make that two, not three",
  sampleMenu
);
assert(corrResult.items.length === 1, "Only one item type in order");
assert(corrResult.items[0].quantity === 2, "Wagyu Ribeye quantity is exactly 2, not 3 or 5");
assert(corrResult.items[0].lineTotal === 96, "Line total is exactly $96.00 (2 x $48.00)");

// 4. Ambiguity Detection (Generic words matching multiple items)
console.log("\n--- 4. Ambiguity Detection & Clarification ---");
const ambCheck = checkAmbiguity("fillet", sampleMenu);
assert(ambCheck.isAmbiguous === true && ambCheck.candidates.length >= 2, "Detects 'fillet' matches Eye Fillet & Market Fish Fillet");

const ambResult = matchOrderFromTranscript("Can I get a fillet please", sampleMenu);
assert(ambResult.items.length === 0, "Ambiguous 'fillet' is NOT automatically added as a confirmed item");
assert(ambResult.needsConfirmation.length === 1, "Placed in needsConfirmation for clarification");
assert(
  (ambResult.needsConfirmation[0].candidates?.length ?? 0) >= 2,
  "Contains at least 2 candidates for customer clarification"
);

// 5. Explicit Ordering & Notes Extraction
console.log("\n--- 5. Explicit Ordering & Cooking Notes ---");
const validOrder = matchOrderFromTranscript(
  "I'll have two Wagyu Ribeyes medium rare and one Caesar Salad",
  sampleMenu
);
assert(validOrder.items.length === 2, "Matches 2 distinct order items");
const wagyu = validOrder.items.find((i) => i.name === "Wagyu Ribeye");
const salad = validOrder.items.find((i) => i.name === "Caesar Salad");
assert(!!wagyu && wagyu.quantity === 2, "2x Wagyu Ribeye matched");
assert(wagyu?.notes === "medium rare", "Notes extracted: 'medium rare'");
assert(wagyu?.lineTotal === 96, "Wagyu total is $96.00");
assert(!!salad && salad.quantity === 1, "1x Caesar Salad matched");
assert(salad?.lineTotal === 18, "Caesar Salad total is $18.00");
assert(validOrder.total === 114, "Total is calculated accurately: $96 + $18 = $114.00");

// 6. Natural Accents & Colloquial Names
console.log("\n--- 6. Accents, Colloquial Names & Minor Spelling Variations ---");
const colloquialOrder = matchOrderFromTranscript(
  "I'll have a creme brule and a flat white coffee",
  sampleMenu
);
assert(colloquialOrder.items.some((i) => i.name === "Flat White"), "Matches 'flat white coffee' to 'Flat White'");

const carpaccioOrder = matchOrderFromTranscript(
  "Can I get a beef carpacio",
  sampleMenu
);
assert(carpaccioOrder.items.some((i) => i.name === "Beef Carpaccio"), "Matches 'beef carpacio' to 'Beef Carpaccio'");

// 7. Conversational Chat & Background Speech (Zero additions)
console.log("\n--- 7. Conversational & Background Speech Rejection ---");
const casualResult = matchOrderFromTranscript(
  "Hello good evening! How are you doing tonight? Nice weather we're having.",
  sampleMenu
);
assert(casualResult.items.length === 0, "Casual conversation adds 0 items");

// 8. Order Clearing / Reset
console.log("\n--- 8. Order Reset / Clear Command ---");
const clearResult = matchOrderFromTranscript(
  "I'll have two Wagyu Ribeyes\nStart over please",
  sampleMenu
);
assert(clearResult.items.length === 0, "Clear command resets draft items to 0");

// 9. Full Multi-Turn Ordering Dialogue Simulation
console.log("\n--- 9. Full Multi-Turn Dialogue Simulation ---");
const dialogue = [
  "Hello, what do you recommend for dinner tonight?", // Inquiry -> 0
  "I'll have the Beef Carpaccio and two Wagyu Ribeyes medium rare", // Order -> 1 Carpaccio, 2 Wagyu
  "Can you tell me how much the Pan-Seared Salmon is?", // Inquiry -> No Salmon!
  "Actually, make that three Wagyu Ribeyes, not two", // Correction -> 1 Carpaccio, 3 Wagyu
  "Please add french fries", // Order -> 1 Carpaccio, 3 Wagyu, 1 Fries
  "Wait, no fries, I don't want fries", // Removal -> 1 Carpaccio, 3 Wagyu
  "Can you confirm my total?", // Inquiry -> No items added
].join("\n");

const dialogueResult = matchOrderFromTranscript(dialogue, sampleMenu);
assert(dialogueResult.items.length === 2, "Dialogue results in exactly 2 menu items (Carpaccio + Wagyu)");
const finalCarpaccio = dialogueResult.items.find((i) => i.name === "Beef Carpaccio");
const finalWagyu = dialogueResult.items.find((i) => i.name === "Wagyu Ribeye");
assert(!!finalCarpaccio && finalCarpaccio.quantity === 1, "1x Beef Carpaccio in final draft");
assert(!!finalWagyu && finalWagyu.quantity === 3, "3x Wagyu Ribeye in final draft (corrected from 2 to 3, not 5)");
assert(!dialogueResult.items.some((i) => i.name === "French Fries"), "French Fries is NOT in final draft (was removed)");
assert(!dialogueResult.items.some((i) => i.name === "Pan-Seared Salmon"), "Pan-Seared Salmon was never added during price inquiry");
assert(dialogueResult.total === 19 + 3 * 48, `Authoritative total is exactly $${19 + 3 * 48}.00 ($163.00)`);

// 10. Streaming Partial & Incomplete Transcripts
console.log("\n--- 10. Streaming Partial Transcripts Protection ---");
const partialTranscript = "wagy";
const partialResult = matchOrderFromTranscript(partialTranscript, sampleMenu);
assert(partialResult.items.length === 0, "Partial incomplete fragment 'wagy' adds 0 items");

// 11. Assistant Utterance Leakage Protection
console.log("\n--- 11. Assistant Utterance Leakage Protection ---");
const assistantSpeech = "The Chef recommends our Wagyu Ribeye and Pan-Seared Salmon.";
const assistantResult = matchOrderFromTranscript(assistantSpeech, sampleMenu);
assert(assistantResult.items.length === 0, "Assistant speech recommendations add 0 items to draft");

// 12. Conversational Greetings, Polite Ordering & Question Marks
console.log("\n--- 12. Conversational Greetings, Trailing Fillers & Polite Questions ---");

// Test non-menu item with conversational greeting and trailing phrases
const nonMenuResult = matchOrderFromTranscript(
  "Halo. Can I have a paper card, please? That's all.",
  sampleMenu
);
assert(nonMenuResult.items.length === 0, "'Halo. Can I have a paper card...' adds 0 items (not on menu)");
assert(
  (nonMenuResult.unmatchedPhrases?.length ?? 0) > 0,
  "Captures 'paper card' in unmatchedPhrases for UI feedback"
);

// Test valid menu item with greeting, "Can I have", question mark, and "That's all."
const greetingOrder = matchOrderFromTranscript(
  "Halo. Can I have a Wagyu Ribeye, please? That's all.",
  sampleMenu
);
assert(greetingOrder.items.length === 1, "'Halo. Can I have a Wagyu Ribeye, please? That's all.' matches 1 item");
assert(greetingOrder.items[0]?.name === "Wagyu Ribeye", "Item is Wagyu Ribeye");
assert(greetingOrder.items[0]?.quantity === 1, "Quantity is exactly 1");
assert(greetingOrder.items[0]?.lineTotal === 48, "Price is exactly $48.00");

// Test "Can I have the [item]?" with question mark
const questionOrder = matchOrderFromTranscript(
  "Can I have the Wagyu Ribeye, please?",
  sampleMenu
);
assert(questionOrder.items.length === 1, "'Can I have the Wagyu Ribeye, please?' matches 1 item");
assert(questionOrder.items[0]?.name === "Wagyu Ribeye", "Item is Wagyu Ribeye");

// Test multi-item with greetings and 'and'
const multiGreetingOrder = matchOrderFromTranscript(
  "Halo. Can I get two Caesar Salads please and one Flat White? That's all.",
  sampleMenu
);
assert(multiGreetingOrder.items.length === 2, "Matches 2 items from conversational speech");
assert(multiGreetingOrder.items.find((i) => i.name === "Caesar Salad")?.quantity === 2, "2x Caesar Salad matched");
assert(multiGreetingOrder.items.find((i) => i.name === "Flat White")?.quantity === 1, "1x Flat White matched");
assert(multiGreetingOrder.total === 2 * 18 + 5.5, `Total is exactly $${2 * 18 + 5.5}0 ($41.50)`);

// 13. Conversational "also can you add...", phonetic speech variants, direct names & confirmation
console.log("\n--- 13. Conversational Orders, Phonetic Speech Variants & Voice Confirmation ---");

// Test: "also, can you add beef carpaccio?"
const beefCarpaccioRes = matchOrderFromTranscript(
  "also, can you add beef carpaccio?",
  sampleMenu
);
assert(beefCarpaccioRes.items.length === 1, "'also, can you add beef carpaccio?' matches 1 item");
assert(beefCarpaccioRes.items[0]?.name === "Beef Carpaccio", "Item is Beef Carpaccio");
assert(beefCarpaccioRes.items[0]?.price === 19, "Price is $19.00");
assert((beefCarpaccioRes.unmatchedPhrases?.length ?? 0) === 0, "Zero unmatched phrases for beef carpaccio");

// Test: "also, can you add a bench here at salmon?" (phonetic speech-to-text transcript)
const salmonAcousticRes = matchOrderFromTranscript(
  "also, can you add a bench here at salmon?",
  sampleMenu
);
assert(salmonAcousticRes.items.length === 1, "'also, can you add a bench here at salmon?' matches 1 item");
assert(salmonAcousticRes.items[0]?.name === "Pan-Seared Salmon", "Item is Pan-Seared Salmon");
assert(salmonAcousticRes.items[0]?.price === 32, "Price is $32.00");

// Test: "Wagyu rebeye" and "banky repay" accent variations
const wagyuRebeyeRes = matchOrderFromTranscript("Wagyu rebeye", sampleMenu);
assert(wagyuRebeyeRes.items.length === 1, "'Wagyu rebeye' matches Wagyu Ribeye");
assert(wagyuRebeyeRes.items[0]?.name === "Wagyu Ribeye", "Item is Wagyu Ribeye");

const bankyRepayRes = matchOrderFromTranscript("banky repay", sampleMenu);
assert(bankyRepayRes.items.length === 1, "'banky repay' phonetic variation matches Wagyu Ribeye");
assert(bankyRepayRes.items[0]?.name === "Wagyu Ribeye", "Item is Wagyu Ribeye");

// Test: "can you add salmon"
const salmonRes = matchOrderFromTranscript("can you add salmon", sampleMenu);
assert(salmonRes.items.length === 1, "'can you add salmon' matches Pan-Seared Salmon");
assert(salmonRes.items[0]?.name === "Pan-Seared Salmon", "Item is Pan-Seared Salmon");

// Test: Direct dish name "Pan-Seared Salmon"
const directSalmonRes = matchOrderFromTranscript("Pan-Seared Salmon", sampleMenu);
assert(directSalmonRes.items.length === 1, "'Pan-Seared Salmon' matches 1 item");
assert(directSalmonRes.items[0]?.name === "Pan-Seared Salmon", "Item is Pan-Seared Salmon");

// Test: Voice Confirmation Detection
import { isVoiceConfirmation } from "./orderMatcher";
assert(isVoiceConfirmation("Confirmed") === true, "Identifies 'Confirmed' as voice confirmation");
assert(isVoiceConfirmation("confirm the order") === true, "Identifies 'confirm the order' as voice confirmation");
assert(isVoiceConfirmation("Send it to Order") === true, "Identifies 'Send it to Order' as voice confirmation");
assert(isVoiceConfirmation("Send to kitchen") === true, "Identifies 'Send to kitchen' as voice confirmation");
assert(isVoiceConfirmation("Place order") === true, "Identifies 'Place order' as voice confirmation");
assert(isVoiceConfirmation("I want more fries") === false, "Regular order is not voice confirmation");

console.log("\n=======================================================");
console.log(`TOTAL MATCHER TESTS : ${total}`);
console.log(`PASSED              : ${passed}`);
console.log(`FAILED              : ${failed}`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}


