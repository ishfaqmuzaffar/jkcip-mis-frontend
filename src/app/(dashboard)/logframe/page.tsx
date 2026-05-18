"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, logframeApi, getApiErrorMessage } from "@/lib/api";
import { LogframeNode, Indicator, UpsertProgressDto } from "@/types";
import {
  formatPercent, formatNumber, progressColor, getLogframeLevelMeta,
  CURRENT_YEAR, PROJECT_YEARS, cn,
} from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  CheckCircle2, AlertCircle, Circle, ChevronDown, ChevronRight,
  Edit2, Save, X, LayoutGrid, List, Target, TrendingUp,
  TrendingDown, Minus, Eye, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

// ─── helpers ──────────────────────────────────────────────────────────────────
function achievementColor(pct: number, hasData: boolean) {
  if (!hasData) return { bg: "bg-slate-100", text: "text-slate-400", border: "border-slate-200", ring: "#e2e8f0" };
  if (pct >= 75) return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", ring: "#16a34a" };
  if (pct >= 50) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", ring: "#d97706" };
  return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", ring: "#dc2626" };
}

function StatusIcon({ pct, hasData }: { pct: number; hasData: boolean }) {
  if (!hasData) return <Circle className="w-3.5 h-3.5 text-slate-300" />;
  if (pct >= 75) return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
  if (pct >= 50) return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
  return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
}

function TrendIcon({ current, previous }: { current?: number | null; previous?: number | null }) {
  if (!current || !previous) return <Minus className="w-3 h-3 text-slate-300" />;
  if (current > previous) return <TrendingUp className="w-3 h-3 text-green-600" />;
  if (current < previous) return <TrendingDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-slate-400" />;
}

function getIndicatorStats(indicator: Indicator, year: number) {
  const prog = indicator.yearlyProgress?.find(p => p.reportYear === year);
  const prevProg = indicator.yearlyProgress?.find(p => p.reportYear === year - 1);
  const result = prog?.annualResult ?? null;
  const target = prog?.annualTarget ?? indicator.endTarget ?? 0;
  const pct = target > 0 && result !== null ? Math.min((result / target) * 100, 150) : 0;
  return { prog, prevProg, result, target, pct, hasData: result !== null };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LogframePage() {
  const [view, setView] = useState<"overview" | "monitor">("overview");
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const { canWrite } = useAuth();

  const { data: tree = [], isLoading } = useQuery({
    queryKey: ["logframe-tree"],
    queryFn: logframeApi.getTree,
  });

  const { data: summary } = useQuery({
    queryKey: ["logframe-summary", selectedYear],
    queryFn: () => api.get(`/logframe/dashboard/summary?year=${selectedYear}`).then(r => r.data).catch(() => null),
  });

  const { data: outcomesData } = useQuery({
    queryKey: ["logframe-outcomes", selectedYear],
    queryFn: () => api.get(`/logframe/dashboard/outcomes?year=${selectedYear}`).then(r => r.data).catch(() => []),
  });

  // Pull just the Outcomes from the tree
  const outcomes = tree.filter(n => n.level === "OUTCOME");

  // Compute overall stats from tree
  let totalIndicators = 0, onTarget = 0, offTrack = 0, noData = 0;
  function countIndicators(nodes: LogframeNode[]) {
    for (const node of nodes) {
      for (const ind of node.indicators) {
        totalIndicators++;
        const { pct, hasData } = getIndicatorStats(ind, selectedYear);
        if (!hasData) noData++;
        else if (pct >= 75) onTarget++;
        else offTrack++;
      }
      countIndicators(node.children);
    }
  }
  countIndicators(tree);

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex bg-white border border-slate-200 rounded-lg p-1 gap-1">
          <button onClick={() => setView("overview")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              view === "overview" ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50"
            )}>
            <LayoutGrid className="w-3.5 h-3.5" /> Overview
          </button>
          <button onClick={() => setView("monitor")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              view === "monitor" ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50"
            )}>
            <List className="w-3.5 h-3.5" /> Full Logframe
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Reporting Year</span>
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 gap-0.5">
            {PROJECT_YEARS.filter(y => y <= CURRENT_YEAR + 1).map(y => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className={cn("px-3 py-1 rounded-md text-xs font-semibold transition-colors",
                  selectedYear === y ? "bg-brand-700 text-white" : "text-slate-500 hover:bg-slate-50"
                )}>
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary banner */}
      <div className="rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4"
        style={{ background: "linear-gradient(135deg, #1a3a2a 0%, #2d6b4e 100%)" }}>
        {[
          { label: "Total Indicators", value: totalIndicators, sub: "in logframe" },
          { label: "On Target", value: onTarget, sub: `≥75% achievement`, color: "#4ade80" },
          { label: "Off Track", value: offTrack, sub: "<75% achievement", color: "#fbbf24" },
          { label: "No Data Yet", value: noData, sub: "awaiting entry", color: "#94a3b8" },
        ].map(s => (
          <div key={s.label} className="text-center">
            <p className="text-3xl font-bold font-display" style={{ color: s.color ?? "white" }}>
              {s.value}
            </p>
            <p className="text-white/80 text-xs font-medium mt-0.5">{s.label}</p>
            <p className="text-white/40 text-[10px]">{s.sub}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-slate-400">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading logframe…</p>
          </div>
        </div>
      ) : view === "overview" ? (
        <OverviewView outcomes={outcomes} selectedYear={selectedYear} canWrite={canWrite} />
      ) : (
        <MonitorView tree={tree} selectedYear={selectedYear} canWrite={canWrite} />
      )}
    </div>
  );
}

