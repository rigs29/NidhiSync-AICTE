import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Search,
  ExternalLink,
  Edit3,
  X,
  FileText,
  Landmark,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { Institution, FDRRecord } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { StatusBadge, MaturityBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';

export const InstitutionManagementPage: React.FC = () => {
  const { role, user } = useAuth();
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

  // Institution Profile Modal State
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [instFdrs, setInstFdrs] = useState<FDRRecord[]>([]);
  const [loadingFdrs, setLoadingFdrs] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    institution_type: '',
    address: '',
    state: '',
    contact_person: '',
    email: '',
    phone: '',
    status: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

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

  const handleOpenProfile = async (inst: Institution) => {
    setSelectedInst(inst);
    setIsEditMode(false);
    setEditSuccessMsg(null);
    setEditErrorMsg(null);
    setEditFormData({
      name: inst.name,
      institution_type: inst.institution_type,
      address: inst.address,
      state: inst.state,
      contact_person: inst.contact_person,
      email: inst.email,
      phone: inst.phone,
      status: inst.status,
    });

    // Fetch FDRs for this institution
    setLoadingFdrs(true);
    try {
      const allFdrs = await api.get<FDRRecord[]>('/fdrs?limit=100');
      const filtered = (allFdrs || []).filter(f => f.institution_id === inst.id || f.aicte_code === inst.aicte_code);
      setInstFdrs(filtered);
    } catch (err) {
      console.error('Failed to load institution FDRs:', err);
    } finally {
      setLoadingFdrs(false);
    }
  };

  const canEditInstitution = (inst: Institution) => {
    if (isAdmin) return true;
    if (role === 'COLLEGE_USER' && user?.institution_id === inst.id) return true;
    return false;
  };

  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst) return;

    setIsSavingEdit(true);
    setEditErrorMsg(null);
    setEditSuccessMsg(null);

    try {
      const payload: any = {
        address: editFormData.address.trim(),
        state: editFormData.state.trim(),
        contact_person: editFormData.contact_person.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim(),
      };

      if (isAdmin) {
        payload.name = editFormData.name.trim();
        payload.institution_type = editFormData.institution_type;
        payload.status = editFormData.status;
      }

      const updated = await api.put<Institution>(`/institutions/${selectedInst.id}`, payload);
      setSelectedInst(prev => (prev ? { ...prev, ...updated } : updated));
      setEditSuccessMsg('Institutional profile and compliance records updated successfully.');
      setIsEditMode(false);
      fetchInstitutions();
    } catch (err: any) {
      setEditErrorMsg(err.message || 'Failed to update institutional profile.');
    } finally {
      setIsSavingEdit(false);
    }
  };

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
            Directory of universities, engineering colleges, and polytechnics holding security deposits under joint council lien. Click any institution to inspect its full profile and registered FDR portfolio.
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
              onClick={() => handleOpenProfile(inst)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-gov-teal-400 transition-all cursor-pointer space-y-4 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gov-navy-950 group-hover:text-gov-teal-700 transition-colors">
                    {inst.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-gov-teal-800 bg-gov-teal-50 px-2 py-0.5 rounded border border-gov-teal-200">
                      AICTE: {inst.aicte_code}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {inst.institution_type}
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
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

              <div className="pt-1 flex items-center justify-end text-[11px] font-bold text-gov-teal-700 group-hover:translate-x-0.5 transition-transform">
                <span>View Complete Profile & Portfolio →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complete Institution Profile Modal */}
      {selectedInst && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInst(null)}
          title={`Institution Profile: ${selectedInst.name}`}
          subtitle={`AICTE Permanent Code: ${selectedInst.aicte_code} • ${selectedInst.state}`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Alerts */}
            {editSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{editSuccessMsg}</span>
              </div>
            )}
            {editErrorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{editErrorMsg}</span>
              </div>
            )}

            {/* Top KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">AICTE ID</span>
                <span className="text-xs font-mono font-bold text-gov-navy-950">{selectedInst.aicte_code}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Compliance</span>
                <span className="text-xs font-bold text-emerald-700">{selectedInst.status}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Lien Instruments</span>
                <span className="text-xs font-bold text-gov-navy-950">{selectedInst.fdr_count || instFdrs.length} Active FDRs</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Lien Sum</span>
                <span className="text-xs font-mono font-bold text-gov-teal-700">
                  ₹{(selectedInst.total_fdr_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Profile Content / Edit Form */}
            {isEditMode ? (
              <form onSubmit={handleSaveProfileEdit} className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-700">Edit Permitted Profile Details</span>
                  <span className="text-[10px] text-slate-400">Updates are logged to immutable audit trail</span>
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Institution Legal Name</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Campus Address *</label>
                    <input
                      type="text"
                      value={editFormData.address}
                      onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">State / Union Territory *</label>
                    <input
                      type="text"
                      value={editFormData.state}
                      onChange={e => setEditFormData({ ...editFormData, state: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person / Head *</label>
                    <input
                      type="text"
                      value={editFormData.contact_person}
                      onChange={e => setEditFormData({ ...editFormData, contact_person: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Official Email *</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-gov-navy-900 text-white hover:bg-gov-navy-800 shadow-sm disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Official Contact & Address</span>
                  {canEditInstitution(selectedInst) && (
                    <button
                      type="button"
                      onClick={() => setIsEditMode(true)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors"
                    >
                      <Edit3 className="h-3 w-3 text-gov-teal-600" />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Campus Address</span>
                    <span className="font-semibold text-slate-900">{selectedInst.address}, {selectedInst.state}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Institution Type</span>
                    <span className="font-semibold text-slate-900">{selectedInst.institution_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Authorized Signatory</span>
                    <span className="font-semibold text-slate-900">{selectedInst.contact_person}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Direct Communication</span>
                    <span className="font-semibold text-slate-900">{selectedInst.email} • {selectedInst.phone}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Registered Security Deposit FDRs Table */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-gov-navy-900" />
                  <span>Registered Fixed Deposit Receipts ({instFdrs.length})</span>
                </h4>
                <Link
                  to={`/fdrs/new`}
                  className="text-xs font-bold text-gov-teal-700 hover:underline flex items-center gap-1"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Add New FDR</span>
                </Link>
              </div>

              {loadingFdrs ? (
                <div className="p-6 text-center text-xs text-slate-500">Loading FDR instruments...</div>
              ) : instFdrs.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 italic">
                  No FDR records registered under this institution yet.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-600 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">FDR Number</th>
                        <th className="py-2.5 px-3">Bank Name</th>
                        <th className="py-2.5 px-3">Amount (INR)</th>
                        <th className="py-2.5 px-3">Maturity Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {instFdrs.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-gov-navy-950">
                            {f.fdr_number}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {f.bank_name}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            ₹{f.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {f.maturity_date ? f.maturity_date.split('T')[0] : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={f.administrative_status} size="sm" />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              to={`/fdrs/${f.id}`}
                              className="text-[11px] font-bold text-gov-teal-700 hover:underline"
                            >
                              Inspect →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedInst(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Close Profile
              </button>
            </div>
          </div>
        </Modal>
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
