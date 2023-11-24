
import { estimateExecuteIncreaseOrderGasLimit, gasLimits } from "../src/gmx/domain/synthetics/fees/executionFee"

test("gasLimits test", async () => {
    const _gasLimits = await gasLimits(42161)
    expect(_gasLimits).not.toBeNull()

}, 120000);