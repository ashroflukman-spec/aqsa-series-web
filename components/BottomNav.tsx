"use client";

import { Home, BookOpen, Heart, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const items = [
    {
      label: "Home",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      label: "Library",
      icon: BookOpen,
      href: "/library",
      active: pathname === "/library",
    },
    {
      label: "Favorites",
      icon: Heart,
      href: "/favorites",
      active: pathname === "/favorites",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
      active: pathname === "/settings",
    },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4 pb-5">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#14161b]/90 shadow-2xl backdrop-blur-xl">
        <div className="flex items-stretch">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className={`relative flex-1 py-4 flex flex-col items-center justify-center transition ${
                  item.active ? "text-white" : "text-gray-400"
                }`}
              >
                {item.active && (
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-900" />
                )}

                <div className="relative z-10 flex flex-col items-center">
                  <Icon size={22} strokeWidth={2.5} />
                  <span className="mt-1 text-[11px] font-medium">
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}