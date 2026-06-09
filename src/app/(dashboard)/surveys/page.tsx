"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, X, Save, ChevronRight, CheckCircle2, AlertCircle,
  Clock, Lock, Play, BarChart3, Users, FileCheck, ArrowRight,
  Edit2, Eye, RefreshCw, Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { surveyApi, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate, DISTRICTS_JK } from "@/lib/utils";
import {
  SurveyRound, SurveyRoundType, SurveyRoundStatus,
  SurveyIndicatorValue, SurveyStats,
} from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROUND_CONFIG: Record<SurveyRoundType, { label: string; color: string; bg: string; year: number; logframeField: string }> = {
  BASELINE: { label: "Baseline",  color: "text-blue-700",  bg: "bg-blue-50",   year: 2024, logframeField: "baseline"  },
  MIDLINE:  { label: "Midline",   color: "text-amber-700", bg: "bg-amber-50",  year: 2027, logframeField: "midTarget" },
  ENDLINE:  { label: "Endline",   color: "text-green-700", bg: "bg-green-50",  year: 2030, logframeField: "endTarget" },
};

const STATUS_CONFIG: Record<SurveyRoundStatus, { label: string; icon: React.ElementType; color: string }> = {
  DRAFT:     { label: "Draft",     icon: Edit2,         color: "text-slate-500" },
  OPEN:      { label: "Open",      icon: Play,          color: "text-green-600" },
  CLOSED:    { label: "Closed",    icon: Lock,          color: "text-amber-600" },
  CONFIRMED: { label: "Confirmed", icon: CheckCircle2,  color: "text-blue-600"  },
};

const FORM_SECTIONS = ["household", "crop", "fpo", "satisfaction"] as const;
type FormSection = typeof FORM_SECTIONS[number];

const SECTION_LABELS: Record<FormSection, string> = {
  household:    "Household",
  crop:         "Crop",
  fpo:          "FPO / PO",
  satisfaction: "Satisfaction",
};

