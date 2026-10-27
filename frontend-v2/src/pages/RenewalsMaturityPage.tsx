import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  FileSpreadsheet,
  PlusCircle,
  ArrowRight,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api';
import { RenewalRecord, FDRRecord } from '../types';
import { StatusBadge, MaturityBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

export const RenewalsMaturityPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { role, user } = useAuth();

  const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
  const [maturingFdrs, setMaturingFdrs] = useState<FDRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Renewal Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [originalFdrId, setOriginalFdrId] = useState<number | ''>(
    searchParams.get('fdr_id') ? Number(searchParams.get('fdr_id')) : ''
  );
  const [replacementFdrNo, setReplacementFdrNo] = useState('');
  const [bankName, setBankName] = useState('State Bank of India');
  const [branchName, setBranchName] = useState('');
  const [amount, setAmount] = useState<string>('1500000');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [maturityDate, setMaturityDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 3);
    return d.toISOString().split('T')[0];
  });
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [renList, fdrList] = await Promise.all([
        api.get<RenewalRecord[]>('/renewals'),
        api.get<FDRRecord[]>('/fdrs?limit=100'),
      ]);
      setRenewals(renList || []);

      // Filter FDRs that are matured or approaching maturity
      const urgent = (fdrList || []).filter(
        f => f.maturity_status === 'APPROACHING_MATURITY' || f.maturity_status === 'MATURED'
      );
      setMaturingFdrs(urgent);
    } catch (err) {
      console.error('Failed to load renewals data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (searchParams.get('fdr_id')) {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const handleCreateRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalFdrId) {
      setErrorMsg('Please select the original FDR to renew.');
      return;
    }
    if (!replacementFdrNo.trim()) {
      setErrorMsg('Replacement FDR number is mandatory.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post('/renewals', {
        original_fdr_id: Number(originalFdrId),
        fdr_number: replacementFdrNo.trim(),
        bank_name: bankName.trim(),
        branch_name: branchName.trim(),
        amount: parseFloat(amount),
        issue_date: issueDate,
        maturity_date: maturityDate,
        deposit_type: 'Security Deposit (Mandatory)',
        remarks: remarks.trim() || 'Statutory renewal instrument submitted under AICTE lien.',
      });

      setIsModalOpen(false);
      setReplacementFdrNo('');
      setRemarks('');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit renewal instrument.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gov-navy-800 uppercase tracking-wider mb-1">
            <RefreshCw className="h-4 w-4 text-gov-teal-600" />
            <span>Maturity Governance & Lien Continuity</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
            FDR Renewals & Maturity Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated compliance radar for 30-day, 15-day, and 7-day maturity reminders and replacement instrument registration.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Submit FDR Renewal</span>
        </button>
      </div>

      {/* Urgent Maturing FDRs Alert Section */}
      {maturingFdrs.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wide">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>Instruments Requiring Immediate Renewal ({maturingFdrs.length})</span>
            </div>
            <span className="text-[10px] text-amber-700 font-semibold">
              Statutory 30-Day Window Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {maturingFdrs.map(f => (
              <div
                key={f.id}
                className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 text-xs space-y-2"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono font-bold text-slate-900">{f.fdr_number}</span>
                  <MaturityBadge status={f.maturity_status} days={f.days_to_maturity} size="sm" />
                </div>
                <div className="text-slate-600 font-medium">
                  {f.institution_name} • ₹{(f.amount / 100000).toFixed(1)} Lakhs
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-amber-200/50">
                  <span className="text-[10px] text-slate-500">Matures: {f.maturity_date ? f.maturity_date.split('T')[0] : 'N/A'}</span>
                  <button
                    onClick={() => {
                      setOriginalFdrId(f.id);
                      setBankName(f.bank_name);
                      setAmount(String(f.amount));
                      setIsModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-gov-teal-800 hover:underline"
                  >
                    Renew Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Renewals History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-gov-navy-900" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Submitted Replacement / Renewal Records
            </h3>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Retrieving renewal records..." />
        ) : renewals.length === 0 ? (
          <EmptyState
            title="No Active Renewals Registered"
            description="When an FDR reaches maturity, submit a replacement FDR here to maintain seamless statutory lien compliance."
            actionText="Submit Renewal"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Original FDR</th>
                  <th className="py-3 px-4">Replacement FDR</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4">Renewal Status</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {renewals.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      <Link to={`/fdrs/${r.original_fdr_id}`} className="hover:underline text-gov-navy-950">
                        {r.original_fdr_number || `#${r.original_fdr_id}`}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-gov-teal-800">
                      <Link to={`/fdrs/${r.replacement_fdr_id}`} className="hover:underline">
                        {r.replacement_fdr_number || `#${r.replacement_fdr_id}`}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(r.submission_date).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {r.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {r.remarks || 'Statutory renewal'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/fdrs/${r.replacement_fdr_id}`}
                        className="text-xs font-bold text-gov-teal-700 hover:underline"
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Renewal Submission Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Replacement Fixed Deposit Receipt"
        subtitle="Mandatory renewal under AICTE Approval Process Regulations"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateRenewal} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Expiring / Maturing Original FDR *
            </label>
            <select
              value={originalFdrId}
              onChange={e => setOriginalFdrId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
              required
            >
              <option value="">-- Choose Original FDR Instrument --</option>
              {maturingFdrs.map(f => (
                <option key={f.id} value={f.id}>
                  {f.fdr_number} — {f.bank_name} (₹{f.amount.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Replacement FDR # *
              </label>
              <input
                type="text"
                value={replacementFdrNo}
                onChange={e => setReplacementFdrNo(e.target.value)}
                placeholder="e.g. SBI-RENEW-2026-009"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bank Name *
              </label>
              <input
                type="text"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Branch Location *
              </label>
              <input
                type="text"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                placeholder="Branch name and city"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Principal Amount (INR) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Issue Date *
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Maturity Date *
              </label>
              <input
                type="date"
                value={maturityDate}
                onChange={e => setMaturityDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Renewal Remarks / Justification
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Mandatory 3-year extension with joint lien endorsement."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Registering Renewal...' : 'Commit Renewal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

