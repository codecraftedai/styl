import { Check, CircleAlert, Lightbulb, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type LookInsightsProps = {
  reasons: string[]; cautions: string[]; tip: string | null;
  /** Present when the tip is a concrete change that can be applied. */ onApplyTip?: () => void;
  /** Present right after a tip was applied. */ onUndo?: () => void;
};

const List = ({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) => (
  <section aria-label={title}>
    <h2 className="mb-2 text-label uppercase text-ink-3">{title}</h2>
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {items.map((r) => <li key={r} className="flex items-start gap-3 px-4 py-3 text-caption text-ink-2">{icon}{r}</li>)}
    </ul>
  </section>
);

/** Why it works, what holds it back, and one fix using pieces the user owns. */
export function LookInsights({ reasons, cautions, tip, onApplyTip, onUndo }: LookInsightsProps) {
  return (
    <div className="flex flex-col gap-6">
      {tip && (
        <section aria-label="Stylist tip" className="rounded-lg border border-dashed border-ink-3/50 p-4">
          <p className="flex items-start gap-3 text-caption text-ink-2">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-champagne" aria-hidden />
            <span><span className="font-medium text-ink">Stylist tip: </span>{tip}</span>
          </p>
          {onApplyTip && <Button variant="secondary" className="mt-3 ml-7 h-10 px-4 text-caption" onClick={onApplyTip}>Try it</Button>}
        </section>
      )}
      {onUndo && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-stone/60 px-4 py-2.5 text-caption text-ink-2">
          Tip applied. The score below is for the new look.
          <Button variant="ghost" className="h-9 shrink-0 px-3 text-caption" onClick={onUndo}><Undo2 className="size-4" aria-hidden /> Undo</Button>
        </div>
      )}
      {reasons.length > 0 && <List title="Why it works" items={reasons} icon={<Check className="mt-0.5 size-4 shrink-0 text-champagne" aria-hidden />} />}
      {cautions.length > 0 && <List title="Watch out" items={cautions} icon={<CircleAlert className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />} />}
      {!cautions.length && <p className="text-caption text-ink-3">Nothing holding this look back for the occasion.</p>}
    </div>
  );
}
