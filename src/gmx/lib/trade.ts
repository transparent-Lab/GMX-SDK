import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "./factors";

export function applySlippageToPrice(allowedSlippage: number, price: BigNumber, isIncrease: boolean, isLong: boolean) {
    const shouldIncreasePrice = getShouldUseMaxPrice(isIncrease, isLong);

    const slippageBasisPoints = shouldIncreasePrice
        ? BASIS_POINTS_DIVISOR + allowedSlippage
        : BASIS_POINTS_DIVISOR - allowedSlippage;

    return price.mul(slippageBasisPoints).div(BASIS_POINTS_DIVISOR);
}

export function getShouldUseMaxPrice(isIncrease: boolean, isLong: boolean) {
    return isIncrease ? isLong : !isLong;
}