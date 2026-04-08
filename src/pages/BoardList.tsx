import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MOCK_BOARDS } from "../services/mockData";
import { getFavorBoards, getCachedFavorBoards, toggleFavorBoard, searchThreads, Board, Thread } from "../services/ngaApi";
import { ChevronRight, Search, Loader2, Star, MessageSquare, Clock, GripVertical, Edit2, Trash2, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { SortableList } from "../components/SortableList";
import { HotBoardEditModal } from "../components/HotBoardEditModal";

export default function BoardList() {
  const cached = getCachedFavorBoards();
  const [favorBoards, setFavorBoards] = useState<Board[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [showAllFavs, setShowAllFavs] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Hot boards state
  const [hotBoards, setHotBoards] = useState<Board[]>(() => {
    const saved = localStorage.getItem('nreader_hot_boards');
    return saved ? JSON.parse(saved) : MOCK_BOARDS;
  });
  const [isEditingHotBoards, setIsEditingHotBoards] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Favor boards order state
  const [favorBoardOrder, setFavorBoardOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('nreader_favor_board_order');
    return saved ? JSON.parse(saved) : [];
  });
  const [isEditingFavorBoards, setIsEditingFavorBoards] = useState(false);

  const [searchThreadsResult, setSearchThreadsResult] = useState<Thread[]>([]);
  const [isSearchingThreads, setIsSearchingThreads] = useState(false);
  const [searchThreadError, setSearchThreadError] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreThreads, setHasMoreThreads] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isSearchingThreads && hasMoreThreads) {
          loadMoreThreads();
        }
      },
      { threshold: 0.1 }
    );
    if (bottomRef.current) {
      observer.observe(bottomRef.current);
    }
    return () => observer.disconnect();
  }, [isSearchingThreads, hasMoreThreads, searchPage]);

  const sortFavorBoards = (boards: Board[], order: string[]) => {
    return [...boards].sort((a, b) => {
      const indexA = order.indexOf(a.id);
      const indexB = order.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  };

  const fetchBoards = (force = false) => {
    if (!force && getCachedFavorBoards()) {
      setFavorBoards(sortFavorBoards(getCachedFavorBoards()!, favorBoardOrder));
      setLoading(false);
      return;
    }
    setLoading(true);
    getFavorBoards(force)
      .then(data => {
        setFavorBoards(sortFavorBoards(data, favorBoardOrder));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const performThreadSearch = async (query: string, page: number, append = false) => {
    if (page === 1) setIsSearchingThreads(true);
    setSearchThreadError("");
    try {
      const data = await searchThreads(query, page);
      setSearchThreadsResult(prev => append ? [...prev, ...data] : data);
      setHasMoreThreads(data.length > 0);
    } catch (err: any) {
      setSearchThreadError(err.message);
    } finally {
      setIsSearchingThreads(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const timer = setTimeout(() => {
        setSearchPage(1);
        performThreadSearch(searchQuery, 1, false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchThreadsResult([]);
      setSearchThreadError("");
      setSearchPage(1);
      setHasMoreThreads(true);
    }
  }, [searchQuery]);

  const loadMoreThreads = () => {
    if (!isSearchingThreads && hasMoreThreads) {
      const nextPage = searchPage + 1;
      setSearchPage(nextPage);
      performThreadSearch(searchQuery, nextPage, true);
    }
  };

  const handleToggleFavor = async (e: React.MouseEvent, boardId: string, isFavorited: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggling) return;
    
    setToggling(boardId);
    try {
      await toggleFavorBoard(boardId, isFavorited ? 'del' : 'add');
      fetchBoards(true);
    } catch (err: any) {
      alert(`操作失败: ${err.message}`);
    } finally {
      setToggling(null);
    }
  };

  const isBoardFavorited = (id: string) => favorBoards.some(b => b.id === id);

  const handleSaveHotBoard = (board: Board) => {
    let newBoards;
    if (editingBoard) {
      newBoards = hotBoards.map(b => b.id === editingBoard.id ? board : b);
    } else {
      newBoards = [...hotBoards, board];
    }
    setHotBoards(newBoards);
    localStorage.setItem('nreader_hot_boards', JSON.stringify(newBoards));
    setShowEditModal(false);
    setEditingBoard(null);
  };

  const handleDeleteHotBoard = (id: string) => {
    const newBoards = hotBoards.filter(b => b.id !== id);
    setHotBoards(newBoards);
    localStorage.setItem('nreader_hot_boards', JSON.stringify(newBoards));
  };

  const handleReorderHotBoards = (newBoards: Board[]) => {
    setHotBoards(newBoards);
    localStorage.setItem('nreader_hot_boards', JSON.stringify(newBoards));
  };

  const handleReorderFavorBoards = (newBoards: Board[]) => {
    setFavorBoards(newBoards);
    const newOrder = newBoards.map(b => b.id);
    setFavorBoardOrder(newOrder);
    localStorage.setItem('nreader_favor_board_order', JSON.stringify(newOrder));
  };

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-10 bg-[#FFFDF5]/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        {isSearching ? (
          <div className="flex-1 flex items-center bg-[#FDF4D4] dark:bg-zinc-800 rounded-full px-3 py-1.5 mr-2">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              autoFocus
              placeholder="搜索板块..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
        ) : (
          <h1 className="text-xl font-bold tracking-tight">N-Reader</h1>
        )}
        <button 
          onClick={() => {
            setIsSearching(!isSearching);
            if (isSearching) setSearchQuery("");
          }}
          className="p-2 rounded-full bg-[#FDF4D4] dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-[#F0E6D2] dark:hover:bg-zinc-700 transition-colors"
        >
          {isSearching ? <span className="text-sm px-1">取消</span> : <Search className="w-5 h-5" />}
        </button>
      </header>

      <div className="p-4 space-y-6">
        {searchQuery.trim() !== "" ? (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">
              搜索结果
            </h2>
            <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
              {Array.from(new Map([...favorBoards, ...hotBoards]
                .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(b => [b.id, b])).values())
                .map((board) => (
                <Link
                  key={`search-${board.id}`}
                  to={`/board/${board.id}`}
                  className="flex items-center p-4 hover:bg-[#FFF9E6] dark:hover:bg-zinc-800/50 transition-colors active:bg-[#FDF4D4] dark:active:bg-zinc-800"
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md text-lg mr-3">
                    {board.icon || "📌"}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium">{board.name}</h3>
                  </div>
                  <button 
                    onClick={(e) => handleToggleFavor(e, board.id, isBoardFavorited(board.id))}
                    className="p-2 mr-2 rounded-full hover:bg-[#FDF4D4] dark:hover:bg-zinc-700 transition-colors"
                  >
                    {toggling === board.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : (
                      <Star className={`w-5 h-5 ${isBoardFavorited(board.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                    )}
                  </button>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
              {Array.from(new Map([...favorBoards, ...hotBoards]
                .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(b => [b.id, b])).values()).length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  没有找到相关板块
                </div>
              )}
            </div>
            
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-6 mb-3 px-1">
              帖子搜索结果
            </h2>
            <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
              {isSearchingThreads ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                </div>
              ) : searchThreadError ? (
                <div className="p-8 text-center text-red-500 text-sm">
                  {searchThreadError.includes("注册用户") ? "请先登录以搜索帖子" : `搜索失败: ${searchThreadError}`}
                </div>
              ) : searchThreadsResult.length > 0 ? (
                <>
                  {searchThreadsResult.map((thread) => (
                    <Link
                      key={`thread-${thread.id}`}
                      to={`/thread/${thread.id}`}
                      className="block p-4 hover:bg-[#FFF9E6] dark:hover:bg-zinc-800/80 transition-colors active:bg-[#FDF4D4] dark:active:bg-zinc-800"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-base font-medium text-gray-900 dark:text-gray-100 leading-snug mb-2 flex items-start gap-2">
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
                  <div ref={bottomRef} className="h-4" />
                  {isSearchingThreads && (
                    <div className="flex justify-center p-4">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    </div>
                  )}
                </>
              ) : searchQuery.trim().length > 1 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  没有找到相关帖子
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  请输入至少2个字符进行搜索
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            <section>
              <div className="flex justify-between items-center px-1 mb-3">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  我的收藏
                </h2>
                {favorBoards.length > 0 && (
                  <button 
                    onClick={() => setIsEditingFavorBoards(!isEditingFavorBoards)}
                    className="text-xs text-amber-600 dark:text-amber-400 font-medium"
                  >
                    {isEditingFavorBoards ? '完成' : '编辑'}
                  </button>
                )}
              </div>
              
              {loading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                </div>
              ) : error ? (
                <div className="text-sm text-red-500 px-1 mb-4">
                  {error.includes("访客不能直接访问") || error.includes("未登录") ? (
                    <span>请先<Link to="/profile" className="underline text-amber-600">登录</Link>以查看收藏的板块</span>
                  ) : (
                    <span>加载失败: {error}</span>
                  )}
                </div>
              ) : favorBoards.length > 0 ? (
                <div className="space-y-3">
                  {isEditingFavorBoards ? (
                <SortableList
                  items={favorBoards}
                  onReorder={handleReorderFavorBoards}
                  droppableId="favor-boards"
                  direction="vertical"
                  className="space-y-2"
                  keyExtractor={(b) => b.id}
                  renderItem={(board, index, dragHandleProps) => (
                    <div className="flex items-center p-3 bg-[#FFF9E6] dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                      <div {...dragHandleProps} className="mr-3 text-gray-400 cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className="w-10 h-10 flex items-center justify-center bg-[#FFFDF5] dark:bg-zinc-700 rounded-lg shadow-sm text-xl mr-3">
                        {board.icon || "📌"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {board.name}
                        </h3>
                      </div>
                    </div>
                  )}
                />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(showAllFavs ? favorBoards : favorBoards.slice(0, 10)).map((board) => (
                    <Link
                      key={board.id}
                      to={`/board/${board.id}`}
                      className="flex items-center p-3 bg-[#FFF9E6] dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 hover:shadow-sm transition-all active:scale-95"
                    >
                      <div className="w-10 h-10 flex items-center justify-center bg-[#FFFDF5] dark:bg-zinc-700 rounded-lg shadow-sm text-xl mr-3">
                        {board.icon || "📌"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {board.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {board.description || "收藏板块"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              {favorBoards.length > 10 && !isEditingFavorBoards && (
                <button
                  onClick={() => setShowAllFavs(!showAllFavs)}
                  className="w-full py-2 text-sm text-amber-600 dark:text-amber-400 font-medium bg-[#FFF9E6] dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 hover:bg-[#FDF4D4] dark:hover:bg-zinc-700 transition-colors"
                >
                  {showAllFavs ? "收起" : `展开全部 (${favorBoards.length})`}
                </button>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 px-1 mb-4">暂无收藏的板块</div>
          )}
        </section>

        <section>
          <div className="flex justify-between items-center px-1 mb-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              热门板块
            </h2>
            <button 
              onClick={() => setIsEditingHotBoards(!isEditingHotBoards)}
              className="text-xs text-amber-600 dark:text-amber-400 font-medium"
            >
              {isEditingHotBoards ? '完成' : '编辑'}
            </button>
          </div>
          <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
            {isEditingHotBoards ? (
              <SortableList
                items={hotBoards}
                onReorder={handleReorderHotBoards}
                droppableId="hot-boards"
                direction="vertical"
                keyExtractor={(b) => b.id}
                renderItem={(board, index, dragHandleProps) => (
                  <div className="flex items-center p-4 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 last:border-0">
                    <div {...dragHandleProps} className="mr-3 text-gray-400 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md text-lg mr-3">
                      {board.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-medium">{board.name}</h3>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingBoard(board);
                        setShowEditModal(true);
                      }}
                      className="p-2 mr-1 text-gray-400 hover:text-amber-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteHotBoard(board.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              />
            ) : (
              hotBoards.map((board) => (
                <Link
                  key={`hot-${board.id}`}
                  to={`/board/${board.id}`}
                  className="flex items-center p-4 hover:bg-[#FFF9E6] dark:hover:bg-zinc-800/50 transition-colors active:bg-[#FDF4D4] dark:active:bg-zinc-800"
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md text-lg mr-3">
                    {board.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium">{board.name}</h3>
                  </div>
                  <button 
                    onClick={(e) => handleToggleFavor(e, board.id, isBoardFavorited(board.id))}
                    className="p-2 mr-2 rounded-full hover:bg-[#FDF4D4] dark:hover:bg-zinc-700 transition-colors"
                  >
                    {toggling === board.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : (
                      <Star className={`w-5 h-5 ${isBoardFavorited(board.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                    )}
                  </button>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))
            )}
            {isEditingHotBoards && (
              <button
                onClick={() => {
                  setEditingBoard(null);
                  setShowEditModal(true);
                }}
                className="w-full flex items-center justify-center p-4 text-amber-600 dark:text-amber-400 hover:bg-[#FFF9E6] dark:hover:bg-zinc-800/50 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                添加热门板块
              </button>
            )}
          </div>
        </section>
          </>
        )}
      </div>

      {showEditModal && (
        <HotBoardEditModal
          board={editingBoard || undefined}
          onSave={handleSaveHotBoard}
          onClose={() => {
            setShowEditModal(false);
            setEditingBoard(null);
          }}
        />
      )}
    </div>
  );
}
