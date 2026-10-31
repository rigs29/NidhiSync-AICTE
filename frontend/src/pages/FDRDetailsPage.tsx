import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Building2,
  Calendar,
  Landmark,
  ShieldCheck,
  ScanEye,
  FileText,
  Download,
  Eye,
  RefreshCw,
  HandCoins,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCheck2,
  ExternalLink,
  Upload
} from 'lucide-react';
import { api, getDownloadUrl } from '../services/api';
import { FDRRecord, DocumentRecord } from '../types';
import { StatusBadge, MaturityBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DocumentViewerModal } from '../components/ocr/DocumentViewerModal';
import { useAuth } from '../context/AuthContext';

export const FDRDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const navigate = useNavigate();

  const [fdr, setFdr] = useState<FDRRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadDocError, setUploadDocError] = useState<string | null>(null);
  const [uploadDocSuccess, setUploadDocSuccess] = useState<string | null>(null);

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fdr) return;

    setIsUploadingDoc(true);
    setUploadDocError(null);
    setUploadDocSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.upload<DocumentRecord>(`/documents/upload/${fdr.id}`, formData);
      setUploadDocSuccess('Scanned deposit receipt attached and OCR analyzed successfully.');
      fetchFdr();
      setTimeout(() => setUploadDocSuccess(null), 4000);
    } catch (err: any) {
      setUploadDocError(err.message || 'Failed to upload deposit receipt scan.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const fetchFdr = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<FDRRecord>(`/fdrs/${id}`);
      setFdr(data);
    } catch (err) {
      console.error('Failed to load FDR details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFdr();
  }, [id]);

  if (isLoading) {
    return <LoadingSpinner message="Retrieving statutory FDR docket..." fullPage />;
  }

  if (!fdr) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
        <p className="text-xs text-slate-600">FDR record not found or access denied.</p>
        <Link to="/fdrs" className="text-xs font-bold text-gov-teal-700 hover:underline">
          Return to Repository
        </Link>
      </div>
    );
  }

  const isOfficerOrAdmin = role === 'AICTE_OFFICER' || role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Back & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/fdrs"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to FDR Repository</span>
        </Link>

        <span className="text-[11px] font-mono font-bold text-slate-400">
          SYSTEM_RECORD_ID: #{fdr.id}
        </span>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gov-navy-800 uppercase tracking-wider mb-1">
            <Landmark className="h-4 w-4 text-gov-teal-600" />
            <span>AICTE Statutory Fixed Deposit Instrument</span>
          </div>
          <h1 className="text-2xl font-black text-gov-navy-950 font-mono">
            {fdr.fdr_number}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Institution: <strong className="text-slate-800">{fdr.institution_name}</strong> ({fdr.aicte_code})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge status={fdr.administrative_status} />
          <MaturityBadge status={fdr.maturity_status} days={fdr.days_to_maturity} />

          {/* Quick OCR Workspace Link */}
          <Link
            to={`/ocr-workspace?id=${fdr.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-teal-600 text-white hover:bg-gov-teal-700 transition-colors shadow-sm"
          >
            <ScanEye className="h-4 w-4" />
            <span>OCR Review Workspace</span>
          </Link>
        </div>
      </div>

      {/* Grid: Left Column Details & Right Column Documents & Verifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Metadata */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Financial and Banking Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-gov-navy-900" />
              <span>Banking & Deposit Instrument Details</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Deposit Principal Sum</span>
                <span className="text-xl font-black text-gov-navy-950 font-mono mt-0.5 block">
                  ₹{fdr.amount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-500">Currency: {fdr.currency}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Deposit Category</span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  {fdr.deposit_type}
                </span>
                <span className="text-[10px] text-slate-500">AICTE Approval Regulation</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Scheduled Bank</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{fdr.bank_name}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Branch Location</span>
                <span className="font-semibold text-slate-700 mt-0.5 block">{fdr.branch_name}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date of Issuance</span>
                <span className="font-semibold text-slate-700 mt-0.5 block">
                  {fdr.issue_date ? fdr.issue_date.split('T')[0] : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Maturity Date</span>
                <span className="font-semibold text-slate-700 mt-0.5 block">
                  {fdr.maturity_date ? fdr.maturity_date.split('T')[0] : 'N/A'}
                </span>
              </div>
            </div>

            {/* Joint Lien Statutory Card */}
            <div className="p-4 rounded-xl bg-gov-navy-950 text-white space-y-2 border border-gov-navy-900">
              <div className="flex items-center gap-2 text-gov-teal-300 text-xs font-bold">
                <ShieldCheck className="h-4 w-4 text-gov-teal-400" />
                <span>Statutory Joint Lien Endorsement Status</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                This instrument is pledged under joint lien in favor of the <strong>Member Secretary, AICTE New Delhi</strong>. 
                Premature encashment or modification by the banking institution is prohibited without explicit AICTE release orders.
              </p>
            </div>
          </div>

          {/* Quick Life Cycle Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
              FDR Lifecycle Action Dockets
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to={`/renewals?fdr_id=${fdr.id}`}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-gov-teal-500 hover:bg-slate-50 transition-all text-xs space-y-1 block"
              >
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <RefreshCw className="h-4 w-4 text-gov-teal-600" />
                  <span>Submit FDR Renewal</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Replace or renew this instrument when approaching maturity.
                </p>
              </Link>

              <Link
                to={`/releases?fdr_id=${fdr.id}`}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-gov-teal-500 hover:bg-slate-50 transition-all text-xs space-y-1 block"
              >
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <HandCoins className="h-4 w-4 text-emerald-600" />
                  <span>Request Release of Lien</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Apply for statutory closure after completion of mandatory lock-in period.
                </p>
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Attached Documents & Scrutiny Log */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Documents Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gov-navy-900" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Attached Deposit Receipts
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {fdr.documents?.length || 0} File(s)
              </span>
            </div>

            {uploadDocSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{uploadDocSuccess}</span>
              </div>
            )}
            {uploadDocError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{uploadDocError}</span>
              </div>
            )}

            {fdr.documents && fdr.documents.length > 0 ? (
              <div className="space-y-3">
                {fdr.documents.map((doc) => {
                  const url = getDownloadUrl(doc.storage_key || doc.original_filename, doc.download_url);
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 text-xs break-all">{doc.original_filename}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span>Format: {doc.file_type || 'PDF/Scan'}</span>
                            <span>•</span>
                            <span>Size: {(doc.file_size / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] bg-gov-teal-50 text-gov-teal-800 font-bold border border-gov-teal-200 shrink-0">
                          Verified Scan
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                        <button
                          onClick={() => {
                            setSelectedDoc(doc);
                            setIsViewerOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5 text-gov-teal-600" />
                          <span>Preview Document</span>
                        </button>
                        <a
                          href={url}
                          download={doc.original_filename}
                          className="px-3 py-1.5 rounded-lg bg-gov-navy-900 text-white hover:bg-gov-navy-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download Original</span>
                        </a>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs">
                    <Upload className="h-3.5 w-3.5 text-slate-500" />
                    <span>Attach Additional Receipt / Addendum</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleUploadReceipt}
                      disabled={isUploadingDoc}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 space-y-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">No Scanned FDR Receipt Attached</p>
                  <p className="text-[11px] text-slate-500">
                    Upload the physical deposit receipt scan bearing joint AICTE lien endorsement.
                  </p>
                </div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isUploadingDoc ? 'Uploading & Analyzing...' : 'Upload Receipt Scan'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleUploadReceipt}
                    disabled={isUploadingDoc}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Verification Records Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <History className="h-4 w-4 text-gov-navy-900" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Official Scrutiny History
              </h3>
            </div>

            {fdr.verifications && fdr.verifications.length > 0 ? (
              <div className="space-y-3">
                {fdr.verifications.map((v) => (
                  <div key={v.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={v.outcome} size="sm" />
                      <span className="text-[10px] text-slate-400">
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed pt-1">{v.observations}</p>
                    <div className="text-[10px] text-slate-400 border-t border-slate-200/60 pt-1 flex items-center justify-between">
                      <span>Reviewed by: {v.reviewer_name || 'AICTE Officer'}</span>
                      <span className="font-mono">{v.verification_method}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 italic">
                No scrutiny reviews recorded yet. Instrument is awaiting initial examination.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        document={selectedDoc}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
      />
    </div>
  );
};

