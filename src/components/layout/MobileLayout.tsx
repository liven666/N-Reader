import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

export default function MobileLayout() {
  return (
    <div className="flex flex-col h-screen bg-[#FDF4D4] dark:bg-zinc-950 text-[#333333] dark:text-gray-100 overflow-hidden font-sans">
      <main className="flex-1 overflow-y-auto pb-16 w-full max-w-md mx-auto relative shadow-xl bg-[#FFFCEF] dark:bg-zinc-900">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
