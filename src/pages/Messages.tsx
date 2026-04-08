import { useState, useEffect } from "react";
import { BellRing, Mail, AtSign, Loader2 } from "lucide-react";
import { getMessages, Message } from "../services/ngaApi";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { parseBBCode } from "../utils/bbcodeParser";

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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

  return (
    <div className="flex flex-col h-full bg-[#FFF9E6] dark:bg-zinc-950">
      <header className="sticky top-0 z-10 bg-[#FFFDF5]/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 px-4 py-3">
        <h1 className="text-xl font-bold tracking-tight">消息中心</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button className="flex flex-col items-center justify-center p-4 bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm active:scale-95 transition-transform">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
              <AtSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">@我的</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm active:scale-95 transition-transform relative">
            <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></div>
            <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mb-2">
              <BellRing className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">回复我的</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm active:scale-95 transition-transform">
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
            {error.includes("访客不能直接访问") || error.includes("未登录") ? (
              <span>请先登录以查看消息</span>
            ) : (
              <span>加载失败: {error}</span>
            )}
          </div>
        ) : messages.length > 0 ? (
          <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
            {messages.map((msg) => (
              <div key={msg.id} className={`p-4 ${!msg.isRead ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
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
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: zhCN })}
                      </div>
                    </div>
                  </div>
                  {!msg.isRead && (
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{msg.title}</h4>
                <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                  {parseBBCode(msg.content)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-8 text-center">
            <div className="w-16 h-16 bg-[#FFF9E6] dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <BellRing className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">暂无新通知</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">去论坛里多互动一下吧</p>
          </div>
        )}
      </div>
    </div>
  );
}
