
import React, { useState } from 'react';
import { PlayerState, GearType, Gear, Gem } from '../types';
import { UPGRADE_COSTS, RARITY_CONFIG, BUFF_LABELS, ROSTER_BASE_CAPACITY } from '../constants';
import { Button } from './Button';
import { Card } from './Card';
import { Swords, Wind, Star, Hammer, X, Trash2, Database, Hexagon, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LabViewProps {
  playerState: PlayerState;
  onUpgrade: (type: 'click' | 'passive' | 'recruit') => void;
  onTryCraft: (type: GearType) => Gear | null;
  onTryCraftGem: () => Gem | null; // New
  onKeepGear: (gear: Gear) => void;
  onSalvageGear: (gear: Gear) => void;
  onKeepGem: (gem: Gem) => void; // New
  onSalvageGem: (gem: Gem) => void; // New
}

export const LabView: React.FC<LabViewProps> = ({ playerState, onUpgrade, onTryCraft, onTryCraftGem, onKeepGear, onSalvageGear, onKeepGem, onSalvageGem }) => {
  const canCraft = playerState.feathers >= UPGRADE_COSTS.CRAFT_GEAR && playerState.scrap >= UPGRADE_COSTS.CRAFT_SCRAP;
  const canCraftGem = playerState.feathers >= UPGRADE_COSTS.CRAFT_GEM && playerState.scrap >= UPGRADE_COSTS.CRAFT_GEM_SCRAP;
  
  const [craftedPreview, setCraftedPreview] = useState<Gear | Gem | null>(null);

  const currentCapacity = ROSTER_BASE_CAPACITY + playerState.upgrades.rosterCapacityLevel;
  const isRosterFull = playerState.birds.length >= currentCapacity;

  const handleCraftClick = (type: GearType) => {
      const gear = onTryCraft(type);
      if (gear) setCraftedPreview(gear);
  };

  const handleCraftGemClick = () => {
      const gem = onTryCraftGem();
      if (gem) setCraftedPreview(gem);
  };

  const isGear = (item: Gear | Gem): item is Gear => {
      return (item as Gear).type !== undefined;
  };

  const handleDecision = (keep: boolean) => {
      if (!craftedPreview) return;
      
      if (isGear(craftedPreview)) {
          if (keep) onKeepGear(craftedPreview);
          else onSalvageGear(craftedPreview);
      } else {
          if (keep) onKeepGem(craftedPreview as Gem);
          else onSalvageGem(craftedPreview as Gem);
      }
      setCraftedPreview(null);
  };

  const getSalvageValues = (item: Gear | Gem) => {
     const config = RARITY_CONFIG[item.rarity];
     if (isGear(item)) {
         return {
             feathers: Math.floor(UPGRADE_COSTS.CRAFT_GEAR * 0.3),
             scrap: Math.floor(UPGRADE_COSTS.CRAFT_SCRAP * 0.5 * config.minMult)
         };
     } else {
         return {
             feathers: Math.floor(UPGRADE_COSTS.CRAFT_GEM * 0.3),
             scrap: Math.floor(UPGRADE_COSTS.CRAFT_GEM_SCRAP * 0.5 * config.minMult)
         };
     }
  };

  return (
    <div className="space-y-6 pb-20 relative">
      
      {/* Recruitment */}
      <Card variant="glass" className="clip-tech border-l-4 border-l-yellow-500">
          <h2 className="font-tech text-xl text-yellow-400 mb-4 flex items-center gap-2">
            <Star size={20} /> SIGNAL SCANNING
          </h2>
          <div className="flex justify-between items-center">
             <div>
                 <div className="text-sm font-bold text-white">Scan for Bio-Signatures</div>
                 <div className="text-xs text-slate-400 max-w-[200px]">
                     {isRosterFull 
                        ? `Habitat Capacity Reached (${currentCapacity}). Upgrade habitat to recruit more.` 
                        : "Locate and attempt to capture a new bird unit."}
                 </div>
             </div>
             <Button 
                onClick={() => onUpgrade('recruit')}
                disabled={playerState.feathers < UPGRADE_COSTS.RECRUIT || isRosterFull}
                size="sm"
             >
                {isRosterFull ? 'FULL' : `${UPGRADE_COSTS.RECRUIT} F`}
             </Button>
          </div>
      </Card>

      {/* Workshop */}
      <Card className="border-l-4 border-l-rose-500">
          <h2 className="font-tech text-xl text-rose-400 mb-4 flex items-center gap-2">
            <Hammer size={20} /> WORKSHOP
          </h2>
          <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleCraftClick(GearType.BEAK)}
                disabled={!canCraft}
                className="bg-slate-950 p-4 rounded border border-slate-800 hover:border-cyan-500 transition-all flex flex-col items-center gap-2 group disabled:opacity-50"
              >
                  <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-cyan-900/30 flex items-center justify-center text-cyan-400 transition-colors">
                      <Swords size={20} />
                  </div>
                  <div className="font-tech font-bold">CRAFT BEAK</div>
                  <div className="text-xs text-slate-500 flex flex-col items-center">
                      <span>{UPGRADE_COSTS.CRAFT_GEAR} Feathers</span>
                      <span className="text-slate-400">+ {UPGRADE_COSTS.CRAFT_SCRAP} Scrap</span>
                  </div>
              </button>

              <button 
                onClick={() => handleCraftClick(GearType.CLAWS)}
                disabled={!canCraft}
                className="bg-slate-950 p-4 rounded border border-slate-800 hover:border-rose-500 transition-all flex flex-col items-center gap-2 group disabled:opacity-50"
              >
                  <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-rose-900/30 flex items-center justify-center text-rose-400 transition-colors">
                      <Wind size={20} />
                  </div>
                  <div className="font-tech font-bold">CRAFT CLAWS</div>
                  <div className="text-xs text-slate-500 flex flex-col items-center">
                      <span>{UPGRADE_COSTS.CRAFT_GEAR} Feathers</span>
                      <span className="text-slate-400">+ {UPGRADE_COSTS.CRAFT_SCRAP} Scrap</span>
                  </div>
              </button>
          </div>
      </Card>

      {/* Gemforge */}
      <Card className="border-l-4 border-l-purple-500">
          <h2 className="font-tech text-xl text-purple-400 mb-4 flex items-center gap-2">
            <Hexagon size={20} /> GEMFORGE
          </h2>
          <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={handleCraftGemClick}
                disabled={!canCraftGem}
                className="bg-slate-950 p-4 rounded border border-slate-800 hover:border-purple-500 transition-all flex items-center justify-between group disabled:opacity-50"
              >
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-purple-900/30 flex items-center justify-center text-purple-400 transition-colors border border-purple-500/30">
                          <Zap size={24} />
                      </div>
                      <div className="text-left">
                          <div className="font-tech font-bold text-lg text-white group-hover:text-purple-300">SYNTHESIZE GEM</div>
                          <div className="text-xs text-slate-500">Create power crystals for gear sockets</div>
                      </div>
                  </div>
                  <div className="text-xs text-right text-slate-400">
                      <div className="flex items-center gap-1 justify-end"><Database size={12}/> {UPGRADE_COSTS.CRAFT_GEM}</div>
                      <div className="flex items-center gap-1 justify-end text-slate-500"><Hammer size={12}/> {UPGRADE_COSTS.CRAFT_GEM_SCRAP}</div>
                  </div>
              </button>
          </div>
      </Card>

      {/* Crafting Result Modal */}
      <AnimatePresence>
          {craftedPreview && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
              >
                  <motion.div 
                    initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-sm w-full relative flex flex-col items-center shadow-2xl"
                  >
                      <h3 className="text-2xl font-tech text-white mb-2">FABRICATION COMPLETE</h3>
                      
                      <div className="my-8 flex flex-col items-center w-full">
                          <div className={`w-24 h-24 rounded-full bg-slate-950 border-4 flex items-center justify-center mb-4 ${RARITY_CONFIG[craftedPreview.rarity].borderColor} ${RARITY_CONFIG[craftedPreview.rarity].glowColor}`}>
                                {isGear(craftedPreview) ? (
                                    craftedPreview.type === GearType.BEAK ? <Swords size={40} className={RARITY_CONFIG[craftedPreview.rarity].color} /> : <Wind size={40} className={RARITY_CONFIG[craftedPreview.rarity].color} />
                                ) : (
                                    <Hexagon size={40} className={RARITY_CONFIG[craftedPreview.rarity].color} />
                                )}
                          </div>
                          <div className={`text-xl font-bold font-tech ${RARITY_CONFIG[craftedPreview.rarity].color}`}>{craftedPreview.name}</div>
                          <div className="text-sm font-bold uppercase tracking-widest text-slate-500">{RARITY_CONFIG[craftedPreview.rarity].name} TIER</div>
                          
                          {isGear(craftedPreview) ? (
                              <>
                                  <div className="mt-4 grid grid-cols-2 gap-4 text-center w-full mb-4">
                                      <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                          <div className="text-[10px] text-slate-500 uppercase">ATK Bonus</div>
                                          <div className="text-xl font-mono text-white">+{craftedPreview.attackBonus}</div>
                                      </div>
                                      <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                          <div className="text-[10px] text-slate-500 uppercase">{craftedPreview.type === GearType.BEAK ? 'Crit Chance' : 'Bleed Dmg'}</div>
                                          <div className="text-xl font-mono text-cyan-400">{craftedPreview.effectValue}%</div>
                                      </div>
                                  </div>

                                  {/* Gear Stat Bonuses */}
                                  {craftedPreview.statBonuses && craftedPreview.statBonuses.length > 0 && (
                                      <div className="w-full bg-slate-950/50 p-3 rounded border border-slate-800 mb-2">
                                          <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Stat Boosts</div>
                                          <div className="grid grid-cols-2 gap-2">
                                              {craftedPreview.statBonuses.map((bonus, i) => (
                                                  <div key={i} className={`text-xs font-mono font-bold flex justify-between text-slate-300`}>
                                                      <span>{BUFF_LABELS[bonus.stat] || bonus.stat}</span>
                                                      <span>+{bonus.value}</span>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  )}

                                  {/* Sockets Visual */}
                                  {craftedPreview.sockets && craftedPreview.sockets.length > 0 && (
                                        <div className="flex items-center gap-2 mb-4 bg-slate-950/50 px-4 py-2 rounded-full border border-slate-800">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase mr-2">Open Sockets</span>
                                            {craftedPreview.sockets.map((_, i) => (
                                                <div key={i} className="w-4 h-4 rounded-full border border-slate-500 bg-slate-800" />
                                            ))}
                                        </div>
                                  )}
                              </>
                          ) : (
                              // Gem Buffs
                              <div className="w-full bg-slate-950/50 p-3 rounded border border-slate-800 mt-4 mb-2">
                                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Utility Buffs</div>
                                  <div className="space-y-1">
                                      {(craftedPreview as Gem).buffs.map((buff, i) => (
                                          <div key={i} className={`text-xs font-mono font-bold flex justify-between ${RARITY_CONFIG[buff.rarity].color}`}>
                                              <span>{BUFF_LABELS[buff.stat] || buff.stat}</span>
                                              <span>+{buff.value}%</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="flex gap-3 w-full">
                          <Button fullWidth variant="secondary" onClick={() => handleDecision(false)}>
                              <div className="flex flex-col items-center">
                                  <span className="flex items-center gap-2"><Trash2 size={16} /> SALVAGE</span>
                                  <span className="text-[9px] text-slate-400">+{getSalvageValues(craftedPreview).scrap} Scrap</span>
                              </div>
                          </Button>
                          <Button fullWidth onClick={() => handleDecision(true)}>
                               <span className="flex items-center gap-2"><Database size={16} /> KEEP</span>
                          </Button>
                      </div>

                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};
