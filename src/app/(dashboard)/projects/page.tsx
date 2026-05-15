"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, schemesApi, getApiErrorMessage } from "@/lib/api";
import { Project, CreateProjectDto, ProjectStatus } from "@/types";
import {
  formatCurrency, formatDate, getProjectStatusMeta, getPriorityMeta,
  budgetUtilization, DISTRICTS_JK, cn,
} from "@/lib/utils";
import { Plus, Search, Save, X, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

export default function ProjectsPage() {
  const { canWrite } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Project | null>(null);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });

  const { data: schemes = [] } = useQuery({ queryKey: ["schemes"], queryFn: schemesApi.list });

  const filtered = projects.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchDistrict = districtFilter === "ALL" || p.district === districtFilter;
    return matchSearch && matchStatus && matchDistrict;
  });

  const statusUpdateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      projectsApi.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); toast.success("Status updated"); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search projects…" className="form-input pl-8 w-64 py-1.5 text-sm"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select w-auto py-1.5 text-sm" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="ALL">All Status</option>
            <option value="PLANNED">Planned</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
            <option value="ON_HOLD">On Hold</option>
          </select>
          <select className="form-select w-auto py-1.5 text-sm" value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}>
            <option value="ALL">All Districts</option>
            {DISTRICTS_JK.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {canWrite && (
          <button onClick={() => { setEditItem(null); setDialogOpen(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Project
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="table-th">Project</th>
              <th className="table-th">District</th>
              <th className="table-th">Status</th>
              <th className="table-th">Priority</th>
              <th className="table-th text-right">Budget</th>
              <th className="table-th">Utilization</th>
              <th className="table-th text-right">Progress</th>
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
              <tr><td colSpan={8} className="table-td text-center py-12 text-slate-400">No projects found.</td></tr>
            ) : (
              filtered.map((p) => {
                const statusMeta = getProjectStatusMeta(p.status);
                const priorityMeta = getPriorityMeta(p.priority);
                const util = budgetUtilization(p.utilizedBudget, p.budget);
                const progress = p.targetCount > 0 ? Math.min((p.achievedCount / p.targetCount) * 100, 100) : 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-td">
                      <p className="font-medium text-slate-800">{p.name}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <span className="font-mono">{p.code}</span>
                        {p.scheme && <><span>·</span><span>{p.scheme.title}</span></>}
                      </div>
                    </td>
                    <td className="table-td">
                      {p.district ? (
                        <span className="flex items-center gap-1 text-slate-600 text-xs">
                          <MapPin className="w-3 h-3" />{p.district}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="table-td">
                      <select
                        className={cn("badge border-0 outline-none cursor-pointer", statusMeta.color)}
                        value={p.status}
                        onChange={(e) => statusUpdateMutation.mutate({ id: p.id, status: e.target.value })}
                        disabled={!canWrite}
                      >
                        {["PLANNED", "ONGOING", "COMPLETED", "ON_HOLD"].map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="table-td">
                      <span className={cn("badge", priorityMeta.color)}>{priorityMeta.label}</span>
                    </td>
                    <td className="table-td text-right font-medium">{formatCurrency(p.budget)}</td>
                    <td className="table-td w-32">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-saffron-500 rounded-full" style={{ width: `${util}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-500 w-6">{Math.round(util)}%</span>
                      </div>
                    </td>
                    <td className="table-td text-right">
                      <span className="text-brand-700 font-semibold">{p.achievedCount}</span>
                      <span className="text-slate-400"> / {p.targetCount}</span>
                    </td>
                    {canWrite && (
                      <td className="table-td">
                        <button onClick={() => { setEditItem(p); setDialogOpen(true); }} className="btn-ghost text-xs py-1">
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
        <ProjectDialog
          project={editItem}
          schemes={schemes}
          onClose={() => { setDialogOpen(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

function ProjectDialog({ project, schemes, onClose }: { project: Project | null; schemes: any[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateProjectDto>({
    name: project?.name ?? "",
    code: project?.code ?? "",
    description: project?.description ?? "",
    department: project?.department ?? "",
    district: project?.district ?? "",
    block: project?.block ?? "",
    priority: project?.priority ?? "MEDIUM",
    budget: project?.budget ?? 0,
    targetCount: project?.targetCount ?? 0,
    startDate: project?.startDate?.split("T")[0] ?? "",
    endDate: project?.endDate?.split("T")[0] ?? "",
    schemeId: project?.schemeId,
  });

  const mutation = useMutation({
    mutationFn: () => project ? projectsApi.update(project.id, form) : projectsApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(project ? "Project updated" : "Project created");
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{project ? "Edit Project" : "New Project"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="form-label">Project Name *</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="form-label">Code *</label>
              <input className="form-input font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><label className="form-label">Department</label>
              <input className="form-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            <div><label className="form-label">District</label>
              <select className="form-select" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                <option value="">Select…</option>
                {DISTRICTS_JK.map((d) => <option key={d}>{d}</option>)}
              </select></div>
            <div><label className="form-label">Block</label>
              <input className="form-input" value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} /></div>
            <div><label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })}>
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => <option key={p}>{p}</option>)}
              </select></div>
            <div><label className="form-label">Scheme</label>
              <select className="form-select" value={form.schemeId ?? ""} onChange={(e) => setForm({ ...form, schemeId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">None</option>
                {schemes.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select></div>
            <div><label className="form-label">Budget (₹)</label>
              <input type="number" className="form-input" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} /></div>
            <div><label className="form-label">Target Count</label>
              <input type="number" className="form-input" value={form.targetCount} onChange={(e) => setForm({ ...form, targetCount: Number(e.target.value) })} /></div>
            <div><label className="form-label">Start Date</label>
              <input type="date" className="form-input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><label className="form-label">End Date</label>
              <input type="date" className="form-input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            <div className="col-span-2"><label className="form-label">Description</label>
              <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name || !form.code} className="btn-primary">
            {mutation.isPending ? "Saving…" : <><Save className="w-3.5 h-3.5" /> {project ? "Update" : "Create"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
