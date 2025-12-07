
import React from 'react';
import { Rarity } from '../types';
import { RARITY_CONFIG } from '../constants';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  variant?: 'default' | 'glass';
  rarity?: Rarity;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  noPadding = false,
  variant = 'default',
  rarity
}) => {
  const baseClasses = variant === 'glass' 
    ? "bg-slate-900/60 backdrop-blur-md"
    : "bg-slate-900";

  let borderClass = "border border-slate-800";
  let glowClass = "";
  let accentColor = "border-cyan-500/50";

  if (rarity && RARITY_CONFIG[rarity]) {
      const config = RARITY_CONFIG[rarity];
      borderClass = `border ${config.borderColor}`;
      glowClass = `shadow-[0_0_15px_rgba(0,0,0,0.5)] ${config.glowColor.replace('shadow-', 'shadow-')}`; // Simplified glow
      accentColor = config.borderColor;
  }

  return (
    <div className={`relative ${baseClasses} ${borderClass} ${glowClass} ${noPadding ? '' : 'p-6'} ${className} transition-colors duration-300`}>
      {/* Tech Corners */}
      <div className={`absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 ${accentColor} -translate-x-[1px] -translate-y-[1px]`} />
      <div className={`absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 ${accentColor} translate-x-[1px] -translate-y-[1px]`} />
      <div className={`absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 ${accentColor} -translate-x-[1px] translate-y-[1px]`} />
      <div className={`absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 ${accentColor} translate-x-[1px] translate-y-[1px]`} />
      
      {children}
    </div>
  );
};
