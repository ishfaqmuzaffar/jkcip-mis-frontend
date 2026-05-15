"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import {
  LayoutDashboard,
  ListTree,
  BarChart3,
  FolderOpen,
  Briefcase,
  Users,
  CheckSquare,
  UserCog,
  Leaf,
  LogOut,
  ChevronRight,
  Database,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/logframe", label: "Logframe Monitor", icon: ListTree },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/components", label: "Components & Schemes", icon: Layers },
  { href: "/schemes", label: "Schemes", icon: FolderOpen },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/beneficiaries", label: "Beneficiaries", icon: Users },
  { href: "/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/users", label: "User Management", icon: UserCog, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className="flex flex-col w-64 min-h-screen shadow-sidebar fixed left-0 top-0 bottom-0 z-30"
      style={{ background: "var(--sidebar-bg)" }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm font-display leading-tight">JKCIP MIS</p>
            <p className="text-white/50 text-[10px] leading-tight mt-0.5">Govt. of Jammu & Kashmir</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Main section */}
        <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
          Main Menu
        </p>
        {visibleItems.slice(0, 3).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="border-t border-white/10 my-3" />
        <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
          Data Management
        </p>
        {visibleItems.slice(3, 7).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {isAdmin && (
          <>
            <div className="border-t border-white/10 my-3" />
            <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
              Administration
            </p>
            {visibleItems.slice(7).map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {user?.fullName?.charAt(0)?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white/90 text-xs font-medium truncate">{user?.fullName ?? "User"}</p>
            <p className="text-white/40 text-[10px] truncate">
              {user?.role?.replace(/_/g, " ") ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/10 text-xs font-medium transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      className={cn(
        "sidebar-item",
        isActive && "active"
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
    </Link>
  );
}
