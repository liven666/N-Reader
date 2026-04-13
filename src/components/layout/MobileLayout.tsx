import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";

export default function MobileLayout() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // 初始检查
    const checkNetwork = async () => {
      try {
        const status = await Network.getStatus();
        setIsOffline(!status.connected);
      } catch (e) {
        // Non-capacitor environment fallback or error
      }
    };
    checkNetwork();

    // 监听网络状态变化
    const listener = Network.addListener('networkStatusChange', status => {
      setIsOffline(!status.connected);
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#FDF4D4] dark:bg-zinc-950 text-[#333333] dark:text-gray-100 overflow-hidden font-sans">
      {isOffline && (
        <div className="bg-red-500 text-white text-center py-1.5 text-xs font-medium z-50 animate-in fade-in slide-in-from-top-4">
          网络连接已断开，请检查您的网络设置
        </div>
      )}
      <main className="flex-1 overflow-y-auto pb-16 w-full max-w-md mx-auto relative shadow-xl bg-[#FFFCEF] dark:bg-zinc-900">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
