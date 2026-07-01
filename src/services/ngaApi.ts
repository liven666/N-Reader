import { canUseNativeNgaTransport, fetchNgaNative } from "./ngaNative";
import { readNgaCredentials } from "./ngaCredentials";

export interface Thread {
  id: string;
  boardId: string;
  title: string;
  author: string;
  replyCount: number;
  createdAt: string;
  isSticky?: boolean;
}

export interface Post {
  id: string;
  threadId: string;
  floor: number;
  author: string;
  avatar?: string;
  content: string;
  createdAt: string;
  likes: number;
}

export interface Board {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export function clearNgaRuntimeCache() {
  cache.clear();
  cachedFavorBoards = null;
  cachedFavorThreads = null;
}

export async function fetchNga(url: string, method: "GET" | "POST" = "GET", postData?: any, useGuest: boolean = false, forceRefresh: boolean = false) {
  const cacheKey = `${method}:${url}:${typeof postData === 'object' ? JSON.stringify(postData) : (postData || '')}`;
  
  if (method === "GET" && !useGuest && !forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  const credentials = readNgaCredentials();
  const uid = useGuest ? null : credentials.uid;
  const cid = useGuest ? null : credentials.cid;

  if (canUseNativeNgaTransport()) {
    const data = await fetchNgaNative(url, method, postData, uid, cid);
    if (method === "GET" && !data.error && !useGuest) {
      cache.set(cacheKey, { data, timestamp: Date.now() });
    }
    return data;
  }

  const res = await fetch("/api/nga", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, uid, cid, method, postData })
  });
  
  if (!res.ok) {
    let errorMsg = "Network response was not ok";
    try {
      const errorData = await res.json();
      if (errorData && errorData.error) {
        errorMsg = typeof errorData.error === 'string' ? errorData.error : errorData.error[0];
        if (errorData.raw) {
          errorMsg += `\nRaw: ${errorData.raw}`;
        }
      }
    } catch (e) {
      // Ignore JSON parse error on error response
    }
    throw new Error(errorMsg);
  }
  
  const data = await res.json();
  
  if (method === "GET" && !data.error && !useGuest) {
    cache.set(cacheKey, { data, timestamp: Date.now() });
  }
  
  return data;
}

let cachedFavorBoards: Board[] | null = null;

export function getCachedFavorBoards(): Board[] | null {
  return cachedFavorBoards;
}

export async function getFavorBoards(forceRefresh = false): Promise<Board[]> {
  if (!forceRefresh && cachedFavorBoards) {
    return cachedFavorBoards;
  }

  const data = await fetchNga(`https://bbs.nga.cn/nuke.php?__lib=forum_favor2&__act=forum_favor&action=get&__output=8`);
  
  if (data.error) {
    throw new Error((typeof data.error === 'string' ? data.error : data.error[0]) || "Unknown NGA error");
  }

  const boardsData = Array.isArray(data.data) ? data.data[0] : (data.data?.["0"] || data.data || {});
  const boards: Board[] = [];
  
  for (const key in boardsData) {
    const b = boardsData[key];
    if (typeof b !== 'object' || b === null || !b.fid) continue;
    boards.push({
      id: b.fid?.toString(),
      name: b.name || "未知板块",
      icon: "📌",
      description: "收藏板块"
    });
  }
  
  cachedFavorBoards = boards;
  return boards;
}
export async function getThreadsByBoard(boardId: string, page = 1, forceRefresh = false): Promise<Thread[]> {
  const data = await fetchNga(`https://bbs.nga.cn/thread.php?fid=${boardId}&page=${page}&__output=8`, "GET", undefined, false, forceRefresh);
  
  if (data.error) {
    throw new Error((typeof data.error === 'string' ? data.error : data.error[0]) || "Unknown NGA error");
  }

  const threadsData = data.data?.__T || {};
  const threads: Thread[] = [];
  
  for (const key in threadsData) {
    const t = threadsData[key];
    if (typeof t !== 'object') continue;
    threads.push({
      id: t.tid?.toString(),
      boardId: t.fid?.toString(),
      title: t.subject,
      author: t.author,
      replyCount: t.replies,
      createdAt: t.postdate ? new Date(t.postdate * 1000).toISOString() : new Date().toISOString(),
      isSticky: t.topic_misc?.includes('1')
    });
  }
  
  return threads.sort((a, b) => {
    if (a.isSticky && !b.isSticky) return -1;
    if (!a.isSticky && b.isSticky) return 1;
    return 0;
  });
}

