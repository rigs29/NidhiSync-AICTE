import React from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string; fullPage?: boolean }> = ({
  message = 'Loading AICTE records...',
  fullPage = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-gov-navy-900 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-gov-teal-600" />
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-600 animate-pulse tracking-wide uppercase">
        {message}
      </p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

