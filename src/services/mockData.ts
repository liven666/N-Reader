export interface Board {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Thread {
  id: string;
  boardId: string;
  title: string;
  author: string;
  authorAvatar?: string;
  replyCount: number;
  createdAt: string;
  isSticky?: boolean;
}

export interface Post {
  id: string;
  threadId: string;
  floor: number;
  author: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likes: number;
}

export const MOCK_BOARDS: Board[] = [
  { id: "843", name: "国际区/国新区", description: "魔兽世界国际服/国服讨论", icon: "🌍" },
  { id: "-7", name: "网事杂谈", description: "生活、情感、杂谈", icon: "☕" },
  { id: "436", name: "消费电子", description: "数码产品、手机、家电", icon: "📱" },
  { id: "414", name: "游戏综合", description: "各类游戏综合讨论", icon: "🎮" },
  { id: "510521", name: "泰坦重铸时光服", description: "魔兽世界时光服讨论", icon: "⏳" },
];

export const MOCK_THREADS: Thread[] = [
  { id: "1001", boardId: "7", title: "【讨论】11.0地心之战大秘境首发职业推荐", author: "大领主提里奥", replyCount: 234, createdAt: "2026-03-19T10:00:00Z", isSticky: true },
  { id: "1002", boardId: "7", title: "分享一个自用的WA字符串整合包", author: "插件达人", replyCount: 45, createdAt: "2026-03-19T09:30:00Z" },
  { id: "1003", boardId: "436", title: "【树洞】今天去相亲，遇到一个奇葩", author: "匿名企鹅", replyCount: 892, createdAt: "2026-03-18T20:15:00Z" },
  { id: "1004", boardId: "188", title: "求助，预算8000，主玩3A，怎么配？", author: "装机小白", replyCount: 32, createdAt: "2026-03-19T08:00:00Z" },
];

export const MOCK_POSTS: Post[] = [
  { id: "p1", threadId: "1001", floor: 0, author: "大领主提里奥", content: "如题，马上开11.0了，大家觉得首发什么职业比较好进组？\n目前在考虑防骑或者DHT，求大佬指点！\n[img]https://picsum.photos/seed/wow/800/400[/img]", createdAt: "2026-03-19T10:00:00Z", likes: 12 },
  { id: "p2", threadId: "1001", floor: 1, author: "跟风小王子", content: "[quote]目前在考虑防骑或者DHT，求大佬指点！[/quote]\n无脑DHT就完事了，聚怪无敌，硬度也有保证。防骑高层容易猝死。\n[collapse=防骑高层猝死原因分析]防骑的减伤覆盖有空窗期，而且非常吃技师的熟练度。一旦断档，在高层就是一刀没。[/collapse]", createdAt: "2026-03-19T10:05:00Z", likes: 5 },
  { id: "p3", threadId: "1001", floor: 2, author: "信仰圣光", content: "一代版本一代神，代代版本玩大神。只要技师够强，什么职业都能玩。[b]不过集合石确实看职业颜色。[/b]\n顺便roll个点看看今晚出不出坐骑：[diceroll=d100]85[/diceroll]", createdAt: "2026-03-19T10:12:00Z", likes: 34 },
];

export const getBoard = (id: string) => MOCK_BOARDS.find(b => b.id === id);
export const getThreadsByBoard = (boardId: string) => MOCK_THREADS.filter(t => t.boardId === boardId);
export const getThread = (id: string) => MOCK_THREADS.find(t => t.id === id);
export const getPostsByThread = (threadId: string) => MOCK_POSTS.filter(p => p.threadId === threadId);