export async function getPostsByThread(threadId: string, page = 1, useGuest = false): Promise<{posts: Post[], threadTitle: string, replyCount: number}> {
  const data = await fetchFirstNga([
    `https://bbs.nga.cn/read.php?tid=${threadId}&page=${page}&__output=11`,
    `https://bbs.nga.cn/read.php?tid=${threadId}&page=${page}&__output=8`,
  ], useGuest);
  
  if (data.error) {
    throw new Error((typeof data.error === 'string' ? data.error : data.error[0]) || "Unknown NGA error");
  }

  const postsData = data.data?.__R || {};
  const usersData = data.data?.__U || {};
  const threadInfo = data.data?.__T || {};
  
  const posts: Post[] = [];
  
  for (const key in postsData) {
    const p = postsData[key];
    if (typeof p !== 'object') continue;
    const user = usersData[p.authorid];
    let avatar = user?.avatar;
    if (typeof avatar === 'string' && avatar.startsWith('{')) {
      try {
        const parsed = JSON.parse(avatar);
        avatar = parsed[0] || parsed.url || undefined;
      } catch (e) {
        avatar = undefined;
      }
    } else if (typeof avatar === 'object' && avatar !== null) {
      avatar = avatar[0] || avatar.url || undefined;
    }
    
    if (typeof avatar === 'string' && avatar.startsWith('./')) {
      avatar = `https://img.nga.178.com/attachments/${avatar.substring(2)}`;
    }
    posts.push({
      id: p.pid?.toString(),
      threadId: p.tid?.toString(),
      floor: p.lou,
      author: user?.username || p.authorid?.toString() || "匿名",
      avatar: avatar,
      content: p.content || "",
      createdAt: p.postdate,
      likes: p.score || 0,
    });
  }
  
  return {
    posts,
    threadTitle: threadInfo.subject || "帖子详情",
    replyCount: threadInfo.replies || 0
  };
}

export async function toggleFavorBoard(boardId: string, action: 'add' | 'del'): Promise<void> {
  const data = await fetchNga(`https://bbs.nga.cn/nuke.php?__lib=forum_favor2&__act=forum_favor&action=${action}&fid=${boardId}&__output=8`);
  if (data.error) {
    throw new Error((typeof data.error === 'string' ? data.error : data.error[0]) || "Unknown NGA error");
  }
  // Clear cache
  cachedFavorBoards = null;
  for (const key of cache.keys()) {
    if (key.includes('forum_favor2')) {
      cache.delete(key);
    }
  }
}

let cachedFavorThreads: Thread[] | null = null;

export function getCachedFavorThreads(): Thread[] | null {
  return cachedFavorThreads;
}

export async function toggleFavorThread(threadId: string, action: 'add' | 'del'): Promise<void> {
  const url = action === 'add' 
    ? `https://bbs.nga.cn/nuke.php?__lib=topic_favor&__act=topic_favor&action=add&raw=3&nouse=post&tid=${threadId}&pid=0&__output=8`
    : `https://bbs.nga.cn/nuke.php?__lib=topic_favor&__act=topic_favor&action=del&raw=3&tid=${threadId}&page=1&tidarray=${threadId}&__output=8`;
  
  // NGA favor actions require POST
  const data = await fetchNga(url, "POST", "");
  
  if (data.error) {
    throw new Error((typeof data.error === 'string' ? data.error : data.error[0]) || "Unknown NGA error");
  }
  // Clear cache
  cachedFavorThreads = null;
  for (const key of cache.keys()) {
    if (key.includes('favor=1')) {
      cache.delete(key);
    }
  }
}

