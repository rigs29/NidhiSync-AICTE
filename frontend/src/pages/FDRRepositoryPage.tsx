import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  PlusCircle,
  ScanEye,
  ArrowRight,
  Eye,
  Building2,
  Calendar,
  RefreshCw,
  Landmark,
  X
} from 'lucide-react';
import { api, API_BASE } from '../services/api';
import { FDRRecord } from '../types';
import { StatusBadge, MaturityBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';

export const FDRRepositoryPage: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [maturityFilter, setMaturityFilter] = useState(searchParams.get('maturity_status') || 'ALL');
  const [bankFilter, setBankFilter] = useState(searchParams.get('bank') || 'ALL');

  // Synchronize state with URL search params whenever query string changes
  useEffect(() => {
    const s = searchParams.get('status') || 'ALL';
    const b = searchParams.get('bank') || 'ALL';
    const q = searchParams.get('search') || '';
    const m = searchParams.get('maturity_status') || 'ALL';
    setStatusFilter(s);
    setBankFilter(b);
    setSearch(q);
    setMaturityFilter(m);
  }, [searchParams]);

  const fetchFdrs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (maturityFilter !== 'ALL') params.append('maturity_status', maturityFilter);
      if (bankFilter !== 'ALL') params.append('bank', bankFilter);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await api.get<FDRRecord[]>(`/fdrs${qs}`);
      setFdrs(data || []);
    } catch (err) {
      console.error('Failed to load FDRs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFdrs();
  }, [statusFilter, maturityFilter, bankFilter]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'ALL') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('search', search.trim());
    fetchFdrs();
  };

  const clearAllFilters = () => {
    setStatusFilter('ALL');
    setBankFilter('ALL');
    setMaturityFilter('ALL');
    setSearch('');
    setSearchParams(new URLSearchParams());
  };

  const handleExportCsv = () => {
    const token = localStorage.getItem('aicte_token');
    const url = `${API_BASE}/reports/export/fdrs.csv${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(url, '_blank');
  };

  const totalAmount = fdrs.reduce((acc, f) => acc + (f.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gov-navy-800 uppercase tracking-wider mb-1">
            <Landmark className="h-4 w-4 text-gov-teal-600" />
            <span>AICTE Statutory Register</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
            Fixed Deposit Receipt (FDR) Repository
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official immutable register of technical institution security deposit liens under Joint Member Secretary, AICTE.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <Link
            to="/fdrs/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Register New FDR</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by FDR Number, Bank, Branch, College Name, or AICTE Code..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto px-4 py-2 rounded-xl bg-gov-navy-900 text-white text-xs font-bold hover:bg-gov-navy-800 transition-colors shadow-sm"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Administrative Status
            </label>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                updateParam('status', e.target.value);
              }}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Administrative Statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="CLARIFICATION_REQUIRED">CLARIFICATION_REQUIRED</option>
              <option value="DISCREPANCY_DETECTED">DISCREPANCY_DETECTED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="RENEWAL_SUBMITTED">RENEWAL_SUBMITTED</option>
              <option value="RELEASE_APPROVED">RELEASE_APPROVED</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Maturity Window
            </label>
            <select
              value={maturityFilter}
              onChange={e => {
                setMaturityFilter(e.target.value);
                updateParam('maturity_status', e.target.value);
              }}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Maturity Timelines</option>
              <option value="ACTIVE">ACTIVE (Healthy Lien)</option>
              <option value="APPROACHING_MATURITY">APPROACHING_MATURITY (Next 30 Days)</option>
              <option value="MATURED">MATURED (Overdue for Renewal)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Issuing Scheduled Bank
            </label>
            <select
              value={bankFilter}
              onChange={e => {
                setBankFilter(e.target.value);
                updateParam('bank', e.target.value);
              }}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Banking Institutions</option>
              <option value="State Bank of India">State Bank of India</option>
              <option value="Punjab National Bank">Punjab National Bank</option>
              <option value="Canara Bank">Canara Bank</option>
              <option value="Bank of Baroda">Bank of Baroda</option>
              <option value="HDFC Bank">HDFC Bank</option>
              <option value="Indian Overseas Bank">Indian Overseas Bank</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(statusFilter !== 'ALL' || bankFilter !== 'ALL' || maturityFilter !== 'ALL' || search) && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500">Active Criteria:</span>
            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gov-teal-50 text-gov-teal-900 border border-gov-teal-300 shadow-2xs">
                <span>Status: <strong>{statusFilter.replace(/_/g, ' ')}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    updateParam('status', 'ALL');
                  }}
                  className="hover:text-red-700 text-gov-teal-700 transition-colors p-0.5"
                  title="Remove status filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {bankFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-300 shadow-2xs">
                <span>Bank: <strong>{bankFilter}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setBankFilter('ALL');
                    updateParam('bank', 'ALL');
                  }}
                  className="hover:text-red-700 text-blue-700 transition-colors p-0.5"
                  title="Remove bank filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {maturityFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                <span>Maturity: <strong>{maturityFilter}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setMaturityFilter('ALL');
                    updateParam('maturity_status', 'ALL');
                  }}
                  className="hover:text-red-700 text-amber-700 transition-colors p-0.5"
                  title="Remove maturity filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-900 border border-purple-300 shadow-2xs">
                <span>Search: <strong>"{search}"</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    updateParam('search', '');
                  }}
                  className="hover:text-red-700 text-purple-700 transition-colors p-0.5"
                  title="Clear search keyword"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-bold text-gov-teal-700 hover:text-gov-teal-900 underline ml-2 transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Summary KPI Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-100 text-xs text-slate-700">
        <div>
          Showing <strong className="text-slate-900">{fdrs.length}</strong> statutory FDR instrument(s) matching criteria.
        </div>
        <div>
          Cumulative Principal Sum: <strong className="text-gov-navy-950 font-mono font-bold text-sm">₹{totalAmount.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner message="Querying centralized security deposit repository..." />
      ) : fdrs.length === 0 ? (
        <EmptyState
          title="No Fixed Deposit Receipts Found"
          description="No FDR records match the specified search query or filter parameters. Try clearing filters or submit a new instrument."
          actionText="Clear All Filters"
          onAction={() => {
            setSearch('');
            setStatusFilter('ALL');
            setMaturityFilter('ALL');
            setBankFilter('ALL');
          }}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">FDR Ref #</th>
                  <th className="py-3 px-4">Institution Name</th>
                  <th className="py-3 px-4">Issuing Bank & Branch</th>
                  <th className="py-3 px-4">Amount (INR)</th>
                  <th className="py-3 px-4">Maturity Date</th>
                  <th className="py-3 px-4">Admin Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fdrs.map((fdr) => (
                  <tr key={fdr.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gov-navy-950">
                      <Link to={`/fdrs/${fdr.id}`} className="hover:text-gov-teal-700 hover:underline">
                        {fdr.fdr_number}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{fdr.institution_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{fdr.aicte_code}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{fdr.bank_name}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-xs">{fdr.branch_name}</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                      ₹{fdr.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-800">{fdr.maturity_date ? fdr.maturity_date.split('T')[0] : 'N/A'}</div>
                      <div className="mt-0.5">
                        <MaturityBadge status={fdr.maturity_status} days={fdr.days_to_maturity} size="sm" />
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={fdr.administrative_status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/ocr-workspace?id=${fdr.id}`}
                          className="p-1.5 rounded-lg bg-gov-teal-50 text-gov-teal-800 hover:bg-gov-teal-100 transition-colors"
                          title="Open in OCR Review Workspace"
                        >
                          <ScanEye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/fdrs/${fdr.id}`}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-[11px] transition-colors"
                        >
                          View Details
                        </Link>
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
};

