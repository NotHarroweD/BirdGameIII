
import React, { useState } from 'react';
import { PlayerState, GearType, Gear, Gem, UpgradeState, UnlocksState, GearPrefix, Rarity } from '../types';
import { UPGRADE_COSTS, RARITY_CONFIG, BUFF_LABELS, ROSTER_BASE_CAPACITY } from '../constants';
import { Button } from './Button';
import { Card } from './Card';
import { Swords, Wind, Star, Hammer, X, Trash2, Database, Hexagon, Zap, Lock, ArrowUpCircle, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LabViewProps {
  playerState: PlayerState;
  onUpgrade: (type: keyof UpgradeState | 'recruit') => void;
  onTryCraft: (type: GearType) => Gear | null;
  onTryCraftGem: () => Gem | null; 
  onKeepGear: (gear: Gear) => void;
  onSalvageGear: (gear: Gear) => void;
  onKeepGem: (gem: Gem) => void; 
  onSalvageGem: (gem: Gem) => void; 
  onUnlockFeature: (feature: keyof UnlocksState) => void;
}

export const LabView: React.FC<LabViewProps> = ({ 
    playerState, 
    onUpgrade, 
    onTryCraft, 
    onTryCraftGem, 
    onKeepGear, 
    onSalvageGear, 
    onKeepGem, 
    onSalvageGem,
    onUnlockFeature
}) => {
  const canCraft = playerState.feathers >= UPGRADE_COSTS.CRAFT_GEAR && playerState.scrap >= UPGRADE_COSTS.CRAFT_SCRAP;
  const canCraftGem = playerState.feathers >= UPGRADE_COSTS.CRAFT_GEM && playerState.scrap >= UPGRADE_COSTS.CRAFT_GEM_SCRAP;
  
  const [craftedPreview, setCraftedPreview] = useState<Gear | Gem | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [displayRarity, setDisplayRarity] = useState<Rarity>(Rarity.COMMON);

  const RARITY_ORDER = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.MYTHIC];

  const currentCapacity = ROSTER_BASE_CAPACITY + playerState.upgrades.rosterCapacityLevel;
  const isRosterFull = playerState.birds.length >= currentCapacity;

  const triggerRevealAnimation = (finalRarity: Rarity) => {
      setIsRevealing(true);
      setDisplayRarity(Rarity.COMMON);
      
      const finalIndex = RARITY_ORDER.indexOf(finalRarity);
      let count = 0;
      // Dramatic effect: Higher rarity = longer spin
      // Common: 15 steps. Mythic: 40 steps.
      const totalSteps = 15 + (finalIndex * 6); 
      let delay = 30; // Start super fast

      const nextStep = () => {
          count++;
          
          // Flash colors randomly during spin
          const randomRarity = RARITY_ORDER[Math.floor(Math.random() * RARITY_ORDER.length)];
          setDisplayRarity(randomRarity);

          if (count >= totalSteps) {
              // LANDING
              setDisplayRarity(finalRarity);
              setIsRevealing(false);
              return;
          }

          // Friction / Slowdown logic
          if (count > totalSteps - 6) {
              delay *= 1.3; // Dramatic finish
          } else if (count > totalSteps - 15) {
              delay *= 1.1; // Slowing down
          }

          setTimeout(nextStep, delay);
      };

      nextStep();
  };

  const handleCraftClick = (type: GearType) => {
      const gear = onTryCraft(type);
      if (gear) {
          setCraftedPreview(gear);
          triggerRevealAnimation(gear.rarity);
      }
  };

  const handleCraftGemClick = () => {
      const gem = onTryCraftGem();
      if (gem) {
          setCraftedPreview(gem);
          triggerRevealAnimation(gem.rarity);
      }
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

  const getPrefixLabel = (prefix?: GearPrefix) => {
      if (prefix === GearPrefix.QUALITY) return 'Extra Atk';
      if (prefix === GearPrefix.SHARP) return 'Bleed Dmg';
      if (prefix === GearPrefix.GREAT) return 'Crit Chance';
      return '';
  };

  // Helper for rendering locked features
  const renderUnlockCard = (title: string, desc: string, icon: React.ReactNode, costFeathers: number, costScrap: number, onUnlock: () => void) => (
      <div className="bg-slate-900 border border-slate-800 rounded p-6 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.5)_10px,rgba(0,0,0,0.5)_20px)] opacity-50" />
          <div className="relative z-10 flex flex-col items-center w-full">
              <div className="mb-4 text-slate-500">{icon}</div>
              <h3 className="font-tech text-xl text-slate-300 mb-1">{title}</h3>
              <p className="text-xs text-slate-500 mb-4 max-w-[200px]">{desc}</p>
              
              <div className="text-xs text-slate-400 mb-4 flex gap-4">
                  <span className={`flex items-center gap-1 font-mono font-bold ${playerState.feathers >= costFeathers ? 'text-cyan-400' : 'text-rose-500'}`}>
                      <Database size={12} /> {costFeathers}
                  </span>
                  <span className={`flex items-center gap-1 font-mono font-bold ${playerState.scrap >= costScrap ? 'text-slate-300' : 'text-rose-500'}`}>
                      <Hammer size={12} /> {costScrap}
                  </span>
              </div>
              <Button 
                  onClick={onUnlock} 
                  disabled={playerState.feathers < costFeathers || playerState.scrap < costScrap}
                  size="sm"
                  fullWidth
              >
                  UNLOCK FACILITY
              </Button>
          </div>
      </div>
  );

  return (
    <div className="space-y-6 pb-20 relative animate-in fade-in duration-500">
      
      {/* Recruitment - Always Available */}
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

      {/* Workshop - Beaks */}
      {(playerState.highestZone >= 2 || playerState.unlocks.workshop) && (
          <div className="border-t border-slate-800 pt-4">
              {playerState.unlocks.workshop ? (
                  <>
                    <h2 className="font-tech text-xl text-rose-400 mb-4 flex items-center gap-2">
                        <Hammer size={20} /> WORKSHOP
                    </h2>
                    <Card className="border-l-4 border-l-rose-500">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Beak Crafting - Available immediately with Workshop */}
                            <button 
                                onClick={() => handleCraftClick(GearType.BEAK)}
                                disabled={!canCraft}
                                className="bg-slate-950 p-4 rounded border border-slate-800 hover:border-cyan-500 transition-all flex flex-col items-center gap-2 group disabled:opacity-50"
                            >
                                <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-cyan-900/30 flex items-center justify-center text-cyan-400 transition-colors">
                                    <Swords size={20} />
                                </div>
                                <div className="font-tech font-bold">CRAFT BEAK</div>
                                <div className="text-xs text-slate-500 flex flex-col items-center gap-1">
                                    <span className="flex items-center gap-1"><Database size={12}/> {UPGRADE_COSTS.CRAFT_GEAR}</span>
                                    <span className="flex items-center gap-1 text-slate-400"><Hammer size={12}/> {UPGRADE_COSTS.CRAFT_SCRAP}</span>
                                </div>
                            </button>

                            {/* Claws Crafting - Locked until Zone 3 + Unlock Purchase */}
                            {(!playerState.unlocks.clawCrafting) ? (
                                playerState.highestZone >= 3 ? (
                                    <button 
                                        className="bg-slate-950 p-4 rounded border border-slate-800 flex flex-col items-center gap-2 hover:bg-slate-900 group"
                                        onClick={() => onUnlockFeature('clawCrafting')}
                                        disabled={playerState.feathers < 100 || playerState.scrap < 25}
                                    >
                                        <Lock size={20} className="text-slate-500 group-hover:text-rose-400" />
                                        <div className="font-tech font-bold text-slate-400 text-sm group-hover:text-white">UNLOCK CLAWS</div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 group-hover:text-rose-400">
                                            <span className="flex items-center gap-1"><Database size={10}/> 100</span>
                                            <span className="flex items-center gap-1"><Hammer size={10}/> 25</span>
                                        </div>
                                    </button>
                                ) : (
                                    // Placeholder for when Workshop is unlocked but Zone 3 not reached
                                    <div className="bg-slate-950 p-4 rounded border border-slate-800 flex flex-col items-center gap-2 opacity-50">
                                        <Lock size={20} className="text-slate-600" />
                                        <div className="font-tech font-bold text-slate-600 text-sm">UNKNOWN</div>
                                        <div className="text-[10px] text-slate-700">REQ: ZONE 3</div>
                                    </div>
                                )
                            ) : (
                                <button 
                                    onClick={() => handleCraftClick(GearType.CLAWS)}
                                    disabled={!canCraft}
                                    className="bg-slate-950 p-4 rounded border border-slate-800 hover:border-rose-500 transition-all flex flex-col items-center gap-2 group disabled:opacity-50"
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-rose-900/30 flex items-center justify-center text-rose-400 transition-colors">
                                        <Wind size={20} />
                                    </div>
                                    <div className="font-tech font-bold">CRAFT CLAWS</div>
                                    <div className="text-xs text-slate-500 flex flex-col items-center gap-1">
                                        <span className="flex items-center gap-1"><Database size={12}/> {UPGRADE_COSTS.CRAFT_GEAR}</span>
                                        <span className="flex items-center gap-1 text-slate-400"><Hammer size={12}/> {UPGRADE_COSTS.CRAFT_SCRAP}</span>
                                    </div>
                                </button>
                            )}
                        </div>
                    </Card>
                  </>
              ) : (
                  renderUnlockCard("GEAR WORKSHOP", "Craft Beak equipment to boost your birds.", <Hammer size={32}/>, 50, 10, () => onUnlockFeature('workshop'))
              )}
          </div>
      )}

      {/* Gemforge - Requires Zone 4 */}
      {(playerState.highestZone >= 4 || playerState.unlocks.gemCrafting) && (
          <div className="border-t border-slate-800 pt-4">
              {playerState.unlocks.gemCrafting ? (
                  <>
                    <h2 className="font-tech text-xl text-purple-400 mb-4 flex items-center gap-2">
                        <Hexagon size={20} /> GEMFORGE
                    </h2>
                    <Card className="border-l-4 border-l-purple-500">
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
                  </>
              ) : (
                  renderUnlockCard("GEM SYNTHESIS", "Unlock the Gemforge to synthesize powerful socketable gems.", <Hexagon size={32}/>, 500, 100, () => onUnlockFeature('gemCrafting'))
              )}
          </div>
      )}

      {/* Upgrades Access - Requires Zone 5 */}
      {!playerState.unlocks.upgrades && playerState.highestZone >= 5 && (
          <div className="border-t border-slate-800 pt-4">
              {renderUnlockCard(
                  "CYBERNETICS LAB", 
                  "Access system-wide efficiency upgrades (Unlocks Upgrade Tab).", 
                  <ArrowUpCircle size={32}/>, 
                  1000, 
                  200, 
                  () => onUnlockFeature('upgrades')
              )}
          </div>
      )}

      {/* Achievements Access - Requires Zone 6 */}
      {!playerState.unlocks.achievements && playerState.highestZone >= 6 && (
          <div className="border-t border-slate-800 pt-4">
              {renderUnlockCard(
                  "HALL OF GLORY", 
                  "Track milestones and earn AP (Unlocks Glory Tab).", 
                  <Trophy size={32}/>, 
                  0, 
                  0, 
                  () => onUnlockFeature('achievements')
              )}
          </div>
      )}

      {/* Crafting Result Modal */}
      <AnimatePresence>
          {craftedPreview && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              >
                  <motion.div 
                    initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-sm w-full relative flex flex-col items-center shadow-2xl max-h-[80vh] overflow-y-auto"
                  >
                      <h3 className="text-2xl font-tech text-white mb-2 text-center">
                          {isRevealing ? (
                              <span className="animate-pulse text-cyan-400 tracking-widest">SYNTHESIZING...</span>
                          ) : (
                              "FABRICATION COMPLETE"
                          )}
                      </h3>
                      
                      <div className="my-6 flex flex-col items-center w-full">
                          {/* Animated Icon Container */}
                          <motion.div 
                               animate={isRevealing ? { scale: [1, 1.1, 1] } : { scale: 1.1, rotate: [0, -5, 5, 0] }}
                               transition={isRevealing ? { duration: 0.1, repeat: Infinity } : { type: "spring", bounce: 0.5 }}
                               className={`w-28 h-28 rounded-full bg-slate-950 border-4 flex items-center justify-center mb-6 shadow-2xl relative z-10 transition-colors duration-200 ${RARITY_CONFIG[displayRarity].borderColor} ${RARITY_CONFIG[displayRarity].glowColor}`}
                          >
                                {isGear(craftedPreview) ? (
                                    craftedPreview.type === GearType.BEAK ? <Swords size={48} className={RARITY_CONFIG[displayRarity].color} /> : <Wind size={48} className={RARITY_CONFIG[displayRarity].color} />
                                ) : (
                                    <Hexagon size={48} className={RARITY_CONFIG[displayRarity].color} />
                                )}
                          </motion.div>

                          {/* Name & Tier */}
                          <div className={`text-xl font-bold font-tech text-center leading-tight transition-all duration-200 ${isRevealing ? 'text-slate-500 blur-sm scale-90' : RARITY_CONFIG[displayRarity].color}`}>
                              {isRevealing ? 'UNKNOWN ITEM' : craftedPreview.name}
                          </div>
                          
                          <div className="text-sm font-bold uppercase tracking-widest text-slate-500 mt-2 transition-all">
                              {isRevealing ? 'CALCULATING QUALITY...' : `${RARITY_CONFIG[displayRarity].name} TIER`}
                          </div>
                          
                          {/* Stats Container - Hidden/Blurred during reveal */}
                          <div className={`w-full transition-all duration-500 ${isRevealing ? 'opacity-0 blur-md scale-95 pointer-events-none' : 'opacity-100 blur-0 scale-100'}`}>
                              {isGear(craftedPreview) ? (
                                  <>
                                      <div className="mt-4 grid grid-cols-2 gap-4 text-center w-full mb-4">
                                          <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                              <div className="text-[10px] text-slate-500 uppercase">ATK Bonus</div>
                                              <div className={`text-xl font-mono ${RARITY_CONFIG[craftedPreview.rarity].color}`}>+{craftedPreview.attackBonus}</div>
                                          </div>
                                          {craftedPreview.prefix && craftedPreview.paramValue && (
                                              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                                  <div className="text-[10px] text-slate-500 uppercase">{getPrefixLabel(craftedPreview.prefix)}</div>
                                                  <div className="text-xl font-mono text-cyan-400">
                                                      {craftedPreview.prefix === GearPrefix.QUALITY ? '+' : ''}{craftedPreview.paramValue}{craftedPreview.prefix === GearPrefix.QUALITY ? '' : '%'}
                                                  </div>
                                              </div>
                                          )}
                                      </div>

                                      {/* Gear Stat Bonuses */}
                                      {craftedPreview.statBonuses && craftedPreview.statBonuses.length > 0 && (
                                          <div className="w-full bg-slate-950/50 p-3 rounded border border-slate-800 mb-2">
                                              <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Stat Boosts</div>
                                              <div className="grid grid-cols-2 gap-2">
                                                  {craftedPreview.statBonuses.map((bonus, i) => (
                                                      <div key={i} className={`text-xs font-mono font-bold flex justify-between ${RARITY_CONFIG[bonus.rarity].color}`}>
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
                      </div>

                      <div className="flex gap-3 w-full mt-auto">
                          <Button fullWidth variant="secondary" onClick={() => handleDecision(false)} disabled={isRevealing}>
                              <div className="flex flex-col items-center">
                                  <span className="flex items-center gap-2"><Trash2 size={16} /> SALVAGE</span>
                                  <span className="text-[9px] text-slate-400">+{getSalvageValues(craftedPreview).scrap} Scrap</span>
                              </div>
                          </Button>
                          <Button fullWidth onClick={() => handleDecision(true)} disabled={isRevealing}>
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