export async function getFavorThreads(page = 1, forceRefresh = false): Promise<Thread[]> {
  if (!forceRefresh && page === 1 && cachedFavorThreads) {
    return cachedFavorThreads;
  }

  const data = await fetchNga(`https://bbs.nga.cn/thread.php?favor=1&page=${page}&__output=8`);
  if (data.error) {
    throw new Error((typeof data.error === 'string' ? data.error : data.error[0]) || "Unknown NGA error");
  }

  const threadsData = data.data?.__T || {};
  const threads: Thread[] = [];
  
  for (const key in threadsData) {
    const t = threadsData[key];
    if (typeof t !== 'object') continue;
    threads.push({
      id: t.tid?.toString(),
      boardId: t.fid?.toString(),
      title: t.subject,
      author: t.author,
      replyCount: t.replies,
      createdAt: t.postdate ? new Date(t.postdate * 1000).toISOString() : new Date().toISOString(),
    });
  }
  
  if (page === 1) {
    cachedFavorThreads = threads;
  }
  return threads;
}

export async function votePost(tid: string, pid: string, value: 1 | -1): Promise<void> {
  const postData = { step: 1 };
  const data = await fetchNga(`https://bbs.nga.cn/nuke.php?__lib=topic_recommend&__act=add&tid=${tid}&pid=${pid}&value=${value}&__output=8`, "POST", postData);
  if (data.error) {
    throw new Error((typeof data.error === 'string' ? data.error : data.error[0]) || "Unknown NGA error");
  }
  // Clear cache for this thread
  for (const key of cache.keys()) {
    if (key.includes(`read.php?tid=${tid}`)) {
      cache.delete(key);
    }
  }
}

export async function replyPost(tid: string, content: string, pid?: string): Promise<void> {
  const postData = {
    step: 2,
    tid: tid,
    pid: pid || "0",
    post_content: content
  };
  
  const data = await fetchNga(`https://bbs.nga.cn/post.php?action=reply&__output=8`, "POST", postData);
  const errorMsg = getNgaError(data);
  if (errorMsg && !isPostSuccessMessage(errorMsg)) {
    throw new Error(String(errorMsg) || "Unknown NGA error");
  }
  // Clear cache for this thread
  for (const key of cache.keys()) {
    if (key.includes(`read.php?tid=${tid}`)) {
      cache.delete(key);
    }
  }
}

export interface Message {
  id: string;
  kind: "reply" | "private" | "reaction";
  from: string;
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  threadId?: string;
  postId?: string;
  page?: number;
  messageId?: string;
}

export interface PrivateMessageEntry {
  id: string;
  from: string;
  content: string;
  createdAt: string;
}

export interface PrivateMessageThread {
  id: string;
  title: string;
  messages: PrivateMessageEntry[];
}

export interface CheckInResult {
  checked: boolean;
  message: string;
}

function getNgaError(data: any) {
  if (data.error) {
    return typeof data.error === 'string' 
      ? data.error 
      : (Array.isArray(data.error) ? data.error[0] : Object.values(data.error)[0]);
  }
  return null;
}

function isPostSuccessMessage(value: unknown) {
  const message = String(value || "");
  return /(发帖|发贴|发表|发布).*?(完毕|成功)|回复.*?成功|操作成功/.test(message);
}

function toIsoDate(value: any) {
  const time = Number(value);
  if (Number.isFinite(time) && time > 0) {
    return new Date(time * 1000).toISOString();
  }
  return new Date().toISOString();
}

function asArray(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return Object.values(value);
  return [];
}

function firstString(source: any, keys: string[]) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
}

function firstNumber(source: any, keys: string[]) {
  for (const key of keys) {
    const value = Number(source?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

async function fetchFirstNga(urls: string[], useGuest = false) {
  let lastError: unknown;
  let lastErrorData: any = null;

  for (const url of urls) {
    try {
      const data = await fetchNga(url, "GET", undefined, useGuest, true);
      const errorMsg = getNgaError(data);
      if (errorMsg) {
        lastErrorData = data;
        lastError = new Error(String(errorMsg));
        continue;
      }
      return data;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastErrorData) return lastErrorData;
  throw lastError || new Error("NGA 接口请求失败");
}

function stringifyNgaStatus(data: any) {
  if (!data || typeof data !== "object") return "";
  const parts: string[] = [];
  const visit = (value: any) => {
    if (parts.length >= 8 || value === null || value === undefined) return;
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text) parts.push(text);
      return;
    }
    if (Array.isArray(value)) {
      value.slice(0, 8).forEach(visit);
      return;
    }
    if (typeof value === "object") {
      Object.values(value).slice(0, 12).forEach(visit);
    }
  };

  visit(data);
  return parts.join(" ");
}

function flattenNgaPrimitives(value: any, output: string[] = []) {
  if (value === null || value === undefined) return output;
  if (typeof value === "string" || typeof value === "number") {
    output.push(String(value).trim());
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => flattenNgaPrimitives(item, output));
    return output;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => flattenNgaPrimitives(item, output));
  }
  return output;
}

