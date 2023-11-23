import ExchangeRouter from "../abis/ExchangeRouter.json";
import { getContract } from "../config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "../config/tokens";
import { TokenData, TokensData } from "../domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { DecreasePositionSwapType, OrderType, Token } from "../types";
import { expandDecimals, isMarketOrderType } from "./utils";
import { applySlippageToPrice } from "./trade";
import { applySlippageToMinOut } from "../domain/synthetics/trade";

const { AddressZero } = ethers.constants;

type IncreaseOrderParams = {
    account: string;
    marketAddress: string;
    initialCollateralAddress: string;
    initialCollateralAmount: BigNumber;
    swapPath: string[];
    sizeDeltaUsd: BigNumber;
    acceptablePrice: BigNumber;
    triggerPrice: BigNumber | undefined;
    isLong: boolean;
    orderType: OrderType.MarketIncrease | OrderType.LimitIncrease;
    executionFee: BigNumber;
    allowedSlippage: number;
    referralCode: string | undefined;
    indexToken: TokenData;
};

function convertToContractPrice(price: BigNumber, tokenDecimals: number) {
    return price.div(expandDecimals(1, tokenDecimals));
}

export async function createIncreaseOrderTxn(chainId: number, p: IncreaseOrderParams) {
    const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, undefined);

    const orderVaultAddress = getContract(chainId, "OrderVault");

    const isNativePayment = p.initialCollateralAddress === NATIVE_TOKEN_ADDRESS;

    const wntCollateralAmount = isNativePayment ? p.initialCollateralAmount : BigNumber.from(0);
    const totalWntAmount = wntCollateralAmount.add(p.executionFee);

    const initialCollateralTokenAddress = convertTokenAddress(chainId, p.initialCollateralAddress, "wrapped");

    const shouldApplySlippage = isMarketOrderType(p.orderType);

    const acceptablePrice = shouldApplySlippage
        ? applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, true, p.isLong)
        : p.acceptablePrice;

    const multicall = [
        { method: "sendWnt", params: [orderVaultAddress, totalWntAmount] },

        !isNativePayment
            ? { method: "sendTokens", params: [p.initialCollateralAddress, orderVaultAddress, p.initialCollateralAmount] }
            : undefined,

        {
            method: "createOrder",
            params: [
                {
                    addresses: {
                        receiver: p.account,
                        initialCollateralToken: initialCollateralTokenAddress,
                        callbackContract: AddressZero,
                        market: p.marketAddress,
                        swapPath: p.swapPath,
                        uiFeeReceiver: ethers.constants.AddressZero,
                    },
                    numbers: {
                        sizeDeltaUsd: p.sizeDeltaUsd,
                        initialCollateralDeltaAmount: BigNumber.from(0),
                        triggerPrice: convertToContractPrice(p.triggerPrice || BigNumber.from(0), p.indexToken.decimals),
                        acceptablePrice: convertToContractPrice(acceptablePrice, p.indexToken.decimals),
                        executionFee: p.executionFee,
                        callbackGasLimit: BigNumber.from(0),
                        minOutputAmount: BigNumber.from(0),
                    },
                    orderType: p.orderType,
                    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
                    isLong: p.isLong,
                    shouldUnwrapNativeToken: isNativePayment,
                    referralCode: p.referralCode || ethers.constants.HashZero,
                },
            ],
        },
    ];

    const encodedPayload = multicall
        .filter(Boolean)
        .map((call) => exchangeRouter.interface.encodeFunctionData(call!.method, call!.params));
    return encodedPayload
}


export type DecreaseOrderParams = {
    account: string;
    marketAddress: string;
    initialCollateralAddress: string;
    initialCollateralDeltaAmount: BigNumber;
    swapPath: string[];
    receiveTokenAddress: string;
    sizeDeltaUsd: BigNumber;
    sizeDeltaInTokens: BigNumber;
    acceptablePrice: BigNumber;
    triggerPrice: BigNumber | undefined;
    minOutputUsd: BigNumber;
    isLong: boolean;
    decreasePositionSwapType: DecreasePositionSwapType;
    orderType: OrderType.MarketDecrease | OrderType.LimitDecrease | OrderType.StopLossDecrease;
    executionFee: BigNumber;
    allowedSlippage: number;
    skipSimulation?: boolean;
    referralCode?: string;
    indexToken: Token;
    tokensData: TokensData;
};

export async function createDecreaseOrderTxn(
    chainId: number,
    params: DecreaseOrderParams | DecreaseOrderParams[],
) {
    const ps = Array.isArray(params) ? params : [params];
    const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, undefined);

    const orderVaultAddress = getContract(chainId, "OrderVault");
    const multicall = [
        ...ps.flatMap((p) => {
            const isNativeReceive = p.receiveTokenAddress === NATIVE_TOKEN_ADDRESS;

            const initialCollateralTokenAddress = convertTokenAddress(chainId, p.initialCollateralAddress, "wrapped");

            const shouldApplySlippage = isMarketOrderType(p.orderType);

            const acceptablePrice = shouldApplySlippage
                ? applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, false, p.isLong)
                : p.acceptablePrice;

            const minOutputAmount = shouldApplySlippage
                ? applySlippageToMinOut(p.allowedSlippage, p.minOutputUsd)
                : p.minOutputUsd;
            return [
                { method: "sendWnt", params: [orderVaultAddress, p.executionFee] },
                {
                    method: "createOrder",
                    params: [
                        {
                            addresses: {
                                receiver: p.account,
                                initialCollateralToken: initialCollateralTokenAddress,
                                callbackContract: AddressZero,
                                market: p.marketAddress,
                                swapPath: p.swapPath,
                                uiFeeReceiver: ethers.constants.AddressZero,
                            },
                            numbers: {
                                sizeDeltaUsd: p.sizeDeltaUsd,
                                initialCollateralDeltaAmount: p.initialCollateralDeltaAmount,
                                triggerPrice: convertToContractPrice(p.triggerPrice || BigNumber.from(0), p.indexToken.decimals),
                                acceptablePrice: convertToContractPrice(acceptablePrice, p.indexToken.decimals),
                                executionFee: p.executionFee,
                                callbackGasLimit: BigNumber.from(0),
                                minOutputAmount,
                            },
                            orderType: p.orderType,
                            decreasePositionSwapType: p.decreasePositionSwapType,
                            isLong: p.isLong,
                            shouldUnwrapNativeToken: isNativeReceive,
                            referralCode: p.referralCode || ethers.constants.HashZero,
                        },
                    ],
                },
            ];
        }),
    ];

    const encodedPayload = multicall
        .filter(Boolean)
        .map((call) => exchangeRouter.interface.encodeFunctionData(call!.method, call!.params));

    return encodedPayload;
}