const CROPS = ["Saffron", "Apple", "Walnut", "Kashmiri Chilli", "Mango", "Citrus", "Stone Fruits", "Vegetables", "Other"];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SurveysPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const [view, setView] = useState<"rounds" | "responses" | "review" | "comparison">("rounds");
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [responseFormOpen, setResponseFormOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ roundId: number; action: "open" | "close" | "confirm" } | null>(null);

  const { data: rounds = [], isLoading } = useQuery<SurveyRound[]>({
    queryKey: ["survey-rounds"],
    queryFn: surveyApi.getRounds,
  });

  const selectedRound = rounds.find((r) => r.id === selectedRoundId) ?? null;

  const mutate = (fn: () => Promise<any>, successMsg: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: () => { toast.success(successMsg); qc.invalidateQueries({ queryKey: ["survey-rounds"] }); },
      onError: (e) => toast.error(getApiErrorMessage(e)),
    });

  const openMut   = useMutation({ mutationFn: (id: number) => surveyApi.openRound(id),    onSuccess: () => { toast.success("Round opened for data collection"); qc.invalidateQueries({ queryKey: ["survey-rounds"] }); setConfirmAction(null); }, onError: (e) => toast.error(getApiErrorMessage(e)) });
  const closeMut  = useMutation({ mutationFn: (id: number) => surveyApi.closeRound(id),   onSuccess: () => { toast.success("Round closed — indicator values computed"); qc.invalidateQueries({ queryKey: ["survey-rounds"] }); setConfirmAction(null); }, onError: (e) => toast.error(getApiErrorMessage(e)) });
  const confirmMut = useMutation({ mutationFn: (id: number) => surveyApi.confirmRound(id), onSuccess: () => { toast.success("Values written to logframe"); qc.invalidateQueries({ queryKey: ["survey-rounds"] }); setConfirmAction(null); }, onError: (e) => toast.error(getApiErrorMessage(e)) });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Survey Module</h1>
          <p className="text-sm text-slate-500 mt-0.5">Baseline · Midline · Endline — tracks all enrolled beneficiaries</p>
        </div>
        {isAdmin && (
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Round
          </button>
        )}
      </div>

      {/* ── Round cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {(["BASELINE", "MIDLINE", "ENDLINE"] as SurveyRoundType[]).map((type) => {
          const round = rounds.find((r) => r.type === type);
          const cfg = ROUND_CONFIG[type];
          const sCfg = round ? STATUS_CONFIG[round.status] : null;
          const StatusIcon = sCfg?.icon ?? Clock;
          return (
            <div
              key={type}
              className={cn(
                "bg-white rounded-xl border border-slate-200 p-5 cursor-pointer transition hover:border-brand-400 hover:shadow-sm",
                selectedRoundId === round?.id && "border-brand-600 ring-1 ring-brand-600",
                !round && "opacity-60 cursor-default"
              )}
              onClick={() => round && setSelectedRoundId(round.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                  {cfg.label}
                </span>
                {sCfg && (
                  <span className={cn("flex items-center gap-1 text-xs", sCfg.color)}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {sCfg.label}
                  </span>
                )}
              </div>
              {round ? (
                <>
                  <p className="font-semibold text-slate-800 text-sm leading-snug">{round.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{round.year}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Responses</span>
                      <span className="font-medium">{round.responseCount ?? 0} / {round.targetCount}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-600 rounded-full transition-all"
                        style={{ width: `${Math.min(round.completionRate ?? 0, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{round.completionRate ?? 0}% complete</p>
                  </div>
                </>
              ) : (
                <div className="mt-2">
                  <p className="text-sm text-slate-400">Not created yet</p>
                  <p className="text-xs text-slate-300 mt-0.5">Target year: {cfg.year}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── View tabs (shown only when a round is selected) ── */}
      {selectedRound && (
        <>
          <div className="flex items-center gap-1 border-b border-slate-200">
            {[
              { key: "rounds",     label: "Overview" },
              { key: "responses",  label: "Responses" },
              { key: "review",     label: "Indicator Review" },
              { key: "comparison", label: "Comparison" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key as any)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition",
                  view === tab.key
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2 pb-1">
              {/* Round actions */}
              {isAdmin && selectedRound.status === "DRAFT" && (
                <button onClick={() => setConfirmAction({ roundId: selectedRound.id, action: "open" })} className="btn-secondary text-xs flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5" /> Open Round
                </button>
              )}
              {isAdmin && selectedRound.status === "OPEN" && (
                <button onClick={() => setConfirmAction({ roundId: selectedRound.id, action: "close" })} className="btn-secondary text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Close Round
                </button>
              )}
              {isAdmin && selectedRound.status === "CLOSED" && (
                <button onClick={() => setConfirmAction({ roundId: selectedRound.id, action: "confirm" })} className="btn-primary text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Write to Logframe
                </button>
              )}
              {selectedRound.status === "OPEN" && (
                <button onClick={() => setResponseFormOpen(true)} className="btn-primary text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Response
                </button>
              )}
            </div>
          </div>

          {view === "rounds"     && <OverviewTab round={selectedRound} />}
          {view === "responses"  && <ResponsesTab round={selectedRound} />}
          {view === "review"     && <ReviewTab round={selectedRound} isAdmin={isAdmin} />}
          {view === "comparison" && <ComparisonTab />}
        </>
      )}

      {/* ── No selection prompt ── */}
      {!selectedRound && !isLoading && rounds.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Select a survey round above to view details</p>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && rounds.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <FileCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No survey rounds yet</p>
          <p className="text-slate-400 text-sm mt-1">Create the Baseline round to get started</p>
          {isAdmin && (
            <button onClick={() => setCreateOpen(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Baseline Round
            </button>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {createOpen     && <CreateRoundModal onClose={() => setCreateOpen(false)} existingTypes={rounds.map(r => r.type)} />}
      {responseFormOpen && selectedRound && (
        <ResponseFormModal round={selectedRound} onClose={() => setResponseFormOpen(false)} />
      )}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction.action}
          onConfirm={() => {
            if (confirmAction.action === "open")    openMut.mutate(confirmAction.roundId);
            if (confirmAction.action === "close")   closeMut.mutate(confirmAction.roundId);
            if (confirmAction.action === "confirm") confirmMut.mutate(confirmAction.roundId);
          }}
          onClose={() => setConfirmAction(null)}
          loading={openMut.isPending || closeMut.isPending || confirmMut.isPending}
        />
      )}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ round }: { round: SurveyRound }) {
  const { data: stats, isLoading } = useQuery<SurveyStats>({
    queryKey: ["survey-stats", round.id],
    queryFn: () => surveyApi.getStats(round.id),
  });

  const cfg = ROUND_CONFIG[round.type];
  const sCfg = STATUS_CONFIG[round.status];
  const StatusIcon = sCfg.icon;

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: round details */}
      <div className="col-span-1 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Round details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Type</dt>
              <dd className={cn("font-medium px-2 py-0.5 rounded-full text-xs", cfg.bg, cfg.color)}>{cfg.label}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd className={cn("flex items-center gap-1", sCfg.color)}>
                <StatusIcon className="w-3.5 h-3.5" /> {sCfg.label}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Year</dt>
              <dd className="font-medium text-slate-700">{round.year}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Target</dt>
              <dd className="font-medium text-slate-700">{round.targetCount.toLocaleString()} responses</dd>
            </div>
            {round.openedAt   && <div className="flex justify-between"><dt className="text-slate-500">Opened</dt><dd className="text-slate-600">{formatDate(round.openedAt)}</dd></div>}
            {round.closedAt   && <div className="flex justify-between"><dt className="text-slate-500">Closed</dt><dd className="text-slate-600">{formatDate(round.closedAt)}</dd></div>}
            {round.confirmedAt && <div className="flex justify-between"><dt className="text-slate-500">Confirmed</dt><dd className="text-slate-600">{formatDate(round.confirmedAt)}</dd></div>}
          </dl>
          {round.description && (
            <p className="mt-4 text-xs text-slate-400 leading-relaxed border-t pt-3">{round.description}</p>
          )}
        </div>
      </div>

      {/* Right: stats */}
      <div className="col-span-2 space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Loading stats…</div>
        ) : stats ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Responses" value={stats.totalResponses} sub={`of ${stats.targetCount} target`} />
              <StatCard label="Completion" value={`${stats.completionRate}%`} />
              <StatCard label="Districts" value={stats.byDistrict.length} sub="covered" />
            </div>

            {/* By district */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Responses by district</h3>
              <div className="space-y-2">
                {stats.byDistrict.slice(0, 10).map((d) => (
                  <div key={d.district} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-28 truncate">{d.district}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${stats.totalResponses ? (d.count / stats.totalResponses) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 w-8 text-right">{d.count}</span>
                  </div>
                ))}
                {stats.byDistrict.length === 0 && (
                  <p className="text-sm text-slate-400">No responses yet</p>
                )}
              </div>
            </div>

            {/* By gender */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Gender split</h3>
              <div className="flex gap-4">
                {stats.byGender.map((g) => (
                  <div key={g.gender} className="flex items-center gap-2 text-sm">
                    <div className={cn("w-2.5 h-2.5 rounded-full", g.gender === "Male" ? "bg-blue-400" : g.gender === "Female" ? "bg-pink-400" : "bg-slate-300")} />
                    <span className="text-slate-600">{g.gender}</span>
                    <span className="font-semibold text-slate-800">{g.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">No data yet</div>
        )}
      </div>
    </div>
  );
}

// ─── Responses Tab ────────────────────────────────────────────────────────────

function ResponsesTab({ round }: { round: SurveyRound }) {
  const [district, setDistrict] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["survey-responses", round.id, district, page],
    queryFn: () => surveyApi.getResponses(round.id, { district: district || undefined, page, limit: 25 }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <select value={district} onChange={(e) => { setDistrict(e.target.value); setPage(1); }} className="input-field text-sm w-44">
          <option value="">All districts</option>
          {DISTRICTS_JK.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="text-sm text-slate-400">{total} total responses</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {["Beneficiary", "District", "Block", "Gender", "FPO Member", "Income (₹)", "Satisfaction", "Status", "Submitted"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No responses yet</td></tr>
            ) : items.map((r: any) => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-700">{r.fullName ?? "—"}</div>
                  <div className="text-xs text-slate-400">{r.beneficiaryUhid ?? `#${r.id}`}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.district ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{r.block ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{r.gender ?? "—"}</td>
                <td className="px-4 py-3">
                  {r.isFpoMember === null ? "—" : r.isFpoMember
                    ? <span className="text-green-600 text-xs font-medium">Yes</span>
                    : <span className="text-slate-400 text-xs">No</span>}
                </td>
                <td className="px-4 py-3 text-slate-700">{r.annualIncome != null ? `₹${Number(r.annualIncome).toLocaleString()}` : "—"}</td>
                <td className="px-4 py-3">
                  {r.satisfactionScore != null
                    ? <span className="flex items-center gap-1">{r.satisfactionScore}<span className="text-slate-300">/5</span></span>
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                    r.status === "SUBMITTED" ? "bg-green-50 text-green-700" :
                    r.status === "VERIFIED"  ? "bg-blue-50 text-blue-700" :
                    "bg-slate-100 text-slate-500"
                  )}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{r.submittedAt ? formatDate(r.submittedAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs disabled:opacity-40">Previous</button>
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Indicator Review Tab ─────────────────────────────────────────────────────

function ReviewTab({ round, isAdmin }: { round: SurveyRound; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const { data: values = [], isLoading } = useQuery<SurveyIndicatorValue[]>({
    queryKey: ["survey-indicator-values", round.id],
    queryFn: () => surveyApi.getIndicatorValues(round.id),
  });

  const reviewMut = useMutation({
    mutationFn: ({ indicatorId, val, notes }: { indicatorId: number; val: number; notes: string }) =>
      surveyApi.reviewIndicatorValue(round.id, indicatorId, { reviewedValue: val, reviewNotes: notes }),
    onSuccess: () => {
      toast.success("Value updated");
      qc.invalidateQueries({ queryKey: ["survey-indicator-values", round.id] });
      setEditId(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (round.status === "DRAFT" || round.status === "OPEN") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Lock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Indicator values are computed when the round is closed.</p>
        <p className="text-slate-400 text-xs mt-1">Close the round after collecting all responses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Review computed values before confirming. You can override any value before writing to the logframe.
        </p>
        {round.status === "CONFIRMED" && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Written to logframe
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-96">Indicator</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Computed</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Reviewed</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Sample</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Logframe</th>
              {isAdmin && round.status === "CLOSED" && <th className="px-4 py-3 w-20" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : values.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No computed values yet. Close the round first.</td></tr>
            ) : values.map((v) => (
              <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-700 text-xs leading-snug">{v.indicator?.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{v.indicator?.logframeNode?.code} · {v.unit ?? v.indicator?.unit ?? ""}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-700">
                  {v.computedValue != null ? v.computedValue.toFixed(2) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {editId === v.indicatorId ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="input-field text-right w-24 text-xs"
                      autoFocus
                    />
                  ) : (
                    <span className={cn("font-mono", v.reviewedValue != null ? "text-brand-700 font-semibold" : "text-slate-400")}>
                      {v.reviewedValue != null ? v.reviewedValue.toFixed(2) : "—"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-500 text-xs">{v.sampleSize.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {v.writtenToLogframe
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                    : <span className="text-xs text-slate-300">—</span>}
                </td>
                {isAdmin && round.status === "CLOSED" && (
                  <td className="px-4 py-3">
                    {editId === v.indicatorId ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => reviewMut.mutate({ indicatorId: v.indicatorId, val: Number(editValue), notes: editNotes })}
                          disabled={reviewMut.isPending}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditId(v.indicatorId); setEditValue(String(v.reviewedValue ?? v.computedValue ?? "")); setEditNotes(v.reviewNotes ?? ""); }}
                        className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Comparison Tab ───────────────────────────────────────────────────────────

function ComparisonTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["survey-comparison"],
    queryFn: () => surveyApi.getComparison(),
  });

  const rounds = data?.rounds ?? [];
  const comparison = data?.comparison ?? [];

  if (isLoading) return <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">Loading comparison…</div>;

  if (rounds.length < 2) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <BarChart3 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Comparison will show once at least 2 rounds are closed.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-80">Indicator</th>
            {rounds.map((r) => (
              <th key={r.id} className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                {ROUND_CONFIG[r.type].label} ({r.year})
              </th>
            ))}
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Change</th>
          </tr>
        </thead>
        <tbody>
          {comparison.length === 0 ? (
            <tr><td colSpan={rounds.length + 2} className="px-4 py-8 text-center text-slate-400">No data yet</td></tr>
          ) : comparison.map((c, i) => {
            const vals = rounds.map((r) => c.rounds[r.type]?.value);
            const first = vals.find((v) => v != null);
            const last = [...vals].reverse().find((v) => v != null);
            const change = first != null && last != null && first !== 0
              ? Math.round(((last - first) / Math.abs(first)) * 100)
              : null;
            return (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <div className="text-xs font-medium text-slate-700 leading-snug">{c.indicator.name}</div>
                  <div className="text-xs text-slate-400">{c.indicator.logframeNode?.code} · {c.indicator.unit ?? ""}</div>
                </td>
                {rounds.map((r) => {
                  const val = c.rounds[r.type]?.value;
                  return (
                    <td key={r.id} className="px-4 py-3 text-right font-mono text-slate-700">
                      {val != null ? val.toFixed(2) : <span className="text-slate-300">—</span>}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right">
                  {change != null ? (
                    <span className={cn("text-xs font-medium", change > 0 ? "text-green-600" : change < 0 ? "text-red-500" : "text-slate-400")}>
                      {change > 0 ? "+" : ""}{change}%
                    </span>
                  ) : <span className="text-slate-300 text-xs">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function CreateRoundModal({ onClose, existingTypes }: { onClose: () => void; existingTypes: SurveyRoundType[] }) {
  const qc = useQueryClient();
  const remaining = (["BASELINE", "MIDLINE", "ENDLINE"] as SurveyRoundType[]).filter((t) => !existingTypes.includes(t));
  const [form, setForm] = useState({
    type: remaining[0] ?? "BASELINE" as SurveyRoundType,
    label: "",
    year: ROUND_CONFIG[remaining[0] ?? "BASELINE"].year,
    description: "",
    targetCount: 0,
  });

  const mut = useMutation({
    mutationFn: () => surveyApi.createRound(form),
    onSuccess: () => { toast.success("Survey round created"); qc.invalidateQueries({ queryKey: ["survey-rounds"] }); onClose(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  if (remaining.length === 0) return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
        <p className="text-slate-600 text-center">All 3 survey rounds have been created.</p>
        <button onClick={onClose} className="btn-secondary w-full mt-4">Close</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Create Survey Round</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Round type</label>
              <select value={form.type} onChange={(e) => { const t = e.target.value as SurveyRoundType; set("type", t); set("year", ROUND_CONFIG[t].year); set("label", `${ROUND_CONFIG[t].label} Survey ${ROUND_CONFIG[t].year}`); }} className="input-field">
                {remaining.map((t) => <option key={t} value={t}>{ROUND_CONFIG[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Year</label>
              <input type="number" value={form.year} onChange={(e) => set("year", Number(e.target.value))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Label</label>
            <input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder={`${ROUND_CONFIG[form.type].label} Survey ${form.year}`} className="input-field" />
          </div>
          <div>
            <label className="label-field">Target responses</label>
            <input type="number" value={form.targetCount} onChange={(e) => set("targetCount", Number(e.target.value))} className="input-field" />
          </div>
          <div>
            <label className="label-field">Description (optional)</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className="input-field resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => mut.mutate()} disabled={!form.label || mut.isPending} className="btn-primary">
            {mut.isPending ? "Creating…" : "Create Round"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResponseFormModal({ round, onClose }: { round: SurveyRound; onClose: () => void }) {
  const qc = useQueryClient();
  const [section, setSection] = useState<FormSection>("household");
  const [form, setForm] = useState<Record<string, any>>({
    fullName: "", beneficiaryUhid: "", district: "", block: "", village: "",
    gender: "", isYouth: false, isBpl: false, category: "GENERAL",
    annualIncome: "", landHolding: "",
    cropData: [{ crop: "Saffron", area_ha: "", yield_kg: "", productivity_kg_ha: "", marketed_grade: "A" }],
    isFpoMember: false, fpoName: "", fpoSalesIncrease: false, fpoServicesRating: 3,
    satisfactionScore: 3, decisionInfluenceScore: 3,
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => surveyApi.submitResponse(round.id, {
      ...form,
      annualIncome: form.annualIncome ? Number(form.annualIncome) : undefined,
      landHolding: form.landHolding ? Number(form.landHolding) : undefined,
    }),
    onSuccess: () => { toast.success("Response submitted"); qc.invalidateQueries({ queryKey: ["survey-responses", round.id] }); onClose(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Add Survey Response</h2>
            <p className="text-xs text-slate-400 mt-0.5">{round.label}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          {FORM_SECTIONS.map((s, i) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium border-b-2 -mb-px transition",
                section === s ? "border-brand-600 text-brand-700" : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <span className="mr-1.5 opacity-40">{i + 1}.</span>{SECTION_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {section === "household" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-field">Full name</label><input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className="input-field" /></div>
                <div><label className="label-field">UHID / Beneficiary ID</label><input value={form.beneficiaryUhid} onChange={(e) => set("beneficiaryUhid", e.target.value)} placeholder="JKCIP-2024-SRN-000001" className="input-field" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label-field">District</label><select value={form.district} onChange={(e) => set("district", e.target.value)} className="input-field"><option value="">Select</option>{DISTRICTS_JK.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                <div><label className="label-field">Block</label><input value={form.block} onChange={(e) => set("block", e.target.value)} className="input-field" /></div>
                <div><label className="label-field">Village</label><input value={form.village} onChange={(e) => set("village", e.target.value)} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label-field">Gender</label><select value={form.gender} onChange={(e) => set("gender", e.target.value)} className="input-field"><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
                <div><label className="label-field">Category</label><select value={form.category} onChange={(e) => set("category", e.target.value)} className="input-field"><option value="GENERAL">General</option><option value="SC">SC</option><option value="ST">ST</option><option value="OBC">OBC</option></select></div>
                <div className="flex flex-col gap-2 pt-5">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"><input type="checkbox" checked={form.isYouth} onChange={(e) => set("isYouth", e.target.checked)} className="rounded" /> Youth (&lt;35 yrs)</label>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"><input type="checkbox" checked={form.isBpl} onChange={(e) => set("isBpl", e.target.checked)} className="rounded" /> BPL</label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-field">Annual income (₹)</label><input type="number" value={form.annualIncome} onChange={(e) => set("annualIncome", e.target.value)} className="input-field" /></div>
                <div><label className="label-field">Land holding (ha)</label><input type="number" value={form.landHolding} onChange={(e) => set("landHolding", e.target.value)} step="0.01" className="input-field" /></div>
              </div>
            </div>
          )}

          {section === "crop" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Add one row per crop the beneficiary cultivates.</p>
              {form.cropData.map((c: any, i: number) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Crop {i + 1}</span>
                    {form.cropData.length > 1 && (
                      <button onClick={() => set("cropData", form.cropData.filter((_: any, j: number) => j !== i))} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label-field">Crop</label><select value={c.crop} onChange={(e) => set("cropData", form.cropData.map((r: any, j: number) => j === i ? { ...r, crop: e.target.value } : r))} className="input-field">{CROPS.map(cr => <option key={cr} value={cr}>{cr}</option>)}</select></div>
                    <div><label className="label-field">Area (ha)</label><input type="number" value={c.area_ha} onChange={(e) => set("cropData", form.cropData.map((r: any, j: number) => j === i ? { ...r, area_ha: e.target.value } : r))} step="0.01" className="input-field" /></div>
                    <div><label className="label-field">Yield (kg)</label><input type="number" value={c.yield_kg} onChange={(e) => set("cropData", form.cropData.map((r: any, j: number) => j === i ? { ...r, yield_kg: e.target.value } : r))} className="input-field" /></div>
                    <div><label className="label-field">Productivity (kg/ha)</label><input type="number" value={c.productivity_kg_ha} onChange={(e) => set("cropData", form.cropData.map((r: any, j: number) => j === i ? { ...r, productivity_kg_ha: e.target.value } : r))} className="input-field" /></div>
                    <div><label className="label-field">Marketed grade</label><select value={c.marketed_grade} onChange={(e) => set("cropData", form.cropData.map((r: any, j: number) => j === i ? { ...r, marketed_grade: e.target.value } : r))} className="input-field"><option value="A">A-grade / Premium</option><option value="B">B-grade</option><option value="C">C-grade</option></select></div>
                  </div>
                </div>
              ))}
              <button onClick={() => set("cropData", [...form.cropData, { crop: "Apple", area_ha: "", yield_kg: "", productivity_kg_ha: "", marketed_grade: "A" }])} className="btn-secondary text-xs flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add crop
              </button>
            </div>
          )}

          {section === "fpo" && (
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={form.isFpoMember} onChange={(e) => set("isFpoMember", e.target.checked)} className="rounded" />
                <span className="text-sm text-slate-700">Beneficiary is a member of an FPO / PO</span>
              </label>
              {form.isFpoMember && (
                <>
                  <div><label className="label-field">FPO name</label><input value={form.fpoName} onChange={(e) => set("fpoName", e.target.value)} className="input-field" /></div>
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={form.fpoSalesIncrease} onChange={(e) => set("fpoSalesIncrease", e.target.checked)} className="rounded" />
                    <span className="text-sm text-slate-700">FPO reported an increase in sales since last round</span>
                  </label>
                  <div>
                    <label className="label-field">FPO services rating (1 = poor, 5 = excellent)</label>
                    <input type="range" min={1} max={5} value={form.fpoServicesRating} onChange={(e) => set("fpoServicesRating", Number(e.target.value))} className="w-full mt-1" />
                    <div className="flex justify-between text-xs text-slate-400 mt-1"><span>1 — Poor</span><span className="font-medium text-slate-600">{form.fpoServicesRating}</span><span>5 — Excellent</span></div>
                  </div>
                </>
              )}
            </div>
          )}

          {section === "satisfaction" && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-600 mb-1">SF 2.1 — Service satisfaction</p>
                <p className="text-xs text-slate-400 mb-3">How satisfied is the beneficiary with project-supported services?</p>
                <input type="range" min={1} max={5} value={form.satisfactionScore} onChange={(e) => set("satisfactionScore", Number(e.target.value))} className="w-full" />
                <div className="flex justify-between text-xs text-slate-400 mt-1"><span>1 — Not satisfied</span><span className="font-medium text-slate-600 text-sm">{form.satisfactionScore} / 5</span><span>5 — Very satisfied</span></div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-600 mb-1">SF 2.2 — Decision-making influence</p>
                <p className="text-xs text-slate-400 mb-3">How much can the beneficiary influence decisions of local authorities / service providers?</p>
                <input type="range" min={1} max={5} value={form.decisionInfluenceScore} onChange={(e) => set("decisionInfluenceScore", Number(e.target.value))} className="w-full" />
                <div className="flex justify-between text-xs text-slate-400 mt-1"><span>1 — No influence</span><span className="font-medium text-slate-600 text-sm">{form.decisionInfluenceScore} / 5</span><span>5 — High influence</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-100 flex-shrink-0">
          <div className="flex gap-1">
            {FORM_SECTIONS.map((s, i) => (
              <button key={s} onClick={() => setSection(s)} className={cn("w-2 h-2 rounded-full transition", section === s ? "bg-brand-600" : "bg-slate-200")} />
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            {section !== "satisfaction" ? (
              <button onClick={() => setSection(FORM_SECTIONS[FORM_SECTIONS.indexOf(section) + 1])} className="btn-primary flex items-center gap-1.5">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => mut.mutate()} disabled={mut.isPending} className="btn-primary flex items-center gap-1.5">
                <Save className="w-4 h-4" /> {mut.isPending ? "Submitting…" : "Submit Response"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ action, onConfirm, onClose, loading }: { action: "open" | "close" | "confirm"; onConfirm: () => void; onClose: () => void; loading: boolean }) {
  const config = {
    open:    { title: "Open round for data collection?", body: "Field staff will be able to submit survey responses. This cannot be undone.", btn: "Open Round", color: "btn-primary" },
    close:   { title: "Close round and compute values?", body: "Data collection will end and indicator values will be auto-computed from all submitted responses. You can review before confirming.", btn: "Close Round", color: "btn-secondary" },
    confirm: { title: "Write values to logframe?", body: "Reviewed indicator values will be written to the logframe baseline / midTarget / endTarget fields. This will overwrite existing values.", btn: "Confirm & Write", color: "btn-primary" },
  }[action];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
        <div className="flex items-start gap-4">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", action === "confirm" ? "bg-amber-50" : "bg-slate-50")}>
            <AlertCircle className={cn("w-5 h-5", action === "confirm" ? "text-amber-500" : "text-slate-400")} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{config.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{config.body}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={loading} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="btn-primary">
            {loading ? "Working…" : config.btn}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
