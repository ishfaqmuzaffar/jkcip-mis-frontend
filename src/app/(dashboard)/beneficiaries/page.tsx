"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatDate, DISTRICTS_JK, cn } from "@/lib/utils";
import {
  Plus, Search, Save, X, Users, UserCheck, Baby, Home,
  Upload, Download, AlertTriangle, CheckCircle2,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

const CATEGORIES = ["SC", "ST", "OBC", "PHH", "GENERAL"];
const APP_STATUSES = ["PENDING", "APPROVED", "REVERTED"];
const LAND_TYPES = ["OWNED", "LEASED", "SHARECROPPER", "COMMON_LAND"];

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700",
  PENDING:  "bg-amber-100 text-amber-700",
  REVERTED: "bg-red-100 text-red-700",
};
const CATEGORY_COLORS: Record<string, string> = {
  SC: "bg-blue-100 text-blue-700", ST: "bg-green-100 text-green-700",
  OBC: "bg-purple-100 text-purple-700", PHH: "bg-amber-100 text-amber-700",
  GENERAL: "bg-slate-100 text-slate-600",
};

const CSV_HEADERS = [
  "fullName","gender","age","district","block","village","phone","aadhaarNumber",
  "landHolding","landType","khasraNumber","fpoName","fpoMemberId",
  "isWoman","isYouth","isBpl","category","applicationStatus","schemeCode","remarks",
];

