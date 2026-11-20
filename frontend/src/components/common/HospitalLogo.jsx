import React from 'react';

/**
 * Smart Hospital Official Brand Logo
 * Matches the user specification: Medical Blue Heart with ECG Heartbeat wave and cross badge.
 */
export const HospitalHeartIcon = ({ className = 'w-10 h-10', showPlus = true }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e88e5" />
          <stop offset="100%" stopColor="#0d47a1" />
        </linearGradient>
        <filter id="logoShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0d47a1" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Main Heart Shape */}
      <path
        d="M50 88C50 88 14 62 14 34C14 20 25 10 39 10C45 10 50 14 50 14C50 14 55 10 61 10C75 10 86 20 86 34C86 62 50 88 50 88Z"
        fill="url(#heartGradient)"
        filter="url(#logoShadow)"
      />

      {/* ECG Heartbeat Line running through heart */}
      <path
        d="M16 46H34L39 36L44 56L49 26L54 62L58 46H74"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Medical Plus Badge at bottom right of heart */}
      {showPlus && (
        <g transform="translate(62, 58)">
          <circle cx="16" cy="16" r="14" fill="#0d47a1" stroke="#ffffff" strokeWidth="2.5" />
          <rect x="13.5" y="8" width="5" height="16" rx="1.5" fill="#ffffff" />
          <rect x="8" y="13.5" width="16" height="5" rx="1.5" fill="#ffffff" />
        </g>
      )}
    </svg>
  );
};

export const HospitalLogo = ({
  className = '',
  iconSize = 'w-11 h-11',
  textColor = 'text-[#0f2851]',
  subColor = 'text-slate-500',
  center = false,
}) => {
  return (
    <div className={`flex items-center gap-3 ${center ? 'justify-center text-center' : ''} ${className}`}>
      <HospitalHeartIcon className={iconSize} />
      <div className={center ? 'text-left' : ''}>
        <h1 className={`text-xl sm:text-2xl font-black ${textColor} tracking-tight leading-none`}>
          Smart Hospital
        </h1>
        <p className={`text-[11px] sm:text-xs font-semibold ${subColor} tracking-tight mt-0.5`}>
          Management & Patient Care System
        </p>
      </div>
    </div>
  );
};

export default HospitalLogo;
