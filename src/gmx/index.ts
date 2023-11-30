import { useMarketsInfo } from "./domain/synthetics/markets";
import { BigNumber, utils } from "ethers";
import { getDecreasePositionAmounts, getIncreasePositionAmounts, useSwapRoutes } from "./domain/synthetics/trade";
import { getPositionKey, usePositionsInfo } from "./domain/synthetics/positions";
import { useUserReferralInfo } from "./domain/referrals";
import { estimateExecuteIncreaseOrderGasLimit, gasLimits, getExecutionFee, useGasPrice } from "./domain/synthetics/fees";
import { createDecreaseOrderTxn, createIncreaseOrderTxn } from "./lib/order";
import { OrderType } from "./types";

export async function fetchMarkets(chainId: number, account: string) {
    account = utils.getAddress(account)
    const { marketsInfoData, tokensData } = await useMarketsInfo(chainId, account);
    return { markets: marketsInfoData, tokens: tokensData }
}

export { getPositionKey } from "./domain/synthetics/positions";

export async function fetchPositions(chainId: number, account: string) {
    account = utils.getAddress(account);
    const { marketsInfoData, tokensData } = await useMarketsInfo(chainId, account);
    const { positionsInfoData } = await usePositionsInfo(chainId, {
        account: account,
        marketsInfoData: marketsInfoData,
        tokensData: tokensData,
        showPnlInLeverage: false
    })
    return positionsInfoData
}

type IncreaseOrderReq = {
    chainId: number,
    account: string,
    marketAddress: string,
    collateralTokenAddress: string,
    initialCollateralAmount: BigNumber,
    leverage: BigNumber,
    triggerPrice?: BigNumber,
    isLong: boolean,
    orderType: OrderType.LimitIncrease | OrderType.MarketIncrease
}

export async function createIncreaseOrder(p: IncreaseOrderReq) {
    p.account = utils.getAddress(p.account)

    const values = await Promise.all([
        useMarketsInfo(p.chainId, p.account),
        useUserReferralInfo(undefined, p.chainId, p.account, true),
        gasLimits(p.chainId),
        useGasPrice(p.chainId)])

    const { marketsInfoData, tokensData } = values[0];
    const market = marketsInfoData![p.marketAddress]
    const collateralToken = tokensData![p.collateralTokenAddress]

    const { positionsInfoData } = await usePositionsInfo(p.chainId, {
        account: p.account,
        marketsInfoData: marketsInfoData,
        tokensData: tokensData,
        showPnlInLeverage: false
    })
    const posKey = getPositionKey(p.account, p.marketAddress, p.collateralTokenAddress, p.isLong)

    const swapRoute = useSwapRoutes(p.chainId, {
        marketsInfoData,
        fromTokenAddress: p.collateralTokenAddress,
        toTokenAddress: p.collateralTokenAddress,
    });

    const userReferralInfo = values[1];

    const increaseAmounts = getIncreasePositionAmounts({
        marketInfo: market,
        indexToken: market.indexToken,
        initialCollateralToken: collateralToken,
        collateralToken: collateralToken,
        isLong: p.isLong,
        initialCollateralAmount: p.initialCollateralAmount,
        position: positionsInfoData![posKey],
        leverage: p.leverage,
        indexTokenAmount: BigNumber.from(0),
        userReferralInfo: userReferralInfo,
        strategy: "leverageByCollateral",
        findSwapPath: swapRoute.findSwapPath,
    })

    const estimatedGas = estimateExecuteIncreaseOrderGasLimit(values[2], {
        swapsCount: increaseAmounts.swapPathStats?.swapPath.length,
    });
    const { gasPrice } = values[3];
    const executionFee = getExecutionFee(values[2], tokensData!, estimatedGas, gasPrice!);

    const tx = await createIncreaseOrderTxn(p.chainId, {
        account: p.account,
        marketAddress: p.marketAddress,
        initialCollateralAddress: p.collateralTokenAddress,
        initialCollateralAmount: p.initialCollateralAmount,
        swapPath: increaseAmounts.swapPathStats?.swapPath || [],
        sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
        acceptablePrice: increaseAmounts.acceptablePrice,
        triggerPrice: p.triggerPrice,
        isLong: p.isLong,
        orderType: p.orderType,
        executionFee: executionFee?.feeTokenAmount!,
        allowedSlippage: 0,
        referralCode: userReferralInfo?.userReferralCode,
        indexToken: market.indexToken
    });
    return tx
}

type DecreaseOrderReq = {
    chainId: number,
    account: string,
    marketAddress: string,
    collateralTokenAddress: string,
    isLong: boolean,
    orderType: OrderType.LimitDecrease | OrderType.MarketDecrease
}

export async function createDecreaseOrder(p: DecreaseOrderReq) {
    p.account = utils.getAddress(p.account)
    const values = await Promise.all([
        useMarketsInfo(p.chainId, p.account),
        useUserReferralInfo(undefined, p.chainId, p.account, true),
        gasLimits(p.chainId),
        useGasPrice(p.chainId)])

    const { marketsInfoData, tokensData } = values[0];
    const market = marketsInfoData![p.marketAddress]
    const collateralToken = tokensData![p.collateralTokenAddress]

    const { positionsInfoData } = await usePositionsInfo(p.chainId, {
        account: p.account,
        marketsInfoData: marketsInfoData,
        tokensData: tokensData,
        showPnlInLeverage: false
    })

    const posKey = getPositionKey(p.account, p.marketAddress, p.collateralTokenAddress, p.isLong)
    const decreaseAmounts = getDecreasePositionAmounts({
        marketInfo: market,
        collateralToken: collateralToken,
        isLong: p.isLong,
        position: positionsInfoData![posKey],
        userReferralInfo: undefined,
        closeSizeUsd: BigNumber.from(5),
        keepLeverage: false,
        minCollateralUsd: BigNumber.from(0),
        minPositionSizeUsd: BigNumber.from(0)
    })

    const estimatedGas = estimateExecuteIncreaseOrderGasLimit(values[2], {
        swapsCount: 0,
    });

    const { gasPrice } = values[3];
    const executionFee = getExecutionFee(values[2], tokensData!, estimatedGas, gasPrice!);

    const tx = await createDecreaseOrderTxn(p.chainId, {
        account: p.account,
        marketAddress: p.marketAddress,
        initialCollateralAddress: p.collateralTokenAddress,
        initialCollateralDeltaAmount: BigNumber.from(0),
        swapPath: [],
        receiveTokenAddress: p.collateralTokenAddress,
        sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
        sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
        acceptablePrice: decreaseAmounts.acceptablePrice,
        triggerPrice: decreaseAmounts.triggerPrice,
        minOutputUsd: BigNumber.from(0),
        isLong: p.isLong,
        decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
        orderType: p.orderType,
        executionFee: executionFee?.feeTokenAmount!,
        allowedSlippage: 0,
        referralCode: undefined,
        indexToken: market.indexToken,
        tokensData: tokensData!
    });
    return tx
}