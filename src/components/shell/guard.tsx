"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Splash } from "./splash";

type Need = "app" | "signed-in" | "signed-out";

/** Routes the user to where they belong: welcome → onboarding → app. Shows the splash while deciding. */
export function Guard({ need, children }: { need: Need; children: ReactNode }) {
  const { status, profile } = useStore();
  const router = useRouter();
  const onboarded = !!profile?.onboarded;

  const target =
    status === "loading" ? null
    : status === "signed-out" ? (need === "signed-out" ? null : "/welcome")
    : need === "signed-out" ? (onboarded ? "/" : "/onboarding")
    : need === "app" && !onboarded ? "/onboarding"
    : null;

  useEffect(() => { if (target) router.replace(target); }, [target, router]);
  if (status === "loading" || target) return <Splash />;
  return children;
}
