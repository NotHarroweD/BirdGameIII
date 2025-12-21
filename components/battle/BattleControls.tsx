import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { BattleBird, Move, MoveType, SkillCheckType } from '../../types';
import { Crosshair, Shield, Heart, Zap, Activity, Wind } from 'lucide-react';

interface BattleControlsProps {
    playerBird: BattleBird;
    lastUsedMap: Record<string, number>;
    onMove: (move: Move) => void;
    disabled: boolean;
}

interface BattleActionButtonProps {
    move: Move;
    disabled: boolean;
    remainingCooldown: number;
    onClick: (move: Move) => void;
    hasGearCrit: boolean;
    hasGearBleed: boolean;
    energyCost: number;
}

const BattleActionButton: React.FC<BattleActionButtonProps> = memo(({
    move,
    disabled,
    remainingCooldown,
    onClick,
    hasGearCrit,
    hasGearBleed,
    energyCost
}) => {
    const onCd = remainingCooldown > 0;
    const [isPressed, setIsPressed] = useState(false);
    
    // We handle the pointer interaction manually to ensure instant feedback
    // and to reliably trigger the game logic even if the component is re-rendering frequently.
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (disabled || onCd) return;
        
        // Use standard button behavior but capture explicitly
        if (e.target instanceof Element) {
            e.currentTarget.setPointerCapture(e.pointerId);
        }
        
        setIsPressed(true);
        if (navigator.vibrate) navigator.vibrate(10);
        
        // Trigger immediately on down for snappiest feel
        onClick(move);
    }, [disabled, onCd, onClick, move]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        setIsPressed(false);
        if (e.target instanceof Element && e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    }, []);

    // Also handle leave to reset visual state if finger slides off
    const handlePointerLeave = useCallback(() => setIsPressed(false), []);

    // Determine visual style based on move type
    let baseColor = 'bg-slate-800 border-slate-700';
    let activeColor = 'bg-slate-700';
    let iconColor = 'text-slate-400';

    if (!disabled) {
        switch (move.type) {
            case MoveType.ATTACK:
                baseColor = 'bg-rose-900/80 border-rose-700';
                activeColor = 'bg-rose-800';
                iconColor = 'text-rose-400';
                break;
            case MoveType.DEFENSE:
                baseColor = 'bg-cyan-900/80 border-cyan-700';
                activeColor = 'bg-cyan-800';
                iconColor = 'text-blue-400';
                break;
            case MoveType.HEAL:
                baseColor = 'bg-emerald-900/80 border-emerald-700';
                activeColor = 'bg-emerald-800';
                iconColor = 'text-emerald-400';
                break;
            case MoveType.DRAIN:
                baseColor = 'bg-purple-900/80 border-purple-700';
                activeColor = 'bg-purple-800';
                iconColor = 'text-purple-400';
                break;
            case MoveType.SPECIAL:
                baseColor = 'bg-amber-900/80 border-amber-700';
                activeColor = 'bg-amber-800';
                iconColor = 'text-amber-400';
                break;
        }
    }

    return (
        <button 
            type="button"
            disabled={disabled}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            className={`
                relative flex flex-col items-center justify-center p-2 rounded-lg border-b-4 transition-all overflow-hidden touch-none select-none
                ${isPressed ? `scale-95 brightness-125 border-b-0 translate-y-1 ${activeColor}` : `scale-100 ${baseColor}`}
                ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:brightness-110'}
            `}
            style={{ minHeight: '80px' }}
        >
            {onCd && (
                <div className="absolute inset-0 bg-slate-950/80 z-20 flex items-center justify-center text-white font-mono text-sm pointer-events-none">
                    {(remainingCooldown/1000).toFixed(1)}s
                </div>
            )}
            <div className="mb-1 pointer-events-none">
                {move.type === MoveType.ATTACK && <Crosshair size={24} className={iconColor} />}
                {move.type === MoveType.DEFENSE && (
                    move.effect === 'dodge' ? <Wind size={24} className="text-cyan-400" /> : <Shield size={24} className={iconColor} />
                )}
                {move.type === MoveType.HEAL && <Heart size={24} className={iconColor} />}
                {move.type === MoveType.SPECIAL && <Zap size={24} className={iconColor} />}
                {move.type === MoveType.DRAIN && <Activity size={24} className={iconColor} />}
            </div>
            <div className="font-bold text-sm text-slate-100 uppercase tracking-tight leading-none text-center mb-1 pointer-events-none drop-shadow-md">{move.name}</div>
            <div className="flex items-center gap-1 text-xs text-cyan-300 font-mono pointer-events-none">
                <Zap size={10} fill="currentColor" /> {energyCost}
            </div>
            
            {/* Gear Indicators */}
            <div className="absolute top-1 left-1 flex gap-0.5 pointer-events-none">
                {hasGearCrit && <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_5px_yellow]" title="Crit Enabled" />}
                {hasGearBleed && <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shadow-[0_0_5px_red]" title="Bleed Enabled" />}
            </div>
            
            {/* Skill Check Indicator */}
            {move.skillCheck !== SkillCheckType.NONE && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white animate-pulse pointer-events-none shadow-[0_0_8px_white]" />
            )}
        </button>
    );
});

export const BattleControls: React.FC<BattleControlsProps> = memo(({ playerBird, lastUsedMap, onMove, disabled }) => {
    // Stable ref for the move handler to avoid re-binding
    const onMoveRef = useRef(onMove);
    useEffect(() => { onMoveRef.current = onMove; }, [onMove]);

    const stableOnMove = useCallback((move: Move) => {
        onMoveRef.current(move);
    }, []);

    return (
        <div className="bg-slate-900 border-t border-slate-700 p-2 shrink-0 pb-6 md:pb-2 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 h-auto">
                {playerBird.moves.map(m => {
                    const expiry = lastUsedMap[m.id] || 0;
                    const remaining = Math.max(0, expiry - Date.now());
                    const onCd = remaining > 0;
                    const canAfford = playerBird.currentEnergy >= m.cost;
                    
                    // IMPORTANT: We now include the global `disabled` prop in the button's disabled state.
                    // This gives immediate visual feedback that the action cannot be taken (e.g. opponent turn),
                    // preventing the user from pressing and thinking the game is unresponsive.
                    const isBtnDisabled = disabled || onCd || !canAfford;

                    return (
                        <BattleActionButton 
                            key={m.id}
                            move={m}
                            disabled={isBtnDisabled}
                            remainingCooldown={remaining}
                            onClick={stableOnMove}
                            hasGearCrit={m.type === MoveType.ATTACK && !!playerBird.gear?.beak}
                            hasGearBleed={m.type === MoveType.ATTACK && !!playerBird.gear?.claws}
                            energyCost={m.cost}
                        />
                    )
                })}
            </div>
       </div>
    );
});
