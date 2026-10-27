import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  PlusCircle,
  FileCheck2,
  ScanEye,
  RefreshCw,
  HandCoins,
  Bell,
  History,
  BarChart3,
  Users,
  Building2,
  Settings,
  ShieldAlert,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { RoleBadge } from './Badge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { role, user } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  const isOfficerOrAdmin = role === 'AICTE_OFFICER' || role === 'ADMIN';
  const isAdmin = role === 'ADMIN';
  const isCollege = role === 'COLLEGE_USER';

  const navLinks = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['COLLEGE_USER', 'AICTE_OFFICER', 'ADMIN'],
    },
    {
      to: '/ocr-workspace',
      label: 'OCR Workspace',
      icon: ScanEye,
      roles: ['COLLEGE_USER', 'AICTE_OFFICER', 'ADMIN'],
      badge: 'Core AI',
      highlight: true,
    },
    {
      to: '/fdrs',
      label: 'FDR Repository',
      icon: FileSpreadsheet,
      roles: ['COLLEGE_USER', 'AICTE_OFFICER', 'ADMIN'],
    },
    {
      to: '/fdrs/new',
      label: 'New FDR Registration',
      icon: PlusCircle,
      roles: ['COLLEGE_USER', 'ADMIN', 'AICTE_OFFICER'],
    },
    {
      to: '/scrutiny-queue',
      label: 'Verification & Scrutiny',
      icon: FileCheck2,
      roles: ['AICTE_OFFICER', 'ADMIN'],
      badge: 'Queue',
    },
    {
      to: '/renewals',
      label: 'Renewals & Maturity',
      icon: RefreshCw,
      roles: ['COLLEGE_USER', 'AICTE_OFFICER', 'ADMIN'],
    },
    {
      to: '/releases',
      label: 'Release & Refund',
      icon: HandCoins,
      roles: ['COLLEGE_USER', 'AICTE_OFFICER', 'ADMIN'],
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      roles: ['COLLEGE_USER', 'AICTE_OFFICER', 'ADMIN'],
      count: unreadCount,
    },
    {
      to: '/reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['COLLEGE_USER', 'AICTE_OFFICER', 'ADMIN'],
    },
    {
      to: '/institutions',
      label: isCollege ? 'My Institution' : 'Institutions',
      icon: Building2,
      roles: ['COLLEGE_USER', 'AICTE_OFFICER', 'ADMIN'],
    },
    {
      to: '/audit-trail',
      label: 'Audit Trail',
      icon: History,
      roles: ['AICTE_OFFICER', 'ADMIN'],
    },
    {
      to: '/users',
      label: 'User Management',
      icon: Users,
      roles: ['ADMIN'],
    },
    {
      to: '/settings',
      label: 'Profile & Settings',
      icon: Settings,
      roles: ['COLLEGE_USER', 'AICTE_OFFICER', 'ADMIN'],
    },
  ];

  const allowedLinks = navLinks.filter(item => role && item.roles.includes(role));

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-gov-navy-950 text-white flex flex-col transition-transform duration-300 ease-in-out border-r border-gov-navy-900 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-4 flex items-center gap-3 border-b border-gov-navy-900 bg-gov-navy-900/60">
          <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm shrink-0 border border-gov-teal-500/30">
            <img src="/nidhisync-icon.png" alt="NidhiSync Logo" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 truncate">
            <div className="font-extrabold text-sm tracking-wide text-white truncate flex items-center gap-1.5">
              <span>NidhiSync</span>
              <span className="text-gov-teal-400 font-semibold text-xs">| AICTE</span>
            </div>
            <div className="text-[10px] text-gov-teal-300 font-medium truncate">by team SkyNex</div>
          </div>
        </div>

        {/* User Persona Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-gov-navy-900/70 border border-gov-navy-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Active Persona
            </span>
            <RoleBadge role={role || 'COLLEGE_USER'} />
          </div>
          <p className="text-xs font-bold text-white truncate">{user?.name || 'Authorized Official'}</p>
          <p className="text-[11px] text-slate-400 truncate">{user?.institution_name || user?.email}</p>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>
          {allowedLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose()}
                className={({ isActive: routerActive }) => {
                  const isActive = item.to === '/fdrs' && location.pathname.startsWith('/fdrs/new')
                    ? false
                    : routerActive;

                  return `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-gov-teal-600 text-white shadow-sm'
                      : item.highlight
                      ? 'bg-gov-navy-900/80 text-gov-teal-300 hover:bg-gov-navy-800 border border-gov-teal-500/20'
                      : 'text-slate-300 hover:bg-gov-navy-900 hover:text-white'
                  }`;
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-gov-teal-400/20 text-gov-teal-300 border border-gov-teal-400/30">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-gov-navy-950">
                      {item.count}
                    </span>
                  )}
                  <ChevronRight className="h-3 w-3 opacity-30 group-hover:opacity-100" />
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-gov-navy-900 text-center bg-gov-navy-900/40">
          <p className="text-[10px] text-slate-300 font-semibold">NidhiSync | AICTE</p>
          <p className="text-[9px] text-gov-teal-400 mt-0.5 font-medium">by team SkyNex • SIH 2026</p>
        </div>
      </aside>
    </>
  );
};

