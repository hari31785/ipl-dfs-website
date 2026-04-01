'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Trophy, BarChart3, Users, Coins } from 'lucide-react';

const TABS = [
  { href: '/admin/dashboard',    icon: LayoutDashboard, label: 'Home'     },
  { href: '/admin/contests',     icon: Trophy,          label: 'Contests' },
  { href: '/admin/stats',        icon: BarChart3,       label: 'Stats'    },
  { href: '/admin/users',        icon: Users,           label: 'Users'    },
  { href: '/admin/vc-management',icon: Coins,           label: 'VC'       },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = pathname !== '/admin/login';

  return (
    <div className={showNav ? 'pb-16 md:pb-0' : ''}>
      {children}

      {showNav && (
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] md:hidden">
          <div className="grid grid-cols-5 h-16">
            {TABS.map(({ href, icon: Icon, label }) => {
              const active =
                pathname === href ||
                (href !== '/admin/dashboard' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    active ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  {active && (
                    <span className="absolute top-0 inset-x-3 h-0.5 bg-red-500 rounded-b-full" />
                  )}
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
