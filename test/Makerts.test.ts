
import { useMarkets, useMarketsInfo } from "../src/gmx/domain/synthetics/markets"
import { useTokensData} from "../src/gmx/domain/synthetics/tokens";

describe("markets", () => {
    it("markets", async () => {
        expect.assertions(1);
        const res = await useMarkets(42161);
        console.log("markets", res)
        expect(res).not.toBeNull()
    }, 120000);

    it("markets info", async () => {
        const res = await useMarketsInfo(42161, "0x23b27875ad09d21517101a7f83499c38f7ec2d2a");
        console.log("markets info", res)
        expect(res).not.toBeNull()
    }, 120000);

    it("tokens",async () => {
        debugger
        var tokens = useTokensData(42161);
        console.log("tokens", tokens)
        expect(tokens).not.toBeNull;
    })
})
