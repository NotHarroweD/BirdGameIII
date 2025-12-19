import React from 'react';
import { BattleBird, Move, MoveType, SkillCheckType } from '../../types';
import { Crosshair, Shield, Heart, Zap, Activity } from 'lucide-react';

interface BattleControlsProps {
    playerBird: BattleBird;
    lastUsedMap: Record<string, number>;
    onMove: (move: Move) => void;
    disabled: boolean;
}

export const BattleControls: React.FC<BattleControlsProps> = ({ playerBird, lastUsedMap, onMove, disabled }) => {
    return (
        <div className="bg-slate-900 border-t border-slate-700 p-2 shrink-0 pb-6 md:pb-2 z-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 h-40 md:h-24">
                {playerBird.moves.map(m => {
                    const expiry = lastUsedMap[m.id] || 0;
                    const onCd = expiry > Date.now();
                    const remaining = Math.max(0, expiry - Date.now());
                    const showCrit = m.type === MoveType.ATTACK && playerBird.gear?.beak;
                    const showBleed = m.type === MoveType.ATTACK && playerBird.gear?.claws;

                    return (
                        <button 
                            key={m.id} 
                            disabled={disabled || onCd || playerBird.currentEnergy < m.cost} 
                            onClick={() => onMove(m)} 
                            className={`
                                relative flex flex-col items-center justify-center p-2 rounded-lg border-b-4 transition-all active:translate-y-1 overflow-hidden
                                ${playerBird.currentEnergy < m.cost ? 'bg-slate-800 border-slate-700 opacity-50' : 
                                  m.type === MoveType.ATTACK ? 'bg-rose-900/50 border-rose-700 hover:bg-rose-800/50' : 
                                  m.type === MoveType.DEFENSE ? 'bg-cyan-900/50 border-cyan-700 hover:bg-cyan-800/50' :
                                  m.type === MoveType.HEAL ? 'bg-emerald-900/50 border-emerald-700 hover:bg-emerald-800/50' :
                                  m.type === MoveType.DRAIN ? 'bg-purple-900/50 border-purple-700 hover:bg-purple-800/50' :
                                  'bg-amber-900/50 border-amber-700 hover:bg-amber-800/50'}
                            `}
                        >
                            {onCd && (
                                <div className="absolute inset-0 bg-slate-950/80 z-20 flex items-center justify-center text-white font-mono text-sm">
                                    {(remaining/1000).toFixed(1)}s
                                </div>
                            )}
                            <div className="mb-1">
                                {m.type === MoveType.ATTACK && <Crosshair size={20} className="text-rose-400" />}
                                {m.type === MoveType.DEFENSE && <Shield size={20} className="text-cyan-400" />}
                                {m.type === MoveType.HEAL && <Heart size={20} className="text-emerald-400" />}
                                {m.type === MoveType.SPECIAL && <Zap size={20} className="text-amber-400" />}
                                {m.type === MoveType.DRAIN && <Activity size={20} className="text-purple-400" />}
                            </div>
                            <div className="font-bold text-sm text-slate-100 uppercase tracking-tight leading-none text-center mb-1">{m.name}</div>
                            <div className="flex items-center gap-1 text-xs text-cyan-300 font-mono">
                                <Zap size={10} fill="currentColor" /> {m.cost}
                            </div>
                            <div className="absolute top-1 left-1 flex gap-0.5">
                                {showCrit && <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" title="Crit Enabled" />}
                                {showBleed && <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" title="Bleed Enabled" />}
                            </div>
                            {m.skillCheck !== SkillCheckType.NONE && (
                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            )}
                        </button>
                    )
                })}
            </div>
       </div>
    );
};