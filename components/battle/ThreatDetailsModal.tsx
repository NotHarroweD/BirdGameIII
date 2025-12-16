
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { EnemyPrefix } from '../../types';
import { ENEMY_TYPE_INFO } from './utils';

interface ThreatDetailsModalProps {
    isVisible: boolean;
    prefix: EnemyPrefix;
    onClose: () => void;
}

export const ThreatDetailsModal: React.FC<ThreatDetailsModalProps> = ({ isVisible, prefix, onClose }) => {
    if (!isVisible || prefix === EnemyPrefix.NONE) return null;

    return (
       <AnimatePresence>
           <motion.div
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
               onClick={onClose}
           >
               <motion.div
                   initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                   className="bg-slate-900 border-2 border-amber-500/50 p-6 rounded-2xl max-w-sm w-full shadow-2xl relative"
                   onClick={e => e.stopPropagation()}
               >
                   <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
                   
                   <div className="text-center mb-6">
                       <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-500/50">
                           <AlertTriangle size={32} className="text-amber-400" />
                       </div>
                       <h3 className="font-tech text-2xl text-white uppercase tracking-widest">{prefix} THREAT</h3>
                       <div className="text-amber-400 font-bold text-sm">{ENEMY_TYPE_INFO[prefix].description}</div>
                   </div>

                   <div className="space-y-4">
                       <div className="bg-slate-900 p-4 rounded border border-slate-800">
                           <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Combat Modifiers</div>
                           <div className="text-rose-400 font-mono font-bold text-sm">{ENEMY_TYPE_INFO[prefix].stats}</div>
                       </div>
                       <div className="bg-slate-900 p-4 rounded border border-slate-800">
                           <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Victory Rewards</div>
                           <div className="text-emerald-400 font-mono font-bold text-sm">{ENEMY_TYPE_INFO[prefix].rewards}</div>
                       </div>
                   </div>
                   
                   <div className="mt-6 text-center text-[10px] text-slate-500 italic">
                       Tap anywhere to close
                   </div>
               </motion.div>
           </motion.div>
       </AnimatePresence>
    );
};
