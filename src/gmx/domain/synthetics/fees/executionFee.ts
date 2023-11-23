import { ethers } from "ethers";
import { ExecutionFee, GasLimitsConfig, TokensData } from "../../../types";
import { BigNumber } from "ethers";
import { applyFactor, expandDecimals } from "../../../lib/utils";
import { USD_DECIMALS } from "../../../lib/consts";
import { getContract } from "../../../config/contracts";
import { executeMulticall } from "../../../lib/multicall/utils";
import DataStore from "../../../abis/DataStore.json";
import { ESTIMATED_GAS_FEE_BASE_AMOUNT, ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR, decreaseOrderGasLimitKey, depositGasLimitKey, increaseOrderGasLimitKey, singleSwapGasLimitKey, swapOrderGasLimitKey, withdrawalGasLimitKey } from "../../../config/dataStore";

export const NATIVE_TOKEN_ADDRESS = ethers.constants.AddressZero;

export function getTokenData(tokensData?: TokensData, address?: string, convertTo?: "wrapped" | "native") {
    if (!address || !tokensData?.[address]) {
        return undefined;
    }

    const token = tokensData[address];

    if (convertTo === "wrapped" && token.isNative && token.wrappedAddress) {
        return tokensData[token.wrappedAddress];
    }

    if (convertTo === "native" && token.isWrapped) {
        return tokensData[NATIVE_TOKEN_ADDRESS];
    }

    return token;
}

export function getExecutionFee(
    gasLimts: GasLimitsConfig,
    tokensData: TokensData,
    estimatedGasLimit: BigNumber,
    gasPrice: BigNumber
): ExecutionFee | undefined {
    const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

    if (!nativeToken) return undefined;

    const baseGasLimit = gasLimts.estimatedFeeBaseGasLimit;
    const multiplierFactor = gasLimts.estimatedFeeMultiplierFactor;
    const adjustedGasLimit = baseGasLimit.add(applyFactor(estimatedGasLimit, multiplierFactor));

    const feeTokenAmount = adjustedGasLimit.mul(gasPrice);

    const feeUsd = convertToUsd(feeTokenAmount, nativeToken.decimals, nativeToken.prices.minPrice)!;

    const isFeeHigh = feeUsd.gt(expandDecimals(3, USD_DECIMALS));

    return {
        feeUsd,
        feeTokenAmount,
        feeToken: nativeToken,
        isFeeHigh,
    };
}

export function convertToUsd(
    tokenAmount: BigNumber | undefined,
    tokenDecimals: number | undefined,
    price: BigNumber | undefined
) {
    if (!tokenAmount || typeof tokenDecimals !== "number" || !price) {
        return undefined;
    }

    return tokenAmount.mul(price).div(expandDecimals(1, tokenDecimals));
}

export function estimateExecuteDepositGasLimit(
    gasLimits: GasLimitsConfig,
    deposit: {
        longTokenSwapsCount?: number;
        shortTokenSwapsCount?: number;
        initialLongTokenAmount?: BigNumber;
        initialShortTokenAmount?: BigNumber;
        callbackGasLimit?: BigNumber;
    }
) {
    const gasPerSwap = gasLimits.singleSwap;
    const swapsCount = (deposit.longTokenSwapsCount || 0) + (deposit.shortTokenSwapsCount || 0);

    const gasForSwaps = gasPerSwap.mul(swapsCount);
    const isMultiTokenDeposit = deposit.initialLongTokenAmount?.gt(0) && deposit.initialShortTokenAmount?.gt(0);

    const depositGasLimit = isMultiTokenDeposit ? gasLimits.depositMultiToken : gasLimits.depositSingleToken;

    return depositGasLimit.add(gasForSwaps).add(deposit.callbackGasLimit || 0);
}

export function estimateExecuteWithdrawalGasLimit(
    gasLimits: GasLimitsConfig,
    withdrawal: { callbackGasLimit?: BigNumber }
) {
    return gasLimits.withdrawalMultiToken.add(withdrawal.callbackGasLimit || 0);
}

export function estimateExecuteIncreaseOrderGasLimit(
    gasLimits: GasLimitsConfig,
    order: { swapsCount?: number; callbackGasLimit?: BigNumber }
) {
    return gasLimits.increaseOrder.add(gasLimits.singleSwap.mul(order.swapsCount || 0)).add(order.callbackGasLimit || 0);
}

export function estimateExecuteDecreaseOrderGasLimit(
    gasLimits: GasLimitsConfig,
    order: { swapsCount?: number; callbackGasLimit?: BigNumber }
) {
    return gasLimits.decreaseOrder.add(gasLimits.singleSwap.mul(order.swapsCount || 0)).add(order.callbackGasLimit || 0);
}

export function estimateExecuteSwapOrderGasLimit(
    gasLimits: GasLimitsConfig,
    order: { swapsCount?: number; callbackGasLimit?: BigNumber }
) {
    return gasLimits.swapOrder.add(gasLimits.singleSwap.mul(order.swapsCount || 0)).add(order.callbackGasLimit || 0);
}

/**
 * 
 */
export async function gasLimits(chainId: number): Promise<any> {
    var params = () => ({
        dataStore: {
            contractAddress: getContract(chainId, "DataStore"),
            abi: DataStore.abi,
            calls: {
                depositSingleToken: {
                    methodName: "getUint",
                    params: [depositGasLimitKey(true)],
                },
                depositMultiToken: {
                    methodName: "getUint",
                    params: [depositGasLimitKey(false)],
                },
                withdrawalMultiToken: {
                    methodName: "getUint",
                    params: [withdrawalGasLimitKey()],
                },
                singleSwap: {
                    methodName: "getUint",
                    params: [singleSwapGasLimitKey()],
                },
                swapOrder: {
                    methodName: "getUint",
                    params: [swapOrderGasLimitKey()],
                },
                increaseOrder: {
                    methodName: "getUint",
                    params: [increaseOrderGasLimitKey()],
                },
                decreaseOrder: {
                    methodName: "getUint",
                    params: [decreaseOrderGasLimitKey()],
                },
                estimatedFeeBaseGasLimit: {
                    methodName: "getUint",
                    params: [ESTIMATED_GAS_FEE_BASE_AMOUNT],
                },
                estimatedFeeMultiplierFactor: {
                    methodName: "getUint",
                    params: [ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR],
                },
            },
        },
    });
    var resp = await executeMulticall(chainId, params());
    const results = resp!.data.dataStore;

    var data = {
        depositSingleToken: BigNumber.from(results.depositSingleToken.returnValues[0]),
        depositMultiToken: BigNumber.from(results.depositMultiToken.returnValues[0]),
        withdrawalMultiToken: BigNumber.from(results.withdrawalMultiToken.returnValues[0]),
        singleSwap: BigNumber.from(results.singleSwap.returnValues[0]),
        swapOrder: BigNumber.from(results.swapOrder.returnValues[0]),
        increaseOrder: BigNumber.from(results.increaseOrder.returnValues[0]),
        decreaseOrder: BigNumber.from(results.decreaseOrder.returnValues[0]),
        estimatedFeeBaseGasLimit: BigNumber.from(results.estimatedFeeBaseGasLimit.returnValues[0]),
        estimatedFeeMultiplierFactor: BigNumber.from(results.estimatedFeeMultiplierFactor.returnValues[0]),
    };
    return data
}