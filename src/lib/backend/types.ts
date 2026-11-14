import type { Item, Outfit, Profile } from "../types";

export type Session = { userId: string; email: string };
export type Snapshot = { profile: Profile | null; items: Item[]; outfits: Outfit[] };

export type Backend = {
  mode: "local" | "cloud";
  session(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Bearer token for our own API routes (cloud only). */
  token(): Promise<string | null>;
  load(): Promise<Snapshot>;
  saveProfile(p: Profile): Promise<void>;
  uploadImage(photo: Blob): Promise<string>;
  imageUrls(paths: string[]): Promise<Record<string, string>>;
  saveItem(item: Item): Promise<void>;
  deleteItem(item: Item): Promise<void>;
  saveOutfit(o: Outfit): Promise<void>;
  deleteOutfit(id: string): Promise<void>;
};
