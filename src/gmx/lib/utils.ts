import { BigNumber, BigNumberish } from "ethers";
import { PRECISION } from "./consts";
import { OrderType } from "../types";

export function bigNumberify(n?: BigNumberish) {
  try {
    return BigNumber.from(n);
  } catch (e) {
    return undefined;
  }
}

export function expandDecimals(n: BigNumberish, decimals: number): BigNumber {
  return bigNumberify(n)!.mul(bigNumberify(10)!.pow(decimals));
}


export function applyFactor(value: BigNumber, factor: BigNumber) {
  return value.mul(factor).div(PRECISION);
}


export function isMarketOrderType(orderType: OrderType) {
  return [OrderType.MarketDecrease, OrderType.MarketIncrease, OrderType.MarketSwap].includes(orderType);
}