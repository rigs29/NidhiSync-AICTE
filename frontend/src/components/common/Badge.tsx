import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  XCircle, 
  FileCheck2, 
  RefreshCw, 
  ShieldCheck, 
  Building2, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { AdministrativeStatus, MaturityStatus, Role } from '../../types';

interface StatusBadgeProps {
  status: AdministrativeStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = (status || '').toUpperCase();
  const px = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  switch (s) {
    case 'VERIFIED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${px}`}>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>Verified & Approved</span>
        </span>
      );
    case 'UNDER_REVIEW':
      return (
        <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200 ${px}`}>
          <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0 animate-pulse" />
          <span>Under Scrutiny</span>
        </span>
      );
    case 'SUBMITTED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-slate-100 text-slate-800 border border-slate-300 ${px}`}>
          <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>Submitted</span>
        </span>
      );
    case 'CLARIFICATION_REQUIRED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-amber-50 text-amber-900 border border-amber-300 ${px}`}>
          <HelpCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>Clarification Required</span>
        </span>
      );
    case 'DISCREPANCY_DETECTED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-rose-50 text-rose-900 border border-rose-300 ${px}`}>
          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
          <span>Discrepancy Detected</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-red-50 text-red-800 border border-red-200 ${px}`}>
          <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
          <span>Rejected</span>
        </span>
      );
    case 'RENEWAL_SUBMITTED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-purple-50 text-purple-800 border border-purple-200 ${px}`}>
          <RefreshCw className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          <span>Renewal In Progress</span>
        </span>
      );
    case 'RELEASE_APPROVED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-teal-50 text-teal-800 border border-teal-200 ${px}`}>
          <FileCheck2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
          <span>Release Authorized</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${px}`}>
          <span>{s.replace(/_/g, ' ')}</span>
        </span>
      );
  }
};

export const MaturityBadge: React.FC<{ status: MaturityStatus | string; days?: number; size?: 'sm' | 'md' }> = ({
  status,
  days,
  size = 'md',
}) => {
  const s = (status || '').toUpperCase();
  const px = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  if (s === 'MATURED') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-red-100 text-red-900 border border-red-300 ${px}`}>
        <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
        <span>Matured (Overdue{days !== undefined ? ` ${Math.abs(days)}d` : ''})</span>
      </span>
    );
  }

  if (s === 'APPROACHING_MATURITY') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-amber-50 text-amber-900 border border-amber-300 ${px}`}>
        <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span>Matures Soon{days !== undefined ? ` (${days}d left)` : ''}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${px}`}>
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
      <span>Active Lien{days !== undefined && days > 0 ? ` (${days}d remaining)` : ''}</span>
    </span>
  );
};

export const RoleBadge: React.FC<{ role: Role | string }> = ({ role }) => {
  switch (role) {
    case 'AICTE_OFFICER':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gov-navy-900 text-gov-teal-300 border border-gov-teal-700">
          <ShieldCheck className="h-3.5 w-3.5 text-gov-teal-400" />
          AICTE Officer
        </span>
      );
    case 'ADMIN':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-900 text-purple-200 border border-purple-700">
          <Sparkles className="h-3.5 w-3.5 text-purple-300" />
          System Admin
        </span>
      );
    case 'COLLEGE_USER':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
          <Building2 className="h-3.5 w-3.5 text-slate-600" />
          College User
        </span>
      );
  }
};

export const OcrStatusBadge: React.FC<{ status: string; confidence?: number }> = ({ status, confidence }) => {
  const s = (status || '').toUpperCase();
  if (s === 'EXTRACTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gov-teal-50 text-gov-teal-900 border border-gov-teal-300">
        <Sparkles className="h-3.5 w-3.5 text-gov-teal-600" />
        Extracted {confidence !== undefined ? `(${Math.round(confidence * 100)}%)` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
      Manual Review Required
    </span>
  );
};

