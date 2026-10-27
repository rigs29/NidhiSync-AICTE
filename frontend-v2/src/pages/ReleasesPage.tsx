import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  HandCoins,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PlusCircle,
  Building2,
  FileCheck2,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { ReleaseRequest, FDRRecord } from '../types';
import { StatusBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

export const ReleasesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { role, user } = useAuth();
  const isOfficerOrAdmin = role === 'AICTE_OFFICER' || role === 'ADMIN';

  const [requests, setRequests] = useState<ReleaseRequest[]>([]);
  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // College Request Modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedFdrId, setSelectedFdrId] = useState<number | ''>(
    searchParams.get('fdr_id') ? Number(searchParams.get('fdr_id')) : ''
  );
  const [releaseReason, setReleaseReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Officer Review Modal
  const [reviewModalRequest, setReviewModalRequest] = useState<ReleaseRequest | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>('APPROVED');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchReleases = async () => {
    setIsLoading(true);
    try {
      const [relList, fdrList] = await Promise.all([
        api.get<ReleaseRequest[]>('/releases'),
        api.get<FDRRecord[]>('/fdrs?limit=100'),
      ]);
      setRequests(relList || []);
      setFdrs(fdrList || []);
    } catch (err) {
      console.error('Failed to load release requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
    if (searchParams.get('fdr_id')) {
      setIsRequestModalOpen(true);
    }
  }, [searchParams]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFdrId) {
      setRequestError('Please select the FDR instrument to release.');
      return;
    }
    if (releaseReason.trim().length < 10) {
      setRequestError('Release reason must be at least 10 characters.');
      return;
    }

    setIsSubmittingRequest(true);
    setRequestError(null);
    try {
      await api.post('/releases', {
        fdr_id: Number(selectedFdrId),
        reason: releaseReason.trim(),
      });
      setIsRequestModalOpen(false);
      setReleaseReason('');
      fetchReleases();
    } catch (err: any) {
      setRequestError(err.message || 'Failed to submit release request.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalRequest) return;
    if (reviewRemarks.trim().length < 5) {
      setReviewError('Review remarks must be at least 5 characters.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);
    try {
      await api.put(`/releases/${reviewModalRequest.id}/review`, {
        status: reviewStatus,
        remarks: reviewRemarks.trim(),
      });
      setReviewModalRequest(null);
      setReviewRemarks('');
      fetchReleases();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit officer decision.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gov-navy-800 uppercase tracking-wider mb-1">
            <HandCoins className="h-4 w-4 text-gov-teal-600" />
            <span>AICTE Statutory Lien Release Workflow</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
            Release & Refund Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Formal administrative applications to release FDR security liens upon institutional closure or completion of mandatory lock-in terms.
          </p>
        </div>

        {role === 'COLLEGE_USER' && (
          <button
            onClick={() => {
              setRequestError(null);
              setIsRequestModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Apply for Lien Release</span>
          </button>
        )}
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-gov-navy-900" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Release Request Dockets ({requests.length})
            </h3>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Retrieving release petitions..." />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No Release Requests Found"
            description="There are currently no active release or refund requests in the system."
            actionText={role === 'COLLEGE_USER' ? 'Apply for Release' : undefined}
            onAction={role === 'COLLEGE_USER' ? () => setIsRequestModalOpen(true) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">FDR Instrument</th>
                  <th className="py-3 px-4">Institution Name</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Application Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Officer Remarks</th>
                  {isOfficerOrAdmin && <th className="py-3 px-4 text-right">Review Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gov-navy-950">
                      <Link to={`/fdrs/${req.fdr_id}`} className="hover:underline">
                        {req.fdr_number || `#${req.fdr_id}`}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {req.institution_name}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {req.amount ? `₹${req.amount.toLocaleString('en-IN')}` : 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={req.reason}>
                      {req.reason}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                        req.status === 'REJECTED' ? 'bg-red-50 text-red-800 border-red-300' :
                        'bg-amber-50 text-amber-900 border-amber-300'
                      }`}>
                        {req.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {req.remarks || 'Pending decision'}
                    </td>

                    {isOfficerOrAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setReviewModalRequest(req);
                            setReviewStatus(req.status === 'SUBMITTED' ? 'APPROVED' : req.status);
                            setReviewRemarks(req.remarks || '');
                            setReviewError(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gov-navy-900 text-white hover:bg-gov-navy-800 text-xs font-bold transition-colors shadow-2xs"
                        >
                          Scrutinize
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* College Release Request Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Apply for AICTE Security Deposit Lien Release"
        subtitle="Requires formal justification under Approval Process Regulations"
      >
        <form onSubmit={handleCreateRequest} className="space-y-4">
          {requestError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              {requestError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select FDR Instrument to Release *
            </label>
            <select
              value={selectedFdrId}
              onChange={e => setSelectedFdrId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
              required
            >
              <option value="">-- Choose FDR Record --</option>
              {fdrs.map(f => (
                <option key={f.id} value={f.id}>
                  {f.fdr_number} — {f.bank_name} (₹{f.amount.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Statutory Justification / Closure Reason * (Min 10 characters)
            </label>
            <textarea
              rows={4}
              value={releaseReason}
              onChange={e => setReleaseReason(e.target.value)}
              placeholder="Detail the justification, e.g. 'Completion of mandatory 10-year lock-in term for Autonomous Technical Institute with zero outstanding student or council dues.'"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingRequest}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmittingRequest ? 'Submitting Petition...' : 'Submit Release Application'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Officer Scrutiny Review Modal */}
      {reviewModalRequest && (
        <Modal
          isOpen={true}
          onClose={() => setReviewModalRequest(null)}
          title={`Review Release Request: FDR ${reviewModalRequest.fdr_number}`}
          subtitle={`Applicant: ${reviewModalRequest.institution_name}`}
        >
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            {reviewError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                {reviewError}
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Applicant Justification</span>
              <p className="text-slate-800 font-medium">{reviewModalRequest.reason}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Release Decision Determination *
              </label>
              <select
                value={reviewStatus}
                onChange={e => setReviewStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
              >
                <option value="APPROVED">APPROVED — Release Authorized under Seal</option>
                <option value="CLARIFICATION_REQUIRED">CLARIFICATION_REQUIRED — Ask College for NOC</option>
                <option value="REJECTED">REJECTED — Statutory Lock-in Incomplete</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW — Forward to Legal Cell</option>
                <option value="COMPLETED">COMPLETED — Lien Dissolved at Bank</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandatory Scrutiny Remarks * (Min 5 characters)
              </label>
              <textarea
                rows={3}
                value={reviewRemarks}
                onChange={e => setReviewRemarks(e.target.value)}
                placeholder="Enter mandatory scrutiny remarks and council sanction orders..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewModalRequest(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReview}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmittingReview ? 'Recording Decision...' : 'Commit Release Determination'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

