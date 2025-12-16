
import React, { useState } from 'react';
import { PlayerState, HubTab, HubProps, ConsumableType } from '../types';
import { Navigation } from './Navigation';
import { RosterView } from './RosterView';
import { LabView } from './LabView';
import { MapView } from './MapView';
import { InventoryView } from './InventoryView';
import { UpgradesView } from './UpgradesView';
import { AchievementsView } from './AchievementsView';
import { Database, Hammer, Gem, Clock, Award } from 'lucide-react';
import { RARITY_CONFIG } from '../constants';

export const Hub: React.FC<HubProps> = ({ 
    playerState, 
    onBattle, 
    onUpgrade, 
    onSelectBird, 
    onTryCraft, 
    onTryCraftGem,
    onKeepGear,
    onSalvageGear,
    onKeepGem,
    onSalvageGem,
    onBatchSalvageGems,
    onEquip, 
    onUnequip,
    onAssignHunter,
    onRecallHunter,
    onKeepBird,
    onReleaseBird,
    initialTab = HubTab.MAP,
    onSocketGem,
    onUnsocketGem,
    onUseConsumable,
    onClaimAchievement,
    onBuyAPUpgrade,
    onUnlockFeature,
    currentZone,
    onSelectZone
}) => {
  const [activeTab, setActiveTab] = useState<HubTab>(initialTab);

  // Switch to new tab if initialTab prop changes
  React.useEffect(() => {
      setActiveTab(initialTab);
  }, [initialTab]);

  let passiveRate = 0;
  playerState.huntingBirdIds.forEach(id => {
      const bird = playerState.birds.find(b => b.instanceId === id);
      if (bird) {
          // Updated leveling bonus to 0.5 (50%) per level
          passiveRate += (bird.huntingConfig.baseRate * RARITY_CONFIG[bird.rarity].minMult * (1 + bird.level * 0.5));
      }
  });

  // Apply active hunt buff to display
  const huntBuff = playerState.activeBuffs.find(b => b.type === ConsumableType.HUNTING_SPEED);
  if (huntBuff) {
      passiveRate *= huntBuff.multiplier;
  }
  
  // Apply AP Boost to Display Rate
  const apBoost = 1 + (playerState.apShop.featherBoost * 0.02);
  passiveRate *= apBoost;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      
      {/* Top Bar - Updated Layout */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-40 flex items-center px-4 md:px-6 shadow-lg gap-4">
          
          {/* Resources Container - Now takes available space */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                  <Database className="text-cyan-400" size={16} />
                  <div className="flex flex-col">
                      <span className="font-tech text-base md:text-xl font-bold leading-none">{Math.floor(playerState.feathers).toLocaleString()}</span>
                      <span className="text-[8px] md:text-[9px] text-slate-500 uppercase tracking-wider">Feathers</span>
                  </div>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 border-l border-slate-700 pl-4 shrink-0">
                  <Hammer className="text-slate-400" size={14} />
                  <div className="flex flex-col">
                      <span className="font-tech text-base md:text-xl font-bold leading-none text-slate-300">{Math.floor(playerState.scrap).toLocaleString()}</span>
                      <span className="text-[8px] md:text-[9px] text-slate-500 uppercase tracking-wider">Scrap</span>
                  </div>
              </div>
               <div className="flex items-center gap-1.5 md:gap-2 border-l border-slate-700 pl-4 shrink-0">
                  <Gem className="text-blue-400" size={14} />
                  <div className="flex flex-col">
                      <span className="font-tech text-base md:text-xl font-bold leading-none text-blue-300">{playerState.diamonds}</span>
                      <span className="text-[8px] md:text-[9px] text-slate-500 uppercase tracking-wider">Gems</span>
                  </div>
              </div>
          </div>
          
          {/* Stats & Buffs - Fixed on Right */}
          <div className="flex items-center gap-4 shrink-0">
              <div className="text-right hidden lg:block">
                  <div className="text-xs text-slate-500">GATHERING RATE</div>
                  <div className="font-mono text-emerald-400">+{passiveRate.toFixed(1)}/s</div>
              </div>
              
              {/* Buff Indicators */}
              <div className="flex items-center gap-2">
                  {playerState.activeBuffs.map((buff, i) => {
                      const config = RARITY_CONFIG[buff.rarity];
                      return (
                          <div key={i} className={`p-1.5 rounded border ${config.borderColor} bg-slate-900 relative group shadow-md`}>
                              {buff.type === ConsumableType.HUNTING_SPEED && <Clock size={18} className={config.color} />}
                              {buff.type === ConsumableType.BATTLE_REWARD && <Award size={18} className={config.color} />}
                              
                              <div className="absolute top-full right-0 mt-1 bg-slate-900 border border-slate-700 p-2 rounded shadow-xl z-50 hidden group-hover:block whitespace-nowrap">
                                  <div className={`text-xs font-bold ${config.color}`}>{buff.type === ConsumableType.HUNTING_SPEED ? "Speed Boost" : "Reward Bonus"}</div>
                                  <div className="text-[10px] text-slate-400">
                                      {buff.type === ConsumableType.HUNTING_SPEED ? `${buff.remaining}s remaining` : `${buff.remaining} battles left`}
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>

      <div className="pt-20 px-4 md:px-6 max-w-4xl mx-auto min-h-screen">
          
          {activeTab === HubTab.ROSTER && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                  <RosterView 
                    playerState={playerState} 
                    onSelectBird={onSelectBird}
                    onEquip={onEquip}
                    onUnequip={onUnequip}
                    onAssignHunter={onAssignHunter}
                    onRecallHunter={onRecallHunter}
                    onReleaseBird={onReleaseBird}
                    onSalvageGear={onSalvageGear}
                    onSocketGem={onSocketGem}
                    onUnsocketGem={onUnsocketGem}
                  />
              </div>
          )}

          {activeTab === HubTab.INVENTORY && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                  <InventoryView 
                    playerState={playerState} 
                    onSalvageGear={onSalvageGear}
                    onSocketGem={onSocketGem}
                    onUnsocketGem={onUnsocketGem}
                    onUseConsumable={onUseConsumable}
                    onBatchSalvageGems={onBatchSalvageGems}
                  />
              </div>
          )}

          {activeTab === HubTab.LAB && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                  <LabView 
                    playerState={playerState} 
                    onUpgrade={onUpgrade} 
                    onTryCraft={onTryCraft} 
                    onTryCraftGem={onTryCraftGem}
                    onKeepGear={onKeepGear}
                    onSalvageGear={onSalvageGear}
                    onKeepGem={onKeepGem}
                    onSalvageGem={onSalvageGem}
                    onUnlockFeature={onUnlockFeature}
                  />
              </div>
          )}

          {activeTab === HubTab.MAP && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                  <MapView 
                    playerState={playerState} 
                    onBattle={onBattle}
                    currentZone={currentZone}
                    onSelectZone={onSelectZone}
                  />
              </div>
          )}

          {activeTab === HubTab.UPGRADES && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                  <UpgradesView 
                    playerState={playerState}
                    onUpgrade={onUpgrade}
                    onUnlockFeature={onUnlockFeature}
                  />
              </div>
          )}

          {activeTab === HubTab.ACHIEVEMENTS && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                  <AchievementsView 
                    playerState={playerState}
                    onClaimAchievement={onClaimAchievement}
                    onBuyAPUpgrade={onBuyAPUpgrade}
                    onUnlockFeature={onUnlockFeature}
                  />
              </div>
          )}
      </div>

      <Navigation activeTab={activeTab} onNavigate={setActiveTab} playerState={playerState} />
      
    </div>
  );
};
