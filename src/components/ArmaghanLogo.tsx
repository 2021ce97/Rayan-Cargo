import React from 'react';

interface ArmaghanLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'badge' | 'full';
  showSubtitle?: boolean;
}

export const ArmaghanLogo: React.FC<ArmaghanLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'badge',
  showSubtitle = true
}) => {
  const sizeMap = {
    xs: { img: 'w-7 h-7', text: 'text-xs', sub: 'text-[9px]' },
    sm: { img: 'w-9 h-9', text: 'text-sm', sub: 'text-[10px]' },
    md: { img: 'w-12 h-12', text: 'text-base', sub: 'text-xs' },
    lg: { img: 'w-16 h-16', text: 'text-lg', sub: 'text-xs' },
    xl: { img: 'w-24 h-24', text: 'text-xl', sub: 'text-sm' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  if (variant === 'icon') {
    return (
      <div className={`relative shrink-0 flex items-center justify-center ${className}`}>
        <img
          src="/logo.jpg"
          alt="Kabul Cargo Transfers"
          className={`${currentSize.img} object-contain rounded-xl shadow-xs transition-transform hover:scale-105`}
          loading="eager"
        />
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <div className="relative shrink-0 p-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-red-500/20 dark:border-red-500/30 flex items-center justify-center">
          <img
            src="/logo.jpg"
            alt="Kabul Cargo Transfers - خدمات انتقالات کابل کارگو"
            className={`${currentSize.img} object-contain`}
            loading="eager"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-extrabold tracking-tight text-slate-900 dark:text-white ${currentSize.text}`}>
              Kabul Cargo
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 uppercase tracking-wider">
              Transfers
            </span>
          </div>
          {showSubtitle && (
            <p className={`font-medium text-slate-500 dark:text-slate-400 ${currentSize.sub}`}>
              خدمات انتقالات و باربری کابل کارگو
            </p>
          )}
        </div>
      </div>
    );
  }

  // Full centered variant (e.g. for login page or splash)
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className="relative p-2 bg-white rounded-3xl shadow-lg border-2 border-red-400/40 mb-3 hover:shadow-red-500/10 transition-shadow">
        <img
          src="/logo.jpg"
          alt="خدمات انتقالات کابل کارگو - Kabul Cargo Transfers"
          className={`${currentSize.img} object-contain rounded-2xl`}
          loading="eager"
        />
      </div>
      <h1 className={`font-black tracking-tight text-slate-900 dark:text-white ${currentSize.text}`}>
        Kabul Cargo Transfers
      </h1>
      <p className="text-red-700 dark:text-red-400 font-bold text-sm sm:text-base mt-0.5">
        خدمات انتقالات کابل کارگو
      </p>
      {showSubtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          شبکه سراسری باربری، کارگو و انتقالات اموال در تمام ولایات افغانستان
        </p>
      )}
    </div>
  );
};
