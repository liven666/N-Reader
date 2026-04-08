import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Clock, MessageSquare, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getFavorThreads, getCachedFavorThreads, Thread } from "../services/ngaApi";

export default function Following() {
  const cached = getCachedFavorThreads();
  const [savedThreads, setSavedThreads] = useState<Thread[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState("");

  const fetchThreads = (force = false) => {
    if (!force && getCachedFavorThreads()) {
      setSavedThreads(getCachedFavorThreads()!);
      setLoading(false);
      return;
    }
    setLoading(true);
    getFavorThreads(1, force)
      .then(data => {
        setSavedThreads(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#FFF9E6] dark:bg-zinc-950">
      <header className="sticky top-0 z-10 bg-[#FFFDF5]/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 px-4 py-3">
        <h1 className="text-xl font-bold tracking-tight">关注与收藏</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <Bookmark className="w-4 h-4" />
          <span>收藏的帖子 ({savedThreads.length})</span>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="text-center p-8 text-red-500">
            {error.includes("访客不能直接访问") || error.includes("未登录") ? (
              <span>请先<Link to="/profile" className="underline text-amber-600">登录</Link>以查看收藏的帖子</span>
            ) : (
              <span>加载失败: {error}</span>
            )}
          </div>
        ) : savedThreads.length > 0 ? (
          <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
            {savedThreads.map((thread) => (
              <Link
                key={thread.id}
                to={`/thread/${thread.id}`}
                className="block p-4 hover:bg-[#FFF9E6] dark:hover:bg-zinc-800/50 transition-colors active:bg-[#FDF4D4] dark:active:bg-zinc-800"
              >
                <h2 className="text-base font-medium text-gray-900 dark:text-gray-100 leading-snug mb-2 line-clamp-2">
                  {thread.title}
                </h2>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-3">
                  <span className="font-medium text-gray-600 dark:text-gray-300">{thread.author}</span>
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true, locale: zhCN })}
                  </span>
                  <span className="flex items-center ml-auto">
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    {thread.replyCount}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
            <Bookmark className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">暂无收藏的帖子</p>
            <p className="text-xs mt-1 opacity-70">在帖子详情页点击右上角即可收藏</p>
          </div>
        )}
      </div>
    </div>
  );
}
