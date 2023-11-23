
import {usePositionsInfo } from "../src/gmx/domain/synthetics/positions"

import { useMarketsInfo } from "../src/gmx/domain/synthetics/markets"

describe("positions", () => {
    // it("use positions test", async () => {
    //     expect.assertions(1);
    //     const res = await usePositions(42161, { account: "0x23b27875ad09d21517101a7f83499c38f7ec2d2a" });
    //     console.log("positions", res)
    //     expect(res).not.toBeNull()
    // }, 120000);

    it("positions", async () => {
        const chainId = 42161;
        const account = "0x23b27875ad09d21517101a7f83499c38f7ec2d2a";
        // const account = "0x23B27875ad09d21517101a7f83499C38F7eC2D2a";
        debugger
        const markets = await useMarketsInfo(chainId, account);
        const positions = await usePositionsInfo(chainId, {
            account: account,
            marketsInfoData: markets.marketsInfoData,
            tokensData: markets.tokensData,
            showPnlInLeverage: false
        })

        console.log("positions info", positions)
    }, 1e6);
})
