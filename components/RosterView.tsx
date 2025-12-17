
import React, { useState, useEffect } from 'react';
import { PlayerState, BirdInstance, GearType, Rarity, Gear, Gem, ConsumableType, GearPrefix, StatType } from '../types';
import { RARITY_CONFIG, BUFF_LABELS, ROSTER_BASE_CAPACITY, UPGRADE_COSTS } from '../constants';
import { Button } from './Button';
import { Card } from './Card';
import { Swords, Wind, Shield, Heart, Zap, X, Target, Trash2, Eye, Hexagon, ArrowUpRight, Clock, Database, Hammer, Gem as GemIcon, Briefcase, ArrowUp, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getScaledStats } from './battle/utils';

interface RosterViewProps {
  playerState: PlayerState;
  onSelectBird: (id: string) => void;
  onEquip: (birdId: string, gearId: string) => void;
  onUnequip: (birdId: string, slot: 'beak' | 'claws') => void;
  onAssignHunter: (birdId: string) => void;
  onRecallHunter: (birdId: string) => void;
  onReleaseBird?: (bird: BirdInstance) => void;
  onSalvageGear: (gear: Gear) => void;
  onSocketGem: (gearId: string, gemId: string, socketIndex: number) => void;
  onUnsocketGem: (gearId: string, socketIndex: number) => void;
  onApplyLevelUpReward: (birdId: string, stat: StatType, value: number) => void;
}

