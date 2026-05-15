"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalsApi, getApiErrorMessage } from "@/lib/api";
import { Approval, ApprovalStatus, CreateApprovalDto } from "@/types";
import {
  formatDate, getApprovalStatusMeta, getPriorityMeta, cn,
} from "@/lib/utils";
import {
  Plus, Search, Save, X, CheckCircle, XCircle, RotateCcw,
  Clock, AlertTriangle, CheckSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

export default function ApprovalsPage() {
  const { canWrite, canReview } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "ALL">("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState<Approval | null>(null);
  const queryClient = useQueryClient();

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: approvalsApi.list,
  });

  const filtered = approvals.filter((a) => {
    const matchSearch = !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.referenceNo.toLowerCase().includes(search.toLowerCase()) ||
      a.department.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const pending = approvals.filter((a) => a.status === "PENDING").length;
  const approved = approvals.filter((a) => a.status === "APPROVED").length;
  const rejected = approvals.filter((a) => a.status === "REJECTED").length;
  const returned = approvals.filter((a) => a.status === "RETURNED").length;

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Pending", value: pending, icon: Clock, color: "text-amber-700", bg: "bg-amber-50" },
          { label: "Approved", value: approved, icon: CheckCircle, color: "text-green-700", bg: "bg-green-50" },
          { label: "Rejected", value: rejected, icon: XCircle, color: "text-red-700", bg: "bg-red-50" },
          { label: "Returned", value: returned, icon: RotateCcw, color: "text-slate-700", bg: "bg-slate-100" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="stat-card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg}`}>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 font-display">{c.value}</p>
                <p className="text-xs text-slate-600">{c.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search approvals…" className="form-input pl-8 w-64 py-1.5 text-sm"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 gap-0.5">
            {(["ALL", "PENDING", "APPROVED", "REJECTED", "RETURNED"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  statusFilter === s ? "bg-brand-700 text-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}>
                {s === "ALL" ? "All" : s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
        {canWrite && (
          <button onClick={() => setDialogOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Request
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-th">Request</th>
              <th className="table-th">Department</th>
              <th className="table-th">Status</th>
              <th className="table-th">Priority</th>
              <th className="table-th">Requested By</th>
              <th className="table-th">Due Date</th>
              <th className="table-th">Created</th>
              {canReview && <th className="table-th" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                  <td key={j} className="table-td"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <CheckSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No approval requests found.</p>
                </td>
              </tr>
            ) : (
              filtered.map((a) => {
                const statusMeta = getApprovalStatusMeta(a.status);
                const priorityMeta = getPriorityMeta(a.priority);
                const isOverdue = a.dueDate && new Date(a.dueDate) < new Date() && a.status === "PENDING";
                return (
                  <tr key={a.id} className={cn("hover:bg-slate-50 transition-colors", isOverdue && "bg-red-50/30")}>
                    <td className="table-td">
                      <div className="flex items-start gap-2">
                        {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />}
                        <div>
                          <p className="font-medium text-slate-800">{a.title}</p>
                          <p className="text-xs text-slate-400 font-mono">{a.referenceNo} · {a.entityType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-slate-600 text-sm">{a.department}</td>
                    <td className="table-td">
                      <span className={cn("badge", statusMeta.color)}>{statusMeta.label}</span>
                    </td>
                    <td className="table-td">
                      <span className={cn("badge", priorityMeta.color)}>{priorityMeta.label}</span>
                    </td>
                    <td className="table-td text-sm text-slate-600">
                      {a.requestedBy?.fullName ?? "—"}
                    </td>
                    <td className="table-td text-xs">
                      <span className={cn(isOverdue ? "text-red-600 font-semibold" : "text-slate-500")}>
                        {formatDate(a.dueDate)}
                      </span>
                    </td>
                    <td className="table-td text-xs text-slate-500">{formatDate(a.createdAt)}</td>
                    {canReview && (
                      <td className="table-td">
                        {a.status === "PENDING" && (
                          <button
                            onClick={() => setReviewItem(a)}
                            className="btn-ghost text-xs py-1 text-brand-700"
                          >
                            Review
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <CreateApprovalDialog onClose={() => setDialogOpen(false)} />
      )}

      {reviewItem && (
        <ReviewDialog approval={reviewItem} onClose={() => setReviewItem(null)} />
      )}
    </div>
  );
}

function CreateApprovalDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateApprovalDto>({
    title: "",
    entityType: "",
    department: "",
    priority: "MEDIUM",
    remarks: "",
    dueDate: "",
  });

  const mutation = useMutation({
    mutationFn: () => approvalsApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.success("Approval request submitted");
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">New Approval Request</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Brief description of request" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Entity Type *</label>
              <input className="form-input" value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })} placeholder="e.g. Project, Scheme" />
            </div>
            <div>
              <label className="form-label">Department *</label>
              <input className="form-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })}>
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label">Remarks</label>
            <textarea className="form-input" rows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Additional context…" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title || !form.department} className="btn-primary">
            {mutation.isPending ? "Submitting…" : <><Save className="w-3.5 h-3.5" /> Submit</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewDialog({ approval, onClose }: { approval: Approval; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [remarks, setRemarks] = useState("");

  const mutation = useMutation({
    mutationFn: (status: ApprovalStatus) =>
      approvalsApi.updateStatus(approval.id, { status, remarks }),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.success(`Request ${status.toLowerCase()}`);
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">Review Request</h2>
            <p className="text-xs text-slate-500 mt-0.5">{approval.referenceNo}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <p><span className="text-slate-500">Title:</span> <span className="font-medium text-slate-800">{approval.title}</span></p>
            <p><span className="text-slate-500">Department:</span> <span className="text-slate-700">{approval.department}</span></p>
            <p><span className="text-slate-500">Requested by:</span> <span className="text-slate-700">{approval.requestedBy?.fullName ?? "—"}</span></p>
            {approval.remarks && <p><span className="text-slate-500">Remarks:</span> <span className="text-slate-700">{approval.remarks}</span></p>}
          </div>
          <div>
            <label className="form-label">Decision Remarks</label>
            <textarea className="form-input" rows={3} value={remarks}
              onChange={(e) => setRemarks(e.target.value)} placeholder="Add your decision note (required for rejection/return)…" />
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
          <div className="flex gap-2">
            <button
              onClick={() => mutation.mutate("REJECTED")}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg transition-colors"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
            <button
              onClick={() => mutation.mutate("RETURNED")}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Return
            </button>
          </div>
          <button
            onClick={() => mutation.mutate("APPROVED")}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> Approve
          </button>
        </div>
      </div>
    </div>
  );
}
