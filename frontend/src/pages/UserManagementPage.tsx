import React, { useState, useEffect } from 'react';
import {
  Users,
  PlusCircle,
  Building2,
  ShieldCheck,
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { User, Institution } from '../types';
import { RoleBadge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Demo@12345');
  const [role, setRole] = useState<'COLLEGE_USER' | 'AICTE_OFFICER' | 'ADMIN'>('COLLEGE_USER');
  const [institutionId, setInstitutionId] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const [uList, iList] = await Promise.all([
        api.get<User[]>('/users'),
        api.get<Institution[]>('/institutions'),
      ]);
      setUsers(uList || []);
      setInstitutions(iList || []);
    } catch (err) {
      console.error('Failed to load user management data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Please complete all mandatory user fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post('/users', {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
        institution_id: role === 'COLLEGE_USER' && institutionId ? Number(institutionId) : null,
      });

      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('Demo@12345');
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: number) => {
    try {
      await api.put(`/users/${userId}/status`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gov-navy-800 uppercase tracking-wider mb-1">
            <Users className="h-4 w-4 text-gov-teal-600" />
            <span>AICTE Identity & Access Governance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
            User Accounts & Role Permissions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Provision authorized accounts for College Institutional Officers, AICTE Scrutiny Officers, and System Administrators.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Provision New User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gov-navy-900" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Active Official User Accounts ({users.length})
            </h3>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Retrieving authorized user registry..." />
        ) : users.length === 0 ? (
          <EmptyState
            title="No Users Registered"
            description="No user accounts found."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Official Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Authorized Role</th>
                  <th className="py-3 px-4">Assigned Institution</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Access Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-gov-navy-50 text-gov-navy-900 flex items-center justify-center font-bold text-[11px]">
                        {u.name.charAt(0)}
                      </div>
                      <span>{u.name}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {u.email}
                    </td>

                    <td className="py-3.5 px-4">
                      <RoleBadge role={u.role} />
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {u.institution_name || <span className="text-slate-400 italic">None (AICTE Central)</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                      }`}>
                        {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        className="text-xs font-bold text-gov-navy-900 hover:text-red-600 transition-colors"
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Provision Authorized Official User Account"
        subtitle="Configure role-based access control permissions"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Official Full Name & Title *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dr. Ramesh Sharma (Principal)"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Official Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="officer@domain.gov.in"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Temporary Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Authorized System Role *
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
            >
              <option value="COLLEGE_USER">College Institutional Officer</option>
              <option value="AICTE_OFFICER">AICTE Scrutiny & Verification Officer</option>
              <option value="ADMIN">System Administrator</option>
            </select>
          </div>

          {role === 'COLLEGE_USER' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Link to Technical Institution *
              </label>
              <select
                value={institutionId}
                onChange={e => setInstitutionId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              >
                <option value="">-- Choose Institution --</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.aicte_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Provision User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

