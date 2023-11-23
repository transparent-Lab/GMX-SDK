import { BigNumber } from "ethers";
import { useMarketsInfo } from "../src/gmx/domain/synthetics/markets";
import { getPositionKey, usePositionsInfo } from "../src/gmx/domain/synthetics/positions";
import { getIncreasePositionAmounts } from "../src/gmx/domain/synthetics/trade";
import { estimateExecuteIncreaseOrderGasLimit, gasLimits, getExecutionFee, useGasPrice } from "../src/gmx/domain/synthetics/fees";
import { createIncreaseOrderTxn } from '../src/gmx/lib/order';
import { OrderType } from "../src/gmx/domain/synthetics/orders";

describe("orders", () => {

    const chainId = 42161;
    const account = '0x23b27875ad09d21517101a7f83499c38f7ec2d2a';
    const marketAddress = "0x47c031236e19d024b42f8AE6780E44A573170703";
    const collateralTokenAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    const indexTokenAddress = "0x47904963fc8b2340414262125aF798B9655E58Cd";
    const isLong = true;
    const leverage = BigNumber.from(2);

    it("increase", async () => {
        const { marketsInfoData, tokensData } = await useMarketsInfo(chainId, account);
        let market = marketsInfoData![marketAddress]
        let collateralToken = tokensData![collateralTokenAddress]

        const { positionsInfoData } = await usePositionsInfo(chainId, {
            account: account,
            marketsInfoData: marketsInfoData,
            tokensData: tokensData,
            showPnlInLeverage: false
        })

        const posKey = getPositionKey(account, marketAddress, collateralTokenAddress, isLong)

        debugger
        const increaseAmounts = getIncreasePositionAmounts({
            marketInfo: market,
            indexToken: tokensData![indexTokenAddress],
            initialCollateralToken: collateralToken,
            collateralToken: collateralToken,
            isLong: isLong,
            initialCollateralAmount: BigNumber.from(64),
            position: positionsInfoData![posKey],
            leverage: leverage,
            indexTokenAmount: BigNumber.from(0),
            userReferralInfo: undefined,
            strategy: "leverageByCollateral",
            findSwapPath: () => undefined,
        })

        expect(increaseAmounts).not.toBeNull()

        const _gasLimits = await gasLimits(42161)
        expect(_gasLimits).not.toBeNull()

        const estimatedGas = estimateExecuteIncreaseOrderGasLimit(_gasLimits, {
            swapsCount: increaseAmounts.swapPathStats?.swapPath.length,
        });

        const { gasPrice } = await useGasPrice(chainId);
        const executionFee = getExecutionFee(_gasLimits, tokensData!, estimatedGas, gasPrice!)
        expect(executionFee).not.toBeNull()

        const tx = await createIncreaseOrderTxn(chainId, {
            account: account,
            marketAddress: marketAddress,
            initialCollateralAddress: collateralTokenAddress,
            initialCollateralAmount: increaseAmounts.initialCollateralAmount,
            swapPath: increaseAmounts.swapPathStats?.swapPath || [],
            sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
            acceptablePrice: increaseAmounts.acceptablePrice,
            triggerPrice: undefined,
            isLong: false,
            orderType: OrderType.MarketIncrease,
            executionFee: executionFee?.feeTokenAmount!,
            allowedSlippage: 0,
            referralCode: undefined,
            indexToken: tokensData![indexTokenAddress]
        });

        expect(tx).not.toBeNull()
    }, 1e6);

});