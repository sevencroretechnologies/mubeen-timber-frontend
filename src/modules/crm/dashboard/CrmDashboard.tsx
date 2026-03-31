import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  dashboardService,
  opportunityApi,
  customerApi,
  salesTaskDetailApi
} from "../../../services/api";
import type { DashboardStats, Opportunity, SalesTaskDetail } from "../../../types";
import {
  TrendingUp,
  TrendingDown,
  CheckSquare,
  AlertCircle,
  ClipboardList
} from "lucide-react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, ComposedChart, Line, Bar
} from "recharts";
import "./CrmDashboard.css";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: '#fff',
        padding: '6px 10px',
        border: 'none',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '11px',
        fontWeight: 600,
        color: '#495057',
        maxWidth: '300px',
        whiteSpace: 'normal',
        wordWrap: 'break-word',
        zIndex: 50
      }}>
        {data.fullName || payload[0].name}: {payload[0].value}
      </div>
    );
  }
  return null;
};



function LostDealReasonsChart({ stats }: { stats: DashboardStats }) {
  const navigate = useNavigate();
  const lostReasonsColors = [
    "#0b7296", // Blue
    "#a53c2b", // Red/Brown
    "#e19e1e", // Orange/Yellow
    "#85436d", // Purple
    "#469f52", // Green
    "#74788d"  // Grey for Others
  ];

  let rawLostReasons = (stats.opportunities?.lost_reasons || [])
    .filter((s: any) => s.reason && s.reason.toLowerCase() !== 'open')
    .map((s: any) => ({
      name: s.reason || "Unknown",
      value: Number(s.count)
    })).sort((a: any, b: any) => b.value - a.value);

  let finalLostReasons;
  if (rawLostReasons.length > 5) {
    finalLostReasons = rawLostReasons.slice(0, 4);
    const othersCount = rawLostReasons.slice(4).reduce((acc, curr) => acc + curr.value, 0);
    finalLostReasons.push({ name: "Others", value: othersCount });
  } else {
    finalLostReasons = rawLostReasons;
  }

  const lostReasonsData = finalLostReasons.map((s, i) => {
    const rawName = s.name;
    const displayName = rawName.length > 40 ? rawName.substring(0, 40) + "..." : rawName;
    return {
      name: displayName,
      fullName: rawName,
      value: s.value,
      color: lostReasonsColors[i % lostReasonsColors.length]
    };
  });

  // Fallback if no data
  const hasData = lostReasonsData.length > 0;
  const displayData = hasData ? lostReasonsData : [{ name: "No Data", value: 1, fullName: "No Data", color: "#f8f9fa" }];

  return (
    <div className="lg:col-span-1 h-full">
      <div
        className="dash-card cursor-pointer hover:shadow-md transition-shadow h-full flex flex-col min-h-[350px]"
        onClick={() => navigate('/crm/opportunities')}
      >
        <div className="dash-card-header flex justify-between items-center">
          <h5 className="font-semibold text-gray-700">Lost deal reasons</h5>
          <div className="text-gray-400">
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 12H18V10H0V12ZM0 7H18V5H0V7ZM0 0V2H18V0H0Z" fill="currentColor" />
            </svg>
          </div>
        </div>
        <div className="dash-card-body flex flex-col md:flex-row items-center gap-6" style={{ minHeight: 320, padding: '24px' }}>
          {/* Chart Section */}
          <div className="flex-shrink-0 w-full md:w-[280px] lg:w-[300px]" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={displayData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={115}
                  paddingAngle={0}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {displayData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Section */}
          <div className="flex-1 w-full flex flex-col justify-center gap-3">
            {displayData.map((entry, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: entry.color }}
                />
                <div className="text-[12px] font-medium text-gray-600 leading-snug break-words">
                  {entry.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CrmDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesOverviewData, setSalesOverviewData] = useState<any[]>([]);
  const [latestOpportunities, setLatestOpportunities] = useState<Opportunity[]>([]);
  const [tasks, setTasks] = useState<SalesTaskDetail[]>([]);
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.getStats().then(r => r.data).catch(() => null),
      dashboardService.getSalesOverview().then(r => Array.isArray(r) ? r : r.data).catch(() => []),
      opportunityApi.list({ per_page: 5, sort_by: 'created_at', sort_order: 'desc' }).then(r => Array.isArray(r) ? r : r.data).catch(() => []),
      salesTaskDetailApi.list({ per_page: 100 }).then(r => Array.isArray(r) ? r : r.data).catch(() => []),
      customerApi.list({ per_page: 1 }).then(r => r.total || 0).catch(() => 0)
    ]).then(([s, salesOvw, opps, tsks, custTotal]) => {
      setStats(s);
      setSalesOverviewData(salesOvw as any[]);
      setLatestOpportunities(opps as Opportunity[]);
      setTasks(tsks as SalesTaskDetail[]);
      setTotalCustomers(custTotal as number);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="crm-dash-wrapper">
        <div className="dashboard-header mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse"></div>
        </div>

        {/* KPI Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-card p-5 h-[104px] flex flex-col justify-between">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3"></div>
              <div className="flex justify-between items-end">
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-5 w-16 bg-gray-100 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 dash-card lg:h-[340px]">
            <div className="p-4 border-b border-gray-100"><div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div></div>
            <div className="p-4 h-[260px]"><div className="h-full w-full bg-gray-50 rounded animate-pulse"></div></div>
          </div>
          <div className="lg:col-span-1 dash-card lg:h-[340px]">
            <div className="p-4 border-b border-gray-100"><div className="h-5 w-40 bg-gray-200 rounded animate-pulse"></div></div>
            <div className="p-4 flex justify-center items-center h-[260px]"><div className="h-40 w-40 bg-gray-100 rounded-full animate-pulse"></div></div>
          </div>
        </div>

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 dash-card min-h-[300px]">
            <div className="p-4 border-b border-gray-100"><div className="h-5 w-40 bg-gray-200 rounded animate-pulse"></div></div>
            <div className="p-4 flex flex-col gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-10 w-full bg-gray-50 rounded animate-pulse"></div>)}
            </div>
          </div>
          <div className="lg:col-span-1 dash-card min-h-[300px]">
            <div className="p-4 border-b border-gray-100"><div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div></div>
            <div className="p-4 flex flex-col gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-14 w-full bg-gray-50 rounded animate-pulse"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg m-4">Failed to load dashboard data</div>;
  }

  // Calculate task metrics
  const today = new Date().toISOString().split('T')[0];
  const dueToday = tasks.filter(t => t.date === today && t.status !== 'Closed').length;
  const overdue = tasks.filter(t => t.date < today && t.status !== 'Closed').length;
  const completedTasks = tasks.filter(t => t.status === 'Closed').length;

  // KPI data
  const kpis = [
    {
      label: "Total Leads",
      value: stats.leads?.total?.toString() || "0",
      changeLabel: `+${stats.leads?.new_last_30_days || 0} new`,
      positive: true,
    },
    {
      label: "Opportunities",
      value: stats.opportunities?.total?.toString() || "0",
      changeLabel: `${stats.opportunities?.open || 0} open`,
      positive: true,
    },
    {
      label: "Customers",
      value: totalCustomers.toString(),
      changeLabel: "Total",
      positive: true,
    },
    {
      label: "Total Revenue",
      value: `₹${(stats.opportunities?.total_value || 0).toLocaleString()}`,
      changeLabel: "Expected",
      positive: true,
    },
  ];

  return (
    <div className="crm-dash-wrapper">
      {/* Header */}
      <div className="dashboard-header mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Welcome !</h2>
          <p className="text-gray-500 text-sm mt-1">Overview of your CRM activity</p>
        </div>
        <div className="dashboard-breadcrumb">
          <span>Dashboard</span> &rsaquo; Welcome !
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card flex flex-col justify-between p-5">
            <div className="kpi-label text-gray-500 text-sm mb-3 font-medium tracking-wide uppercase">{kpi.label}</div>
            <div className="flex items-baseline gap-4">
              <div className="text-2xl font-bold text-gray-800">{kpi.value}</div>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${kpi.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {kpi.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {kpi.changeLabel}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="lg:col-span-1">
          <div className="dash-card h-full min-h-[350px] flex flex-col">
            <div className="dash-card-header">
              <h5 className="font-semibold text-gray-700">Sales Overview</h5>
            </div>
            <div className="dash-card-body flex-[1]">
              <div style={{ height: '100%', minHeight: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={salesOverviewData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#74788d', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#74788d', fontSize: 12 }}
                      tickFormatter={(val) => `₹${val / 1000}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={false}
                    />
                    <Tooltip cursor={{ fill: '#f8f9fa' }} content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="rect" align="left" wrapperStyle={{ left: 0, top: -10 }} />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      name="Revenue"
                      fill="#556ee6"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="deals"
                      name="Deals"
                      stroke="#34c38f"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#fff', stroke: '#34c38f', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Lost Deal Reasons Chart */}
        <LostDealReasonsChart stats={stats} />
      </div>

      {/* Row 3: Latest Opportunities + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Opportunities Table */}
        <div className="lg:col-span-2">
          <div className="dash-card">
            <div className="dash-card-header !pb-4">
              <h5 className="font-semibold text-gray-700">Latest Opportunities</h5>
              <div className="text-blue-500 hover:text-blue-600 font-medium cursor-pointer text-sm">
                View All &rsaquo;
              </div>
            </div>
            <div className="dash-card-body p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Party Name</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expected Close</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestOpportunities.length > 0 ? latestOpportunities.map((row, i) => {
                      let color = "text-slate-600 bg-slate-100";
                      const status = row.status?.status_name || 'Open';
                      if (status === 'Open') color = "text-amber-600 bg-amber-50";
                      if (status === 'Converted' || status === 'Won') color = "text-emerald-700 bg-emerald-50";
                      if (status === 'Lost') color = "text-rose-600 bg-rose-50";

                      let partyName = row.party_name || row.company_name;
                      if (!partyName) {
                        partyName = row.customer ? (row.customer as any).company_name :
                          row.lead ? ((row.lead as any).company_name || `${(row.lead as any).first_name || ''} ${(row.lead as any).last_name || ''}`.trim()) :
                            'Unknown';
                      }

                      return (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-5 py-3.5 text-sm font-medium text-gray-700">{partyName}</td>
                          <td className="px-5 py-3.5 text-sm">
                            <span className={`px-2.5 py-1 rounded text-xs font-semibold tracking-wide ${color}`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm font-semibold text-gray-700">₹{(row.opportunity_amount || 0).toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-sm text-gray-500">{row.expected_closing || 'N/A'}</td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">No recent opportunities found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Overview */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="dash-card">
            <div className="dash-card-header !pb-4">
              <h5 className="font-semibold text-gray-700">Tasks Overview</h5>
            </div>
            <div className="dash-card-body">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center text-amber-500">
                      <CheckSquare size={16} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Tasks Due Today</span>
                  </div>
                  <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded text-sm min-w-[28px] text-center">{dueToday}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-rose-50 flex items-center justify-center text-rose-500">
                      <AlertCircle size={16} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Overdue Tasks</span>
                  </div>
                  <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded text-sm min-w-[28px] text-center">{overdue}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <ClipboardList size={16} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Completed Tasks</span>
                  </div>
                  <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-sm min-w-[28px] text-center">{completedTasks}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
