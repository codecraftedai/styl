export const CATEGORIES = ["Tops", "Bottoms", "Dresses", "Ethnic", "Outerwear", "Shoes", "Bags", "Accessories"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Where an item sits in an outfit. Decoupled from category: a kurta is Ethnic + top, a saree is Ethnic + one-piece. */
export const SLOTS = ["top", "bottom", "one-piece", "outer", "shoes", "bag", "accessory"] as const;
export type Slot = (typeof SLOTS)[number];

export const FORMALITY = ["casual", "smart", "formal"] as const;
export type Formality = (typeof FORMALITY)[number];

export const SEASONS = ["summer", "winter", "all"] as const;
export type Season = (typeof SEASONS)[number];

export const STYLES = ["Minimal", "Classic", "Streetwear", "Smart casual", "Sporty", "Bohemian", "Ethnic", "Edgy"] as const;
export type Style = (typeof STYLES)[number];

export const OCCASIONS = ["Casual", "Work", "Date night", "Party", "Festive", "Travel", "Gym"] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const WEARS = ["Women", "Men", "Both"] as const;
export type Wear = (typeof WEARS)[number];

export const CLIMATES = ["Hot", "Mild", "Cold"] as const;
export type Climate = (typeof CLIMATES)[number];

export type Item = {
  id: string;
  imagePath: string;
  name: string;
  category: Category;
  slot: Slot;
  colours: string[]; // colour ids from COLOURS, primary first
  pattern: string;
  formality: Formality;
  season: Season;
  styles: Style[];
  brand: string;
  notes: string;
  favourite: boolean;
  wearCount: number;
  lastWorn: string | null; // yyyy-mm-dd
  createdAt: string;
};

// "More about you" (Profile). Every answer here changes suggestions; see src/lib/suggest.ts.
export const DRESS_CODES = ["Formal", "Business casual", "Smart casual", "Casual", "Work from home"] as const;
export const BOLDNESS = ["Subtle", "Balanced", "Bold"] as const;
export const PRINT_LOVE = ["Love them", "Sometimes", "Rarely"] as const;
export const UNDERTONES = ["Warm", "Cool", "Neutral", "Not sure"] as const;
export const TEMP_FEEL = ["I feel the cold", "Normal", "I feel the heat"] as const;
export const ACCESSORY_LOVE = ["Always", "Sometimes", "Rarely"] as const;

export type Prefs = {
  wear: Wear; // which clothes they shop/dress in; tunes copy and style examples
  styles: Style[];
  occasions: Occasion[];
  loveColours: string[];
  avoidColours: string[];
  climate: Climate;
  liveWeather: boolean;
  dressCode: (typeof DRESS_CODES)[number];
  boldness: (typeof BOLDNESS)[number];
  prints: (typeof PRINT_LOVE)[number];
  undertone: (typeof UNDERTONES)[number];
  tempFeel: (typeof TEMP_FEEL)[number];
  accessories: (typeof ACCESSORY_LOVE)[number];
};

export type Profile = { name: string; prefs: Prefs; onboarded: boolean };

export type Outfit = { id: string; name: string; itemIds: string[]; occasion: Occasion; createdAt: string };

export const EMPTY_PREFS: Prefs = { wear: "Both", styles: [], occasions: [], loveColours: [], avoidColours: [], climate: "Hot", liveWeather: false,
  dressCode: "Business casual", boldness: "Balanced", prints: "Sometimes", undertone: "Not sure", tempFeel: "Normal", accessories: "Sometimes",
};
