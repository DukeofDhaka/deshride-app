// Keeps contact details out of chat and every other free-text field, and spots
// attempts to move payment outside the app. DeshRide's protections (escrow,
// refunds, no-show cover, reviews) only work while people talk and pay here.
//
// The same rules run on the server (supabase/migrations/0003_functions.sql,
// `app.guard_message`) so a modified app can't skip them. Keep the two in step.

export type MessageFlag = "contact" | "payment";

export interface GuardResult {
  text: string;
  flags: MessageFlag[];
}

const HIDDEN = "[HIDDEN]";

// Bangladeshi mobile numbers in any common shape: +880 / 880 / 0 prefix,
// Bangla or Latin digits, with spaces, dashes, dots or zero-width joiners.
const PHONE_PATTERN =
  /(?:\+?[8৮]\s*[-()_./​‍]*\s*[0০]?\s*[-()_./​‍]*\s*[1১]|[0০]\s*[-()_./​‍]*\s*[1১]|\(?\+?[8৮]\)?\s*[-()_./​‍]*\s*[0০]?\s*[-()_./​‍]*\s*[1১])\s*[-()_./​‍]*\s*[0-9০-৯](?:\s*[-()_./​‍]*\s*[0-9০-৯]){8}/.source;

// Number words people use to slip a number past a digit filter.
// Bangla "য়" can be typed as one code point (U+09DF) or as য + nukta, so the
// words containing it are listed in both spellings.
const NUMBER_WORDS: Record<string, string> = {
  zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9",
  // Bangla
  "শূন্য": "0", "শুন্য": "0", "এক": "1", "দুই": "2", "তিন": "3", "চার": "4",
  "পাঁচ": "5", "পাচ": "5", "সাত": "7", "আট": "8",
  "\u099B\u09DF": "6", "\u099B\u09AF\u09BC": "6",
  "\u09A8\u09DF": "9", "\u09A8\u09AF\u09BC": "9",
  // English words written in Bangla script
  "জিরো": "0", "টু": "2", "থ্রি": "3", "ফোর": "4", "ফাইভ": "5",
  "সিক্স": "6", "সেভেন": "7", "এইট": "8", "নাইন": "9",
  "\u0993\u09DF\u09BE\u09A8": "1", "\u0993\u09AF\u09BC\u09BE\u09A8": "1"
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const WORD_ALT = Object.keys(NUMBER_WORDS)
  .sort((a, b) => b.length - a.length)
  .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
// A "number token" is a digit or a number word standing on its own.
const TOKEN = `(?:[0-9০-৯]|(?<![\\p{L}\\p{M}])(?:${WORD_ALT})(?![\\p{L}\\p{M}]))`;
const TOKEN_SEP = "[\\s\\-–—_.,/()+\\u200B\\u200D]*";
const TOKEN_RUN = new RegExp(`\\+?${TOKEN}(?:${TOKEN_SEP}${TOKEN})+`, "giu");
const TOKEN_ONE = new RegExp(TOKEN, "giu");

// A mobile number once reduced to plain digits: 01[3-9] + 8 digits,
// optionally with the 880 / 88 country prefix.
const DIGIT_PHONE = /(?:880|88)?01[3-9]\d{8}/;

const CONTACT_PATTERNS: RegExp[] = [
  // Messaging and social links
  /(?:https?:\/\/)?(?:www\.)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.me|m\.me|messenger\.com|viber\.com|invite\.viber\.com|imo\.im|facebook\.com|fb\.com|fb\.me|instagram\.com)(?:\/[^\s]*)?/giu,
  /\b(?:whatsapp|viber|tg|imo):\/\/[^\s]*/giu,
  // Email addresses
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu,
  // "WhatsApp me", "imo te nok din", "হোয়াটসঅ্যাপে কল দিন" …
  /\b(?:whats\s?app|wa|imo|viber|telegram|messenger)\s+(?:me|koren|korun|kor|kore|te|e|number|no\.?|id)\b/giu,
  /(?:হোয়াটসঅ্যাপ|হোয়াটসঅ্যাপ|হোয়াটস অ্যাপ|ইমো|ভাইবার|টেলিগ্রাম|মেসেঞ্জার)(?:ে|তে|এ)?\s*(?:নক|কল|মেসেজ|যোগাযোগ|নম্বর|নাম্বার|আইডি)/gu
];

