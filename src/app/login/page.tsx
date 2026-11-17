"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { Guard } from "@/components/shell/guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";

export default function LoginPage() {
  return <Suspense><Login /></Suspense>;
}

function Login() {
  const { signIn, mode } = useStore();
  const [isNew, setIsNew] = useState(useSearchParams().has("new"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);


  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Use at least 6 characters.");
    setBusy(true);
    try { await signIn(email.trim(), password, isNew); }
    catch (err) { setError(err instanceof Error ? err.message : "Something went wrong. Try again."); }
    finally { setBusy(false); }
  }

  return (
    <Guard need="signed-out">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-safe pb-8">
        <Link href="/welcome" aria-label="Back" className="-ml-3 mt-4 flex size-11 items-center justify-center rounded-full hover:bg-stone"><ArrowLeft className="size-5" /></Link>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="mt-10">
          <h1 className="font-display text-title">{isNew ? "Create your wardrobe" : "Welcome back"}</h1>
          <p className="mt-2 text-ink-3">{isNew ? "Private to you. Nobody else sees your clothes." : "Sign in to see today's outfit."}</p>

          <div role="tablist" className="relative mt-8 grid grid-cols-2 rounded-full bg-stone p-1">
            {[false, true].map((v) => (
              <button key={String(v)} role="tab" aria-selected={isNew === v} type="button" onClick={() => { setIsNew(v); setError(""); }}
                className={cn("relative z-10 h-10 rounded-full text-caption font-medium transition-colors", isNew === v ? "text-ink" : "text-ink-3 hover:text-ink-2")}>
                {isNew === v && <motion.span layoutId="auth-tab" className="absolute inset-0 -z-10 rounded-full bg-line" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                {v ? "Create account" : "Sign in"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-5" noValidate>
            <Input label="Email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Password" type="password" autoComplete={isNew ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} hint={isNew ? "At least 6 characters" : undefined} />
            {error && <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-caption text-danger">{error}</p>}
            <Button type="submit" size="lg" block loading={busy} disabled={!email || !password}>{isNew ? "Create account" : "Sign in"}</Button>
          </form>
          {mode === "local" && (
            <p className="mt-6 text-caption text-ink-3">Demo mode: no server connected, so your wardrobe is saved only in this browser. Any email and password works.</p>
          )}
        </motion.div>
      </div>
    </Guard>
  );
}
