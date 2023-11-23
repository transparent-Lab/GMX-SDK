import { BigNumber } from "ethers";

export type TokenData = Token & {
    prices: TokenPrices;
    balance?: BigNumber;
    totalSupply?: BigNumber;
};

export type TokensData = {
    [address: string]: TokenData;
};


export type ExecutionFee = {
    feeUsd: BigNumber;
    feeTokenAmount: BigNumber;
    feeToken: Token;
    isFeeHigh: boolean;
};

export type FeeItem = {
    deltaUsd: BigNumber;
    bps: BigNumber;
};

export type SwapFeeItem = FeeItem & {
    marketAddress: string;
    tokenInAddress: string;
    tokenOutAddress: string;
};

export type GasLimitsConfig = {
    depositSingleToken: BigNumber;
    depositMultiToken: BigNumber;
    withdrawalMultiToken: BigNumber;
    singleSwap: BigNumber;
    swapOrder: BigNumber;
    increaseOrder: BigNumber;
    decreaseOrder: BigNumber;
    estimatedFeeBaseGasLimit: BigNumber;
    estimatedFeeMultiplierFactor: BigNumber;
};

export enum DecreasePositionSwapType {
    NoSwap = 0,
    SwapPnlTokenToCollateralToken = 1,
    SwapCollateralTokenToPnlToken = 2,
}

export type Token = {
    name: string;
    symbol: string;
    assetSymbol?: string;
    baseSymbol?: string;
    decimals: number;
    address: string;
    priceDecimals?: number;
    wrappedAddress?: string;
    coingeckoUrl?: string;
    explorerUrl?: string;
    reservesUrl?: string;
    imageUrl?: string;

    isUsdg?: boolean;
    isNative?: boolean;
    isWrapped?: boolean;
    isShortable?: boolean;
    isStable?: boolean;
    isSynthetic?: boolean;
    isTempHidden?: boolean;
    isChartDisabled?: boolean;
    isV1Available?: boolean;
    isPlatformToken?: boolean;
};

export type TokenInfo = Token & {
    hasMaxAvailableLong?: boolean;
    hasMaxAvailableShort?: boolean;

    usdgAmount?: BigNumber;
    maxUsdgAmount?: BigNumber;

    poolAmount?: BigNumber;
    bufferAmount?: BigNumber;
    managedAmount?: BigNumber;
    managedUsd?: BigNumber;
    availableAmount?: BigNumber;
    availableUsd?: BigNumber;
    guaranteedUsd?: BigNumber;
    redemptionAmount?: BigNumber;
    reservedAmount?: BigNumber;

    balance?: BigNumber;

    weight?: BigNumber;

    maxPrice?: BigNumber;
    maxPrimaryPrice?: BigNumber;

    minPrice?: BigNumber;
    minPrimaryPrice?: BigNumber;

    contractMaxPrice?: BigNumber;
    contractMinPrice?: BigNumber;

    spread?: BigNumber;

    cumulativeFundingRate?: BigNumber;
    fundingRate?: BigNumber;

    globalShortSize?: BigNumber;

    maxAvailableLong?: BigNumber;
    maxAvailableShort?: BigNumber;

    maxGlobalLongSize?: BigNumber;
    maxGlobalShortSize?: BigNumber;

    maxLongCapacity?: BigNumber;
};

export type InfoTokens = {
    [key: string]: TokenInfo;
};

export type TokenPrices = {
    minPrice: BigNumber;
    maxPrice: BigNumber;
};



export enum OrderType {
    // the order will be cancelled if the minOutputAmount cannot be fulfilled
    MarketSwap = 0,
    // @dev LimitSwap: swap token A to token B if the minOutputAmount can be fulfilled
    LimitSwap = 1,
    // @dev MarketIncrease: increase position at the current market price
    // the order will be cancelled if the position cannot be increased at the acceptablePrice
    MarketIncrease = 2,
    // @dev LimitIncrease: increase position if the triggerPrice is reached and the acceptablePrice can be fulfilled
    LimitIncrease = 3,
    // @dev MarketDecrease: decrease position at the curent market price
    // the order will be cancelled if the position cannot be decreased at the acceptablePrice
    MarketDecrease = 4,
    // @dev LimitDecrease: decrease position if the triggerPrice is reached and the acceptablePrice can be fulfilled
    LimitDecrease = 5,
    // @dev StopLossDecrease: decrease position if the triggerPrice is reached and the acceptablePrice can be fulfilled
    StopLossDecrease = 6,
    // @dev Liquidation: allows liquidation of positions if the criteria for liquidation are met
    Liquidation = 7,
}