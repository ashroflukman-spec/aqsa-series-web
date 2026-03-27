"use client";

import { usePathname, useRouter } from "next/navigation";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      xmlns="http://www.w3.org/2000/svg"
      className={active ? "text-white" : "text-gray-300"}
    >
      <path
        d="M4 10.5L12 4L20 10.5V19C20 19.5523 19.5523 20 19 20H15C14.4477 20 14 19.5523 14 19V15C14 14.4477 13.5523 14 13 14H11C10.4477 14 10 14.4477 10 15V19C10 19.5523 9.55228 20 9 20H5C4.44772 20 4 19.5523 4 19V10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LibraryIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      xmlns="http://www.w3.org/2000/svg"
      className={active ? "text-white" : "text-gray-300"}
    >
      <path
        d="M5 5.5C5 4.67157 5.67157 4 6.5 4H18C18.5523 4 19 4.44772 19 5V17.5C19 18.3284 18.3284 19 17.5 19H7C5.89543 19 5 18.1046 5 17V5.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M7 4.5V17C7 17.5523 7.44772 18 8 18H19"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      xmlns="http://www.w3.org/2000/svg"
      className={active ? "text-white" : "text-gray-300"}
    >
      <path
        d="M12 20C12 20 4 15.36 4 9.5C4 6.46243 6.46243 4 9.5 4C11.1569 4 12.6429 4.77339 13.6 5.98163C14.5571 4.77339 16.0431 4 17.7 4C20.7376 4 23.2 6.46243 23.2 9.5C23.2 15.36 15.2 20 15.2 20H12Z"
        transform="translate(-1.6 0)"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={active ? "text-white" : "text-gray-300"}
    >
      <path
        d="M12 8.8C10.2327 8.8 8.8 10.2327 8.8 12C8.8 13.7673 10.2327 15.2 12 15.2C13.7673 15.2 15.2 13.7673 15.2 12C15.2 10.2327 13.7673 8.8 12 8.8Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 13.1V10.9L17.61 10.29C17.46 9.82 17.27 9.37 17.03 8.95L17.85 7.25L16.29 5.69L14.59 6.51C14.17 6.27 13.72 6.08 13.25 5.93L12.64 4.14H10.44L9.83 5.93C9.36 6.08 8.91 6.27 8.49 6.51L6.79 5.69L5.23 7.25L6.05 8.95C5.81 9.37 5.62 9.82 5.47 10.29L3.68 10.9V13.1L5.47 13.71C5.62 14.18 5.81 14.63 6.05 15.05L5.23 16.75L6.79 18.31L8.49 17.49C8.91 17.73 9.36 17.92 9.83 18.07L10.44 19.86H12.64L13.25 18.07C13.72 17.92 14.17 17.73 14.59 17.49L16.29 18.31L17.85 16.75L17.03 15.05C17.27 14.63 17.46 14.18 17.61 13.71L19.4 13.1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type NavItem = {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
  icon: (active: boolean) => React.ReactNode;
};

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const hiddenOnRoutes = [
    "/admin",
    "/admin/login",
    "/admin/speakers",
    "/admin/series",
    "/admin/episodes",
    "/admin/trash",
  ];

  if (hiddenOnRoutes.some((route) => pathname.startsWith(route))) {
    return null;
  }

  const items: NavItem[] = [
    {
      label: "Home",
      href: "/",
      match: (p) => p === "/",
      icon: (active) => <HomeIcon active={active} />,
    },
    {
      label: "Library",
      href: "/library",
      match: (p) => p.startsWith("/library") || p.startsWith("/series"),
      icon: (active) => <LibraryIcon active={active} />,
    },
    {
      label: "Favorites",
      href: "/favorites",
      match: (p) => p.startsWith("/favorites") || p.startsWith("/player"),
      icon: (active) => <HeartIcon active={active} />,
    },
    {
      label: "Settings",
      href: "/settings",
      match: (p) => p.startsWith("/settings"),
      icon: (active) => <SettingsIcon active={active} />,
    },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 px-2">
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#131722]/80 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 left-6 h-16 w-16 rounded-full bg-white/8 blur-2xl" />
          <div className="absolute top-0 right-0 h-16 w-24 bg-gradient-to-bl from-white/10 to-transparent blur-xl" />
        </div>

        <div className="relative grid grid-cols-4 gap-2 p-2">
          {items.map((item) => {
            const active = item.match(pathname);

            return (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className={`relative flex flex-col items-center justify-center rounded-[22px] px-2 py-3 transition duration-200 ${
                  active
                    ? "bg-gradient-to-b from-[#a01f34] to-[#7A1F2B] text-white shadow-[0_10px_24px_rgba(122,31,43,0.45)]"
                    : "text-gray-300 hover:bg-white/[0.04]"
                }`}
              >
                {active && (
                  <div className="absolute inset-0 rounded-[22px] ring-1 ring-white/10" />
                )}

                <div className="relative flex h-7 items-center justify-center">
                  {item.icon(active)}
                </div>

                <span
                  className={`relative mt-1 text-[12px] font-medium ${
                    active ? "text-white" : "text-gray-300"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}