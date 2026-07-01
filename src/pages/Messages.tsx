import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, Mail, AtSign, Loader2, ChevronRight, X } from "lucide-react";
import { getMessages, getPrivateMessageThread, Message, PrivateMessageThread } from "../services/ngaApi";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { parseBBCode } from "../utils/bbcodeParser";
import { isLoginRequiredError } from "../utils/authErrors";
import { readNgaCredentials } from "../services/ngaCredentials";
import { openInInternalBrowser } from "../utils/internalLinks";

export default function Messages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"reaction" | "reply" | "private">("reply");
  const [privateThread, setPrivateThread] = useState<PrivateMessageThread | null>(null);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [privateError, setPrivateError] = useState("");

  useEffect(() => {
    const credentials = readNgaCredentials();
    if (!credentials.uid || !credentials.cid) {
      setError("未登录");
      setLoading(false);
      return;
    }

    getMessages()
      .then(data => {
        setMessages(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const visibleMessages = messages.filter((message) => message.kind === filter);

  const formatMessageTime = (createdAt: string) => {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "刚刚";
    return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
  };

  const openOriginalMessages = () => {
    void openInInternalBrowser("https://bbs.nga.cn/nuke.php?__lib=message&__act=message&action=list");
  };

  const openMessage = async (message: Message) => {
    if (message.kind === "private") {
      if (!message.messageId || privateLoading) return;
      setPrivateLoading(true);
      setPrivateError("");
      setPrivateThread(null);
      try {
        const detail = await getPrivateMessageThread(message.messageId);
        setPrivateThread(detail);
      } catch {
        void openInInternalBrowser(`https://bbs.nga.cn/nuke.php?__lib=message&__act=message&action=read&mid=${encodeURIComponent(message.messageId)}`);
        setPrivateError("");
      } finally {
        setPrivateLoading(false);
      }
      return;
    }

    if (message.threadId) {
      const params = new URLSearchParams();
      if (message.page) params.set("page", String(message.page));
      if (message.postId) params.set("pid", message.postId);
      navigate(`/thread/${message.threadId}${params.toString() ? `?${params.toString()}` : ""}`);
    }
  };

  const filterButtonClass = (active: boolean) => [
    "flex flex-col items-center justify-center p-4 bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border shadow-sm active:scale-95 transition-transform",
    active ? "border-amber-300 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-700" : "border-gray-100 dark:border-zinc-800"
  ].join(" ");

  return (
    <div className="flex flex-col h-full bg-[#FFF9E6] dark:bg-zinc-950">
      <header className="sticky top-0 z-10 bg-[#FFFDF5]/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 px-4 py-3">
        <h1 className="text-xl font-bold tracking-tight">消息中心</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button onClick={() => setFilter("reaction")} className={filterButtonClass(filter === "reaction")}>
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
              <AtSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">@我的</span>
          </button>
          <button onClick={() => setFilter("reply")} className={`${filterButtonClass(filter === "reply")} relative`}>
            {messages.some((message) => message.kind === "reply") && <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></div>}
            <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mb-2">
              <BellRing className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">回复我的</span>
          </button>
          <button onClick={() => setFilter("private")} className={filterButtonClass(filter === "private")}>
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-2">
              <Mail className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">短消息</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="text-center p-8 text-red-500">
            {isLoginRequiredError(error) ? (
              <span>请先登录以查看消息</span>
            ) : (
              <span>加载失败: {error}</span>
            )}
          </div>
        ) : visibleMessages.length > 0 ? (
          <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
            {visibleMessages.map((msg) => (
              <button
                key={msg.id}
                type="button"
                onClick={() => openMessage(msg)}
                className={`w-full text-left p-4 ${!msg.isRead ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''} active:bg-[#FDF4D4] dark:active:bg-zinc-800 transition-colors`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-sm">
                      {(msg.from || "未知").toString().charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-200">
                        {msg.from}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        {formatMessageTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!msg.isRead && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{msg.title}</h4>
                <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                  {parseBBCode(msg.content)}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-8 text-center">
            <div className="w-16 h-16 bg-[#FFF9E6] dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <BellRing className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">暂无消息</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">当前分类没有可查看的消息</p>
            <button
              type="button"
              onClick={openOriginalMessages}
              className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-medium transition-colors"
            >
              原站消息
            </button>
          </div>
        )}
      </div>

      {(privateLoading || privateError || privateThread) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="w-full max-w-md max-h-[82vh] bg-[#FFFDF5] dark:bg-zinc-900 rounded-t-2xl overflow-hidden shadow-xl">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate pr-3">
                {privateThread?.title || "私信详情"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setPrivateThread(null);
                  setPrivateError("");
                  setPrivateLoading(false);
                }}
                className="p-2 rounded-full text-gray-500 hover:bg-[#FDF4D4] dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {privateLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                </div>
              ) : privateError ? (
                <div className="text-sm text-red-500 text-center p-6">{privateError}</div>
              ) : (
                <div className="space-y-4">
                  {privateThread?.messages.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-gray-100 dark:border-zinc-800 bg-[#FFF9E6] dark:bg-zinc-950 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{entry.from}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">{formatMessageTime(entry.createdAt)}</span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-200 break-words">
                        {parseBBCode(entry.content)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
