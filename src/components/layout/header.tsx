"use client";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Bell, HelpCircle, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Project overview and key performance indicators" },
  "/logframe": { title: "Logframe Monitor", subtitle: "Track indicators against targets across all outcomes" },
  "/analytics": { title: "Analytics", subtitle: "Trends, breakdowns, and comparative analysis" },
  "/schemes": { title: "Schemes", subtitle: "Government scheme management and tracking" },
  "/projects": { title: "Projects", subtitle: "Field project implementation and monitoring" },
  "/beneficiaries": { title: "Beneficiaries", subtitle: "Farmer and household beneficiary records" },
  "/approvals": { title: "Approvals", subtitle: "Pending and completed approval workflows" },
  "/users": { title: "User Management", subtitle: "System users and role-based access control" },
};

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pageInfo = PAGE_TITLES[pathname] ?? { title: "JKCIP MIS", subtitle: "" };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 font-display leading-tight">
          {pageInfo.title}
        </h1>
        {pageInfo.subtitle && (
          <p className="text-xs text-slate-500 leading-tight hidden sm:block">{pageInfo.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 hidden md:block">{today}</span>

        <button
          onClick={() => queryClient.invalidateQueries()}
          title="Refresh data"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">
              {user?.fullName?.charAt(0)?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.fullName}</p>
            <p className="text-[10px] text-slate-500 leading-tight">
              {user?.role?.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
