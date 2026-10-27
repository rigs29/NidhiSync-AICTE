import React, { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Landmark,
  Sparkles,
  ChevronDown,
  LayoutDashboard,
  FileSpreadsheet,
  PlusCircle,
  FileCheck2,
  ScanEye,
  RefreshCw,
  HandCoins,
  History,
  BarChart3,
  Users,
  Building2,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { RoleBadge } from '../common/Badge';

export interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  // 1. Desktop Sidebar Collapse/Expand Toggle state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const { role, user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const isCollege = role === 'COLLEGE_USER';
  const recentNotifications = notifications.slice(0, 5);

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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 1. Desktop Sidebar with Collapse/Expand Transition (w-64 <-> w-20) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-gov-navy-950 text-white flex flex-col transition-all duration-300 ease-in-out border-r border-gov-navy-900 ${
          mobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Sidebar Header with Collapse Toggle Button */}
        <div className="h-16 px-3 flex items-center border-b border-gov-navy-900 bg-gov-navy-900/60 shrink-0">
          {isCollapsed ? (
            // Collapsed Header View (Centered Emblem + Expand Button)
            <div className="w-full flex items-center justify-between px-1">
              <div
                className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm shrink-0 border border-gov-teal-500/30"
                title="NidhiSync | AICTE by team SkyNex"
              >
                <img src="/nidhisync-icon.png" alt="NidhiSync Logo" className="h-full w-full object-contain" />
              </div>
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-gov-navy-800 transition-colors shrink-0"
                title="Expand Sidebar (w-64)"
                aria-label="Expand Sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            // Expanded Header View (Brand + Collapse Button)
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
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
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-gov-navy-800 transition-colors shrink-0"
                title="Collapse Sidebar (w-20)"
                aria-label="Collapse Sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* User Persona Section */}
        {!isCollapsed ? (
          <div className="p-3 mx-3 my-3 rounded-xl bg-gov-navy-900/70 border border-gov-navy-800 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Active Persona
              </span>
              <RoleBadge role={role || 'COLLEGE_USER'} />
            </div>
            <p className="text-xs font-bold text-white truncate">{user?.name || 'Authorized Official'}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.institution_name || user?.email}</p>
          </div>
        ) : (
          <div 
            className="p-2 mx-2 my-3 rounded-xl bg-gov-navy-900/70 border border-gov-navy-800 flex flex-col items-center justify-center text-center group relative cursor-pointer shrink-0"
            title={`${user?.name || 'Official'} (${role || 'COLLEGE_USER'}) - ${user?.institution_name || user?.email}`}
          >
            <div className="h-8 w-8 rounded-lg bg-gov-teal-700 text-white font-bold text-xs flex items-center justify-center">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gov-navy-900 text-white text-[11px] rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-gov-navy-700">
              <p className="font-bold">{user?.name}</p>
              <p className="text-slate-400 text-[10px]">{user?.role}</p>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {!isCollapsed && (
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigation Menu
            </div>
          )}

          {allowedLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileSidebarOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive: routerActive }) => {
                  const isActive = item.to === '/fdrs' && location.pathname.startsWith('/fdrs/new')
                    ? false
                    : routerActive;

                  return `flex items-center rounded-xl text-xs font-semibold transition-all group relative ${
                    isCollapsed 
                      ? 'justify-center p-2.5' 
                      : 'justify-between px-3 py-2'
                  } ${
                    isActive
                      ? 'bg-gov-teal-600 text-white shadow-sm'
                      : item.highlight
                      ? 'bg-gov-navy-900/80 text-gov-teal-300 hover:bg-gov-navy-800 border border-gov-teal-500/20'
                      : 'text-slate-300 hover:bg-gov-navy-900 hover:text-white'
                  }`;
                }}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                  <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1.5 shrink-0">
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
                )}

                {/* Hover Tooltip when Sidebar is Collapsed */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gov-navy-900 text-white text-xs font-medium rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap border border-gov-navy-700 flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-gov-teal-400/20 text-gov-teal-300">
                        {item.badge}
                      </span>
                    )}
                    {item.count !== undefined && item.count > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-gov-navy-950">
                        {item.count}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gov-navy-900 text-center bg-gov-navy-900/40 shrink-0">
          {!isCollapsed ? (
            <>
              <p className="text-[10px] text-slate-300 font-bold">NidhiSync | AICTE</p>
              <p className="text-[9px] text-gov-teal-400 mt-0.5 font-medium">by team SkyNex • SIH 2026</p>
            </>
          ) : (
            <p className="text-[9px] text-slate-500 font-mono">v2.0</p>
          )}
        </div>
      </aside>

      {/* Main Workspace Column - Header + Content + Footer (Dynamic Left Offset matching Sidebar) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* 2. Top Header Container Layout - refactored with flex flex-wrap sm:flex-nowrap items-center justify-between, min-w-0, truncate */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
          {/* National Tiranga Accent Stripe */}
          <div className="h-1 w-full flex shrink-0">
            <div className="h-full w-1/3 bg-[#FF9933]" />
            <div className="h-full w-1/3 bg-white" />
            <div className="h-full w-1/3 bg-[#138808]" />
          </div>

          {/* Refactored Header Container */}
          <div className="px-4 sm:px-6 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 min-w-0">
            {/* Left Section: Mobile toggle, Gov Emblem, Portal Title, Breadcrumbs, Institution */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              {/* Mobile Sidebar Hamburger */}
              <button
                onClick={() => setMobileSidebarOpen(prev => !prev)}
                className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                aria-label="Toggle Mobile Navigation Menu"
              >
                {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              {/* NidhiSync Logo Emblem */}
              <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs shrink-0 ring-1 ring-gov-navy-900/10 border border-slate-200">
                <img src="/nidhisync-icon.png" alt="NidhiSync Logo" className="h-full w-full object-contain" />
              </div>

              {/* Title, Compliance Badge & Dynamic Breadcrumbs */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-extrabold text-xs sm:text-sm text-gov-navy-950 uppercase tracking-tight truncate">
                    NidhiSync <span className="text-gov-teal-700">| AICTE</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gov-teal-50 text-gov-teal-900 border border-gov-teal-200 shrink-0">
                    <ShieldCheck className="h-3 w-3 text-gov-teal-600" />
                    by team SkyNex
                  </span>
                </div>

                {/* Breadcrumb line & Institution details */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium min-w-0 mt-0.5">
                  <span className="text-gov-teal-700 font-semibold uppercase tracking-wider text-[10px] shrink-0">
                    Secured Portal
                  </span>
                  <span className="text-slate-300 shrink-0">•</span>
                  <span className="text-slate-600 truncate">
                    {role === 'COLLEGE_USER' && (user?.institution_name || 'College Workspace')}
                    {role === 'AICTE_OFFICER' && 'AICTE Scrutiny & Verification Officer Panel'}
                    {role === 'ADMIN' && 'Central Administration Desk'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Section: Data-mode Toggle, Notifications & Profile Badge */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* AI OCR Workspace Quick Shortcut / Data-mode Toggle */}
              <Link
                to="/ocr-workspace"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gov-teal-50 text-gov-teal-800 border border-gov-teal-200 hover:bg-gov-teal-100 transition-colors shadow-2xs shrink-0"
                title="Open AI OCR Processing Workspace"
              >
                <Sparkles className="h-3.5 w-3.5 text-gov-teal-600 shrink-0" />
                <span className="truncate">AI OCR Workspace</span>
              </Link>

              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl text-slate-600 hover:text-gov-navy-900 hover:bg-slate-100 transition-colors"
                  title="Notifications"
                  aria-label="View notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div 
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllAsRead()}
                          className="text-[11px] font-semibold text-gov-teal-700 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {recentNotifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          No notifications yet
                        </div>
                      ) : (
                        recentNotifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markAsRead(n.id);
                              if (n.fdr_id) navigate(`/fdrs/${n.fdr_id}`);
                              setShowNotifications(false);
                            }}
                            className={`p-3.5 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                              !n.is_read ? 'bg-blue-50/40 font-medium' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-slate-800 truncate">{n.subject}</p>
                              {!n.is_read && (
                                <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1.5 block">
                              {new Date(n.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="px-4 pt-2 border-t border-slate-100 text-center">
                      <Link
                        to="/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="text-xs font-bold text-gov-navy-900 hover:text-gov-teal-700 transition-colors"
                      >
                        View All Notifications →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Badge & Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left min-w-0"
                  aria-label="User profile menu"
                >
                  <div className="h-8 w-8 rounded-lg bg-gov-navy-900 text-gov-teal-300 font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden md:block min-w-0 max-w-[140px] lg:max-w-[180px]">
                    <div className="text-xs font-bold text-slate-800 leading-tight truncate">{user?.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{user?.institution_name || user?.role}</div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block shrink-0" />
                </button>

                {showProfileMenu && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                      <div className="mt-1.5">
                        <RoleBadge role={role || 'COLLEGE_USER'} />
                      </div>
                    </div>

                    <Link
                      to="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <UserIcon className="h-4 w-4 text-slate-500" />
                      <span>Profile & Security</span>
                    </Link>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out Session</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children ?? <Outlet />}
        </main>

        {/* Official Footer */}
        <footer className="py-4 px-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <img src="/nidhisync-icon.png" alt="NidhiSync Logo" className="h-4 w-4 object-contain inline-block" />
              <span className="font-bold text-gov-navy-950">NidhiSync | AICTE</span>
              <span className="hidden sm:inline text-slate-400">— Centralized Statutory Security Deposit & FDR Management</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="font-bold text-gov-teal-800">by team SkyNex</span>
              <span>•</span>
              <span>© 2026 AICTE, New Delhi</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AppShell;
