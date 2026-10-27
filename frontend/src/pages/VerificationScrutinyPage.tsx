import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  ScanEye,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Building2,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Search
} from 'lucide-react';
import { api } from '../services/api';
import { FDRRecord } from '../types';
import { StatusBadge, MaturityBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';

export const VerificationScrutinyPage: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'pending' | 'discrepancies' | 'clarification' | 'all'>('pending');
  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<FDRRecord[]>('/fdrs?limit=100');
      setFdrs(data || []);
    } catch (err) {
      console.error('Failed to load scrutiny queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Filter items based on activeTab and search
  const filteredFdrs = fdrs.filter(f => {
    const matchesSearch = 
      !search.trim() ||
      f.fdr_number.toLowerCase().includes(search.toLowerCase()) ||
      (f.institution_name && f.institution_name.toLowerCase().includes(search.toLowerCase())) ||
      f.bank_name.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'pending') {
      return f.administrative_status === 'SUBMITTED' || f.administrative_status === 'UNDER_REVIEW';
    }
    if (activeTab === 'discrepancies') {
      return f.administrative_status === 'DISCREPANCY_DETECTED';
    }
    if (activeTab === 'clarification') {
      return f.administrative_status === 'CLARIFICATION_REQUIRED';
    }
    return true;
  });

  const pendingCount = fdrs.filter(f => f.administrative_status === 'SUBMITTED' || f.administrative_status === 'UNDER_REVIEW').length;
  const discrepancyCount = fdrs.filter(f => f.administrative_status === 'DISCREPANCY_DETECTED').length;
  const clarificationCount = fdrs.filter(f => f.administrative_status === 'CLARIFICATION_REQUIRED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gov-navy-800 uppercase tracking-wider mb-1">
            <FileCheck2 className="h-4 w-4 text-gov-teal-600" />
            <span>AICTE Scrutiny Cell</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
            Official FDR Scrutiny & Verification Docket
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Examine submitted institutional fixed deposit receipts, compare OCR readings, and endorse compliance outcomes.
          </p>
        </div>

        <Link
          to="/ocr-workspace"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-teal-600 text-white hover:bg-gov-teal-700 transition-colors shadow-sm"
        >
          <ScanEye className="h-4 w-4" />
          <span>Launch OCR Workspace</span>
        </Link>
      </div>

      {/* Workload Metric Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'pending'
              ? 'bg-gov-navy-900 text-white border-gov-navy-900 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Pending Review</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black mt-1">{pendingCount}</p>
        </button>

        <button
          onClick={() => setActiveTab('discrepancies')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'discrepancies'
              ? 'bg-red-700 text-white border-red-700 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Discrepancies</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black mt-1">{discrepancyCount}</p>
        </button>

        <button
          onClick={() => setActiveTab('clarification')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'clarification'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Clarification</span>
            <HelpCircle className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black mt-1">{clarificationCount}</p>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'all'
              ? 'bg-gov-teal-700 text-white border-gov-teal-700 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">All Records</span>
            <FileCheck2 className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black mt-1">{fdrs.length}</p>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search scrutiny docket by FDR number, institution name, or bank..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-gov-navy-900"
          />
        </div>
      </div>

      {/* Queue List */}
      {isLoading ? (
        <LoadingSpinner message="Querying active scrutiny queue..." />
      ) : filteredFdrs.length === 0 ? (
        <EmptyState
          title="No Instruments in Current Queue"
          description="There are currently no FDR records matching the selected queue tab."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Institution Name</th>
                  <th className="py-3 px-4">FDR Number</th>
                  <th className="py-3 px-4">Bank & Branch</th>
                  <th className="py-3 px-4">Deposit Sum</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Scrutinize Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFdrs.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{f.institution_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{f.aicte_code}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-gov-navy-950">
                      {f.fdr_number}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{f.bank_name}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{f.branch_name}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      ₹{f.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={f.administrative_status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/ocr-workspace?id=${f.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gov-navy-900 text-white hover:bg-gov-navy-800 text-xs font-bold shadow-2xs transition-colors"
                      >
                        <ScanEye className="h-3.5 w-3.5 text-gov-teal-400" />
                        <span>Inspect in OCR</span>
                      </Link>
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

