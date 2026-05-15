import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  ApprovalStatus,
  BeneficiaryStatus,
  LogframeLevel,
  PriorityLevel,
  ProjectStatus,
  SchemeStatus,
  UserRole,
} from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatNumber(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function getSchemeStatusMeta(status: SchemeStatus) {
  const map = {
    DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700" },
    ACTIVE: { label: "Active", color: "bg-green-100 text-green-700" },
    CLOSED: { label: "Closed", color: "bg-red-100 text-red-700" },
  };
  return map[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
}

export function getProjectStatusMeta(status: ProjectStatus) {
  const map = {
    PLANNED: { label: "Planned", color: "bg-blue-100 text-blue-700" },
    ONGOING: { label: "Ongoing", color: "bg-green-100 text-green-700" },
    COMPLETED: { label: "Completed", color: "bg-purple-100 text-purple-700" },
    ON_HOLD: { label: "On Hold", color: "bg-amber-100 text-amber-700" },
  };
  return map[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
}

export function getBeneficiaryStatusMeta(status: BeneficiaryStatus) {
  const map = {
    IDENTIFIED: { label: "Identified", color: "bg-slate-100 text-slate-700" },
    VERIFIED: { label: "Verified", color: "bg-blue-100 text-blue-700" },
    APPROVED: { label: "Approved", color: "bg-green-100 text-green-700" },
    SUPPORTED: { label: "Supported", color: "bg-purple-100 text-purple-700" },
  };
  return map[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
}

export function getApprovalStatusMeta(status: ApprovalStatus) {
  const map = {
    PENDING: { label: "Pending", color: "bg-amber-100 text-amber-700" },
    APPROVED: { label: "Approved", color: "bg-green-100 text-green-700" },
    REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700" },
    RETURNED: { label: "Returned", color: "bg-slate-100 text-slate-700" },
  };
  return map[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
}

export function getPriorityMeta(priority: PriorityLevel) {
  const map = {
    LOW: { label: "Low", color: "bg-slate-100 text-slate-600" },
    MEDIUM: { label: "Medium", color: "bg-blue-100 text-blue-700" },
    HIGH: { label: "High", color: "bg-amber-100 text-amber-700" },
    CRITICAL: { label: "Critical", color: "bg-red-100 text-red-700" },
  };
  return map[priority] ?? { label: priority, color: "bg-gray-100 text-gray-700" };
}

export function getRoleMeta(role: UserRole) {
  const map = {
    SUPER_ADMIN: { label: "Super Admin", color: "bg-purple-100 text-purple-700" },
    ADMIN: { label: "Admin", color: "bg-brand-100 text-brand-700" },
    DEPARTMENT_OFFICER: { label: "Dept. Officer", color: "bg-blue-100 text-blue-700" },
    DATA_ENTRY: { label: "Data Entry", color: "bg-slate-100 text-slate-700" },
    VIEWER: { label: "Viewer", color: "bg-gray-100 text-gray-600" },
  };
  return map[role] ?? { label: role, color: "bg-gray-100 text-gray-700" };
}

export function getLogframeLevelMeta(level: LogframeLevel) {
  const map: Record<LogframeLevel, { label: string; color: string; indent: number }> = {
    OUTREACH: { label: "Outreach", color: "bg-purple-100 text-purple-700", indent: 0 },
    GOAL: { label: "Goal", color: "bg-brand-100 text-brand-800", indent: 0 },
    DEVELOPMENT_OBJECTIVE: { label: "Dev. Objective", color: "bg-blue-100 text-blue-800", indent: 0 },
    OUTCOME: { label: "Outcome", color: "bg-saffron-100 text-saffron-800", indent: 1 },
    OUTPUT: { label: "Output", color: "bg-green-100 text-green-700", indent: 2 },
    SUB_OUTPUT: { label: "Sub-Output", color: "bg-teal-100 text-teal-700", indent: 3 },
    INDICATOR_GROUP: { label: "Indicator Group", color: "bg-slate-100 text-slate-600", indent: 4 },
  };
  return map[level] ?? { label: level, color: "bg-gray-100 text-gray-700", indent: 0 };
}

export function progressColor(pct: number): string {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 75) return "bg-brand-500";
  if (pct >= 50) return "bg-saffron-500";
  if (pct >= 25) return "bg-amber-400";
  return "bg-red-400";
}

export function budgetUtilization(utilized: number, total: number): number {
  if (!total || total === 0) return 0;
  return Math.min((utilized / total) * 100, 100);
}

export const DISTRICTS_JK = [
  "Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal",
  "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch",
  "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian",
  "Srinagar", "Udhampur"
];

export const CURRENT_YEAR = new Date().getFullYear();
export const PROJECT_YEARS = Array.from(
  { length: CURRENT_YEAR - 2023 + 2 },
  (_, i) => 2024 + i
);