function inferCheckedIn(data: any, text: string) {
  if (/已签到|已经签到|今日.*签|已完成|success|成功|连续|checked/i.test(text)) return true;
  if (/未签到|尚未|未完成/.test(text)) return false;

  const uid = readNgaCredentials().uid;
  const values = flattenNgaPrimitives(data?.data || data);
  const uidIndex = uid ? values.findIndex((value) => value === uid) : -1;
  if (uidIndex >= 0 && values[uidIndex + 1] !== undefined) {
    return values[uidIndex + 1] === "1";
  }

  return false;
}

function makeCheckInResult(data: any, fallbackMessage: string): CheckInResult {
  const errorMsg = getNgaError(data);
  if (errorMsg) {
    const message = String(errorMsg);
    if (/已签到|已经签到|今日.*签|已完成|重复/.test(message)) {
      return { checked: true, message };
    }
    throw new Error(message || "签到失败");
  }

  const text = stringifyNgaStatus(data);
  const checked = inferCheckedIn(data, text);
  const hasReadableMessage = /[A-Za-z\u4e00-\u9fff]/.test(text);
  return {
    checked,
    message: hasReadableMessage ? text : fallbackMessage,
  };
}

function collectMissionIds(value: any, output: string[] = []) {
  if (!value || typeof value !== "object") return output;

  const maybeId = value.mid ?? value.id ?? value["0"];
  if (maybeId !== undefined && maybeId !== null && /^\d+$/.test(String(maybeId))) {
    output.push(String(maybeId));
  }

  for (const child of Object.values(value)) {
    collectMissionIds(child, output);
  }

  return [...new Set(output)];
}

export async function getCheckInStatus(): Promise<CheckInResult> {
  const data = await fetchFirstNga([
    "https://bbs.nga.cn/nuke.php?__lib=check_in&__act=get_stat&__output=8",
    "https://bbs.nga.cn/nuke.php?__lib=check_in&__act=get_stat&raw=3&__output=8",
  ]);
  return makeCheckInResult(data, "签到状态已同步");
}

export async function checkIn(): Promise<CheckInResult> {
  const currentStatus = await getCheckInStatus().catch(() => null);
  if (currentStatus?.checked) {
    return { checked: true, message: "今日已签到" };
  }

  try {
    const data = await fetchFirstNga([
      "https://bbs.nga.cn/nuke.php?__lib=check_in&__act=check_in&__output=8",
      "https://bbs.nga.cn/nuke.php?__lib=check_in&__act=check_in&raw=3&__output=8",
    ]);
    return makeCheckInResult(data, "签到完成");
  } catch (directError) {
    const checkedAfterDirectError = await getCheckInStatus().catch(() => null);
    if (checkedAfterDirectError?.checked) {
      return { checked: true, message: "今日已签到" };
    }

    const missions = await fetchFirstNga([
      "https://bbs.nga.cn/nuke.php?__lib=mission&__act=get&event=1&type=1&available=1&__output=8",
      "https://bbs.nga.cn/nuke.php?__lib=mission&__act=get&event=1&type=1&available=1&raw=3&__output=8",
    ]);
    const missionError = getNgaError(missions);
    if (missionError) throw new Error(String(missionError));

    const missionIds = collectMissionIds(missions.data || missions);
    if (missionIds.length === 0) {
      throw directError instanceof Error ? directError : new Error("没有可执行的签到任务");
    }

    let lastResult: CheckInResult = { checked: false, message: "签到任务已提交" };
    for (const missionId of missionIds) {
      const result = await fetchFirstNga([
        `https://bbs.nga.cn/nuke.php?__lib=mission&__act=checkin_count_add&mid=${missionId}&__output=8`,
        `https://bbs.nga.cn/nuke.php?__lib=mission&__act=checkin_count_add&mid=${missionId}&raw=3&__output=8`,
      ]);
      lastResult = makeCheckInResult(result, "签到任务已提交");
      if (lastResult.checked) return lastResult;
    }

    return lastResult;
  }
}

