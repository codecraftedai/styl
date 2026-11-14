import { ACCESSORY_LOVE, BOLDNESS, DRESS_CODES, PRINT_LOVE, TEMP_FEEL, UNDERTONES } from "@/lib/types";

type Key = "dressCode" | "boldness" | "prints" | "undertone" | "tempFeel" | "accessories";
type Question = { key: Key; label: string; title: string; why: string; options: readonly string[]; notes: Record<string, string> };

// Stylist questions. Each one is read by the outfit engine (src/lib/suggest.ts); don't add one that isn't.
export const QUESTIONS: Question[] = [
  { key: "dressCode", label: "Work", title: "What's your work dress code?", why: "Sets how dressy your Work outfits are.", options: DRESS_CODES,
    notes: { Formal: "Suits, formal shirts, polished shoes", "Business casual": "Shirts, trousers, no tie", "Smart casual": "Neat but relaxed", Casual: "Tees and jeans are fine", "Work from home": "Comfort first" } },
  { key: "boldness", label: "Colour", title: "How bold do you like your colours?", why: "Decides how many colours an outfit mixes.", options: BOLDNESS,
    notes: { Subtle: "Mostly neutrals, quiet palettes", Balanced: "Neutrals with one colour", Bold: "Happy to mix two colours" } },
  { key: "prints", label: "Prints", title: "How do you feel about prints?", why: "Stripes, checks and florals get more or less airtime.", options: PRINT_LOVE,
    notes: { "Love them": "Show me patterns", Sometimes: "One print at a time", Rarely: "Mostly solids" } },
  { key: "undertone", label: "Undertone", title: "Your skin undertone?", why: "Some shades flatter warm or cool skin more.", options: UNDERTONES,
    notes: { Warm: "Veins look greenish, gold jewellery suits you", Cool: "Veins look bluish, silver suits you", Neutral: "Both look fine", "Not sure": "We'll skip this" } },
  { key: "tempFeel", label: "Temperature", title: "How do you handle the weather?", why: "Shifts when we add a jacket or layer.", options: TEMP_FEEL,
    notes: { "I feel the cold": "Layer me up sooner", Normal: "Go by the forecast", "I feel the heat": "Keep it light longer" } },
  { key: "accessories", label: "Accessories", title: "Bags, watches, jewellery?", why: "Whether we finish looks with an accessory.", options: ACCESSORY_LOVE,
    notes: { Always: "Every look gets one", Sometimes: "When it adds something", Rarely: "Keep it simple" } },
];

