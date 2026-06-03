"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, DISTRICTS_JK, cn } from "@/lib/utils";
import {
  Plus, ChevronRight, CheckCircle2, XCircle, CornerUpLeft,
  Clock, FileText, X, Save, Trash2, Eye, AlertCircle,
  ArrowRight, Building2, Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES = [
  { key: "DRAFT",           label: "Draft",           color: "bg-slate-100 text-slate-600",    ring: "#94a3b8" },
  { key: "PIU_REVIEW",      label: "PIU Review",      color: "bg-blue-100 text-blue-700",      ring: "#3b82f6" },
  { key: "PMU_REVIEW",      label: "PMU Review",      color: "bg-purple-100 text-purple-700",  ring: "#7c3aed" },
  { key: "IFAD_SUBMISSION", label: "IFAD Submission", color: "bg-saffron-100 text-saffron-700",ring: "#d97706" },
  { key: "IFAD_APPROVED",   label: "IFAD Approved",   color: "bg-orange-100 text-orange-700",  ring: "#ea580c" },
  { key: "DPC_APPROVED",    label: "DPC Approved",    color: "bg-teal-100 text-teal-700",      ring: "#0d9488" },
  { key: "DAP_APPROVED",    label: "DAP Approved ✓",  color: "bg-green-100 text-green-700",    ring: "#16a34a" },
] as const;

type StageKey = typeof STAGES[number]["key"] | "REJECTED" | "RETURNED";

// Who can act at each stage
const STAGE_ACTOR: Record<string, string> = {
  DRAFT: "District Officer submits",
  PIU_REVIEW: "PIU approves / returns",
  PMU_REVIEW: "PMU approves / returns",
  IFAD_SUBMISSION: "IFAD no-objection",
  IFAD_APPROVED: "DPC approval",
  DPC_APPROVED: "DAP final approval",
};

const FINANCIAL_YEARS = ["2024-25", "2025-26", "2026-27", "2027-28", "2028-29", "2029-30", "2030-31"];

export default function AWPBPage() {
  const { user } = useAuth();
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fyFilter, setFyFilter] = useState("2026-27");

  const { data: awpbs = [], isLoading } = useQuery({
    queryKey: ["awpb", fyFilter],
    queryFn: () => api.get(`/awpb?financialYear=${fyFilter}`).then(r => r.data as any[]),
  });

  const { data: summary = [] } = useQuery({
    queryKey: ["awpb-summary"],
    queryFn: () => api.get("/awpb/summary").then(r => r.data as any[]),
  });

  const totalAWPBs = awpbs.length;
  const approvedBudget = awpbs.filter((a: any) => a.status === "DAP_APPROVED")
    .reduce((s: number, a: any) => s + a.totalBudget, 0);

  return (
    <div className="space-y-4 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">Annual Work Plan & Budget</h1>
          <p className="text-xs text-slate-500 mt-0.5">7-stage approval workflow — District → PIU → PMU → IFAD → DPC → DAP</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="form-select py-1.5 text-sm w-32"
            value={fyFilter} onChange={e => setFyFilter(e.target.value)}>
            {FINANCIAL_YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5">
            {(["pipeline", "list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn("px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                  view === v ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50"
                )}>{v}</button>
            ))}
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New AWPB
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total AWPBs", value: totalAWPBs, color: "text-brand-700" },
          { label: "In Pipeline", value: awpbs.filter((a: any) => !["DRAFT", "DAP_APPROVED", "REJECTED"].includes(a.status)).length, color: "text-blue-700" },
          { label: "DAP Approved", value: awpbs.filter((a: any) => a.status === "DAP_APPROVED").length, color: "text-green-700" },
          { label: "Approved Budget", value: formatCurrency(approvedBudget), color: "text-saffron-700" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className={cn("text-xl font-bold font-display", s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline view */}
      {view === "pipeline" && !isLoading && (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {STAGES.map((stage, si) => {
              const stageAWPBs = awpbs.filter((a: any) => a.status === stage.key);
              return (
                <div key={stage.key} className="w-64 flex-shrink-0">
                  {/* Stage header */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.ring }} />
                      <span className="text-xs font-semibold text-slate-700">{stage.label}</span>
                    </div>
                    <span className="badge bg-slate-100 text-slate-600 text-[10px]">{stageAWPBs.length}</span>
                  </div>
                  {/* Stage info */}
                  {STAGE_ACTOR[stage.key] && (
                    <p className="text-[10px] text-slate-400 px-1 mb-2">{STAGE_ACTOR[stage.key]}</p>
                  )}
                  {/* Cards */}
                  <div className="space-y-2 min-h-[100px]">
                    {stageAWPBs.map((awpb: any) => (
                      <AWPBCard key={awpb.id} awpb={awpb} stage={stage}
                        onClick={() => setSelectedId(awpb.id)} />
                    ))}
                    {stageAWPBs.length === 0 && (
                      <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-[10px] text-slate-300">
                        No AWPBs
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="table-th">AWPB Title</th>
                <th className="table-th">FY</th>
                <th className="table-th">District</th>
                <th className="table-th">Department</th>
                <th className="table-th">Stage</th>
                <th className="table-th text-right">Total Budget</th>
                <th className="table-th">Created By</th>
                <th className="table-th">Lines</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="table-td"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : awpbs.length === 0 ? (
                <tr><td colSpan={9} className="table-td text-center py-10 text-slate-400">
                  No AWPBs for {fyFilter}. Click "New AWPB" to create one.
                </td></tr>
              ) : awpbs.map((awpb: any) => {
                const stage = STAGES.find(s => s.key === awpb.status);
                return (
                  <tr key={awpb.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedId(awpb.id)}>
                    <td className="table-td font-medium text-slate-800">{awpb.title}</td>
                    <td className="table-td text-xs font-mono">{awpb.financialYear}</td>
                    <td className="table-td text-xs text-slate-600">{awpb.district || "—"}</td>
                    <td className="table-td text-xs text-slate-600">{awpb.department || "—"}</td>
                    <td className="table-td">
                      <span className={cn("badge text-xs", stage?.color ?? "bg-slate-100 text-slate-600")}>
                        {stage?.label ?? awpb.status}
                      </span>
                    </td>
                    <td className="table-td text-right font-semibold text-brand-700">{formatCurrency(awpb.totalBudget)}</td>
                    <td className="table-td text-xs text-slate-500">{awpb.createdBy?.fullName ?? "—"}</td>
                    <td className="table-td text-center">
                      <span className="badge bg-slate-100 text-slate-600">{awpb._count?.lines ?? 0}</span>
                    </td>
                    <td className="table-td">
                      <button className="btn-ghost text-xs py-1">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogs */}
      {createOpen && <AWPBCreateDialog onClose={() => setCreateOpen(false)} />}
      {selectedId && <AWPBDetailDialog id={selectedId} onClose={() => setSelectedId(null)} currentUser={user} />}
    </div>
  );
}

// ─── AWPB Card (pipeline) ─────────────────────────────────────────────────────
function AWPBCard({ awpb, stage, onClick }: { awpb: any; stage: typeof STAGES[number]; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl p-3 cursor-pointer hover:border-brand-300 hover:shadow-sm transition-all">
      <p className="text-xs font-semibold text-slate-800 leading-tight mb-1.5 line-clamp-2">{awpb.title}</p>
      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
        <span>{awpb.financialYear}</span>
        <span>{awpb.district || "All Districts"}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-brand-700">{formatCurrency(awpb.totalBudget)}</span>
        <span className="text-[10px] text-slate-400">{awpb._count?.lines ?? 0} lines</span>
      </div>
      {awpb.department && (
        <p className="text-[10px] text-slate-400 mt-1 truncate">{awpb.department}</p>
      )}
    </div>
  );
}

// ─── Create Dialog ────────────────────────────────────────────────────────────
function AWPBCreateDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    financialYear: "2026-27",
    district: "",
    department: "",
    remarks: "",
  });

  const mutation = useMutation({
    mutationFn: () => api.post("/awpb", form).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["awpb"] });
      toast.success("AWPB created");
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">New AWPB</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">AWPB Title *</label>
            <input className="form-input" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Component 1 AWPB 2026-27 — Srinagar District" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Financial Year *</label>
              <select className="form-select" value={form.financialYear}
                onChange={e => setForm({ ...form, financialYear: e.target.value })}>
                {FINANCIAL_YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">District</label>
              <select className="form-select" value={form.district}
                onChange={e => setForm({ ...form, district: e.target.value })}>
                <option value="">All Districts</option>
                {DISTRICTS_JK.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Department / Agency</label>
            <input className="form-input" value={form.department}
              onChange={e => setForm({ ...form, department: e.target.value })}
              placeholder="DoAJ, DoHK, SKUAST-J…" />
          </div>
          <div>
            <label className="form-label">Remarks</label>
            <textarea className="form-input" rows={2} value={form.remarks}
              onChange={e => setForm({ ...form, remarks: e.target.value })} />
          </div>
          <p className="text-xs text-slate-400">
            After creating, you can add budget lines (activities, quarterly targets & budgets) before submitting for approval.
          </p>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title} className="btn-primary">
            {mutation.isPending ? "Creating…" : <><Plus className="w-3.5 h-3.5" />Create AWPB</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail + Approval Dialog ─────────────────────────────────────────────────
function AWPBDetailDialog({ id, onClose, currentUser }: { id: number; onClose: () => void; currentUser: any }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"overview" | "lines" | "history">("overview");
  const [actionDialog, setActionDialog] = useState<"APPROVE" | "REJECT" | "RETURN" | null>(null);
  const [editingLines, setEditingLines] = useState(false);
  const [lines, setLines] = useState<any[]>([]);

  const { data: awpb, isLoading } = useQuery({
    queryKey: ["awpb", id],
    queryFn: () => api.get(`/awpb/${id}`).then(r => r.data as any),
    onSuccess: (data) => {
      if (!editingLines) setLines(data.lines || []);
    },
  } as any);

  const { data: components = [] } = useQuery({
    queryKey: ["components-full"],
    queryFn: () => api.get("/components").then(r => r.data as any[]),
  });

  const saveLinesMutation = useMutation({
    mutationFn: () => api.put(`/awpb/${id}/lines`, { lines }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["awpb", id] });
      queryClient.invalidateQueries({ queryKey: ["awpb"] });
      toast.success("Budget lines saved");
      setEditingLines(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const transitionMutation = useMutation({
    mutationFn: (body: any) => api.post(`/awpb/${id}/transition`, body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["awpb", id] });
      queryClient.invalidateQueries({ queryKey: ["awpb"] });
      queryClient.invalidateQueries({ queryKey: ["awpb-summary"] });
      toast.success("Stage updated");
      setActionDialog(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (isLoading || !awpb) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8">
          <div className="w-6 h-6 border-2 border-brand-700 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  const stage = STAGES.find(s => s.key === awpb.status);
  const canEdit = ["DRAFT", "RETURNED"].includes(awpb.status);
  const userRole = currentUser?.role;

  const canApprove = {
    DRAFT: ["DATA_ENTRY", "DEPARTMENT_OFFICER", "ADMIN", "SUPER_ADMIN"].includes(userRole),
    PIU_REVIEW: ["DEPARTMENT_OFFICER", "ADMIN", "SUPER_ADMIN"].includes(userRole),
    PMU_REVIEW: ["ADMIN", "SUPER_ADMIN"].includes(userRole),
    IFAD_SUBMISSION: userRole === "SUPER_ADMIN",
    IFAD_APPROVED: userRole === "SUPER_ADMIN",
    DPC_APPROVED: userRole === "SUPER_ADMIN",
  }[awpb.status] ?? false;

  const canReturn = ["PIU_REVIEW", "PMU_REVIEW", "IFAD_SUBMISSION"].includes(awpb.status) && canApprove;

  // Total calculations
  const totalQ1 = lines.reduce((a, l) => a + (Number(l.q1Budget) || 0), 0);
  const totalQ2 = lines.reduce((a, l) => a + (Number(l.q2Budget) || 0), 0);
  const totalQ3 = lines.reduce((a, l) => a + (Number(l.q3Budget) || 0), 0);
  const totalQ4 = lines.reduce((a, l) => a + (Number(l.q4Budget) || 0), 0);
  const grandTotal = totalQ1 + totalQ2 + totalQ3 + totalQ4;

  const addLine = () => setLines(prev => [...prev, {
    activityName: "", unit: "", quantity: 0, unitCost: 0, totalCost: 0,
    q1Target: 0, q2Target: 0, q3Target: 0, q4Target: 0,
    q1Budget: 0, q2Budget: 0, q3Budget: 0, q4Budget: 0,
    componentId: null, subComponentId: null, remarks: "",
  }]);

  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

  const updateLine = (i: number, field: string, value: any) => {
    setLines(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      // Auto-calculate total cost
      if (field === 'quantity' || field === 'unitCost') {
        next[i].totalCost = (Number(next[i].quantity) || 0) * (Number(next[i].unitCost) || 0);
      }
      return next;
    });
  };

  // Build sub-component options from selected component
  const getSubComponents = (componentId: number) => {
    const comp = components.find((c: any) => c.id === componentId);
    return comp?.subComponents ?? [];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={cn("badge text-xs", stage?.color ?? "bg-slate-100 text-slate-600")}>
                {stage?.label ?? awpb.status}
              </span>
              <span className="badge bg-slate-100 text-slate-600 font-mono text-[10px]">{awpb.financialYear}</span>
              {awpb.district && <span className="badge bg-blue-50 text-blue-700 text-[10px]">{awpb.district}</span>}
            </div>
            <h2 className="font-bold text-slate-900 text-lg leading-tight">{awpb.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Created by {awpb.createdBy?.fullName} · {formatDate(awpb.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 flex-shrink-0"><X className="w-5 h-5" /></button>
        </div>

        {/* Stage pipeline strip */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {STAGES.map((s, i) => {
              const stageIdx = STAGES.findIndex(x => x.key === awpb.status);
              const isActive = s.key === awpb.status;
              const isDone = i < stageIdx;
              const isFuture = i > stageIdx;
              return (
                <div key={s.key} className="flex items-center gap-1">
                  {i > 0 && (
                    <div className={cn("w-6 h-px", isDone ? "bg-brand-500" : "bg-slate-200")} />
                  )}
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all",
                    isActive ? "bg-brand-700 text-white shadow-sm" :
                    isDone ? "bg-brand-100 text-brand-700" :
                    "text-slate-400"
                  )}>
                    {isDone && <CheckCircle2 className="w-3 h-3" />}
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {[
            { id: "overview", label: "Overview" },
            { id: "lines", label: `Budget Lines (${awpb.lines?.length ?? 0})` },
            { id: "history", label: `History (${awpb.history?.length ?? 0})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn("px-5 py-2.5 text-sm font-medium transition-colors border-b-2",
                tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "overview" && (
            <div className="p-5 space-y-5">
              {/* Budget summary */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Budget by Quarter</p>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { label: "Q1 (Apr–Jun)", value: awpb.q1Budget },
                    { label: "Q2 (Jul–Sep)", value: awpb.q2Budget },
                    { label: "Q3 (Oct–Dec)", value: awpb.q3Budget },
                    { label: "Q4 (Jan–Mar)", value: awpb.q4Budget },
                    { label: "Total", value: awpb.totalBudget },
                  ].map(q => (
                    <div key={q.label} className={cn("rounded-xl p-3 text-center", q.label === "Total" ? "bg-brand-50 border border-brand-200" : "bg-slate-50")}>
                      <p className={cn("text-lg font-bold font-display", q.label === "Total" ? "text-brand-700" : "text-slate-800")}>
                        {formatCurrency(q.value)}
                      </p>
                      <p className="text-[10px] text-slate-500">{q.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {awpb.remarks && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Remarks</p>
                  <p className="text-sm text-slate-700">{awpb.remarks}</p>
                </div>
              )}
              {/* Next action guidance */}
              {awpb.status !== "DAP_APPROVED" && awpb.status !== "REJECTED" && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">Next Action</p>
                  <p className="text-sm text-blue-800">{STAGE_ACTOR[awpb.status] || "Awaiting action"}</p>
                </div>
              )}
            </div>
          )}

          {tab === "lines" && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-600">Activity-wise Budget Allocation</p>
                {canEdit && (
                  <div className="flex gap-2">
                    {editingLines ? (
                      <>
                        <button onClick={() => { setLines(awpb.lines || []); setEditingLines(false); }} className="btn-secondary text-xs py-1">Cancel</button>
                        <button onClick={() => saveLinesMutation.mutate()} disabled={saveLinesMutation.isPending} className="btn-primary text-xs py-1">
                          {saveLinesMutation.isPending ? "Saving…" : <><Save className="w-3 h-3" />Save Lines</>}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setLines(awpb.lines || []); setEditingLines(true); }} className="btn-secondary text-xs py-1">
                          <FileText className="w-3 h-3" /> Edit Lines
                        </button>
                        <button onClick={() => { setLines(prev => [...(awpb.lines || []), { activityName: "", unit: "", quantity: 0, unitCost: 0, totalCost: 0, q1Target: 0, q2Target: 0, q3Target: 0, q4Target: 0, q1Budget: 0, q2Budget: 0, q3Budget: 0, q4Budget: 0, componentId: null, subComponentId: null, remarks: "" }]); setEditingLines(true); }} className="btn-primary text-xs py-1">
                          <Plus className="w-3 h-3" /> Add Line
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="table-th text-left min-w-[180px]">Activity</th>
                      <th className="table-th">Component</th>
                      <th className="table-th">Unit</th>
                      <th className="table-th text-right">Qty</th>
                      <th className="table-th text-right">Unit Cost</th>
                      <th className="table-th text-right bg-blue-50">Q1 Budget</th>
                      <th className="table-th text-right bg-blue-50">Q2 Budget</th>
                      <th className="table-th text-right bg-blue-50">Q3 Budget</th>
                      <th className="table-th text-right bg-blue-50">Q4 Budget</th>
                      <th className="table-th text-right bg-brand-50">Total</th>
                      {editingLines && <th className="table-th" />}
                    </tr>
                  </thead>
                  <tbody>
                    {(editingLines ? lines : awpb.lines || []).map((line: any, i: number) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="table-td">
                          {editingLines
                            ? <input className="form-input text-xs py-1" value={line.activityName} onChange={e => updateLine(i, "activityName", e.target.value)} placeholder="Activity name" />
                            : <span className="font-medium">{line.activityName}</span>
                          }
                        </td>
                        <td className="table-td text-slate-500">
                          {editingLines ? (
                            <select className="form-select text-xs py-1 w-32" value={line.componentId ?? ""}
                              onChange={e => updateLine(i, "componentId", e.target.value ? Number(e.target.value) : null)}>
                              <option value="">—</option>
                              {components.map((c: any) => <option key={c.id} value={c.id}>{c.code}</option>)}
                            </select>
                          ) : (
                            line.component?.code ?? "—"
                          )}
                        </td>
                        <td className="table-td">
                          {editingLines
                            ? <input className="form-input text-xs py-1 w-16" value={line.unit ?? ""} onChange={e => updateLine(i, "unit", e.target.value)} placeholder="Ha, No." />
                            : line.unit ?? "—"
                          }
                        </td>
                        <td className="table-td text-right">
                          {editingLines
                            ? <input type="number" className="form-input text-xs py-1 w-16 text-right" value={line.quantity} onChange={e => updateLine(i, "quantity", Number(e.target.value))} />
                            : line.quantity
                          }
                        </td>
                        <td className="table-td text-right">
                          {editingLines
                            ? <input type="number" className="form-input text-xs py-1 w-20 text-right" value={line.unitCost} onChange={e => updateLine(i, "unitCost", Number(e.target.value))} />
                            : formatCurrency(line.unitCost)
                          }
                        </td>
                        {["q1Budget", "q2Budget", "q3Budget", "q4Budget"].map(q => (
                          <td key={q} className="table-td text-right bg-blue-50/30">
                            {editingLines
                              ? <input type="number" className="form-input text-xs py-1 w-20 text-right" value={line[q]} onChange={e => updateLine(i, q, Number(e.target.value))} />
                              : formatCurrency(line[q])
                            }
                          </td>
                        ))}
                        <td className="table-td text-right font-semibold text-brand-700 bg-brand-50/30">
                          {formatCurrency(editingLines
                            ? (Number(line.q1Budget) + Number(line.q2Budget) + Number(line.q3Budget) + Number(line.q4Budget))
                            : line.totalCost
                          )}
                        </td>
                        {editingLines && (
                          <td className="table-td">
                            <button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {/* Totals row */}
                    {(editingLines ? lines : awpb.lines || []).length > 0 && (
                      <tr className="bg-slate-50 font-semibold border-t border-slate-200">
                        <td className="table-td" colSpan={5}>Total</td>
                        {editingLines ? (
                          <>
                            <td className="table-td text-right text-brand-700">{formatCurrency(totalQ1)}</td>
                            <td className="table-td text-right text-brand-700">{formatCurrency(totalQ2)}</td>
                            <td className="table-td text-right text-brand-700">{formatCurrency(totalQ3)}</td>
                            <td className="table-td text-right text-brand-700">{formatCurrency(totalQ4)}</td>
                            <td className="table-td text-right text-brand-700">{formatCurrency(grandTotal)}</td>
                          </>
                        ) : (
                          <>
                            <td className="table-td text-right text-brand-700">{formatCurrency(awpb.q1Budget)}</td>
                            <td className="table-td text-right text-brand-700">{formatCurrency(awpb.q2Budget)}</td>
                            <td className="table-td text-right text-brand-700">{formatCurrency(awpb.q3Budget)}</td>
                            <td className="table-td text-right text-brand-700">{formatCurrency(awpb.q4Budget)}</td>
                            <td className="table-td text-right text-brand-700">{formatCurrency(awpb.totalBudget)}</td>
                          </>
                        )}
                        {editingLines && <td />}
                      </tr>
                    )}
                    {(editingLines ? lines : awpb.lines || []).length === 0 && (
                      <tr><td colSpan={11} className="table-td text-center py-8 text-slate-400">
                        No budget lines added yet.
                        {canEdit && <button onClick={() => { setLines([]); setEditingLines(true); addLine(); }} className="ml-2 text-brand-700 hover:underline">Add first line →</button>}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {editingLines && (
                <button onClick={addLine} className="mt-3 btn-ghost text-xs py-1.5 w-full border border-dashed border-slate-300">
                  <Plus className="w-3.5 h-3.5" /> Add Activity Line
                </button>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="p-5">
              <div className="space-y-3">
                {(awpb.history || []).map((h: any, i: number) => {
                  const isApprove = h.action === "APPROVE" || h.action === "CREATED";
                  const isReject = h.action === "REJECT";
                  return (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                          isApprove ? "bg-green-100" : isReject ? "bg-red-100" : "bg-amber-100"
                        )}>
                          {isApprove
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                            : isReject
                            ? <XCircle className="w-3.5 h-3.5 text-red-600" />
                            : <CornerUpLeft className="w-3.5 h-3.5 text-amber-600" />
                          }
                        </div>
                        {i < awpb.history.length - 1 && <div className="w-px flex-1 bg-slate-100 mt-1" />}
                      </div>
                      <div className="pb-4 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-800">
                            {h.user?.fullName ?? "System"}
                          </span>
                          <span className="badge text-[10px] bg-slate-100 text-slate-600">{h.action}</span>
                          {h.fromStatus && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              {STAGES.find(s => s.key === h.fromStatus)?.label ?? h.fromStatus}
                              <ArrowRight className="w-2.5 h-2.5" />
                              {STAGES.find(s => s.key === h.toStatus)?.label ?? h.toStatus}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 ml-auto">{formatDate(h.createdAt)}</span>
                        </div>
                        {h.comments && <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded-lg px-3 py-2">{h.comments}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer — approval actions */}
        {awpb.status !== "DAP_APPROVED" && awpb.status !== "REJECTED" && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50">
            <div className="flex gap-2">
              {canReturn && (
                <button onClick={() => setActionDialog("RETURN")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">
                  <CornerUpLeft className="w-3.5 h-3.5" /> Return for Revision
                </button>
              )}
              {canApprove && awpb.status !== "DAP_APPROVED" && (
                <button onClick={() => setActionDialog("REJECT")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              )}
            </div>
            {canApprove && (
              <button onClick={() => setActionDialog("APPROVE")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-brand-700 text-white hover:bg-brand-800 transition-colors">
                <CheckCircle2 className="w-4 h-4" />
                {awpb.status === "DRAFT" ? "Submit to PIU" :
                 awpb.status === "PIU_REVIEW" ? "Approve → PMU" :
                 awpb.status === "PMU_REVIEW" ? "Submit to IFAD" :
                 awpb.status === "IFAD_SUBMISSION" ? "IFAD Approved" :
                 awpb.status === "IFAD_APPROVED" ? "DPC Approved" :
                 awpb.status === "DPC_APPROVED" ? "DAP Final Approval" : "Approve"}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Action Dialog */}
        {actionDialog && (
          <ActionConfirmDialog
            action={actionDialog}
            awpbTitle={awpb.title}
            currentStatus={awpb.status}
            onConfirm={(comments) => transitionMutation.mutate({ action: actionDialog, comments })}
            onClose={() => setActionDialog(null)}
            isPending={transitionMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

// ─── Action Confirm Dialog ────────────────────────────────────────────────────
function ActionConfirmDialog({ action, awpbTitle, currentStatus, onConfirm, onClose, isPending }: {
  action: "APPROVE" | "REJECT" | "RETURN";
  awpbTitle: string;
  currentStatus: string;
  onConfirm: (comments: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [comments, setComments] = useState("");
  const isRequired = action !== "APPROVE";

  const config = {
    APPROVE: { title: "Confirm Approval", color: "bg-brand-700", icon: CheckCircle2, btn: "Approve & Forward" },
    REJECT: { title: "Reject AWPB", color: "bg-red-600", icon: XCircle, btn: "Reject" },
    RETURN: { title: "Return for Revision", color: "bg-amber-600", icon: CornerUpLeft, btn: "Return" },
  }[action];

  const Icon = config.icon;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-2xl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm m-4 animate-fade-in">
        <div className={cn("flex items-center gap-3 p-4 rounded-t-xl", config.color)}>
          <Icon className="w-5 h-5 text-white" />
          <h3 className="font-semibold text-white">{config.title}</h3>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-slate-600">
            <strong className="text-slate-800">{awpbTitle}</strong>
          </p>
          <div>
            <label className="form-label">
              Comments {isRequired ? "*" : "(optional)"}
            </label>
            <textarea className="form-input" rows={3} value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder={action === "APPROVE" ? "Optional notes…" : "Please provide reason…"} />
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={() => onConfirm(comments)}
            disabled={isPending || (isRequired && !comments.trim())}
            className={cn("flex-1 text-sm font-semibold py-2 rounded-xl text-white transition-colors",
              action === "APPROVE" ? "bg-brand-700 hover:bg-brand-800" :
              action === "REJECT" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
            )}>
            {isPending ? "Processing…" : config.btn}
          </button>
        </div>
      </div>
    </div>
  );
}
