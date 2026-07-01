import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { checkIn, getPostsByThread, toggleFavorThread, votePost, replyPost, Post } from "../services/ngaApi";
import { ArrowLeft, ThumbsUp, ThumbsDown, MessageSquareReply, Share2, Bookmark, BookmarkCheck, Loader2, X, Send, Smile } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { parseBBCode } from "../utils/bbcodeParser";
import { useSettings } from "../contexts/SettingsContext";
import { cn } from "../lib/utils";
import { isLoginRequiredError } from "../utils/authErrors";
import { openInInternalBrowser } from "../utils/internalLinks";
import { NgaSmileGroupKey, ngaSmileGroups } from "../utils/acEmoticons";

export default function ThreadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fontSize, lineHeight } = useSettings();
  const initialPage = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const targetPid = searchParams.get("pid");
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [threadTitle, setThreadTitle] = useState("");
  const [replyCount, setReplyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reply state
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyToPid, setReplyToPid] = useState<string | undefined>(undefined);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showSmilePanel, setShowSmilePanel] = useState(false);
  const [activeSmileGroup, setActiveSmileGroup] = useState<NgaSmileGroupKey>("ac");
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Image Viewer
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const hasMorePosts = (items: Post[], totalReplies: number) => {
    if (items.length === 0) return false;
    const maxFloor = Math.max(...items.map((post) => Number(post.floor)).filter(Number.isFinite));
    if (!Number.isFinite(maxFloor) || totalReplies <= 0) return items.length >= 20;
    return maxFloor < totalReplies;
  };

  useEffect(() => {
    if (id) {
      // Check local storage for initial state, but we should ideally fetch from NGA
      const saved = JSON.parse(localStorage.getItem('nreader_saved_threads') || '[]');
      setIsSaved(saved.some((t: any) => t.id === id));
      
      fetchPosts(false, initialPage);
    }
  }, [id, initialPage]);

  useEffect(() => {
    if (!targetPid || loading) return;
    requestAnimationFrame(() => {
      document.getElementById(`post-${targetPid}`)?.scrollIntoView({ block: "center" });
    });
  }, [targetPid, loading, posts]);

  const fetchPosts = async (useGuest = false, pageToLoad = initialPage) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await getPostsByThread(id, pageToLoad, useGuest);
      if (!data.posts || data.posts.length === 0) {
        throw new Error("该帖子暂无内容或已被删除");
      }
      setPosts(data.posts);
      setThreadTitle(data.threadTitle || "无标题");
      setReplyCount(data.replyCount || 0);
      setPage(pageToLoad);
      setHasMore(hasMorePosts(data.posts, data.replyCount || 0));
      setLoading(false);
    } catch (err: any) {
      console.error("Fetch posts error:", err);
      
      if (!useGuest) {
        // Try guest mode if authenticated fetch fails; public threads should still be readable.
        fetchPosts(true, pageToLoad);
      } else {
        setError(err.message || "未知错误");
        setLoading(false);
      }
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !id) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      let data;
      try {
        data = await getPostsByThread(id, nextPage, false);
      } catch (error) {
        console.warn("Authenticated page load failed, retrying as guest:", error);
        data = await getPostsByThread(id, nextPage, true);
      }
      if (data.posts.length === 0) {
        setHasMore(false);
      } else {
        const existingIds = new Set(posts.map(p => p.id));
        const newPosts = data.posts.filter(p => !existingIds.has(p.id));
        const mergedPosts = [...posts, ...newPosts];
        setPosts(mergedPosts);
        setPage(nextPage);
        setReplyCount(data.replyCount || replyCount);
        setHasMore(newPosts.length > 0 && hasMorePosts(mergedPosts, data.replyCount || replyCount));
      }
    } catch (err: any) {
      console.error("Failed to load more posts:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadMore();
    }
  };

  const handleToggleSave = async () => {
    if (!id || saving) return;
    setSaving(true);
    try {
      await toggleFavorThread(id, isSaved ? 'del' : 'add');
      
      // Update local storage for offline/quick access
      const saved = JSON.parse(localStorage.getItem('nreader_saved_threads') || '[]');
      let newSaved;
      if (isSaved) {
        newSaved = saved.filter((t: any) => t.id !== id);
      } else {
        newSaved = [...saved, { 
          id, 
          title: threadTitle, 
          author: posts[0]?.author || '未知', 
          replyCount, 
          createdAt: new Date().toISOString() 
        }];
      }
      localStorage.setItem('nreader_saved_threads', JSON.stringify(newSaved));
      setIsSaved(!isSaved);
    } catch (err: any) {
      alert(`收藏失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (pid: string, value: 1 | -1) => {
    if (!id) return;
    try {
      await votePost(id, pid, value);
      // Optimistically update UI
      setPosts(posts.map(p => {
        if (p.id === pid) {
          return { ...p, likes: p.likes + value };
        }
        return p;
      }));
    } catch (err: any) {
      alert(`操作失败: ${err.message}`);
    }
  };

  const handleReplySubmit = async () => {
    if (!id || !replyContent.trim()) return;
    setSubmittingReply(true);
    try {
      await checkIn().catch((err) => {
        console.warn("Check-in before reply skipped:", err);
      });
      await replyPost(id, replyContent, replyToPid);
      setReplyContent("");
      setIsReplying(false);
      setShowSmilePanel(false);
      setReplyToPid(undefined);
      fetchPosts(false, page); // Refresh posts
    } catch (err: any) {
      if (/签到|check.?in|发言|回帖|评论/.test(String(err.message || ""))) {
        try {
          await checkIn();
          await replyPost(id, replyContent, replyToPid);
          setReplyContent("");
          setIsReplying(false);
          setShowSmilePanel(false);
          setReplyToPid(undefined);
          fetchPosts(false, page);
        } catch (retryErr: any) {
          alert(`回复失败: ${retryErr.message}`);
        }
      } else {
        alert(`回复失败: ${err.message}`);
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  const openReplyModal = (pid?: string) => {
    setReplyToPid(pid);
    setShowSmilePanel(false);
    setIsReplying(true);
  };

  const insertSmile = (code: string) => {
    const textarea = replyTextareaRef.current;
    if (!textarea) {
      setReplyContent((current) => `${current}${code}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${replyContent.slice(0, start)}${code}${replyContent.slice(end)}`;
    setReplyContent(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + code.length, start + code.length);
    });
  };

  const handleShare = () => {
    const ngaUrl = `https://bbs.nga.cn/read.php?tid=${id}`;
    if (navigator.share) {
      navigator.share({
        title: threadTitle,
        url: ngaUrl
      }).catch(err => {
        console.error('Share failed', err);
      });
    } else {
      navigator.clipboard.writeText(ngaUrl);
      alert("原帖链接已复制到剪贴板");
    }
  };

  const openOriginalThread = () => {
    if (!id) return;
    void openInInternalBrowser(`https://bbs.nga.cn/read.php?tid=${id}`);
  };

  // Dynamic typography classes based on settings
  const textClasses = cn(
    "text-gray-800 dark:text-gray-200 break-words",
    {
      'text-sm': fontSize === 'small',
      'text-base': fontSize === 'medium',
      'text-lg': fontSize === 'large',
      'leading-snug': lineHeight === 'tight',
      'leading-relaxed': lineHeight === 'normal',
      'leading-loose': lineHeight === 'loose',
    }
  );
  const activeSmileGroupData = ngaSmileGroups.find((group) => group.key === activeSmileGroup) || ngaSmileGroups[0];

  return (
    <div className="flex flex-col h-full bg-[#FFFDF5] dark:bg-zinc-950">
      <header className="sticky top-0 z-20 bg-[#FFFDF5]/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 px-2 py-2 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-[#FDF4D4] dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 px-2 min-w-0 flex justify-center">
          <span className="text-sm font-medium text-gray-500 truncate">帖子详情</span>
        </div>
        <div className="flex items-center">
          <button 
            onClick={handleToggleSave}
            disabled={saving}
            className="p-2 rounded-full hover:bg-[#FDF4D4] dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : isSaved ? <BookmarkCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" /> : <Bookmark className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-36" onScroll={handleScroll}>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="text-red-500 text-sm mb-4">
              {isLoginRequiredError(error) ? "需要登录才能查看此帖子" : `加载失败: ${error}`}
            </div>
            {isLoginRequiredError(error) ? (
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate("/profile")}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-medium transition-colors"
                >
                  去登录
                </button>
                <button 
                  type="button"
                  onClick={openOriginalThread}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full text-sm font-medium transition-colors"
                >
                  内置浏览器打开
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => fetchPosts(false, initialPage)}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-medium transition-colors"
                >
                  重试
                </button>
                <button 
                  type="button"
                  onClick={openOriginalThread}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full text-sm font-medium transition-colors"
                >
                  内置浏览器打开
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Title Section */}
            <div className="px-4 pt-5 pb-4 border-b border-gray-100 dark:border-zinc-800/50">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50 leading-snug mb-3">
                {threadTitle}
              </h1>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{replyCount} 回复</span>
              </div>
            </div>

            {/* Posts */}
            <div className="divide-y divide-gray-100 dark:divide-zinc-800/50">
              {posts.map((post) => (
                <div
                  key={post.id}
                  id={`post-${post.id}`}
                  className={`p-4 ${targetPid === post.id ? "bg-amber-50 dark:bg-amber-900/20 ring-1 ring-inset ring-amber-200 dark:ring-amber-800" : ""}`}
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {post.avatar ? (
                        <img src={post.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover bg-[#FDF4D4] dark:bg-zinc-800" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-sm">
                          {(post.author || "未知").toString().charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-200">
                          {post.author}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                          第 {post.floor} 楼 · {post.createdAt}
                        </div>
                      </div>
                    </div>
                    {post.floor === 0 && (
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded">
                         楼主
                      </span>
                    )}
                  </div>

                  {/* Post Content */}
                  <div className={textClasses}>
                    {(() => {
                      try {
                        return parseBBCode(post.content, setFullscreenImage);
                      } catch (e) {
                        console.error("Parse BBCode error:", e);
                        return <div className="text-red-500 text-xs italic">内容解析失败</div>;
                      }
                    })()}
                  </div>

                  {/* Post Actions */}
                  <div className="mt-4 flex items-center justify-end gap-4 text-gray-400 dark:text-gray-500">
                    <button 
                      onClick={() => handleVote(post.id, 1)}
                      className="flex items-center gap-1.5 text-xs hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      {post.likes > 0 && <span>{post.likes}</span>}
                    </button>
                    <button 
                      onClick={() => handleVote(post.id, -1)}
                      className="flex items-center gap-1.5 text-xs hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => openReplyModal(post.id)}
                      className="flex items-center gap-1.5 text-xs hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    >
                      <MessageSquareReply className="w-4 h-4" />
                      回复
                    </button>
                  </div>
                </div>
              ))}
              {loadingMore && (
                <div className="p-4 flex justify-center border-t border-gray-100 dark:border-zinc-800/50">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                </div>
              )}
              {!loadingMore && hasMore && (
                <div className="p-4 flex justify-center border-t border-gray-100 dark:border-zinc-800/50">
                  <button
                    type="button"
                    onClick={loadMore}
                    className="px-4 py-2 bg-[#FDF4D4] dark:bg-zinc-800 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium active:scale-95 transition-transform"
                  >
                    加载更多
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-[#FFFDF5]/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-gray-200 dark:border-zinc-800 p-3 flex items-center gap-3 z-40">
        <button 
          onClick={() => openReplyModal()}
          className="flex-1 bg-[#FDF4D4] dark:bg-zinc-800 rounded-full px-4 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center cursor-text text-left"
        >
          说点什么...
        </button>
        <button 
          onClick={handleShare}
          className="p-2 text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Reply Panel */}
      {isReplying && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center pointer-events-none">
          <div className="bg-[#FFFDF5] dark:bg-zinc-900 w-full max-w-md rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.1)] overflow-hidden animate-in slide-in-from-bottom-full duration-200 pointer-events-auto border-t border-gray-200 dark:border-zinc-800 mb-16">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                {replyToPid ? "回复帖子" : "发表回复"}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReplySubmit}
                  disabled={!replyContent.trim() || submittingReply}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {submittingReply ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  发送
                </button>
                <button 
                  onClick={() => setIsReplying(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-[#FDF4D4] dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <textarea
                ref={replyTextareaRef}
                autoFocus
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="在此输入回复内容..."
                className="w-full h-44 p-3 bg-[#FFF9E6] dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-gray-900 dark:text-gray-100 text-sm"
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowSmilePanel((value) => !value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showSmilePanel
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      : "bg-[#FDF4D4] text-gray-700 dark:bg-zinc-800 dark:text-gray-200"
                  }`}
                >
                  <Smile className="w-4 h-4" />
                  表情
                </button>
                <span className="text-xs text-gray-400">{replyContent.length}</span>
              </div>
              {showSmilePanel && (
                <div className="mt-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-[#FFF9E6] dark:bg-zinc-950 overflow-hidden">
                  <div className="flex gap-1 p-2 border-b border-gray-100 dark:border-zinc-800 overflow-x-auto">
                    {ngaSmileGroups.map((group) => (
                      <button
                        key={group.key}
                        type="button"
                        onClick={() => setActiveSmileGroup(group.key)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          activeSmileGroup === group.key
                            ? "bg-amber-600 text-white"
                            : "bg-[#FFFDF5] text-gray-600 dark:bg-zinc-900 dark:text-gray-300"
                        }`}
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 p-2 max-h-40 overflow-y-auto">
                    {activeSmileGroupData.smiles.map((smile) => (
                      <button
                        key={`${activeSmileGroupData.key}-${smile.name}`}
                        type="button"
                        title={smile.name}
                        onClick={() => insertSmile(smile.code)}
                        className="aspect-square rounded-lg bg-[#FFFDF5] dark:bg-zinc-900 border border-transparent hover:border-amber-200 dark:hover:border-amber-800 active:scale-95 transition-all flex items-center justify-center"
                      >
                        <img
                          src={smile.url}
                          alt={smile.name}
                          className="w-7 h-7 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setFullscreenImage(null)}
        >
          <img 
            src={fullscreenImage} 
            alt="Fullscreen preview" 
            className="max-w-full max-h-full object-contain pointer-events-auto cursor-zoom-out"
            referrerPolicy="no-referrer"
            onClick={(e) => {
              // Let click bubble to close, but keep pointer events so user can long-press to save on mobile
            }}
          />
          <button 
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenImage(null);
            }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
