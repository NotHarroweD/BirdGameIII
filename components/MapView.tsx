
import React from 'react';
import { PlayerState, ConsumableType, Gear } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Swords, Lock, Target, ArrowUpRight, Zap, Award, Hammer, Gem, Briefcase, Hexagon } from 'lucide-react';

interface MapViewProps {
  playerState: PlayerState;
  onBattle: () => void;
  currentZone: number;
  onSelectZone: (zone: number) => void;
}

export const MapView: React.FC<MapViewProps> = ({ playerState, onBattle, currentZone, onSelectZone }) => {
  const highestZone = playerState.highestZone;
  // Fix: Cast to boolean using !! to prevent returning "" (empty string) which causes TS error on disabled prop
  const isHunting = !!(playerState.selectedBirdId && playerState.huntingBirdIds.includes(playerState.selectedBirdId));
  const selectedBird = playerState.birds.find(b => b.instanceId === playerState.selectedBirdId);

  // --- Calculate Active Battle Boosts ---
  const activeConsumable = playerState.activeBuffs.find(b => b.type === ConsumableType.BATTLE_REWARD);
  const consumableMult = activeConsumable ? activeConsumable.multiplier : 1.0;

  // --- AP Boost Multipliers ---
  const apFeatherMult = 1 + (playerState.apShop.featherBoost * 0.02);
  const apScrapMult = 1 + (playerState.apShop.scrapBoost * 0.02);
  const apDiamondMult = 1 + (playerState.apShop.diamondBoost * 0.02);
  const apItemMult = 1 + (playerState.apShop.itemDropBoost * 0.02);
  const apGemMult = 1 + (playerState.apShop.gemDropBoost * 0.02);

  let xpBonus = 0;
  let scrapBonus = 0;
  let featherBonus = 0;
  let diamondChanceBonus = 0;
  let itemFindBonus = 0;
  let gemFindBonus = 0;
  
  // Calculate Gear Boosts
  if (selectedBird) {
      const addGemBuffs = (g: Gear | null) => {
           if (!g || !g.sockets) return;
           g.sockets.forEach(gem => {
               if (gem) {
                   gem.buffs.forEach(b => {
                       if (b.stat === 'XP_BONUS') xpBonus += b.value;
                       if (b.stat === 'SCRAP_BONUS') scrapBonus += b.value;
                       if (b.stat === 'FEATHER_BONUS') featherBonus += b.value;
                       if (b.stat === 'DIAMOND_BATTLE_CHANCE') diamondChanceBonus += b.value;
                       if (b.stat === 'ITEM_FIND_CHANCE') itemFindBonus += b.value;
                       if (b.stat === 'GEM_FIND_CHANCE') gemFindBonus += b.value;
                   });
               }
           });
      };
      addGemBuffs(selectedBird.gear.beak);
      addGemBuffs(selectedBird.gear.claws);
  }

  const calcEffectiveBoost = (gearPercent: number, consumableM: number, apM: number) => {
      const gearMult = 1 + (gearPercent / 100);
      const totalMult = gearMult * consumableM * apM;
      return Math.round((totalMult - 1) * 100);
  };

  const effectiveFeather = calcEffectiveBoost(featherBonus, consumableMult, apFeatherMult);
  const effectiveScrap = calcEffectiveBoost(scrapBonus, consumableMult, apScrapMult);
  const effectiveXp = calcEffectiveBoost(xpBonus, 1.0, 1.0); 
  
  const hasBattleBoosts = effectiveFeather > 0 || effectiveScrap > 0 || effectiveXp > 0 || diamondChanceBonus > 0 || itemFindBonus > 0 || gemFindBonus > 0 || playerState.apShop.diamondBoost > 0 || playerState.apShop.itemDropBoost > 0;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="text-center py-8">
          <h2 className="font-tech text-4xl text-white mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">SECTOR MAP</h2>
          <p className="text-slate-400 text-sm tracking-wide">Climb the zones to reach higher threats.</p>
      </div>

      {hasBattleBoosts && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 mx-1 backdrop-blur-sm shadow-xl relative overflow-hidden mb-6">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                  <ArrowUpRight size={64} className="text-cyan-400" />
              </div>
              
              <div className="flex items-center gap-2 text-cyan-400 mb-4 relative z-10">
                  <ArrowUpRight size={18} />
                  <span className="font-tech font-bold uppercase tracking-wider text-sm">Active Battle Boosts</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 relative z-10">
                  {effectiveFeather > 0 && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold">
                              <Award size={14} className="text-yellow-500" /> Feathers
                          </div>
                          <div className="font-mono font-bold text-emerald-400">+{effectiveFeather}%</div>
                      </div>
                  )}
                  {effectiveScrap > 0 && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold">
                              <Hammer size={14} className="text-slate-500" /> Scrap
                          </div>
                          <div className="font-mono font-bold text-emerald-400">+{effectiveScrap}%</div>
                      </div>
                  )}
                  {effectiveXp > 0 && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold">
                              <Zap size={14} className="text-cyan-500" /> XP
                          </div>
                          <div className="font-mono font-bold text-emerald-400">+{effectiveXp}%</div>
                      </div>
                  )}
                  {(diamondChanceBonus > 0 || playerState.apShop.diamondBoost > 0) && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold">
                              <Gem size={14} className="text-blue-400" /> Diamond
                          </div>
                          <div className="font-mono font-bold text-blue-400">
                              {diamondChanceBonus > 0 ? `+${diamondChanceBonus}%` : ''} 
                              {playerState.apShop.diamondBoost > 0 ? ` (x${apDiamondMult.toFixed(2)})` : ''}
                          </div>
                      </div>
                  )}
                  {(itemFindBonus > 0 || playerState.apShop.itemDropBoost > 0) && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold">
                              <Briefcase size={14} className="text-purple-400" /> Items
                          </div>
                          <div className="font-mono font-bold text-purple-400">
                              {itemFindBonus > 0 ? `+${itemFindBonus}%` : ''}
                              {playerState.apShop.itemDropBoost > 0 ? ` (x${apItemMult.toFixed(2)})` : ''}
                          </div>
                      </div>
                  )}
                  {(gemFindBonus > 0 || playerState.apShop.gemDropBoost > 0) && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold">
                              <Hexagon size={14} className="text-rose-400" /> Gems
                          </div>
                          <div className="font-mono font-bold text-rose-400">
                              {gemFindBonus > 0 ? `+${gemFindBonus}%` : ''}
                              {playerState.apShop.gemDropBoost > 0 ? ` (x${apGemMult.toFixed(2)})` : ''}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Map Zones Layout - Inverted Order for Climbing Effect */}
      <div className="space-y-4 flex flex-col items-center">
          
          {/* Next Zone (Locked) */}
          <div className="w-full opacity-40">
               <div className="w-full bg-slate-950 rounded-lg p-6 flex items-center justify-between border border-slate-900 border-dashed">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-slate-700">
                          <Lock size={20} />
                      </div>
                      <div className="text-left">
                          <div className="text-slate-600 font-bold text-xs uppercase tracking-widest mb-1">Restricted</div>
                          <div className="font-tech text-2xl text-slate-700">ZONE {highestZone + 1}</div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="h-8 w-0.5 border-l border-dashed border-slate-700" />

          {/* Current Selection / Deploy Card */}
          <div className="relative group w-full">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-orange-600 rounded-lg opacity-50 blur group-hover:opacity-75 transition duration-200"></div>
              <div className="relative w-full bg-slate-900 rounded-lg p-6 border border-slate-700 shadow-2xl">
                  
                  {/* Zone Selector Header */}
                  <div className="flex items-center justify-between mb-6">
                      <button 
                          onClick={() => onSelectZone(Math.max(1, currentZone - 1))}
                          disabled={currentZone <= 1}
                          className="p-2 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-cyan-400 transition-colors"
                      >
                          <ChevronLeft size={24} />
                      </button>
                      
                      <div className="flex flex-col items-center">
                          <div className="text-rose-400 font-bold text-xs uppercase tracking-widest mb-1">Active Operation</div>
                          <div className="font-tech text-4xl text-white font-bold drop-shadow-md">ZONE {currentZone}</div>
                          <div className="text-xs text-slate-500 mt-1 font-mono">
                              THREAT LEVEL: {(1 + (currentZone - 1) * 0.08).toFixed(2)}x
                          </div>
                      </div>

                      <button 
                          onClick={() => onSelectZone(Math.min(highestZone, currentZone + 1))}
                          disabled={currentZone >= highestZone}
                          className="p-2 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-cyan-400 transition-colors"
                      >
                          <ChevronRight size={24} />
                      </button>
                  </div>

                  {/* Deploy Button */}
                  <button 
                    onClick={onBattle}
                    disabled={isHunting}
                    className="w-full bg-slate-950 hover:bg-slate-800 border border-rose-500/30 hover:border-rose-500 text-rose-500 hover:text-rose-400 font-bold py-4 rounded transition-all flex items-center justify-center gap-2 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {isHunting ? (
                          <>
                            <Target size={20} className="animate-pulse" />
                            <span className="tracking-widest">UNIT BUSY</span>
                          </>
                      ) : (
                          <>
                            <Swords size={20} className="group-hover/btn:scale-110 transition-transform" />
                            <span className="tracking-[0.2em]">DEPLOY SQUAD</span>
                          </>
                      )}
                  </button>
              </div>
          </div>
          
          {isHunting && (
              <div className="w-full flex items-start gap-3 bg-amber-900/10 p-3 rounded border border-amber-900/30">
                   <Target size={16} className="text-amber-500 mt-0.5 shrink-0" />
                   <div className="text-xs text-amber-500/80 font-mono leading-relaxed">
                      Active unit is currently assigned to resource hunting operations. Recall unit from the Roster to enable combat deployment.
                   </div>
              </div>
          )}

          {/* Quick Info */}
          <div className="text-center text-[10px] text-slate-500 font-mono mt-4">
              MAXIMUM CLEARED: ZONE {highestZone - 1}
          </div>
      </div>
    </div>
  );
};
