import ExchangeRouter from "../abis/ExchangeRouter.json";
import { getContract } from "../config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "../config/tokens";
import { TokenData, TokensData } from "../domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { DecreasePositionSwapType, OrderType, Token } from "../types";
import { expandDecimals, isMarketOrderType } from "./utils";
import { applySlippageToPrice } from "./trade";
import { applySlippageToMinOut } from "../domain/synthetics/trade";
import { OrdersData } from "../domain/synthetics/orders";
import { useMulticall } from "./multicall";
import DataStore from "../abis/DataStore.json";
import { accountOrderListKey } from "../config/dataStore";
import SyntheticsReader from "../abis/SyntheticsReader.json";

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

type OrdersResult = {
    ordersData?: OrdersData;
};

const DEFAULT_COUNT = 1000;

export async function useOrders(chainId: number, p: { account?: string | null }): Promise<OrdersResult> {
    const { account } = p;

    const { data } = await useMulticall(chainId, "useOrdersData", {
        key: account ? [account] : null,
        request: () => ({
            dataStore: {
                contractAddress: getContract(chainId, "DataStore"),
                abi: DataStore.abi,
                calls: {
                    count: {
                        methodName: "getBytes32Count",
                        params: [accountOrderListKey(account!)],
                    },
                    keys: {
                        methodName: "getBytes32ValuesAt",
                        params: [accountOrderListKey(account!), 0, DEFAULT_COUNT],
                    },
                },
            },
            reader: {
                contractAddress: getContract(chainId, "SyntheticsReader"),
                abi: SyntheticsReader.abi,
                calls: {
                    orders: {
                        methodName: "getAccountOrders",
                        params: [getContract(chainId, "DataStore"), account, 0, DEFAULT_COUNT],
                    },
                },
            },
        }),
        parseResponse: (res) => {
            const count = Number(res.data.dataStore.count.returnValues[0]);
            const orderKeys = res.data.dataStore.keys.returnValues;
            const orders = res.data.reader.orders.returnValues;

            return {
                count,
                ordersData: orders.reduce((acc: OrdersData, order: any, i: number) => {
                    const key = orderKeys[i];
                    const { data } = order;

                    acc[key] = {
                        key,
                        account: order.addresses.account,
                        receiver: order.addresses.receiver,
                        callbackContract: order.addresses.callbackContract,
                        marketAddress: order.addresses.market,
                        initialCollateralTokenAddress: order.addresses.initialCollateralToken,
                        swapPath: order.addresses.swapPath,
                        sizeDeltaUsd: BigNumber.from(order.numbers.sizeDeltaUsd),
                        initialCollateralDeltaAmount: BigNumber.from(order.numbers.initialCollateralDeltaAmount),
                        contractTriggerPrice: BigNumber.from(order.numbers.triggerPrice),
                        contractAcceptablePrice: BigNumber.from(order.numbers.acceptablePrice),
                        executionFee: BigNumber.from(order.numbers.executionFee),
                        callbackGasLimit: BigNumber.from(order.numbers.callbackGasLimit),
                        minOutputAmount: BigNumber.from(order.numbers.minOutputAmount),
                        updatedAtBlock: BigNumber.from(order.numbers.updatedAtBlock),
                        isLong: order.flags.isLong,
                        shouldUnwrapNativeToken: order.flags.shouldUnwrapNativeToken,
                        isFrozen: order.flags.isFrozen,
                        orderType: order.numbers.orderType,
                        decreasePositionSwapType: order.numbers.decreasePositionSwapType,
                        data,
                    };

                    return acc;
                }, {} as OrdersData),
            };
        },
    });

    return {
        ordersData: data?.ordersData,
    };
}


export type CancelOrderParams = {
    orderKeys: string[];
    setPendingTxns: (txns: any) => void;
};

export async function cancelOrdersTxn(chainId: number, p: CancelOrderParams) {
    const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, undefined);
    const multicall = p.orderKeys.map((key) => exchangeRouter.interface.encodeFunctionData("cancelOrder", [key]));
    return multicall;
}
