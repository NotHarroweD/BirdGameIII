
import React from 'react';
import { motion } from 'framer-motion';

interface BarProps {
  current: number;
  max: number;
  type: 'health' | 'energy';
  label?: string;
  showValue?: boolean;
}

export const HealthBar: React.FC<BarProps> = ({ current, max, type, label, showValue = true }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  
  // Dynamic color based on health percentage
  let barColor = 'bg-cyan-500';
  if (type === 'health') {
    if (percentage > 50) barColor = 'bg-emerald-500';
    else if (percentage > 25) barColor = 'bg-yellow-500';
    else barColor = 'bg-rose-500';
  } else {
    // Energy is always cyan/blue
    barColor = 'bg-cyan-400';
  }

  return (
    <div className="w-full space-y-0.5 group">
      <div className="flex justify-between items-end mb-0.5">
        {label && (
          <span className={`text-[10px] font-tech font-bold uppercase tracking-widest ${type === 'health' ? 'text-emerald-400' : 'text-cyan-400'}`}>
            {label}
          </span>
        )}
        {showValue && (
          <span className="text-xs font-mono text-slate-400 scale-90 origin-right">
            <span className="text-white">{Math.round(current)}</span><span>/{max}</span>
          </span>
        )}
      </div>
      
      {/* Skewed Container */}
      <div className="h-3 w-full bg-slate-800 -skew-x-12 border border-slate-700 relative overflow-hidden">
        {/* Fill Bar */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          className={`h-full ${barColor} shadow-[0_0_8px_rgba(255,255,255,0.2)] relative`}
        >
          <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/50" />
        </motion.div>
      </div>
    </div>
  );
};
