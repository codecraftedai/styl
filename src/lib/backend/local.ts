import { uuid } from "@/lib/uuid";
import { del, get, set } from "idb-keyval";
import type { Backend, Snapshot } from "./types";

// Demo mode: everything lives in this browser (localStorage + IndexedDB for photos). Used when Supabase keys are missing.
const KEY = "styl:data";
const SESSION = "styl:session";
const empty: Snapshot = { profile: null, items: [], outfits: [] };

const read = (): Snapshot => { try { return { ...empty, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return empty; } };
const write = (fn: (s: Snapshot) => Snapshot) => localStorage.setItem(KEY, JSON.stringify(fn(read())));
const urls = new Map<string, string>();

export const localBackend: Backend = {
  mode: "local",
  async session() { const e = localStorage.getItem(SESSION); return e ? { userId: "local", email: e } : null; },
  async signIn(email) { localStorage.setItem(SESSION, email); },
  async signUp(email) { localStorage.setItem(SESSION, email); },
  async signOut() { localStorage.removeItem(SESSION); },
  async token() { return null; },
  async load() { return read(); },
  async saveProfile(profile) { write((s) => ({ ...s, profile })); },
  async uploadImage(photo) { const path = `local/${uuid()}.webp`; await set(path, photo); return path; },
  async imageUrls(paths) {
    const out: Record<string, string> = {};
    for (const p of paths) {
      if (!urls.has(p)) { const blob = await get<Blob>(p); if (blob) urls.set(p, URL.createObjectURL(blob)); }
      if (urls.has(p)) out[p] = urls.get(p)!;
    }
    return out;
  },
  async saveItem(item) { write((s) => ({ ...s, items: [item, ...s.items.filter((i) => i.id !== item.id)] })); },
  async deleteItem(item) { await del(item.imagePath); write((s) => ({ ...s, items: s.items.filter((i) => i.id !== item.id) })); },
  async saveOutfit(o) { write((s) => ({ ...s, outfits: [o, ...s.outfits.filter((x) => x.id !== o.id)] })); },
  async deleteOutfit(id) { write((s) => ({ ...s, outfits: s.outfits.filter((x) => x.id !== id) })); },
};
