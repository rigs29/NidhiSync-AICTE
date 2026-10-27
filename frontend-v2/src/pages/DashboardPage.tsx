import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileSpreadsheet,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  ScanEye,
  RefreshCw,
  HandCoins,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge, MaturityBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { 
  CollegeDashboardStats, 
  OfficerDashboardStats, 
  AdminDashboardStats, 
  FDRRecord 
} from '../types';

export const DashboardPage: React.FC = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [collegeStats, setCollegeStats] = useState<CollegeDashboardStats | null>(null);
  const [officerStats, setOfficerStats] = useState<OfficerDashboardStats | null>(null);
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(null);
  const [recentFdrs, setRecentFdrs] = useState<FDRRecord[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        if (role === 'COLLEGE_USER') {
          const [stats, fdrs] = await Promise.all([
            api.get<CollegeDashboardStats>('/dashboard/college'),
            api.get<FDRRecord[]>('/fdrs?limit=5'),
          ]);
          setCollegeStats(stats);
          setRecentFdrs(fdrs);
        } else if (role === 'AICTE_OFFICER') {
          const [stats, fdrs] = await Promise.all([
            api.get<OfficerDashboardStats>('/dashboard/officer'),
            api.get<FDRRecord[]>('/fdrs?limit=6'),
          ]);
          setOfficerStats(stats);
          setRecentFdrs(fdrs);
        } else if (role === 'ADMIN') {
          const [stats, fdrs] = await Promise.all([
            api.get<AdminDashboardStats>('/dashboard/admin'),
            api.get<FDRRecord[]>('/fdrs?limit=6'),
          ]);
          setAdminStats(stats);
          setRecentFdrs(fdrs);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [role]);

  if (isLoading) {
    return <LoadingSpinner message="Assembling statutory dashboard metrics..." fullPage />;
  }

  // -------------------------------------------------------------
  // 1. COLLEGE USER DASHBOARD
  // -------------------------------------------------------------
  if (role === 'COLLEGE_USER') {
    return (
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-gov-navy-800 uppercase tracking-wider mb-1">
              <Building2 className="h-4 w-4 text-gov-teal-600" />
              <span>Institutional Compliance Dashboard</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
              {user?.institution_name || 'My Technical Institution'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Managing security deposit liens under the Member Secretary, AICTE New Delhi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/fdrs/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Register New FDR</span>
            </Link>
            <Link
              to="/ocr-workspace"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-teal-50 text-gov-teal-900 border border-gov-teal-300 hover:bg-gov-teal-100 transition-colors shadow-2xs"
            >
              <ScanEye className="h-4 w-4 text-gov-teal-600" />
              <span>OCR Workspace</span>
            </Link>
          </div>
        </div>

        {/* Urgent Action Warning if clarification or maturity pending */}
        {((collegeStats?.clarification_required || 0) > 0 || (collegeStats?.approaching_maturity || 0) > 0) && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Attention Required from College Authority:</span>
              <p>
                You have {collegeStats?.clarification_required} FDR(s) requiring resubmission or officer clarification, 
                and {collegeStats?.approaching_maturity} FDR(s) maturing within the statutory 30-day window.
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Active Deposit"
            value={`₹${(collegeStats?.total_deposit_amount || 0).toLocaleString('en-IN')}`}
            subtitle="Under AICTE Joint Lien"
            icon={TrendingUp}
            variant="primary"
          />
          <StatCard
            title="Active Instruments"
            value={collegeStats?.active_fdrs || 0}
            subtitle={`${collegeStats?.total_fdrs || 0} Total Registered`}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="Approaching Maturity"
            value={collegeStats?.approaching_maturity || 0}
            subtitle="Next 30 Days"
            icon={Clock}
            variant="warning"
            onClick={() => navigate('/renewals')}
          />
          <StatCard
            title="Clarification Needed"
            value={collegeStats?.clarification_required || 0}
            subtitle="Action Requested by Officer"
            icon={HelpCircle}
            variant={collegeStats?.clarification_required ? 'danger' : 'default'}
            onClick={() => navigate('/fdrs?status=CLARIFICATION_REQUIRED')}
          />
        </div>

        {/* Quick Links Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/renewals"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-gov-teal-500 hover:shadow-sm transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-gov-teal-700">Submit Renewal Instrument</h4>
                <p className="text-[11px] text-slate-500">Provide replacement FDR with fresh lien</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/releases"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-gov-teal-500 hover:shadow-sm transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
                <HandCoins className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-gov-teal-700">Request Deposit Release</h4>
                <p className="text-[11px] text-slate-500">Apply for closure after statutory lock-in</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/ocr-workspace"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-gov-teal-500 hover:shadow-sm transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gov-teal-50 text-gov-teal-700">
                <ScanEye className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-gov-teal-700">Test OCR Verification</h4>
                <p className="text-[11px] text-slate-500">Side-by-side scanner crosscheck</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Recent FDRs List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-gov-navy-900" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Registered Institutional FDR Receipts
              </h3>
            </div>
            <Link to="/fdrs" className="text-xs font-bold text-gov-teal-700 hover:underline">
              View All FDRs →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">FDR Reference</th>
                  <th className="py-2.5 px-3">Bank & Branch</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Maturity Date</th>
                  <th className="py-2.5 px-3">Administrative Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentFdrs.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-gov-navy-950 font-mono">
                      {f.fdr_number}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      <div className="font-semibold">{f.bank_name}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{f.branch_name}</div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      ₹{f.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <div>{f.maturity_date ? f.maturity_date.split('T')[0] : 'N/A'}</div>
                      <div className="text-[10px] text-slate-400">
                        <MaturityBadge status={f.maturity_status} days={f.days_to_maturity} size="sm" />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={f.administrative_status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/fdrs/${f.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gov-teal-700 hover:text-gov-teal-900"
                      >
                        <span>Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. AICTE OFFICER DASHBOARD
  // -------------------------------------------------------------
  if (role === 'AICTE_OFFICER') {
    return (
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-gov-teal-700 uppercase tracking-wider mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span>AICTE Scrutiny & Regulatory Oversight</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
              Scrutiny Officer Workspace
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Inspection, OCR anomaly detection, and verification of institutional fixed deposit security receipts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/scrutiny-queue"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Scrutiny Queue ({officerStats?.pending_scrutiny || 0})</span>
            </Link>
            <Link
              to="/ocr-workspace"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-teal-50 text-gov-teal-900 border border-gov-teal-300 hover:bg-gov-teal-100 transition-colors shadow-2xs"
            >
              <ScanEye className="h-4 w-4 text-gov-teal-600" />
              <span>OCR Workspace</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Pending Scrutiny"
            value={officerStats?.pending_scrutiny || 0}
            subtitle="Instruments awaiting review"
            icon={FileCheck2}
            variant="warning"
            onClick={() => navigate('/scrutiny-queue')}
          />
          <StatCard
            title="Discrepancy Cases"
            value={officerStats?.discrepancy_cases || 0}
            subtitle="Flagged by OCR or manual scrutiny"
            icon={AlertTriangle}
            variant="danger"
            onClick={() => navigate('/scrutiny-queue?tab=discrepancies')}
          />
          <StatCard
            title="Upcoming Maturities"
            value={officerStats?.upcoming_maturities || 0}
            subtitle="Next 30 Days"
            icon={Clock}
            variant="default"
            onClick={() => navigate('/renewals')}
          />
          <StatCard
            title="Total Managed Portfolio"
            value={`₹${(officerStats?.total_portfolio_amount || 0).toLocaleString('en-IN')}`}
            subtitle={`Across ${officerStats?.total_institutions || 0} Technical Colleges`}
            icon={TrendingUp}
            variant="primary"
          />
        </div>

        {/* Scrutiny Action Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Priority Scrutiny Inspection Queue
              </h3>
              <p className="text-[11px] text-slate-500">
                Examine document receipt scans against submitted institutional metadata using dual-pane OCR.
              </p>
            </div>
            <Link to="/scrutiny-queue" className="text-xs font-bold text-gov-teal-700 hover:underline">
              Open Full Queue →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Institution</th>
                  <th className="py-2.5 px-3">FDR Number</th>
                  <th className="py-2.5 px-3">Bank</th>
                  <th className="py-2.5 px-3">Deposit Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Scrutiny Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentFdrs.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{f.institution_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{f.aicte_code}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-gov-navy-950">
                      {f.fdr_number}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {f.bank_name}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      ₹{f.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={f.administrative_status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/ocr-workspace?id=${f.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gov-navy-900 hover:bg-gov-navy-800 text-white text-[11px] font-bold shadow-2xs transition-colors"
                      >
                        <ScanEye className="h-3.5 w-3.5 text-gov-teal-400" />
                        <span>OCR Review</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">
            <Activity className="h-4 w-4" />
            <span>AICTE Central Administration & Infrastructure Control</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
            System Administration Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            System health, immutable audit trail, automated scheduler triggers, and user administration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/users"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm"
          >
            <span>Manage Users</span>
          </Link>
          <Link
            to="/audit-trail"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors shadow-2xs"
          >
            <span>Audit Trail</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Institutions"
          value={adminStats?.total_institutions || 0}
          subtitle="Registered Colleges"
          icon={Building2}
          variant="default"
          onClick={() => navigate('/institutions')}
        />
        <StatCard
          title="Total Fixed Deposits"
          value={adminStats?.total_fdrs || 0}
          subtitle={`₹${(adminStats?.total_amount || 0).toLocaleString('en-IN')}`}
          icon={FileSpreadsheet}
          variant="primary"
          onClick={() => navigate('/fdrs')}
        />
        <StatCard
          title="Audit Log Records"
          value={adminStats?.recent_audit_count || 0}
          subtitle="Immutable Security Logs"
          icon={Activity}
          variant="default"
          onClick={() => navigate('/audit-trail')}
        />
      </div>

      {/* System Status and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Status Breakdown Distribution
            </h3>
            <span className="text-[11px] text-gov-teal-700 font-semibold">Click to filter repository</span>
          </div>
          <div className="space-y-2">
            {Object.entries(adminStats?.status_distribution || {}).map(([key, count]) => (
              <div
                key={key}
                onClick={() => navigate(`/fdrs?status=${encodeURIComponent(key)}`)}
                className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 hover:bg-gov-teal-50 hover:border-gov-teal-300 border border-slate-100 cursor-pointer transition-all duration-150 group shadow-2xs hover:shadow-sm"
                title={`View all ${key} FDR instruments`}
              >
                <span className="font-semibold text-slate-700 group-hover:text-gov-teal-900 transition-colors">
                  {key.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-gov-navy-900 text-white font-bold font-mono text-[11px] group-hover:bg-gov-teal-700 transition-colors">
                    {count}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-gov-teal-700 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Bank Concentration Distribution
            </h3>
            <span className="text-[11px] text-gov-teal-700 font-semibold">Click to view bank instruments</span>
          </div>
          <div className="space-y-2">
            {Object.entries(adminStats?.bank_distribution || {}).map(([bank, count]) => (
              <div
                key={bank}
                onClick={() => navigate(`/fdrs?bank=${encodeURIComponent(bank)}`)}
                className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 hover:bg-gov-teal-50 hover:border-gov-teal-300 border border-slate-100 cursor-pointer transition-all duration-150 group shadow-2xs hover:shadow-sm"
                title={`View all ${bank} FDR instruments`}
              >
                <span className="font-semibold text-slate-700 group-hover:text-gov-teal-900 transition-colors">
                  {bank}
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-gov-teal-100 text-gov-teal-900 font-bold font-mono text-[11px] group-hover:bg-gov-teal-200 transition-colors">
                    {count} {count === 1 ? 'Instrument' : 'Instruments'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-gov-teal-700 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

