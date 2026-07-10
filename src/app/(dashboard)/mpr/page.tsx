"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw, CheckCircle2, AlertCircle, Clock, Play,
  X, ChevronDown, ChevronRight, GitMerge, Database,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";

// ─── API calls ─────────────────────────────────────────────────────────────────
const mprApi = {
  getStatus:     () => api.get("/mpr/status").then(r => r.data),
  getDepts:      () => api.get("/mpr/departments").then(r => r.data),
  fetchAll:      () => api.post("/mpr/fetch").then(r => r.data),
  fetchDept:     (dept: string, tab?: string) => api.post(`/mpr/fetch/${dept}`, { tab }).then(r => r.data),
  getConflicts:  (resolved = false) => api.get(`/mpr/conflicts?resolved=${resolved}`).then(r => r.data),
  resolve:       (id: number, body: any) => api.patch(`/mpr/conflicts/${id}/resolve`, body).then(r => r.data),
};

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: "text-green-600 bg-green-50",
  PARTIAL: "text-amber-600 bg-amber-50",
  FAILED:  "text-red-600 bg-red-50",
};

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function MprPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const [tab, setTab] = useState<"status" | "conflicts">("status");

  const { data: status, isLoading: loadingStatus } = useQuery({
    queryKey: ["mpr-status"],
    queryFn: mprApi.getStatus,
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const { data: depts = [] } = useQuery({
    queryKey: ["mpr-depts"],
    queryFn: mprApi.getDepts,
  });

  const { data: conflicts = [], isLoading: loadingConflicts } = useQuery({
    queryKey: ["mpr-conflicts"],
    queryFn: () => mprApi.getConflicts(false),
    enabled: tab === "conflicts",
  });

  const fetchAllMut = useMutation({
    mutationFn: mprApi.fetchAll,
    onSuccess: (results: any[]) => {
      const ok = results.filter(r => r.status === "SUCCESS").length;
      const fail = results.filter(r => r.status === "FAILED").length;
      toast.success(`Fetched ${ok} departments. ${fail ? `${fail} failed.` : ""}`);
      qc.invalidateQueries({ queryKey: ["mpr-status"] });
      qc.invalidateQueries({ queryKey: ["mpr-conflicts"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const fetchDeptMut = useMutation({
    mutationFn: ({ dept, tab }: { dept: string; tab?: string }) => mprApi.fetchDept(dept, tab),
    onSuccess: (r: any) => {
      toast.success(`${r.department}: ${r.rowsMapped} indicators updated`);
      qc.invalidateQueries({ queryKey: ["mpr-status"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const pendingConflicts = status?.pendingConflicts ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">MPR Auto-fetch</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pulls physical achievement data from 13 department Google Sheets monthly
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => fetchAllMut.mutate()}
            disabled={fetchAllMut.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", fetchAllMut.isPending && "animate-spin")} />
            {fetchAllMut.isPending ? "Fetching all…" : "Fetch all now"}
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Departments</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{depts.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">configured</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Last fetch</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {status?.lastFetchByDept?.length ?? 0}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">departments fetched</p>
        </div>
        <div className={cn("rounded-xl border p-4", pendingConflicts > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200")}>
          <p className={cn("text-xs", pendingConflicts > 0 ? "text-amber-600" : "text-slate-500")}>Pending conflicts</p>
          <p className={cn("text-2xl font-bold mt-1", pendingConflicts > 0 ? "text-amber-700" : "text-slate-800")}>
            {pendingConflicts}
          </p>
          <p className={cn("text-xs mt-0.5", pendingConflicts > 0 ? "text-amber-500" : "text-slate-400")}>
            {pendingConflicts > 0 ? "need PMU review" : "all clear"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Schedule</p>
          <p className="text-lg font-bold text-slate-800 mt-1">1st of month</p>
          <p className="text-xs text-slate-400 mt-0.5">auto-runs at 2:00 AM</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { key: "status",    label: "Department status" },
          { key: "conflicts", label: `Conflicts${pendingConflicts > 0 ? ` (${pendingConflicts})` : ""}` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition",
              tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status tab */}
      {tab === "status" && (
        <DeptStatusTable
          depts={depts}
          lastFetchByDept={status?.lastFetchByDept ?? []}
          recentLogs={status?.recentLogs ?? []}
          isAdmin={isAdmin}
          onFetchDept={(dept, tab) => fetchDeptMut.mutate({ dept, tab })}
          loading={loadingStatus || fetchDeptMut.isPending}
        />
      )}

      {/* Conflicts tab */}
      {tab === "conflicts" && (
        <ConflictsPanel
          conflicts={conflicts}
          isAdmin={isAdmin}
          loading={loadingConflicts}
        />
      )}
    </div>
  );
}

// ─── Department status table ───────────────────────────────────────────────────
function DeptStatusTable({ depts, lastFetchByDept, recentLogs, isAdmin, onFetchDept, loading }: any) {
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  // Build a map of dept → latest log
  const latestByDept: Record<string, any> = {};
  for (const log of lastFetchByDept) latestByDept[log.department] = log;

  return (
    <div className="space-y-3">
      {depts.map((dept: any) => {
        const latest = latestByDept[dept.code];
        const expanded = expandedDept === dept.code;
        const deptLogs = recentLogs.filter((l: any) => l.department === dept.code);

        return (
          <div key={dept.code} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/50"
              onClick={() => setExpandedDept(expanded ? null : dept.code)}
            >
              {/* Status indicator */}
              <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0",
                !latest ? "bg-slate-300" :
                latest.status === "SUCCESS" ? "bg-green-500" :
                latest.status === "PARTIAL"  ? "bg-amber-400" : "bg-red-500"
              )} />

              {/* Dept info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 text-sm">{dept.code}</span>
                  <span className="text-xs text-slate-400">—</span>
                  <span className="text-sm text-slate-500 truncate">{dept.name}</span>
                </div>
                {latest && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Last: {latest.tabName} · {latest.rowsMapped} indicators · {formatDate(latest.createdAt)}
                  </p>
                )}
                {!latest && <p className="text-xs text-slate-400 mt-0.5">Never fetched</p>}
              </div>

              {/* Stats */}
              {latest && (
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Mapped</p>
                    <p className="text-sm font-semibold text-slate-700">{latest.rowsMapped}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Conflicts</p>
                    <p className={cn("text-sm font-semibold", latest.conflictsFound > 0 ? "text-amber-600" : "text-slate-700")}>
                      {latest.conflictsFound}
                    </p>
                  </div>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_COLOR[latest.status] ?? "text-slate-500 bg-slate-100")}>
                    {latest.status}
                  </span>
                </div>
              )}

              {/* Manual fetch button */}
              {isAdmin && (
                <button
                  onClick={e => { e.stopPropagation(); onFetchDept(dept.code); }}
                  disabled={loading}
                  className="btn-secondary text-xs flex items-center gap-1.5 flex-shrink-0"
                >
                  <Play className="w-3 h-3" /> Fetch
                </button>
              )}

              {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
            </div>

            {/* Expanded: recent logs + tab selector */}
            {expanded && (
              <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                {/* Tab selector for manual fetch */}
                {isAdmin && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500">Fetch specific month:</span>
                    {dept.tabs.map((t: string) => (
                      <button
                        key={t}
                        onClick={() => onFetchDept(dept.code, t)}
                        disabled={loading}
                        className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 transition"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                {/* Recent logs */}
                {deptLogs.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Recent fetches</p>
                    <div className="space-y-1">
                      {deptLogs.slice(0, 5).map((log: any) => (
                        <div key={log.id} className="flex items-center gap-3 text-xs text-slate-500">
                          <span className={cn("px-1.5 py-0.5 rounded text-xs", STATUS_COLOR[log.status] ?? "")}>{log.status}</span>
                          <span className="font-medium text-slate-600">{log.tabName}</span>
                          <span>{log.rowsMapped} mapped · {log.rowsSkipped} skipped · {log.conflictsFound} conflicts</span>
                          <span className="ml-auto text-slate-400">{formatDate(log.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {latest?.errorMessage && (
                  <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {latest.errorMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Conflicts panel ───────────────────────────────────────────────────────────
function ConflictsPanel({ conflicts, isAdmin, loading }: any) {
  const qc = useQueryClient();
  const [resolving, setResolving] = useState<number | null>(null);

  const resolveMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => mprApi.resolve(id, body),
    onSuccess: () => {
      toast.success("Conflict resolved");
      qc.invalidateQueries({ queryKey: ["mpr-conflicts"] });
      qc.invalidateQueries({ queryKey: ["mpr-status"] });
      setResolving(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (loading) return <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Loading…</div>;

  if (conflicts.length === 0) return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
      <p className="text-slate-600 font-medium">No pending conflicts</p>
      <p className="text-slate-400 text-sm mt-1">All MPR values match the MIS — no review needed</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        These indicators have different values in the MPR sheet vs what's already in the MIS.
        Review each one and choose which value to keep.
      </p>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {["Dept", "Activity", "Indicator", "MPR value", "MIS value", "Month", "Action"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conflicts.map((c: any) => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{c.department}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs font-medium text-slate-700">{c.activityCode}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{c.activityName?.slice(0, 40)}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{c.indicatorCode}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-brand-700">{c.mprValue} <span className="text-xs font-normal text-slate-400">{c.unit}</span></span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-slate-700">{c.misValue} <span className="text-xs font-normal text-slate-400">{c.unit}</span></span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{c.reportMonth}</td>
                <td className="px-4 py-3">
                  {isAdmin && (
                    resolving === c.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => resolveMut.mutate({ id: c.id, body: { resolution: "mpr" } })}
                          className="text-xs px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700"
                        >
                          Use MPR ({c.mprValue})
                        </button>
                        <button
                          onClick={() => resolveMut.mutate({ id: c.id, body: { resolution: "mis" } })}
                          className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                        >
                          Keep MIS ({c.misValue})
                        </button>
                        <button onClick={() => setResolving(null)} className="p-1 text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setResolving(c.id)}
                        className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1"
                      >
                        <GitMerge className="w-3.5 h-3.5" /> Resolve
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
