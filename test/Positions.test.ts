
import {usePositionsInfo } from "../src/gmx/domain/synthetics/positions"

import { useMarketsInfo } from "../src/gmx/domain/synthetics/markets"

describe("positions", () => {
    it("positions", async () => {
        debugger
        const chainId = 42161;
        const account = "0x23b27875ad09d21517101a7f83499c38f7ec2d2a";
        const markets = await useMarketsInfo(chainId, account);
        const positions = await usePositionsInfo(chainId, {
            account: account,
            marketsInfoData: markets.marketsInfoData,
            tokensData: markets.tokensData,
            showPnlInLeverage: false
        })
        expect(positions).not.toBeNull()
    }, 1e6);
})
