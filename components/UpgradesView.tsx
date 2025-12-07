
import React from 'react';
import { PlayerState, UpgradeState } from '../types';
import { UPGRADE_DEFINITIONS } from '../constants';
import { Button } from './Button';
import { ArrowUpCircle, Hammer, Database, Gem } from 'lucide-react';
import { motion } from 'framer-motion';

interface UpgradesViewProps {
  playerState: PlayerState;
  onUpgrade: (type: keyof UpgradeState) => void;
}

export const UpgradesView: React.FC<UpgradesViewProps> = ({ playerState, onUpgrade }) => {
  return (
    <div className="space-y-6 pb-20">
        <div className="text-center py-6">
            <h2 className="font-tech text-3xl text-white mb-2">SYSTEM UPGRADES</h2>
            <p className="text-slate-400 text-xs uppercase tracking-widest">Enhance Operations Efficiency</p>
        </div>

        <div className="space-y-4">
            {UPGRADE_DEFINITIONS.map((def) => {
                const currentLevel = playerState.upgrades[def.id] || 0;
                const isMax = currentLevel >= def.maxLevel;
                
                // Calculate Cost: Base * (Multiplier ^ Level)
                const featherCost = Math.floor(def.baseCost.feathers * Math.pow(def.costMultiplier, currentLevel));
                const scrapCost = Math.floor(def.baseCost.scrap * Math.pow(def.costMultiplier, currentLevel));
                const diamondCost = Math.floor(def.baseCost.diamonds * Math.pow(def.costMultiplier, currentLevel));
                
                const canAfford = playerState.feathers >= featherCost && playerState.scrap >= scrapCost && playerState.diamonds >= diamondCost;

                return (
                    <motion.div 
                        key={def.id}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="bg-slate-900 border border-slate-800 p-5 rounded-lg relative overflow-hidden group"
                    >
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-cyan-400 border border-slate-700">
                                    <ArrowUpCircle size={20} />
                                </div>
                                <div>
                                    <div className="font-tech font-bold text-lg text-white">{def.name}</div>
                                    <div className="text-xs text-slate-500 font-mono">
                                        LEVEL {currentLevel} <span className="text-slate-700">/ {def.maxLevel}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{def.effectPerLevel}</div>
                                <div className="text-[9px] text-slate-500">PER LEVEL</div>
                            </div>
                        </div>
                        
                        <p className="text-sm text-slate-400 mb-4 relative z-10 min-h-[40px]">
                            {def.description}
                        </p>

                        <div className="relative z-10">
                            {isMax ? (
                                <Button fullWidth disabled className="bg-emerald-900/50 border-emerald-800 text-emerald-400">
                                    MAXIMUM LEVEL REACHED
                                </Button>
                            ) : (
                                <Button 
                                    fullWidth 
                                    onClick={() => onUpgrade(def.id)}
                                    disabled={!canAfford}
                                    className={!canAfford ? "opacity-50" : ""}
                                >
                                    <div className="flex items-center justify-center gap-4">
                                        <span className="text-sm font-bold">UPGRADE</span>
                                        <div className="h-4 w-px bg-white/20" />
                                        <div className="flex items-center gap-3 text-xs font-mono">
                                            {featherCost > 0 && (
                                                <span className={`flex items-center gap-1 ${playerState.feathers >= featherCost ? 'text-white' : 'text-rose-500'}`}>
                                                    <Database size={12} /> {featherCost.toLocaleString()}
                                                </span>
                                            )}
                                            {scrapCost > 0 && (
                                                <span className={`flex items-center gap-1 ${playerState.scrap >= scrapCost ? 'text-slate-300' : 'text-rose-500'}`}>
                                                    <Hammer size={12} /> {scrapCost.toLocaleString()}
                                                </span>
                                            )}
                                             {diamondCost > 0 && (
                                                <span className={`flex items-center gap-1 ${playerState.diamonds >= diamondCost ? 'text-blue-300' : 'text-rose-500'}`}>
                                                    <Gem size={12} /> {diamondCost.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Button>
                            )}
                        </div>

                        {/* Bg Pattern */}
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none" />
                    </motion.div>
                );
            })}
        </div>
    </div>
  );
};
