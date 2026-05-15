"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logframeApi, getApiErrorMessage } from "@/lib/api";
import {
  LogframeNode,
  Indicator,
  UpsertProgressDto,
} from "@/types";
import {
  getLogframeLevelMeta,
  progressColor,
  formatPercent,
  CURRENT_YEAR,
  PROJECT_YEARS,
  cn,
} from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Target,
  TrendingUp,
  Calendar,
  X,
  Save,
  AlertCircle,
  CheckCircle2,
  Circle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

export default function LogframePage() {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);

  const { data: tree, isLoading } = useQuery({
    queryKey: ["logframe-tree"],
    queryFn: logframeApi.getTree,
  });

  const { canWrite } = useAuth();

  const toggleNode = (id: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!tree) return;
    const ids = new Set<number>();
    const collect = (nodes: LogframeNode[]) =>
      nodes.forEach((n) => { ids.add(n.id); collect(n.children); });
    collect(tree);
    setExpandedNodes(ids);
  };

  const collapseAll = () => setExpandedNodes(new Set());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-brand-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading logframe…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Controls bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <label className="form-label inline">Reporting Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="form-select w-auto ml-2 py-1.5 text-sm"
            >
              {PROJECT_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button onClick={expandAll} className="btn-ghost text-xs">Expand All</button>
          <button onClick={collapseAll} className="btn-ghost text-xs">Collapse All</button>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-brand-600" /> On target</span>
          <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Off track</span>
          <span className="flex items-center gap-1"><Circle className="w-3.5 h-3.5 text-slate-400" /> No data</span>
        </div>
      </div>

      {/* Logframe tree */}
      <div className="card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_90px_90px_100px_120px_80px] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div>Results Hierarchy / Indicator</div>
          <div className="text-right">Baseline</div>
          <div className="text-right">Mid Target</div>
          <div className="text-right">End Target</div>
          <div className="text-right">Annual Result</div>
          <div>Progress</div>
          <div></div>
        </div>

        {/* Tree rows */}
        <div className="divide-y divide-slate-50">
          {(tree ?? []).map((node) => (
            <LogframeNodeRow
              key={node.id}
              node={node}
              depth={0}
              expanded={expandedNodes}
              selectedYear={selectedYear}
              onToggle={toggleNode}
              onEnterProgress={(ind) => {
                setSelectedIndicator(ind);
                setProgressDialogOpen(true);
              }}
              canWrite={canWrite}
            />
          ))}
        </div>

        {!tree?.length && (
          <div className="py-16 text-center text-slate-400">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No logframe data loaded yet.</p>
            <p className="text-xs mt-1">Contact your administrator to seed logframe data.</p>
          </div>
        )}
      </div>

      {/* Progress Entry Dialog */}
      {progressDialogOpen && selectedIndicator && (
        <ProgressEntryDialog
          indicator={selectedIndicator}
          year={selectedYear}
          onClose={() => { setProgressDialogOpen(false); setSelectedIndicator(null); }}
        />
      )}
    </div>
  );
}

