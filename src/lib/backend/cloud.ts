import { uuid } from "@/lib/uuid";
import { createClient } from "@supabase/supabase-js";
import type { Item, Outfit, Profile } from "../types";
import type { Backend } from "./types";

const BUCKET = "wardrobe";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const uid = async () => {
  const { data } = await sb.auth.getSession();
  if (!data.session) throw new Error("Please sign in again.");
  return data.session.user.id;
};
const ok = <T,>({ data, error }: { data: T | null; error: { message: string } | null }): T => { if (error) throw new Error(error.message); return data as T; };
const check = ({ error }: { error: { message: string } | null }) => { if (error) throw new Error(error.message); };

type ItemRow = {
  id: string; image_path: string; name: string; category: Item["category"]; slot: Item["slot"]; colours: string[];
  pattern: string; formality: Item["formality"]; season: Item["season"]; styles: Item["styles"]; brand: string; notes: string;
  favourite: boolean; wear_count: number; last_worn: string | null; created_at: string;
  lightness: number | null; fit: Item["fit"];
};
const toItem = (r: ItemRow): Item => ({
  id: r.id, imagePath: r.image_path, name: r.name, category: r.category, slot: r.slot, colours: r.colours, pattern: r.pattern,
  formality: r.formality, season: r.season, styles: r.styles, brand: r.brand, notes: r.notes, favourite: r.favourite,
  wearCount: r.wear_count, lastWorn: r.last_worn, createdAt: r.created_at, lightness: r.lightness ?? null, fit: r.fit ?? null,
});
const fromItem = (i: Item, user_id: string) => ({
  id: i.id, user_id, image_path: i.imagePath, name: i.name, category: i.category, slot: i.slot, colours: i.colours, pattern: i.pattern,
  formality: i.formality, season: i.season, styles: i.styles, brand: i.brand, notes: i.notes, favourite: i.favourite,
  wear_count: i.wearCount, last_worn: i.lastWorn, created_at: i.createdAt, lightness: i.lightness, fit: i.fit,
});

const signed = new Map<string, { url: string; exp: number }>();

export const cloudBackend: Backend = {
  mode: "cloud",
  async session() {
    const { data } = await sb.auth.getSession();
    return data.session ? { userId: data.session.user.id, email: data.session.user.email ?? "" } : null;
  },
  async signIn(email, password) { check(await sb.auth.signInWithPassword({ email, password })); },
  async signUp(email, password) {
    const r = await sb.auth.signUp({ email, password });
    check(r);
    if (!r.data.session) throw new Error("Check your inbox to confirm your email, then sign in.");
  },
  async signOut() { await sb.auth.signOut(); signed.clear(); },
  async token() { return (await sb.auth.getSession()).data.session?.access_token ?? null; },

  async load() {
    const [p, items, outfits] = await Promise.all([
      sb.from("profiles").select("name, prefs, onboarded").maybeSingle(),
      sb.from("items").select("*").order("created_at", { ascending: false }),
      sb.from("outfits").select("*").order("created_at", { ascending: false }),
    ]);
    return {
      profile: ok(p) as Profile | null,
      items: (ok(items) as ItemRow[]).map(toItem),
      outfits: (ok(outfits) as { id: string; name: string; item_ids: string[]; occasion: Outfit["occasion"]; created_at: string }[])
        .map((o) => ({ id: o.id, name: o.name, itemIds: o.item_ids, occasion: o.occasion, createdAt: o.created_at })),
    };
  },
  async saveProfile(p) { ok(await sb.from("profiles").upsert({ id: await uid(), ...p })); },

  async uploadImage(photo) {
    const path = `${await uid()}/${uuid()}.webp`;
    ok(await sb.storage.from(BUCKET).upload(path, photo, { contentType: "image/webp", cacheControl: "31536000" }));
    return path;
  },
  async imageUrls(paths) {
    const now = Date.now();
    const need = paths.filter((p) => (signed.get(p)?.exp ?? 0) < now + 60_000);
    if (need.length) {
      const rows = ok(await sb.storage.from(BUCKET).createSignedUrls(need, 60 * 60 * 6)) ?? [];
      for (const r of rows) if (r.signedUrl && r.path) signed.set(r.path, { url: r.signedUrl, exp: now + 6 * 3600_000 });
    }
    return Object.fromEntries(paths.filter((p) => signed.has(p)).map((p) => [p, signed.get(p)!.url]));
  },
  async saveItem(item) {
    const row = fromItem(item, await uid());
    const r = await sb.from("items").upsert(row);
    // Older databases without the lightness/fit columns (migration not run yet): save the rest instead of failing.
    if (r.error && /lightness|fit/.test(r.error.message)) {
      const { lightness: _l, fit: _f, ...legacy } = row; // eslint-disable-line @typescript-eslint/no-unused-vars
      ok(await sb.from("items").upsert(legacy));
    } else ok(r);
  },
  async deleteItem(item) {
    ok(await sb.from("items").delete().eq("id", item.id));
    await sb.storage.from(BUCKET).remove([item.imagePath]); // best effort; row is already gone
  },
  async saveOutfit(o) {
    ok(await sb.from("outfits").upsert({ id: o.id, user_id: await uid(), name: o.name, item_ids: o.itemIds, occasion: o.occasion, created_at: o.createdAt }));
  },
  async deleteOutfit(id) { ok(await sb.from("outfits").delete().eq("id", id)); },
};
