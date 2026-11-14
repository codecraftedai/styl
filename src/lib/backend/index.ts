import type { Backend } from "./types";

export const CLOUD = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Lazy so the Supabase client is never created in demo mode.
export async function getBackend(): Promise<Backend> {
  return CLOUD ? (await import("./cloud")).cloudBackend : (await import("./local")).localBackend;
}
