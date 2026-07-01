import { useState, useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { Settings, Type, AlignLeft, Trash2, Moon, ShieldCheck, ChevronRight, KeyRound, CheckCircle2, CalendarDays, Loader2 } from "lucide-react";
import nReaderLogo from "../assets/n-reader-logo.png";
import { appInfo } from "../config/appInfo";
import { canUseNativeNgaTransport } from "../services/ngaNative";
import { CheckInResult, checkIn, clearNgaRuntimeCache, getCheckInStatus } from "../services/ngaApi";
import { clearNgaCredentials, isNgaAuthVerified, normalizeNgaCredentials, saveNgaCredentials, setNgaAuthVerified } from "../services/ngaCredentials";

export default function Profile() {
  const { fontSize, setFontSize, lineHeight, setLineHeight } = useSettings();
  const isNativeApp = canUseNativeNgaTransport();
  
  const [uid, setUid] = useState("");
  const [cid, setCid] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<CheckInResult | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [loadingCheckInStatus, setLoadingCheckInStatus] = useState(false);

  useEffect(() => {
    const saved = normalizeNgaCredentials(
      localStorage.getItem("nreader_uid"),
      localStorage.getItem("nreader_cid")
    );
    if (saved.uid && saved.cid) {
      setUid(saved.uid);
      setCid(saved.cid);
      setIsLoggedIn(isNgaAuthVerified());
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      void refreshCheckInStatus(false);
    } else {
      setCheckInStatus(null);
    }
  }, [isLoggedIn]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleLogin = () => {
    const credentials = normalizeNgaCredentials(uid, cid);
    if (credentials.uid && credentials.cid) {
      saveNgaCredentials(credentials);
      setUid(credentials.uid);
      setCid(credentials.cid);
      clearNgaRuntimeCache();
      setIsLoggedIn(true);
      setNgaAuthVerified(true);
      showMessage("登录凭证已保存", "success");
    } else {
      showMessage("请填写完整的 UID 和 CID", "error");
    }
  };

  const handleLogout = () => {
    clearNgaCredentials();
    clearNgaRuntimeCache();
    setUid("");
    setCid("");
    setIsLoggedIn(false);
    setCheckInStatus(null);
    showMessage("已退出登录", "success");
  };

  const refreshCheckInStatus = async (withToast = true) => {
    if (!isLoggedIn) return;
    setLoadingCheckInStatus(true);
    try {
      const status = await getCheckInStatus();
      setCheckInStatus(status);
      if (withToast) showMessage(status.message || "签到状态已同步", status.checked ? "success" : "error");
    } catch (err: any) {
      if (withToast) showMessage(err.message || "签到状态获取失败", "error");
    } finally {
      setLoadingCheckInStatus(false);
    }
  };

  const handleCheckIn = async () => {
    if (!isLoggedIn || checkingIn) return;
    if (checkInStatus?.checked) {
      showMessage("今日已签到", "success");
      return;
    }

    setCheckingIn(true);
    try {
      const result = await checkIn();
      setCheckInStatus(result);
      showMessage(result.checked ? (result.message || "今日已签到") : (result.message || "签到状态已同步"), result.checked ? "success" : "error");
    } catch (err: any) {
      showMessage(err.message || "签到失败", "error");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleClearCache = () => {
    clearNgaRuntimeCache();
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
          <div className="w-16 h-16 shrink-0 rounded-xl bg-[#FFF2BF] dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 p-2.5">
            <img src={nReaderLogo} alt="N-Reader" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {isLoggedIn ? `NGA 用户 (${uid})` : "NGA 访客"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isLoggedIn
                ? isNativeApp ? "安装版直连 NGA，凭证仅保存在本机" : "已连接到 NGA 代理服务"
                : "配置 UID/CID 以解锁完整功能"}
            </p>
          </div>
        </div>

        {/* Login Settings */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4" /> 账号配置 (UID/CID 登录)
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
                  {isNativeApp
                    ? "安装版会在本机直连 NGA，只保存 ngaPassportUid 和 ngaPassportCid。"
                    : "网页预览会通过本地代理访问 NGA，只使用 ngaPassportUid 和 ngaPassportCid。"}
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

        {isLoggedIn && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" /> 每日签到
            </h3>
            <div className="bg-[#FFFDF5] dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {loadingCheckInStatus ? "正在同步" : checkInStatus?.checked ? "今日已签到" : "今日签到"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {checkInStatus?.message || "发言前保持签到状态"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={checkingIn || loadingCheckInStatus}
                  className="shrink-0 min-w-24 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {checkingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  签到
                </button>
              </div>
            </div>
          </section>
        )}

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

        <footer className="border-t border-[#F0E6D2] dark:border-zinc-800 pt-6 pb-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-[#FFF2BF] dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 p-2">
              <img src={nReaderLogo} alt="N-Reader" className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{appInfo.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">v{appInfo.version} · Build {appInfo.build}</p>
            </div>
          </div>
          <p className="mt-5 text-xs font-medium text-gray-600 dark:text-gray-300">{appInfo.releaseSummary}</p>
          <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-gray-400">
            <CalendarDays className="w-3.5 h-3.5" /> {appInfo.releasedAt}
          </p>
          <p className="mt-3 text-[10px] text-gray-400">仅供学习交流使用，请遵守 NGA 社区规范</p>
        </footer>
      </div>
    </div>
  );
}
