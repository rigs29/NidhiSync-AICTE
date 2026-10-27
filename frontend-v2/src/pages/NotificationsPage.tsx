import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  HandCoins,
  ShieldCheck,
  CheckCheck,
  ArrowRight
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'MATURITY_ALERT':
        return <Clock className="h-5 w-5 text-amber-600" />;
      case 'SCRUTINY_UPDATE':
        return <ShieldCheck className="h-5 w-5 text-gov-teal-600" />;
      case 'RENEWAL_ALERT':
        return <RefreshCw className="h-5 w-5 text-purple-600" />;
      case 'RELEASE_UPDATE':
        return <HandCoins className="h-5 w-5 text-emerald-600" />;
      default:
        return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gov-navy-800 uppercase tracking-wider mb-1">
            <Bell className="h-4 w-4 text-gov-teal-600" />
            <span>Statutory Notification Feed</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
            Official Notifications & Compliance Alerts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Maturity countdown notices, scrutiny updates, renewal requests, and release authorizations.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <CheckCheck className="h-4 w-4 text-gov-teal-600" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            filter === 'all'
              ? 'bg-gov-navy-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            filter === 'unread'
              ? 'bg-gov-navy-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingSpinner message="Retrieving compliance notifications..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Notifications Found"
          description={filter === 'unread' ? 'You have no unread notifications.' : 'No compliance alerts recorded.'}
          icon={Bell}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(n => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all ${
                !n.is_read
                  ? 'bg-white border-blue-200 ring-1 ring-blue-100 shadow-sm'
                  : 'bg-white/70 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-100 shrink-0">
                    {getIcon(n.notification_type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900">{n.subject}</h3>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 pt-1">
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                      <span>•</span>
                      <span className="uppercase font-mono font-bold text-slate-500">{n.delivery_provider}</span>
                      {n.fdr_number && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-gov-navy-950 font-semibold">{n.fdr_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      Mark Read
                    </button>
                  )}
                  {n.fdr_id && (
                    <Link
                      to={`/fdrs/${n.fdr_id}`}
                      className="px-3 py-1 bg-gov-navy-900 text-white text-[11px] font-bold rounded-lg hover:bg-gov-navy-800 transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span>View FDR</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

