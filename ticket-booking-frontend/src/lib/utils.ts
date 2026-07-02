import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getEventTitle(teamA: string | undefined | null, teamB: string | undefined | null): string {
  if (!teamA) return "";
  const b = teamB?.trim();
  if (!b || b === "-" || b.toLowerCase() === "none") {
    return teamA;
  }
  return `${teamA} vs ${teamB}`;
}

export function resolveImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  return url;
}
