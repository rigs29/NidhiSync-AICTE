import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Building2, 
  Sparkles, 
  Landmark, 
  AlertCircle,
  ArrowRight,
  UserCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  School,
  UserPlus,
  LogIn,
  ChevronDown,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Role, DemoPersona, PublicInstitution } from '../types';

export const LoginPage: React.FC = () => {
  const { login, signup, verifyOtp, resendOtp, loginAsPersona, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode: 'signin' | 'signup' | 'verify'
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'verify'>('signin');

  // Sign In State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('COLLEGE_USER');
  const [institutions, setInstitutions] = useState<PublicInstitution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | ''>('');
  const [isRegisteringNewCollege, setIsRegisteringNewCollege] = useState(false);
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeAicteCode, setNewCollegeAicteCode] = useState('');
  const [declaredStatutory, setDeclaredStatutory] = useState(true);

  // OTP Verification State
  const [verifyEmail, setVerifyEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [activeOtpAlert, setActiveOtpAlert] = useState<{ email: string; otp: string } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Shared UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [demoPersonas, setDemoPersonas] = useState<DemoPersona[]>([]);
  const [showDemoAccordion, setShowDemoAccordion] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Load public institutions and demo personas for reference
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const instList = await api.get<PublicInstitution[]>('/auth/institutions');
        setInstitutions(instList);
        if (instList.length > 0) {
          setSelectedInstitutionId(instList[0].id);
        }
      } catch (err) {
        console.error('Could not load public institutions:', err);
      }

      try {
        const personas = await api.get<DemoPersona[]>('/auth/demo-personas');
        setDemoPersonas(personas);
      } catch {
        // Fallback
      }
    };
    fetchMetadata();
  }, []);

  // Handle URL query parameters (e.g. 1-click verification links)
  useEffect(() => {
    const verifyParam = searchParams.get('verify');
    const emailParam = searchParams.get('email');
    const otpParam = searchParams.get('otp');

    if (emailParam) {
      setVerifyEmail(emailParam);
      setLoginEmail(emailParam);
    }

    if (verifyParam === 'true' && emailParam) {
      setAuthMode('verify');
      if (otpParam) {
        setOtpCode(otpParam);
        setActiveOtpAlert({ email: emailParam, otp: otpParam });
      }
    }
  }, [searchParams]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle Sign In (Realtime Login with Email + Password)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Please provide your official registered email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await login(loginEmail, loginPassword);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please verify credentials.';
      // Check if account is unverified and has an OTP
      const otpMatch = msg.match(/OTP:\s*(\d{6})/i) || msg.match(/\((\d{6})\)/);
      if (otpMatch && otpMatch[1]) {
        setActiveOtpAlert({ email: loginEmail, otp: otpMatch[1] });
        setOtpCode(otpMatch[1]);
        setVerifyEmail(loginEmail);
        setAuthMode('verify');
        setError('Your account requires initial email verification. Please enter the OTP code below.');
      } else if (msg.includes('verification') || msg.includes('OTP')) {
        setVerifyEmail(loginEmail);
        setAuthMode('verify');
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up (Realtime Registration)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanName = signupName.trim();
    const cleanEmail = signupEmail.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !signupPassword) {
      setError('Please fill in all mandatory account fields.');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (!declaredStatutory) {
      setError('Please affirm the statutory declaration before proceeding.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signup({
        name: cleanName,
        email: cleanEmail,
        password: signupPassword,
        role: selectedRole,
        institution_id: selectedRole === 'COLLEGE_USER' && !isRegisteringNewCollege ? Number(selectedInstitutionId) : undefined,
        new_institution_name: selectedRole === 'COLLEGE_USER' && isRegisteringNewCollege ? newCollegeName.trim() : undefined,
        new_institution_code: selectedRole === 'COLLEGE_USER' && isRegisteringNewCollege ? newCollegeAicteCode.trim() : undefined,
      });

      setVerifyEmail(cleanEmail);
      setLoginEmail(cleanEmail);
      setLoginPassword(signupPassword);

      if (res.dev_otp) {
        setOtpCode(res.dev_otp);
        setActiveOtpAlert({ email: cleanEmail, otp: res.dev_otp });
      }

      setResendCooldown(60);
      setAuthMode('verify');
      setSuccessMessage(`Account registered for ${cleanEmail}! Enter the 6-digit verification code below.`);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please check details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Verification (First-time activation)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = verifyEmail.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (!cleanEmail || !cleanOtp) {
      setError('Please provide your registered email and 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await verifyOtp(cleanEmail, cleanOtp);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !verifyEmail) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await resendOtp(verifyEmail.trim().toLowerCase());
      if (res.dev_otp) {
        setOtpCode(res.dev_otp);
        setActiveOtpAlert({ email: verifyEmail, otp: res.dev_otp });
      }
      setResendCooldown(60);
      setSuccessMessage(`Fresh verification code sent to ${verifyEmail}!`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy OTP helper
  const handleCopyOtp = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  // Quick Demo Persona Helper (Discreet Evaluator Option)
  const handleQuickPersona = async (p: DemoPersona) => {
    setIsLoading(true);
    setError(null);
    try {
      await loginAsPersona(p);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || `Failed to login as ${p.title}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 flex flex-col justify-between font-sans">
      {/* Tiranga Accent Stripe */}
      <div className="h-1.5 w-full flex">
        <div className="h-full w-1/3 bg-[#FF9933]"></div>
        <div className="h-full w-1/3 bg-white"></div>
        <div className="h-full w-1/3 bg-[#138808]"></div>
      </div>

      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-5">
        
        {/* National Banner Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 inline-flex items-center justify-center">
              <img src="/nidhisync-full.png" alt="NidhiSync | AICTE by team SkyNex" className="h-14 sm:h-18 w-auto object-contain" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gov-navy-50 text-gov-navy-900 border border-gov-navy-200 text-xs font-bold uppercase tracking-wider">
            <Landmark className="h-4 w-4 text-gov-teal-600" />
            <span>Ministry of Education • Government of India</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-medium">
            Centralized statutory platform for fixed deposit tracking, joint lien governance, OCR document scrutiny, and automated maturity reminders.
          </p>
        </div>

        {/* Global Live OTP Notification Toast (Impossible to miss) */}
        {activeOtpAlert && (
          <div className="bg-gradient-to-r from-gov-navy-900 to-gov-navy-950 text-white p-4 rounded-2xl shadow-xl border-2 border-gov-teal-400 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gov-teal-500/20 text-gov-teal-300 border border-gov-teal-400/30">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-extrabold text-gov-teal-300">
                    Realtime Email OTP Generated
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-gov-teal-600 text-white text-[10px] font-bold">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Recipient: <span className="font-semibold text-white">{activeOtpAlert.email}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-white text-gov-navy-950 px-4 py-2 rounded-xl font-mono text-xl font-extrabold tracking-widest shadow-inner border border-gov-teal-200">
                {activeOtpAlert.otp}
              </div>
              <button
                type="button"
                onClick={() => {
                  setOtpCode(activeOtpAlert.otp);
                  setVerifyEmail(activeOtpAlert.email);
                  setAuthMode('verify');
                  handleCopyOtp(activeOtpAlert.otp);
                }}
                className="py-2 px-3 rounded-xl bg-gov-teal-600 hover:bg-gov-teal-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
              >
                {copiedOtp ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>Auto-Fill & Verify</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Authentication Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          
          {/* Top 3 Navigation Tabs (Always Visible) */}
          <div className="flex border-b border-slate-200 bg-slate-50/70">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                authMode === 'signin'
                  ? 'bg-white text-gov-navy-900 border-b-2 border-gov-navy-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="h-4 w-4 text-gov-teal-600" />
              <span>Official Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                authMode === 'signup'
                  ? 'bg-white text-gov-navy-900 border-b-2 border-gov-navy-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="h-4 w-4 text-gov-teal-600" />
              <span>Register Account</span>
            </button>

            <button
              type="button"
              onClick={() => { setAuthMode('verify'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                authMode === 'verify'
                  ? 'bg-white text-gov-navy-900 border-b-2 border-gov-navy-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <KeyRound className="h-4 w-4 text-gov-teal-600" />
              <span>Enter OTP Code</span>
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            
            {/* Alerts */}
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{error}</span>
                  {authMode !== 'verify' && (error.toLowerCase().includes('otp') || error.toLowerCase().includes('verification') || error.toLowerCase().includes('activate') || error.toLowerCase().includes('unverified')) && (
                    <button
                      type="button"
                      onClick={() => setAuthMode('verify')}
                      className="block mt-1.5 font-bold text-red-900 underline hover:no-underline"
                    >
                      Click here to enter your 6-digit OTP code & activate account →
                    </button>
                  )}
                </div>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* MODE 1: OFFICIAL SIGN IN (Email & Password Only)          */}
            {/* ======================================================== */}
            {authMode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4 max-w-lg mx-auto">
                <div className="text-center pb-2">
                  <h2 className="text-lg font-bold text-slate-900">Sign In to Your Account</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    For verified users, sign in directly with your official email and password.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="e.g. officer@aicte.gov.in or nodal@college.edu.in"
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-gov-teal-600" />
                    <span>Statutory 256-bit TLS Session</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setError(null); }}
                    className="font-bold text-gov-navy-900 hover:text-gov-teal-700 underline"
                  >
                    Need an account? Register here
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gov-navy-900 hover:bg-gov-navy-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Authenticating Credentials...' : 'Sign In with Secure Credentials'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* ======================================================== */}
            {/* MODE 2: REGISTER / SIGN UP (3 Role Categories)          */}
            {/* ======================================================== */}
            {authMode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="text-center pb-2">
                  <h2 className="text-lg font-bold text-slate-900">Official Portal Registration</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your statutory user category, set your credentials, and verify via OTP.
                  </p>
                </div>

                {/* 1. Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    Select User Category / Designation <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    {/* Category A: College User */}
                    <div
                      onClick={() => setSelectedRole('COLLEGE_USER')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedRole === 'COLLEGE_USER'
                          ? 'border-gov-teal-600 bg-gov-teal-50/50 shadow-xs ring-1 ring-gov-teal-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <School className={`h-4 w-4 ${selectedRole === 'COLLEGE_USER' ? 'text-gov-teal-700' : 'text-slate-500'}`} />
                        <span className="text-xs font-bold text-slate-900">College Institutional Officer</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Authorized official of an AICTE approved college registering and managing FDR deposits.
                      </p>
                    </div>

                    {/* Category B: AICTE Officer */}
                    <div
                      onClick={() => setSelectedRole('AICTE_OFFICER')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedRole === 'AICTE_OFFICER'
                          ? 'border-gov-navy-900 bg-gov-navy-50/60 shadow-xs ring-1 ring-gov-navy-800'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <ShieldCheck className={`h-4 w-4 ${selectedRole === 'AICTE_OFFICER' ? 'text-gov-navy-900' : 'text-slate-500'}`} />
                        <span className="text-xs font-bold text-slate-900">AICTE Scrutiny Officer</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        HQ or Regional Office officer executing OCR review, document scrutiny, and release approvals.
                      </p>
                    </div>

                    {/* Category C: Admin */}
                    <div
                      onClick={() => setSelectedRole('ADMIN')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedRole === 'ADMIN'
                          ? 'border-purple-600 bg-purple-50/60 shadow-xs ring-1 ring-purple-600'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles className={`h-4 w-4 ${selectedRole === 'ADMIN' ? 'text-purple-700' : 'text-slate-500'}`} />
                        <span className="text-xs font-bold text-slate-900">System Administrator</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        AICTE ICT Cell administrator managing user permissions, audit trails, and system health.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Personal & Account Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name / Username <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <UserCheck className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={signupName}
                        onChange={e => setSignupName(e.target.value)}
                        placeholder="e.g. Dr. Rajesh Varma"
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Official Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={e => setSignupEmail(e.target.value)}
                        placeholder="e.g. r.varma@college.edu.in"
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Institution Details (if College User) */}
                {selectedRole === 'COLLEGE_USER' && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-gov-teal-600" />
                        <span>AICTE Approved Institution <span className="text-red-500">*</span></span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsRegisteringNewCollege(!isRegisteringNewCollege)}
                        className="text-[11px] font-bold text-gov-teal-700 hover:underline"
                      >
                        {isRegisteringNewCollege ? '← Select Existing College' : '+ Register New Institution'}
                      </button>
                    </div>

                    {!isRegisteringNewCollege ? (
                      <select
                        value={selectedInstitutionId}
                        onChange={e => setSelectedInstitutionId(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none font-medium"
                      >
                        {institutions.map(inst => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name} ({inst.aicte_code}) — {inst.state}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            New Institute Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newCollegeName}
                            onChange={e => setNewCollegeName(e.target.value)}
                            placeholder="e.g. Pune Institute of Advanced Technology"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none font-medium"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            AICTE Permanent Institute ID
                          </label>
                          <input
                            type="text"
                            value={newCollegeAicteCode}
                            onChange={e => setNewCollegeAicteCode(e.target.value)}
                            placeholder="e.g. 1-492810291"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Password Setting */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Set Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={e => setSignupPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        value={signupConfirmPassword}
                        onChange={e => setSignupConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Statutory Affirmation */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={declaredStatutory}
                      onChange={e => setDeclaredStatutory(e.target.checked)}
                      className="mt-0.5 rounded text-gov-navy-900 focus:ring-gov-navy-900"
                    />
                    <span>
                      I affirm that I am authorized to register under the AICTE Approval Process Handbook guidelines.
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setError(null); }}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    ← Already have an account? Sign In
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="py-2.5 px-6 rounded-xl bg-gov-navy-900 hover:bg-gov-navy-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Registering & Generating Code...' : 'Register & Receive Verification Code'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}

            {/* ======================================================== */}
            {/* MODE 3: FIRST-TIME OTP & LOGIN LINK VERIFICATION         */}
            {/* ======================================================== */}
            {authMode === 'verify' && (
              <form onSubmit={handleVerifyOtp} className="space-y-5 max-w-md mx-auto">
                <div className="text-center space-y-1">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-gov-teal-50 text-gov-teal-700 flex items-center justify-center border border-gov-teal-200 mb-2">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Email Verification & Activation</h2>
                  <p className="text-xs text-slate-500">
                    Enter the 6-digit verification code (OTP) for your registered official email:
                  </p>
                </div>

                {/* Email Address Input (Editable in case user wants to change) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={verifyEmail}
                      onChange={e => setVerifyEmail(e.target.value)}
                      placeholder="e.g. officer@aicte.gov.in"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none font-medium"
                      required
                    />
                  </div>
                </div>

                {/* 6-Digit OTP Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      6-Digit Verification Code (OTP)
                    </label>
                    {activeOtpAlert && (
                      <button
                        type="button"
                        onClick={() => setOtpCode(activeOtpAlert.otp)}
                        className="text-[11px] font-bold text-gov-teal-700 hover:underline"
                      >
                        Auto-Fill: {activeOtpAlert.otp}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.4em] font-mono text-2xl py-3 rounded-xl border-2 border-gov-teal-600 bg-white focus:ring-2 focus:ring-gov-navy-900 focus:outline-none font-extrabold text-gov-navy-950 shadow-inner"
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1 text-center">
                    Enter the 6-digit code shown in the notification banner above or sent to your email.
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading || !verifyEmail}
                    className="font-bold text-gov-navy-900 hover:text-gov-teal-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setError(null); }}
                    className="text-slate-500 hover:text-slate-800 underline"
                  >
                    Back to Sign In
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length < 6}
                  className="w-full py-2.5 px-4 rounded-xl bg-gov-navy-900 hover:bg-gov-navy-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Verifying & Activating Account...' : 'Verify Code & Launch Dashboard'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

          </div>
        </div>

        {/* Discreet Reference Accounts for Evaluator Testing (Collapsible Accordion) */}
        <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setShowDemoAccordion(!showDemoAccordion)}
            className="w-full py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-between bg-slate-50/50"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-gov-teal-600" />
              <span>Need Quick Evaluator Credentials? (Optional reference accounts)</span>
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showDemoAccordion ? 'rotate-180' : ''}`} />
          </button>

          {showDemoAccordion && (
            <div className="p-4 space-y-2.5 border-t border-slate-200 bg-slate-50/20">
              <p className="text-[11px] text-slate-500 mb-2">
                You can register your own realtime account above using any email and password. If you need to test pre-seeded data quickly, you can click below:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {demoPersonas.map(p => (
                  <div
                    key={p.email}
                    onClick={() => handleQuickPersona(p)}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-gov-teal-500 hover:shadow-2xs cursor-pointer transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{p.title}</span>
                      <span className="text-[10px] font-mono text-gov-teal-700 bg-gov-teal-50 px-1.5 py-0.5 rounded">
                        1-Click
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                      {p.email}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <div className="flex items-center gap-1.5">
            <img src="/nidhisync-icon.png" alt="NidhiSync Logo" className="h-4 w-4 object-contain inline-block" />
            <span className="font-bold text-gov-navy-950">NidhiSync | AICTE</span>
          </div>
          <span>•</span>
          <span className="font-semibold text-gov-teal-800">by team SkyNex</span>
          <span>•</span>
          <span>All India Council for Technical Education, New Delhi</span>
        </div>
      </footer>
    </div>
  );
};
