import { Home, MessageSquare, Bell, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

export default function BottomNav() {
  const navItems = [
    { icon: Home, label: "板块", path: "/" },
    { icon: MessageSquare, label: "关注", path: "/following" },
    { icon: Bell, label: "消息", path: "/messages" },
    { icon: User, label: "我的", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#FFFCEF] dark:bg-zinc-900 border-t border-[#F0E6D2] dark:border-zinc-800 z-50 flex justify-around items-center w-full max-w-md mx-auto pb-safe">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
              isActive
                ? "text-amber-600 dark:text-amber-400"
                : "text-gray-500 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-300"
            )
          }
        >
          <item.icon className="w-6 h-6" />
          <span className="text-[10px] font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
