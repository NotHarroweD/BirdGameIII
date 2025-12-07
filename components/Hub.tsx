
import React, { useState } from 'react';
import { PlayerState, HubTab, HubProps } from '../types';
import { Navigation } from './Navigation';
import { RosterView } from './RosterView';
import { LabView } from './LabView';
import { MapView } from './MapView';
import { InventoryView } from './InventoryView';
import { UpgradesView } from './UpgradesView';
import { Database, Activity, Target, Hammer, Gem } from 'lucide-react';
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
    onEquip, 
    onUnequip,
    onAssignHunter,
    onRecallHunter,
    onKeepBird,
    onReleaseBird,
    initialTab = HubTab.MAP,
    onSocketGem,
    onUnsocketGem
}) => {
  const [activeTab, setActiveTab] = useState<HubTab>(initialTab);

  let passiveRate = 0;
  playerState.huntingBirdIds.forEach(id => {
      const bird = playerState.birds.find(b => b.instanceId === id);
      if (bird) {
          passiveRate += (bird.huntingConfig.baseRate * RARITY_CONFIG[bird.rarity].minMult * (1 + bird.level * 0.1));
      }
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 z-40 flex items-center justify-between px-6 shadow-lg">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  <Database className="text-cyan-400" size={18} />
                  <div className="flex flex-col">
                      <span className="font-tech text-xl font-bold leading-none">{Math.floor(playerState.feathers).toLocaleString()}</span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider">Feathers</span>
                  </div>
              </div>
              <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
                  <Hammer className="text-slate-400" size={16} />
                  <div className="flex flex-col">
                      <span className="font-tech text-xl font-bold leading-none text-slate-300">{Math.floor(playerState.scrap).toLocaleString()}</span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider">Scrap</span>
                  </div>
              </div>
               <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
                  <Gem className="text-blue-400" size={16} />
                  <div className="flex flex-col">
                      <span className="font-tech text-xl font-bold leading-none text-blue-300">{playerState.diamonds}</span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider">Diamonds</span>
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                  <div className="text-xs text-slate-500">GATHERING RATE</div>
                  <div className="font-mono text-emerald-400">+{passiveRate.toFixed(1)}/s</div>
              </div>
              <div className="w-px h-8 bg-slate-800 hidden md:block" />
              <div className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700 flex items-center gap-2">
                  <Activity size={14} className="text-emerald-500" />
                  <span className="font-tech text-sm">ZONE {playerState.highestZone}</span>
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
                  />
              </div>
          )}

          {activeTab === HubTab.MAP && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                  <MapView 
                    playerState={playerState} 
                    onBattle={onBattle} 
                  />
              </div>
          )}

          {activeTab === HubTab.UPGRADES && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                  <UpgradesView 
                    playerState={playerState}
                    onUpgrade={onUpgrade}
                  />
              </div>
          )}
      </div>

      <Navigation activeTab={activeTab} onNavigate={setActiveTab} />
      
    </div>
  );
};
