import { MOCK_BOARDS, MOCK_THREADS, MOCK_POSTS, getBoard, getThreadsByBoard, getThread, getPostsByThread } from './mockData';

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

const isCapacitor = typeof (window as any).Capacitor !== 'undefined';

function getApiUrl(): string {
  if (isCapacitor) {
    let customApiUrl = localStorage.getItem("nreader_api_url");
    if (customApiUrl) {
      customApiUrl = customApiUrl.trim();
      if (customApiUrl && !customApiUrl.endsWith("/api/nga")) {
        if (customApiUrl.endsWith("/")) {
          return customApiUrl + "api/nga";
        } else {
          return customApiUrl + "/api/nga";
        }
      }
      return customApiUrl;
    }
  }
  return "/api/nga";
}

function isOfflineMode(): boolean {
  return localStorage.getItem("nreader_offline_mode") === "true";
}

function getMockResponse(url: string) {
  if (url.includes("forum_favor2")) {
    return {
      data: {
        "0": {
          "843": { fid: 843, name: "国际区/国新区" },
          "-7": { fid: -7, name: "网事杂谈" },
          "436": { fid: 436, name: "消费电子" },
        }
      }
    };
  }
  
  if (url.includes("thread.php") && !url.includes("read.php")) {
    return {
      data: {
        __T: Object.fromEntries(
          MOCK_THREADS.map(t => [
            t.id,
            {
              tid: parseInt(t.id),
              fid: parseInt(t.boardId),
              subject: t.title,
              author: t.author,
              replies: t.replyCount,
              postdate: Math.floor(new Date(t.createdAt).getTime() / 1000),
              topic_misc: t.isSticky ? "1" : "0"
            }
          ])
        )
      }
    };
  }
  
  if (url.includes("read.php")) {
    return {
      data: {
        __T: { subject: "【讨论】11.0地心之战大秘境首发职业推荐", replies: 234 },
        __U: {
          "1": { username: "大领主提里奥", avatar: "" },
          "2": { username: "跟风小王子", avatar: "" },
          "3": { username: "信仰圣光", avatar: "" }
        },
        __R: Object.fromEntries(
          MOCK_POSTS.map((p, i) => [
            i.toString(),
            {
              pid: parseInt(p.id.replace("p", "")),
              tid: parseInt(p.threadId),
              lou: p.floor,
              authorid: "1",
              content: p.content,
              postdate: p.createdAt,
              score: p.likes
            }
          ])
        )
      }
    };
  }
  
  return { data: {} };
}

export async function fetchNga(url: string, method: "GET" | "POST" = "GET", postData?: any, useGuest: boolean = false, forceRefresh: boolean = false) {
  const cacheKey = `${method}:${url}:${typeof postData === 'object' ? JSON.stringify(postData) : (postData || '')}`;
  
  if (method === "GET" && !useGuest && !forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  if (isOfflineMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const mockData = getMockResponse(url);
    if (method === "GET" && !mockData.error && !useGuest) {
      cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
    }
    return mockData;
  }

  const apiUrl = getApiUrl();
  
  if (isCapacitor && apiUrl === "/api/nga") {
    throw new Error("请先在设置中配置后端服务器地址，或启用离线模式体验\n\n当前版本需要部署后端服务器才能使用，请联系开发者获取部署说明");
  }

  const uid = useGuest ? null : localStorage.getItem("nreader_uid");
  const cid = useGuest ? null : localStorage.getItem("nreader_cid");
  
  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, uid, cid, method, postData })
    });
  } catch (e) {
    if (isCapacitor) {
      throw new Error(`无法连接到后端服务器\n\n请检查：\n1. 服务器地址是否正确\n2. 服务器是否正在运行\n3. 网络连接是否正常\n\n错误详情: ${(e as Error).message}`);
    }
    throw e;
  }
  
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
  
  let data;
  try {
    data = await res.json();
  } catch (e) {
    const text = await res.text();
    if (text.trim().startsWith('<!')) {
      if (isCapacitor) {
        throw new Error("后端服务器返回了无效响应\n\n请检查服务器地址是否正确");
      }
      throw new Error("Invalid response from server");
    }
    throw e;
  }
  
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
  const data = await fetchNga(`https://bbs.nga.cn/read.php?tid=${threadId}&page=${page}&__output=8`, "GET", undefined, useGuest);
  
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
    ? `https://bbs.nga.cn/nuke.php?__lib=topic_favor_v2&__act=add&action=add&folder=1&tid=${threadId}&__output=8`
    : `https://bbs.nga.cn/nuke.php?__lib=topic_favor&__act=topic_favor&action=del&raw=3&tid=${threadId}&page=1&tidarray=${threadId}&__output=8`;
  const data = await fetchNga(url);
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

export interface Message {
  id: string;
  from: string;
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export async function getMessages(page = 1): Promise<Message[]> {
  const data = await fetchNga(`https://bbs.nga.cn/nuke.php?__lib=message&__act=message&action=list&page=${page}&__output=8`);
  if (data.error) {
    const errorMsg = typeof data.error === 'string' 
      ? data.error 
      : (Array.isArray(data.error) ? data.error[0] : Object.values(data.error)[0]);
    throw new Error(errorMsg as string || "Unknown NGA error");
  }

  const messagesData = Array.isArray(data.data) ? data.data[0] : data.data || {};
  const messages: Message[] = [];
  
  for (const key in messagesData) {
    const m = messagesData[key];
    if (typeof m !== 'object') continue;
    messages.push({
      id: m.mid?.toString(),
      from: m.from_username || "System",
      title: m.subject || "No Title",
      content: m.content || "",
      createdAt: m.time ? new Date(m.time * 1000).toISOString() : new Date().toISOString(),
      isRead: m.is_read === 1,
    });
  }
  
  return messages;
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
