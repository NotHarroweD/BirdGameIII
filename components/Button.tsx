import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  fullWidth = false,
  ...props 
}) => {
  const baseStyles = "relative font-tech font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none group active:translate-y-0.5";
  
  const variants = {
    primary: "bg-cyan-600 hover:bg-cyan-500 text-white clip-tech shadow-[0_0_15px_rgba(8,145,178,0.4)] hover:shadow-[0_0_25px_rgba(8,145,178,0.6)] border-b-4 border-cyan-800",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200 clip-tech border-b-4 border-slate-900",
    danger: "bg-rose-600 hover:bg-rose-500 text-white clip-tech shadow-[0_0_15px_rgba(225,29,72,0.4)] border-b-4 border-rose-800",
    ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white",
    outline: "bg-transparent border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 clip-tech"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
    xl: "px-10 py-5 text-lg"
  };

  return (
    <button 
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''} 
        ${className}
      `}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      {/* Tech decoration lines */}
      {variant !== 'ghost' && (
        <>
          <span className="absolute top-0 left-0 w-2 h-2 border-l border-t border-white/20 z-20" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-white/20 z-20" />
        </>
      )}
    </button>
  );
};