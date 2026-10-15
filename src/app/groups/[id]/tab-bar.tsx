"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Settings, Users } from "lucide-react";

/** Group sections. Bottom bar on the phone, a row under the masthead on wider screens. */
export function TabBar({ groupId, canManage }: { groupId: string; canManage: boolean }) {
  const path = usePathname();
  const base = `/groups/${groupId}`;
  const tabs = [
    { href: base, label: "Home", icon: House, active: path === base },
    { href: `${base}/matches`, label: "Matches", icon: CalendarDays, active: path.startsWith(`${base}/matches`) },
    { href: `${base}/players`, label: "Players", icon: Users, active: path.startsWith(`${base}/players`) },
    ...(canManage
      ? [{ href: `${base}/settings`, label: "Group", icon: Settings, active: path.startsWith(`${base}/settings`) }]
      : []),
  ];

  return (
    <nav
      aria-label="Group"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-ink pb-[env(safe-area-inset-bottom)] md:static md:border-b-2 md:border-t-0 md:bg-paper md:pb-0"
    >
      <ul className="mx-auto flex max-w-3xl md:gap-1 md:px-6">
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <li key={href} className="flex-1 md:flex-none">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 border-t-4 font-display text-sm font-bold uppercase tracking-wide transition-colors duration-150 md:min-h-11 md:flex-row md:gap-2 md:border-b-4 md:border-t-0 md:px-4 md:text-base ${
                active
                  ? "border-red text-white md:text-ink"
                  : "border-transparent text-paper/70 hover:text-white md:text-ink-soft md:hover:text-ink"
              }`}
            >
              <Icon className="size-5" strokeWidth={2.25} aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
