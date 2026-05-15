"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { beneficiariesApi, schemesApi, projectsApi, getApiErrorMessage } from "@/lib/api";
import { Beneficiary, CreateBeneficiaryDto, BeneficiaryStatus } from "@/types";
import {
  formatDate, getBeneficiaryStatusMeta, DISTRICTS_JK, cn,
} from "@/lib/utils";
import { Plus, Search, Save, X, Users, UserCheck, Baby, Home } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

export default function BeneficiariesPage() {
  const { canWrite } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BeneficiaryStatus | "ALL">("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Beneficiary | null>(null);
  const queryClient = useQueryClient();

  const { data: beneficiaries = [], isLoading } = useQuery({
    queryKey: ["beneficiaries"],
    queryFn: beneficiariesApi.list,
  });
  const { data: schemes = [] } = useQuery({ queryKey: ["schemes"], queryFn: schemesApi.list });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });

  const filtered = beneficiaries.filter((b) => {
    const matchSearch = !search || b.fullName.toLowerCase().includes(search.toLowerCase()) ||
      b.referenceNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || b.status === statusFilter;
    const matchDistrict = districtFilter === "ALL" || b.district === districtFilter;
    return matchSearch && matchStatus && matchDistrict;
  });

  const statusUpdateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      beneficiariesApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });
      toast.success("Status updated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  // Stats
  const women = beneficiaries.filter((b) => b.isWoman).length;
  const youth = beneficiaries.filter((b) => b.isYouth).length;
  const bpl = beneficiaries.filter((b) => b.isBpl).length;

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Beneficiaries", value: beneficiaries.length, icon: Users, color: "text-brand-700", bg: "bg-brand-50" },
          { label: "Women", value: women, icon: UserCheck, color: "text-pink-700", bg: "bg-pink-50" },
          { label: "Youth", value: youth, icon: Baby, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "BPL Households", value: bpl, icon: Home, color: "text-amber-700", bg: "bg-amber-50" },
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
            <input type="text" placeholder="Search beneficiaries…" className="form-input pl-8 w-64 py-1.5 text-sm"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select w-auto py-1.5 text-sm" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="ALL">All Status</option>
            <option value="IDENTIFIED">Identified</option>
            <option value="VERIFIED">Verified</option>
            <option value="APPROVED">Approved</option>
            <option value="SUPPORTED">Supported</option>
          </select>
          <select className="form-select w-auto py-1.5 text-sm" value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}>
            <option value="ALL">All Districts</option>
            {DISTRICTS_JK.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        {canWrite && (
          <button onClick={() => { setEditItem(null); setDialogOpen(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Beneficiary
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-th">Beneficiary</th>
              <th className="table-th">Location</th>
              <th className="table-th">Status</th>
              <th className="table-th">Gender</th>
              <th className="table-th">Tags</th>
              <th className="table-th">Scheme / Project</th>
              <th className="table-th">Added</th>
              {canWrite && <th className="table-th" />}
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
              <tr><td colSpan={8} className="table-td text-center py-12 text-slate-400">No beneficiaries found.</td></tr>
            ) : (
              filtered.map((b) => {
                const statusMeta = getBeneficiaryStatusMeta(b.status);
                return (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-td">
                      <p className="font-medium text-slate-800">{b.fullName}</p>
                      <p className="text-xs text-slate-400 font-mono">{b.referenceNumber}</p>
                    </td>
                    <td className="table-td text-xs text-slate-600">
                      {[b.village, b.block, b.district].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="table-td">
                      <select
                        className={cn("badge border-0 outline-none cursor-pointer", statusMeta.color)}
                        value={b.status}
                        onChange={(e) => statusUpdateMutation.mutate({ id: b.id, status: e.target.value })}
                        disabled={!canWrite}
                      >
                        {["IDENTIFIED", "VERIFIED", "APPROVED", "SUPPORTED"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="table-td text-slate-600 capitalize">{b.gender ?? "—"}</td>
                    <td className="table-td">
                      <div className="flex flex-wrap gap-1">
                        {b.isWoman && <span className="badge bg-pink-50 text-pink-700">Woman</span>}
                        {b.isYouth && <span className="badge bg-blue-50 text-blue-700">Youth</span>}
                        {b.isBpl && <span className="badge bg-amber-50 text-amber-700">BPL</span>}
                      </div>
                    </td>
                    <td className="table-td text-xs text-slate-600">
                      {b.scheme?.title ?? b.project?.name ?? "—"}
                    </td>
                    <td className="table-td text-xs text-slate-500">{formatDate(b.createdAt)}</td>
                    {canWrite && (
                      <td className="table-td">
                        <button onClick={() => { setEditItem(b); setDialogOpen(true); }} className="btn-ghost text-xs py-1">Edit</button>
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
        <BeneficiaryDialog
        <div>
          <label className="form-label">Category</label>
          <select className="form-select" value={(form as any).category ?? 'GENERAL'}
            onChange={(e) => setForm({ ...form, category: e.target.value } as any)}>
            <option value="GENERAL">General</option>
            <option value="SC">SC (Scheduled Caste)</option>
            <option value="ST">ST (Scheduled Tribe)</option>
            <option value="OBC">OBC (Other Backward Classes)</option>
            <option value="PHH">PHH (Priority Household / BPL)</option>
          </select>
        </div>
        <div>
          <label className="form-label">Application Status</label>
          <select className="form-select" value={(form as any).applicationStatus ?? 'PENDING'}
            onChange={(e) => setForm({ ...form, applicationStatus: e.target.value } as any)}>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REVERTED">Reverted</option>
          </select>
        </div>
                />
              )}
            </div>
  );
}

function BeneficiaryDialog({ beneficiary, schemes, projects, onClose }: any) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateBeneficiaryDto>({
    fullName: beneficiary?.fullName ?? "",
    gender: beneficiary?.gender ?? "",
    age: beneficiary?.age ?? undefined,
    district: beneficiary?.district ?? "",
    block: beneficiary?.block ?? "",
    village: beneficiary?.village ?? "",
    isYouth: beneficiary?.isYouth ?? false,
    isWoman: beneficiary?.isWoman ?? false,
    isBpl: beneficiary?.isBpl ?? false,
    phone: beneficiary?.phone ?? "",
    remarks: beneficiary?.remarks ?? "",
    schemeId: beneficiary?.scheme ? undefined : undefined,
    projectId: beneficiary?.project ? undefined : undefined,
  });

  const mutation = useMutation({
    mutationFn: () =>
      beneficiary ? beneficiariesApi.update(beneficiary.id, form) : beneficiariesApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });
      toast.success(beneficiary ? "Updated" : "Beneficiary added");
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{beneficiary ? "Edit Beneficiary" : "Add Beneficiary"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="form-label">Full Name *</label>
              <input className="form-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><label className="form-label">Gender</label>
              <select className="form-select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select></div>
            <div><label className="form-label">Age</label>
              <input type="number" className="form-input" value={form.age ?? ""} onChange={(e) => setForm({ ...form, age: e.target.value ? Number(e.target.value) : undefined })} /></div>
            <div><label className="form-label">District</label>
              <select className="form-select" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                <option value="">Select…</option>
                {DISTRICTS_JK.map((d) => <option key={d}>{d}</option>)}
              </select></div>
            <div><label className="form-label">Block</label>
              <input className="form-input" value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} /></div>
            <div><label className="form-label">Village</label>
              <input className="form-input" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} /></div>
            <div><label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="col-span-2">
              <label className="form-label">Categories</label>
              <div className="flex gap-4 mt-1">
                {[
                  { key: "isWoman", label: "Woman" },
                  { key: "isYouth", label: "Youth (< 35)" },
                  { key: "isBpl", label: "BPL" },
                ].map((c) => (
                  <label key={c.key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={(form as any)[c.key] ?? false}
                      onChange={(e) => setForm({ ...form, [c.key]: e.target.checked })}
                      className="rounded border-slate-300" />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
            <div><label className="form-label">Scheme</label>
              <select className="form-select" value={form.schemeId ?? ""} onChange={(e) => setForm({ ...form, schemeId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">None</option>
                {schemes.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select></div>
            <div><label className="form-label">Project</label>
              <select className="form-select" value={form.projectId ?? ""} onChange={(e) => setForm({ ...form, projectId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">None</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            <div className="col-span-2"><label className="form-label">Remarks</label>
              <textarea className="form-input" rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.fullName} className="btn-primary">
            {mutation.isPending ? "Saving…" : <><Save className="w-3.5 h-3.5" /> {beneficiary ? "Update" : "Add"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
