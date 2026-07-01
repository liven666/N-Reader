import { Capacitor, CapacitorCookies, CapacitorHttp } from "@capacitor/core";
import { parseNgaPayload } from "./ngaResponseParser";

type NgaMethod = "GET" | "POST";

export function canUseNativeNgaTransport() {
  return Capacitor.isNativePlatform();
}

function getNgaError(data: any, fallback: string) {
  if (!data || !data.error) return fallback;
  if (typeof data.error === "string") return data.error;
  if (Array.isArray(data.error)) return data.error[0] || fallback;
  return String(Object.values(data.error)[0] || fallback);
}

export async function fetchNgaNative(
  url: string,
  method: NgaMethod,
  postData: unknown,
  uid: string | null,
  cid: string | null
) {
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Referer": "https://bbs.nga.cn/",
  };

  if (uid && cid) {
    headers["Cookie"] = `ngaPassportUid=${uid}; ngaPassportCid=${cid}`;
    await Promise.allSettled([
      CapacitorCookies.setCookie({ url: "https://bbs.nga.cn", key: "ngaPassportUid", value: uid }),
      CapacitorCookies.setCookie({ url: "https://bbs.nga.cn", key: "ngaPassportCid", value: cid }),
      CapacitorCookies.setCookie({ url: "https://bbs.nga.cn", key: "guestJs", value: String(Math.floor(Date.now() / 1000)) }),
    ]);
  }

  let requestBody: string | undefined;
  if (method === "POST" && postData) {
    if (typeof postData === "string") {
      requestBody = postData;
    } else if (typeof postData === "object") {
      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(postData as Record<string, unknown>)) {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      }
      requestBody = formData.toString();
    } else {
      requestBody = String(postData);
    }
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const response = await CapacitorHttp.request({
    url,
    method,
    headers,
    data: requestBody,
    responseType: "arraybuffer",
    connectTimeout: 10000,
    readTimeout: 10000,
  });
  let data: any;

  try {
    data = parseNgaPayload(decodeNgaResponse(response.data, url));
  } catch (error: any) {
    throw new Error(error?.message || "Failed to parse NGA response");
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(getNgaError(data, `NGA request failed with status ${response.status}`));
  }

  return data;
}

function decodeNgaResponse(raw: unknown, url: string) {
  if (!raw) return "{}";
  const charset = url.includes("__output=11") ? "utf-8" : "gb18030";

  if (typeof raw === "string") {
    try {
      const base64 = raw.replace(/\s/g, "");
      const binary = window.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return new TextDecoder(charset).decode(bytes);
    } catch {
      return raw;
    }
  }

  if (raw instanceof ArrayBuffer) {
    return new TextDecoder(charset).decode(raw);
  }

  if (ArrayBuffer.isView(raw)) {
    return new TextDecoder(charset).decode(raw);
  }

  return String(raw);
}
