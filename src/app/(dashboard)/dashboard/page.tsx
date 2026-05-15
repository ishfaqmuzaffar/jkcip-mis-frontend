"use client";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, logframeApi } from "@/lib/api";
import { formatNumber, formatPercent, progressColor } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  Users,
  FolderOpen,
  Briefcase,
  CheckSquare,
  TrendingUp,
  Target,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const OUTCOME_COLORS = ["#15803d", "#16a34a", "#d97706", "#e07b39", "#7c3aed", "#0369a1"];

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardApi.getStats,
  });

  const { data: overview } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: dashboardApi.getOverview,
  });

  const { data: logframeDash } = useQuery({
    queryKey: ["logframe-dashboard"],
    queryFn: () => logframeApi.getDashboard(),
  });

  const { data: outcomes } = useQuery({
    queryKey: ["outcome-performance"],
    queryFn: () => logframeApi.getOutcomePerformance(),
  });

  const statCards = [
    {
      label: "Total Schemes",
      value: stats?.totalSchemes ?? 0,
      icon: FolderOpen,
      color: "text-brand-700",
      bg: "bg-brand-50",
      sub: `${stats?.activeSchemes ?? 0} active`,
    },
    {
      label: "Total Projects",
      value: stats?.totalProjects ?? 0,
      icon: Briefcase,
      color: "text-blue-700",
      bg: "bg-blue-50",
      sub: `${stats?.ongoingProjects ?? 0} ongoing`,
    },
    {
      label: "Beneficiaries",
      value: stats?.totalBeneficiaries ?? 0,
      icon: Users,
      color: "text-purple-700",
      bg: "bg-purple-50",
      sub: `${stats?.approvedBeneficiaries ?? 0} approved`,
    },
    {
      label: "Pending Approvals",
      value: stats?.pendingApprovals ?? 0,
      icon: CheckSquare,
      color: "text-saffron-700",
      bg: "bg-saffron-50",
      sub: "require action",
    },
  ];

  // Build outcomes chart data
  const outcomeChartData =
    outcomes?.map((o, i) => ({
      name: o.code,
      fullName: o.title.length > 40 ? o.title.substring(0, 40) + "…" : o.title,
      achievement: Math.round(o.achievementRate),
      indicators: o.indicators,
      achieved: o.achievedIndicators,
      fill: OUTCOME_COLORS[i % OUTCOME_COLORS.length],
    })) ?? [];

  // Projects by status pie
  const projectStatus = overview?.projectsByStatus
    ? Object.entries(overview.projectsByStatus).map(([k, v]) => ({ name: k, value: v }))
    : [];

  const PIE_COLORS = ["#15803d", "#d97706", "#0369a1", "#7c3aed"];

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Logframe summary banner */}
      {logframeDash && (
        <div className="bg-sidebar rounded-xl p-5 flex flex-wrap gap-6 items-center">
          <div className="flex-1">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
              Logframe Achievement Rate
            </p>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold text-white font-display">
                {formatPercent(logframeDash.achievementRate)}
              </p>
              <p className="text-white/60 text-sm mb-1">
                {logframeDash.achievedIndicators} / {logframeDash.totalIndicators} indicators on target
              </p>
            </div>
          </div>
          <div className="flex gap-6">
            {[
              { label: "Annual Target", value: formatNumber(logframeDash.totals.annualTarget) },
              { label: "Annual Result", value: formatNumber(logframeDash.totals.annualResult) },
              { label: "Achievement", value: formatPercent(logframeDash.totals.annualAchievementPercent) },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-white font-bold text-xl font-display">{s.value}</p>
                <p className="text-white/50 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", card.bg)}>
                <Icon className={cn("w-5 h-5", card.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900 font-display">
                  {statsLoading ? "—" : formatNumber(card.value)}
                </p>
                <p className="text-xs font-medium text-slate-600">{card.label}</p>
                <p className="text-xs text-slate-400">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Outcome achievement chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">Outcome Achievement</h3>
              <p className="text-xs text-slate-500">% of indicators on target per outcome</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-brand-700 font-medium">
              <Activity className="w-3.5 h-3.5" />
              Live
            </div>
          </div>
          {outcomeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={outcomeChartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs">
                        <p className="font-semibold text-slate-800 mb-1">{d.fullName}</p>
                        <p className="text-brand-700">Achievement: {d.achievement}%</p>
                        <p className="text-slate-500">
                          {d.achieved}/{d.indicators} indicators
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="achievement" radius={[6, 6, 0, 0]}>
                  {outcomeChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
              No outcome data available yet
            </div>
          )}
        </div>

        {/* Projects by status pie */}
        <div className="card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800">Projects by Status</h3>
            <p className="text-xs text-slate-500">Current distribution</p>
          </div>
          {projectStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={projectStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {projectStatus.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-lg text-xs">
                        <p className="font-medium text-slate-800">{payload[0].name}</p>
                        <p className="text-slate-600">{payload[0].value} projects</p>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "#64748b" }}
                  formatter={(value) =>
                    value.toString().replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
              No project data yet
            </div>
          )}
        </div>
      </div>

      {/* Logframe level breakdown */}
      {logframeDash?.byLevel && logframeDash.byLevel.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">Indicators by Logframe Level</h3>
              <p className="text-xs text-slate-500">Achievement rate across Results Hierarchy</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-th">Level</th>
                  <th className="table-th text-right">Indicators</th>
                  <th className="table-th text-right">Annual Target</th>
                  <th className="table-th text-right">Annual Result</th>
                  <th className="table-th text-right">Achievement</th>
                  <th className="table-th">Progress</th>
                </tr>
              </thead>
              <tbody>
                {logframeDash.byLevel.map((row) => {
                  const pct = row.totals?.annualAchievementPercent ?? 0;
                  return (
                    <tr key={row.level} className="hover:bg-slate-50 transition-colors">
                      <td className="table-td">
                        <span className="badge bg-brand-50 text-brand-700 font-medium">
                          {row.level.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="table-td text-right font-medium">{row.indicators}</td>
                      <td className="table-td text-right text-slate-500">
                        {formatNumber(row.totals?.annualTarget ?? 0)}
                      </td>
                      <td className="table-td text-right text-slate-500">
                        {formatNumber(row.totals?.annualResult ?? 0)}
                      </td>
                      <td className="table-td text-right font-semibold text-brand-700">
                        {formatPercent(pct)}
                      </td>
                      <td className="table-td w-40">
                        <div className="progress-bar">
                          <div
                            className={cn("progress-fill", progressColor(pct))}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
