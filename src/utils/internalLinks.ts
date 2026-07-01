import { Capacitor, registerPlugin } from "@capacitor/core";
import { readNgaCredentials } from "../services/ngaCredentials";

type InternalBrowserPlugin = {
  open(options: { url: string; uid?: string; cid?: string }): Promise<void>;
};

const InternalBrowser = registerPlugin<InternalBrowserPlugin>("InternalBrowser");

const NGA_HOSTS = new Set([
  "bbs.nga.cn",
  "nga.178.com",
  "ngabbs.com",
  "www.ngabbs.com",
]);

function withLikelyScheme(rawUrl: string) {
  const value = rawUrl.trim();
  if (!value) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (/^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(value)) return `https://${value}`;
  return value;
}

export function toHttpUrl(rawUrl: string, baseUrl = window.location.href) {
  try {
    const url = new URL(withLikelyScheme(rawUrl), baseUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function getAppRouteForNgaUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(withLikelyScheme(rawUrl), "https://bbs.nga.cn/");
  } catch {
    return null;
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || !NGA_HOSTS.has(url.hostname)) return null;

  const threadId = url.searchParams.get("tid");
  if (threadId && url.pathname.endsWith("/read.php")) {
    const params = new URLSearchParams();
    const page = url.searchParams.get("page");
    const postId = url.searchParams.get("pid");
    if (page) params.set("page", page);
    if (postId) params.set("pid", postId);
    return `/thread/${threadId}${params.toString() ? `?${params.toString()}` : ""}`;
  }

  const boardId = url.searchParams.get("fid");
  if (boardId && url.pathname.endsWith("/thread.php")) {
    return `/board/${boardId}`;
  }

  return null;
}

export async function openInInternalBrowser(rawUrl: string) {
  const url = toHttpUrl(rawUrl);
  if (!url) return;

  if (Capacitor.isNativePlatform()) {
    const credentials = readNgaCredentials();
    await InternalBrowser.open({ url: url.toString(), uid: credentials.uid, cid: credentials.cid });
    return;
  }

  window.location.assign(url.toString());
}