export const RosterView: React.FC<RosterViewProps> = ({ 
    playerState, 
    onSelectBird, 
    onEquip, 
    onUnequip, 
    onAssignHunter, 
    onRecallHunter, 
    onReleaseBird,
    onSalvageGear,
    onSocketGem,
    onUnsocketGem,
    onApplyLevelUpReward
}) => {
  const selectedBird = playerState.birds.find(b => b.instanceId === playerState.selectedBirdId);
  const [equipSlot, setEquipSlot] = useState<'beak' | 'claws' | null>(null);
  
  // New States for Gear Details Modal
  const [viewingSlot, setViewingSlot] = useState<'beak' | 'claws' | null>(null);
  const viewingGear = (selectedBird && viewingSlot) ? selectedBird.gear[viewingSlot] : null;

  const [gemSelectionTarget, setGemSelectionTarget] = useState<{ gearId: string, socketIndex: number } | null>(null);
  
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);

  // Level Up Reward State
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [rewardOptions, setRewardOptions] = useState<{stat: StatType, value: number, label: string, rarity: Rarity}[]>([]);

  // Sync state if gear is removed/salvaged while viewing
  useEffect(() => {
     if (viewingSlot && selectedBird && !selectedBird.gear[viewingSlot]) {
         setViewingSlot(null);
         setGemSelectionTarget(null);
     }
  }, [selectedBird, viewingSlot]);

  // Generate rewards whenever the modal opens or selected bird changes (if points exist)
  useEffect(() => {
      if (showLevelUpModal && selectedBird && selectedBird.statPoints > 0) {
          generateLevelUpOptions();
      } else if (!showLevelUpModal) {
          setRewardOptions([]); // Clear on close
      }
  }, [showLevelUpModal, selectedBird?.instanceId]);

  const generateLevelUpOptions = () => {
        const stats: StatType[] = ['HP', 'ATK', 'DEF', 'SPD', 'NRG'];
        const options = [];
        
        for(let i=0; i<3; i++) {
            const stat = stats[Math.floor(Math.random() * stats.length)];
            
            // Roll Rarity for the Upgrade
            const roll = Math.random();
            let upgradeRarity = Rarity.COMMON;
            
            if (roll < 0.001) upgradeRarity = Rarity.MYTHIC;      // 0.1% Chance
            else if (roll < 0.005) upgradeRarity = Rarity.LEGENDARY; // 0.4% Chance
            else if (roll < 0.025) upgradeRarity = Rarity.EPIC;      // 2% Chance
            else if (roll < 0.105) upgradeRarity = Rarity.RARE;      // 8% Chance
            else if (roll < 0.355) upgradeRarity = Rarity.UNCOMMON;  // 25% Chance
            // else Common (64.5%)
            
            let min = 1;
            let max = 1;

            if (stat === 'HP' || stat === 'NRG') {
                // Pool Stats (HP/NRG) - Strictly Increasing Ranges
                if (upgradeRarity === Rarity.COMMON) { min = 5; max = 8; }
                else if (upgradeRarity === Rarity.UNCOMMON) { min = 9; max = 15; }
                else if (upgradeRarity === Rarity.RARE) { min = 16; max = 25; }
                else if (upgradeRarity === Rarity.EPIC) { min = 26; max = 40; }
                else if (upgradeRarity === Rarity.LEGENDARY) { min = 41; max = 60; }
                else if (upgradeRarity === Rarity.MYTHIC) { min = 61; max = 85; }
            } else {
                // Combat Stats (ATK/DEF/SPD) - Strictly Increasing Ranges
                if (upgradeRarity === Rarity.COMMON) { min = 1; max = 1; }
                else if (upgradeRarity === Rarity.UNCOMMON) { min = 2; max = 2; }
                else if (upgradeRarity === Rarity.RARE) { min = 3; max = 3; }
                else if (upgradeRarity === Rarity.EPIC) { min = 4; max = 5; }
                else if (upgradeRarity === Rarity.LEGENDARY) { min = 6; max = 7; }
                else if (upgradeRarity === Rarity.MYTHIC) { min = 8; max = 10; }
            }
            
            const val = Math.floor(min + Math.random() * (max - min + 1));
            const label = stat === 'HP' ? 'Max Health' : stat === 'ATK' ? 'Attack' : stat === 'DEF' ? 'Defense' : stat === 'SPD' ? 'Speed' : 'Max Energy';
            
            options.push({ stat, value: val, label, rarity: upgradeRarity });
        }
        setRewardOptions(options);
  };

  const handleSelectReward = (option: {stat: StatType, value: number}) => {
      if (selectedBird) {
          onApplyLevelUpReward(selectedBird.instanceId, option.stat, option.value);
          setShowLevelUpModal(false);
      }
  };

  const isHunting = selectedBird && playerState.huntingBirdIds.includes(selectedBird.instanceId);
  
  // Hunting Rate Calculation with Gear Boosts
  const calculateHuntingRate = (bird: BirdInstance) => {
      if (!bird) return 0;
      let baseRate = (bird.huntingConfig.baseRate * RARITY_CONFIG[bird.rarity].minMult * (1 + bird.level * 0.5));
      
      let bonusPct = 0;
      const addGemBuffs = (g: Gear | null) => {
           if (!g || !g.sockets) return;
           g.sockets.forEach(gem => {
               if (gem) {
                   gem.buffs.forEach(b => {
                       if (b.stat === 'HUNT_BONUS') bonusPct += b.value;
                   });
               }
           });
      };
      addGemBuffs(bird.gear.beak);
      addGemBuffs(bird.gear.claws);
      
      return baseRate * (1 + (bonusPct / 100));
  };

  const huntingRate = selectedBird ? calculateHuntingRate(selectedBird) : 0;

  const currentCapacity = ROSTER_BASE_CAPACITY + playerState.upgrades.rosterCapacityLevel;

  // Calculate combat stat bonuses from gear
  const getStatBonuses = () => {
      const bonuses = { atk: 0, hp: 0, def: 0, spd: 0, nrg: 0 };
      const addGear = (g: Gear | null) => {
          if (!g) return;
          bonuses.atk += g.attackBonus || 0;
          if (g.prefix === GearPrefix.QUALITY && g.paramValue) {
              bonuses.atk += g.paramValue;
          }
          if (g.statBonuses) {
              g.statBonuses.forEach(b => {
                  if (b.stat === 'ATK') bonuses.atk += b.value;
                  if (b.stat === 'HP') bonuses.hp += b.value;
                  if (b.stat === 'DEF') bonuses.def += b.value;
                  if (b.stat === 'SPD') bonuses.spd += b.value;
                  if (b.stat === 'NRG') bonuses.nrg += b.value;
              });
          }
      };
      addGear(selectedBird?.gear.beak || null);
      addGear(selectedBird?.gear.claws || null);
      return bonuses;
  };
  
  const bonuses = getStatBonuses();

  // Calculate Total Hunting Boosts across all hunting birds
  const anyHunting = playerState.huntingBirdIds.length > 0;
  let huntSpeedMult = 1.0;
  const huntBuff = playerState.activeBuffs.find(b => b.type === ConsumableType.HUNTING_SPEED);
  if (huntBuff) huntSpeedMult = huntBuff.multiplier;

  let totalHuntBonus = 0;
  let totalDiamondChance = 0;
  let totalItemChance = 0;
  let totalGemChance = 0;
  let totalScrapChance = 0;

  playerState.huntingBirdIds.forEach(id => {
      const bird = playerState.birds.find(b => b.instanceId === id);
      if (bird) {
          if (bird.id === 'vulture') totalItemChance += 2;
          if (bird.id === 'hawk') totalScrapChance += 5;
          
          const addGemBuffs = (g: Gear | null) => {
               if (!g || !g.sockets) return;
               g.sockets.forEach(gem => {
                   if (gem) {
                       gem.buffs.forEach(b => {
                           if (b.stat === 'HUNT_BONUS') totalHuntBonus += b.value;
                           if (b.stat === 'DIAMOND_HUNT_CHANCE') totalDiamondChance += b.value;
                           if (b.stat === 'ITEM_FIND_CHANCE') totalItemChance += b.value;
                           if (b.stat === 'GEM_FIND_CHANCE') totalGemChance += b.value;
                       });
                   }
               });
          };
          addGemBuffs(bird.gear.beak);
          addGemBuffs(bird.gear.claws);
      }
  });

  let totalPassiveRate = 0;
  playerState.huntingBirdIds.forEach(id => {
      const bird = playerState.birds.find(b => b.instanceId === id);
      if (bird) {
          totalPassiveRate += calculateHuntingRate(bird);
      }
  });
  const apBoost = 1 + (playerState.apShop.featherBoost * 0.02);
  totalPassiveRate *= apBoost * huntSpeedMult;


  const StatRow = ({icon, label, val, level, rarity, bonus}: {icon: React.ReactNode, label: string, val: number, level: number, rarity: Rarity, bonus: number}) => {
    const total = Math.floor(val * (1 + level * 0.25)) + bonus;
    return (
        <div className="flex items-center justify-between py-1 border-b border-slate-800/50 last:border-0">
            <div className="flex items-center gap-1.5 text-slate-500">
                {icon} <span className="font-bold text-[10px] uppercase tracking-wider">{label}</span>
            </div>
            <div className="flex items-center gap-1">
                <span className={`font-mono text-sm font-bold leading-none ${RARITY_CONFIG[rarity].color}`}>
                    {total}
                </span>
                {bonus > 0 && (
                    <span className="text-[10px] text-cyan-400 font-mono font-bold">
                        (+{bonus})
                    </span>
                )}
            </div>
        </div>
    );
  };

  const handleRelease = () => {
      if (selectedBird && onReleaseBird) {
          onReleaseBird(selectedBird);
          setShowReleaseConfirm(false);
      }
  };

  const handleSocketClick = (gear: Gear, index: number, gem: Gem | null) => {
    if (gem) {
        onUnsocketGem(gear.id, index);
    } else {
        setGemSelectionTarget({ gearId: gear.id, socketIndex: index });
    }
  };

  const handleGemSelect = (gemId: string) => {
      if (gemSelectionTarget) {
          onSocketGem(gemSelectionTarget.gearId, gemId, gemSelectionTarget.socketIndex);
          setGemSelectionTarget(null);
      }
  };

  const getSalvageValues = (gear: Gear) => {
      const config = RARITY_CONFIG[gear.rarity];
      return {
          feathers: Math.floor(UPGRADE_COSTS.CRAFT_GEAR * 0.3),
          scrap: Math.floor(UPGRADE_COSTS.CRAFT_SCRAP * 0.5 * config.minMult)
      };
  };

  const handleGearAction = (action: 'unequip' | 'salvage') => {
      if (!selectedBird || !viewingSlot || !viewingGear) return;
      
      if (action === 'unequip') {
          onUnequip(selectedBird.instanceId, viewingSlot);
      } else if (action === 'salvage') {
          onSalvageGear(viewingGear);
      }
      setViewingSlot(null);
  };

  const getPrefixLabel = (prefix?: GearPrefix) => {
      if (prefix === GearPrefix.QUALITY) return 'Extra Atk';
      if (prefix === GearPrefix.SHARP) return 'Bleed Dmg';
      if (prefix === GearPrefix.GREAT) return 'Crit Chance';
      return '';
  };

  const StatChangeRow = ({ label, oldVal, newVal, icon: Icon, color }: { label: string, oldVal: number, newVal: number, icon: any, color: string }) => (
        <div className="flex justify-between items-center bg-slate-950/30 p-1.5 rounded border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400">
                <Icon size={10} className={color} />
                <span className="text-[9px] uppercase font-bold">{label}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-slate-500">{oldVal}</span>
                {newVal > oldVal ? (
                    <>
                        <span className="text-slate-700 text-[8px]">➜</span>
                        <span className="text-emerald-400 font-bold">{newVal}</span>
                    </>
                ) : (
                    <span className="text-slate-300">{newVal}</span>
                )}
            </div>
        </div>
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* 1. Global Hunting Stats Dashboard */}
      {anyHunting && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 backdrop-blur-sm shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Target size={80} className="text-amber-400" />
              </div>
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-amber-900/20 flex items-center justify-center border border-amber-500/30">
                          <Target size={16} className="text-amber-400" />
                      </div>
                      <div>
                          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Active Operations</div>
                          <div className="text-[10px] text-slate-400">{playerState.huntingBirdIds.length} Units Deployed</div>
                      </div>
                  </div>
                  <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Total Yield</div>
                      <div className="text-xl font-mono font-bold text-emerald-400">+{totalPassiveRate.toFixed(1)}/s</div>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-2 relative z-10">
                  {huntSpeedMult > 1 && (
                      <div className="bg-slate-950/50 p-2 rounded border border-emerald-900/50 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold">
                              <Clock size={12} className="text-emerald-400" /> Speed
                          </div>
                          <div className="font-mono text-emerald-400 font-bold">{huntSpeedMult}x</div>
                      </div>
                  )}
                  {totalHuntBonus > 0 && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold">
                              <Database size={12} className="text-cyan-400" /> Yield
                          </div>
                          <div className="font-mono text-cyan-400 font-bold">+{totalHuntBonus}%</div>
                      </div>
                  )}
                  {(totalDiamondChance > 0 || playerState.apShop.diamondBoost > 0) && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold">
                              <GemIcon size={12} className="text-blue-400" /> Diamond
                          </div>
                          <div className="font-mono text-blue-400 font-bold">+{totalDiamondChance.toFixed(1)}%</div>
                      </div>
                  )}
                  {(totalItemChance > 0 || playerState.apShop.itemDropBoost > 0) && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold">
                              <Briefcase size={12} className="text-purple-400" /> Item
                          </div>
                          <div className="font-mono text-purple-400 font-bold">+{totalItemChance.toFixed(1)}%</div>
                      </div>
                  )}
                  {(totalGemChance > 0 || playerState.apShop.gemDropBoost > 0) && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold">
                              <Hexagon size={12} className="text-rose-400" /> Gem
                          </div>
                          <div className="font-mono text-rose-400 font-bold">+{totalGemChance.toFixed(1)}%</div>
                      </div>
                  )}
                  {(totalScrapChance > 0 || playerState.apShop.scrapBoost > 0) && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold">
                              <Hammer size={12} className="text-slate-300" /> Scrap
                          </div>
                          <div className="font-mono text-slate-300 font-bold">+{totalScrapChance}%</div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* 2. Detail View */}
      {selectedBird ? (
        <Card variant="glass" rarity={selectedBird.rarity} className="clip-tech relative overflow-hidden">
             <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20 ${RARITY_CONFIG[selectedBird.rarity].glowColor.replace('shadow-', 'bg-')}`} />

             <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Selected Unit</div>
                        <h2 className="font-tech text-3xl font-bold text-white leading-none">{selectedBird.name}</h2>
                        <div className={`text-xs font-bold uppercase mt-1 ${RARITY_CONFIG[selectedBird.rarity].color}`}>
                             {RARITY_CONFIG[selectedBird.rarity].name} Class
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                        {selectedBird.statPoints > 0 ? (
                            <button 
                                onClick={() => setShowLevelUpModal(true)} 
                                className="animate-pulse text-yellow-400 font-bold font-tech text-lg drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] border border-yellow-500/50 rounded px-3 py-1 bg-yellow-900/40 hover:bg-yellow-900/60 transition-colors flex items-center gap-2"
                            >
                                <ArrowUp size={16} /> LEVEL UP! <span className="bg-yellow-500 text-black text-[10px] px-1.5 rounded-full">{selectedBird.statPoints}</span>
                            </button>
                        ) : (
                            <div className="text-2xl font-mono text-white">Lvl {selectedBird.level}</div>
                        )}
                        <div className="text-[10px] text-slate-400">EXP {Math.floor(selectedBird.xp)} / {Math.floor(selectedBird.xpToNextLevel)}</div>
                    </div>
                </div>

                {/* Compact Stats & Image Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <div className="flex gap-4">
                        <div className={`w-32 h-32 md:w-48 md:h-48 rounded-lg border-2 overflow-hidden bg-slate-950 shrink-0 shadow-lg ${RARITY_CONFIG[selectedBird.rarity].borderColor}`}>
                            <img 
                                src={selectedBird.imageUrl} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                    const target = e.currentTarget;
                                    if (!target.src.includes('placehold.co')) {
                                        target.src = 'https://placehold.co/400x400/1e293b/475569?text=' + selectedBird.name;
                                    }
                                }}
                            />
                        </div>
                        <div className="flex-1 bg-slate-900/50 p-2 rounded border border-slate-800 backdrop-blur-sm flex flex-col justify-center">
                             <StatRow icon={<Heart size={12}/>} label="HP" val={selectedBird.baseHp} level={selectedBird.level} rarity={selectedBird.rarity} bonus={bonuses.hp} />
                             <StatRow icon={<Zap size={12}/>} label="NRG" val={selectedBird.baseEnergy} level={selectedBird.level} rarity={selectedBird.rarity} bonus={bonuses.nrg} />
                             <StatRow icon={<Swords size={12}/>} label="ATK" val={selectedBird.baseAttack} level={selectedBird.level} rarity={selectedBird.rarity} bonus={bonuses.atk} />
                             <StatRow icon={<Shield size={12}/>} label="DEF" val={selectedBird.baseDefense} level={selectedBird.level} rarity={selectedBird.rarity} bonus={bonuses.def} />
                             <StatRow icon={<Wind size={12}/>} label="SPD" val={selectedBird.baseSpeed} level={selectedBird.level} rarity={selectedBird.rarity} bonus={bonuses.spd} />
                        </div>
                     </div>
                     
                     <div className="flex flex-col gap-2">
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800 flex-1">
                            <div className="flex items-center gap-2 text-purple-400 font-bold font-tech mb-1">
                                <Eye size={14} /> PASSIVE
                            </div>
                            <div className="text-xs font-bold text-white">{selectedBird.passive.name}</div>
                            <div className="text-[10px] text-slate-400 leading-tight">{selectedBird.passive.description}</div>
                        </div>

                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800 flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 text-amber-400 font-bold font-tech">
                                    <Target size={14} /> HUNTING
                                </div>
                                <Button 
                                    size="sm" 
                                    className={`px-2 py-0.5 text-[10px] h-auto ${isHunting ? "bg-amber-900/50 border-amber-500 hover:bg-amber-900" : "bg-slate-800 hover:bg-slate-700"}`}
                                    onClick={() => isHunting ? onRecallHunter(selectedBird.instanceId) : onAssignHunter(selectedBird.instanceId)}
                                >
                                    {isHunting ? "RECALL" : "ASSIGN"}
                                </Button>
                            </div>
                            <div className="flex justify-between items-end">
                                <div className="text-[10px] text-slate-500 leading-tight pr-2">{selectedBird.huntingConfig?.description}</div>
                                <div className="font-mono text-emerald-400 font-bold text-sm whitespace-nowrap">{huntingRate.toFixed(1)}/s</div>
                            </div>
                        </div>
                     </div>
                </div>

                <div className="mb-4">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Combat Gear</div>
                    <div className="grid grid-cols-2 gap-3">
                         {['beak', 'claws'].map((slotType) => {
                             const gear = slotType === 'beak' ? selectedBird.gear.beak : selectedBird.gear.claws;
                             return (
                                <div 
                                    key={slotType}
                                    className={`relative p-2 rounded bg-slate-950/50 border border-dashed hover:border-solid transition-all cursor-pointer group ${gear ? RARITY_CONFIG[gear.rarity].borderColor : 'border-slate-700 hover:border-cyan-500'}`}
                                    onClick={() => gear ? setViewingSlot(slotType as 'beak'|'claws') : setEquipSlot(slotType as 'beak'|'claws')}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded bg-slate-800 flex items-center justify-center shrink-0 ${slotType === 'beak' ? 'text-cyan-400' : 'text-rose-400'}`}>
                                            {slotType === 'beak' ? <Swords size={16} /> : <Wind size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[9px] text-slate-500 uppercase font-bold">{slotType}</div>
                                            <div className={`text-xs font-bold truncate ${gear ? RARITY_CONFIG[gear.rarity].color : 'text-slate-600'}`}>
                                                {gear ? gear.name : 'Empty'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {gear && gear.sockets && gear.sockets.length > 0 && (
                                        <div className="absolute top-1 right-1 flex gap-0.5">
                                            {gear.sockets.map((gem, idx) => (
                                                <div key={idx} className={`w-2 h-2 rounded-full border ${gem ? RARITY_CONFIG[gem.rarity].borderColor + ' ' + RARITY_CONFIG[gem.rarity].color.replace('text-', 'bg-') : 'border-slate-600 bg-slate-800'}`} />
                                            ))}
                                        </div>
                                    )}

                                    {!gear && (
                                        <div className="absolute top-1 right-1 text-cyan-500 opacity-0 group-hover:opacity-100 text-[9px] font-bold">EQUIP</div>
                                    )}
                                </div>
                             );
                         })}
                    </div>
                </div>

                {onReleaseBird && playerState.birds.length > 1 && (
                     <div className="flex justify-end border-t border-slate-800 pt-2">
                         {showReleaseConfirm ? (
                             <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                 <span className="text-xs text-rose-400 font-bold uppercase mr-2">Confirm Release?</span>
                                 <Button size="sm" variant="ghost" className="px-2 py-1 h-auto" onClick={() => setShowReleaseConfirm(false)}>CANCEL</Button>
                                 <Button size="sm" variant="danger" className="px-2 py-1 h-auto" onClick={handleRelease}>CONFIRM</Button>
                             </div>
                         ) : (
                             <Button 
                                size="sm" 
                                variant="secondary" 
                                className="border-slate-800 text-slate-500 hover:text-rose-500 hover:border-rose-900 px-3 py-1 h-auto text-xs"
                                onClick={() => setShowReleaseConfirm(true)}
                                disabled={isHunting}
                            >
                                <Trash2 size={12} className="mr-1" /> RELEASE UNIT
                             </Button>
                         )}
                     </div>
                )}
             </div>
        </Card>
      ) : (
        <div className="p-8 text-center text-slate-500 italic">No bird selected.</div>
      )}

      {/* 3. Bird Roster List */}
      <div className="grid grid-cols-1 gap-3">
        {playerState.birds.map((bird) => {
            const isSelected = bird.instanceId === playerState.selectedBirdId;
            const isHuntingBird = playerState.huntingBirdIds.includes(bird.instanceId);
            return (
                <div
                    key={bird.instanceId}
                    onClick={() => onSelectBird(bird.instanceId)}
                    className={`
                        w-full p-2 rounded-lg border-2 flex items-center justify-between transition-all relative overflow-hidden group cursor-pointer
                        ${isSelected 
                            ? `${RARITY_CONFIG[bird.rarity].borderColor} bg-slate-800 shadow-lg` 
                            : 'border-slate-800 bg-slate-900 hover:border-slate-600 hover:bg-slate-800'}
                    `}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 ${RARITY_CONFIG[bird.rarity].borderColor} bg-slate-950 relative`}>
                            <img 
                                src={bird.imageUrl} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                    const target = e.currentTarget;
                                    if (!target.src.includes('placehold.co')) {
                                        target.src = 'https://placehold.co/400x400/1e293b/475569?text=' + bird.name;
                                    }
                                }}
                            />
                            {isHuntingBird && (
                                <div className="absolute top-0 right-0 p-0.5 bg-black/50 rounded-bl">
                                    <Target size={10} className="text-amber-400 animate-pulse" />
                                </div>
                            )}
                            {bird.statPoints > 0 && !isSelected && (
                                <div className="absolute bottom-0 left-0 right-0 bg-yellow-500/80 text-black text-[9px] font-bold text-center animate-pulse">
                                    LEVEL UP!
                                </div>
                            )}
                        </div>
                        <div className="text-left">
                            <div className={`font-tech font-bold text-lg leading-none ${RARITY_CONFIG[bird.rarity].color}`}>{bird.name}</div>
                            <div className="text-xs text-white font-mono">Lvl {bird.level}</div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {['beak', 'claws'].map((slot) => {
                            const gear = slot === 'beak' ? bird.gear.beak : bird.gear.claws;
                            return (
                                <div 
                                    key={slot} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectBird(bird.instanceId);
                                        if (gear) {
                                            setViewingSlot(slot as 'beak' | 'claws');
                                        } else {
                                            setEquipSlot(slot as 'beak' | 'claws');
                                        }
                                    }}
                                    className={`w-10 h-10 rounded border flex items-center justify-center relative transition-transform hover:scale-105 cursor-pointer ${gear ? RARITY_CONFIG[gear.rarity].borderColor + ' bg-slate-800' : 'border-slate-700 border-dashed bg-slate-900/50 hover:border-cyan-500'}`}
                                >
                                    {slot === 'beak' ? <Swords size={16} className={gear ? RARITY_CONFIG[gear.rarity].color : 'text-slate-600'} /> : <Wind size={16} className={gear ? RARITY_CONFIG[gear.rarity].color : 'text-slate-600'} />}
                                    
                                    {gear && gear.sockets && gear.sockets.length > 0 && (
                                        <div className="absolute -bottom-1 flex gap-0.5">
                                            {gear.sockets.map((s, i) => (
                                                <div key={i} className={`w-1.5 h-1.5 rounded-full border ${s ? RARITY_CONFIG[s.rarity].color.replace('text-', 'bg-') + ' border-transparent' : 'bg-slate-900 border-slate-500'}`} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        })}
        
        {/* Capacity Slots */}
        {Array.from({ length: Math.max(0, currentCapacity - playerState.birds.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="w-full h-16 rounded-lg border-2 border-dashed border-slate-800 bg-slate-900/30 flex items-center justify-center">
                <div className="text-slate-700 text-xs font-bold uppercase">Empty Slot</div>
            </div>
        ))}
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
          {/* Equip Modal */}
          {equipSlot && selectedBird && (
              <motion.div 
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} 
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4 pb-20 md:pb-4" 
                onClick={() => setEquipSlot(null)}
              >
                  <motion.div 
                    initial={{y: 50}} animate={{y: 0}} exit={{y: 50}}
                    className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-sm w-full shadow-2xl max-h-[80vh] overflow-y-auto" 
                    onClick={e => e.stopPropagation()}
                  >
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-tech text-xl text-white">Equip {equipSlot}</h3>
                          <button onClick={() => setEquipSlot(null)}><X size={20} className="text-slate-500" /></button>
                      </div>
                      
                      <div className="space-y-2">
                          {playerState.inventory.gear.filter(g => g.type === (equipSlot === 'beak' ? GearType.BEAK : GearType.CLAWS)).length === 0 ? (
                              <div className="text-slate-500 text-sm text-center py-8 bg-slate-950/50 rounded-lg border border-dashed border-slate-800">
                                  No compatible gear in inventory.
                                  <div className="text-[10px] mt-2">Go to the Lab to craft more!</div>
                              </div>
                          ) : (
                            playerState.inventory.gear.filter(g => g.type === (equipSlot === 'beak' ? GearType.BEAK : GearType.CLAWS)).map(g => (
                                <button key={g.id} onClick={() => { onEquip(selectedBird.instanceId, g.id); setEquipSlot(null); }} className={`w-full p-3 rounded border flex justify-between items-center bg-slate-800 hover:bg-slate-700 transition-colors ${RARITY_CONFIG[g.rarity].borderColor}`}>
                                     <div>
                                        <div className={`text-sm font-bold ${RARITY_CONFIG[g.rarity].color}`}>{g.name}</div>
                                        <div className="text-[10px] text-slate-400 flex items-center">
                                            <span className={`${RARITY_CONFIG[g.rarity].color} font-bold mr-1`}>ATK +{g.attackBonus}</span>
                                            {g.prefix && g.paramValue && (
                                                <span className="ml-1 text-cyan-400">
                                                    • {getPrefixLabel(g.prefix)} {g.prefix === GearPrefix.QUALITY ? '+' : ''}{g.paramValue}{g.prefix === GearPrefix.QUALITY ? '' : '%'}
                                                </span>
                                            )}
                                        </div>
                                        {g.statBonuses && g.statBonuses.length > 0 && (
                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                {g.statBonuses.map((b, i) => (
                                                    <span key={i} className={`text-[9px] px-1 bg-slate-900 rounded ${RARITY_CONFIG[b.rarity].color} border border-slate-700`}>+{b.value} {BUFF_LABELS[b.stat] || b.stat}</span>
                                                ))}
                                            </div>
                                        )}
                                     </div>
                                     <div className="text-[10px] font-bold text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded">EQUIP</div>
                                </button>
                            ))
                          )}
                      </div>
                  </motion.div>
              </motion.div>
          )}

          {/* Gear Detail Modal */}
          {viewingGear && viewingSlot && (
              <motion.div 
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
                onClick={() => setViewingSlot(null)}
              >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-sm w-full relative flex flex-col items-center shadow-2xl max-h-[80vh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}
                  >
                      <button 
                          onClick={() => setViewingSlot(null)} 
                          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                      >
                          <X size={24} />
                      </button>

                      <h3 className="text-2xl font-tech text-white mb-6 uppercase">ITEM DETAILS</h3>

                      <div className="w-full flex flex-col items-center mb-6">
                           <div className={`w-20 h-20 rounded bg-slate-950 flex items-center justify-center border-2 mb-4 ${RARITY_CONFIG[viewingGear.rarity].borderColor}`}>
                                {viewingGear.type === GearType.BEAK ? <Swords size={32} className={RARITY_CONFIG[viewingGear.rarity].color} /> : <Wind size={32} className={RARITY_CONFIG[viewingGear.rarity].color} />}
                           </div>
                           <div className={`text-xl font-bold font-tech ${RARITY_CONFIG[viewingGear.rarity].color} text-center`}>{viewingGear.name}</div>
                           <div className="text-sm font-bold uppercase tracking-widest text-slate-500">{RARITY_CONFIG[viewingGear.rarity].name} TIER</div>
                      </div>
                      
                      <div className="w-full grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-slate-950 p-2 rounded border border-slate-800 text-center">
                              <div className="text-[10px] text-slate-500 uppercase">ATK Bonus</div>
                              <div className={`text-lg font-mono ${RARITY_CONFIG[viewingGear.rarity].color}`}>+{viewingGear.attackBonus}</div>
                          </div>
                          {viewingGear.prefix && viewingGear.paramValue && (
                              <div className="bg-slate-950 p-2 rounded border border-slate-800 text-center">
                                  <div className="text-[10px] text-slate-500 uppercase">{getPrefixLabel(viewingGear.prefix)}</div>
                                  <div className="text-lg font-mono text-cyan-400">
                                      {viewingGear.prefix === GearPrefix.QUALITY ? '+' : ''}{viewingGear.paramValue}{viewingGear.prefix === GearPrefix.QUALITY ? '' : '%'}
                                  </div>
                              </div>
                          )}
                      </div>

                      {viewingGear.statBonuses && viewingGear.statBonuses.length > 0 && (
                           <div className="w-full bg-slate-950/50 p-3 rounded border border-slate-800 mb-4">
                               <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Stat Boosts</div>
                               <div className="grid grid-cols-2 gap-2">
                                   {viewingGear.statBonuses.map((bonus, i) => (
                                       <div key={i} className={`text-xs font-mono font-bold flex justify-between ${RARITY_CONFIG[bonus.rarity].color}`}>
                                           <span>{BUFF_LABELS[bonus.stat] || bonus.stat}</span>
                                           <span>+{bonus.value}</span>
                                       </div>
                                   ))}
                               </div>
                           </div>
                      )}

                      {viewingGear.sockets && viewingGear.sockets.length > 0 && (
                        <div className="w-full bg-slate-950/30 p-3 rounded border border-slate-800/50 mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Sockets</span>
                            </div>
                            <div className="flex gap-3 justify-center">
                                {viewingGear.sockets.map((socket, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => handleSocketClick(viewingGear, idx, socket)}
                                        className={`w-10 h-10 rounded-full bg-slate-900 border-2 flex items-center justify-center relative group hover:scale-110 transition-transform ${socket ? RARITY_CONFIG[socket.rarity].borderColor : 'border-slate-600 border-dashed hover:border-cyan-400'}`}
                                        title={socket ? "Tap to Unsocket" : "Tap to Socket"}
                                    >
                                        {socket ? (
                                            <div className={`w-7 h-7 rounded-full ${RARITY_CONFIG[socket.rarity].color.replace('text-', 'bg-')} shadow-sm`} />
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-slate-700 group-hover:bg-cyan-400" />
                                        )}
                                    </button>
                                ))}
                            </div>
                            {viewingGear.sockets.some(s => s !== null) && (
                                <div className="mt-3 grid grid-cols-1 gap-1">
                                    {viewingGear.sockets.filter(s => s !== null).map((gem, i) => (
                                        gem!.buffs.map((buff, j) => (
                                                <div key={`${i}-${j}`} className={`text-center text-[10px] ${RARITY_CONFIG[buff.rarity].color}`}>
                                                    +{buff.value}% {BUFF_LABELS[buff.stat]}
                                                </div>
                                        ))
                                    ))}
                                </div>
                            )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 w-full">
                           <Button fullWidth variant="secondary" onClick={() => handleGearAction('unequip')} className="border-slate-700">
                                UNEQUIP
                           </Button>
                           <Button fullWidth variant="danger" onClick={() => handleGearAction('salvage')} className="border-rose-800">
                                <div className="flex flex-col items-center leading-none py-1">
                                    <span>SALVAGE</span>
                                    <span className="text-[8px] opacity-70 mt-1">+{getSalvageValues(viewingGear).feathers} F / +{getSalvageValues(viewingGear).scrap} S</span>
                                </div>
                           </Button>
                      </div>

                  </motion.div>
              </motion.div>
          )}

          {/* Gem Selector Modal */}
          {gemSelectionTarget && (
              <motion.div 
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
                onClick={() => setGemSelectionTarget(null)}
              >
                  <motion.div 
                    initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} exit={{scale:0.9, y:20}}
                    className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-sm w-full shadow-2xl flex flex-col max-h-[80vh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}
                  >
                      <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
                          <h3 className="font-tech text-xl text-white">Select Gem</h3>
                          <button onClick={() => setGemSelectionTarget(null)}><X size={20} className="text-slate-500" /></button>
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

          {/* Level Up Reward Modal */}
          {showLevelUpModal && selectedBird && (
              <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
                  onClick={() => setShowLevelUpModal(false)}
              >
                  <motion.div 
                      initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }}
                      className="bg-slate-900 border-2 border-yellow-500/50 p-6 rounded-2xl max-w-sm w-full relative flex flex-col items-center shadow-[0_0_50px_rgba(234,179,8,0.2)] max-h-[80vh] overflow-y-auto custom-scrollbar"
                      onClick={e => e.stopPropagation()}
                  >
                      <div className="w-full flex items-center justify-center gap-2 mb-2 shrink-0">
                          <ArrowUp size={24} className="text-yellow-400 animate-bounce" />
                          <h2 className="font-tech text-2xl text-white uppercase tracking-widest text-center">
                              LEVEL UP
                          </h2>
                          <ArrowUp size={24} className="text-yellow-400 animate-bounce" />
                      </div>
                      <p className="text-slate-400 text-xs mb-4 text-center shrink-0">
                          {selectedBird.statPoints} point{selectedBird.statPoints > 1 ? 's' : ''} available. Choose an upgrade.
                      </p>

                      <div className="w-full bg-slate-950 p-3 rounded-lg border border-slate-800 mb-4 shrink-0">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-center border-b border-slate-800 pb-1">
                              Current Stats
                          </div>
                          {(() => {
                              const stats = getScaledStats(selectedBird, selectedBird.level);
                              const huntingYield = (selectedBird.huntingConfig.baseRate * RARITY_CONFIG[selectedBird.rarity].minMult) * (1 + selectedBird.level * 0.5);
                              return (
                                  <div className="grid grid-cols-2 gap-2">
                                      <StatChangeRow label="HP" oldVal={stats.maxHp} newVal={stats.maxHp} icon={Heart} color="text-emerald-400" />
                                      <StatChangeRow label="ATK" oldVal={stats.attack} newVal={stats.attack} icon={Zap} color="text-rose-400" />
                                      <StatChangeRow label="DEF" oldVal={stats.defense} newVal={stats.defense} icon={Shield} color="text-blue-400" />
                                      <StatChangeRow label="SPD" oldVal={stats.speed} newVal={stats.speed} icon={Wind} color="text-cyan-400" />
                                      <StatChangeRow label="NRG" oldVal={stats.maxEnergy} newVal={stats.maxEnergy} icon={Zap} color="text-yellow-400" />
                                      <div className="flex justify-between items-center bg-slate-950/30 p-1.5 rounded border border-slate-800">
                                          <div className="flex items-center gap-1.5 text-slate-400">
                                              <Target size={10} className="text-amber-400" />
                                              <span className="text-[9px] uppercase font-bold">Yield</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 font-mono text-xs">
                                              <span className="text-amber-400 font-bold">{huntingYield.toFixed(1)}/s</span>
                                          </div>
                                      </div>
                                  </div>
                              );
                          })()}
                      </div>

                      <div className="flex flex-col gap-2 w-full shrink-0">
                          {rewardOptions.map((opt, i) => {
                              let Icon = Zap;
                              if (opt.stat === 'HP') Icon = Heart;
                              if (opt.stat === 'DEF') Icon = Shield;
                              if (opt.stat === 'SPD') Icon = Wind;
                              
                              const baseKeyMap: Record<StatType, keyof BirdInstance> = {
                                  'HP': 'baseHp',
                                  'ATK': 'baseAttack',
                                  'DEF': 'baseDefense',
                                  'SPD': 'baseSpeed',
                                  'NRG': 'baseEnergy'
                              };
                              
                              const statKeyMap: Record<StatType, 'maxHp' | 'attack' | 'defense' | 'speed' | 'maxEnergy'> = {
                                  'HP': 'maxHp',
                                  'ATK': 'attack',
                                  'DEF': 'defense',
                                  'SPD': 'speed',
                                  'NRG': 'maxEnergy'
                              };

                              const baseKey = baseKeyMap[opt.stat];
                              const statKey = statKeyMap[opt.stat];
                              
                              const currentStats = getScaledStats(selectedBird, selectedBird.level);
                              const projectedBird = { ...selectedBird, [baseKey]: (selectedBird[baseKey] as number) + opt.value };
                              const projectedStats = getScaledStats(projectedBird, selectedBird.level);
                              
                              const currentVal = currentStats[statKey];
                              const projectedVal = projectedStats[statKey];

                              return (
                                  <button 
                                      key={i}
                                      onClick={() => handleSelectReward(opt)}
                                      className={`w-full p-3 rounded-lg border-2 bg-slate-950 flex items-center justify-between transition-all hover:scale-[1.02] active:scale-95 ${RARITY_CONFIG[opt.rarity].borderColor} hover:bg-slate-900 group shadow-lg`}
                                  >
                                      <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border bg-slate-900 ${RARITY_CONFIG[opt.rarity].borderColor}`}>
                                              <Icon size={20} className={RARITY_CONFIG[opt.rarity].color} />
                                          </div>
                                          <div className="text-left">
                                              <div className={`font-bold font-tech text-sm ${RARITY_CONFIG[opt.rarity].color}`}>{opt.label}</div>
                                              <div className="text-[9px] text-slate-500 font-bold uppercase">{RARITY_CONFIG[opt.rarity].name} Upgrade</div>
                                          </div>
                                      </div>
                                      
                                      <div className={`text-right ${RARITY_CONFIG[opt.rarity].color}`}>
                                          <div className="flex items-center gap-2 justify-end">
                                              <span className="text-slate-500 text-sm">{currentVal}</span>
                                              <ArrowRight size={14} className="opacity-50" /> 
                                              <span className="text-xl font-mono font-bold drop-shadow-md">{projectedVal}</span>
                                          </div>
                                      </div>
                                  </button>
                              )
                          })}
                      </div>
                  </motion.div>
              </motion.div>
          )}

      </AnimatePresence>
    </div>
  );
};
