
import React, { useState } from 'react';
import { PlayerState, BirdInstance, GearType, Rarity, Gear } from '../types';
import { RARITY_CONFIG, BUFF_LABELS, ROSTER_BASE_CAPACITY } from '../constants';
import { Button } from './Button';
import { Card } from './Card';
import { Swords, Wind, Shield, Heart, Zap, X, Target, Crosshair, Trash2, AlertTriangle, Hexagon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RosterViewProps {
  playerState: PlayerState;
  onSelectBird: (id: string) => void;
  onEquip: (birdId: string, gearId: string) => void;
  onUnequip: (birdId: string, slot: 'beak' | 'claws') => void;
  onAssignHunter: (birdId: string) => void;
  onRecallHunter: (birdId: string) => void;
  onReleaseBird?: (bird: BirdInstance) => void;
}

export const RosterView: React.FC<RosterViewProps> = ({ 
    playerState, 
    onSelectBird, 
    onEquip, 
    onUnequip, 
    onAssignHunter, 
    onRecallHunter,
    onReleaseBird
}) => {
  const selectedBird = playerState.birds.find(b => b.instanceId === playerState.selectedBirdId);
  const [equipSlot, setEquipSlot] = useState<'beak' | 'claws' | null>(null);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);

  const isHunting = selectedBird && playerState.huntingBirdIds.includes(selectedBird.instanceId);
  const huntingRate = selectedBird 
    ? (selectedBird.huntingConfig.baseRate * RARITY_CONFIG[selectedBird.rarity].minMult * (1 + selectedBird.level * 0.1))
    : 0;

  const currentCapacity = ROSTER_BASE_CAPACITY + playerState.upgrades.rosterCapacityLevel;

  // Calculate combat stat bonuses from gear
  const getStatBonuses = () => {
      const bonuses = { atk: 0, hp: 0, def: 0, spd: 0, nrg: 0 };
      const addGear = (g: Gear | null) => {
          if (!g) return;
          bonuses.atk += g.attackBonus || 0;
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

  const StatRow = ({icon, label, val, level, rarity, bonus}: {icon: React.ReactNode, label: string, val: number, level: number, rarity: Rarity, bonus: number}) => {
    const total = Math.floor(val * (1 + level * 0.1)) + bonus;
    return (
        <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 flex flex-col items-start justify-center relative overflow-hidden min-h-[4rem]">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                {icon} <span className="font-bold text-[10px] uppercase tracking-wider">{label}</span>
            </div>
            <div className="flex flex-col items-start">
                <span className={`font-mono text-lg font-bold leading-none ${RARITY_CONFIG[rarity].color}`}>
                    {total}
                </span>
                {bonus > 0 && (
                    <span className="text-[10px] text-cyan-400 font-mono font-bold mt-0.5">
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

  return (
    <div className="space-y-6 pb-20">
      
      {/* Detail View */}
      {selectedBird ? (
        <Card variant="glass" rarity={selectedBird.rarity} className="clip-tech relative overflow-hidden">
             <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-20 ${RARITY_CONFIG[selectedBird.rarity].glowColor.replace('shadow-', 'bg-')}`} />

             <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Unit</div>
                        <h2 className="font-tech text-3xl font-bold text-white leading-none">{selectedBird.name}</h2>
                        <div className={`text-xs font-bold uppercase mt-1 ${RARITY_CONFIG[selectedBird.rarity].color}`}>
                             {RARITY_CONFIG[selectedBird.rarity].name} Class
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono text-white">Lvl {selectedBird.level}</div>
                        <div className="text-[10px] text-slate-400">EXP {Math.floor(selectedBird.xp)} / {Math.floor(selectedBird.xpToNextLevel)}</div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                     <div className="flex gap-4 md:block">
                        <div className={`w-28 h-28 rounded-lg border-2 overflow-hidden bg-slate-950 shrink-0 shadow-lg ${RARITY_CONFIG[selectedBird.rarity].borderColor}`}>
                            <img src={selectedBird.imageUrl} className="w-full h-full object-cover" />
                        </div>
                     </div>
                     
                     <div className="flex-1 grid grid-cols-3 gap-2 content-start">
                         <StatRow icon={<Heart size={12}/>} label="HP" val={selectedBird.baseHp} level={selectedBird.level} rarity={selectedBird.rarity} bonus={bonuses.hp} />
                         <StatRow icon={<Zap size={12}/>} label="NRG" val={selectedBird.baseEnergy} level={selectedBird.level} rarity={selectedBird.rarity} bonus={bonuses.nrg} />
                         <StatRow icon={<Swords size={12}/>} label="ATK" val={selectedBird.baseAttack} level={selectedBird.level} rarity={selectedBird.rarity} bonus={bonuses.atk} />
                         <StatRow icon={<Shield size={12}/>} label="DEF" val={selectedBird.baseDefense} level={selectedBird.level} rarity={selectedBird.rarity} bonus={bonuses.def} />
                         <StatRow icon={<Wind size={12}/>} label="SPD" val={selectedBird.baseSpeed} level={selectedBird.level} rarity={selectedBird.rarity} bonus={bonuses.spd} />
                     </div>
                </div>

                <div className="mb-6 bg-slate-900/50 p-3 rounded border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2 text-amber-400 font-bold font-tech">
                             <Target size={16} /> RESOURCE HUNTING
                         </div>
                    </div>
                    <div className="flex items-center justify-between">
                         <div>
                             <div className="text-[10px] text-slate-500 uppercase">Gather Rate</div>
                             <div className="text-xl font-mono text-emerald-400 leading-none">{huntingRate.toFixed(1)} <span className="text-xs text-slate-500">/s</span></div>
                             <div className="text-[10px] text-slate-500 mt-1 max-w-[150px] leading-tight">{selectedBird.huntingConfig?.description || 'Can gather feathers.'}</div>
                         </div>
                         <Button 
                            size="sm" 
                            className={isHunting ? "bg-amber-900/50 border-amber-500 hover:bg-amber-900" : "bg-slate-800 hover:bg-slate-700"}
                            onClick={() => isHunting ? onRecallHunter(selectedBird.instanceId) : onAssignHunter(selectedBird.instanceId)}
                         >
                             {isHunting ? "RECALL" : "ASSIGN"}
                         </Button>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Combat Gear</div>
                    <div className="grid grid-cols-2 gap-3">
                         {['beak', 'claws'].map((slotType) => {
                             const gear = slotType === 'beak' ? selectedBird.gear.beak : selectedBird.gear.claws;
                             return (
                                <div 
                                    key={slotType}
                                    className={`relative p-3 rounded bg-slate-950/50 border border-dashed hover:border-solid transition-all cursor-pointer group ${gear ? RARITY_CONFIG[gear.rarity].borderColor : 'border-slate-700 hover:border-cyan-500'}`}
                                    onClick={() => gear ? onUnequip(selectedBird.instanceId, slotType as 'beak'|'claws') : setEquipSlot(slotType as 'beak'|'claws')}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded bg-slate-800 flex items-center justify-center shrink-0 ${slotType === 'beak' ? 'text-cyan-400' : 'text-rose-400'}`}>
                                            {slotType === 'beak' ? <Swords size={16} /> : <Wind size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">{slotType}</div>
                                            <div className={`text-xs font-bold truncate ${gear ? RARITY_CONFIG[gear.rarity].color : 'text-slate-600'}`}>
                                                {gear ? gear.name : 'Empty Slot'}
                                            </div>
                                            
                                            {/* Gear Stat Bonuses */}
                                            {gear && gear.statBonuses && gear.statBonuses.length > 0 && (
                                                <div className="flex gap-1 mt-1 flex-wrap">
                                                    {gear.statBonuses.map((b, i) => (
                                                        <span key={i} className={`text-[9px] px-1 bg-slate-900 rounded leading-tight text-slate-300 border border-slate-700`}>
                                                            +{b.value} {BUFF_LABELS[b.stat] || b.stat}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Sockets Visual with Gems */}
                                    {gear && gear.sockets && gear.sockets.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-slate-800/50">
                                            <div className="flex gap-1 justify-end">
                                                {gear.sockets.map((gem, idx) => (
                                                    <div key={idx} className={`w-4 h-4 rounded-full border flex items-center justify-center ${gem ? RARITY_CONFIG[gem.rarity].borderColor : 'border-slate-600 bg-slate-900'}`} title={gem ? gem.name : "Empty Socket"}>
                                                        {gem ? (
                                                            <div className={`w-3 h-3 rounded-full ${RARITY_CONFIG[gem.rarity].color.replace('text-', 'bg-')} shadow-sm`} />
                                                        ) : (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Show Gem Buffs if any gem present */}
                                            {gear.sockets.some(g => g !== null) && (
                                                <div className="mt-1 flex flex-wrap gap-1 justify-end">
                                                    {gear.sockets.filter(g => g !== null).map((gem, i) => (
                                                        gem!.buffs.map((buff, j) => (
                                                            <span key={`${i}-${j}`} className={`text-[8px] px-1 bg-slate-950 rounded ${RARITY_CONFIG[buff.rarity].color}`}>
                                                                {buff.value}% {BUFF_LABELS[buff.stat]}
                                                            </span>
                                                        ))
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {gear ? (
                                        <div className="absolute top-1 right-1 text-rose-500 opacity-0 group-hover:opacity-100 bg-slate-900 rounded-full p-0.5"><X size={10}/></div>
                                    ) : (
                                        <div className="absolute top-1 right-1 text-cyan-500 opacity-0 group-hover:opacity-100 text-[9px] font-bold">EQUIP</div>
                                    )}
                                </div>
                             );
                         })}
                    </div>
                </div>

                {onReleaseBird && playerState.birds.length > 1 && (
                     <div className="flex justify-end pt-4 border-t border-slate-800">
                         {showReleaseConfirm ? (
                             <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                 <span className="text-xs text-rose-400 font-bold uppercase mr-2">Confirm Release?</span>
                                 <Button size="sm" variant="ghost" onClick={() => setShowReleaseConfirm(false)}>CANCEL</Button>
                                 <Button size="sm" variant="danger" onClick={handleRelease}>CONFIRM</Button>
                             </div>
                         ) : (
                             <Button 
                                size="sm" 
                                variant="secondary" 
                                className="border-slate-800 text-slate-500 hover:text-rose-500 hover:border-rose-900"
                                onClick={() => setShowReleaseConfirm(true)}
                                disabled={isHunting}
                            >
                                <Trash2 size={14} className="mr-2" /> RELEASE UNIT
                             </Button>
                         )}
                     </div>
                )}
             </div>
        </Card>
      ) : (
        <div className="p-8 text-center text-slate-500 italic">No bird selected.</div>
      )}

      <div>
         <div className="flex justify-between items-center mb-3 px-1">
             <h3 className="font-tech text-lg text-slate-400">Collection</h3>
             <span className="text-xs font-mono text-slate-500">
                 {playerState.birds.length} / {currentCapacity}
             </span>
         </div>
         <div className="space-y-2">
            {playerState.birds.map(bird => (
                <button
                    key={bird.instanceId}
                    onClick={() => onSelectBird(bird.instanceId)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        playerState.selectedBirdId === bird.instanceId 
                        ? `bg-slate-800 border-cyan-500 shadow-lg` 
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                    }`}
                >
                    <div className={`w-10 h-10 rounded border overflow-hidden relative shrink-0 ${RARITY_CONFIG[bird.rarity].borderColor}`}>
                        <img src={bird.imageUrl} className="w-full h-full object-cover" />
                        {playerState.huntingBirdIds.includes(bird.instanceId) && (
                            <div className="absolute inset-0 bg-amber-500/50 flex items-center justify-center">
                                <Target size={20} className="text-white drop-shadow-md animate-pulse" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <div className="flex justify-between items-center">
                            <span className={`font-bold text-sm truncate pr-2 ${playerState.selectedBirdId === bird.instanceId ? 'text-white' : 'text-slate-300'}`}>
                                {bird.name}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border whitespace-nowrap ${RARITY_CONFIG[bird.rarity].borderColor} ${RARITY_CONFIG[bird.rarity].color} bg-slate-950`}>
                                {RARITY_CONFIG[bird.rarity].name}
                            </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Level {bird.level} • {bird.species}</div>
                    </div>
                    {playerState.selectedBirdId === bird.instanceId && (
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] shrink-0" />
                    )}
                </button>
            ))}
         </div>
      </div>

      <AnimatePresence>
          {equipSlot && selectedBird && (
              <motion.div 
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} 
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4 pb-20 md:pb-4" 
                onClick={() => setEquipSlot(null)}
              >
                  <motion.div 
                    initial={{y: 50}} animate={{y: 0}} exit={{y: 50}}
                    className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-sm w-full shadow-2xl" 
                    onClick={e => e.stopPropagation()}
                  >
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-tech text-xl text-white">Equip {equipSlot}</h3>
                          <button onClick={() => setEquipSlot(null)}><X size={20} className="text-slate-500" /></button>
                      </div>
                      
                      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
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
                                        <div className="text-[10px] text-slate-400">ATK +{g.attackBonus} • Effect {g.effectValue}%</div>
                                        {g.statBonuses && g.statBonuses.length > 0 && (
                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                {g.statBonuses.map((b, i) => (
                                                    <span key={i} className={`text-[9px] px-1 bg-slate-900 rounded text-slate-300 border border-slate-700`}>+{b.value} {BUFF_LABELS[b.stat] || b.stat}</span>
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
      </AnimatePresence>
    </div>
  );
};
