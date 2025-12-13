
import React, { useState, useRef } from 'react';
import { PlayerState, Gear, Gem, ConsumableType, Rarity, GearPrefix } from '../types';
import { RARITY_CONFIG, UPGRADE_COSTS, BUFF_LABELS, CONSUMABLE_STATS } from '../constants';
import { Button } from './Button';
import { Trash2, PackageOpen, Swords, Wind, Hexagon, X, Zap, Clock, Award, Briefcase, Check, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InventoryViewProps {
  playerState: PlayerState;
  onSalvageGear: (gear: Gear) => void;
  onSocketGem?: (gearId: string, gemId: string, socketIndex: number) => void;
  onUnsocketGem?: (gearId: string, socketIndex: number) => void;
  onUseConsumable?: (type: ConsumableType, rarity: Rarity) => void;
  onBatchSalvageGems?: (gems: Gem[]) => void;
}

const RARITY_VALUE = {
    [Rarity.COMMON]: 0,
    [Rarity.UNCOMMON]: 1,
    [Rarity.RARE]: 2,
    [Rarity.EPIC]: 3,
    [Rarity.LEGENDARY]: 4,
    [Rarity.MYTHIC]: 5
};

export const InventoryView: React.FC<InventoryViewProps> = ({ 
    playerState, 
    onSalvageGear, 
    onSocketGem, 
    onUnsocketGem, 
    onUseConsumable,
    onBatchSalvageGems 
}) => {
  const [activeTab, setActiveTab] = useState<'gear' | 'gems' | 'consumables'>('gear');
  const [socketTarget, setSocketTarget] = useState<{ gearId: string, index: number } | null>(null);

  // Gem Management State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGemIds, setSelectedGemIds] = useState<Set<string>>(new Set());
  const [confirmModalData, setConfirmModalData] = useState<{ gems: Gem[], totalFeathers: number, totalScrap: number } | null>(null);
  
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // --- Gem Selection Logic ---
  const handleGemInteractionStart = (gemId: string) => {
      if (isSelectionMode) return; // In selection mode, clicks are instant
      
      longPressTimerRef.current = setTimeout(() => {
          setIsSelectionMode(true);
          const newSet = new Set(selectedGemIds);
          newSet.add(gemId);
          setSelectedGemIds(newSet);
          // Vibrate if supported
          if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
  };

  const handleGemInteractionEnd = () => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };

  const handleGemClick = (gemId: string) => {
      if (isSelectionMode) {
          const newSet = new Set(selectedGemIds);
          if (newSet.has(gemId)) {
              newSet.delete(gemId);
          } else {
              newSet.add(gemId);
          }
          setSelectedGemIds(newSet);
          if (newSet.size === 0) {
              // Optional: Exit selection mode if empty? Keeping active for now.
          }
      }
  };

  const cancelSelectionMode = () => {
      setIsSelectionMode(false);
      setSelectedGemIds(new Set());
  };

  const handleSelectAll = () => {
      const allIds = playerState.inventory.gems.map(g => g.id);
      setSelectedGemIds(new Set(allIds));
  };

  const handleSalvageAllCommon = () => {
      const commonGems = playerState.inventory.gems.filter(g => g.rarity === Rarity.COMMON);
      if (commonGems.length === 0) return;
      prepareBatchSalvage(commonGems);
  };

  const prepareBatchSalvage = (gems: Gem[]) => {
      let totalFeathers = 0;
      let totalScrap = 0;
      
      gems.forEach(gem => {
           const config = RARITY_CONFIG[gem.rarity];
           totalFeathers += Math.floor(UPGRADE_COSTS.CRAFT_GEM * 0.3);
           totalScrap += Math.floor(UPGRADE_COSTS.CRAFT_GEM_SCRAP * 0.5 * config.minMult);
      });

      setConfirmModalData({
          gems,
          totalFeathers,
          totalScrap
      });
  };

  const handleConfirmSalvage = () => {
      if (confirmModalData && onBatchSalvageGems) {
          onBatchSalvageGems(confirmModalData.gems);
          setConfirmModalData(null);
          cancelSelectionMode();
      }
  };

  // Sort function: Ascending Rarity
  const sortByRarity = (a: { rarity: Rarity }, b: { rarity: Rarity }) => {
      return RARITY_VALUE[a.rarity] - RARITY_VALUE[b.rarity];
  };

  const sortedGear = [...playerState.inventory.gear].sort(sortByRarity);
  const sortedGems = [...playerState.inventory.gems].sort(sortByRarity);
  const sortedConsumables = [...playerState.inventory.consumables].sort(sortByRarity);

  // Helper for gear details
  const getPrefixLabel = (prefix?: GearPrefix) => {
      if (prefix === GearPrefix.QUALITY) return 'Extra Atk';
      if (prefix === GearPrefix.SHARP) return 'Bleed Dmg';
      if (prefix === GearPrefix.GREAT) return 'Crit Chance';
      return '';
  };

  return (
    <div className="space-y-6 pb-20 relative animate-in fade-in duration-500">
      <div className="text-center py-6">
          <h2 className="font-tech text-3xl text-white mb-2 drop-shadow-md">SUPPLY DEPOT</h2>
          <div className="flex justify-center gap-2 mt-4 bg-slate-900/80 p-1 rounded-lg border border-slate-800 inline-flex backdrop-blur-sm">
              <button 
                onClick={() => { setActiveTab('gear'); cancelSelectionMode(); }} 
                className={`px-6 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'gear' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                  Gear
              </button>
              <button 
                onClick={() => setActiveTab('gems')} 
                className={`px-6 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'gems' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                  Gems
              </button>
              <button 
                onClick={() => { setActiveTab('consumables'); cancelSelectionMode(); }} 
                className={`px-6 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'consumables' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                  Items
              </button>
          </div>
      </div>

      {activeTab === 'gear' && (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col items-center shadow-lg">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Total Gear</div>
                    <div className="text-2xl font-tech text-white">{sortedGear.length}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col items-center shadow-lg">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Salvage Value</div>
                    <div className="text-[10px] text-slate-400 text-center leading-tight">Scrapping returns Resources</div>
                </div>
            </div>

            <div className="space-y-3">
                <AnimatePresence>
                    {sortedGear.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-600 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                            <PackageOpen size={48} className="mb-4 opacity-50" />
                            <div className="text-sm font-bold tracking-widest">INVENTORY EMPTY</div>
                            <div className="text-xs mt-1">Visit the Lab to craft new gear.</div>
                        </div>
                    ) : (
                        sortedGear.map(gear => {
                            const salvage = getSalvageValues(gear);
                            return (
                                <motion.div 
                                    key={gear.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={`bg-slate-900 border ${RARITY_CONFIG[gear.rarity].borderColor} p-4 rounded-lg flex flex-col group relative overflow-hidden transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.4)]`}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-r ${RARITY_CONFIG[gear.rarity].glowColor.replace('shadow-', 'from-')}/10 to-transparent pointer-events-none`} />
                                    
                                    <div className="flex items-start gap-4 relative z-10 w-full mb-3">
                                        <div className={`w-14 h-14 rounded bg-slate-950 flex items-center justify-center border ${RARITY_CONFIG[gear.rarity].borderColor} shrink-0 shadow-inner`}>
                                            {gear.type === 'BEAK' ? <Swords size={24} className={RARITY_CONFIG[gear.rarity].color} /> : <Wind size={24} className={RARITY_CONFIG[gear.rarity].color} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div className={`font-bold font-tech text-lg ${RARITY_CONFIG[gear.rarity].color} leading-none mb-1`}>{gear.name}</div>
                                                <div className={`text-[9px] px-1.5 py-0.5 rounded border bg-slate-950/50 ${RARITY_CONFIG[gear.rarity].borderColor} ${RARITY_CONFIG[gear.rarity].color}`}>
                                                    {RARITY_CONFIG[gear.rarity].name}
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 mt-2">
                                                <div className={`bg-slate-950/50 px-2 py-1 rounded border border-slate-800/50 ${RARITY_CONFIG[gear.rarity].color}`}>
                                                    ATK +{gear.attackBonus}
                                                </div>
                                                {gear.prefix && gear.paramValue && (
                                                    <div className="bg-slate-950/50 px-2 py-1 rounded text-cyan-400 border border-slate-800/50">
                                                        {getPrefixLabel(gear.prefix)} {gear.prefix === GearPrefix.QUALITY ? '+' : ''}{gear.paramValue}{gear.prefix === GearPrefix.QUALITY ? '' : '%'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stat Bonuses */}
                                    {gear.statBonuses && gear.statBonuses.length > 0 && (
                                         <div className="relative z-10 w-full mb-3">
                                              <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Bonus Stats</div>
                                              <div className="flex flex-wrap gap-2">
                                                  {gear.statBonuses.map((b, i) => (
                                                      <div key={i} className={`text-[10px] px-2 py-1 bg-slate-950 rounded border border-slate-800 ${RARITY_CONFIG[b.rarity].color} font-mono`}>
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
                                                             <div key={`${i}-${j}`} className={`text-[9px] ${RARITY_CONFIG[buff.rarity].color} flex items-center gap-1`}>
                                                                 <Zap size={8} /> +{buff.value}% {BUFF_LABELS[buff.stat]}
                                                             </div>
                                                        ))
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="relative z-10 w-full flex justify-end border-t border-slate-800 pt-3 mt-auto">
                                        <div className="flex items-center gap-4">
                                            <div className="text-[10px] text-right text-slate-600 group-hover:text-slate-400 transition-colors">
                                                +{salvage.scrap} SCRAP
                                            </div>
                                            <Button 
                                                size="sm" 
                                                variant="secondary" 
                                                className="border-slate-700 hover:border-rose-500 hover:bg-rose-900/20 group-hover:text-rose-400 px-3 py-1.5 h-auto"
                                                onClick={() => onSalvageGear(gear)}
                                            >
                                                <Trash2 size={14} />
                                                <span className="ml-2 text-[10px]">SCRAP</span>
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
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col items-center shadow-lg">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Total Gems</div>
                        <div className="text-2xl font-tech text-white">{sortedGems.length}</div>
                  </div>
                  {/* Salvage All Common Button (Always Visible if not empty) */}
                  <div className="flex flex-col justify-center">
                      <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={handleSalvageAllCommon}
                          disabled={!playerState.inventory.gems.some(g => g.rarity === Rarity.COMMON)}
                          className="h-full border-slate-800"
                      >
                          <div className="flex flex-col items-center gap-1">
                              <Trash2 size={16} className="text-slate-400" />
                              <span className="text-[10px]">SALVAGE ALL WHITE</span>
                          </div>
                      </Button>
                  </div>
              </div>
              
              {sortedGems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-600 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                      <Hexagon size={48} className="mb-4 opacity-50 text-purple-400" />
                      <div className="text-sm font-bold tracking-widest">GEM STORAGE EMPTY</div>
                      <div className="text-xs mt-1">Battle enemies to find Gems.</div>
                  </div>
              ) : (
                  <div className="space-y-2">
                      {/* Selection Hint */}
                      {!isSelectionMode && (
                          <div className="text-center text-[10px] text-slate-500 mb-2 italic">
                              Long press any gem to manage selection
                          </div>
                      )}

                      <div className="grid grid-cols-3 gap-3">
                          {sortedGems.map(gem => {
                              const isSelected = selectedGemIds.has(gem.id);
                              
                              return (
                                  <div 
                                    key={gem.id} 
                                    className={`
                                        bg-slate-900 border p-3 rounded-lg flex flex-col items-center text-center relative overflow-hidden transition-all cursor-pointer select-none
                                        ${isSelected ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] scale-95' : RARITY_CONFIG[gem.rarity].borderColor}
                                        ${isSelectionMode && !isSelected ? 'opacity-60 grayscale-[0.5]' : ''}
                                    `}
                                    onPointerDown={() => handleGemInteractionStart(gem.id)}
                                    onPointerUp={handleGemInteractionEnd}
                                    onPointerLeave={handleGemInteractionEnd}
                                    onClick={() => handleGemClick(gem.id)}
                                  >
                                       {isSelected && (
                                           <div className="absolute top-1 right-1 z-20">
                                               <div className="w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center shadow-md">
                                                   <Check size={10} className="text-black stroke-[3]" />
                                               </div>
                                           </div>
                                       )}

                                       <div className={`absolute inset-0 bg-gradient-to-b ${RARITY_CONFIG[gem.rarity].glowColor.replace('shadow-', 'from-')}/5 to-transparent pointer-events-none`} />
                                       <Hexagon size={24} className={`mb-2 ${RARITY_CONFIG[gem.rarity].color} drop-shadow-md`} />
                                       <div className={`font-bold font-tech text-xs ${RARITY_CONFIG[gem.rarity].color} truncate w-full mb-1`}>{gem.name}</div>
                                       <div className="w-full text-[9px] text-slate-300 space-y-0.5 bg-slate-950/30 p-1 rounded">
                                           {gem.buffs.map((b, i) => (
                                               <div key={i} className="truncate">+{b.value}% {BUFF_LABELS[b.stat]}</div>
                                           ))}
                                        </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'consumables' && (
          <div className="space-y-6">
              {[ConsumableType.HUNTING_SPEED, ConsumableType.BATTLE_REWARD].map(type => {
                  const items = sortedConsumables.filter(c => c.type === type);
                  const info = CONSUMABLE_STATS[type];
                  
                  return (
                      <div key={type} className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg">
                          <div className="flex items-start gap-4 mb-4 border-b border-slate-800 pb-4">
                              <div className="w-12 h-12 bg-slate-800 rounded flex items-center justify-center shrink-0 border border-slate-700 shadow-inner">
                                  {type === ConsumableType.HUNTING_SPEED ? <Clock size={24} className="text-emerald-400" /> : <Award size={24} className="text-yellow-400" />}
                              </div>
                              <div>
                                  <div className="font-tech font-bold text-lg text-white">{info.name}</div>
                                  <div className="text-xs text-slate-400 max-w-[200px]">{info.description}</div>
                              </div>
                          </div>

                          {items.length === 0 ? (
                              <div className="text-center py-4 text-xs text-slate-500 italic bg-slate-950/50 rounded border border-dashed border-slate-800">
                                  None in inventory.
                              </div>
                          ) : (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {items.map(item => {
                                      const stats = info.stats[item.rarity];
                                      const label = type === ConsumableType.HUNTING_SPEED ? `${stats.duration}s` : `${stats.duration} Battles`;
                                      
                                      // Logic to check if item is usable based on active buff of the SAME TYPE
                                      const activeBuff = playerState.activeBuffs.find(b => b.type === item.type);
                                      let buttonText = "USE";
                                      let isBlocked = false;

                                      if (activeBuff) {
                                          if (activeBuff.rarity === item.rarity) {
                                              // Same type AND same rarity -> Stack
                                              buttonText = item.type === ConsumableType.HUNTING_SPEED ? "ADD TIME" : "ADD BATTLES";
                                          } else {
                                              // Same type BUT different rarity -> Block
                                              buttonText = "STAND BY";
                                              isBlocked = true;
                                          }
                                      }

                                      return (
                                          <div key={item.rarity} className={`bg-slate-950 p-3 rounded border ${RARITY_CONFIG[item.rarity].borderColor} relative flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow ${isBlocked ? 'opacity-50 grayscale' : ''}`}>
                                              <div>
                                                  <div className={`text-[10px] font-bold uppercase mb-1 ${RARITY_CONFIG[item.rarity].color} bg-slate-900/50 inline-block px-1 rounded`}>{RARITY_CONFIG[item.rarity].name}</div>
                                                  <div className="text-xs text-white font-mono mb-2">
                                                      <div className="font-bold text-sm">{stats.mult}x Effect</div>
                                                      <div className="text-slate-400 text-[10px]">{label}</div>
                                                  </div>
                                              </div>
                                              <div className="mt-2 flex justify-between items-center bg-slate-900/50 p-1 rounded">
                                                  <div className="text-xs font-bold text-slate-400 ml-1">x{item.count}</div>
                                                  <Button 
                                                    size="sm" 
                                                    className="px-3 py-1 h-auto text-[10px]" 
                                                    onClick={() => onUseConsumable && onUseConsumable(type, item.rarity)}
                                                    disabled={isBlocked}
                                                    title={isBlocked ? "Cannot use different rarity while active" : "Use Item"}
                                                  >
                                                      {buttonText}
                                                  </Button>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                  )
              })}
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
                          <button onClick={() => setSocketTarget(null)}><X size={20} className="text-slate-500 hover:text-white" /></button>
                      </div>
                      
                      {sortedGems.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                              No gems available.
                          </div>
                      ) : (
                          <div className="overflow-y-auto custom-scrollbar space-y-2 pr-2">
                              {sortedGems.map(gem => (
                                  <button 
                                    key={gem.id}
                                    onClick={() => handleGemSelect(gem.id)}
                                    className={`w-full p-3 rounded border flex items-center gap-3 bg-slate-950 hover:bg-slate-800 transition-colors ${RARITY_CONFIG[gem.rarity].borderColor} group`}
                                  >
                                      <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:border-white/20">
                                          <Hexagon size={16} className={RARITY_CONFIG[gem.rarity].color} />
                                      </div>
                                      <div className="text-left flex-1">
                                          <div className={`font-bold text-sm ${RARITY_CONFIG[gem.rarity].color}`}>{gem.name}</div>
                                          <div className="text-[10px] text-slate-300">
                                              {gem.buffs.map(b => `+${b.value}% ${BUFF_LABELS[b.stat]}`).join(', ')}
                                          </div>
                                      </div>
                                      <div className="bg-cyan-900/30 text-cyan-400 text-[10px] font-bold px-2 py-1 rounded border border-cyan-500/30">
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

      {/* Gem Selection Mode Bottom Bar */}
      <AnimatePresence>
          {isSelectionMode && activeTab === 'gems' && (
              <motion.div 
                  initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                  className="fixed bottom-24 left-4 right-4 z-50 max-w-4xl mx-auto"
              >
                  <div className="bg-slate-900 border border-slate-700 shadow-2xl p-3 rounded-xl flex items-center justify-between gap-4">
                      <div className="text-sm font-bold text-white px-2">
                          {selectedGemIds.size} Selected
                      </div>
                      <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={cancelSelectionMode}>CANCEL</Button>
                          <Button 
                              size="sm" 
                              variant="danger" 
                              disabled={selectedGemIds.size === 0}
                              onClick={() => {
                                  const gems = playerState.inventory.gems.filter(g => selectedGemIds.has(g.id));
                                  prepareBatchSalvage(gems);
                              }}
                          >
                              <Trash2 size={16} className="mr-2" /> SALVAGE
                          </Button>
                      </div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
          {confirmModalData && (
              <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
              >
                  <motion.div 
                      initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                      className="bg-slate-900 border-2 border-rose-900 p-6 rounded-2xl max-w-sm w-full shadow-2xl"
                  >
                      <div className="flex flex-col items-center text-center">
                          <div className="w-16 h-16 rounded-full bg-rose-900/20 flex items-center justify-center mb-4 border border-rose-800">
                              <ShieldAlert size={32} className="text-rose-500" />
                          </div>
                          <h3 className="font-tech text-2xl text-white mb-2 uppercase">Confirm Salvage</h3>
                          <p className="text-slate-400 text-sm mb-6">
                              Are you sure you want to destroy 
                              <strong className="text-white ml-1">{confirmModalData.gems.length} Gems</strong>?
                              <br/>This action cannot be undone.
                          </p>

                          <div className="bg-slate-950 p-4 rounded-lg w-full mb-6 border border-slate-800">
                              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2 text-center">Resources Returned</div>
                              <div className="flex justify-center gap-6">
                                  <div className="flex flex-col items-center">
                                      <span className="text-cyan-400 font-mono font-bold text-xl">+{confirmModalData.totalFeathers}</span>
                                      <span className="text-[9px] text-slate-500 uppercase">Feathers</span>
                                  </div>
                                  <div className="w-px bg-slate-800 h-8 self-center" />
                                  <div className="flex flex-col items-center">
                                      <span className="text-slate-300 font-mono font-bold text-xl">+{confirmModalData.totalScrap}</span>
                                      <span className="text-[9px] text-slate-500 uppercase">Scrap</span>
                                  </div>
                              </div>
                          </div>

                          <div className="flex gap-3 w-full">
                              <Button fullWidth variant="ghost" onClick={() => setConfirmModalData(null)}>CANCEL</Button>
                              <Button fullWidth variant="danger" onClick={handleConfirmSalvage}>CONFIRM</Button>
                          </div>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};
