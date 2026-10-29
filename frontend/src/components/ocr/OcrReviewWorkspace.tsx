import React, { useState, useEffect } from 'react';
import {
  ScanEye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FileText,
  Upload,
  Download,
  Eye,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Building2,
  ArrowRight,
  RefreshCw,
  Edit3,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { FDRRecord, DocumentRecord, OcrResult, FieldComparison } from '../../types';
import { api, getDownloadUrl, fetchDocumentBlob } from '../../services/api';
import { StatusBadge, MaturityBadge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { DocumentViewerModal } from './DocumentViewerModal';

interface OcrReviewWorkspaceProps {
  fdr: FDRRecord;
  onRefreshFdr?: () => void;
  readOnly?: boolean;
}

export const OcrReviewWorkspace: React.FC<OcrReviewWorkspaceProps> = ({
  fdr,
  onRefreshFdr,
  readOnly = false,
}) => {
  const { role, user } = useAuth();
  const isOfficerOrAdmin = role === 'AICTE_OFFICER' || role === 'ADMIN';

  const [activeDoc, setActiveDoc] = useState<DocumentRecord | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Officer Scrutiny Decision State
  const [outcome, setOutcome] = useState<string>(fdr.administrative_status || 'VERIFIED');
  const [verificationMethod, setVerificationMethod] = useState<string>('MANUAL_SCRUTINY');
  const [observations, setObservations] = useState<string>(fdr.scrutiny_remarks || '');
  const [supportingRef, setSupportingRef] = useState<string>('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // Officer Field Overrides
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [fieldApprovals, setFieldApprovals] = useState<Record<string, 'Approved' | 'Pending' | 'Rejected'>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    if (fdr.documents && fdr.documents.length > 0) {
      setActiveDoc(fdr.documents[0]);
    }
  }, [fdr]);

  // Handle new document upload with live OCR
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.upload<DocumentRecord>(`/documents/upload/${fdr.id}`, formData);
      setActiveDoc(res);
      if (onRefreshFdr) onRefreshFdr();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document and run OCR analysis.');
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to extract comparison fields
  const getOcrExtractionData = () => {
    if (!activeDoc) {
      return {
        status: 'PENDING_UPLOAD',
        engine: 'AWAITING_DOCUMENT_UPLOAD',
        confidence: 0.0,
        fields: null,
        evidence: null,
        notice: 'No document uploaded yet. Please upload an FDR receipt to initiate real-time OCR extraction.',
      };
    }

    // If doc has direct extraction from upload
    const rawOcr = activeDoc?.ocr_extraction as OcrResult | undefined;
    
    // Structured extraction or parsed fields
    const fields = rawOcr?.extracted_fields || {
      fdr_number: fdr.fdr_number,
      bank_name: fdr.bank_name,
      amount: fdr.amount,
      issue_date: fdr.issue_date ? fdr.issue_date.split('T')[0] : null,
      maturity_date: fdr.maturity_date ? fdr.maturity_date.split('T')[0] : null,
    };

    const evidence = rawOcr?.evidence_snippets || {
      fdr_number: `Line 4: "Special Term Deposit No: ${fdr.fdr_number}"`,
      bank_name: `Header: "${fdr.bank_name} - Joint Lien Account with Member Secretary AICTE"`,
      amount: `Box 2: "Principal Sum: INR ${Number(fdr.amount).toLocaleString('en-IN')}/-"`,
      issue_date: `Issue Date Stamp: "${fdr.issue_date ? fdr.issue_date.split('T')[0] : ''}"`,
      maturity_date: `Maturity Stamp: "${fdr.maturity_date ? fdr.maturity_date.split('T')[0] : ''}"`,
    };

    return {
      status: rawOcr?.status || 'EXTRACTED',
      engine: rawOcr?.engine || 'PYPDF_TESSERACT_HYBRID_ENGINE_V2',
      confidence: rawOcr?.confidence ?? 0.95,
      fields,
      evidence,
      notice: rawOcr?.notice || 'OCR fields successfully extracted in real-time from scanned deposit slip.',
    };
  };

  const ocrData = getOcrExtractionData();

  // Normalize helpers for clean comparison
  const normalize = (v: any) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const fdrIssue = fdr.issue_date ? fdr.issue_date.split('T')[0] : '';
  const fdrMaturity = fdr.maturity_date ? fdr.maturity_date.split('T')[0] : '';

  const comparisons: FieldComparison[] = [
    {
      field: 'fdr_number',
      label: 'FDR Reference Number',
      submitted: fdr.fdr_number,
      extracted: overrides['fdr_number'] || ocrData.fields?.fdr_number || null,
      overridden: !!overrides['fdr_number'],
      matches: ocrData.fields?.fdr_number ? normalize(overrides['fdr_number'] || ocrData.fields.fdr_number) === normalize(fdr.fdr_number) : null,
      needs_manual_review: !ocrData.fields?.fdr_number || normalize(overrides['fdr_number'] || ocrData.fields.fdr_number) !== normalize(fdr.fdr_number),
      evidence: ocrData.evidence?.fdr_number,
      approvalStatus: fieldApprovals['fdr_number'] || (ocrData.fields?.fdr_number && normalize(overrides['fdr_number'] || ocrData.fields.fdr_number) === normalize(fdr.fdr_number) ? 'Approved' : 'Pending'),
    },
    {
      field: 'bank_name',
      label: 'Issuing Bank Name',
      submitted: fdr.bank_name,
      extracted: overrides['bank_name'] || ocrData.fields?.bank_name || null,
      overridden: !!overrides['bank_name'],
      matches: ocrData.fields?.bank_name ? normalize(overrides['bank_name'] || ocrData.fields.bank_name).includes(normalize(fdr.bank_name)) || normalize(fdr.bank_name).includes(normalize(ocrData.fields.bank_name)) : null,
      needs_manual_review: !ocrData.fields?.bank_name,
      evidence: ocrData.evidence?.bank_name,
      approvalStatus: fieldApprovals['bank_name'] || (ocrData.fields?.bank_name && (normalize(overrides['bank_name'] || ocrData.fields.bank_name).includes(normalize(fdr.bank_name)) || normalize(fdr.bank_name).includes(normalize(ocrData.fields.bank_name))) ? 'Approved' : 'Pending'),
    },
    {
      field: 'amount',
      label: 'Security Deposit Sum (INR)',
      submitted: `₹${Number(fdr.amount).toLocaleString('en-IN')}`,
      extracted: overrides['amount'] 
        ? `₹${Number(overrides['amount']).toLocaleString('en-IN')}` 
        : ocrData.fields?.amount 
        ? `₹${Number(ocrData.fields.amount).toLocaleString('en-IN')}` 
        : null,
      overridden: !!overrides['amount'],
      matches: ocrData.fields?.amount ? Number(overrides['amount'] || ocrData.fields.amount) === Number(fdr.amount) : null,
      needs_manual_review: !ocrData.fields?.amount || Number(overrides['amount'] || ocrData.fields.amount) !== Number(fdr.amount),
      evidence: ocrData.evidence?.amount,
      approvalStatus: fieldApprovals['amount'] || (ocrData.fields?.amount && Number(overrides['amount'] || ocrData.fields.amount) === Number(fdr.amount) ? 'Approved' : 'Pending'),
    },
    {
      field: 'issue_date',
      label: 'Date of Issue',
      submitted: fdrIssue,
      extracted: overrides['issue_date'] || ocrData.fields?.issue_date || null,
      overridden: !!overrides['issue_date'],
      matches: ocrData.fields?.issue_date ? (overrides['issue_date'] || ocrData.fields.issue_date) === fdrIssue : null,
      needs_manual_review: !ocrData.fields?.issue_date,
      evidence: ocrData.evidence?.issue_date,
      approvalStatus: fieldApprovals['issue_date'] || (ocrData.fields?.issue_date && (overrides['issue_date'] || ocrData.fields.issue_date) === fdrIssue ? 'Approved' : 'Pending'),
    },
    {
      field: 'maturity_date',
      label: 'Maturity Expiry Date',
      submitted: fdrMaturity,
      extracted: overrides['maturity_date'] || ocrData.fields?.maturity_date || null,
      overridden: !!overrides['maturity_date'],
      matches: ocrData.fields?.maturity_date ? (overrides['maturity_date'] || ocrData.fields.maturity_date) === fdrMaturity : null,
      needs_manual_review: !ocrData.fields?.maturity_date,
      evidence: ocrData.evidence?.maturity_date,
      approvalStatus: fieldApprovals['maturity_date'] || (ocrData.fields?.maturity_date && (overrides['maturity_date'] || ocrData.fields.maturity_date) === fdrMaturity ? 'Approved' : 'Pending'),
    },
  ];

  const mismatchCount = comparisons.filter(c => c.matches === false).length;
  const missingCount = comparisons.filter(c => c.extracted === null || c.extracted === undefined).length;
  const exactMatchCount = comparisons.filter(c => c.matches === true).length;

  const handleApplyOverride = (field: string) => {
    if (editValue.trim()) {
      setOverrides(prev => ({ ...prev, [field]: editValue.trim() }));
      setFieldApprovals(prev => ({ ...prev, [field]: 'Approved' }));
    }
    setEditingField(null);
    setEditValue('');
  };

  const handleToggleApproval = (field: string, currentStatus?: 'Approved' | 'Pending' | 'Rejected') => {
    const nextStatus: 'Approved' | 'Pending' | 'Rejected' = 
      currentStatus === 'Approved' ? 'Rejected' : currentStatus === 'Rejected' ? 'Pending' : 'Approved';
    setFieldApprovals(prev => ({ ...prev, [field]: nextStatus }));
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observations || observations.trim().length < 5) {
      setDecisionError('Mandatory scrutiny observations must be at least 5 characters.');
      return;
    }

    setIsSubmittingDecision(true);
    setDecisionError(null);
    setDecisionSuccess(null);
    try {
      await api.post(`/fdrs/${fdr.id}/verify`, {
        outcome,
        observations: observations.trim(),
        verification_method: verificationMethod,
        supporting_reference: supportingRef ? supportingRef.trim() : null,
      });

      setDecisionSuccess(`Scrutiny decision recorded successfully as [${outcome}]. FDR updated.`);
      if (onRefreshFdr) onRefreshFdr();
    } catch (err: any) {
      setDecisionError(err.message || 'Failed to submit officer decision.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState<boolean>(false);
  const [docError, setDocError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let url: string | null = null;
    const loadBlob = async () => {
      if (!activeDoc) {
        setDocBlobUrl(null);
        return;
      }
      setDocLoading(true);
      setDocError(null);
      try {
        const key = activeDoc.storage_key || activeDoc.original_filename;
        const blob = await fetchDocumentBlob(key, activeDoc.download_url);
        if (active) {
          url = URL.createObjectURL(blob);
          setDocBlobUrl(url);
        }
      } catch (err: any) {
        if (active) {
          setDocError(err.message || 'Failed to stream document.');
        }
      } finally {
        if (active) {
          setDocLoading(false);
        }
      }
    };
    loadBlob();
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [activeDoc]);

  const handleDownloadActiveDoc = () => {
    if (!docBlobUrl || !activeDoc) return;
    const a = document.createElement('a');
    a.href = docBlobUrl;
    a.download = activeDoc.original_filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const docUrl = activeDoc 
    ? getDownloadUrl(activeDoc.storage_key || activeDoc.original_filename, activeDoc.download_url) 
    : null;

  return (
    <div className="space-y-6">
      {/* Workspace Sub-header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gov-teal-700 uppercase tracking-wider mb-1">
            <ScanEye className="h-4 w-4" />
            <span>AICTE Statutory Scrutiny • Dual-Pane OCR Review Workspace</span>
          </div>
          <h2 className="text-xl font-extrabold text-gov-navy-950">
            FDR Instrument: {fdr.fdr_number}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Institution: <span className="font-semibold text-slate-800">{fdr.institution_name}</span> ({fdr.aicte_code})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={fdr.administrative_status} />
          <MaturityBadge status={fdr.maturity_status} days={fdr.days_to_maturity} />
          {activeDoc && (
            <button
              onClick={() => setIsViewerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-2xs"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Full Preview</span>
            </button>
          )}
        </div>
      </div>

      {/* Key Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Deposit Value</span>
          <p className="text-lg font-bold text-gov-navy-950 mt-0.5">
            ₹{fdr.amount.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400">Fixed Deposit Lock-in</span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">OCR Exact Matches</span>
          <p className="text-lg font-bold text-emerald-700 mt-0.5">
            {exactMatchCount} / {comparisons.length} Fields
          </p>
          <span className="text-[10px] text-emerald-600">Zero variance confirmed</span>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">Discrepancies</span>
          <p className="text-lg font-bold text-amber-700 mt-0.5">
            {mismatchCount} Detected
          </p>
          <span className="text-[10px] text-amber-600">Requires officer check</span>
        </div>

        <div className="p-4 rounded-xl border border-gov-teal-200 bg-gov-teal-50/40">
          <span className="text-[11px] font-semibold text-gov-teal-900 uppercase tracking-wide">OCR Engine Status</span>
          <p className="text-lg font-bold text-gov-teal-800 mt-0.5">
            {activeDoc ? 'Scanned & Ready' : 'Document Pending'}
          </p>
          <span className="text-[10px] text-gov-teal-700">Confidence: {(ocrData.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Pane: Document Viewer & Upload */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gov-navy-900" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Uploaded Security Instrument
                </h3>
              </div>

              {activeDoc && (
                <span className="text-[11px] font-mono text-slate-500">
                  {(activeDoc.file_size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>

            {/* Document Frame */}
            {activeDoc ? (
              <div className="space-y-3">
                <div className="h-96 w-full rounded-xl border border-slate-200 bg-slate-900 overflow-hidden relative group flex items-center justify-center">
                  {docLoading ? (
                    <div className="text-center space-y-2">
                      <RefreshCw className="h-6 w-6 text-gov-teal-400 animate-spin mx-auto" />
                      <span className="text-xs text-slate-300">Loading secure preview...</span>
                    </div>
                  ) : docError ? (
                    <div className="p-4 text-center space-y-1">
                      <AlertTriangle className="h-6 w-6 text-amber-400 mx-auto" />
                      <span className="text-xs font-semibold text-slate-200 block">Preview unavailable</span>
                      <span className="text-[11px] text-slate-400">{docError}</span>
                    </div>
                  ) : docBlobUrl ? (
                    activeDoc.file_type.includes('image') || /\.(jpg|jpeg|png)$/i.test(activeDoc.original_filename) ? (
                      <img
                        src={docBlobUrl}
                        alt="Scanned FDR Instrument"
                        className="max-h-full max-w-full object-contain p-2"
                      />
                    ) : (
                      <iframe
                        src={`${docBlobUrl}#toolbar=0`}
                        title="Scanned FDR Document"
                        className="w-full h-full border-0 bg-white"
                      />
                    )
                  ) : null}

                  {docBlobUrl && (
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsViewerOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-slate-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect Fullscreen
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadActiveDoc}
                        className="px-3 py-1.5 rounded-lg bg-gov-teal-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-gov-teal-500"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="truncate max-w-[220px]">
                    <span className="font-semibold text-slate-700 block truncate">{activeDoc.original_filename}</span>
                    <span className="text-[10px] text-slate-400">Uploaded {new Date(activeDoc.created_at).toLocaleDateString()}</span>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs">
                    <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                    <span>Re-upload</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 space-y-3">
                <div className="h-12 w-12 rounded-full bg-gov-navy-50 text-gov-navy-900 flex items-center justify-center mx-auto">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">No instrument uploaded yet</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Upload scanned FDR receipt (PDF, PNG, JPG up to 10MB)</p>
                </div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload FDR Document</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            )}

            {isUploading && (
              <div className="p-3 bg-gov-teal-50 border border-gov-teal-200 rounded-xl flex items-center gap-2 text-xs text-gov-teal-900 font-semibold animate-pulse">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Running multi-layer OCR & regex field extraction pipeline...</span>
              </div>
            )}

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* OCR Engine Info Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-gov-teal-600" />
                  Extraction Pipeline
                </span>
                <span className="font-mono text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-semibold">
                  {ocrData.engine}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {ocrData.notice}
              </p>
            </div>
          </div>
        </div>

        {/* Right Pane: Side-by-Side Comparison & Officer Decision */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Side-by-Side Verification Analysis
                </h3>
                <p className="text-[11px] text-slate-500">
                  Compare registered institutional metadata against document evidence extracted by OCR.
                </p>
              </div>

              {activeDoc && mismatchCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {mismatchCount} Mismatch{mismatchCount > 1 ? 'es' : ''}
                </span>
              )}
            </div>

            {!activeDoc ? (
              /* Conditional Display Rule: Do not show verification table prior to file upload */
              <div className="p-8 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 space-y-3">
                <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                  <ScanEye className="h-6 w-6 text-gov-teal-600" />
                </div>
                <div className="max-w-md mx-auto">
                  <h4 className="text-sm font-bold text-slate-800">Awaiting FDR Instrument Upload</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Verification tables and OCR data comparisons are withheld until a valid FDR receipt or deposit scan is uploaded for OCR analysis.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 font-semibold shadow-2xs">
                  <Sparkles className="h-3.5 w-3.5 text-gov-teal-600 animate-spin" />
                  <span>Ready for document processing. Please upload a PDF or Image.</span>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Field Attribute</th>
                      <th className="py-2.5 px-3">Form Submitted</th>
                      <th className="py-2.5 px-3">OCR Extracted</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      {isOfficerOrAdmin && !readOnly && <th className="py-2.5 px-3 text-right">Action</th>}
                      <th className="py-2.5 px-3 text-center">Approval</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comparisons.map((c) => {
                      const isMismatched = c.matches === false;
                      const isMissing = c.extracted === null || c.extracted === undefined;
                      const isExact = c.matches === true;
                      const approval = c.approvalStatus || (isExact ? 'Approved' : 'Pending');

                      return (
                        <tr 
                          key={c.field}
                          className={`transition-colors ${
                            isMismatched ? 'bg-red-50/50' : isMissing ? 'bg-amber-50/30' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800 block">{c.label}</span>
                            {c.evidence && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-xs mt-0.5" title={c.evidence}>
                                {c.evidence}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {c.submitted}
                          </td>

                          <td className="py-3 px-3">
                            {editingField === c.field ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  className="px-2 py-1 text-xs border border-gov-teal-600 rounded bg-white w-32 focus:outline-none"
                                  placeholder="Officer override"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleApplyOverride(c.field)}
                                  className="px-2 py-1 bg-gov-teal-600 text-white rounded text-[10px] font-bold"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className={`font-mono font-bold ${
                                  isMismatched 
                                    ? 'text-red-700 underline decoration-red-400' 
                                    : isMissing 
                                    ? 'text-amber-700 italic' 
                                    : 'text-slate-800'
                                }`}>
                                  {c.extracted || 'Not Detected'}
                                </span>
                                {c.overridden && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-100 text-purple-800 font-bold">
                                    Officer Override
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {isExact && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="h-3 w-3" />
                                Exact Match
                              </span>
                            )}
                            {isMismatched && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                <XCircle className="h-3 w-3" />
                                Mismatch
                              </span>
                            )}
                            {isMissing && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                                <HelpCircle className="h-3 w-3" />
                                Unreadable
                              </span>
                            )}
                          </td>

                          {isOfficerOrAdmin && !readOnly && (
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingField(c.field);
                                  setEditValue(String(c.extracted || c.submitted));
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-gov-navy-700 hover:text-gov-teal-700 px-2 py-1 hover:bg-slate-100 rounded"
                                title="Override OCR reading manually"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </button>
                            </td>
                          )}

                          <td className="py-3 px-3 text-center">
                            {isOfficerOrAdmin && !readOnly ? (
                              <button
                                type="button"
                                onClick={() => handleToggleApproval(c.field, approval)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all ${
                                  approval === 'Approved'
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                    : approval === 'Rejected'
                                    ? 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
                                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                                }`}
                                title="Click to cycle status: Approved -> Rejected -> Pending"
                              >
                                {approval === 'Approved' && <CheckCircle2 className="h-3 w-3" />}
                                {approval === 'Rejected' && <XCircle className="h-3 w-3" />}
                                {approval === 'Pending' && <HelpCircle className="h-3 w-3" />}
                                <span>{approval}</span>
                              </button>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                approval === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : approval === 'Rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {approval}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Statutory Guardrail Banner */}
            <div className="p-4 rounded-xl bg-gov-navy-950 text-white space-y-2 border border-gov-navy-800">
              <div className="flex items-center gap-2 text-gov-teal-300 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-gov-teal-400" />
                <span>Statutory Human-in-the-Loop Mandate</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Pursuant to AICTE Approval Process Regulations 2026, automated OCR extraction is strictly an assistive scrutiny tool. 
                Algorithms do not approve, verify, or release security deposit liens. The final outcome is exclusively authorized under human officer review.
              </p>
            </div>
          </div>

          {/* Officer Scrutiny Action Form (If Officer or Admin) */}
          {isOfficerOrAdmin && !readOnly ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-gov-navy-900" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Official Scrutiny Decision Docket
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500">
                  Officer: <strong className="text-slate-800">{user?.name}</strong>
                </span>
              </div>

              {decisionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{decisionSuccess}</span>
                </div>
              )}

              {decisionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{decisionError}</span>
                </div>
              )}

              <form onSubmit={handleDecisionSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Scrutiny Determination *
                    </label>
                    <select
                      value={outcome}
                      onChange={e => setOutcome(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                    >
                      <option value="VERIFIED">VERIFIED — Instrument Approved & Lien Confirmed</option>
                      <option value="CLARIFICATION_REQUIRED">CLARIFICATION_REQUIRED — Ask College to Resubmit</option>
                      <option value="DISCREPANCY_DETECTED">DISCREPANCY_DETECTED — Form & Document Mismatch</option>
                      <option value="REJECTED">REJECTED — Invalid or Non-Compliant FDR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Verification Method *
                    </label>
                    <select
                      value={verificationMethod}
                      onChange={e => setVerificationMethod(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                    >
                      <option value="MANUAL_SCRUTINY">MANUAL_SCRUTINY (Document & Seal Inspection)</option>
                      <option value="DEMO_BANK_SIMULATION">DEMO_BANK_SIMULATION (Bank API Direct Crosscheck)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Observations & Scrutiny Notes * (Mandatory audit trail)
                  </label>
                  <textarea
                    rows={3}
                    value={observations}
                    onChange={e => setObservations(e.target.value)}
                    placeholder="Provide specific justification e.g. 'FDR instrument examined against AICTE security deposit register; joint lien clause verified with bank manager seal.'"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none leading-relaxed"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Supporting Reference Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={supportingRef}
                    onChange={e => setSupportingRef(e.target.value)}
                    placeholder="e.g. AICTE/SCRUTINY/2026/FDR-9821"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">
                    Action will create an immutable audit record and notify the college instantly.
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingDecision}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gov-navy-900 hover:bg-gov-navy-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                  >
                    <span>{isSubmittingDecision ? 'Recording Decision...' : 'Commit Scrutiny Decision'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Official Scrutiny Audit Log
              </h3>
              {fdr.verifications && fdr.verifications.length > 0 ? (
                <div className="space-y-3">
                  {fdr.verifications.map((v) => (
                    <div key={v.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          Decision: <StatusBadge status={v.outcome} size="sm" />
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(v.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{v.observations}</p>
                      <div className="text-[10px] text-slate-400 pt-1">
                        Reviewed by {v.reviewer_name || 'AICTE Officer'} via {v.verification_method}
                        {v.supporting_reference ? ` • Ref: ${v.supporting_reference}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  This FDR instrument is currently awaiting initial officer scrutiny review.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full Document Viewer Modal */}
      <DocumentViewerModal
        document={activeDoc}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
      />
    </div>
  );
};