function parseNotificationMessages(data: any): Message[] {
  const errorMsg = getNgaError(data);
  if (errorMsg) throw new Error(errorMsg as string || "Unknown NGA error");

  const groups = data.data?.["0"] || (Array.isArray(data.data) ? data.data[0] : data.data) || {};
  const messages: Message[] = [];

  asArray(groups["0"]).forEach((reply, index) => {
    if (!reply || typeof reply !== "object") return;
    const authorName = String(reply["2"] || "有人");
    const repliedName = String(reply["4"] || "你");
    const subject = String(reply["5"] || "帖子");
    const threadId = reply["6"]?.toString();
    const postId = reply["7"]?.toString();
    const page = Number(reply["10"]) || undefined;
    const createdAt = toIsoDate(reply["9"]);
    if (!threadId) return;

    messages.push({
      id: `reply-${threadId}-${postId || index}-${reply["9"] || Date.now()}`,
      kind: "reply",
      from: authorName,
      title: `回复：${subject}`,
      content: `${authorName} 回复了 ${repliedName} 的发言`,
      createdAt,
      isRead: false,
      threadId,
      postId,
      page,
    });
  });

  asArray(groups["1"]).forEach((privateMessage, index) => {
    if (!privateMessage || typeof privateMessage !== "object") return;
    const authorName = String(privateMessage["2"] || "未知用户");
    const messageId = privateMessage["6"]?.toString();
    const createdAt = toIsoDate(privateMessage["9"]);
    if (!messageId) return;

    messages.push({
      id: `private-${messageId}-${privateMessage["9"] || index}`,
      kind: "private",
      from: authorName,
      title: `私信：${authorName}`,
      content: "点击查看私信会话",
      createdAt,
      isRead: false,
      messageId,
    });
  });

  asArray(groups["2"]).forEach((reaction, index) => {
    if (!reaction || typeof reaction !== "object") return;
    const subject = String(reaction["5"] || "帖子");
    const threadId = reaction["6"]?.toString();
    const postId = reaction["7"]?.toString();
    const createdAt = toIsoDate(reaction["9"]);
    if (!threadId) return;

    messages.push({
      id: `reaction-${threadId}-${postId || index}-${reaction["9"] || Date.now()}`,
      kind: "reaction",
      from: "系统提醒",
      title: `评价变化：${subject}`,
      content: "你的发言有新的赞踩变化",
      createdAt,
      isRead: false,
      threadId,
      postId,
    });
  });

  return messages;
}

async function getNotificationMessages(): Promise<Message[]> {
  const urls = [
    "https://bbs.nga.cn/nuke.php?__lib=noti&__act=get_all&raw=3&time_limit=1&__output=8",
    "https://bbs.nga.cn/nuke.php?__lib=notify&__act=list&__output=8",
  ];
  let firstEmptyResult: Message[] | null = null;
  let lastError: unknown;

  for (const url of urls) {
    try {
      const data = await fetchNga(url, "GET", undefined, false, true);
      const messages = parseNotificationMessages(data);
      if (messages.length > 0) return messages;
      firstEmptyResult = messages;
    } catch (error) {
      lastError = error;
    }
  }

  if (firstEmptyResult) return firstEmptyResult;
  throw lastError || new Error("消息加载失败");
}

async function getPrivateMessageList(page = 1): Promise<Message[]> {
  const query = `__lib=message&__act=message&action=list&page=${page}`;
  const data = await fetchFirstNga([
    `https://bbs.nga.cn/nuke.php?${query}&__output=8`,
    `https://bbs.nga.cn/nuke.php?${query}&raw=3&__output=8`,
    `https://bbs.nga.cn/nuke.php?${query}&raw=3`,
    `https://bbs.nga.cn/nuke.php?${query}`,
    `https://ngabbs.com/nuke.php?${query}&__output=8`,
    `https://nga.178.com/nuke.php?${query}&__output=8`,
  ]);
  const errorMsg = getNgaError(data);
  if (errorMsg) throw new Error(errorMsg as string || "Unknown NGA error");

  const messagesData = Array.isArray(data.data) ? data.data[0] : data.data || {};

  return asArray(messagesData)
    .filter((m) => m && typeof m === "object" && (m.mid || m.tid || m.id))
    .map((m, index) => {
      const messageId = (m.mid || m.tid || m.id)?.toString();
      return {
        id: `private-list-${messageId || index}`,
        kind: "private" as const,
        from: m.from_username || m.lastposter || m.username || "未知用户",
        title: m.subject || "私信会话",
        content: m.content || m.lastpost || "点击查看私信会话",
        createdAt: toIsoDate(m.time || m.postdate || m.lastpostdate),
        isRead: m.is_read === 1 || m.read === 1,
        messageId,
      };
    })
    .filter((message) => Boolean(message.messageId));
}