const PAYMENT_PATTERNS: RegExp[] = [
  /\b(?:bkash|b-kash|bikash|nagad|rocket|upay)\s+(?:me|you|him|her|it|kore|kor|koro|korun|kroben|diyen|den|dio|to me|send)\b/iu,
  /\b(?:bkash|b-kash|bikash|nagad|rocket|upay|cash)\b[^.!?\n]{0,20}\bdirect(?:ly)?\b/iu,
  /\bdirect(?:ly)?\b[^.!?\n]{0,20}\b(?:bkash|b-kash|bikash|nagad|rocket|upay|cash)\b/iu,
  /\bsend\s+(?:me\s+)?(?:the\s+)?(?:money|taka|tk|fare)\b/iu,
  /\b(?:pay|paying|give|giving|take|taking)\b[^.!?\n]{0,20}\bcash\b/iu,
  /\bcash\s+(?:only|payment|in hand|on arrival|e|dite|diben)\b/iu,
  /\b(?:in\s+)?advance\b/iu,
  /\bpersonal\s+(?:number|no\.?|account|bkash|nagad)\b/iu,
  /\bpay\s+(?:you|me|him|her)\s+directly\b/iu,
  /\b(?:off[\s-]?app|outside\s+(?:the\s+)?app|without\s+(?:the\s+)?app)\b/iu,
  /বিকাশ\s*(?:করে|করুন|কইরা|কইরেন|দিন|দেন|পাঠান)/u,
  /নগদে?\s*(?:পাঠান|দিন|দেন|করে)/u,
  /ক্যাশ/u,
  /নগদ\s*টাকা/u,
  /অগ্রিম/u,
  /সরাসরি\s*(?:টাকা|পেমেন্ট|দিন)/u,
  /হাতে\s*হাতে/u,
  /অ্যাপের\s*বাইরে/u,
  /(?:পার্সোনাল|ব্যক্তিগত)\s*(?:নম্বর|নাম্বার|বিকাশ|একাউন্ট)/u
];

function toAsciiDigits(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

// The digits a run of number tokens spells, e.g. "zero one seven" → "017".
function runDigits(run: string): string {
  let out = "";
  for (const m of run.matchAll(TOKEN_ONE)) {
    const tok = m[0];
    out += /[0-9০-৯]/.test(tok) ? toAsciiDigits(tok) : NUMBER_WORDS[tok.toLowerCase()] ?? NUMBER_WORDS[tok] ?? "";
  }
  return out;
}

function hidePhones(text: string): { text: string; hit: boolean } {
  let hit = false;
  // 1. Runs of digits and/or number words ("+880 17…", "zero one seven…").
  let out = text.replace(TOKEN_RUN, (run) => {
    if (DIGIT_PHONE.test(runDigits(run))) {
      hit = true;
      return HIDDEN;
    }
    return run;
  });
  // 2. Anything the formatted-number pattern still catches.
  out = out.replace(new RegExp(PHONE_PATTERN, "gi"), () => {
    hit = true;
    return HIDDEN;
  });
  return { text: out, hit };
}

function hideContactRoutes(text: string): { text: string; hit: boolean } {
  let hit = false;
  let out = text;
  for (const re of CONTACT_PATTERNS) {
    out = out.replace(re, () => {
      hit = true;
      return HIDDEN;
    });
  }
  return { text: out, hit };
}

export function containsPhoneNumber(text: string): boolean {
  return hidePhones(text).hit;
}

export function containsContactInfo(text: string): boolean {
  return hidePhones(text).hit || hideContactRoutes(text).hit;
}

export function detectOffAppPayment(text: string): boolean {
  return PAYMENT_PATTERNS.some((re) => re.test(text));
}

// For notes, bios and request messages: hide numbers and contact routes.
export function censorPhoneNumbers(text: string): string {
  return hideContactRoutes(hidePhones(text).text).text;
}

// The digits in a message, numbers spelled as words included.
function messageDigits(text: string): string {
  let out = "";
  for (const m of text.matchAll(TOKEN_ONE)) out += runDigits(m[0]);
  return out;
}

// For chat. `history` holds the sender's own recent messages in this chat
// (oldest first), so a number typed a few digits at a time is still caught.
export function guardMessage(text: string, history: string[] = []): GuardResult {
  const flags = new Set<MessageFlag>();
  const phones = hidePhones(text);
  const routes = hideContactRoutes(phones.text);
  let out = routes.text;
  if (phones.hit || routes.hit) flags.add("contact");

  const mine = messageDigits(out);
  if (mine.length > 0 && !phones.hit) {
    const recent = history.slice(-5).map(messageDigits).join("");
    const joined = recent + mine;
    const match = DIGIT_PHONE.exec(joined);
    // Only when the number finishes in this message (its last digits are here).
    if (match && match.index + match[0].length > recent.length) {
      out = out.replace(TOKEN_RUN, HIDDEN).replace(TOKEN_ONE, (t) => (/[0-9০-৯]/.test(t) ? HIDDEN : t));
      out = out.replace(/(?:\[HIDDEN\][\s\-.]*)+/g, `${HIDDEN} `).trim();
      flags.add("contact");
    }
  }

  if (detectOffAppPayment(text)) flags.add("payment");
  return { text: out, flags: [...flags] };
}

// How far back split-number detection looks, for callers that pick history.
export const SPLIT_WINDOW_MS = 15 * 60 * 1000;
