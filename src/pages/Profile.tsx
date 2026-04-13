import { useState, useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { Settings, Type, AlignLeft, Trash2, Moon, ShieldCheck, ChevronRight, KeyRound, CheckCircle2, Globe, WifiOff } from "lucide-react";

const isCapacitor = typeof (window as any).Capacitor !== 'undefined';

export default function Profile() {
  const { fontSize, setFontSize, lineHeight, setLineHeight } = useSettings();
  
  const [uid, setUid] = useState("");
  const [cid, setCid] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const savedUid = localStorage.getItem("nreader_uid");
    const savedCid = localStorage.getItem("nreader_cid");
    const savedApiUrl = localStorage.getItem("nreader_api_url");
    const savedOfflineMode = localStorage.getItem("nreader_offline_mode");
    if (savedUid && savedCid) {
      setUid(savedUid);
      setCid(savedCid);
      setIsLoggedIn(true);
    }
    if (savedApiUrl) {
      setApiUrl(savedApiUrl);
    }
    if (savedOfflineMode === "true") {
      setOfflineMode(true);
    }
  }, []);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleLogin = () => {
    if (uid && cid) {
      localStorage.setItem("nreader_uid", uid);
      localStorage.setItem("nreader_cid", cid);
      setIsLoggedIn(true);
      showMessage("登录凭证已保存", "success");
    } else {
      showMessage("请填写完整的 UID 和 CID", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("nreader_uid");
    localStorage.removeItem("nreader_cid");
    setUid("");
    setCid("");
    setIsLoggedIn(false);
    showMessage("已退出登录", "success");
  };

  const handleSaveApiUrl = () => {
    if (apiUrl) {
      localStorage.setItem("nreader_api_url", apiUrl);
      showMessage("服务器地址已保存", "success");
    } else {
      localStorage.removeItem("nreader_api_url");
      showMessage("已清除服务器地址配置", "success");
    }
  };

  const handleTestConnection = async () => {
    if (!apiUrl) {
      showMessage("请先输入服务器地址", "error");
      return;
    }

    setIsTesting(true);
    
    let testUrl = apiUrl.trim();
    if (!testUrl.endsWith("/api/nga")) {
      if (testUrl.endsWith("/")) {
        testUrl = testUrl + "api/nga";
      } else {
        testUrl = testUrl + "/api/nga";
      }
    }

    try {
      const response = await fetch(testUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://bbs.nga.cn/thread.php?fid=-7&lite=js",
          method: "GET"
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log("服务器响应:", data);
        showMessage("✅ 连接成功！服务器工作正常", "success");
      } else {
        const errorText = await response.text();
        showMessage(`❌ 服务器返回错误 (${response.status}): ${errorText.substring(0, 100)}`, "error");
      }
    } catch (error) {
      showMessage(`❌ 连接失败: ${(error as Error).message}`, "error");
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleOfflineMode = () => {
    const newMode = !offlineMode;
    setOfflineMode(newMode);
    localStorage.setItem("nreader_offline_mode", newMode.toString());
    showMessage(newMode ? "已启用离线模式" : "已关闭离线模式", "success");
  };

  const handleClearCache = () => {
    localStorage.removeItem('nreader_saved_threads');
    showMessage("本地缓存已清理", "success");
  };

  return (
    <div className="flex flex-col h-full bg-[#FFF9E6] dark:bg-zinc-950">
      <header className="sticky top-0 z-10 bg-[#FFFDF5]/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 px-4 py-3">
        <h1 className="text-xl font-bold tracking-tight">我的</h1>
      </header>

      {message && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg text-sm font-medium transition-all ${
          message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* User Card */}
        <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 text-2xl font-bold">
            {isLoggedIn ? "U" : "N"}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {isLoggedIn ? `NGA 用户 (${uid})` : "NGA 访客"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isLoggedIn ? "已连接到 NGA 服务器" : "配置 Cookie 以解锁完整功能"}
            </p>
          </div>
        </div>

        {/* Server Settings (only show in Capacitor) */}
        {isCapacitor && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> 后端服务器配置
            </h3>
            <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-4">
              <div className="space-y-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  N-Reader 需要后端服务器来处理 NGA API 请求。请输入服务器地址。
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">服务器地址</label>
                  <input 
                    type="text" 
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFF9E6] dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="https://ais-pre-c46pdi4rivswi423p2fguj-104340991429.asia-northeast1.run.app/api/nga"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    💡 提示：上方占位符为示例地址，如需使用请联系服务器
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveApiUrl}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    保存
                  </button>
                  <button 
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {isTesting ? "测试中..." : "测试连接"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Login Settings */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4" /> 账号配置 (Cookie 登录)
          </h3>
          <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-4">
            {isLoggedIn ? (
              <div className="flex flex-col items-center justify-center py-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">登录凭证已生效</p>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  退出登录
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  由于 NGA 官方限制，第三方阅读器需要您手动提取浏览器中的 Cookie (ngaPassportUid 和 ngaPassportCid) 进行登录。
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ngaPassportUid (UID)</label>
                  <input 
                    type="text" 
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFF9E6] dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="输入您的 UID"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ngaPassportCid (CID)</label>
                  <input 
                    type="password" 
                    value={cid}
                    onChange={(e) => setCid(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFF9E6] dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="输入您的 CID"
                  />
                </div>
                <button 
                  onClick={handleLogin}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  保存并登录
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Reading Settings */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
            <Settings className="w-4 h-4" /> 阅读设置
          </h3>
          <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
            
            {/* Font Size */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFF9E6] dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
                  <Type className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">正文字体大小</span>
              </div>
              <div className="flex bg-[#FDF4D4] dark:bg-zinc-800 p-1 rounded-lg">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      fontSize === size 
                        ? 'bg-[#FFFDF5] dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {size === 'small' ? '小' : size === 'medium' ? '中' : '大'}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Height */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFF9E6] dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
                  <AlignLeft className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">正文行距</span>
              </div>
              <div className="flex bg-[#FDF4D4] dark:bg-zinc-800 p-1 rounded-lg">
                {(['tight', 'normal', 'loose'] as const).map((height) => (
                  <button
                    key={height}
                    onClick={() => setLineHeight(height)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      lineHeight === height 
                        ? 'bg-[#FFFDF5] dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {height === 'tight' ? '紧凑' : height === 'normal' ? '适中' : '宽松'}
                  </button>
                ))}
              </div>
            </div>

            {/* Dark Mode Hint */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFF9E6] dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
                  <Moon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">深色模式</span>
              </div>
              <span className="text-xs text-gray-400">跟随系统</span>
            </div>

          </div>
        </section>

        {/* Offline Mode */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
            <WifiOff className="w-4 h-4" /> 离线模式
          </h3>
          <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              启用离线模式后，应用将使用模拟数据，无需连接后端服务器。
            </p>
            <button 
              onClick={handleToggleOfflineMode}
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                offlineMode 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {offlineMode ? '✅ 离线模式已启用' : '🔌 启用离线模式'}
            </button>
          </div>
        </section>

        {/* System & Privacy */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> 系统与隐私
          </h3>
          <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
            <button 
              onClick={handleClearCache}
              className="w-full p-4 flex items-center justify-between hover:bg-[#FFF9E6] dark:hover:bg-zinc-800/50 transition-colors active:bg-[#FDF4D4] dark:active:bg-zinc-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">清除本地缓存</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </section>

        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-gray-400 font-mono">N-Reader v1.0.6 (2026-04-08 14:15:58)</p>
          <p className="text-[10px] text-gray-400 mt-1">仅供学习交流使用，请遵守NGA社区规范</p>
        </div>
      </div>
    </div>
  );
}
