import { GrowthStageType } from '../components/GrowthStageIcons';

export interface GrowthProgress {
    current: number;
    total: number;
    unitIcon: GrowthStageType;
}

export interface GrowthState {
    state: 'empty' | 'sprout' | 'seedling' | 'sapling' | 'tree' | 'forest';
    stage: GrowthStageType;
    stageName: string;
    stageAriaLabel: string;
    helper: string | null;
    progress: GrowthProgress;
    leafUnits: number;
    nextUnitProgress: {
        current: number; // minutes
        target: number;  // 25
        percent: number; // 0-1
    };
}

export function computeWeeklyGrowth(weekMinutes: number): GrowthState {
    const units = Math.floor(weekMinutes / 25);
    const remainder = Math.floor(weekMinutes % 25);
    
    const getProgress = (current: number, total: number, unitIcon: GrowthStageType): GrowthProgress => ({
        current,
        total,
        unitIcon
    });

    const nextUnitProgress = {
        current: remainder,
        target: 25,
        percent: remainder / 25
    };

    const commonState = {
        leafUnits: units,
        nextUnitProgress
    };

    // Level 0: Empty (0 units)
    if (units < 1) {
        return {
            state: 'empty',
            stage: 'empty',
            stageName: '准备中',
            stageAriaLabel: '准备中',
            helper: '从一次 5 分钟专注开始',
            progress: getProgress(0, 3, 'sprout'),
            ...commonState
        };
    }

    // Level 1: Sprout (1-2 units) -> Target 3 (75 min)
    if (units < 3) {
        return {
            state: 'sprout',
            stage: 'sprout',
            stageName: '萌芽',
            stageAriaLabel: '萌芽阶段',
            helper: null,
            progress: getProgress(units, 3, 'sprout'),
            ...commonState
        };
    }

    // Level 2: Seedling (3-7 units) -> Target 8 (200 min)
    if (units < 8) {
        return {
            state: 'seedling',
            stage: 'seedling',
            stageName: '生长',
            stageAriaLabel: '生长阶段',
            helper: null,
            progress: getProgress(units - 3 + 1, 6, 'seedling'), // Show 1-6 seedlings
            ...commonState
        };
    }

    // Level 3: Sapling (8-17 units) -> Target 18 (450 min)
    if (units < 18) {
        // Scale 10 units to 5 visual steps
        const progress = Math.ceil((units - 8 + 1) / 2); 
        return {
            state: 'sapling',
            stage: 'sapling',
            stageName: '树苗',
            stageAriaLabel: '树苗阶段',
            helper: null,
            progress: getProgress(progress, 5, 'sapling'),
            ...commonState
        };
    }

    // Level 4: Tree (18-31 units) -> Target 32 (800 min)
    if (units < 32) {
        // Scale 14 units to 5 visual steps
        const progress = Math.ceil((units - 18 + 1) / 3);
        return {
            state: 'tree',
            stage: 'tree',
            stageName: '小树',
            stageAriaLabel: '小树阶段',
            helper: null,
            progress: getProgress(Math.min(progress, 5), 5, 'tree'),
            ...commonState
        };
    }

    // Level 5: Forest (32+ units) -> 800 min+
    return {
        state: 'forest',
        stage: 'forest',
        stageName: '茂盛',
        stageAriaLabel: '茂盛阶段',
        helper: null,
        progress: getProgress(5, 5, 'forest'),
        ...commonState
    };
}

export function computeNextStage(weekMinutes: number) {
    const units = Math.floor(Math.max(0, weekMinutes) / 25);

    const getNext = (): { nextUnits: number; nextStageName: string } | null => {
        if (units < 1) return { nextUnits: 1, nextStageName: '萌芽' };
        if (units < 3) return { nextUnits: 3, nextStageName: '生长' };
        if (units < 8) return { nextUnits: 8, nextStageName: '树苗' };
        if (units < 18) return { nextUnits: 18, nextStageName: '小树' };
        if (units < 32) return { nextUnits: 32, nextStageName: '茂盛' };
        return null;
    };

    const next = getNext();
    if (!next) return null;

    const minutesToNext = Math.max(0, next.nextUnits * 25 - weekMinutes);
    return {
        ...next,
        minutesToNext
    };
}
