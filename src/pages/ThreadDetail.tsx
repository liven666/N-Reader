import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPostsByThread, toggleFavorThread, votePost, replyPost, Post } from "../services/ngaApi";
import { ArrowLeft, ThumbsUp, ThumbsDown, MessageSquareReply, Share2, Bookmark, BookmarkCheck, Loader2, X, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { parseBBCode } from "../utils/bbcodeParser";
import { useSettings } from "../contexts/SettingsContext";
import { cn } from "../lib/utils";

export default function ThreadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fontSize, lineHeight } = useSettings();
  
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

  useEffect(() => {
    if (id) {
      // Check local storage for initial state, but we should ideally fetch from NGA
      const saved = JSON.parse(localStorage.getItem('nreader_saved_threads') || '[]');
      setIsSaved(saved.some((t: any) => t.id === id));
      
      fetchPosts();
    }
  }, [id]);

  const fetchPosts = async (useGuest = false) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await getPostsByThread(id, 1, useGuest);
      if (!data.posts || data.posts.length === 0) {
        throw new Error("该帖子暂无内容或已被删除");
      }
      setPosts(data.posts);
      setThreadTitle(data.threadTitle || "无标题");
      setReplyCount(data.replyCount || 0);
      setLoading(false);
    } catch (err: any) {
      console.error("Fetch posts error:", err);
      const isLoginError = err.message.includes("访客不能直接访问") || err.message.includes("未登录");
      
      if (!useGuest && !isLoginError) {
        // Try guest mode if authenticated fetch fails and it's not a login error
        fetchPosts(true);
      } else {
        setError(err.message || "未知错误");
        setLoading(false);
      }
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
      await replyPost(id, replyContent, replyToPid);
      setReplyContent("");
      setIsReplying(false);
      setReplyToPid(undefined);
      fetchPosts(); // Refresh posts
    } catch (err: any) {
      alert(`回复失败: ${err.message}`);
    } finally {
      setSubmittingReply(false);
    }
  };

  const openReplyModal = (pid?: string) => {
    setReplyToPid(pid);
    setIsReplying(true);
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

      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="text-red-500 text-sm mb-4">
              {error.includes("访客不能直接访问") || error.includes("未登录") ? "需要登录才能查看此帖子" : `加载失败: ${error}`}
            </div>
            {error.includes("访客不能直接访问") || error.includes("未登录") ? (
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate("/profile")}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-medium transition-colors"
                >
                  去登录
                </button>
                <a 
                  href={`https://bbs.nga.cn/read.php?tid=${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full text-sm font-medium transition-colors"
                >
                  在浏览器中打开
                </a>
              </div>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => fetchPosts(false)}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-medium transition-colors"
                >
                  重试
                </button>
                <a 
                  href={`https://bbs.nga.cn/read.php?tid=${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full text-sm font-medium transition-colors"
                >
                  在浏览器中打开
                </a>
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
                <div key={post.id} className="p-4">
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
                        return parseBBCode(post.content);
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
            </div>
          </>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#FFFDF5]/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-gray-200 dark:border-zinc-800 p-3 pb-safe flex items-center gap-3 z-30">
        <button 
          onClick={() => openReplyModal()}
          className="flex-1 bg-[#FDF4D4] dark:bg-zinc-800 rounded-full px-4 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center cursor-text text-left"
        >
          说点什么...
        </button>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("链接已复制到剪贴板");
          }}
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
                autoFocus
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="在此输入回复内容..."
                className="w-full h-64 p-3 bg-[#FFF9E6] dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
