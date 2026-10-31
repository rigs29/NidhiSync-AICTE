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
  ShieldCheck,
  HelpCircle,
  Eye,
  XCircle,
  FileCheck2
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
  const isAdmin = role === 'ADMIN';
  const isOfficerOrAdmin = role === 'AICTE_OFFICER' || role === 'ADMIN';

  const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
  const [maturingFdrs, setMaturingFdrs] = useState<FDRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Renewal Modal Form (College Submit)
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

  // Officer Scrutiny Review Modal (Stage 2)
  const [officerModalRenewal, setOfficerModalRenewal] = useState<RenewalRecord | null>(null);
  const [officerDecision, setOfficerDecision] = useState<'OFFICER_APPROVED' | 'CLARIFICATION_REQUIRED' | 'REJECTED'>('OFFICER_APPROVED');
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [isSubmittingOfficer, setIsSubmittingOfficer] = useState(false);
  const [officerError, setOfficerError] = useState<string | null>(null);

  // Admin Final Approval Modal (Stage 3)
  const [adminModalRenewal, setAdminModalRenewal] = useState<RenewalRecord | null>(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

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

  // Stage 2: Officer Endorsement
  const handleOfficerReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerModalRenewal) return;
    if (officerRemarks.trim().length < 5) {
      setOfficerError('Review observations must be at least 5 characters.');
      return;
    }

    setIsSubmittingOfficer(true);
    setOfficerError(null);
    try {
      await api.put(`/renewals/${officerModalRenewal.id}/review`, {
        status: officerDecision,
        remarks: officerRemarks.trim(),
      });
      setOfficerModalRenewal(null);
      setOfficerRemarks('');
      fetchData();
    } catch (err: any) {
      setOfficerError(err.message || 'Failed to record scrutiny determination.');
    } finally {
      setIsSubmittingOfficer(false);
    }
  };

  // Stage 3: Admin Final Approval
  const handleAdminApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminModalRenewal) return;

    setIsSubmittingAdmin(true);
    setAdminError(null);
    try {
      await api.put(`/renewals/${adminModalRenewal.id}/admin-approve`, {
        remarks: adminRemarks.trim() || 'Final governance sanction granted under council authority.',
      });
      setAdminModalRenewal(null);
      setAdminRemarks('');
      fetchData();
    } catch (err: any) {
      setAdminError(err.message || 'Failed to grant final administrator approval.');
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const getRenewalStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
            <Clock className="h-3 w-3 text-amber-600" />
            <span>Stage 1: Awaiting Officer Review</span>
          </span>
        );
      case 'OFFICER_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-300">
            <FileCheck2 className="h-3 w-3 text-blue-600" />
            <span>Stage 2: Officer Endorsed (Awaiting Admin)</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Stage 3: Approved & Activated</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-900 border border-red-300">
            <XCircle className="h-3 w-3 text-red-600" />
            <span>Rejected</span>
          </span>
        );
      case 'CLARIFICATION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-900 border border-purple-300">
            <HelpCircle className="h-3 w-3 text-purple-600" />
            <span>Clarification Required</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            {status}
          </span>
        );
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
            Multi-stage statutory renewal lifecycle: College Submission → AICTE Scrutiny Endorsement → System Administrator Final Activation.
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
              <span>Maturing / Matured Security Deposits Requiring Renewal ({maturingFdrs.length})</span>
            </div>
            <span className="text-[10px] text-amber-700 font-semibold">Immediate Compliance Action Required</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {maturingFdrs.map(f => (
              <div
                key={f.id}
                className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-amber-950">{f.fdr_number}</span>
                    <span className="text-[10px] text-amber-800 block">{f.bank_name}</span>
                  </div>
                  <MaturityBadge status={f.maturity_status} days={f.days_to_maturity} size="sm" />
                </div>

                <div className="text-[11px] text-slate-700 flex items-center justify-between">
                  <span>Principal Sum:</span>
                  <span className="font-bold font-mono">₹{f.amount.toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-1 flex items-center justify-between border-t border-amber-200/60">
                  <span className="text-[10px] text-slate-500">
                    Expiry: {f.maturity_date ? f.maturity_date.split('T')[0] : 'N/A'}
                  </span>
                  <button
                    onClick={() => {
                      setOriginalFdrId(f.id);
                      setAmount(String(f.amount));
                      setBankName(f.bank_name);
                      setBranchName(f.branch_name);
                      setIsModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-gov-teal-700 hover:text-gov-teal-900"
                  >
                    <span>Renew This FDR</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Renewal History / In-Progress Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-gov-navy-900" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Statutory Renewal Dockets & Multi-Stage Approvals ({renewals.length})
            </h3>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Querying renewal applications..." />
        ) : renewals.length === 0 ? (
          <EmptyState
            title="No Renewal Records"
            description="No replacement fixed deposit receipts have been submitted yet."
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
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4">Approval Stage Status</th>
                  <th className="py-3 px-4">Observations</th>
                  <th className="py-3 px-4 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {renewals.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gov-navy-950">
                      <Link to={`/fdrs/${r.original_fdr_id}`} className="hover:underline">
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
                      {getRenewalStatusBadge(r.status)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {r.remarks || 'Statutory renewal'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Stage 2 Action: AICTE Scrutiny Officer Endorsement */}
                        {isOfficerOrAdmin && (r.status === 'SUBMITTED' || r.status === 'CLARIFICATION_REQUIRED') && (
                          <button
                            type="button"
                            onClick={() => {
                              setOfficerModalRenewal(r);
                              setOfficerDecision('OFFICER_APPROVED');
                              setOfficerRemarks(r.remarks || '');
                              setOfficerError(null);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gov-teal-600 text-white hover:bg-gov-teal-700 shadow-2xs"
                          >
                            Review & Endorse
                          </button>
                        )}

                        {/* Stage 3 Action: System Administrator Final Approval */}
                        {isAdmin && r.status === 'OFFICER_APPROVED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setAdminModalRenewal(r);
                              setAdminRemarks(r.remarks || '');
                              setAdminError(null);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 shadow-2xs"
                          >
                            Final Admin Approval
                          </button>
                        )}

                        <Link
                          to={`/fdrs/${r.replacement_fdr_id}`}
                          className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold"
                        >
                          Inspect →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stage 2: Officer Scrutiny Review Modal */}
      {officerModalRenewal && (
        <Modal
          isOpen={true}
          onClose={() => setOfficerModalRenewal(null)}
          title={`Scrutiny Officer Review: Replacement FDR ${officerModalRenewal.replacement_fdr_number}`}
          subtitle={`Original FDR: ${officerModalRenewal.original_fdr_number} • Submitted ${new Date(officerModalRenewal.submission_date).toLocaleDateString()}`}
        >
          <form onSubmit={handleOfficerReviewSubmit} className="space-y-4">
            {officerError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold">
                {officerError}
              </div>
            )}

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-700 block uppercase text-[10px]">Renewal Overview</span>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Original Instrument: <strong>{officerModalRenewal.original_fdr_number}</strong></div>
                <div>Replacement Instrument: <strong>{officerModalRenewal.replacement_fdr_number}</strong></div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Scrutiny Endorsement Determination *
              </label>
              <select
                value={officerDecision}
                onChange={e => setOfficerDecision(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-gov-navy-900"
              >
                <option value="OFFICER_APPROVED">OFFICER_APPROVED — Endorse & Forward to System Admin for Final Sanction</option>
                <option value="CLARIFICATION_REQUIRED">CLARIFICATION_REQUIRED — Request Document Clarification from College</option>
                <option value="REJECTED">REJECTED — Renewal Instrument Inadmissible</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandatory Scrutiny Observations * (Min 5 chars)
              </label>
              <textarea
                rows={3}
                value={officerRemarks}
                onChange={e => setOfficerRemarks(e.target.value)}
                placeholder="Enter statutory scrutiny observations..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-gov-navy-900"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOfficerModalRenewal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingOfficer}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gov-teal-600 text-white hover:bg-gov-teal-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmittingOfficer ? 'Recording Endorsement...' : 'Commit Scrutiny Endorsement'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Stage 3: Admin Final Approval Modal */}
      {adminModalRenewal && (
        <Modal
          isOpen={true}
          onClose={() => setAdminModalRenewal(null)}
          title={`Administrator Final Approval: Replacement FDR ${adminModalRenewal.replacement_fdr_number}`}
          subtitle="Final Governance Authority: Activates replacement FDR and retires original instrument."
        >
          <form onSubmit={handleAdminApprovalSubmit} className="space-y-4">
            {adminError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold">
                {adminError}
              </div>
            )}

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-2 text-emerald-950">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Executive Governance Sanction Notice</span>
              </div>
              <p className="leading-relaxed text-[11px] text-emerald-850">
                Upon your final approval, replacement instrument <strong>{adminModalRenewal.replacement_fdr_number}</strong> will become an active statutory lien (Status: VERIFIED), and original FDR <strong>{adminModalRenewal.original_fdr_number}</strong> will transition to SUPERSEDED_BY_RENEWAL.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Executive Sanction Remarks
              </label>
              <textarea
                rows={3}
                value={adminRemarks}
                onChange={e => setAdminRemarks(e.target.value)}
                placeholder="Sanction orders under AICTE Approval Process Regulations..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-gov-navy-900"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdminModalRenewal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingAdmin}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{isSubmittingAdmin ? 'Granting Sanction...' : 'Grant Final Activation Approval'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

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
                Issue Date *
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
                Maturity Date (Min 3 Years) *
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
              placeholder="Replacement deposit under joint lien with Member Secretary AICTE..."
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
              {isSubmitting ? 'Registering Replacement...' : 'Submit Renewal Application'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
