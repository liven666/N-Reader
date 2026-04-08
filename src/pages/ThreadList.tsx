import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getBoard } from "../services/mockData";
import { getThreadsByBoard, Thread } from "../services/ngaApi";
import { ArrowLeft, MessageSquare, Clock, Pin, Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function ThreadList() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const board = getBoard(id || "");
  const [boardName, setBoardName] = useState(board?.name || "板块详情");
  
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [hasRestoredScroll, setHasRestoredScroll] = useState(false);
  const [lastBoardId, setLastBoardId] = useState<string | undefined>(undefined);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Disable browser's default scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  const saveState = (clickedId?: string) => {
    if (id && threads.length > 0) {
      const state = {
        threads,
        page,
        hasMore,
        scrollTop: scrollContainerRef.current?.scrollTop || 0,
        lastClickedId: clickedId || sessionStorage.getItem(`last_clicked_${id}`)
      };
      sessionStorage.setItem(`board_state_${id}`, JSON.stringify(state));
      if (clickedId) {
        sessionStorage.setItem(`last_clicked_${id}`, clickedId);
      }
    }
  };

  // Use sessionStorage to cache the list state
  useEffect(() => {
    if (!id) return;
    
    // Reset scroll restoration flag if board changed
    if (id !== lastBoardId) {
      setHasRestoredScroll(false);
      setLastBoardId(id);
    }

    // Check if we have cached state for this board
    const cachedState = sessionStorage.getItem(`board_state_${id}`);
    if (cachedState) {
      try {
        const parsed = JSON.parse(cachedState);
        setThreads(parsed.threads);
        setPage(parsed.page);
        setHasMore(parsed.hasMore);
        setLoading(false);
        
        // Restore scroll position after a short delay to allow rendering
        if (!hasRestoredScroll) {
          const restore = (attempts = 0) => {
            if (!scrollContainerRef.current) {
              if (attempts < 30) setTimeout(() => restore(attempts + 1), 50);
              return;
            }

            const container = scrollContainerRef.current;
            const targetScrollTop = parsed.scrollTop;
            const lastClickedId = parsed.lastClickedId;

            // Try to find the element first if we have a lastClickedId
            if (lastClickedId) {
              const element = document.getElementById(`thread-${lastClickedId}`);
              if (element) {
                element.scrollIntoView({ block: 'center' });
                setHasRestoredScroll(true);
                return;
              }
            }

            // Fallback to scrollTop if element not found or no lastClickedId
            if (targetScrollTop > 0) {
              if (container.scrollHeight > targetScrollTop) {
                container.scrollTop = targetScrollTop;
                setHasRestoredScroll(true);
              } else if (attempts < 30) {
                setTimeout(() => restore(attempts + 1), 100);
              }
            } else {
              setHasRestoredScroll(true);
            }
          };
          
          // Use requestAnimationFrame for smoother initial attempt
          requestAnimationFrame(() => restore());
        }
        return;
      } catch (e) {
        // Ignore cache error
      }
    }

    setLoading(true);
    setError("");
    getThreadsByBoard(id, 1)
      .then(data => {
        setThreads(data);
        setHasMore(data.length > 0);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, lastBoardId, hasRestoredScroll]);

  // Save state before leaving
  useEffect(() => {
    return () => {
      saveState();
    };
  }, [id, threads, page, hasMore]);

  const loadMore = () => {
    if (loadingMore || !hasMore || !id) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    getThreadsByBoard(id, nextPage)
      .then(data => {
        if (data.length === 0) {
          setHasMore(false);
        } else {
          setThreads(prev => {
            // Filter out duplicates
            const existingIds = new Set(prev.map(t => t.id));
            const newThreads = data.filter(t => !existingIds.has(t.id));
            return [...prev, ...newThreads];
          });
          setPage(nextPage);
        }
        setLoadingMore(false);
      })
      .catch(err => {
        console.error("Failed to load more:", err);
        setLoadingMore(false);
      });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadMore();
    }
  };

  if (!id) {
    return <div className="p-8 text-center text-gray-500">板块不存在</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#FFF9E6] dark:bg-zinc-950">
      <header className="sticky top-0 z-10 bg-[#FFFDF5]/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 px-4 py-3 flex items-center">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 mr-2 rounded-full hover:bg-[#FDF4D4] dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{boardName}</h1>
        </div>
        <button 
          onClick={() => {
            if (loading) return;
            setLoading(true);
            setError("");
            sessionStorage.removeItem(`board_state_${id}`);
            getThreadsByBoard(id || "1", 1, true)
              .then(data => {
                setThreads(data);
                setPage(1);
                setHasMore(data.length > 0);
                setLoading(false);
                setHasRestoredScroll(false);
              })
              .catch(err => {
                setError(err.message);
                setLoading(false);
              });
          }}
          className="p-2 -mr-2 rounded-full hover:bg-[#FDF4D4] dark:hover:bg-zinc-800 transition-colors text-gray-600 dark:text-gray-300"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="text-red-500 text-sm mb-4">
              加载失败: {error}
            </div>
            {error.includes("访客不能直接访问") || error.includes("未登录") ? (
              <Link 
                to="/profile"
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-medium transition-colors"
              >
                去登录
              </Link>
            ) : (
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-medium transition-colors"
              >
                重试
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-800/50">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                id={`thread-${thread.id}`}
                to={`/thread/${thread.id}`}
                onClick={() => saveState(thread.id)}
                className="block p-4 bg-[#FFFDF5] dark:bg-zinc-900 hover:bg-[#FFF9E6] dark:hover:bg-zinc-800/80 transition-colors active:bg-[#FDF4D4] dark:active:bg-zinc-800"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-medium text-gray-900 dark:text-gray-100 leading-snug mb-2 flex items-start gap-2">
                      {thread.isSticky && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 mt-0.5 shrink-0">
                          <Pin className="w-3 h-3 mr-0.5" /> 置顶
                        </span>
                      )}
                      <span className="line-clamp-2">{thread.title}</span>
                    </h2>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-3">
                      <span className="flex items-center font-medium text-gray-600 dark:text-gray-300">
                        {thread.author}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true, locale: zhCN })}
                      </span>
                      <span className="flex items-center ml-auto">
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        {thread.replyCount}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {threads.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                暂无帖子
              </div>
            )}
            {loadingMore && (
              <div className="p-4 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
