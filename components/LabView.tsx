
import React, { useState } from 'react';
import { PlayerState, GearType, Gear, Gem, UpgradeState, UnlocksState, GearPrefix, Rarity } from '../types';
import { UPGRADE_COSTS, RARITY_CONFIG, BUFF_LABELS, ROSTER_BASE_CAPACITY, getMaxCraftRarity } from '../constants';
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

  // Max Craft Rarity
  const maxGearRarity = getMaxCraftRarity(playerState.upgrades.craftRarityLevel);
  const maxGemRarity = getMaxCraftRarity(playerState.upgrades.gemRarityLevel);

  const triggerRevealAnimation = (finalRarity: Rarity) => {
      setIsRevealing(true);
      setDisplayRarity(Rarity.COMMON);
      
      const finalIndex = RARITY_ORDER.indexOf(finalRarity);
      let count = 0;
      // Dramatic effect: Higher rarity = longer spin
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
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-tech text-xl text-rose-400 flex items-center gap-2">
                            <Hammer size={20} /> WORKSHOP
                        </h2>
                        <div className="text-right">
                            <div className="text-[10px] text-slate-500 font-bold uppercase">Level {playerState.upgrades.craftRarityLevel}</div>
                            <div className={`text-xs font-bold ${RARITY_CONFIG[maxGearRarity].color}`}>Max: {RARITY_CONFIG[maxGearRarity].name}</div>
                        </div>
                    </div>
                    <Card className="border-l-4 border-l-rose-500">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Beak Crafting - Available immediately with Workshop */}
                            <button 
                                onClick={() => handleCraftClick(GearType.BEAK)}
                                disabled={!canCraft}
                                className="bg-slate-950 p-4 rounded border border-slate-800 hover:border-cyan-500 transition-all flex flex-col items-center gap-2 group disabled:opacity-50"
                            >
                                <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-cyan-900/30 flex items-center justify-center transition-colors">
                                    <Swords size={20} className="text-cyan-400" />
                                </div>
                                <div className="text-xs font-bold text-white">CRAFT BEAK</div>
                                <div className="text-[10px] text-slate-500 flex gap-2">
                                    <span className={playerState.feathers >= UPGRADE_COSTS.CRAFT_GEAR ? "text-slate-400" : "text-rose-500"}>{UPGRADE_COSTS.CRAFT_GEAR} F</span>
                                    <span className={playerState.scrap >= UPGRADE_COSTS.CRAFT_SCRAP ? "text-slate-400" : "text-rose-500"}>{UPGRADE_COSTS.CRAFT_SCRAP} S</span>
                                </div>
                            </button>

                            {/* Claw Crafting - Requires Unlock */}
                            {playerState.unlocks.clawCrafting ? (
                                <button 
                                    onClick={() => handleCraftClick(GearType.CLAWS)}
                                    disabled={!canCraft}
                                    className="bg-slate-950 p-4 rounded border border-slate-800 hover:border-cyan-500 transition-all flex flex-col items-center gap-2 group disabled:opacity-50"
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-cyan-900/30 flex items-center justify-center transition-colors">
                                        <Wind size={20} className="text-cyan-400" />
                                    </div>
                                    <div className="text-xs font-bold text-white">CRAFT CLAWS</div>
                                    <div className="text-[10px] text-slate-500 flex gap-2">
                                        <span className={playerState.feathers >= UPGRADE_COSTS.CRAFT_GEAR ? "text-slate-400" : "text-rose-500"}>{UPGRADE_COSTS.CRAFT_GEAR} F</span>
                                        <span className={playerState.scrap >= UPGRADE_COSTS.CRAFT_SCRAP ? "text-slate-400" : "text-rose-500"}>{UPGRADE_COSTS.CRAFT_SCRAP} S</span>
                                    </div>
                                </button>
                            ) : (
                                <button 
                                    onClick={() => onUnlockFeature('clawCrafting')}
                                    disabled={playerState.feathers < 100 || playerState.scrap < 25}
                                    className="bg-slate-900/50 p-4 rounded border border-dashed border-slate-800 hover:border-slate-600 transition-all flex flex-col items-center gap-2 group opacity-70"
                                >
                                    <Lock size={20} className="text-slate-600" />
                                    <div className="text-xs font-bold text-slate-500">UNLOCK CLAWS</div>
                                    <div className="text-[10px] text-slate-600">100 F / 25 S</div>
                                </button>
                            )}
                        </div>
                    </Card>
                  </>
              ) : (
                  renderUnlockCard(
                      'GEAR WORKSHOP', 
                      'Enables crafting of Beak weaponry.', 
                      <Hammer size={32} />, 
                      50, 
                      10, 
                      () => onUnlockFeature('workshop')
                  )
              )}
          </div>
      )}

      {/* Gemforge - Gems */}
      {(playerState.highestZone >= 4 || playerState.unlocks.gemCrafting) && (
          <div className="border-t border-slate-800 pt-4">
              {playerState.unlocks.gemCrafting ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-tech text-xl text-purple-400 flex items-center gap-2">
                            <Hexagon size={20} /> GEMFORGE
                        </h2>
                        <div className="text-right">
                            <div className="text-[10px] text-slate-500 font-bold uppercase">Level {playerState.upgrades.gemRarityLevel}</div>
                            <div className={`text-xs font-bold ${RARITY_CONFIG[maxGemRarity].color}`}>Max: {RARITY_CONFIG[maxGemRarity].name}</div>
                        </div>
                    </div>
                    <Card className="border-l-4 border-l-purple-500">
                        <button 
                            onClick={handleCraftGemClick}
                            disabled={!canCraftGem}
                            className="w-full bg-slate-950 p-4 rounded border border-slate-800 hover:border-purple-500 transition-all flex items-center justify-between group disabled:opacity-50"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-purple-900/30 flex items-center justify-center transition-colors">
                                    <Zap size={24} className="text-purple-400" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">SYNTHESIZE GEM</div>
                                    <div className="text-[10px] text-slate-400">Creates a random socketable gem.</div>
                                </div>
                            </div>
                            <div className="text-xs text-right font-mono">
                                <div className={playerState.feathers >= UPGRADE_COSTS.CRAFT_GEM ? "text-slate-300" : "text-rose-500"}>{UPGRADE_COSTS.CRAFT_GEM} F</div>
                                <div className={playerState.scrap >= UPGRADE_COSTS.CRAFT_GEM_SCRAP ? "text-slate-300" : "text-rose-500"}>{UPGRADE_COSTS.CRAFT_GEM_SCRAP} S</div>
                            </div>
                        </button>
                    </Card>
                  </>
              ) : (
                  renderUnlockCard(
                      'GEMFORGE', 
                      'Enables synthesis of powerful socketable gems.', 
                      <Hexagon size={32} />, 
                      500, 
                      100, 
                      () => onUnlockFeature('gemCrafting')
                  )
              )}
          </div>
      )}

      {/* Upgrades - Moved to separate tab, but link here if locked */}
      {playerState.highestZone >= 5 && !playerState.unlocks.upgrades && (
          <div className="border-t border-slate-800 pt-4">
              {renderUnlockCard(
                  'CYBERNETICS LAB', 
                  'Unlock advanced system upgrades.', 
                  <ArrowUpCircle size={32} />, 
                  1000, 
                  200, 
                  () => onUnlockFeature('upgrades')
              )}
          </div>
      )}

      {/* Achievements - Link here if locked */}
      {playerState.highestZone >= 6 && !playerState.unlocks.achievements && (
          <div className="border-t border-slate-800 pt-4">
              {renderUnlockCard(
                  'HALL OF GLORY', 
                  'Track milestones and earn AP.', 
                  <Trophy size={32} />, 
                  0, 
                  0, 
                  () => onUnlockFeature('achievements')
              )}
          </div>
      )}

      {/* CRAFTING RESULT MODAL */}
      <AnimatePresence>
          {craftedPreview && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
              >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                    className={`bg-slate-900 border-2 p-6 rounded-xl w-full max-w-sm relative flex flex-col items-center shadow-2xl ${RARITY_CONFIG[displayRarity].borderColor}`}
                  >
                      <h3 className="font-tech text-2xl text-white mb-6 animate-pulse uppercase tracking-widest text-center">
                          {isRevealing ? 'FABRICATING...' : 'FABRICATION COMPLETE'}
                      </h3>

                      {/* Icon */}
                      <div className={`w-24 h-24 rounded bg-slate-950 border-2 flex items-center justify-center mb-6 shadow-lg ${RARITY_CONFIG[displayRarity].borderColor}`}>
                          {isGear(craftedPreview) ? (
                              craftedPreview.type === GearType.BEAK 
                                ? <Swords size={48} className={RARITY_CONFIG[displayRarity].color} /> 
                                : <Wind size={48} className={RARITY_CONFIG[displayRarity].color} />
                          ) : (
                              <Hexagon size={48} className={RARITY_CONFIG[displayRarity].color} />
                          )}
                      </div>

                      {/* Item Details */}
                      <div className="w-full text-center mb-6">
                          {isRevealing ? (
                              <div className="flex flex-col items-center gap-2">
                                  <div className="w-full h-6 bg-slate-800 rounded animate-pulse" />
                                  <div className="w-1/2 h-4 bg-slate-800 rounded animate-pulse" />
                              </div>
                          ) : (
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                  <div className={`font-tech font-bold text-xl ${RARITY_CONFIG[craftedPreview.rarity].color} mb-1`}>
                                      {craftedPreview.name}
                                  </div>
                                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                                      {RARITY_CONFIG[craftedPreview.rarity].name} TIER
                                  </div>
                                  
                                  {isGear(craftedPreview) ? (
                                      <>
                                          {/* Stats Grid - Matching Roster Popup Layout */}
                                          <div className="w-full grid grid-cols-2 gap-4 mb-4">
                                              <div className="bg-slate-950 p-2 rounded border border-slate-800 text-center">
                                                  <div className="text-[10px] text-slate-500 uppercase font-bold">ATK Bonus</div>
                                                  <div className={`text-lg font-mono ${RARITY_CONFIG[craftedPreview.rarity].color}`}>+{craftedPreview.attackBonus}</div>
                                              </div>
                                              {craftedPreview.prefix && craftedPreview.paramValue ? (
                                                  <div className="bg-slate-950 p-2 rounded border border-slate-800 text-center">
                                                      <div className="text-[10px] text-slate-500 uppercase font-bold">{getPrefixLabel(craftedPreview.prefix)}</div>
                                                      <div className="text-lg font-mono text-cyan-400">
                                                          {craftedPreview.prefix === GearPrefix.QUALITY ? '+' : ''}{craftedPreview.paramValue}{craftedPreview.prefix === GearPrefix.QUALITY ? '' : '%'}
                                                      </div>
                                                  </div>
                                              ) : (
                                                  <div className="bg-slate-950 p-2 rounded border border-slate-800 text-center opacity-50">
                                                      <div className="text-[10px] text-slate-500 uppercase font-bold">Prefix</div>
                                                      <div className="text-lg font-mono text-slate-600">-</div>
                                                  </div>
                                              )}
                                          </div>

                                          {/* Stat Bonuses */}
                                          {craftedPreview.statBonuses.length > 0 && (
                                              <div className="w-full bg-slate-950/50 p-3 rounded border border-slate-800 mb-4">
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

                                          {/* Sockets */}
                                          {craftedPreview.sockets.length > 0 && (
                                              <div className="flex flex-col items-center gap-2 mb-4">
                                                  <div className="flex justify-center gap-2">
                                                      {craftedPreview.sockets.map((_, i) => (
                                                          <div key={i} className="w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-700 shadow-inner" />
                                                      ))}
                                                  </div>
                                                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Empty Socket{craftedPreview.sockets.length > 1 ? 's' : ''}</div>
                                              </div>
                                          )}
                                      </>
                                  ) : (
                                      // Gem Display
                                      <div className="w-full bg-slate-950/50 p-3 rounded border border-slate-800 mb-4">
                                          <div className="space-y-1">
                                              {(craftedPreview as Gem).buffs.map((b, i) => (
                                                  <div key={i} className={`flex justify-between font-mono text-xs ${RARITY_CONFIG[b.rarity].color}`}>
                                                      <span>{BUFF_LABELS[b.stat]}</span>
                                                      <span>+{b.value}%</span>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                              </motion.div>
                          )}
                      </div>

                      {/* Action Buttons */}
                      {!isRevealing && (
                          <div className="flex gap-3 w-full">
                              <Button fullWidth variant="danger" onClick={() => handleDecision(false)}>
                                  <div className="flex flex-col items-center leading-none py-1">
                                      <span className="flex items-center gap-2"><Trash2 size={14} /> SALVAGE</span>
                                      <span className="text-[9px] opacity-80 mt-1">+{getSalvageValues(craftedPreview).feathers} F / +{getSalvageValues(craftedPreview).scrap} S</span>
                                  </div>
                              </Button>
                              <Button fullWidth onClick={() => handleDecision(true)}>
                                  KEEP
                              </Button>
                          </div>
                      )}
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};