// ─── Overview: Outcome Cards ──────────────────────────────────────────────────
function OverviewView({ outcomes, selectedYear, canWrite }: {
  outcomes: LogframeNode[]; selectedYear: number; canWrite: boolean;
}) {
  const [expandedOutcome, setExpandedOutcome] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {outcomes.map((outcome) => {
          // Count indicators and stats
          let total = 0, onTarget = 0, offTrack = 0, noData = 0, sumPct = 0;
          function collectStats(node: LogframeNode) {
            for (const ind of node.indicators) {
              const { pct, hasData } = getIndicatorStats(ind, selectedYear);
              total++;
              sumPct += hasData ? pct : 0;
              if (!hasData) noData++;
              else if (pct >= 75) onTarget++;
              else offTrack++;
            }
            node.children.forEach(collectStats);
          }
          collectStats(outcome);
          const avgPct = total > 0 ? sumPct / (total - noData || 1) : 0;
          const colors = achievementColor(avgPct, total > noData);
          const isExpanded = expandedOutcome === outcome.id;

          return (
            <div key={outcome.id}
              className={cn("card overflow-hidden border-2 transition-all", colors.border)}>
              {/* Card header */}
              <div className={cn("p-4 cursor-pointer", colors.bg)}
                onClick={() => setExpandedOutcome(isExpanded ? null : outcome.id)}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <span className="badge bg-white/70 text-slate-700 text-[10px] font-mono mb-1.5 block w-fit">
                      {outcome.code}
                    </span>
                    <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">
                      {outcome.title}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn("text-3xl font-bold font-display", colors.text)}>
                      {total > noData ? Math.round(avgPct) : "—"}
                      {total > noData ? "%" : ""}
                    </p>
                    <p className="text-[10px] text-slate-500">achievement</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(avgPct, 100)}%`,
                      backgroundColor: colors.ring,
                    }} />
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-700">
                    <CheckCircle2 className="w-3 h-3" />
                    {onTarget} on target
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="w-3 h-3" />
                    {offTrack} off track
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Circle className="w-3 h-3" />
                    {noData} no data
                  </span>
                  <span className="ml-auto text-slate-500">{total} indicators</span>
                </div>
              </div>

              {/* Expand toggle */}
              <button
                onClick={() => setExpandedOutcome(isExpanded ? null : outcome.id)}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs text-slate-500 hover:bg-slate-50 border-t border-slate-100 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                {isExpanded ? "Hide" : "View"} outputs & indicators
              </button>

              {/* Expanded: outputs + indicators */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {outcome.indicators.length > 0 && (
                    <IndicatorMiniTable indicators={outcome.indicators} year={selectedYear} nodeLabel="Outcome indicators" canWrite={canWrite} />
                  )}
                  {outcome.children.map(output => (
                    <div key={output.id}>
                      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{output.code}</span>
                        <p className="text-xs font-medium text-slate-700 mt-0.5 leading-tight">{output.title}</p>
                      </div>
                      {output.indicators.length > 0 && (
                        <IndicatorMiniTable indicators={output.indicators} year={selectedYear} nodeLabel={output.code} canWrite={canWrite} />
                      )}
                      {output.children.map(sub => sub.indicators.length > 0 && (
                        <div key={sub.id}>
                          <div className="px-4 py-1.5 bg-slate-50/50 border-t border-slate-50">
                            <p className="text-[10px] text-slate-400 font-mono">{sub.code} — {sub.title}</p>
                          </div>
                          <IndicatorMiniTable indicators={sub.indicators} year={selectedYear} nodeLabel={sub.code} canWrite={canWrite} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mini indicator table inside outcome card ─────────────────────────────────
function IndicatorMiniTable({ indicators, year, nodeLabel, canWrite }: {
  indicators: Indicator[]; year: number; nodeLabel: string; canWrite: boolean;
}) {
  return (
    <div>
      {indicators.map(ind => {
        const { result, target, pct, hasData } = getIndicatorStats(ind, year);
        return (
          <div key={ind.id}
            className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
            <StatusIcon pct={pct} hasData={hasData} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-700 truncate font-medium">{ind.name}</p>
              <p className="text-[10px] text-slate-400 font-mono">{ind.code} · {ind.unit ?? "—"}</p>
            </div>
            <div className="flex items-center gap-3 text-xs flex-shrink-0">
              <span className="text-slate-400">T: <span className="text-slate-600 font-medium">{target || "—"}</span></span>
              <span className="text-slate-400">R: <span className={cn("font-semibold", hasData ? "text-brand-700" : "text-slate-300")}>
                {result !== null ? result : "—"}
              </span></span>
              {hasData && (
                <div className="flex items-center gap-1">
                  <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", progressColor(pct))}
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-[10px] font-semibold w-8 text-right" style={{
                    color: pct >= 75 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626"
                  }}>
                    {Math.round(pct)}%
                  </span>
                </div>
              )}
            </div>
            <Link href={`/logframe/indicators/${ind.id}`}
              className="text-slate-300 hover:text-brand-600 transition-colors ml-1">
              <Eye className="w-3.5 h-3.5" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}

// ─── Monitor: Full logframe table ─────────────────────────────────────────────
function MonitorView({ tree, selectedYear, canWrite }: {
  tree: LogframeNode[]; selectedYear: number; canWrite: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ON_TARGET" | "OFF_TRACK" | "NO_DATA">("ALL");
  const [progressDialog, setProgressDialog] = useState<Indicator | null>(null);

  const toggleNode = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const ids = new Set<number>();
    function collect(nodes: LogframeNode[]) { nodes.forEach(n => { ids.add(n.id); collect(n.children); }); }
    collect(tree);
    setExpanded(ids);
  };

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Show:</span>
          {(["ALL", "ON_TARGET", "OFF_TRACK", "NO_DATA"] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={cn("px-2.5 py-1 rounded-full font-medium transition-colors border", {
                "bg-brand-700 text-white border-brand-700": statusFilter === f,
                "bg-white text-slate-600 border-slate-200 hover:border-slate-300": statusFilter !== f,
              })}>
              {f === "ALL" ? "All" : f === "ON_TARGET" ? "✓ On Target" : f === "OFF_TRACK" ? "⚠ Off Track" : "○ No Data"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="btn-ghost text-xs">Expand All</button>
          <button onClick={() => setExpanded(new Set())} className="btn-ghost text-xs">Collapse</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_70px_90px_90px_90px_110px_44px] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          <div>Results Hierarchy / Indicator</div>
          <div className="text-right">Baseline</div>
          <div className="text-right">End Target</div>
          <div className="text-right">Yr Target</div>
          <div className="text-right">Yr Result</div>
          <div>Achievement</div>
          <div></div>
        </div>

        <div className="divide-y divide-slate-50">
          {tree.map(node => (
            <LogframeRow
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              selectedYear={selectedYear}
              statusFilter={statusFilter}
              onToggle={toggleNode}
              onOpenProgress={canWrite ? setProgressDialog : undefined}
            />
          ))}
        </div>
      </div>

      {progressDialog && (
        <ProgressDialog
          indicator={progressDialog}
          year={selectedYear}
          onClose={() => setProgressDialog(null)}
        />
      )}
    </div>
  );
}

function LogframeRow({ node, depth, expanded, selectedYear, statusFilter, onToggle, onOpenProgress }: any) {
  const isExpanded = expanded.has(node.id);
  const levelMeta = getLogframeLevelMeta(node.level);

  // Filter indicators
  const visibleIndicators = node.indicators.filter((ind: Indicator) => {
    if (statusFilter === "ALL") return true;
    const { pct, hasData } = getIndicatorStats(ind, selectedYear);
    if (statusFilter === "NO_DATA") return !hasData;
    if (statusFilter === "ON_TARGET") return hasData && pct >= 75;
    if (statusFilter === "OFF_TRACK") return hasData && pct < 75;
    return true;
  });

  const hasContent = node.children.length > 0 || node.indicators.length > 0;

  return (
    <>
      {/* Node row */}
      <div
        className={cn(
          "grid grid-cols-[1fr_70px_90px_90px_90px_110px_44px] gap-2 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors",
          depth === 0 ? "bg-slate-50/60" : "bg-white"
        )}
        style={{ paddingLeft: `${16 + depth * 16}px` }}
        onClick={() => onToggle(node.id)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-4 h-4 flex items-center justify-center text-slate-300 flex-shrink-0">
            {hasContent ? (isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : null}
          </div>
          <span className={cn("badge flex-shrink-0 text-[10px]", levelMeta.color)}>{levelMeta.label}</span>
          <span className="text-sm font-semibold text-slate-800 truncate">{node.title}</span>
          <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{node.code}</span>
        </div>
        <div /><div /><div /><div /><div /><div />
      </div>

      {/* Indicators */}
      {isExpanded && visibleIndicators.map((ind: Indicator) => {
        const { result, target, pct, hasData, prog } = getIndicatorStats(ind, selectedYear);
        const prevResult = ind.yearlyProgress?.find(p => p.reportYear === selectedYear - 1)?.annualResult;
        return (
          <div key={ind.id}
            className="grid grid-cols-[1fr_70px_90px_90px_90px_110px_44px] gap-2 px-4 py-2 hover:bg-blue-50/20 transition-colors border-l-2 border-brand-100"
            style={{ paddingLeft: `${16 + (depth + 1) * 16}px` }}>
            <div className="flex items-center gap-2 min-w-0">
              <StatusIcon pct={pct} hasData={hasData} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{ind.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{ind.code} · {ind.unit ?? "—"}</p>
              </div>
              <TrendIcon current={result} previous={prevResult} />
            </div>
            <div className="text-xs text-right text-slate-400 self-center">{ind.baseline ?? "—"}</div>
            <div className="text-xs text-right text-slate-600 font-medium self-center">{ind.endTarget ?? "—"}</div>
            <div className="text-xs text-right text-slate-500 self-center">{target || "—"}</div>
            <div className="text-xs text-right font-semibold self-center" style={{ color: hasData ? "#15803d" : "#94a3b8" }}>
              {result !== null ? result : "—"}
            </div>
            <div className="self-center">
              {hasData ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", progressColor(pct))}
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-[10px] font-bold w-8 text-right" style={{
                    color: pct >= 75 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626"
                  }}>
                    {Math.round(pct)}%
                  </span>
                </div>
              ) : <span className="text-[10px] text-slate-300">No data</span>}
            </div>
            <div className="self-center flex items-center gap-1">
              <Link href={`/logframe/indicators/${ind.id}`}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                <Eye className="w-3 h-3" />
              </Link>
              {onOpenProgress && (
                <button onClick={() => onOpenProgress(ind)}
                  className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Children */}
      {isExpanded && node.children.map((child: LogframeNode) => (
        <LogframeRow key={child.id} node={child} depth={depth + 1}
          expanded={expanded} selectedYear={selectedYear} statusFilter={statusFilter}
          onToggle={onToggle} onOpenProgress={onOpenProgress} />
      ))}
    </>
  );
}

// ─── Progress Entry Dialog ────────────────────────────────────────────────────
function ProgressDialog({ indicator, year, onClose }: {
  indicator: Indicator; year: number; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const existing = indicator.yearlyProgress?.find(p => p.reportYear === year);
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
    evidenceSource: existing?.evidenceSource ?? "",
    remarks: existing?.remarks ?? "",
  });

  const mutation = useMutation({
    mutationFn: (dto: UpsertProgressDto) => logframeApi.upsertProgress(indicator.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logframe-tree"] });
      toast.success("Progress saved");
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const n = (v: any) => (v !== undefined && v !== "" ? Number(v) : undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col animate-fade-in">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Enter Progress — {year}</p>
            <h2 className="font-semibold text-slate-900 text-sm mt-0.5 leading-snug">{indicator.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{indicator.code} · {indicator.unit ?? "—"} · {indicator.frequency}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex gap-6 text-xs">
          <span className="text-slate-500">Baseline: <strong className="text-slate-700">{indicator.baseline ?? "—"}</strong></span>
          <span className="text-slate-500">Mid Target: <strong className="text-slate-700">{indicator.midTarget ?? "—"}</strong></span>
          <span className="text-slate-500">End Target: <strong className="text-slate-700">{indicator.endTarget ?? "—"}</strong></span>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Annual Target</label>
              <input type="number" className="form-input" value={form.annualTarget ?? ""}
                onChange={e => setForm({ ...form, annualTarget: n(e.target.value) })} /></div>
            <div><label className="form-label">Annual Result *</label>
              <input type="number" className="form-input" value={form.annualResult ?? ""}
                onChange={e => setForm({ ...form, annualResult: n(e.target.value) })} /></div>
            <div><label className="form-label">Cumulative Target</label>
              <input type="number" className="form-input" value={form.cumulativeTarget ?? ""}
                onChange={e => setForm({ ...form, cumulativeTarget: n(e.target.value) })} /></div>
            <div><label className="form-label">Cumulative Result</label>
              <input type="number" className="form-input" value={form.cumulativeResult ?? ""}
                onChange={e => setForm({ ...form, cumulativeResult: n(e.target.value) })} /></div>
          </div>
          {(indicator.supportsGenderBreakdown || indicator.supportsYouthBreakdown || indicator.supportsIndigenousBreakdown || indicator.supportsHouseholdBreakdown) && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Disaggregation</p>
              <div className="grid grid-cols-3 gap-3">
                {indicator.supportsGenderBreakdown && <>
                  <div><label className="form-label">Male</label>
                    <input type="number" className="form-input" value={form.maleValue ?? ""}
                      onChange={e => setForm({ ...form, maleValue: n(e.target.value) })} /></div>
                  <div><label className="form-label">Female</label>
                    <input type="number" className="form-input" value={form.femaleValue ?? ""}
                      onChange={e => setForm({ ...form, femaleValue: n(e.target.value) })} /></div>
                </>}
                {indicator.supportsYouthBreakdown && <div><label className="form-label">Youth</label>
                  <input type="number" className="form-input" value={form.youthValue ?? ""}
                    onChange={e => setForm({ ...form, youthValue: n(e.target.value) })} /></div>}
                {indicator.supportsIndigenousBreakdown && <div><label className="form-label">Indigenous</label>
                  <input type="number" className="form-input" value={form.indigenousValue ?? ""}
                    onChange={e => setForm({ ...form, indigenousValue: n(e.target.value) })} /></div>}
                {indicator.supportsHouseholdBreakdown && <div><label className="form-label">Households</label>
                  <input type="number" className="form-input" value={form.householdValue ?? ""}
                    onChange={e => setForm({ ...form, householdValue: n(e.target.value) })} /></div>}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Evidence Source</label>
              <input type="text" className="form-input" value={form.evidenceSource ?? ""}
                onChange={e => setForm({ ...form, evidenceSource: e.target.value })} /></div>
            <div><label className="form-label">Remarks</label>
              <input type="text" className="form-input" value={form.remarks ?? ""}
                onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate(form as UpsertProgressDto)} disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5" />Save Progress</>}
          </button>
        </div>
      </div>
    </div>
  );
}
