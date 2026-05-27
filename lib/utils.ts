import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string) {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function truncate(str: string, length: number) {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

export function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return {
        text: "#991b1b",
        bg: "#fef2f2",
        border: "#fecaca",
        dot: "#dc2626",
      };
    case "high":
      return {
        text: "#9a3412",
        bg: "#fff7ed",
        border: "#fed7aa",
        dot: "#ea580c",
      };
    case "medium":
      return {
        text: "#92400e",
        bg: "#fffbeb",
        border: "#fde68a",
        dot: "#d97706",
      };
    case "low":
      return {
        text: "#1e40af",
        bg: "#eff6ff",
        border: "#bfdbfe",
        dot: "#2563eb",
      };
    default:
      return {
        text: "#475569",
        bg: "#f8fafc",
        border: "#e2e8f0",
        dot: "#94a3b8",
      };
  }
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "online":
    case "active":
    case "resolved":
      return { text: "#166534", bg: "#f0fdf4", border: "#bbf7d0" };
    case "offline":
    case "disconnected":
      return { text: "#475569", bg: "#f8fafc", border: "#e2e8f0" };
    case "error":
    case "blocked":
      return { text: "#991b1b", bg: "#fef2f2", border: "#fecaca" };
    case "outdated":
    case "investigating":
      return { text: "#92400e", bg: "#fffbeb", border: "#fde68a" };
    case "open":
      return { text: "#1e40af", bg: "#eff6ff", border: "#bfdbfe" };
    default:
      return { text: "#475569", bg: "#f8fafc", border: "#e2e8f0" };
  }
}
