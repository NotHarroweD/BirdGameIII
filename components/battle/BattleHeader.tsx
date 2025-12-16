
import React from 'react';
import { Activity, Info } from 'lucide-react';
import { Rarity, EnemyPrefix } from '../../types';
import { PREFIX_STYLES } from './utils';
import { ZoneProgress } from './BattleUI';

interface BattleHeaderProps {
    enemyLevel: number;
    enemyPrefix?: EnemyPrefix;
    currentZoneProgress: Rarity[];
    requiredRarities: Rarity[];
    onShowThreatDetails: () => void;
}

export const BattleHeader: React.FC<BattleHeaderProps> = ({ 
    enemyLevel, 
    enemyPrefix = EnemyPrefix.NONE, 
    currentZoneProgress, 
    requiredRarities, 
    onShowThreatDetails 
}) => {
    const isSpecial = enemyPrefix !== EnemyPrefix.NONE;
    const styleConfig = PREFIX_STYLES[enemyPrefix];

    return (
       <div className="h-12 bg-slate-900/80 flex items-center justify-between px-4 text-xs font-bold border-b border-slate-800 z-10 shrink-0">
           <div 
               className={`flex items-center gap-2 ${isSpecial ? styleConfig.color : 'text-slate-400'} cursor-pointer hover:opacity-80 transition-opacity`}
               onClick={() => isSpecial && onShowThreatDetails()}
           >
               <Activity size={14} className={isSpecial ? 'animate-pulse' : ''} /> 
               <span className="uppercase font-bold tracking-wider">
                   {enemyPrefix === EnemyPrefix.NONE ? 'STANDARD THREAT' : `${enemyPrefix} THREAT`}
               </span>
               {isSpecial && <Info size={14} />}
           </div>
           
           {/* Zone Progress Indicators */}
           <div className="flex items-center gap-3">
               <div className="flex flex-col items-end">
                   <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Zone {enemyLevel} Clearance</div>
                   <ZoneProgress progress={currentZoneProgress} required={requiredRarities} />
               </div>
           </div>
       </div>
    );
};
