
import { BattleBird, BirdInstance, Gear, Rarity, EnemyPrefix, ConsumableType, ActiveBuff, APShopState, Gem, Consumable } from '../../types';
import { RARITY_CONFIG, generateGem, rollRarity } from '../../constants';

const getAPMult = (level: number) => 1 + (level * 0.02);

export const calculateRewards = (
    opponent: BattleBird,
    playerBird: BirdInstance,
    enemyLevel: number,
    activeBuffs: ActiveBuff[],
    apShop: APShopState | undefined,
    gemUnlocked: boolean
) => {
    const rarityConfig = RARITY_CONFIG[opponent.rarity];
    const rarityMult = rarityConfig.minMult; 
    
    let xpBonus = 0;
    let scrapBonus = 0;
    let featherBonus = 0;
    let diamondChanceBonus = 0;
    let gemFindBonus = 0;
    let itemFindBonus = 0;

    const addGemBuffs = (g: Gear | null) => {
            if (!g || !g.sockets) return;
            g.sockets.forEach(gem => {
                if (gem) {
                    gem.buffs.forEach(b => {
                        if (b.stat === 'XP_BONUS') xpBonus += b.value;
                        if (b.stat === 'SCRAP_BONUS') scrapBonus += b.value;
                        if (b.stat === 'FEATHER_BONUS') featherBonus += b.value;
                        if (b.stat === 'DIAMOND_BATTLE_CHANCE') diamondChanceBonus += b.value;
                        if (b.stat === 'GEM_FIND_CHANCE') gemFindBonus += b.value;
                        if (b.stat === 'ITEM_FIND_CHANCE') itemFindBonus += b.value;
                    });
                }
            });
    };
    addGemBuffs(playerBird.gear.beak);
    addGemBuffs(playerBird.gear.claws);

    const rewardBuff = activeBuffs.find(b => b.type === ConsumableType.BATTLE_REWARD);
    let consumableMult = rewardBuff ? rewardBuff.multiplier : 1.0;

    const apFeatherMult = getAPMult(apShop?.featherBoost || 0);
    const apScrapMult = getAPMult(apShop?.scrapBoost || 0);
    const apDiamondMult = getAPMult(apShop?.diamondBoost || 0);
    const apItemMult = getAPMult(apShop?.itemDropBoost || 0);
    const apGemMult = getAPMult(apShop?.gemDropBoost || 0);

    // Apply Prefix Bonuses
    let prefixXpMult = opponent.enemyPrefix === EnemyPrefix.GENIUS ? 3 : 1;
    let prefixFeatherMult = opponent.enemyPrefix === EnemyPrefix.MERCHANT ? 3 : 1;
    let prefixScrapMult = opponent.enemyPrefix === EnemyPrefix.SCRAPOHOLIC ? 3 : 1;
    
    const baseXp = 100 * (1 + enemyLevel * 0.5) * rarityMult * prefixXpMult;
    const xpReward = Math.floor(baseXp * (1 + (xpBonus / 100)));
    
    const baseFeathers = 50 * (1 + enemyLevel * 0.2) * rarityMult * prefixFeatherMult;
    const featherReward = Math.floor(baseFeathers * (1 + (featherBonus / 100)) * consumableMult * apFeatherMult);
    
    let scrapChance = 0;
    let scrapMin = 0;
    let scrapMax = 0;

    switch (opponent.rarity) {
        case Rarity.COMMON: scrapChance = 0.15; scrapMin = 2; scrapMax = 5; break;
        case Rarity.UNCOMMON: scrapChance = 0.25; scrapMin = 5; scrapMax = 10; break;
        case Rarity.RARE: scrapChance = 0.40; scrapMin = 8; scrapMax = 15; break;
        case Rarity.EPIC: scrapChance = 0.60; scrapMin = 15; scrapMax = 30; break;
        case Rarity.LEGENDARY: scrapChance = 0.80; scrapMin = 40; scrapMax = 80; break;
        case Rarity.MYTHIC: scrapChance = 1.00; scrapMin = 100; scrapMax = 200; break;
        default: scrapChance = 0.10; scrapMin = 1; scrapMax = 3;
    }

    const levelScale = (1 + enemyLevel * 0.3) * (1 + playerBird.level * 0.1);
    
    let scrapReward = 0;
    // Scrapoholic always drops scrap
    if (opponent.enemyPrefix === EnemyPrefix.SCRAPOHOLIC || Math.random() < scrapChance * (1 + scrapBonus / 100)) {
        scrapReward = Math.floor((scrapMin + Math.random() * (scrapMax - scrapMin)) * levelScale * prefixScrapMult * consumableMult * apScrapMult);
    }

    let diamonds = 0;
    const totalDiamondChance = diamondChanceBonus + (apShop?.diamondBoost || 0);
    if (Math.random() * 100 < totalDiamondChance + 5.0) { // Base chance 5% + bonus
        diamonds = 1;
    }

    let gemReward: Gem | undefined;
    let totalGemChance = 0;
    if (opponent.enemyPrefix === EnemyPrefix.GEMFINDER) {
        totalGemChance = 1000;
    } else if (gemUnlocked) {
        const baseGemChance = 0.5; 
        let rarityGemBonus = 0;
        // Keep rarity bonus logic from original file
        if (opponent.rarity === Rarity.RARE) rarityGemBonus = 0.5;
        if (opponent.rarity === Rarity.EPIC) rarityGemBonus = 1.5;
        if (opponent.rarity === Rarity.LEGENDARY) rarityGemBonus = 3.0;
        if (opponent.rarity === Rarity.MYTHIC) rarityGemBonus = 5.0;
        
        totalGemChance = (baseGemChance + rarityGemBonus + gemFindBonus) * apGemMult;
    }
    
    if (Math.random() * 100 < totalGemChance) {
        gemReward = generateGem(rollRarity(opponent.rarity === Rarity.COMMON ? 0 : 2)); 
    }

    let consumableReward: Consumable | undefined;
    let totalItemChance = 0;
    if (opponent.enemyPrefix === EnemyPrefix.HOARDER) {
        totalItemChance = 1000;
    } else {
        let baseConsumableChance = 5.0;
        // Keep rarity chance from original file
        if (opponent.rarity === Rarity.COMMON) baseConsumableChance = 3.0;
        if (opponent.rarity === Rarity.UNCOMMON) baseConsumableChance = 5.0;
        if (opponent.rarity === Rarity.RARE) baseConsumableChance = 8.0;
        if (opponent.rarity === Rarity.EPIC) baseConsumableChance = 12.0;
        if (opponent.rarity === Rarity.LEGENDARY) baseConsumableChance = 18.0;
        if (opponent.rarity === Rarity.MYTHIC) baseConsumableChance = 25.0;
        
        totalItemChance = (baseConsumableChance + itemFindBonus) * apItemMult;
    }

    if (Math.random() * 100 < totalItemChance) {
        const type = Math.random() < 0.5 ? ConsumableType.HUNTING_SPEED : ConsumableType.BATTLE_REWARD;
        const rarity = rollRarity(-1); 
        consumableReward = { type, rarity, count: 1 };
    }

    return {
        xp: xpReward,
        feathers: featherReward,
        scrap: scrapReward,
        diamonds,
        gem: gemReward,
        consumable: consumableReward
    };
};
