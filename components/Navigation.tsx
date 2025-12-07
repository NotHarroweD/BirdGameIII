
import React from 'react';
import { HubTab } from '../types';
import { ArrowUpCircle, Users, FlaskConical, Map, Package } from 'lucide-react';

interface NavigationProps {
  activeTab: HubTab;
  onNavigate: (tab: HubTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onNavigate }) => {
  const navItems = [
    { id: HubTab.MAP, icon: <Map size={20} />, label: 'Battle' },
    { id: HubTab.ROSTER, icon: <Users size={20} />, label: 'Roster' },
    { id: HubTab.INVENTORY, icon: <Package size={20} />, label: 'Items' },
    { id: HubTab.LAB, icon: <FlaskConical size={20} />, label: 'Lab' },
    { id: HubTab.UPGRADES, icon: <ArrowUpCircle size={20} />, label: 'Upgrades' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-stretch z-50 pb-safe">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all relative ${
              isActive ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {/* Active Indicator Line */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
            )}
            
            <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
              {item.icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
