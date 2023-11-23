import { MarketsInfoData, useMarketsInfo } from "../src/gmx/domain/synthetics/markets";
import { getIncreasePositionAmounts } from "../src/gmx/domain/synthetics/trade";


describe("orders", () => {

    const chainId = 42161;
    const account = '0x23b27875ad09d21517101a7f83499c38f7ec2d2a';
    const marketAddress = "0x47c031236e19d024b42f8AE6780E44A573170703";
    const collateralTokenAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    it("increase amounts", async () => {
        const { marketsInfoData, tokensData } = await useMarketsInfo(chainId, account);
        let market = marketsInfoData![marketAddress]
        let collateralToken = tokensData![collateralTokenAddress]
    });

});