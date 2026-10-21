import {
  matchOrderFromTranscript,
  isQuestionOrInquiry,
  parseCorrection,
  parseRemovalOrNegation,
  checkAmbiguity,
  isCancellationOrClear,
  isVoiceConfirmation,
  isMetaDirective,
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
assert(isVoiceConfirmation("Confirmed") === true, "Identifies 'Confirmed' as voice confirmation");
assert(isVoiceConfirmation("confirm the order") === true, "Identifies 'confirm the order' as voice confirmation");
assert(isVoiceConfirmation("Send it to Order") === true, "Identifies 'Send it to Order' as voice confirmation");
assert(isVoiceConfirmation("Send to kitchen") === true, "Identifies 'Send to kitchen' as voice confirmation");
assert(isVoiceConfirmation("Place order") === true, "Identifies 'Place order' as voice confirmation");
assert(isVoiceConfirmation("I want more fries") === false, "Regular order is not voice confirmation");
assert(isVoiceConfirmation("yes") === true, "Identifies 'yes' as affirmative voice confirmation");
assert(isVoiceConfirmation("yes please") === true, "Identifies 'yes please' as affirmative voice confirmation");
assert(isVoiceConfirmation("yeah") === true, "Identifies 'yeah' as affirmative voice confirmation");
assert(isVoiceConfirmation("yep") === true, "Identifies 'yep' as affirmative voice confirmation");
assert(isVoiceConfirmation("sure") === true, "Identifies 'sure' as affirmative voice confirmation");

// 14. Conversational Meta Directives & Order List Directives
console.log("\n--- 14. Conversational Meta Directives (Must Never Cause Item Errors) ---");
assert(isMetaDirective("put this on the order list") === true, "Identifies 'put this on the order list' as meta directive");
assert(isMetaDirective("this on the order list") === true, "Identifies 'this on the order list' as meta directive");
assert(isMetaDirective("add this on the order list") === true, "Identifies 'add this on the order list' as meta directive");
assert(isMetaDirective("and display total amount") === true, "Identifies 'and display total amount' as meta directive");
assert(isMetaDirective("display total amount") === true, "Identifies 'display total amount' as meta directive");
assert(isMetaDirective("should I confirm") === true, "Identifies 'should I confirm' as meta directive");

const metaDirectiveRes = matchOrderFromTranscript(
  "can I have Wagyu Ribeye and put this on the order list and display total amount",
  sampleMenu
);
assert(metaDirectiveRes.items.length === 1, "Matches 1 item for Wagyu with order list directive");
assert(metaDirectiveRes.items[0]?.name === "Wagyu Ribeye", "Item is Wagyu Ribeye");
assert(metaDirectiveRes.total === 48, "Total is $48.00");
assert((metaDirectiveRes.unmatchedPhrases?.length ?? 0) === 0, "No false 'item not found' error for 'this on the order list'");

// 15. Testing All 10 Menu Items with 'can I have [item]'
console.log("\n--- 15. All 10 Menu Items via 'can I have [dish]' ---");
const allMenuPhrases: [string, string, number][] = [
  ["can I have Wagyu Ribeye", "Wagyu Ribeye", 48],
  ["can I have an Eye Fillet", "Eye Fillet", 42],
  ["can I have Eye Fillet", "Eye Fillet", 42],
  ["can I have Pan-Seared Salmon", "Pan-Seared Salmon", 32],
  ["can I have Truffle Mushroom Risotto", "Truffle Mushroom Risotto", 26],
  ["can I have Beef Carpaccio", "Beef Carpaccio", 19],
  ["can I have Caesar Salad", "Caesar Salad", 18],
  ["can I have French Fries", "French Fries", 9],
  ["can I have Chocolate Fondant", "Chocolate Fondant", 15],
  ["can I have Flat White", "Flat White", 5.5],
  ["can I have Sparkling Water", "Sparkling Water", 6],
  ["can I have anything from menu", "Wagyu Ribeye", 48],
  ["can I have anything from the menu", "Wagyu Ribeye", 48],
  ["can I have affiliate", "Eye Fillet", 42],
  ["can I have the affiliate", "Eye Fillet", 42],
  ["can I have an affiliate", "Eye Fillet", 42],
  ["can I have giveaway", "Wagyu Ribeye", 48],
];

for (const [phrase, expectedName, expectedPrice] of allMenuPhrases) {
  const res = matchOrderFromTranscript(phrase, sampleMenu);
  assert(res.items.length === 1, `'${phrase}' matches 1 item`);
  assert(res.items[0]?.name === expectedName, `'${phrase}' resolves to '${expectedName}'`);
  assert(res.total === expectedPrice, `'${phrase}' total is $${expectedPrice.toFixed(2)}`);
  assert((res.unmatchedPhrases?.length ?? 0) === 0, `'${phrase}' has 0 unmatched phrases`);
}

// 16. Inquiries and Where Questions (Must Never Be Treated as Missing Items)
console.log("\n--- 16. Inquiries and Where Questions ---");
const inquiryRes1 = matchOrderFromTranscript("where is the affiliate", sampleMenu);
assert(inquiryRes1.items.length === 0, "'where is the affiliate' does not add an item");
assert((inquiryRes1.unmatchedPhrases?.length ?? 0) === 0, "'where is the affiliate' has 0 unmatched phrases");

const inquiryRes2 = matchOrderFromTranscript("where is the eye fillet", sampleMenu);
assert(inquiryRes2.items.length === 0, "'where is the eye fillet' does not add an item");
assert((inquiryRes2.unmatchedPhrases?.length ?? 0) === 0, "'where is the eye fillet' has 0 unmatched phrases");

// 17. Professional Chef Voice Confirmations
console.log("\n--- 17. Professional Chef Voice Confirmations ---");
assert(isVoiceConfirmation("let the chef know") === true, "Identifies 'let the chef know' as voice confirmation");
assert(isVoiceConfirmation("tell the chef") === true, "Identifies 'tell the chef' as voice confirmation");
assert(isVoiceConfirmation("prepare it") === true, "Identifies 'prepare it' as voice confirmation");
assert(isVoiceConfirmation("go ahead and prepare") === true, "Identifies 'go ahead and prepare' as voice confirmation");
assert(isVoiceConfirmation("please prepare") === true, "Identifies 'please prepare' as voice confirmation");

// 18. Voice Removals, Item Deletions & Order Clearing
console.log("\n--- 18. Voice Removals, Item Deletions & Order Clearing ---");

// Test: Cancellation / Clear phrases
const clearPhrases = [
  "clear order",
  "clear the order",
  "clear my order",
  "clear everything",
  "delete everything",
  "delete all items",
  "cancel order",
  "cancel the order",
  "empty the cart",
  "empty cart",
  "reset order",
  "reset the order",
  "start over",
  "start again",
  "remove everything",
  "remove all items",
];

for (const phrase of clearPhrases) {
  assert(isCancellationOrClear(phrase) === true, `'${phrase}' is recognized as cancellation/clear`);
}

// Test: Clear an active order
const orderThenClear = matchOrderFromTranscript(
  "can I have an Eye Fillet\nclear the order",
  sampleMenu
);
assert(orderThenClear.items.length === 0, "Order is completely empty after 'clear the order'");
assert(orderThenClear.total === 0, "Total is $0.00 after 'clear the order'");
assert(orderThenClear.wasCleared === true, "wasCleared flag is true");
assert(orderThenClear.hasOrderOperations === true, "hasOrderOperations is true");

// Test: Remove specific item by voice
const orderTwoRemoveOne = matchOrderFromTranscript(
  "can I have an Eye Fillet and one Wagyu Ribeye\nremove the eye fillet",
  sampleMenu
);
assert(orderTwoRemoveOne.items.length === 1, "Only 1 item remains after removing eye fillet");
assert(orderTwoRemoveOne.items[0]?.name === "Wagyu Ribeye", "Remaining item is Wagyu Ribeye");
assert(orderTwoRemoveOne.total === 48, "Total is $48.00 after removing Eye Fillet");
assert(orderTwoRemoveOne.lastAction?.type === "remove", "Last action was 'remove'");

// Test: Remove item using phonetic alias "remove affiliate"
const orderAffiliateRemoveAffiliate = matchOrderFromTranscript(
  "can I have affiliate\nremove the affiliate",
  sampleMenu
);
assert(orderAffiliateRemoveAffiliate.items.length === 0, "Eye Fillet removed via 'remove the affiliate'");
assert(orderAffiliateRemoveAffiliate.total === 0, "Total is $0 after removing affiliate");

// Test: Remove item using phonetic alias "delete giveaway"
const orderGiveawayDeleteGiveaway = matchOrderFromTranscript(
  "can I have giveaway and Pan-Seared Salmon\ndelete giveaway",
  sampleMenu
);
assert(orderGiveawayDeleteGiveaway.items.length === 1, "1 item remains after 'delete giveaway'");
assert(orderGiveawayDeleteGiveaway.items[0]?.name === "Pan-Seared Salmon", "Remaining item is Pan-Seared Salmon");
assert(orderGiveawayDeleteGiveaway.total === 32, "Total is $32.00");

// Test: Decrement quantity by voice
const orderTwoWagyuRemoveOne = matchOrderFromTranscript(
  "can I have two Wagyu Ribeyes\nremove one wagyu ribeye",
  sampleMenu
);
assert(orderTwoWagyuRemoveOne.items.length === 1, "1 item remains after decrementing");
assert(orderTwoWagyuRemoveOne.items[0]?.quantity === 1, "Quantity decremented from 2 to 1");
assert(orderTwoWagyuRemoveOne.total === 48, "Total is $48.00");

// Test: "take off the salmon"
const orderSalmonTakeOff = matchOrderFromTranscript(
  "can I have Pan-Seared Salmon\ntake off the salmon",
  sampleMenu
);
assert(orderSalmonTakeOff.items.length === 0, "Salmon removed via 'take off the salmon'");

// Test: "cancel the fries"
const orderFriesCancel = matchOrderFromTranscript(
  "can I have French Fries and Caesar Salad\ncancel the fries",
  sampleMenu
);
assert(orderFriesCancel.items.length === 1, "Caesar Salad remains after 'cancel the fries'");
assert(orderFriesCancel.items[0]?.name === "Caesar Salad", "Item is Caesar Salad");
assert(orderFriesCancel.total === 18, "Total is $18.00");

// Test: "actually no risotto"
const orderRisottoNo = matchOrderFromTranscript(
  "can I have Truffle Mushroom Risotto\nactually no risotto",
  sampleMenu
);
assert(orderRisottoNo.items.length === 0, "Risotto removed via 'actually no risotto'");

// --- 19. Accent Pronunciation & Speech Wrappers for Eye Fillet ---
console.log("\n--- 19. Accent Pronunciation & Speech Wrappers for Eye Fillet ---");

const orderCanYouGiveMeIFeelIt = matchOrderFromTranscript(
  "can you give me I feel it",
  sampleMenu
);
assert(orderCanYouGiveMeIFeelIt.items.length === 1, "'can you give me I feel it' matches 1 item");
assert(orderCanYouGiveMeIFeelIt.items[0]?.name === "Eye Fillet", "'can you give me I feel it' resolves to 'Eye Fillet'");
assert(orderCanYouGiveMeIFeelIt.total === 42, "'can you give me I feel it' total is $42.00");
assert(
  !orderCanYouGiveMeIFeelIt.unmatchedPhrases || orderCanYouGiveMeIFeelIt.unmatchedPhrases.length === 0,
  "'can you give me I feel it' has 0 unmatched phrases"
);

const orderGiveMeIFeelIt = matchOrderFromTranscript(
  "give me i feel it",
  sampleMenu
);
assert(orderGiveMeIFeelIt.items.length === 1, "'give me i feel it' matches 1 item");
assert(orderGiveMeIFeelIt.items[0]?.name === "Eye Fillet", "'give me i feel it' resolves to 'Eye Fillet'");
assert(orderGiveMeIFeelIt.total === 42, "'give me i feel it' total is $42.00");
assert(
  !orderGiveMeIFeelIt.unmatchedPhrases || orderGiveMeIFeelIt.unmatchedPhrases.length === 0,
  "'give me i feel it' has 0 unmatched phrases"
);

const orderCouldYouGiveMeIFeelIt = matchOrderFromTranscript(
  "could you give me I feel it",
  sampleMenu
);
assert(orderCouldYouGiveMeIFeelIt.items.length === 1, "'could you give me I feel it' matches 1 item");
assert(orderCouldYouGiveMeIFeelIt.items[0]?.name === "Eye Fillet", "'could you give me I feel it' resolves to 'Eye Fillet'");
assert(orderCouldYouGiveMeIFeelIt.total === 42, "'could you give me I feel it' total is $42.00");
assert(
  !orderCouldYouGiveMeIFeelIt.unmatchedPhrases || orderCouldYouGiveMeIFeelIt.unmatchedPhrases.length === 0,
  "'could you give me I feel it' has 0 unmatched phrases"
);

const orderCanYouGiveMeWagyu = matchOrderFromTranscript(
  "can you give me Wagyu Ribeye",
  sampleMenu
);
assert(orderCanYouGiveMeWagyu.items.length === 1, "'can you give me Wagyu Ribeye' matches 1 item");
assert(orderCanYouGiveMeWagyu.items[0]?.name === "Wagyu Ribeye", "'can you give me Wagyu Ribeye' resolves to 'Wagyu Ribeye'");
assert(orderCanYouGiveMeWagyu.total === 48, "'can you give me Wagyu Ribeye' total is $48.00");
assert(
  !orderCanYouGiveMeWagyu.unmatchedPhrases || orderCanYouGiveMeWagyu.unmatchedPhrases.length === 0,
  "'can you give me Wagyu Ribeye' has 0 unmatched phrases"
);

const orderCanYouGiveMeAffiliate = matchOrderFromTranscript(
  "can you give me an affiliate",
  sampleMenu
);
assert(orderCanYouGiveMeAffiliate.items.length === 1, "'can you give me an affiliate' matches 1 item");
assert(orderCanYouGiveMeAffiliate.items[0]?.name === "Eye Fillet", "'can you give me an affiliate' resolves to 'Eye Fillet'");
assert(orderCanYouGiveMeAffiliate.total === 42, "'can you give me an affiliate' total is $42.00");
assert(
  !orderCanYouGiveMeAffiliate.unmatchedPhrases || orderCanYouGiveMeAffiliate.unmatchedPhrases.length === 0,
  "'can you give me an affiliate' has 0 unmatched phrases"
);

const orderCanYouPleaseGiveUsTwoEyeFillets = matchOrderFromTranscript(
  "can you please give us two eye fillets",
  sampleMenu
);
assert(orderCanYouPleaseGiveUsTwoEyeFillets.items.length === 1, "'can you please give us two eye fillets' matches 1 item");
assert(orderCanYouPleaseGiveUsTwoEyeFillets.items[0]?.quantity === 2, "Quantity is 2");
assert(orderCanYouPleaseGiveUsTwoEyeFillets.items[0]?.name === "Eye Fillet", "Item is 'Eye Fillet'");
assert(orderCanYouPleaseGiveUsTwoEyeFillets.total === 84, "Total is $84.00 (2 x $42.00)");
assert(
  !orderCanYouPleaseGiveUsTwoEyeFillets.unmatchedPhrases || orderCanYouPleaseGiveUsTwoEyeFillets.unmatchedPhrases.length === 0,
  "0 unmatched phrases"
);

console.log("\n=======================================================");
console.log(`TOTAL MATCHER TESTS : ${total}`);
console.log(`PASSED              : ${passed}`);
console.log(`FAILED              : ${failed}`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}


