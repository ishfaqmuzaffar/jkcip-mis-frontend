"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { logframeApi } from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, Cell,
} from "recharts";
import { formatPercent, formatNumber, CURRENT_YEAR, PROJECT_YEARS } from "@/lib/utils";
import { TrendingUp, Users, Target, Percent } from "lucide-react";

const YEARS = PROJECT_YEARS.filter(y => y <= CURRENT_YEAR);

export default function AnalyticsPage() {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const { data: logframeDash } = useQuery({
    queryKey: ["logframe-dashboard", selectedYear],
    queryFn: () => logframeApi.getDashboard(selectedYear),
  });

  const { data: outcomes } = useQuery({
    queryKey: ["outcome-performance", selectedYear],
    queryFn: () => logframeApi.getOutcomePerformance(selectedYear),
  });

  // Build multi-year trend data (indicative; uses current data per year)
  const { data: currentDash } = useQuery({
    queryKey: ["logframe-dashboard"],
    queryFn: () => logframeApi.getDashboard(),
  });

  // Radar chart data from outcomes
  const radarData = (outcomes ?? []).slice(0, 6).map((o) => ({
    outcome: o.code,
    achievement: Math.round(o.achievementRate),
    fullTitle: o.title,
  }));

  // Disaggregation totals from logframe dashboard
  const totals = logframeDash?.totals;
  const genderData = totals
    ? [
        { name: "Annual Target", value: Math.round(totals.annualTarget) },
        { name: "Annual Result", value: Math.round(totals.annualResult) },
        { name: "Cumulative Target", value: Math.round(totals.cumulativeTarget) },
        { name: "Cumulative Result", value: Math.round(totals.cumulativeResult) },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Year selector */}
      <div className="flex items-center gap-4">
        <div className="flex bg-white border border-slate-200 rounded-lg p-1 gap-1">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedYear === y
                  ? "bg-brand-700 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Active Indicators",
            value: logframeDash?.activeIndicators ?? "—",
            sub: `of ${logframeDash?.totalIndicators ?? 0} total`,
            icon: Target,
            color: "text-brand-700",
            bg: "bg-brand-50",
          },
          {
            label: "Indicators with Data",
            value: logframeDash?.indicatorsWithData ?? "—",
            sub: "have at least one entry",
            icon: TrendingUp,
            color: "text-blue-700",
            bg: "bg-blue-50",
          },
          {
            label: "On Target",
            value: logframeDash?.achievedIndicators ?? "—",
            sub: "met annual target",
            icon: Percent,
            color: "text-green-700",
            bg: "bg-green-50",
          },
          {
            label: "Achievement Rate",
            value: logframeDash ? formatPercent(logframeDash.achievementRate) : "—",
            sub: "overall logframe achievement",
            icon: Users,
            color: "text-saffron-700",
            bg: "bg-saffron-50",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${card.bg}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 font-display">{card.value}</p>
                <p className="text-xs text-slate-600 font-medium">{card.label}</p>
                <p className="text-xs text-slate-400">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Outcomes radar */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-1">Outcome Performance Radar</h3>
          <p className="text-xs text-slate-500 mb-4">Achievement rate across all outcomes for {selectedYear}</p>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis
                  dataKey="outcome"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <Radar
                  name="Achievement %"
                  dataKey="achievement"
                  stroke="#15803d"
                  fill="#15803d"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs max-w-[200px]">
                        <p className="font-semibold text-slate-800 mb-1">{d.fullTitle}</p>
                        <p className="text-brand-700">Achievement: {d.achievement}%</p>
                      </div>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
              No outcome data available
            </div>
          )}
        </div>

        {/* Targets vs Results bar */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-1">Targets vs Results</h3>
          <p className="text-xs text-slate-500 mb-4">Annual and cumulative comparison for {selectedYear}</p>
          {genderData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={genderData} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => formatNumber(v)} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-lg text-xs">
                        <p className="font-medium">{payload[0].payload.name}</p>
                        <p className="text-brand-700">{formatNumber(payload[0].value as number)}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {genderData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? "#e2e8f0" : "#15803d"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
              No data for {selectedYear}
            </div>
          )}
        </div>
      </div>

      {/* Outcomes detail table */}
      {outcomes && outcomes.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Outcome Performance Detail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-th">Outcome</th>
                  <th className="table-th text-right">Total Indicators</th>
                  <th className="table-th text-right">On Target</th>
                  <th className="table-th text-right">Annual Result</th>
                  <th className="table-th text-right">Achievement</th>
                  <th className="table-th">Progress Bar</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-td">
                      <p className="font-medium text-slate-800">{o.title}</p>
                      <p className="text-xs text-slate-400 font-mono">{o.code}</p>
                    </td>
                    <td className="table-td text-right">{o.indicators}</td>
                    <td className="table-td text-right text-brand-700 font-semibold">{o.achievedIndicators}</td>
                    <td className="table-td text-right">{formatNumber(o.totals?.annualResult ?? 0)}</td>
                    <td className="table-td text-right font-bold">{formatPercent(o.achievementRate)}</td>
                    <td className="table-td w-40">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-600 rounded-full"
                            style={{ width: `${Math.min(o.achievementRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
