"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schemesApi, getApiErrorMessage, api } from "@/lib/api";
import { Scheme, CreateSchemeDto, SchemeStatus } from "@/types";
import { formatCurrency, formatDate, getSchemeStatusMeta, budgetUtilization, cn } from "@/lib/utils";
import { Plus, Search, X, Save, FolderOpen, Banknote, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

// Fetch sub-components with their parent component names
function useSubComponents() {
  return useQuery({
    queryKey: ["sub-components"],
    queryFn: () => api.get("/sub-components").then(r => r.data as any[]),
  });
}

export default function SchemesPage() {
  const { canWrite } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SchemeStatus | "ALL">("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Scheme | null>(null);
  const queryClient = useQueryClient();

  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ["schemes"],
    queryFn: schemesApi.list,
  });

  const filtered = schemes.filter((s) => {
    const matchSearch =
      !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Schemes",
            value: schemes.length,
            icon: FolderOpen,
            color: "text-brand-700",
            bg: "bg-brand-50",
          },
          {
            label: "Total Budget",
            value: formatCurrency(schemes.reduce((a, s) => a + s.budget, 0)),
            icon: Banknote,
            color: "text-blue-700",
            bg: "bg-blue-50",
          },
          {
            label: "Beneficiaries Targeted",
            value: schemes.reduce((a, s) => a + s.targetBeneficiaries, 0).toLocaleString(),
            icon: Users,
            color: "text-purple-700",
            bg: "bg-purple-50",
          },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="stat-card flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.bg}`}>
                <Icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 font-display">{c.value}</p>
                <p className="text-xs text-slate-600">{c.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search schemes…"
              className="form-input pl-8 w-64 py-1.5 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select w-auto py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        {canWrite && (
          <button
            onClick={() => { setEditItem(null); setDialogOpen(true); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> Add Scheme
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-th">Scheme / Code</th>
              <th className="table-th">Component</th>
              <th className="table-th">Department</th>
              <th className="table-th">Status</th>
              <th className="table-th text-right">Budget</th>
              <th className="table-th">Utilization</th>
              <th className="table-th text-right">Beneficiaries</th>
              <th className="table-th">Created</th>
              {canWrite && <th className="table-th" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="table-td">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-td text-center py-12 text-slate-400">
                  No schemes found.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const statusMeta = getSchemeStatusMeta(s.status);
                const util = budgetUtilization(s.utilizedBudget, s.budget);
                const subComp = (s as any).subComponent;
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-td">
                      <p className="font-medium text-slate-800">{s.title}</p>
                      <p className="text-xs text-slate-400 font-mono">{s.code}</p>
                    </td>
                    <td className="table-td">
                      {subComp ? (
                        <div>
                          <p className="text-xs font-medium text-brand-700">{subComp.component?.name ?? "—"}</p>
                          <p className="text-xs text-slate-400">{subComp.name}</p>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">Not assigned</span>
                      )}
                    </td>
                    <td className="table-td text-slate-600">{s.department}</td>
                    <td className="table-td">
                      <span className={cn("badge", statusMeta.color)}>{statusMeta.label}</span>
                    </td>
                    <td className="table-td text-right font-medium">{formatCurrency(s.budget)}</td>
                    <td className="table-td w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-600 rounded-full"
                            style={{ width: `${util}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8">{Math.round(util)}%</span>
                      </div>
                    </td>
                    <td className="table-td text-right">
                      <span className="text-brand-700 font-semibold">{s.achievedBeneficiaries}</span>
                      <span className="text-slate-400"> / {s.targetBeneficiaries}</span>
                    </td>
                    <td className="table-td text-slate-500 text-xs">{formatDate(s.createdAt)}</td>
                    {canWrite && (
                      <td className="table-td">
                        <button
                          onClick={() => { setEditItem(s); setDialogOpen(true); }}
                          className="btn-ghost text-xs py-1"
                        >
                          Edit
                        </button>
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
        <SchemeDialog
          scheme={editItem}
          onClose={() => { setDialogOpen(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

function SchemeDialog({ scheme, onClose }: { scheme: Scheme | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: subComponents = [] } = useSubComponents();

  const [form, setForm] = useState<CreateSchemeDto & { subComponentId?: number }>({
    title: scheme?.title ?? "",
    code: scheme?.code ?? "",
    description: scheme?.description ?? "",
    department: scheme?.department ?? "",
    budget: scheme?.budget ?? 0,
    targetBeneficiaries: scheme?.targetBeneficiaries ?? 0,
    startDate: scheme?.startDate?.split("T")[0] ?? "",
    endDate: scheme?.endDate?.split("T")[0] ?? "",
    subComponentId: (scheme as any)?.subComponentId ?? undefined,
  });

  const mutation = useMutation({
    mutationFn: () =>
      scheme ? schemesApi.update(scheme.id, form) : schemesApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schemes"] });
      toast.success(scheme ? "Scheme updated" : "Scheme created");
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  // Group sub-components by component name for the dropdown
  const grouped = subComponents.reduce((acc: Record<string, any[]>, sub: any) => {
    const compName = sub.component?.name ?? "Uncategorized";
    if (!acc[compName]) acc[compName] = [];
    acc[compName].push(sub);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">
            {scheme ? "Edit Scheme" : "New Scheme"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Sub-component (Component → Sub-component) */}
          <div>
            <label className="form-label">Component → Sub-component</label>
            <select
              className="form-select"
              value={form.subComponentId ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  subComponentId: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            >
              <option value="">— Not assigned to a component —</option>
              {Object.entries(grouped).map(([compName, subs]) => (
                <optgroup key={compName} label={compName}>
                  {(subs as any[]).map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">Scheme Title *</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Code *</label>
              <input
                className="form-input font-mono"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. SC11-FPO-NEW"
              />
            </div>
            <div>
              <label className="form-label">Department *</label>
              <input
                className="form-input"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Agriculture, Horticulture…"
              />
            </div>
            <div>
              <label className="form-label">Budget (₹)</label>
              <input
                type="number"
                className="form-input"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="form-label">Target Beneficiaries</label>
              <input
                type="number"
                className="form-input"
                value={form.targetBeneficiaries}
                onChange={(e) =>
                  setForm({ ...form, targetBeneficiaries: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title || !form.code || !form.department}
            className="btn-primary"
          >
            {mutation.isPending ? (
              "Saving…"
            ) : (
              <><Save className="w-3.5 h-3.5" /> {scheme ? "Update" : "Create"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
