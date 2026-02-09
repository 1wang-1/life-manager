import React from 'react';

export type GrowthStageType = 'empty' | 'sprout' | 'seedling' | 'sapling' | 'tree' | 'forest';

const STAGE_ASSETS: Record<GrowthStageType, string> = {
    empty: 'growth-stages/stage_0.png',
    sprout: 'growth-stages/stage_1.png',
    seedling: 'growth-stages/stage_2.png',
    sapling: 'growth-stages/stage_3.png',
    tree: 'growth-stages/stage_4.png',
    forest: 'growth-stages/stage_5.png'
};

const STAGE_TRANSFORMS: Partial<Record<GrowthStageType, string>> = {
    empty: 'translateY(-9%)',
    sprout: 'translateY(9%)'
};

type IconProps = {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
    color?: string;
};

export const GrowthIcon: React.FC<{ stage: GrowthStageType } & IconProps> = ({ 
    stage, 
    size = 24, 
    className, 
    style
}) => {
    const imgSrc = STAGE_ASSETS[stage] || STAGE_ASSETS.empty;
    const transform = STAGE_TRANSFORMS[stage];

    const finalStyle: React.CSSProperties = {
        ...style,
        objectFit: 'contain',
        transform: style?.transform 
            ? `${style.transform} ${transform || ''}` 
            : transform
    };

    return (
        <img
            src={imgSrc}
            alt={stage}
            width={size}
            height={size}
            className={className}
            style={finalStyle}
            draggable={false}
        />
    );
};

export const GrowthStageEmpty: React.FC<IconProps> = (props) => <GrowthIcon stage="empty" {...props} />;
export const GrowthStageSprout: React.FC<IconProps> = (props) => <GrowthIcon stage="sprout" {...props} />;
export const GrowthStageSeedling: React.FC<IconProps> = (props) => <GrowthIcon stage="seedling" {...props} />;
export const GrowthStageSapling: React.FC<IconProps> = (props) => <GrowthIcon stage="sapling" {...props} />;
export const GrowthStageTree: React.FC<IconProps> = (props) => <GrowthIcon stage="tree" {...props} />;
export const GrowthStageForest: React.FC<IconProps> = (props) => <GrowthIcon stage="forest" {...props} />;