// ─── Logframe Node Row ────────────────────────────────────────────────────────
function LogframeNodeRow({
  node, depth, expanded, selectedYear, onToggle, onEnterProgress, canWrite,
}: {
  node: LogframeNode;
  depth: number;
  expanded: Set<number>;
  selectedYear: number;
  onToggle: (id: number) => void;
  onEnterProgress: (ind: Indicator) => void;
  canWrite: boolean;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const hasIndicators = node.indicators.length > 0;
  const levelMeta = getLogframeLevelMeta(node.level);

  return (
    <>
      {/* Node header row */}
      <div
        className={cn(
          "grid grid-cols-[1fr_80px_90px_90px_100px_120px_80px] gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer",
          depth === 0 ? "bg-slate-50/80" : "bg-white"
        )}
        onClick={() => onToggle(node.id)}
        style={{ paddingLeft: `${16 + depth * 20}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-slate-400">
            {hasChildren || hasIndicators ? (
              isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
            ) : null}
          </div>
          <span className={cn("badge flex-shrink-0", levelMeta.color)}>{levelMeta.label}</span>
          <span className={cn("truncate font-medium", depth === 0 ? "text-sm text-slate-800" : "text-sm text-slate-700")}>
            {node.title}
          </span>
          <span className="text-xs text-slate-400 font-mono flex-shrink-0">{node.code}</span>
        </div>
        <div /><div /><div /><div /><div /><div />
      </div>

      {/* Indicators */}
      {isExpanded && hasIndicators && node.indicators.map((ind) => (
        <IndicatorRow
          key={ind.id}
          indicator={ind}
          depth={depth + 1}
          selectedYear={selectedYear}
          onEnterProgress={onEnterProgress}
          canWrite={canWrite}
        />
      ))}

      {/* Children */}
      {isExpanded && node.children.map((child) => (
        <LogframeNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          selectedYear={selectedYear}
          onToggle={onToggle}
          onEnterProgress={onEnterProgress}
          canWrite={canWrite}
        />
      ))}
    </>
  );
}

// ─── Indicator Row ────────────────────────────────────────────────────────────
function IndicatorRow({
  indicator, depth, selectedYear, onEnterProgress, canWrite,
}: {
  indicator: Indicator;
  depth: number;
  selectedYear: number;
  onEnterProgress: (ind: Indicator) => void;
  canWrite: boolean;
}) {
  const yearProgress = indicator.yearlyProgress?.find((p) => p.reportYear === selectedYear);
  const annualResult = yearProgress?.annualResult ?? null;
  const annualTarget = yearProgress?.annualTarget ?? indicator.endTarget ?? 0;
  const pct = annualTarget > 0 && annualResult !== null
    ? Math.min((annualResult / annualTarget) * 100, 150)
    : 0;

  const statusIcon = annualResult === null
    ? <Circle className="w-3.5 h-3.5 text-slate-300" />
    : pct >= 75
      ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
      : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;

  return (
    <div
      className="grid grid-cols-[1fr_80px_90px_90px_100px_120px_80px] gap-2 px-4 py-2 hover:bg-blue-50/30 transition-colors border-l-2 border-brand-200"
      style={{ paddingLeft: `${16 + depth * 20}px` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">{statusIcon}</div>
        <div className="min-w-0">
          <p className="text-xs text-slate-700 truncate font-medium">{indicator.name}</p>
          <p className="text-[10px] text-slate-400 font-mono">{indicator.code} · {indicator.unit ?? "—"}</p>
        </div>
      </div>
      <div className="text-xs text-right text-slate-500 self-center">
        {indicator.baseline ?? "—"}
      </div>
      <div className="text-xs text-right text-slate-500 self-center">
        {indicator.midTarget ?? "—"}
      </div>
      <div className="text-xs text-right font-medium text-slate-700 self-center">
        {indicator.endTarget ?? "—"}
      </div>
      <div className="text-xs text-right font-semibold self-center" style={{ color: annualResult !== null ? "#15803d" : "#94a3b8" }}>
        {annualResult !== null ? annualResult : "—"}
      </div>
      <div className="self-center">
        {annualResult !== null ? (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", progressColor(pct))}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-slate-600 w-8 text-right">
              {Math.round(pct)}%
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-300">No data</span>
        )}
      </div>
      <div className="self-center flex justify-end">
        {canWrite && (
          <button
            onClick={() => onEnterProgress(indicator)}
            className="inline-flex items-center gap-1 text-[10px] text-brand-700 hover:text-brand-800 hover:bg-brand-50 px-2 py-1 rounded transition-colors font-medium"
          >
            <Edit2 className="w-3 h-3" />
            Enter
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Progress Entry Dialog ────────────────────────────────────────────────────
function ProgressEntryDialog({
  indicator, year, onClose,
}: {
  indicator: Indicator;
  year: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const existing = indicator.yearlyProgress?.find((p) => p.reportYear === year);

  const [form, setForm] = useState<Partial<UpsertProgressDto>>({
    reportYear: year,
    annualTarget: existing?.annualTarget ?? indicator.endTarget ?? undefined,
    annualResult: existing?.annualResult ?? undefined,
    cumulativeTarget: existing?.cumulativeTarget ?? undefined,
    cumulativeResult: existing?.cumulativeResult ?? undefined,
    maleValue: existing?.maleValue ?? undefined,
    femaleValue: existing?.femaleValue ?? undefined,
    youthValue: existing?.youthValue ?? undefined,
    indigenousValue: existing?.indigenousValue ?? undefined,
    householdValue: existing?.householdValue ?? undefined,
    district: existing?.district ?? undefined,
    evidenceSource: existing?.evidenceSource ?? undefined,
    remarks: existing?.remarks ?? undefined,
  });

  const mutation = useMutation({
    mutationFn: (dto: UpsertProgressDto) =>
      logframeApi.upsertProgress(indicator.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logframe-tree"] });
      queryClient.invalidateQueries({ queryKey: ["logframe-dashboard"] });
      toast.success("Progress saved successfully");
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const handleSave = () => {
    mutation.mutate(form as UpsertProgressDto);
  };

  const n = (v: any) => (v !== undefined && v !== "" ? Number(v) : undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="min-w-0 pr-4">
            <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-0.5">
              Enter Progress — {year}
            </p>
            <h2 className="font-semibold text-slate-900 text-sm leading-snug">{indicator.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {indicator.code} · Unit: {indicator.unit ?? "—"} · {indicator.frequency}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Baseline reference */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex gap-6 text-xs">
            <span className="text-slate-500">Baseline: <strong className="text-slate-700">{indicator.baseline ?? "—"}</strong></span>
            <span className="text-slate-500">Mid Target: <strong className="text-slate-700">{indicator.midTarget ?? "—"}</strong></span>
            <span className="text-slate-500">End Target: <strong className="text-slate-700">{indicator.endTarget ?? "—"}</strong></span>
            <span className="text-slate-500">Source: <strong className="text-slate-700">{indicator.source ?? "—"}</strong></span>
          </div>
        </div>

        {/* Form body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Core progress */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Core Progress</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Annual Target</label>
                <input type="number" className="form-input" value={form.annualTarget ?? ""}
                  onChange={(e) => setForm({ ...form, annualTarget: n(e.target.value) })} />
              </div>
              <div>
                <label className="form-label">Annual Result *</label>
                <input type="number" className="form-input" value={form.annualResult ?? ""}
                  onChange={(e) => setForm({ ...form, annualResult: n(e.target.value) })} />
              </div>
              <div>
                <label className="form-label">Cumulative Target</label>
                <input type="number" className="form-input" value={form.cumulativeTarget ?? ""}
                  onChange={(e) => setForm({ ...form, cumulativeTarget: n(e.target.value) })} />
              </div>
              <div>
                <label className="form-label">Cumulative Result</label>
                <input type="number" className="form-input" value={form.cumulativeResult ?? ""}
                  onChange={(e) => setForm({ ...form, cumulativeResult: n(e.target.value) })} />
              </div>
            </div>
          </div>

          {/* Breakdowns */}
          {(indicator.supportsGenderBreakdown || indicator.supportsYouthBreakdown || indicator.supportsIndigenousBreakdown) && (
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Disaggregation</p>
              <div className="grid grid-cols-3 gap-3">
                {indicator.supportsGenderBreakdown && (
                  <>
                    <div>
                      <label className="form-label">Male</label>
                      <input type="number" className="form-input" value={form.maleValue ?? ""}
                        onChange={(e) => setForm({ ...form, maleValue: n(e.target.value) })} />
                    </div>
                    <div>
                      <label className="form-label">Female</label>
                      <input type="number" className="form-input" value={form.femaleValue ?? ""}
                        onChange={(e) => setForm({ ...form, femaleValue: n(e.target.value) })} />
                    </div>
                  </>
                )}
                {indicator.supportsYouthBreakdown && (
                  <div>
                    <label className="form-label">Youth</label>
                    <input type="number" className="form-input" value={form.youthValue ?? ""}
                      onChange={(e) => setForm({ ...form, youthValue: n(e.target.value) })} />
                  </div>
                )}
                {indicator.supportsIndigenousBreakdown && (
                  <div>
                    <label className="form-label">Indigenous</label>
                    <input type="number" className="form-input" value={form.indigenousValue ?? ""}
                      onChange={(e) => setForm({ ...form, indigenousValue: n(e.target.value) })} />
                  </div>
                )}
                {indicator.supportsHouseholdBreakdown && (
                  <div>
                    <label className="form-label">Households</label>
                    <input type="number" className="form-input" value={form.householdValue ?? ""}
                      onChange={(e) => setForm({ ...form, householdValue: n(e.target.value) })} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evidence & remarks */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Evidence Source</label>
              <input type="text" className="form-input" placeholder="Survey, MIS data…"
                value={form.evidenceSource ?? ""}
                onChange={(e) => setForm({ ...form, evidenceSource: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Remarks</label>
              <input type="text" className="form-input" placeholder="Optional notes…"
                value={form.remarks ?? ""}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Save Progress</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
