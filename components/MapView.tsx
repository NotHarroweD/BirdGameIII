
import React from 'react';
import { PlayerState, ConsumableType, Gear } from '../types';
import { Button } from './Button';
import { Map, Swords, Lock, Skull, Target, ArrowUpRight, Zap, Award, Hammer, Gem, Briefcase, Hexagon } from 'lucide-react';

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

interface MapViewProps {
  playerState: PlayerState;
  onBattle: () => void;
}

export const MapView: React.FC<MapViewProps> = ({ playerState, onBattle }) => {
  const currentZone = playerState.highestZone;
  const isHunting = playerState.selectedBirdId && playerState.huntingBirdIds.includes(playerState.selectedBirdId);
  const selectedBird = playerState.birds.find(b => b.instanceId === playerState.selectedBirdId);

  // --- Calculate Active Battle Boosts ---
  const activeConsumable = playerState.activeBuffs.find(b => b.type === ConsumableType.BATTLE_REWARD);
  const consumableMult = activeConsumable ? activeConsumable.multiplier : 1.0;

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

  // Calculate Effective Multipliers (Gear % + Consumable Multiplier)
  // Logic matches BattleArena: (Base * (1 + Gear%)) * Consumable
  // We want to show the total % increase from base.
  // TotalMult = (1 + Gear/100) * Consumable
  // Display % = (TotalMult - 1) * 100

  const calcEffectiveBoost = (gearPercent: number, appliesConsumable: boolean) => {
      const gearMult = 1 + (gearPercent / 100);
      const totalMult = appliesConsumable ? gearMult * consumableMult : gearMult;
      return Math.round((totalMult - 1) * 100);
  };

  const effectiveFeather = calcEffectiveBoost(featherBonus, true);
  const effectiveScrap = calcEffectiveBoost(scrapBonus, true);
  const effectiveXp = calcEffectiveBoost(xpBonus, false); // XP doesn't use consumable in BattleArena logic
  
  // Chance bonuses are additive usually, but let's just show the raw +% Chance for clarity or apply consumable if it made sense (it doesn't for chances usually in this game logic)
  // BattleArena: diamondChanceBonus is additive to base chance.
  
  const hasBattleBoosts = effectiveFeather > 0 || effectiveScrap > 0 || effectiveXp > 0 || diamondChanceBonus > 0 || itemFindBonus > 0 || gemFindBonus > 0;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="text-center py-8">
          <h2 className="font-tech text-4xl text-white mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">SECTOR MAP</h2>
          <p className="text-slate-400 text-sm tracking-wide">Select a combat zone to deploy your unit.</p>
      </div>

      {hasBattleBoosts && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 mx-1 backdrop-blur-sm shadow-xl relative overflow-hidden">
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
                  {diamondChanceBonus > 0 && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold">
                              <Gem size={14} className="text-blue-400" /> Diamond
                          </div>
                          <div className="font-mono font-bold text-blue-400">+{diamondChanceBonus.toFixed(1)}%</div>
                      </div>
                  )}
                  {itemFindBonus > 0 && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold">
                              <Briefcase size={14} className="text-purple-400" /> Items
                          </div>
                          <div className="font-mono font-bold text-purple-400">+{itemFindBonus.toFixed(1)}%</div>
                      </div>
                  )}
                  {gemFindBonus > 0 && (
                      <div className="bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold">
                              <Hexagon size={14} className="text-rose-400" /> Gems
                          </div>
                          <div className="font-mono font-bold text-rose-400">+{gemFindBonus.toFixed(1)}%</div>
                      </div>
                  )}
              </div>
          </div>
      )}

      <div className="space-y-4">
          <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-orange-600 rounded-lg opacity-50 blur group-hover:opacity-75 transition duration-200"></div>
              <button 
                onClick={onBattle}
                disabled={isHunting}
                className="relative w-full bg-slate-900 rounded-lg p-6 flex items-center justify-between border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed group-active:scale-[0.99] transition-transform"
              >
                  <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-rose-900/30 rounded-full flex items-center justify-center border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                          <Swords className="text-rose-500" size={28} />
                      </div>
                      <div className="text-left">
                          <div className="text-rose-400 font-bold text-xs uppercase tracking-widest mb-1">Current Frontier</div>
                          <div className="font-tech text-3xl text-white font-bold drop-shadow-md">ZONE {currentZone}</div>
                          <div className="text-xs text-slate-500 mt-1 font-mono">THREAT LEVEL: ADAPTIVE</div>
                      </div>
                  </div>
                  
                  {isHunting ? (
                      <div className="flex flex-col items-end text-amber-500 bg-amber-950/50 px-3 py-2 rounded border border-amber-900/50">
                          <Target size={20} className="mb-1 animate-pulse" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">UNIT HUNTING</span>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-rose-500 font-bold tracking-widest text-sm group-hover:text-rose-400 transition-colors">
                            DEPLOY
                        </div>
                        <div className="w-12 h-0.5 bg-rose-500/50" />
                      </div>
                  )}
              </button>
          </div>
          
          {isHunting && (
              <div className="flex items-start gap-3 bg-amber-900/10 p-3 rounded border border-amber-900/30">
                   <Target size={16} className="text-amber-500 mt-0.5 shrink-0" />
                   <div className="text-xs text-amber-500/80 font-mono leading-relaxed">
                      Active unit is currently assigned to resource hunting operations. Recall unit from the Roster to enable combat deployment.
                   </div>
              </div>
          )}

          {currentZone > 1 && (
             <div className="opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                <div className="w-full bg-slate-900 rounded-lg p-4 flex items-center justify-between border border-slate-800 hover:border-emerald-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-900/20 rounded-full flex items-center justify-center border border-emerald-900/30">
                            <CheckIcon />
                        </div>
                        <div className="text-left">
                            <div className="font-tech text-lg text-slate-400">ZONE {currentZone - 1}</div>
                            <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Sector Cleared</div>
                        </div>
                    </div>
                </div>
             </div>
          )}

          <div className="opacity-40">
               <div className="w-full bg-slate-950 rounded-lg p-6 flex items-center justify-between border border-slate-900 border-dashed">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-slate-700">
                          <Lock size={20} />
                      </div>
                      <div className="text-left">
                          <div className="text-slate-600 font-bold text-xs uppercase tracking-widest mb-1">Restricted</div>
                          <div className="font-tech text-2xl text-slate-700">ZONE {currentZone + 1}</div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
