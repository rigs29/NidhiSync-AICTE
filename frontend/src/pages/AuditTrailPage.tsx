import React, { useState, useEffect } from 'react';
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
  Code2
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const AuditTrailPage: React.FC = () => {
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
            System Audit Trail & Forensic Event Stream
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident log of all authentication attempts, FDR registrations, OCR extractions, and scrutiny determinations.
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
            placeholder="Filter by action keyword (e.g. 'LOGIN', 'CREATE_FDR', 'VERIFY', 'UPLOAD')..."
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
                  <th className="py-3 px-4">Event Timestamp</th>
                  <th className="py-3 px-4">Official Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4 text-right">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isSuccess = log.result === 'SUCCESS';
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => toggleExpand(log.id)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-gov-navy-950">
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {log.actor_email || 'System Agent'}
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          <span className="font-semibold">{log.entity_type}</span>
                          {log.entity_id && (
                            <span className="text-[10px] text-slate-400 font-mono ml-1">
                              (#{log.entity_id})
                            </span>
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

                      {/* Expandable JSON Metadata */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="p-4 bg-slate-900 text-slate-200 font-mono text-[11px] border-b border-slate-200">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                              <span className="flex items-center gap-1.5 font-bold text-gov-teal-400">
                                <Code2 className="h-3.5 w-3.5" />
                                Forensic Payload Metadata (Log #{log.id})
                              </span>
                              <span>Client IP: {log.ip_address || '127.0.0.1'}</span>
                            </div>
                            <pre className="overflow-x-auto p-2 bg-slate-950 rounded-lg text-emerald-400">
                              {JSON.stringify(log.metadata_json || {}, null, 2)}
                            </pre>
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

