
import { usePositionsInfo } from "../src/gmx/domain/synthetics/positions"

import { useMarketsInfo } from "../src/gmx/domain/synthetics/markets"
import { fetchPositions } from '../src/gmx/index';
describe("positions", () => {
    it("pos1", async () => {
        debugger
        const chainId = 42161;
        const account = "0x23B27875ad09d21517101a7f83499C38F7eC2D2a";
        const markets = await useMarketsInfo(chainId, account);
        const positions = await usePositionsInfo(chainId, {
            account: account,
            marketsInfoData: markets.marketsInfoData,
            tokensData: markets.tokensData,
            showPnlInLeverage: false
        })
        expect(positions).not.toBeNull()
    }, 1e6);

    it("pos2", async () => {
        debugger
        const chainId = 42161;
        const pos = await fetchPositions(chainId, "0x23B27875ad09d21517101a7f83499C38F7eC2D2a");
        expect(pos).not.toBeNull()
    }, 1e6)
})


