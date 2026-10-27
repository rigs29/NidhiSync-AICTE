import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  PieChart as PieIcon,
  TrendingUp,
  Landmark,
  Calendar,
  ShieldCheck,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api, API_BASE } from '../services/api';
import { AnalyticsData } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const COLORS = ['#0c2340', '#0d9488', '#f59e0b', '#dc2626', '#8b5cf6', '#10b981', '#64748b'];

export const ReportsAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const res = await api.get<AnalyticsData>('/reports/analytics');
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handleExportCsv = () => {
    const token = localStorage.getItem('aicte_token');
    const url = `${API_BASE}/reports/export/fdrs.csv${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return <LoadingSpinner message="Generating regulatory compliance visual analytics..." fullPage />;
  }

  const statusData = data?.status_distribution || [];
  const bankData = (data?.bank_distribution || []).map(b => ({
    ...b,
    amountInLakhs: (b.amount / 100000).toFixed(1),
  }));
  const maturityData = data?.maturity_timeline || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gov-navy-800 uppercase tracking-wider mb-1">
            <BarChart3 className="h-4 w-4 text-gov-teal-600" />
            <span>AICTE Regulatory Analytics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
            Reports & Portfolio Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Institutional fixed deposit concentration, status distribution, and statutory maturity forecasts.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm"
        >
          <Download className="h-4 w-4" />
          <span>Export Master CSV Report</span>
        </button>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Status Distribution Pie */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-gov-navy-900" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Administrative Status Breakdown
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Count Distribution</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bank Concentration Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-gov-teal-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Scheduled Bank Concentration (₹ Lakhs)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Exposure Principal</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bankData}>
                <XAxis dataKey="bank" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [`₹${value} Lakhs`, 'Total Principal']} />
                <Bar dataKey="amountInLakhs" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Maturity Forecast Timeline Buckets */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Statutory Maturity Countdown Timeline
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Renewal Alert Horizons</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maturityData}>
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(value) => [`${value} Instruments`, 'Count']} />
                <Bar dataKey="count" fill="#0c2340" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

