import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function toYouTubeEmbedUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      let videoId = "";
      if (u.hostname === "youtu.be") {
        videoId = u.pathname.slice(1).split("/")[0];
      } else {
        videoId = u.searchParams.get("v") || "";
      }
      if (!videoId) return url;
      u.searchParams.delete("v");
      const restQuery = u.searchParams.toString();
      return `https://www.youtube.com/embed/${videoId}${restQuery ? "?" + restQuery : ""}`;
    }
    return url;
  } catch {
    return url;
  }
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}
