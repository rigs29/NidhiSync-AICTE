import React, { useState, useEffect } from 'react';
import {
  Building2,
  PlusCircle,
  MapPin,
  Phone,
  Mail,
  FileSpreadsheet,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Search
} from 'lucide-react';
import { api } from '../services/api';
import { Institution } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

export const InstitutionManagementPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Institution Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [aicteCode, setAicteCode] = useState('');
  const [institutionType, setInstitutionType] = useState('Engineering & Technology');
  const [address, setAddress] = useState('');
  const [stateName, setStateName] = useState('Delhi');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchInstitutions = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Institution[]>('/institutions');
      setInstitutions(data || []);
    } catch (err) {
      console.error('Failed to load institutions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !aicteCode.trim() || !email.trim()) {
      setErrorMsg('Please complete all mandatory institution fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post('/institutions', {
        name: name.trim(),
        aicte_code: aicteCode.trim(),
        institution_type: institutionType,
        address: address.trim(),
        state: stateName,
        contact_person: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      setIsModalOpen(false);
      setName('');
      setAicteCode('');
      setAddress('');
      setEmail('');
      setPhone('');
      fetchInstitutions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register technical institution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = institutions.filter(i => {
    const q = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      i.aicte_code.toLowerCase().includes(q) ||
      i.state.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gov-navy-800 uppercase tracking-wider mb-1">
            <Building2 className="h-4 w-4 text-gov-teal-600" />
            <span>AICTE Approval Portal Registry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gov-navy-950">
            Approved Technical Institutions & Deposit Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Directory of universities, engineering colleges, and polytechnics holding security deposits under joint council lien.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gov-navy-900 text-white hover:bg-gov-navy-800 transition-colors shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Register Institution</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Institution Name, Permanent AICTE Code, or State..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-gov-navy-900"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <LoadingSpinner message="Querying approved technical institutions..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Institutions Found"
          description="No approved technical institutions match your search."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(inst => (
            <div
              key={inst.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gov-navy-950">{inst.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-gov-teal-800 bg-gov-teal-50 px-2 py-0.5 rounded border border-gov-teal-200">
                      AICTE: {inst.aicte_code}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {inst.institution_type}
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {inst.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{inst.address}, {inst.state}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{inst.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{inst.phone} • {inst.contact_person}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Active FDRs</span>
                  <span className="font-bold text-slate-800 font-mono text-sm">{inst.fdr_count || 0} Instruments</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Lien Deposit Sum</span>
                  <span className="font-bold text-gov-navy-950 font-mono text-sm">
                    ₹{(inst.total_fdr_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Institution Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Approved Technical Institution"
        subtitle="Mandatory details under AICTE Approval Process Handbook"
      >
        <form onSubmit={handleCreateInstitution} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Institution Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Pune Institute of Advanced Technology"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                AICTE Permanent Code *
              </label>
              <input
                type="text"
                value={aicteCode}
                onChange={e => setAicteCode(e.target.value)}
                placeholder="e.g. 1-49201928"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Institution Type *
              </label>
              <select
                value={institutionType}
                onChange={e => setInstitutionType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
              >
                <option value="Engineering & Technology">Engineering & Technology</option>
                <option value="Polytechnic Diploma">Polytechnic Diploma</option>
                <option value="Autonomous Technical Institution">Autonomous Technical Institution</option>
                <option value="Management & Pharmacy Campus">Management & Pharmacy Campus</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Official Campus Address *
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Street, locality, postal code"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                State / Union Territory *
              </label>
              <input
                type="text"
                value={stateName}
                onChange={e => setStateName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Person / Principal *
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                placeholder="Dr. Name"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contact@college.edu.in"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91-..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-gov-navy-900 focus:outline-none"
                required
              />
            </div>
          </div>

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
              {isSubmitting ? 'Registering...' : 'Register Technical Institution'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

