
import { gasLimits } from "../src/gmx/domain/synthetics/fees/executionFee"

test("gasLimits test", async () => {
    const res = await gasLimits(42161)
    expect(res).not.toBeNull()
}, 120000);