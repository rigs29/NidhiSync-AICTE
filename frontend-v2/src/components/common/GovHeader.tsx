import React from 'react';
import { ShieldCheck, Landmark } from 'lucide-react';

export const GovHeader: React.FC = () => {
  return (
    <div className="w-full bg-white border-b border-slate-200">
      {/* Tiranga Accent Stripe */}
      <div className="h-1 w-full flex">
        <div className="h-full w-1/3 bg-[#FF9933]"></div>
        <div className="h-full w-1/3 bg-white"></div>
        <div className="h-full w-1/3 bg-[#138808]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs border border-slate-200 shrink-0">
            <img src="/nidhisync-icon.png" alt="NidhiSync Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-gov-navy-950 uppercase">
                NidhiSync <span className="text-gov-teal-700">| AICTE</span>
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gov-teal-50 text-gov-teal-900 border border-gov-teal-200">
                <ShieldCheck className="h-3 w-3 text-gov-teal-600" />
                by team SkyNex
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Ministry of Education, Government of India • Central Statutory Compliance Repository
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-right">
          <div className="text-xs">
            <div className="font-semibold text-slate-800">Joint Lien Security Docket</div>
            <div className="text-[10px] text-slate-500">Regulated under AICTE Approval Process Handbook</div>
          </div>
        </div>
      </div>
    </div>
  );
};

