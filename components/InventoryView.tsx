
import React, { useState } from 'react';
import { PlayerState, Gear, Gem } from '../types';
import { RARITY_CONFIG, UPGRADE_COSTS, BUFF_LABELS } from '../constants';
import { Button } from './Button';
import { Trash2, PackageOpen, Swords, Wind, Hexagon, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InventoryViewProps {
  playerState: PlayerState;
  onSalvageGear: (gear: Gear) => void;
  onSocketGem?: (gearId: string, gemId: string, socketIndex: number) => void;
  onUnsocketGem?: (gearId: string, socketIndex: number) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ playerState, onSalvageGear, onSocketGem, onUnsocketGem }) => {
  const [activeTab, setActiveTab] = useState<'gear' | 'gems'>('gear');
  const [selectedGear, setSelectedGear] = useState<Gear | null>(null);
  const [socketTarget, setSocketTarget] = useState<{ gearId: string, index: number } | null>(null);

  const getSalvageValues = (gear: Gear) => {
     const config = RARITY_CONFIG[gear.rarity];
     return {
         feathers: Math.floor(UPGRADE_COSTS.CRAFT_GEAR * 0.3),
         scrap: Math.floor(UPGRADE_COSTS.CRAFT_SCRAP * 0.5 * config.minMult)
     };
  };

  const handleSocketClick = (gear: Gear, index: number, gem: Gem | null) => {
      if (gem) {
          // Unsocket
          if (onUnsocketGem) onUnsocketGem(gear.id, index);
      } else {
          // Open Gem Selector
          setSocketTarget({ gearId: gear.id, index });
      }
  };

  const handleGemSelect = (gemId: string) => {
      if (socketTarget && onSocketGem) {
          onSocketGem(socketTarget.gearId, gemId, socketTarget.index);
          setSocketTarget(null);
      }
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="text-center py-6">
          <h2 className="font-tech text-3xl text-white mb-2">SUPPLY DEPOT</h2>
          <div className="flex justify-center gap-4 mt-4">
              <button 
                onClick={() => setActiveTab('gear')} 
                className={`px-4 py-2 rounded font-bold text-xs uppercase tracking-widest transition-colors ${activeTab === 'gear' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                  Gear
              </button>
              <button 
                onClick={() => setActiveTab('gems')} 
                className={`px-4 py-2 rounded font-bold text-xs uppercase tracking-widest transition-colors ${activeTab === 'gems' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                  Gems
              </button>
          </div>
      </div>

      {activeTab === 'gear' && (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col items-center">
                    <div className="text-xs text-slate-500 uppercase mb-1">Total Gear</div>
                    <div className="text-2xl font-tech text-white">{playerState.inventory.gear.length}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col items-center">
                    <div className="text-xs text-slate-500 uppercase mb-1">Salvage Value</div>
                    <div className="text-xs text-slate-400 text-center">Scrapping items returns Feathers & Scrap</div>
                </div>
            </div>

            <div className="space-y-3">
                <AnimatePresence>
                    {playerState.inventory.gear.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-600 border border-dashed border-slate-800 rounded-lg bg-slate-900/30">
                            <PackageOpen size={48} className="mb-4 opacity-50" />
                            <div className="text-sm font-bold">INVENTORY EMPTY</div>
                            <div className="text-xs">Visit the Lab to craft new gear.</div>
                        </div>
                    ) : (
                        playerState.inventory.gear.map(gear => {
                            const salvage = getSalvageValues(gear);
                            return (
                                <motion.div 
                                    key={gear.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={`bg-slate-900 border ${RARITY_CONFIG[gear.rarity].borderColor} p-4 rounded-lg flex flex-col group relative overflow-hidden`}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-r ${RARITY_CONFIG[gear.rarity].glowColor.replace('shadow-', 'from-')}/10 to-transparent pointer-events-none`} />
                                    
                                    <div className="flex items-start gap-4 relative z-10 w-full mb-3">
                                        <div className={`w-14 h-14 rounded bg-slate-950 flex items-center justify-center border ${RARITY_CONFIG[gear.rarity].borderColor} shrink-0`}>
                                            {gear.type === 'BEAK' ? <Swords size={24} className={RARITY_CONFIG[gear.rarity].color} /> : <Wind size={24} className={RARITY_CONFIG[gear.rarity].color} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-bold font-tech text-lg ${RARITY_CONFIG[gear.rarity].color}`}>{gear.name}</div>
                                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">{RARITY_CONFIG[gear.rarity].name} Tier</div>
                                            
                                            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                                                <div className="bg-slate-950/50 px-2 py-1 rounded">ATK +{gear.attackBonus}</div>
                                                <div className="bg-slate-950/50 px-2 py-1 rounded text-cyan-500">{gear.type === 'BEAK' ? 'CRIT' : 'BLEED'} {gear.effectValue}%</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stat Bonuses */}
                                    {gear.statBonuses && gear.statBonuses.length > 0 && (
                                         <div className="relative z-10 w-full mb-3">
                                              <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Bonus Stats</div>
                                              <div className="grid grid-cols-2 gap-2">
                                                  {gear.statBonuses.map((b, i) => (
                                                      <div key={i} className={`text-[10px] px-2 py-1 bg-slate-950 rounded border border-slate-800 text-slate-300`}>
                                                          +{b.value} {BUFF_LABELS[b.stat] || b.stat}
                                                      </div>
                                                  ))}
                                              </div>
                                         </div>
                                    )}

                                    {/* Sockets Visual */}
                                    {gear.sockets && gear.sockets.length > 0 && (
                                        <div className="relative z-10 w-full space-y-2 mb-3 bg-slate-950/30 p-2 rounded border border-slate-800/50">
                                            <div className="flex gap-2 items-center">
                                                <div className="text-[9px] text-slate-500 uppercase font-bold mr-auto">Sockets</div>
                                                {gear.sockets.map((socket, idx) => (
                                                    <button 
                                                        key={idx} 
                                                        onClick={() => handleSocketClick(gear, idx, socket)}
                                                        className={`w-6 h-6 rounded-full bg-slate-900 border flex items-center justify-center relative group/socket hover:scale-110 transition-transform ${socket ? RARITY_CONFIG[socket.rarity].borderColor : 'border-slate-600 border-dashed hover:border-cyan-400'}`}
                                                        title={socket ? "Tap to Unsocket" : "Tap to Socket"}
                                                    >
                                                        {socket ? (
                                                            <div className={`w-4 h-4 rounded-full ${RARITY_CONFIG[socket.rarity].color.replace('text-', 'bg-')} shadow-sm`} />
                                                        ) : (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover/socket:bg-cyan-400" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                            {/* List socketed gem effects */}
                                            {gear.sockets.some(s => s !== null) && (
                                                <div className="grid grid-cols-1 gap-1 pt-1">
                                                    {gear.sockets.filter(s => s !== null).map((gem, i) => (
                                                        gem!.buffs.map((buff, j) => (
                                                             <div key={`${i}-${j}`} className={`text-[9px] ${RARITY_CONFIG[buff.rarity].color}`}>
                                                                 • +{buff.value}% {BUFF_LABELS[buff.stat]}
                                                             </div>
                                                        ))
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="relative z-10 w-full flex justify-end border-t border-slate-800 pt-3">
                                        <div className="flex items-center gap-4">
                                            <div className="text-[10px] text-right text-slate-600 group-hover:text-slate-400 transition-colors">
                                                +{salvage.scrap} SCRAP
                                            </div>
                                            <Button 
                                                size="sm" 
                                                variant="secondary" 
                                                className="border-slate-700 hover:border-rose-500 hover:bg-rose-900/20 group-hover:text-rose-400"
                                                onClick={() => onSalvageGear(gear)}
                                            >
                                                <Trash2 size={16} />
                                                <span className="ml-2">SCRAP</span>
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </>
      )}

      {activeTab === 'gems' && (
          <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col items-center">
                    <div className="text-xs text-slate-500 uppercase mb-1">Total Gems</div>
                    <div className="text-2xl font-tech text-white">{playerState.inventory.gems.length}</div>
              </div>
              
              {playerState.inventory.gems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-600 border border-dashed border-slate-800 rounded-lg bg-slate-900/30">
                      <Hexagon size={48} className="mb-4 opacity-50 text-purple-400" />
                      <div className="text-sm font-bold">GEM STORAGE EMPTY</div>
                      <div className="text-xs">Battle enemies to find Gems.</div>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {playerState.inventory.gems.map(gem => (
                          <div key={gem.id} className={`bg-slate-900 border ${RARITY_CONFIG[gem.rarity].borderColor} p-3 rounded-lg flex flex-col items-center text-center relative overflow-hidden`}>
                               <div className={`absolute inset-0 bg-gradient-to-b ${RARITY_CONFIG[gem.rarity].glowColor.replace('shadow-', 'from-')}/5 to-transparent pointer-events-none`} />
                               <Hexagon size={24} className={`mb-2 ${RARITY_CONFIG[gem.rarity].color}`} />
                               <div className={`font-bold font-tech text-sm ${RARITY_CONFIG[gem.rarity].color} truncate w-full`}>{gem.name}</div>
                               <div className="text-[9px] text-slate-400 uppercase tracking-widest mb-2">{RARITY_CONFIG[gem.rarity].name}</div>
                               <div className="w-full text-xs text-slate-300 space-y-1">
                                   {gem.buffs.map((b, i) => (
                                       <div key={i}>+{b.value}% {BUFF_LABELS[b.stat]}</div>
                                   ))}
                                </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* Gem Selection Modal */}
      <AnimatePresence>
          {socketTarget && (
              <motion.div 
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
                onClick={() => setSocketTarget(null)}
              >
                  <motion.div 
                    initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} exit={{scale:0.9, y:20}}
                    className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-sm w-full shadow-2xl flex flex-col max-h-[80vh]"
                    onClick={e => e.stopPropagation()}
                  >
                      <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
                          <h3 className="font-tech text-xl text-white">Select Gem</h3>
                          <button onClick={() => setSocketTarget(null)}><X size={20} className="text-slate-500" /></button>
                      </div>
                      
                      {playerState.inventory.gems.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                              No gems available.
                          </div>
                      ) : (
                          <div className="overflow-y-auto custom-scrollbar space-y-2 pr-2">
                              {playerState.inventory.gems.map(gem => (
                                  <button 
                                    key={gem.id}
                                    onClick={() => handleGemSelect(gem.id)}
                                    className={`w-full p-3 rounded border flex items-center gap-3 bg-slate-950 hover:bg-slate-800 transition-colors ${RARITY_CONFIG[gem.rarity].borderColor}`}
                                  >
                                      <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center border border-slate-800">
                                          <Hexagon size={16} className={RARITY_CONFIG[gem.rarity].color} />
                                      </div>
                                      <div className="text-left flex-1">
                                          <div className={`font-bold text-sm ${RARITY_CONFIG[gem.rarity].color}`}>{gem.name}</div>
                                          <div className="text-[10px] text-slate-300">
                                              {gem.buffs.map(b => `+${b.value}% ${BUFF_LABELS[b.stat]}`).join(', ')}
                                          </div>
                                      </div>
                                      <div className="bg-cyan-900/30 text-cyan-400 text-[10px] font-bold px-2 py-1 rounded">
                                          SOCKET
                                      </div>
                                  </button>
                              ))}
                          </div>
                      )}
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};
