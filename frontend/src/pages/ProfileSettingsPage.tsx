import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  ShieldCheck,
  Server,
  Cloud,
  Bell,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, API_BASE } from '../services/api';
import { RoleBadge } from '../components/common/Badge';

export const ProfileSettingsPage: React.FC = () => {
  const { user, role, logout } = useAuth();

  const [health, setHealth] = useState<any>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [jobResult, setJobResult] = useState<any>(null);
  const [isRunningJob, setIsRunningJob] = useState(false);

  const fetchHealth = async () => {
    setIsCheckingHealth(true);
    try {
      // Health is at /api/health
      const baseRoot = API_BASE.replace(/\/api\/v1\/?$/, '');
      const res = await fetch(`${baseRoot}/api/health`).then(r => r.json());
      setHealth(res);
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleRunMaturityJob = async () => {
    setIsRunningJob(true);
    setJobResult(null);
    try {
      const res = await api.post('/jobs/maturity-check');
      setJobResult(res);
    } catch (err: any) {
      setJobResult({ error: err.message || 'Job execution failed' });
    } finally {
      setIsRunningJob(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gov-navy-800 uppercase tracking-wider mb-1">
            <Settings className="h-4 w-4 text-gov-teal-600" />
            <span>AICTE System Configuration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
            Profile & Statutory System Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your credentials, examine system connectivity health, and simulate scheduled cron jobs.
          </p>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-200"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
          <User className="h-4 w-4 text-gov-navy-900" />
          <span>Active Official Profile</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Official Full Name</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{user?.name}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Official Email Address</span>
            <span className="font-bold font-mono text-slate-900 text-sm mt-0.5 block">{user?.email}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Assigned System Role</span>
            <div className="mt-1">
              <RoleBadge role={role || 'COLLEGE_USER'} />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Institutional Attachment</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {user?.institution_name || 'AICTE Central Headquarters / ICT Cell'}
            </span>
          </div>
        </div>
      </div>

      {/* System Infrastructure Health Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Server className="h-4 w-4 text-gov-navy-900" />
            <span>Cloud & Infrastructure Connectivity Health</span>
          </h3>

          <button
            onClick={fetchHealth}
            disabled={isCheckingHealth}
            className="text-xs font-bold text-gov-teal-700 hover:underline flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
            <span>Check Now</span>
          </button>
        </div>

        {health ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Status</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {health.status}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Storage Provider</span>
              <span className="font-bold text-slate-800 font-mono mt-0.5 block">
                {health.storage_provider}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Notification Engine</span>
              <span className="font-bold text-slate-800 font-mono mt-0.5 block">
                {health.notification_provider}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">AWS Region</span>
              <span className="font-bold text-slate-800 font-mono mt-0.5 block">
                {health.aws_region || 'ap-southeast-2'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Probing system health endpoint...</p>
        )}
      </div>

      {/* Scheduled Job Simulation (Officers & Admin) */}
      {(role === 'AICTE_OFFICER' || role === 'ADMIN') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-gov-teal-600" />
                <span>Simulate Automated EventBridge Daily Maturity Job</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluates all fixed deposit receipts, calculates days-to-maturity, and dispatches 30-day and 15-day compliance alert notifications.
              </p>
            </div>

            <button
              onClick={handleRunMaturityJob}
              disabled={isRunningJob}
              className="px-4 py-2 rounded-xl bg-gov-navy-900 text-white hover:bg-gov-navy-800 text-xs font-bold transition-colors shadow-sm disabled:opacity-50 shrink-0"
            >
              {isRunningJob ? 'Executing Job...' : 'Trigger Maturity Check'}
            </button>
          </div>

          {jobResult && (
            <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs space-y-2 border border-slate-800">
              <div className="flex items-center justify-between text-gov-teal-400 border-b border-slate-800 pb-1">
                <span className="font-bold">Scheduler Execution Response</span>
                <span>Idempotent Worker</span>
              </div>
              <pre className="overflow-x-auto text-emerald-400 text-[11px]">
                {JSON.stringify(jobResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

