"use client";

import { Suspense, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Swatch } from "@/components/ui/swatch";
import { toast } from "@/components/ui/toast";
import { ChoicePicker, ClimatePicker, ColourPicker, OccasionPicker, StylePicker, Toggle, WearPicker } from "@/components/prefs/pickers";
import { QUESTIONS } from "@/components/prefs/more-about-you";
import { SeasonPicker } from "@/components/prefs/season-picker";
import { useStore } from "@/lib/store";
import { EMPTY_PREFS, type Prefs } from "@/lib/types";

type Base = "name" | "wear" | "styles" | "occasions" | "love" | "avoid" | "weather" | "season";
type Editor = Base | (typeof QUESTIONS)[number]["key"] | null;

function Row({ label, value, onClick }: { label: string; value: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-stone active:bg-stone">
      <span className="w-24 shrink-0 text-caption text-ink-3">{label}</span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5 text-right text-caption text-ink">{value}</span>
      <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
    </button>
  );
}

const none = <span className="text-ink-3">Not set</span>;

export default function ProfilePage() {
  return <Suspense><Profile /></Suspense>;
}

function Profile() {
  const { profile, session, items, outfits, mode, saveProfile, signOut } = useStore();
  // ?edit=season (from the weather pill on Home) opens that editor straight away.
  const editParam = useSearchParams().get("edit");
  const [editor, setEditor] = useState<Editor>(() => (editParam === "season" ? "season" : null));
  const [draft, setDraft] = useState<Prefs>({ ...EMPTY_PREFS, ...profile?.prefs });
  const [name, setName] = useState(profile?.name ?? "");
  const [busy, setBusy] = useState(false);
  const p = { ...EMPTY_PREFS, ...profile?.prefs };
  const set = <K extends keyof Prefs>(k: K) => (v: Prefs[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const edit = (e: Editor) => { setDraft(p); setName(profile?.name ?? ""); setEditor(e); };
  async function save() {
    if (!profile) return;
    setBusy(true);
    try { await saveProfile({ ...profile, name: name.trim() || profile.name, prefs: draft }); setEditor(null); toast("Preferences saved"); }
    catch { toast("Couldn't save. Try again.", "error"); }
    finally { setBusy(false); }
  }

  const mostWorn = [...items].sort((a, b) => b.wearCount - a.wearCount)[0];
  const stats = [
    { n: items.length, l: "Pieces" },
    { n: outfits.length, l: "Saved looks" },
    { n: items.reduce((s, i) => s + i.wearCount, 0), l: "Wears logged" },
  ];

  const editors: Record<Exclude<Editor, null>, { title: string; body: ReactNode }> = {
    ...(Object.fromEntries(QUESTIONS.map((q) => [q.key, {
      title: q.title,
      body: <><p className="-mt-1 mb-4 text-caption text-ink-3">{q.why}</p><ChoicePicker options={q.options} value={draft[q.key] as string} notes={q.notes} onChange={(v) => setDraft((d) => ({ ...d, [q.key]: v }))} /></>,
    }])) as Record<(typeof QUESTIONS)[number]["key"], { title: string; body: ReactNode }>),
    name: { title: "Your name", body: <Input label="First name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" /> },
    wear: { title: "You usually wear", body: <WearPicker value={draft.wear} onChange={set("wear")} /> },
    styles: { title: "Your styles", body: <StylePicker value={draft.styles} onChange={set("styles")} wear={draft.wear} /> },
    occasions: { title: "Occasions", body: <OccasionPicker value={draft.occasions} onChange={set("occasions")} /> },
    love: { title: "Colours you love", body: <ColourPicker value={draft.loveColours} onChange={set("loveColours")} disabled={draft.avoidColours} /> },
    avoid: { title: "Colours you avoid", body: <ColourPicker value={draft.avoidColours} onChange={set("avoidColours")} disabled={draft.loveColours} /> },
    season: { title: "Season right now", body: <><p className="-mt-1 mb-4 text-caption text-ink-3">Decides jackets, fabrics and rainy-day rules. A picked season stays until you set it back to Auto.</p><SeasonPicker value={draft.currentSeason} onChange={set("currentSeason")} /></> },
    weather: { title: "Weather", body: <div className="flex flex-col gap-4"><ClimatePicker value={draft.climate} onChange={set("climate")} /><Toggle checked={draft.liveWeather} onChange={set("liveWeather")} label="Use today's weather" note="Uses your location only to fetch the temperature." /></div> },
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-safe md:px-10">
      <header className="flex items-center gap-4 pt-8 pb-8">
        <span className="flex size-18 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[2rem] text-on-ink">{profile?.name?.[0]?.toUpperCase() ?? "S"}</span>
        <div className="min-w-0">
          <h1 className="font-display text-title">{profile?.name}</h1>
          <p className="truncate text-caption text-ink-3">{mode === "local" ? "Demo mode · saved in this browser" : session?.email}</p>
        </div>
      </header>

      <dl className="grid grid-cols-3 rounded-xl border border-line bg-surface py-6">
        {stats.map((s) => (
          <div key={s.l} className="text-center not-last:border-r not-last:border-line">
            <dd className="font-display text-title leading-none">{s.n}</dd>
            <dt className="mt-2 text-[12px] text-ink-3">{s.l}</dt>
          </div>
        ))}
      </dl>
      {mostWorn && mostWorn.wearCount > 1 && <p className="mt-3 text-center text-caption text-ink-3">Most worn: {mostWorn.name} ({mostWorn.wearCount}×)</p>}

      <h2 className="mt-10 mb-3 px-1 text-label uppercase text-ink-3">Your taste</h2>
      <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        <Row label="Name" value={profile?.name} onClick={() => edit("name")} />
        <Row label="Wear" value={p.wear === "Both" ? "Everything" : `${p.wear}swear`} onClick={() => edit("wear")} />
        <Row label="Styles" value={p.styles.length ? p.styles.join(", ") : none} onClick={() => edit("styles")} />
        <Row label="Occasions" value={p.occasions.length ? p.occasions.join(", ") : none} onClick={() => edit("occasions")} />
        <Row label="Love" value={p.loveColours.length ? p.loveColours.map((c) => <Swatch key={c} id={c} className="size-5" />) : none} onClick={() => edit("love")} />
        <Row label="Avoid" value={p.avoidColours.length ? p.avoidColours.map((c) => <Swatch key={c} id={c} className="size-5" />) : none} onClick={() => edit("avoid")} />
        <Row label="Season" value={p.currentSeason === "Auto" ? "Auto" : <>{p.currentSeason}<span className="text-ink-3">· set by you</span></>} onClick={() => edit("season")} />
        <Row label="Weather" value={`${p.climate}${p.liveWeather ? " · live" : ""}`} onClick={() => edit("weather")} />
      </div>

      <h2 className="mt-10 px-1 text-label uppercase text-ink-3">More about you</h2>
      <p className="mt-1 mb-3 px-1 text-caption text-ink-3">A stylist would ask these. Each answer changes the outfits you get.</p>
      <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {QUESTIONS.map((q) => <Row key={q.key} label={q.label} value={p[q.key]} onClick={() => edit(q.key)} />)}
      </div>

      <Button variant="secondary" block className="mt-8" onClick={signOut}><LogOut className="size-4" aria-hidden /> Sign out</Button>

      <BottomSheet open={!!editor} onClose={() => setEditor(null)} title={editor ? editors[editor].title : ""}>
        {editor && (
          <div className="pb-2">
            {editors[editor].body}
            <Button block size="lg" className="mt-6" loading={busy} onClick={save}>Save</Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