export default function BeneficiariesPage() {
  const { canWrite } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: beneficiaries = [], isLoading } = useQuery({
    queryKey: ["beneficiaries"],
    queryFn: () => api.get("/beneficiaries").then(r => r.data as any[]),
  });

  const filtered = beneficiaries.filter((b: any) => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      b.fullName?.toLowerCase().includes(s) ||
      b.uhid?.toLowerCase().includes(s) ||
      b.referenceNumber?.toLowerCase().includes(s) ||
      b.phone?.includes(search);
    const matchStatus = statusFilter === "ALL" || b.applicationStatus === statusFilter;
    const matchDistrict = districtFilter === "ALL" || b.district === districtFilter;
    return matchSearch && matchStatus && matchDistrict;
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/beneficiaries/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["beneficiaries"] }); toast.success("Status updated"); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const downloadTemplate = () => {
    const csv = CSV_HEADERS.join(",") + "\n" +
      "Ramesh Kumar,male,45,Srinagar,Natipora,Nowgam,9876543210,123456789012,0.5,OWNED,1234,FPO Nowgam,FPO-001,NO,NO,NO,GENERAL,PENDING,SC11-FPO-NEW,Sample beneficiary";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "beneficiary_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const women = beneficiaries.filter((b: any) => b.isWoman).length;
  const youth = beneficiaries.filter((b: any) => b.isYouth).length;
  const bpl = beneficiaries.filter((b: any) => b.isBpl).length;

  return (
    <div className="space-y-4 max-w-[1400px]">
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

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search name, UHID, phone…"
              className="form-input pl-8 w-64 py-1.5 text-sm" value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select w-auto py-1.5 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            {APP_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="form-select w-auto py-1.5 text-sm" value={districtFilter} onChange={e => setDistrictFilter(e.target.value)}>
            <option value="ALL">All Districts</option>
            {DISTRICTS_JK.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <button onClick={downloadTemplate} className="btn-secondary text-xs py-1.5 gap-1.5">
              <Download className="w-3.5 h-3.5" /> CSV Template
            </button>
            <button onClick={() => setImportOpen(true)} className="btn-secondary text-xs py-1.5 gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Bulk Import
            </button>
            <button onClick={() => { setEditItem(null); setDialogOpen(true); }} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Beneficiary
            </button>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="table-th">UHID / Name</th>
                <th className="table-th">Location</th>
                <th className="table-th">Category</th>
                <th className="table-th">Application</th>
                <th className="table-th">Tags</th>
                <th className="table-th">Land</th>
                <th className="table-th">FPO</th>
                <th className="table-th">Scheme</th>
                <th className="table-th">Added</th>
                {canWrite && <th className="table-th" />}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="table-td"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="table-td text-center py-12 text-slate-400">No beneficiaries found.</td></tr>
              ) : filtered.map((b: any) => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-td">
                    <p className="font-medium text-slate-800">{b.fullName}</p>
                    {b.uhid
                      ? <p className="text-[10px] text-brand-700 font-mono font-semibold">{b.uhid}</p>
                      : <p className="text-[10px] text-slate-400 font-mono">{b.referenceNumber}</p>}
                  </td>
                  <td className="table-td text-xs text-slate-600">
                    <p>{[b.village, b.block, b.district].filter(Boolean).join(", ") || "—"}</p>
                    {b.latitude && b.longitude && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5" />{Number(b.latitude).toFixed(4)}, {Number(b.longitude).toFixed(4)}
                      </p>
                    )}
                  </td>
                  <td className="table-td">
                    <span className={cn("badge text-xs", CATEGORY_COLORS[b.category ?? "GENERAL"] ?? "bg-slate-100 text-slate-600")}>
                      {b.category || "—"}
                    </span>
                  </td>
                  <td className="table-td">
                    <select
                      className={cn("badge border-0 outline-none cursor-pointer text-xs", STATUS_COLORS[b.applicationStatus ?? "PENDING"])}
                      value={b.applicationStatus ?? "PENDING"}
                      onChange={e => statusMutation.mutate({ id: b.id, status: e.target.value })}
                      disabled={!canWrite}
                    >
                      {APP_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      {b.isWoman && <span className="badge bg-pink-50 text-pink-700 text-[10px]">Woman</span>}
                      {b.isYouth && <span className="badge bg-blue-50 text-blue-700 text-[10px]">Youth</span>}
                      {b.isBpl && <span className="badge bg-amber-50 text-amber-700 text-[10px]">BPL</span>}
                    </div>
                  </td>
                  <td className="table-td text-xs text-slate-600">
                    {b.landHolding ? `${b.landHolding} ha${b.landType ? ` (${b.landType})` : ""}` : "—"}
                    {b.khasraNumber && <p className="text-[10px] text-slate-400">#{b.khasraNumber}</p>}
                  </td>
                  <td className="table-td text-xs text-slate-600">
                    {b.fpoName || "—"}
                    {b.fpoMemberId && <p className="text-[10px] text-slate-400">{b.fpoMemberId}</p>}
                  </td>
                  <td className="table-td text-xs text-slate-600">{b.scheme?.title ?? "—"}</td>
                  <td className="table-td text-xs text-slate-500">{formatDate(b.createdAt)}</td>
                  {canWrite && (
                    <td className="table-td">
                      <button onClick={() => { setEditItem(b); setDialogOpen(true); }} className="btn-ghost text-xs py-1">Edit</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dialogOpen && <BeneficiaryDialog beneficiary={editItem} onClose={() => { setDialogOpen(false); setEditItem(null); }} />}
      {importOpen && <BulkImportDialog onClose={() => setImportOpen(false)} />}
    </div>
  );
}

function BeneficiaryDialog({ beneficiary, onClose }: { beneficiary: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"basic" | "land" | "fpo">("basic");
  const [dupWarning, setDupWarning] = useState<any>(null);
  const [checkingDup, setCheckingDup] = useState(false);
  const [form, setForm] = useState<any>({
    fullName: beneficiary?.fullName ?? "",
    referenceNumber: beneficiary?.referenceNumber ?? `BEN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    aadhaarNumber: beneficiary?.aadhaarNumber ?? "",
    gender: beneficiary?.gender ?? "",
    age: beneficiary?.age ?? "",
    phone: beneficiary?.phone ?? "",
    district: beneficiary?.district ?? "",
    block: beneficiary?.block ?? "",
    village: beneficiary?.village ?? "",
    latitude: beneficiary?.latitude ?? "",
    longitude: beneficiary?.longitude ?? "",
    landHolding: beneficiary?.landHolding ?? "",
    landType: beneficiary?.landType ?? "",
    khasraNumber: beneficiary?.khasraNumber ?? "",
    fpoName: beneficiary?.fpoName ?? "",
    fpoMemberId: beneficiary?.fpoMemberId ?? "",
    isWoman: beneficiary?.isWoman ?? false,
    isYouth: beneficiary?.isYouth ?? false,
    isBpl: beneficiary?.isBpl ?? false,
    category: beneficiary?.category ?? "GENERAL",
    applicationStatus: beneficiary?.applicationStatus ?? "PENDING",
    remarks: beneficiary?.remarks ?? "",
    schemeId: beneficiary?.schemeId ?? undefined,
  });

  const { data: schemes = [] } = useQuery({
    queryKey: ["schemes"],
    queryFn: () => api.get("/schemes").then(r => r.data as any[]),
  });

  const mutation = useMutation({
    mutationFn: () => beneficiary
      ? api.patch(`/beneficiaries/${beneficiary.id}`, form).then(r => r.data)
      : api.post("/beneficiaries", form).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["beneficiaries"] }); toast.success(beneficiary ? "Updated" : "Added"); onClose(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const checkDup = async () => {
    if (!form.fullName && !form.aadhaarNumber && !form.phone) return;
    setCheckingDup(true);
    try {
      const res = await api.post("/beneficiaries/check-duplicate", {
        fullName: form.fullName, aadhaarNumber: form.aadhaarNumber || undefined,
        district: form.district || undefined, village: form.village || undefined,
        phone: form.phone || undefined, excludeId: beneficiary?.id,
      });
      setDupWarning((res.data as any).isDuplicate ? res.data : null);
    } catch { /* ignore */ }
    setCheckingDup(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">{beneficiary ? "Edit Beneficiary" : "Add Beneficiary"}</h2>
            {beneficiary?.uhid && <p className="text-xs text-brand-700 font-mono mt-0.5">{beneficiary.uhid}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-slate-100">
          {(["basic", "land", "fpo"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={cn("px-5 py-2.5 text-sm font-medium transition-colors border-b-2 capitalize",
                activeTab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
              )}>
              {t === "fpo" ? "FPO & Scheme" : t === "land" ? "Land Holding" : "Basic Info"}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {dupWarning && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-semibold">Possible duplicate detected</p>
                {dupWarning.matches?.map((m: any) => (
                  <p key={m.id} className="mt-0.5">
                    <strong>{m.fullName}</strong> — {m.uhid} ({m.district}, {m.village})
                    <span className={cn("ml-1 badge text-[10px]", m.confidence === "HIGH" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>{m.confidence}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {activeTab === "basic" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} onBlur={checkDup} />
              </div>
              <div>
                <label className="form-label">Reference Number</label>
                <input className="form-input font-mono text-xs" value={form.referenceNumber} onChange={e => setForm({ ...form, referenceNumber: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Aadhaar Number {checkingDup && <span className="text-[10px] text-slate-400 font-normal ml-1">checking…</span>}</label>
                <input className="form-input font-mono" value={form.aadhaarNumber} onChange={e => setForm({ ...form, aadhaarNumber: e.target.value })} onBlur={checkDup} placeholder="12-digit number" maxLength={12} />
              </div>
              <div>
                <label className="form-label">Gender</label>
                <select className="form-select" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                  <option value="">Select…</option>
                  <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Age</label>
                <input type="number" className="form-input" value={form.age ?? ""} onChange={e => setForm({ ...form, age: e.target.value ? Number(e.target.value) : "" })} />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} onBlur={checkDup} />
              </div>
              <div>
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="GENERAL">General</option>
                  <option value="SC">SC (Scheduled Caste)</option><option value="ST">ST (Scheduled Tribe)</option>
                  <option value="OBC">OBC</option><option value="PHH">PHH (Priority Household)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Application Status</label>
                <select className="form-select" value={form.applicationStatus} onChange={e => setForm({ ...form, applicationStatus: e.target.value })}>
                  {APP_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">District</label>
                <select className="form-select" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })}>
                  <option value="">Select…</option>
                  {DISTRICTS_JK.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Block</label>
                <input className="form-input" value={form.block} onChange={e => setForm({ ...form, block: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="form-label">Village</label>
                <input className="form-input" value={form.village} onChange={e => setForm({ ...form, village: e.target.value })} />
              </div>
              <div>
                <label className="form-label">GPS Latitude</label>
                <input type="number" step="0.000001" className="form-input font-mono" value={form.latitude ?? ""} onChange={e => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : "" })} placeholder="34.0836" />
              </div>
              <div>
                <label className="form-label">GPS Longitude</label>
                <input type="number" step="0.000001" className="form-input font-mono" value={form.longitude ?? ""} onChange={e => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : "" })} placeholder="74.7973" />
              </div>
              <div className="col-span-2">
                <label className="form-label">Tags</label>
                <div className="flex gap-4 mt-1">
                  {[{ key: "isWoman", label: "Woman" }, { key: "isYouth", label: "Youth (< 35)" }, { key: "isBpl", label: "BPL" }].map(c => (
                    <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form[c.key] ?? false} onChange={e => setForm({ ...form, [c.key]: e.target.checked })} className="rounded border-slate-300" />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="form-label">Remarks</label>
                <textarea className="form-input" rows={2} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              </div>
            </div>
          )}

          {activeTab === "land" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Land Holding (hectares)</label>
                <input type="number" step="0.01" className="form-input" value={form.landHolding ?? ""} onChange={e => setForm({ ...form, landHolding: e.target.value ? Number(e.target.value) : "" })} placeholder="0.50" />
              </div>
              <div>
                <label className="form-label">Land Type</label>
                <select className="form-select" value={form.landType ?? ""} onChange={e => setForm({ ...form, landType: e.target.value })}>
                  <option value="">Select…</option>
                  {LAND_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="form-label">Survey / Khasra Number</label>
                <input className="form-input font-mono" value={form.khasraNumber ?? ""} onChange={e => setForm({ ...form, khasraNumber: e.target.value })} placeholder="e.g. 1234/5" />
              </div>
            </div>
          )}

          {activeTab === "fpo" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">FPO Name</label>
                <input className="form-input" value={form.fpoName ?? ""} onChange={e => setForm({ ...form, fpoName: e.target.value })} />
              </div>
              <div>
                <label className="form-label">FPO Member ID</label>
                <input className="form-input font-mono" value={form.fpoMemberId ?? ""} onChange={e => setForm({ ...form, fpoMemberId: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="form-label">Scheme</label>
                <select className="form-select" value={form.schemeId ?? ""} onChange={e => setForm({ ...form, schemeId: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">None</option>
                  {schemes.map((s: any) => <option key={s.id} value={s.id}>{s.title} ({s.code})</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.fullName} className="btn-primary">
            {mutation.isPending ? "Saving…" : <><Save className="w-3.5 h-3.5" />{beneficiary ? "Update" : "Add"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkImportDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [rows, setRows] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) throw new Error("CSV must have header + data rows");
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
    return lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ""; });
      return obj;
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target?.result as string);
        if (!parsed[0]?.fullName) { setError("CSV must have a 'fullName' column"); return; }
        setRows(parsed); setStep("preview");
      } catch (err: any) { setError(err.message); }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await api.post("/beneficiaries/bulk-import", { rows });
      setResult(res.data); setStep("result");
      queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });
    } catch (err: any) { setError(getApiErrorMessage(err)); }
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Bulk Import Beneficiaries</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {step === "upload" && (
            <div>
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-all">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <p className="font-medium text-slate-700">Click to upload CSV</p>
                <p className="text-xs text-slate-400 mt-1">Required column: fullName. Max 1000 rows.</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              </div>
              {error && <p className="text-red-600 text-xs mt-3 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{error}</p>}
              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                <p className="font-semibold text-slate-700 mb-1">CSV columns (use "CSV Template" button for sample):</p>
                <p className="font-mono text-[10px] leading-relaxed">{CSV_HEADERS.join(", ")}</p>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">{rows.length} rows ready</p>
                <button onClick={() => { setStep("upload"); setRows([]); }} className="btn-ghost text-xs">← Re-upload</button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>{["#", "fullName", "district", "village", "category", "aadhaar"].map(h => <th key={h} className="table-th py-2">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="table-td text-slate-400">{i + 2}</td>
                        <td className="table-td font-medium">{r.fullName || <span className="text-red-500">MISSING</span>}</td>
                        <td className="table-td">{r.district || "—"}</td>
                        <td className="table-td">{r.village || "—"}</td>
                        <td className="table-td">{r.category || "GENERAL"}</td>
                        <td className="table-td font-mono">{r.aadhaarNumber ? "****" + r.aadhaarNumber.slice(-4) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {error && <p className="text-red-600 text-xs mt-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{error}</p>}
            </div>
          )}

          {step === "result" && result && (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "Imported", value: result.imported, color: "text-green-700", bg: "bg-green-50", icon: CheckCircle2 },
                  { label: "Skipped / Errors", value: result.skipped, color: "text-red-700", bg: "bg-red-50", icon: AlertTriangle },
                ].map(s => { const Icon = s.icon; return (
                  <div key={s.label} className={cn("rounded-xl p-4 text-center", s.bg)}>
                    <Icon className={cn("w-5 h-5 mx-auto mb-1", s.color)} />
                    <p className={cn("text-2xl font-bold font-display", s.color)}>{s.value}</p>
                    <p className="text-xs text-slate-600">{s.label}</p>
                  </div>
                ); })}
              </div>
              {result.errors?.length > 0 && (
                <div className="border border-red-100 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  {result.errors.map((e: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 border-b border-red-50 last:border-0 text-xs">
                      <span className="text-slate-400 font-mono w-10">R{e.row}</span>
                      <span className="text-red-700 flex-1">{e.reason}</span>
                      <span className="text-slate-400 truncate max-w-24">{e.data?.fullName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          {step === "result" ? (
            <button onClick={onClose} className="btn-primary">Done</button>
          ) : step === "preview" ? (
            <>
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button onClick={handleImport} disabled={importing} className="btn-primary">
                {importing ? "Importing…" : <><Upload className="w-3.5 h-3.5" />Import {rows.length} records</>}
              </button>
            </>
          ) : <button onClick={onClose} className="btn-secondary">Cancel</button>}
        </div>
      </div>
    </div>
  );
}
