"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getBackend } from "./backend";
import { uuid } from "./uuid";
import type { Backend, Session } from "./backend/types";
import { toast } from "@/components/ui/toast";
import type { Item, Outfit, Profile } from "./types";

type Status = "loading" | "signed-out" | "ready";

type Store = {
  status: Status;
  mode: Backend["mode"] | null;
  session: Session | null;
  profile: Profile | null;
  items: Item[];
  outfits: Outfit[];
  urls: Record<string, string>;
  signIn(email: string, password: string, isNew: boolean): Promise<void>;
  signOut(): Promise<void>;
  saveProfile(p: Profile): Promise<void>;
  addItem(photo: Blob, fields: Omit<Item, "id" | "imagePath" | "createdAt" | "wearCount" | "lastWorn" | "favourite">): Promise<Item>;
  updateItem(item: Item): Promise<void>;
  deleteItem(item: Item): Promise<void>;
  markWorn(ids: string[]): Promise<void>;
  /** Put items in (or take them out of) the laundry. */
  setLaundry(ids: string[], inLaundry: boolean): Promise<void>;
  saveOutfit(o: Omit<Outfit, "id" | "createdAt">): Promise<void>;
  deleteOutfit(id: string): Promise<void>;
  token(): Promise<string | null>;
};

const Ctx = createContext<Store | null>(null);
export const today = () => new Date().toLocaleDateString("en-CA"); // yyyy-mm-dd, local time

export function StoreProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<Backend | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const loadAll = useCallback(async (b: Backend) => {
    const s = await b.session();
    setSession(s);
    if (!s) { setStatus("signed-out"); return; }
    const snap = await b.load();
    setProfile(snap.profile);
    setItems(snap.items);
    setOutfits(snap.outfits);
    setUrls(await b.imageUrls(snap.items.map((i) => i.imagePath)));
    setStatus("ready");
  }, []);

  useEffect(() => {
    getBackend().then((b) => { setBackend(b); return loadAll(b); }).catch(() => {
      toast("Couldn't load your wardrobe. Check your connection.", "error");
      setStatus("signed-out");
    });
  }, [loadAll]);

  /** Optimistic write: apply locally first, roll back and tell the user if the server refuses. */
  const commit = useCallback(async (apply: () => void, rollback: () => void, write: () => Promise<void>, failMsg: string) => {
    apply();
    try { await write(); } catch { rollback(); toast(failMsg, "error"); }
  }, []);

  const store = useMemo<Store>(() => {
    const b = backend!;
    return {
      status, mode: backend?.mode ?? null, session, profile, items, outfits, urls,
      token: () => b.token(),
      async signIn(email, password, isNew) {
        await (isNew ? b.signUp(email, password) : b.signIn(email, password));
        setStatus("loading");
        await loadAll(b);
      },
      async signOut() {
        await b.signOut();
        setSession(null); setProfile(null); setItems([]); setOutfits([]); setUrls({});
        setStatus("signed-out");
      },
      async saveProfile(p) { await b.saveProfile(p); setProfile(p); },
      async addItem(photo, fields) {
        const imagePath = await b.uploadImage(photo);
        const item: Item = { ...fields, id: uuid(), imagePath, favourite: false, wearCount: 0, lastWorn: null, createdAt: new Date().toISOString() };
        await b.saveItem(item);
        const u = await b.imageUrls([imagePath]);
        setUrls((x) => ({ ...x, ...u }));
        setItems((x) => [item, ...x]);
        return item;
      },
      async updateItem(item) {
        const prev = items;
        await commit(() => setItems((x) => x.map((i) => (i.id === item.id ? item : i))), () => setItems(prev), () => b.saveItem(item), "Couldn't save that change.");
      },
      async deleteItem(item) {
        const prev = items, prevOutfits = outfits;
        await commit(
          () => { setItems((x) => x.filter((i) => i.id !== item.id)); setOutfits((x) => x.filter((o) => !o.itemIds.includes(item.id))); },
          () => { setItems(prev); setOutfits(prevOutfits); },
          async () => { await b.deleteItem(item); await Promise.all(outfits.filter((o) => o.itemIds.includes(item.id)).map((o) => b.deleteOutfit(o.id))); },
          "Couldn't delete the item.",
        );
      },
      async setLaundry(ids, inLaundry) {
        if (!profile) return;
        const prev = profile;
        const current = profile.prefs.laundry ?? [];
        const laundry = inLaundry ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id));
        const next = { ...profile, prefs: { ...profile.prefs, laundry } };
        await commit(() => setProfile(next), () => setProfile(prev), () => b.saveProfile(next), "Couldn't update the laundry.");
      },
      async markWorn(ids) {
        const prev = items, d = today();
        const next = items.map((i) => (ids.includes(i.id) && i.lastWorn !== d ? { ...i, wearCount: i.wearCount + 1, lastWorn: d } : i));
        const changed = next.filter((i, k) => i !== items[k]);
        await commit(() => setItems(next), () => setItems(prev), async () => { await Promise.all(changed.map((i) => b.saveItem(i))); }, "Couldn't log that outfit.");
      },
      async saveOutfit(o) {
        const outfit: Outfit = { ...o, id: uuid(), createdAt: new Date().toISOString() };
        const prev = outfits;
        await commit(() => setOutfits((x) => [outfit, ...x]), () => setOutfits(prev), () => b.saveOutfit(outfit), "Couldn't save the outfit.");
      },
      async deleteOutfit(id) {
        const prev = outfits;
        await commit(() => setOutfits((x) => x.filter((o) => o.id !== id)), () => setOutfits(prev), () => b.deleteOutfit(id), "Couldn't delete the outfit.");
      },
    };
  }, [backend, status, session, profile, items, outfits, urls, loadAll, commit]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
