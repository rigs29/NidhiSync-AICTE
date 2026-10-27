import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ScanEye,
  FileCheck2,
  Info,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Institution, FDRRecord, DocumentRecord } from '../types';

export const NewFDRPage: React.FC = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedFdr, setSubmittedFdr] = useState<FDRRecord | null>(null);
  const [ocrExtractionResult, setOcrExtractionResult] = useState<any>(null);

  // Form State
  const [fdrNumber, setFdrNumber] = useState('');
  const [bankName, setBankName] = useState('State Bank of India');
  const [branchName, setBranchName] = useState('');
  const [amount, setAmount] = useState<string>('1500000');
  const [issueDate, setIssueDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });
  const [maturityDate, setMaturityDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 4);
    return d.toISOString().split('T')[0];
  });
  const [depositType, setDepositType] = useState('Security Deposit (Mandatory)');
  const [institutionId, setInstitutionId] = useState<number | undefined>(user?.institution_id || undefined);
  const [lienAcknowledged, setLienAcknowledged] = useState(true);

  useEffect(() => {
    if (role !== 'COLLEGE_USER') {
      api.get<Institution[]>('/institutions').then(setInstitutions).catch(console.error);
    }
  }, [role]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.includes('image')) {
        setFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Validation
    if (!fdrNumber.trim()) {
      setServerError('FDR Number is mandatory.');
      return;
    }
    if (!branchName.trim()) {
      setServerError('Branch Name is mandatory.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setServerError('Deposit amount must be greater than zero.');
      return;
    }
    if (new Date(maturityDate) < new Date(issueDate)) {
      setServerError('Maturity date cannot be earlier than Issue date.');
      return;
    }
    if (!lienAcknowledged) {
      setServerError('You must acknowledge the mandatory AICTE joint lien declaration.');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetInstId = role === 'COLLEGE_USER' ? user?.institution_id : (institutionId || user?.institution_id);

      const payload = {
        fdr_number: fdrNumber.trim(),
        bank_name: bankName.trim(),
        branch_name: branchName.trim(),
        amount: numAmount,
        currency: 'INR',
        issue_date: issueDate,
        maturity_date: maturityDate,
        deposit_type: depositType,
        institution_id: targetInstId,
      };

      const newFdr = await api.post<FDRRecord>('/fdrs', payload);
      setSubmittedFdr(newFdr);

      // If document attached, upload and run OCR
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const docRes = await api.upload<DocumentRecord>(`/documents/upload/${newFdr.id}`, formData);
        setOcrExtractionResult(docRes.ocr_extraction);
      } else {
        navigate(`/fdrs/${newFdr.id}`);
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to submit FDR record. Check fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gov-navy-800 uppercase tracking-wider mb-1">
            <FileText className="h-4 w-4 text-gov-teal-600" />
            <span>Statutory Compliance Registration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
            Register New Fixed Deposit Receipt (FDR)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register an institutional security deposit instrument under joint lien with Member Secretary, AICTE.
          </p>
        </div>

        <Link
          to="/fdrs"
          className="text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 px-3.5 py-2 rounded-xl hover:bg-slate-50 transition-colors"
        >
          Cancel & Return
        </Link>
      </div>

      {serverError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Post-submission Success & OCR Analysis Card */}
      {submittedFdr && (
        <div className="p-6 bg-white rounded-2xl border border-gov-teal-300 shadow-lg space-y-4">
          <div className="flex items-center gap-2.5 text-gov-teal-900">
            <CheckCircle2 className="h-6 w-6 text-gov-teal-600" />
            <h2 className="text-lg font-bold">FDR Registered Successfully ({submittedFdr.fdr_number})</h2>
          </div>

          <p className="text-xs text-slate-600">
            The security deposit record has been committed to the AICTE ledger. Document OCR analysis has completed.
          </p>

          {ocrExtractionResult && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-gov-teal-600" />
                  Live Document OCR Extraction Preview
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gov-teal-100 text-gov-teal-800 font-bold">
                  Engine: {ocrExtractionResult.engine}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block uppercase">Extracted FDR #</span>
                  <span className="font-mono font-bold text-slate-800">
                    {ocrExtractionResult.extracted_fields?.fdr_number || 'Pending'}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block uppercase">Bank Name</span>
                  <span className="font-bold text-slate-800">
                    {ocrExtractionResult.extracted_fields?.bank_name || 'Pending'}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block uppercase">Principal Sum</span>
                  <span className="font-bold text-slate-800">
                    ₹{ocrExtractionResult.extracted_fields?.amount ? Number(ocrExtractionResult.extracted_fields.amount).toLocaleString('en-IN') : 'Pending'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                {ocrExtractionResult.notice || 'Document forwarded to the official AICTE Scrutiny Queue for human officer endorsement.'}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => navigate(`/ocr-workspace?id=${submittedFdr.id}`)}
              className="px-4 py-2 bg-gov-teal-600 hover:bg-gov-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <ScanEye className="h-4 w-4" />
              <span>Launch Full OCR Review Workspace</span>
            </button>
            <button
              onClick={() => navigate(`/fdrs/${submittedFdr.id}`)}
              className="px-4 py-2 bg-gov-navy-900 hover:bg-gov-navy-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              View FDR Details
            </button>
          </div>
        </div>
      )}

      {/* Main Registration Form */}
      {!submittedFdr && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Institution Selector if Officer / Admin */}
          {role !== 'COLLEGE_USER' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Technical Institution *
              </label>
              <select
                value={institutionId || ''}
                onChange={e => setInstitutionId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              >
                <option value="">-- Choose Technical Institution --</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.aicte_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Instrument Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                FDR Reference / Receipt Number *
              </label>
              <input
                type="text"
                value={fdrNumber}
                onChange={e => setFdrNumber(e.target.value)}
                placeholder="e.g. SBI-FDR-2026-9041"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-mono font-semibold focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Issuing Scheduled Commercial Bank *
              </label>
              <select
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              >
                <option value="State Bank of India">State Bank of India</option>
                <option value="Punjab National Bank">Punjab National Bank</option>
                <option value="Canara Bank">Canara Bank</option>
                <option value="Bank of Baroda">Bank of Baroda</option>
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="Indian Overseas Bank">Indian Overseas Bank</option>
                <option value="Union Bank of India">Union Bank of India</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Bank Branch Location & IFSC *
              </label>
              <input
                type="text"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                placeholder="e.g. Parliament Street Branch, New Delhi"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Security Deposit Principal Sum (INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="1500000"
                  className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-mono font-bold focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Dates & Deposit Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Date of Issue *
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Maturity Expiry Date *
              </label>
              <input
                type="date"
                value={maturityDate}
                onChange={e => setMaturityDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Statutory Deposit Type *
              </label>
              <select
                value={depositType}
                onChange={e => setDepositType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
              >
                <option value="Security Deposit (Mandatory)">Security Deposit (Mandatory)</option>
                <option value="New Course Introduction Corpus">New Course Introduction Corpus</option>
                <option value="Autonomous Status Guarantee">Autonomous Status Guarantee</option>
                <option value="Establishment of New Technical Institute">Establishment of New Technical Institute</option>
              </select>
            </div>
          </div>

          {/* File Upload Zone */}
          <div className="p-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-gov-navy-900" />
                <span className="text-xs font-bold text-slate-800">
                  Attach Official FDR Deposit Receipt Scan (PDF / Image)
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">OCR Enabled</span>
            </div>

            <p className="text-[11px] text-slate-500">
              Upload clear copy of the fixed deposit receipt bearing the joint lien endorsement and branch manager signature.
            </p>

            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs">
                <span>Select File</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                />
              </label>

              {selectedFile ? (
                <span className="text-xs font-semibold text-gov-teal-800 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-gov-teal-600" />
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              ) : (
                <span className="text-xs text-slate-400 italic">No document chosen yet</span>
              )}
            </div>

            {filePreviewUrl && (
              <div className="pt-2">
                <img
                  src={filePreviewUrl}
                  alt="Receipt Preview"
                  className="h-32 object-contain rounded-lg border border-slate-200 bg-white p-1"
                />
              </div>
            )}
          </div>

          {/* Statutory Lien Declaration Checkbox */}
          <div className="p-4 rounded-xl bg-gov-navy-50 border border-gov-navy-200 flex items-start gap-3">
            <input
              type="checkbox"
              id="lienAck"
              checked={lienAcknowledged}
              onChange={e => setLienAcknowledged(e.target.checked)}
              className="mt-1 h-4 w-4 rounded text-gov-navy-900 focus:ring-gov-navy-900 border-slate-300"
            />
            <label htmlFor="lienAck" className="text-xs text-gov-navy-950 font-medium leading-relaxed">
              <strong>Mandatory Statutory AICTE Lien Endorsement:</strong> I hereby certify that the instrument above is held under joint lien with the <em>Member Secretary, All India Council for Technical Education, New Delhi</em>, and shall not be encashed, pledged, or released without formal written release authorization from AICTE.
            </label>
          </div>

          {/* Form Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/fdrs')}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gov-navy-900 hover:bg-gov-navy-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Registering Instrument & Scanning...' : 'Register FDR Record'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

