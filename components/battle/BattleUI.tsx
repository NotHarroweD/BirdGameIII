import React from 'react';
import { Activity, Droplets, Zap, Wind, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { Rarity } from '../../types';
import { RARITY_CONFIG } from '../../constants';

export const StatusBadge: React.FC<{ type: string }> = ({ type }) => {
    let icon = <Activity size={12} />;
    let color = "text-slate-400";
    let label = type;

    if (type === 'bleed') { icon = <Droplets size={12} />; color = "text-rose-500"; label = "BLEED"; }
    if (type === 'stun') { icon = <Zap size={12} />; color = "text-yellow-500"; label = "STUN"; }
    if (type === 'dodge') { icon = <Wind size={12} />; color = "text-cyan-500"; label = "EVASIVE"; }
    if (type === 'shield') { icon = <Shield size={12} />; color = "text-blue-400"; label = "SHIELD"; }

    return (
        <motion.div 
           initial={{ scale: 0 }} animate={{ scale: 1 }}
           className={`flex items-center gap-1 px-1.5 py-0.5 bg-slate-900/80 rounded border border-slate-700 ${color}`}
        >
            {icon} <span className="text-[9px] font-bold">{label}</span>
        </motion.div>
    );
 };

export const ZoneProgress: React.FC<{ 
    progress: Rarity[], 
    required: Rarity[], 
    currentOpponentRarity?: Rarity,
    isVictory?: boolean
}> = ({ progress, required, currentOpponentRarity, isVictory }) => {
    return (
        <div className="flex items-center gap-1">
            {required.map((rarity, index) => {
                const isCollected = progress.includes(rarity);
                // Check if this specific instance is fulfilling a new rarity requirement
                const isNewUnlock = isVictory && currentOpponentRarity === rarity && !isCollected;
                const config = RARITY_CONFIG[rarity];
                
                return (
                    <div key={rarity} className="relative">
                        <div 
                            className={`w-3 h-3 rotate-45 border transition-all duration-500 ${
                                isCollected || isNewUnlock
                                    ? `${config.color.replace('text-', 'bg-')} ${config.borderColor}` 
                                    : `bg-slate-900 border-slate-700 opacity-50`
                            } ${isNewUnlock ? 'animate-pulse shadow-[0_0_10px_white]' : ''}`}
                            title={config.name}
                        />
                        {(isCollected || isNewUnlock) && (
                            <div className={`absolute inset-0 flex items-center justify-center -rotate-45`}>
                                {/* Checkmark or Effect */}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};