export async function getMessages(page = 1): Promise<Message[]> {
  let fulfilled: Message[];

  try {
    fulfilled = await getNotificationMessages();
  } catch (notificationError) {
    try {
      fulfilled = await getPrivateMessageList(page);
    } catch {
      throw notificationError;
    }
  }

  const deduped = new Map<string, Message>();
  for (const message of fulfilled) {
    const key = message.messageId ? `private-${message.messageId}` : message.id;
    if (!deduped.has(key)) deduped.set(key, message);
  }

  return [...deduped.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function collectPrivateMessageEntries(value: any, output: PrivateMessageEntry[] = []) {
  if (!value || typeof value !== "object") return output;

  const content = firstString(value, ["content", "post_content", "message", "body", "text"]);
  if (content) {
    const createdAt = toIsoDate(firstNumber(value, ["postdate", "time", "timestamp", "dateline"]));
    output.push({
      id: firstString(value, ["pid", "id", "mid"]) || `pm-${output.length}`,
      from: firstString(value, ["author", "authorname", "username", "from_username", "from", "name"]) || "未知用户",
      content,
      createdAt,
    });
    return output;
  }

  for (const child of Object.values(value)) {
    collectPrivateMessageEntries(child, output);
  }

  return output;
}

export async function getPrivateMessageThread(mid: string, page = 1): Promise<PrivateMessageThread> {
  const query = `__lib=message&__act=message&action=read&mid=${mid}&page=${page}`;
  const data = await fetchFirstNga([
    `https://bbs.nga.cn/nuke.php?${query}&__output=8`,
    `https://bbs.nga.cn/nuke.php?${query}&raw=3&__output=8`,
    `https://bbs.nga.cn/nuke.php?${query}&raw=3`,
    `https://bbs.nga.cn/nuke.php?${query}`,
    `https://ngabbs.com/nuke.php?${query}&__output=8`,
    `https://nga.178.com/nuke.php?${query}&__output=8`,
  ]);
  const errorMsg = getNgaError(data);
  if (errorMsg) throw new Error(errorMsg as string || "Unknown NGA error");

  const root = Array.isArray(data.data) ? data.data[0] : data.data || {};
  const messages = collectPrivateMessageEntries(root);
  const title = firstString(root, ["subject", "title"]) || `私信 #${mid}`;

  return {
    id: mid,
    title,
    messages: messages.length > 0 ? messages : [{
      id: `pm-${mid}`,
      from: "系统",
      content: "私信内容解析为空，请稍后重试或在 NGA 原站查看。",
      createdAt: new Date().toISOString(),
    }],
  };
}

export async function searchThreads(keyword: string, page = 1): Promise<Thread[]> {
  const postData = {
    key: keyword,
    page: page,
    __output: 8
  };
  
  const data = await fetchNga(`https://bbs.nga.cn/thread.php?__output=8`, "POST", postData);
  if (data.error) {
    throw new Error((typeof data.error === 'string' ? data.error : data.error[0]) || "Unknown NGA error");
  }

  const threadsData = data.data?.__T || {};
  const threads: Thread[] = [];
  
  for (const key in threadsData) {
    const t = threadsData[key];
    if (typeof t !== 'object') continue;
    threads.push({
      id: t.tid?.toString(),
      boardId: t.fid?.toString(),
      title: t.subject,
      author: t.author,
      replyCount: t.replies,
      createdAt: t.postdate ? new Date(t.postdate * 1000).toISOString() : new Date().toISOString(),
    });
  }
  
  return threads;
}
