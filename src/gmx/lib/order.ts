import ExchangeRouter from "../abis/ExchangeRouter.json";
import { getContract } from "../config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "../config/tokens";
import { TokenData } from "../domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { DecreasePositionSwapType, OrderType } from "../types";
import { expandDecimals, isMarketOrderType } from "./utils";
import { applySlippageToPrice } from "./trade";

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
