"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, schemesApi, getApiErrorMessage } from "@/lib/api";
import { formatCurrency, formatNumber, budgetUtilization, cn } from "@/lib/utils";
import {
  ChevronDown, ChevronRight, Plus, Edit2, Layers, FolderOpen,
  Tag, Users, Banknote, TrendingUp, X, Save, CheckCircle2,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

// ─── types ────────────────────────────────────────────────────────────────────
type Scheme = {
  id: number; title: string; code: string; department: string;
  status: string; budget: number; utilizedBudget: number;
  targetBeneficiaries: number; achievedBeneficiaries: number;
};
type SubComponent = {
  id: number; name: string; code: string; description?: string;
  schemes: Scheme[];
};
type Component = {
  id: number; name: string; code: string; description?: string;
  subComponents: SubComponent[];
};

export default function ComponentsPage() {
  const { canWrite } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [expandedSub, setExpandedSub] = useState<Record<number, boolean>>({});
  const [addSchemeDialog, setAddSchemeDialog] = useState<{ subComponentId: number; subComponentName: string } | null>(null);
  const [editScheme, setEditScheme] = useState<Scheme | null>(null);

  const { data: components = [], isLoading } = useQuery<Component[]>({
    queryKey: ["components-full"],
    queryFn: () => api.get("/components").then(r => r.data),
  });

  const toggleComp = (id: number) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const toggleSub = (id: number) => setExpandedSub(p => ({ ...p, [id]: !p[id] }));

  // Aggregate stats
  const totalSchemes = components.reduce((a, c) =>
    a + c.subComponents.reduce((b, sc) => b + sc.schemes.length, 0), 0);
  const totalBudget = components.reduce((a, c) =>
    a + c.subComponents.reduce((b, sc) =>
      b + sc.schemes.reduce((d, s) => d + (s.budget || 0), 0), 0), 0);
  const totalBeneficiaries = components.reduce((a, c) =>
    a + c.subComponents.reduce((b, sc) =>
      b + sc.schemes.reduce((d, s) => d + (s.targetBeneficiaries || 0), 0), 0), 0);

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Components", value: components.length, icon: Layers, color: "text-brand-700", bg: "bg-brand-50" },
          { label: "Sub-components", value: components.reduce((a, c) => a + c.subComponents.length, 0), icon: FolderOpen, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Schemes", value: totalSchemes, icon: Tag, color: "text-purple-700", bg: "bg-purple-50" },
          { label: "Target Beneficiaries", value: formatNumber(totalBeneficiaries), icon: Users, color: "text-saffron-700", bg: "bg-saffron-50" },
        ].map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="stat-card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
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

      {/* Component tree */}
      {isLoading ? (
        <div className="card p-8 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading components…</p>
        </div>
      ) : components.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Layers className="w-8 h-8 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No components found</p>
          <p className="text-xs mt-1">Run the seed script on the VPS to populate components and sub-components</p>
        </div>
      ) : (
        <div className="space-y-3">
          {components.map((comp, ci) => {
            const compBudget = comp.subComponents.reduce((a, sc) =>
              a + sc.schemes.reduce((b, s) => b + (s.budget || 0), 0), 0);
            const compUtilized = comp.subComponents.reduce((a, sc) =>
              a + sc.schemes.reduce((b, s) => b + (s.utilizedBudget || 0), 0), 0);
            const compBeneficiaries = comp.subComponents.reduce((a, sc) =>
              a + sc.schemes.reduce((b, s) => b + (s.targetBeneficiaries || 0), 0), 0);
            const compSchemes = comp.subComponents.reduce((a, sc) => a + sc.schemes.length, 0);
            const utilPct = budgetUtilization(compUtilized, compBudget);
            const isExpanded = expanded[comp.id] ?? true; // expanded by default

            return (
              <div key={comp.id} className="card overflow-hidden">
                {/* Component header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)" }}
                  onClick={() => toggleComp(comp.id)}
                >
                  <div className="w-8 h-8 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {ci + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-base">{comp.name}</p>
                      <span className="badge bg-brand-100 text-brand-700 font-mono text-[10px]">{comp.code}</span>
                    </div>
                    {comp.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{comp.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-6 mr-3">
                    <div className="text-center">
                      <p className="text-base font-bold text-brand-700 font-display">{comp.subComponents.length}</p>
                      <p className="text-[10px] text-slate-500">Sub-components</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-purple-700 font-display">{compSchemes}</p>
                      <p className="text-[10px] text-slate-500">Schemes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-saffron-700 font-display">{formatNumber(compBeneficiaries)}</p>
                      <p className="text-[10px] text-slate-500">Target Beneficiaries</p>
                    </div>
                    {compBudget > 0 && (
                      <div className="w-28">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Budget utilized</span>
                          <span className="font-semibold">{Math.round(utilPct)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-600 rounded-full" style={{ width: `${Math.min(utilPct, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </div>

                {/* Sub-components */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {comp.subComponents.map((sc, si) => {
                      const scBudget = sc.schemes.reduce((a, s) => a + (s.budget || 0), 0);
                      const scUtilized = sc.schemes.reduce((a, s) => a + (s.utilizedBudget || 0), 0);
                      const scBeneficiaries = sc.schemes.reduce((a, s) => a + (s.targetBeneficiaries || 0), 0);
                      const scUtilPct = budgetUtilization(scUtilized, scBudget);
                      const isSubExpanded = expandedSub[sc.id] ?? false;

                      return (
                        <div key={sc.id} className="border-b border-slate-50 last:border-0">
                          {/* Sub-component header */}
                          <div
                            className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-blue-50/40 transition-colors"
                            onClick={() => toggleSub(sc.id)}
                          >
                            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {si + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-800 text-sm">{sc.name}</p>
                                <span className="badge bg-blue-100 text-blue-700 font-mono text-[10px]">{sc.code}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-5 mr-2">
                              <div className="text-center">
                                <p className="text-sm font-bold text-purple-700 font-display">{sc.schemes.length}</p>
                                <p className="text-[10px] text-slate-400">Schemes</p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-bold text-saffron-700 font-display">{formatNumber(scBeneficiaries)}</p>
                                <p className="text-[10px] text-slate-400">Beneficiaries</p>
                              </div>
                              {scBudget > 0 && (
                                <div className="text-center">
                                  <p className="text-sm font-bold text-slate-700 font-display">{Math.round(scUtilPct)}%</p>
                                  <p className="text-[10px] text-slate-400">Utilized</p>
                                </div>
                              )}
                              {canWrite && (
                                <button
                                  onClick={e => { e.stopPropagation(); setAddSchemeDialog({ subComponentId: sc.id, subComponentName: sc.name }); }}
                                  className="btn-ghost text-xs py-1 px-2 gap-1 text-brand-700 hover:bg-brand-50"
                                >
                                  <Plus className="w-3 h-3" /> Add Scheme
                                </button>
                              )}
                            </div>
                            {isSubExpanded
                              ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                          </div>

                          {/* Schemes table */}
                          {isSubExpanded && sc.schemes.length > 0 && (
                            <div className="mx-6 mb-3 rounded-xl overflow-hidden border border-slate-200">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="table-th">Scheme</th>
                                    <th className="table-th">Code</th>
                                    <th className="table-th">Department</th>
                                    <th className="table-th">Status</th>
                                    <th className="table-th text-right">Budget</th>
                                    <th className="table-th">Utilization</th>
                                    <th className="table-th text-right">Beneficiaries</th>
                                    {canWrite && <th className="table-th" />}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sc.schemes.map(scheme => {
                                    const util = budgetUtilization(scheme.utilizedBudget, scheme.budget);
                                    const statusColors: Record<string, string> = {
                                      ACTIVE: "bg-green-100 text-green-700",
                                      DRAFT: "bg-slate-100 text-slate-600",
                                      CLOSED: "bg-red-100 text-red-700",
                                    };
                                    return (
                                      <tr key={scheme.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                                        <td className="table-td font-medium text-slate-800">{scheme.title}</td>
                                        <td className="table-td font-mono text-xs text-slate-500">{scheme.code}</td>
                                        <td className="table-td text-xs text-slate-600">{scheme.department}</td>
                                        <td className="table-td">
                                          <span className={cn("badge text-xs", statusColors[scheme.status] ?? "bg-slate-100 text-slate-600")}>
                                            {scheme.status}
                                          </span>
                                        </td>
                                        <td className="table-td text-right text-xs font-medium text-slate-700">
                                          {scheme.budget > 0 ? formatCurrency(scheme.budget) : "—"}
                                        </td>
                                        <td className="table-td w-28">
                                          {scheme.budget > 0 ? (
                                            <div className="flex items-center gap-1.5">
                                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-brand-600 rounded-full" style={{ width: `${Math.min(util, 100)}%` }} />
                                              </div>
                                              <span className="text-[10px] text-slate-500 w-7">{Math.round(util)}%</span>
                                            </div>
                                          ) : <span className="text-slate-300 text-xs">—</span>}
                                        </td>
                                        <td className="table-td text-right text-xs">
                                          <span className="font-semibold text-brand-700">{scheme.achievedBeneficiaries}</span>
                                          <span className="text-slate-400"> / {scheme.targetBeneficiaries}</span>
                                        </td>
                                        {canWrite && (
                                          <td className="table-td">
                                            <button
                                              onClick={() => setEditScheme(scheme)}
                                              className="btn-ghost text-xs py-1">
                                              <Edit2 className="w-3 h-3" />
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {isSubExpanded && sc.schemes.length === 0 && (
                            <div className="mx-6 mb-3 py-4 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
                              No schemes assigned to this sub-component yet.
                              {canWrite && (
                                <button
                                  onClick={() => setAddSchemeDialog({ subComponentId: sc.id, subComponentName: sc.name })}
                                  className="ml-2 text-brand-700 hover:underline font-medium"
                                >
                                  Add one →
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Scheme Dialog */}
      {addSchemeDialog && (
        <SchemeFormDialog
          mode="create"
          subComponentId={addSchemeDialog.subComponentId}
          subComponentName={addSchemeDialog.subComponentName}
          onClose={() => setAddSchemeDialog(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["components-full"] });
            queryClient.invalidateQueries({ queryKey: ["schemes"] });
            setAddSchemeDialog(null);
          }}
        />
      )}

      {/* Edit Scheme Dialog */}
      {editScheme && (
        <SchemeFormDialog
          mode="edit"
          scheme={editScheme}
          onClose={() => setEditScheme(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["components-full"] });
            queryClient.invalidateQueries({ queryKey: ["schemes"] });
            setEditScheme(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Scheme Form Dialog ───────────────────────────────────────────────────────
function SchemeFormDialog({ mode, subComponentId, subComponentName, scheme, onClose, onSuccess }: {
  mode: "create" | "edit";
  subComponentId?: number;
  subComponentName?: string;
  scheme?: Scheme;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: scheme?.title ?? "",
    code: scheme?.code ?? "",
    department: scheme?.department ?? "",
    budget: scheme?.budget ?? 0,
    targetBeneficiaries: scheme?.targetBeneficiaries ?? 0,
    status: scheme?.status ?? "ACTIVE",
    subComponentId: subComponentId ?? undefined,
  });

  const mutation = useMutation({
    mutationFn: () => mode === "create"
      ? api.post("/schemes", form).then(r => r.data)
      : api.patch(`/schemes/${scheme!.id}`, form).then(r => r.data),
    onSuccess: () => {
      toast.success(mode === "create" ? "Scheme created" : "Scheme updated");
      onSuccess();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">
              {mode === "create" ? "Add Scheme" : "Edit Scheme"}
            </h2>
            {subComponentName && (
              <p className="text-xs text-slate-500 mt-0.5">Under: {subComponentName}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">Scheme Title *</label>
            <input className="form-input" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Code *</label>
              <input className="form-input font-mono" value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. SC11-FPO-NEW" />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="form-label">Department</label>
              <input className="form-input" value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
                placeholder="DoAJ, DoHK…" />
            </div>
            <div>
              <label className="form-label">Target Beneficiaries</label>
              <input type="number" className="form-input" value={form.targetBeneficiaries}
                onChange={e => setForm({ ...form, targetBeneficiaries: Number(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Budget (₹)</label>
              <input type="number" className="form-input" value={form.budget}
                onChange={e => setForm({ ...form, budget: Number(e.target.value) })} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title || !form.code}
            className="btn-primary">
            {mutation.isPending ? "Saving…" : <><Save className="w-3.5 h-3.5" />{mode === "create" ? "Create" : "Update"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
