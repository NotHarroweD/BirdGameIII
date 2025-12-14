
import React from 'react';
import { HubTab, PlayerState } from '../types';
import { ArrowUpCircle, Users, FlaskConical, Map, Package, Trophy } from 'lucide-react';
import { ACHIEVEMENTS } from '../constants';

interface NavigationProps {
  activeTab: HubTab;
  onNavigate: (tab: HubTab) => void;
  playerState?: PlayerState; // Optional for compatibility but used for notifications
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onNavigate, playerState }) => {
  const allTabs = [
    { id: HubTab.MAP, icon: Map, label: 'Map', requiresUnlock: false },
    { id: HubTab.ROSTER, icon: Users, label: 'Roster', requiresUnlock: false },
    { id: HubTab.LAB, icon: FlaskConical, label: 'Lab', requiresUnlock: false },
    { id: HubTab.INVENTORY, icon: Package, label: 'Items', requiresUnlock: false },
    { id: HubTab.UPGRADES, icon: ArrowUpCircle, label: 'Upgrade', requiresUnlock: true, unlockKey: 'upgrades' },
    { id: HubTab.ACHIEVEMENTS, icon: Trophy, label: 'Glory', requiresUnlock: true, unlockKey: 'achievements' },
  ];

  // Filter tabs based on unlocks
  const visibleTabs = allTabs.filter(tab => {
      if (!tab.requiresUnlock) return true;
      if (!playerState) return false;
      // @ts-ignore
      return playerState.unlocks[tab.unlockKey];
  });

  // Calculate unclaimed achievements count if playerState is provided
  const unclaimedAchievements = playerState ? ACHIEVEMENTS.reduce((count, achievement) => {
      // @ts-ignore
      const currentValue = playerState.lifetimeStats?.[achievement.statKey] || 0;
      let progress = currentValue;

      // Adjust progress by baseline for cumulative stats
      if (achievement.statKey !== 'highestZoneReached' && achievement.statKey !== 'maxPerfectCatchStreak' && achievement.statKey !== 'systemUnlocked') {
          // @ts-ignore
          const baseline = playerState.achievementBaselines?.[achievement.statKey] || 0;
          progress = Math.max(0, currentValue - baseline);
      }
      
      const hasUnclaimed = achievement.stages.some((stage, index) => {
          const stageId = `${achievement.id}_stage_${index}`;
          const isClaimed = playerState.completedAchievementIds.includes(stageId);
          return !isClaimed && progress >= stage.targetValue;
      });

      return hasUnclaimed ? count + 1 : count;
  }, 0) : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 pb-safe z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
      <div className="flex justify-around items-center px-2 py-2 md:py-3 max-w-4xl mx-auto">
        {visibleTabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 min-w-[56px] select-none touch-manipulation active:scale-95 ${
                isActive 
                  ? 'text-cyan-400 bg-cyan-950/20' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
              }`}
            >
              <div className="relative">
                  <Icon size={22} className={`transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] scale-110' : ''}`} />
                  
                  {/* Notification Dot for Achievements */}
                  {tab.id === HubTab.ACHIEVEMENTS && unclaimedAchievements > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border border-slate-900 flex items-center justify-center z-10">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      </div>
                  )}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ${isActive ? 'text-cyan-400' : 'text-slate-600'}`}>
                {tab.label}
              </span>
              
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Mobile Safe Area Spacer */}
      <div className="h-[env(safe-area-inset-bottom)] bg-slate-950" />
    </div>
  );
};
