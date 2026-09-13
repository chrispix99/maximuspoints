import type { Category } from "./card-math";

/** Keyword → category rules, most specific first. "Gas at Costco" must hit
 *  gas before groceries; Alaska Airlines must beat generic flight terms. */
const RULES: { category: Category; keywords: string[] }[] = [
  {
    category: "alaska_airlines",
    keywords: ["alaska airlines", "alaska air", "atmos rewards", "atmos"],
  },
  {
    category: "flights",
    keywords: [
      "flight",
      "airfare",
      "airline",
      "plane ticket",
      "delta",
      "united airlines",
      "american airlines",
      "southwest",
    ],
  },
  {
    category: "hotels",
    keywords: [
      "hotel",
      "motel",
      "airbnb",
      "vrbo",
      "lodging",
      "hyatt",
      "marriott",
      "hilton",
      "ihg",
    ],
  },
  {
    category: "gas",
    keywords: ["gas", "fuel", "chevron", "shell", "exxon"],
  },
  {
    category: "groceries",
    keywords: [
      "grocer",
      "supermarket",
      "whole foods",
      "trader joe",
      "safeway",
      "kroger",
      "costco",
      "aldi",
    ],
  },
  {
    category: "dining",
    keywords: [
      "dinner",
      "lunch",
      "breakfast",
      "brunch",
      "restaurant",
      "steakhouse",
      "dining",
      "dine",
      "cafe",
      "coffee",
      "takeout",
      "take-out",
      "doordash",
      "uber eats",
      "grubhub",
      "bar ",
      "pub",
      "pizza",
      "sushi",
      "taco",
    ],
  },
  {
    category: "travel",
    keywords: [
      "travel",
      "trip",
      "vacation",
      "rental car",
      "uber",
      "lyft",
      "taxi",
      "cruise",
      "transit",
    ],
  },
];

export interface Detection {
  category: Category;
  matchedKeyword: string | null;
}

/** Detect the spend category from free text. Falls back to "everyday". */
export function detectCategory(input: string): Detection {
  const text = ` ${input.toLowerCase()} `;
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) {
        return { category: rule.category, matchedKeyword: kw.trim() };
      }
    }
  }
  return { category: "everyday", matchedKeyword: null };
}
