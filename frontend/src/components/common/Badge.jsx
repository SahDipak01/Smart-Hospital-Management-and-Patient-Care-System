import React from 'react';

const Badge = ({ children, variant, size = 'md', className = '' }) => {
  // If variant is not explicitly provided, infer from text
  let finalVariant = variant;
  if (!finalVariant && typeof children === 'string') {
    const text = children.toLowerCase();
    if (['confirmed', 'completed', 'paid', 'available', 'active', 'normal', 'routine care', 'stable'].some((t) => text.includes(t))) {
      finalVariant = 'success';
    } else if (['pending', 'requested', 'processing', 'partially paid', 'priority attention', 'routine'].some((t) => text.includes(t))) {
      finalVariant = 'warning';
    } else if (['cancelled', 'occupied', 'critical', 'abnormal', 'immediate emergency', 'urgent', 'severe'].some((t) => text.includes(t))) {
      finalVariant = 'danger';
    } else if (['admitted', 'inpatient', 'dispensed', 'doctor', 'nurse', 'sample collected'].some((t) => text.includes(t))) {
      finalVariant = 'info';
    } else if (['admin', 'pharmacist', 'lab_technician'].some((t) => text.includes(t))) {
      finalVariant = 'purple';
    } else {
      finalVariant = 'default';
    }
  }

  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-600/10',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-600/10',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-600/10',
    info: 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-600/10',
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-600/10',
    default: 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-400/10',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3 py-1 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${variantStyles[finalVariant || 'default']} ${sizeStyles[size]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75"></span>
      {children}
    </span>
  );
};

export default Badge;
