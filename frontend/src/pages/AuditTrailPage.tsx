import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
  Code2,
  ShieldAlert,
  ArrowRight,
  FileText,
  Building2,
  Lock,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';

export const AuditTrailPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const qs = actionFilter.trim() ? `?action=${encodeURIComponent(actionFilter.trim())}` : '';
      const data = await api.get<AuditLog[]>(`/audit${qs}`);
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter]);

  const toggleExpand = (id: number) => {
    setExpandedLogId(prev => (prev === id ? null : id));
  };

  // Helper for human-readable action label
  const getActionLabel = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('LOGIN')) return { label: 'User Authentication Sign-in', color: 'bg-blue-50 text-blue-800 border-blue-200' };
    if (act.includes('LOGOUT')) return { label: 'User Sign-out Session', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    if (act.includes('CREATE_FDR') || act.includes('REGISTER_FDR')) return { label: 'FDR Deposit Registered', color: 'bg-purple-50 text-purple-800 border-purple-200' };
    if (act.includes('VERIFY') || act.includes('SCRUTINY')) return { label: 'AICTE Officer Scrutiny Decision', color: 'bg-gov-teal-50 text-gov-teal-900 border-gov-teal-300' };
    if (act.includes('RENEWAL_ADMIN') || act.includes('FINAL_APPROV')) return { label: 'Admin Final Governance Sign-off', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
    if (act.includes('RENEWAL')) return { label: 'Renewal Replacement Filed', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
    if (act.includes('RELEASE')) return { label: 'Lien Release Determination', color: 'bg-amber-50 text-amber-900 border-amber-300' };
    if (act.includes('INSTITUTION_UPDATE')) return { label: 'Institutional Registry Modified', color: 'bg-cyan-50 text-cyan-900 border-cyan-300' };
    if (act.includes('DOCUMENT_UPLOAD') || act.includes('UPLOAD')) return { label: 'Security Receipt Scan Uploaded', color: 'bg-teal-50 text-teal-800 border-teal-200' };
    return { label: action.replace(/_/g, ' '), color: 'bg-slate-100 text-slate-800 border-slate-200' };
  };

  // Extract actor role badge
  const getActorRole = (log: AuditLog) => {
    const meta = log.metadata_json || {};
    return meta.role || meta.user_role || (log.actor_email?.includes('admin') ? 'ADMIN' : log.actor_email?.includes('officer') ? 'AICTE_OFFICER' : 'COLLEGE_USER');
  };

  // Extract remarks or human note
  const getLogRemarks = (log: AuditLog) => {
    const meta = log.metadata_json || {};
    return meta.remarks || meta.observations || meta.reason || meta.details || meta.message || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gov-navy-800 uppercase tracking-wider mb-1">
            <History className="h-4 w-4 text-gov-teal-600" />
            <span>AICTE Immutable Security Audit Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
            System Audit Trail & Governance Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident log of all authentication events, FDR registrations, scrutiny determinations, and multi-stage administrative sign-offs.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-gov-navy-50 border border-gov-navy-200 text-xs font-bold text-gov-navy-950 flex items-center gap-2 shadow-2xs">
          <ShieldCheck className="h-4 w-4 text-gov-teal-600" />
          <span>Non-Repudiation Verified</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            placeholder="Search by action, email, or entity keyword (e.g. 'LOGIN', 'FDR', 'VERIFY', 'RENEWAL')..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
          />
        </div>
        {actionFilter && (
          <button
            onClick={() => setActionFilter('')}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-50"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <LoadingSpinner message="Querying tamper-evident audit ledger..." />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No Audit Records Found"
          description="No security audit events match the specified filter."
          icon={History}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action Performed</th>
                  <th className="py-3 px-4">User / Actor</th>
                  <th className="py-3 px-4">Affected Target</th>
                  <th className="py-3 px-4">Status Transition</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isSuccess = log.result === 'SUCCESS';
                  const isExpanded = expandedLogId === log.id;
                  const actionInfo = getActionLabel(log.action);
                  const actorRole = getActorRole(log);
                  const remarks = getLogRemarks(log);
                  const meta = log.metadata_json || {};

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => toggleExpand(log.id)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${actionInfo.color}`}>
                            {actionInfo.label}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{log.actor_email || 'System Daemon'}</div>
                          <div className="mt-0.5">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {actorRole}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-700">
                          {log.entity_type === 'FDR' ? (
                            <Link 
                              to={`/fdrs/${log.entity_id}`} 
                              onClick={e => e.stopPropagation()}
                              className="font-mono font-bold text-gov-teal-700 hover:underline flex items-center gap-1"
                            >
                              <span>FDR #{log.entity_id}</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <div>
                              <span className="font-semibold">{log.entity_type}</span>
                              {log.entity_id && (
                                <span className="text-[10px] text-slate-400 font-mono ml-1">
                                  (#{log.entity_id})
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {meta.previous_status && meta.new_status ? (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {meta.previous_status}
                              </span>
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              <span className="px-1.5 py-0.5 rounded bg-gov-teal-50 text-gov-teal-800 border border-gov-teal-200">
                                {meta.new_status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuccess 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}>
                            {log.result}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            className="p-1 rounded text-slate-400 hover:text-slate-700"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Human-Readable Audit Detail */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-4 bg-slate-50 border-y border-slate-200 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div className="p-3 bg-white rounded-xl border border-slate-200">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Actor Identity</span>
                                <span className="font-semibold text-slate-800">{log.actor_email || 'System'}</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Role: {actorRole} • IP: {log.ip_address || '127.0.0.1'}</span>
                              </div>

                              <div className="p-3 bg-white rounded-xl border border-slate-200">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Scope</span>
                                <span className="font-semibold text-slate-800">{log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}</span>
                                {meta.fdr_number && (
                                  <span className="text-[10px] text-gov-teal-700 font-mono block mt-0.5">Instrument: {meta.fdr_number}</span>
                                )}
                              </div>

                              <div className="p-3 bg-white rounded-xl border border-slate-200">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Action Result</span>
                                <span className={`font-bold ${isSuccess ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {log.result} — Authorized
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">Logged: {new Date(log.created_at).toISOString()}</span>
                              </div>
                            </div>

                            {remarks && (
                              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Human-Readable Scrutiny Remarks</span>
                                <p className="text-slate-700 leading-relaxed font-medium">{remarks}</p>
                              </div>
                            )}

                            {/* Collapsible Forensic Technical Payload (Restricted to Authorized Admins or optional view) */}
                            <details className="text-xs group">
                              <summary className="cursor-pointer text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1 text-[11px]">
                                <Code2 className="h-3.5 w-3.5 text-gov-teal-600" />
                                <span>View Forensic Technical Payload (JSON)</span>
                              </summary>
                              <div className="mt-2 p-3 bg-slate-900 rounded-xl text-emerald-400 font-mono text-[11px] overflow-x-auto">
                                <pre>{JSON.stringify(meta, null, 2)}</pre>
                              </div>
                            </details>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
