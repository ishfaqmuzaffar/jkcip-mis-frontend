"use client";
import { useQuery } from "@tanstack/react-query";
import { logframeApi, api } from "@/lib/api";
import { formatNumber, formatPercent, progressColor, cn, CURRENT_YEAR, PROJECT_YEARS } from "@/lib/utils";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";
import { ArrowLeft, Target, TrendingUp, Calendar, Info, CheckCircle2, AlertCircle, Circle, Edit2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function IndicatorDetailPage({ params }: { params: { id: string } }) {
  const { canWrite } = useAuth();
  const indicatorId = parseInt(params.id);

  const { data: indicator, isLoading } = useQuery({
    queryKey: ["indicator", indicatorId],
    queryFn: () => logframeApi.getIndicator(indicatorId),
    enabled: !!indicatorId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-brand-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading indicator…</p>
        </div>
      </div>
    );
  }

  if (!indicator) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>Indicator not found.</p>
        <Link href="/logframe" className="text-brand-700 text-sm mt-2 block hover:underline">← Back to Logframe</Link>
      </div>
    );
  }

  const progress = indicator.yearlyProgress ?? [];
  const years = PROJECT_YEARS;

  // Build full year-by-year chart data
  const chartData = years.map(y => {
    const p = progress.find(x => x.reportYear === y);
    return {
      year: y,
      target: p?.annualTarget ?? null,
      result: p?.annualResult ?? null,
      cumTarget: p?.cumulativeTarget ?? null,
      cumResult: p?.cumulativeResult ?? null,
    };
  });

  // Current year stats
  const currentYear = CURRENT_YEAR;
  const currentProg = progress.find(p => p.reportYear === currentYear);
  const currentResult = currentProg?.annualResult ?? null;
  const currentTarget = currentProg?.annualTarget ?? indicator.endTarget ?? 0;
  const achievementPct = currentTarget > 0 && currentResult !== null
    ? Math.min((currentResult / currentTarget) * 100, 150) : 0;

  // Status
  const hasData = currentResult !== null;
  const statusColor = !hasData ? "text-slate-400"
    : achievementPct >= 75 ? "text-green-600"
    : achievementPct >= 50 ? "text-amber-600"
    : "text-red-600";
  const StatusIcon = !hasData ? Circle : achievementPct >= 75 ? CheckCircle2 : AlertCircle;

  // Disaggregation data for current year
  const disagData = currentProg ? [
    { name: "Male", value: currentProg.maleValue ?? 0, color: "#0369a1" },
    { name: "Female", value: currentProg.femaleValue ?? 0, color: "#db2777" },
    { name: "Youth", value: currentProg.youthValue ?? 0, color: "#7c3aed" },
    { name: "Indigenous", value: currentProg.indigenousValue ?? 0, color: "#d97706" },
  ].filter(d => d.value > 0) : [];

  // Baseline → Current → End Target progress
  const baseline = indicator.baseline ?? 0;
  const endTarget = indicator.endTarget ?? 0;
  const progressFromBaseline = endTarget > baseline && currentResult !== null
    ? Math.min(((currentResult - baseline) / (endTarget - baseline)) * 100, 100)
    : 0;

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/logframe" className="flex items-center gap-1 hover:text-brand-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Logframe
        </Link>
        <span>/</span>
        <span className="text-slate-400">{indicator.logframeNode?.code ?? "—"}</span>
        <span>/</span>
        <span className="text-slate-700 font-medium">{indicator.code}</span>
      </div>

      {/* Header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="badge bg-brand-100 text-brand-700 font-mono">{indicator.code}</span>
              <span className="badge bg-slate-100 text-slate-600">{indicator.frequency}</span>
              {indicator.unit && <span className="badge bg-saffron-50 text-saffron-700">Unit: {indicator.unit}</span>}
              {indicator.department && <span className="badge bg-blue-50 text-blue-700">{indicator.department}</span>}
            </div>
            <h1 className="text-xl font-bold text-slate-900 font-display leading-tight">{indicator.name}</h1>
            {indicator.description && (
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{indicator.description}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
              {indicator.source && <span>📊 Source: <strong className="text-slate-700">{indicator.source}</strong></span>}
              {indicator.responsibility && <span>👤 Responsible: <strong className="text-slate-700">{indicator.responsibility}</strong></span>}
              {indicator.crop && <span>🌱 Crop: <strong className="text-slate-700">{indicator.crop}</strong></span>}
            </div>
          </div>

          {/* Current year achievement */}
          <div className="text-center bg-slate-50 rounded-xl p-4 flex-shrink-0 min-w-[120px]">
            <StatusIcon className={cn("w-6 h-6 mx-auto mb-1", statusColor)} />
            <p className={cn("text-3xl font-bold font-display", statusColor)}>
              {hasData ? `${Math.round(achievementPct)}%` : "—"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{currentYear} achievement</p>
            {canWrite && (
              <Link href={`/logframe?indicator=${indicator.id}`}
                className="mt-2 inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-800 font-medium">
                <Edit2 className="w-3 h-3" /> Enter data
              </Link>
            )}
          </div>
        </div>

        {/* Baseline → Current → End Target track */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Baseline: <strong className="text-slate-700">{indicator.baseline ?? "—"}</strong></span>
            <span>Mid-term Target: <strong className="text-slate-700">{indicator.midTarget ?? "—"}</strong></span>
            <span>End Target: <strong className="text-slate-700">{indicator.endTarget ?? "—"}</strong></span>
          </div>
          <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-600 rounded-full transition-all duration-700"
              style={{ width: `${progressFromBaseline}%` }} />
            {/* Mid target marker */}
            {indicator.midTarget && indicator.endTarget && indicator.baseline !== undefined && (
              <div className="absolute top-0 h-full w-0.5 bg-saffron-500/70"
                style={{
                  left: `${Math.min(((indicator.midTarget - (indicator.baseline ?? 0)) / ((indicator.endTarget - (indicator.baseline ?? 0)) || 1)) * 100, 100)}%`
                }} />
            )}
            {/* Current position */}
            {currentResult !== null && progressFromBaseline > 0 && (
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-brand-700 rounded-full shadow"
                style={{ left: `calc(${Math.min(progressFromBaseline, 100)}% - 6px)` }} />
            )}
          </div>
          {currentResult !== null && (
            <p className="text-xs text-brand-700 mt-1 font-medium">
              Current: {currentResult} {indicator.unit ?? ""} ({Math.round(progressFromBaseline)}% of end target journey)
            </p>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Baseline", value: indicator.baseline ?? "—", unit: indicator.unit, color: "text-slate-700", bg: "bg-slate-50" },
          { label: `${currentYear} Annual Result`, value: currentResult ?? "—", unit: currentResult !== null ? indicator.unit : "", color: "text-brand-700", bg: "bg-brand-50" },
          { label: "Mid-term Target", value: indicator.midTarget ?? "—", unit: indicator.unit, color: "text-saffron-700", bg: "bg-saffron-50" },
          { label: "End of Project Target", value: indicator.endTarget ?? "—", unit: indicator.unit, color: "text-blue-700", bg: "bg-blue-50" },
        ].map(k => (
          <div key={k.label} className={cn("rounded-xl p-4 border border-slate-200", k.bg)}>
            <p className={cn("text-2xl font-bold font-display", k.color)}>
              {typeof k.value === "number" ? formatNumber(k.value) : k.value}
              {k.unit && typeof k.value === "number" ? <span className="text-sm font-normal ml-1">{k.unit}</span> : ""}
            </p>
            <p className="text-xs text-slate-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend chart - takes 2/3 */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-1">Annual Performance — Targets vs Results</h3>
          <p className="text-xs text-slate-400 mb-4">Year-by-year comparison across the project period (2024–2031)</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => formatNumber(v)} />
              <Tooltip
                content={({ payload, label }) => {
                  if (!payload?.length) return null;
                  return (
                    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs">
                      <p className="font-semibold text-slate-800 mb-2">{label}</p>
                      {payload.map(p => (
                        <p key={p.name} style={{ color: p.color }}>
                          {p.name}: {p.value !== null ? formatNumber(p.value as number) : "—"} {indicator.unit ?? ""}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
              <Bar dataKey="target" name="Annual Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="result" name="Annual Result" fill="#15803d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Disaggregation pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-1">Disaggregation</h3>
          <p className="text-xs text-slate-400 mb-4">{currentYear} breakdown by category</p>
          {disagData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={disagData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                  labelLine={false}>
                  {disagData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${formatNumber(v)} ${indicator.unit ?? ""}`, ""]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-slate-300 gap-2">
              <Circle className="w-8 h-8" />
              <p className="text-xs text-center">
                {!indicator.supportsGenderBreakdown && !indicator.supportsYouthBreakdown
                  ? "No disaggregation configured"
                  : "No disaggregation data for " + currentYear}
              </p>
            </div>
          )}

          {/* Disaggregation flags */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
            {indicator.supportsGenderBreakdown && <span className="badge bg-blue-50 text-blue-600 text-[10px]">Gender</span>}
            {indicator.supportsYouthBreakdown && <span className="badge bg-purple-50 text-purple-600 text-[10px]">Youth</span>}
            {indicator.supportsIndigenousBreakdown && <span className="badge bg-amber-50 text-amber-600 text-[10px]">Indigenous</span>}
            {indicator.supportsHouseholdBreakdown && <span className="badge bg-green-50 text-green-600 text-[10px]">Household</span>}
            {indicator.supportsDistrictBreakdown && <span className="badge bg-slate-100 text-slate-600 text-[10px]">District</span>}
          </div>
        </div>
      </div>

      {/* Cumulative trend */}
      {progress.some(p => p.cumulativeResult !== null) && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-1">Cumulative Progress</h3>
          <p className="text-xs text-slate-400 mb-4">Running total against cumulative targets</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => formatNumber(v)} />
              <Tooltip formatter={(v: any) => [v !== null ? `${formatNumber(v)} ${indicator.unit ?? ""}` : "—", ""]} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Line type="monotone" dataKey="cumTarget" name="Cumulative Target"
                stroke="#e2e8f0" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="cumResult" name="Cumulative Result"
                stroke="#15803d" strokeWidth={2.5} dot={{ fill: "#15803d", r: 4 }}
                connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Year-by-year data table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Year-by-Year Detail</h3>
            <p className="text-xs text-slate-400 mt-0.5">All recorded progress entries for this indicator</p>
          </div>
          <span className="badge bg-brand-50 text-brand-700">{progress.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="table-th">Year</th>
                <th className="table-th text-right">Annual Target</th>
                <th className="table-th text-right">Annual Result</th>
                <th className="table-th text-right">Achievement</th>
                <th className="table-th text-right">Cum. Target</th>
                <th className="table-th text-right">Cum. Result</th>
                {indicator.supportsGenderBreakdown && <>
                  <th className="table-th text-right">Male</th>
                  <th className="table-th text-right">Female</th>
                </>}
                {indicator.supportsYouthBreakdown && <th className="table-th text-right">Youth</th>}
                <th className="table-th">Evidence</th>
                <th className="table-th">Verified</th>
              </tr>
            </thead>
            <tbody>
              {years.map(y => {
                const p = progress.find(x => x.reportYear === y);
                const result = p?.annualResult ?? null;
                const target = p?.annualTarget ?? null;
                const pct = target && result !== null ? Math.min((result / target) * 100, 150) : null;
                const isCurrent = y === currentYear;
                return (
                  <tr key={y} className={cn("hover:bg-slate-50 transition-colors", isCurrent && "bg-brand-50/30")}>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-semibold", isCurrent ? "text-brand-700" : "text-slate-700")}>{y}</span>
                        {isCurrent && <span className="badge bg-brand-100 text-brand-700 text-[10px]">Current</span>}
                        {y > currentYear && <span className="text-[10px] text-slate-300">Future</span>}
                      </div>
                    </td>
                    <td className="table-td text-right text-slate-500">{target !== null ? formatNumber(target) : "—"}</td>
                    <td className="table-td text-right">
                      <span className={cn("font-semibold", result !== null ? "text-brand-700" : "text-slate-300")}>
                        {result !== null ? formatNumber(result) : "—"}
                      </span>
                    </td>
                    <td className="table-td text-right">
                      {pct !== null ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", progressColor(pct))}
                              style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="font-bold text-xs" style={{
                            color: pct >= 75 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626"
                          }}>
                            {Math.round(pct)}%
                          </span>
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="table-td text-right text-slate-500">
                      {p?.cumulativeTarget !== null && p?.cumulativeTarget !== undefined ? formatNumber(p.cumulativeTarget) : "—"}
                    </td>
                    <td className="table-td text-right text-slate-500">
                      {p?.cumulativeResult !== null && p?.cumulativeResult !== undefined ? formatNumber(p.cumulativeResult) : "—"}
                    </td>
                    {indicator.supportsGenderBreakdown && <>
                      <td className="table-td text-right text-slate-500">
                        {p?.maleValue !== null && p?.maleValue !== undefined ? formatNumber(p.maleValue) : "—"}
                      </td>
                      <td className="table-td text-right text-slate-500">
                        {p?.femaleValue !== null && p?.femaleValue !== undefined ? formatNumber(p.femaleValue) : "—"}
                      </td>
                    </>}
                    {indicator.supportsYouthBreakdown && (
                      <td className="table-td text-right text-slate-500">
                        {p?.youthValue !== null && p?.youthValue !== undefined ? formatNumber(p.youthValue) : "—"}
                      </td>
                    )}
                    <td className="table-td text-xs text-slate-500 max-w-[140px] truncate">
                      {p?.evidenceSource ?? "—"}
                    </td>
                    <td className="table-td">
                      {p?.verifiedAt ? (
                        <span className="badge bg-green-100 text-green-700 text-[10px]">
                          ✓ {p.verifiedBy?.fullName ?? "Verified"}
                        </span>
                      ) : p ? (
                        <span className="badge bg-amber-50 text-amber-600 text-[10px]">Pending</span>
                      ) : <span className="text-slate-200">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
