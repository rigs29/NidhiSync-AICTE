import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  FileText,
  Upload,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Institution, FDRRecord } from '../types';

const fdrSchema = z.object({
  fdr_number: z.string().min(3, 'FDR number must be at least 3 characters'),
  bank_name: z.string().min(2, 'Bank name is required'),
  branch_name: z.string().min(2, 'Branch name is required'),
  amount: z.coerce.number().positive('Deposit amount must be greater than zero'),
  issue_date: z.string().min(1, 'Issue date is required'),
  maturity_date: z.string().min(1, 'Maturity date is required'),
  deposit_type: z.string().min(1, 'Deposit type is required'),
  institution_id: z.coerce.number().optional(),
}).refine((data) => new Date(data.maturity_date) >= new Date(data.issue_date), {
  message: 'Maturity date cannot be earlier than Issue date',
  path: ['maturity_date'],
});

type FDRFormData = z.infer<typeof fdrSchema>;

export const NewFDRPage: React.FC = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FDRFormData>({
    resolver: zodResolver(fdrSchema),
    defaultValues: {
      deposit_type: 'Security Deposit (Mandatory)',
      institution_id: user?.institution_id || undefined,
    },
  });

  useEffect(() => {
    if (role !== 'COLLEGE_USER') {
      api.get<Institution[]>('/institutions').then(setInstitutions).catch(console.error);
    }
  }, [role]);

  const onSubmit = async (data: FDRFormData) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        currency: 'INR',
        institution_id: role === 'COLLEGE_USER' ? user?.institution_id : data.institution_id,
      };

      const newFdr = await api.post<FDRRecord>('/fdrs', payload);

      // If document was selected, upload it
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadResponse = await api.upload<{ ocr_extraction?: any }>(
          `/documents/upload/${newFdr.id}`,
          formData
        );
        setOcrResult(uploadResponse.ocr_extraction ?? null);
      }

      if (!selectedFile) {
        navigate(`/fdrs/${newFdr.id}`);
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to submit FDR record. Check fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-aicte-navy-700 uppercase tracking-wider mb-1">
          <FileText className="h-4 w-4" />
          <span>Statutory Compliance Registration</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Register New Fixed Deposit Receipt (FDR)</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Submit the official fixed deposit receipt under joint lien with Member Secretary, AICTE.
        </p>
      </div>

      {serverError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        
        {/* Institution selection (only visible if officer/admin) */}
        {role !== 'COLLEGE_USER' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Institution *
            </label>
            <select
              {...register('institution_id')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-aicte-navy-700"
            >
              <option value="">-- Choose Technical Institution --</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.aicte_code})
                </option>
              ))}
            </select>
            {errors.institution_id && (
              <p className="text-[11px] text-red-600 mt-1">{errors.institution_id.message}</p>
            )}
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2 text-xs">
            <Building2 className="h-4 w-4 text-slate-500" />
            <span className="font-semibold text-slate-800">Filing for:</span>
            <span className="text-slate-600">{user?.institution_name}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              FDR Reference Number *
            </label>
            <input
              type="text"
              placeholder="e.g. SBI-FDR-2026-9921"
              {...register('fdr_number')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-aicte-navy-700"
            />
            {errors.fdr_number && (
              <p className="text-[11px] text-red-600 mt-1">{errors.fdr_number.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deposit Amount (INR â‚¹) *
            </label>
            <input
              type="number"
              step="1000"
              placeholder="e.g. 1500000"
              {...register('amount')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-aicte-navy-700"
            />
            {errors.amount && (
              <p className="text-[11px] text-red-600 mt-1">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bank Name *
            </label>
            <input
              type="text"
              placeholder="e.g. State Bank of India"
              {...register('bank_name')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-aicte-navy-700"
            />
            {errors.bank_name && (
              <p className="text-[11px] text-red-600 mt-1">{errors.bank_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Branch Name & City *
            </label>
            <input
              type="text"
              placeholder="e.g. Parliament Street, New Delhi"
              {...register('branch_name')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-aicte-navy-700"
            />
            {errors.branch_name && (
              <p className="text-[11px] text-red-600 mt-1">{errors.branch_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Issue Date *
            </label>
            <input
              type="date"
              {...register('issue_date')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-aicte-navy-700"
            />
            {errors.issue_date && (
              <p className="text-[11px] text-red-600 mt-1">{errors.issue_date.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Maturity Date *
            </label>
            <input
              type="date"
              {...register('maturity_date')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-aicte-navy-700"
            />
            {errors.maturity_date && (
              <p className="text-[11px] text-red-600 mt-1">{errors.maturity_date.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Deposit Purpose / Type *
          </label>
          <select
            {...register('deposit_type')}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-aicte-navy-700"
          >
            <option value="Security Deposit (Mandatory Approval)">Security Deposit (Mandatory Approval)</option>
            <option value="New Technical Program Introduction">New Technical Program Introduction</option>
            <option value="Increase in Student Intake Corpus">Increase in Student Intake Corpus</option>
            <option value="Establishment of New Institution Deposit">Establishment of New Institution Deposit</option>
          </select>
        </div>

        {/* File Upload Box */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Upload FDR Document (PDF / Scanned Copy)
          </label>
          <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 text-center cursor-pointer transition-colors">
            <input
              type="file"
              id="fdr_file_input"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <label htmlFor="fdr_file_input" className="cursor-pointer space-y-1 block">
              <Upload className="h-6 w-6 text-slate-400 mx-auto" />
              {selectedFile ? (
                <div className="text-xs font-semibold text-emerald-700">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              ) : (
                <div className="text-xs text-slate-600 font-medium">
                  Click to select signed FDR receipt with bank seal
                </div>
              )}
              <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10 MB limit</p>
            </label>
          </div>
        </div>

        {/* OCR Extraction Result */}
      {ocrResult && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-aicte-navy-700" />
            <h2 className="font-bold text-slate-900">Document OCR Analysis</h2>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-800">
              Status: {String(ocrResult.status ?? 'UNKNOWN').replace(/_/g, ' ')}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              Engine: {ocrResult.engine ?? 'Not specified'}
            </span>
            {ocrResult.confidence != null && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                Confidence: {String(ocrResult.confidence)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(ocrResult.extracted_fields ?? {}).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-slate-100 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                  {value == null || value === '' ? 'Not detected' : String(value)}
                </p>
              </div>
            ))}
          </div>

          {ocrResult.notice && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertCircle className="mr-1 inline h-4 w-4" />
              {String(ocrResult.notice)}
            </p>
          )}

          <p className="text-xs text-slate-500">
            OCR results are suggestions for officer review. Please compare them with the original document.
            They do not automatically verify the FDR.
          </p>

          <button
            type="button"
            onClick={() => navigate(`/fdrs/${new URLSearchParams(window.location.search).get('id')}`)}
            className="hidden"
          >
            View FDR
          </button>
        </div>
      )}

      {/* Security Notice */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-900">
          <ShieldCheck className="h-4 w-4 text-blue-700 shrink-0" />
          <span>
            Every submission produces an immutable audit record and transitions to the official AICTE scrutiny queue.
          </span>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/fdrs')}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-aicte-navy-900 hover:bg-aicte-navy-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Registering...' : 'Register FDR Record'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

