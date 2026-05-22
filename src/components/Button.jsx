import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon: IconComponent,
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-1.5 font-black transition-all shadow-sm rounded-xl';
  
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-600',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    warning: 'bg-amber-400 hover:bg-amber-500 text-slate-900',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-500',
    outline: 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600',
    indigo_light: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-100'
  };

  const sizes = {
    xs: 'px-2 py-1 text-[10px]',
    sm: 'px-3 py-1.5 text-[11px]',
    md: 'px-4 py-2 text-xs',
    lg: 'px-6 py-2.5 text-sm'
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {IconComponent && <IconComponent className={`${size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />}
      {children}
    </button>
  );
};

export default Button;
