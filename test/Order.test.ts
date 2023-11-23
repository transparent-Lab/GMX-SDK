import { BigNumber } from "ethers";
import { useMarketsInfo } from "../src/gmx/domain/synthetics/markets";
import { getPositionKey, usePositionsInfo } from "../src/gmx/domain/synthetics/positions";
import { getIncreasePositionAmounts } from "../src/gmx/domain/synthetics/trade";


describe("orders", () => {

    const chainId = 42161;
    const account = '0x23b27875ad09d21517101a7f83499c38f7ec2d2a';
    const marketAddress = "0x47c031236e19d024b42f8AE6780E44A573170703";
    const collateralTokenAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    const indexTokenAddress = "0x47904963fc8b2340414262125aF798B9655E58Cd";
    const isLong = true;
    it("increase amounts", async () => {
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
        const increasePositionAmounts = getIncreasePositionAmounts({
            marketInfo: market,
            indexToken: tokensData![indexTokenAddress],
            initialCollateralToken: collateralToken,
            collateralToken: collateralToken,
            isLong: isLong,
            initialCollateralAmount: BigNumber.from(64),
            position: positionsInfoData![posKey],
            leverage: BigNumber.from(10),
            indexTokenAmount: BigNumber.from(100),
            userReferralInfo: undefined,
            strategy: "leverageByCollateral",
            findSwapPath: () => undefined,
        })

        expect(increasePositionAmounts).not.toBeNull()
    }, 1e6);

});