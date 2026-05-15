"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  ChevronDown, ChevronRight, Plus, Edit2, Trash2,
  Save, X, Layers, GitBranch, FolderOpen, Users,
  CheckCircle, Clock, RotateCcw, BarChart2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Component {
  id: number;
  name: string;
  code: string;
  description?: string;
  color?: string;
  sortOrder: number;
  active: boolean;
  subComponents: SubComponent[];
}

interface SubComponent {
  id: number;
  name: string;
  code: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  componentId: number;
  schemes: Scheme[];
}

interface Scheme {
  id: number;
  title: string;
  code: string;
  status: string;
  targetBeneficiaries: number;
  achievedBeneficiaries: number;
  _count?: { beneficiaries: number };
  subComponentId?: number;
}

interface SchemeStats {
  total: number;
  approved: number;
  pending: number;
  reverted: number;
  sc: number;
  st: number;
  obc: number;
  phh: number;
  general: number;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
const componentsApi = {
  list: () => api.get<Component[]>("/components").then(r => r.data),
  create: (dto: any) => api.post<Component>("/components", dto).then(r => r.data),
  update: (id: number, dto: any) => api.patch<Component>(`/components/${id}`, dto).then(r => r.data),
  remove: (id: number) => api.delete(`/components/${id}`).then(r => r.data),
  createSub: (dto: any) => api.post("/sub-components", dto).then(r => r.data),
  updateSub: (id: number, dto: any) => api.patch(`/sub-components/${id}`, dto).then(r => r.data),
  removeSub: (id: number) => api.delete(`/sub-components/${id}`).then(r => r.data),
  schemeStats: (id: number) => api.get<SchemeStats>(`/schemes/${id}/stats`).then(r => r.data),
};

const COMP_COLORS = [
  { value: "#15803d", label: "Green" },
  { value: "#d97706", label: "Amber" },
  { value: "#7c3aed", label: "Purple" },
  { value: "#0369a1", label: "Blue" },
  { value: "#be123c", label: "Red" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ComponentsPage() {
  const { isAdmin } = useAuth();
  const [expandedComponents, setExpandedComponents] = useState<Set<number>>(new Set([1]));
  const [expandedSubComponents, setExpandedSubComponents] = useState<Set<number>>(new Set());
  const [compDialog, setCompDialog] = useState<{ open: boolean; item?: Component }>({ open: false });
  const [subDialog, setSubDialog] = useState<{ open: boolean; item?: SubComponent; componentId?: number }>({ open: false });

  const { data: components = [], isLoading } = useQuery({
    queryKey: ["components"],
    queryFn: componentsApi.list,
  });

  const toggleComp = (id: number) => {
    setExpandedComponents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSub = (id: number) => {
    setExpandedSubComponents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalSchemes = components.reduce((a, c) =>
    a + c.subComponents.reduce((b, s) => b + s.schemes.length, 0), 0);

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Components", value: components.length, icon: Layers, color: "text-brand-700", bg: "bg-brand-50" },
          { label: "Sub-components", value: components.reduce((a, c) => a + c.subComponents.length, 0), icon: GitBranch, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Schemes", value: totalSchemes, icon: FolderOpen, color: "text-saffron-700", bg: "bg-saffron-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="stat-card flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.bg}`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 font-display">{s.value}</p>
                <p className="text-xs text-slate-600">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add component button */}
      {isAdmin && (
        <div className="flex justify-end">
          <button onClick={() => setCompDialog({ open: true })} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Component
          </button>
        </div>
      )}

      {/* Components tree */}
      {isLoading ? (
        <div className="card p-8 text-center text-slate-400">Loading components…</div>
      ) : components.length === 0 ? (
        <div className="card p-12 text-center">
          <Layers className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No components yet</p>
          <p className="text-slate-400 text-sm mt-1">Run the seed script or add components manually</p>
        </div>
      ) : (
        <div className="space-y-3">
          {components.map((comp) => (
            <ComponentCard
              key={comp.id}
              component={comp}
              expanded={expandedComponents.has(comp.id)}
              expandedSubs={expandedSubComponents}
              onToggle={() => toggleComp(comp.id)}
              onToggleSub={toggleSub}
              onEditComp={() => setCompDialog({ open: true, item: comp })}
              onAddSub={() => setSubDialog({ open: true, componentId: comp.id })}
              onEditSub={(sub) => setSubDialog({ open: true, item: sub })}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {compDialog.open && (
        <ComponentDialog
          component={compDialog.item}
          onClose={() => setCompDialog({ open: false })}
        />
      )}
      {subDialog.open && (
        <SubComponentDialog
          subComponent={subDialog.item}
          componentId={subDialog.componentId}
          components={components}
          onClose={() => setSubDialog({ open: false })}
        />
      )}
    </div>
  );
}

// ─── Component Card ───────────────────────────────────────────────────────────
function ComponentCard({
  component, expanded, expandedSubs, onToggle, onToggleSub,
  onEditComp, onAddSub, onEditSub, isAdmin,
}: any) {
  const qc = useQueryClient();
  const color = component.color || "#15803d";
  const totalSchemes = component.subComponents.reduce((a: number, s: SubComponent) => a + s.schemes.length, 0);

  const deleteMutation = useMutation({
    mutationFn: () => componentsApi.remove(component.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["components"] }); toast.success("Component deleted"); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="card overflow-hidden">
      {/* Component header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="flex-shrink-0 text-slate-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {component.code.split('-')[1]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900">{component.name}</p>
            <span className="badge bg-slate-100 text-slate-600 font-mono text-[10px]">{component.code}</span>
          </div>
          {component.description && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{component.description}</p>
          )}
        </div>
        <div className="flex items-center gap-4 mr-2">
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700">{component.subComponents.length}</p>
            <p className="text-[10px] text-slate-400">Sub-components</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700">{totalSchemes}</p>
            <p className="text-[10px] text-slate-400">Schemes</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEditComp} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-700 hover:bg-brand-50 transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onAddSub} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors" title="Add sub-component">
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => deleteMutation.mutate()} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Sub-components */}
      {expanded && (
        <div className="border-t border-slate-100">
          {component.subComponents.length === 0 ? (
            <div className="px-12 py-4 text-sm text-slate-400">No sub-components yet. Click + to add one.</div>
          ) : (
            component.subComponents.map((sub: SubComponent) => (
              <SubComponentRow
                key={sub.id}
                subComponent={sub}
                color={color}
                expanded={expandedSubs.has(sub.id)}
                onToggle={() => onToggleSub(sub.id)}
                onEdit={() => onEditSub(sub)}
                isAdmin={isAdmin}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-component Row ────────────────────────────────────────────────────────
function SubComponentRow({ subComponent, color, expanded, onToggle, onEdit, isAdmin }: any) {
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => componentsApi.removeSub(subComponent.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["components"] }); toast.success("Sub-component deleted"); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div>
      <div
        className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50"
        onClick={onToggle}
        style={{ borderLeft: `4px solid ${color}20` }}
      >
        <div className="ml-5 flex-shrink-0 text-slate-300">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
        <GitBranch className="w-4 h-4 flex-shrink-0" style={{ color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-800">{subComponent.name}</p>
            <span className="badge bg-slate-100 text-slate-500 font-mono text-[10px]">{subComponent.code}</span>
          </div>
          {subComponent.description && (
            <p className="text-xs text-slate-400 truncate">{subComponent.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 mr-2 text-sm">
          <span className="text-slate-500 text-xs">
            <strong className="text-slate-700">{subComponent.schemes.length}</strong> schemes
          </span>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-brand-700 hover:bg-brand-50">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={() => deleteMutation.mutate()} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Schemes grid */}
      {expanded && (
        <div className="px-12 py-4 bg-slate-50/50 border-b border-slate-100">
          {subComponent.schemes.length === 0 ? (
            <p className="text-sm text-slate-400">No schemes under this sub-component.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {subComponent.schemes.map((scheme: Scheme) => (
                <SchemeCard key={scheme.id} scheme={scheme} color={color} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Scheme Card ──────────────────────────────────────────────────────────────
function SchemeCard({ scheme, color }: { scheme: Scheme; color: string }) {
  const { data: stats } = useQuery({
    queryKey: ["scheme-stats", scheme.id],
    queryFn: () => componentsApi.schemeStats(scheme.id),
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{scheme.title}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{scheme.code}</p>
        </div>
        <span className={cn("badge flex-shrink-0 text-[10px]",
          scheme.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
        )}>
          {scheme.status}
        </span>
      </div>

      {/* Application stats */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[
          { label: "Approved", value: stats?.approved ?? 0, icon: CheckCircle, color: "text-green-600" },
          { label: "Pending", value: stats?.pending ?? 0, icon: Clock, color: "text-amber-600" },
          { label: "Reverted", value: stats?.reverted ?? 0, icon: RotateCcw, color: "text-red-500" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Icon className={`w-3 h-3 ${s.color}`} />
                <p className="text-sm font-bold text-slate-800">{s.value}</p>
              </div>
              <p className="text-[9px] text-slate-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Category breakdown */}
      <div className="flex flex-wrap gap-1">
        {[
          { label: "PHH", value: stats?.phh ?? 0 },
          { label: "SC", value: stats?.sc ?? 0 },
          { label: "ST", value: stats?.st ?? 0 },
          { label: "OBC", value: stats?.obc ?? 0 },
          { label: "Gen", value: stats?.general ?? 0 },
        ].map((cat) => (
          <span key={cat.label}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 font-medium"
          >
            <span className="font-bold" style={{ color }}>{cat.value}</span>
            {cat.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-white font-medium ml-auto">
          <Users className="w-2.5 h-2.5" />
          {stats?.total ?? 0} Total
        </span>
      </div>
    </div>
  );
}

// ─── Component Dialog ─────────────────────────────────────────────────────────
function ComponentDialog({ component, onClose }: { component?: Component; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: component?.name ?? "",
    code: component?.code ?? "",
    description: component?.description ?? "",
    color: component?.color ?? "#15803d",
    sortOrder: component?.sortOrder ?? 0,
  });

  const mutation = useMutation({
    mutationFn: () => component ? componentsApi.update(component.id, form) : componentsApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["components"] });
      toast.success(component ? "Component updated" : "Component created");
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{component ? "Edit Component" : "New Component"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">Component Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Climate Smart and Market Led Production" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Code *</label>
              <input className="form-input font-mono" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="COMP-1" />
            </div>
            <div>
              <label className="form-label">Sort Order</label>
              <input type="number" className="form-input" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="form-label">Color</label>
            <div className="flex gap-2 mt-1">
              {COMP_COLORS.map(c => (
                <button key={c.value} onClick={() => setForm({ ...form, color: c.value })}
                  className={cn("w-8 h-8 rounded-lg border-2 transition-all", form.color === c.value ? "border-slate-800 scale-110" : "border-transparent")}
                  style={{ backgroundColor: c.value }} title={c.label}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name || !form.code} className="btn-primary">
            {mutation.isPending ? "Saving…" : <><Save className="w-3.5 h-3.5" /> {component ? "Update" : "Create"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component Dialog ─────────────────────────────────────────────────────
function SubComponentDialog({ subComponent, componentId, components, onClose }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: subComponent?.name ?? "",
    code: subComponent?.code ?? "",
    description: subComponent?.description ?? "",
    sortOrder: subComponent?.sortOrder ?? 0,
    componentId: subComponent?.componentId ?? componentId ?? "",
  });

  const mutation = useMutation({
    mutationFn: () => subComponent ? componentsApi.updateSub(subComponent.id, form) : componentsApi.createSub(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["components"] });
      toast.success(subComponent ? "Sub-component updated" : "Sub-component created");
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{subComponent ? "Edit Sub-component" : "New Sub-component"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">Parent Component *</label>
            <select className="form-select" value={form.componentId} onChange={e => setForm({ ...form, componentId: Number(e.target.value) })}>
              <option value="">Select component…</option>
              {components.map((c: Component) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Sub-component Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Upscaling Collectivisation - Promotion of FPO" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Code *</label>
              <input className="form-input font-mono" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="SC-1.1" />
            </div>
            <div>
              <label className="form-label">Sort Order</label>
              <input type="number" className="form-input" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name || !form.code || !form.componentId} className="btn-primary">
            {mutation.isPending ? "Saving…" : <><Save className="w-3.5 h-3.5" /> {subComponent ? "Update" : "Create"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
