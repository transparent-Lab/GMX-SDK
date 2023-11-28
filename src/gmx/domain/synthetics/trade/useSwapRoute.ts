import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getWrappedToken } from "../../../config/tokens";
import { MarketsInfoData } from "../../synthetics/markets";
import { BigNumber } from "ethers";
// import { useChainId } from "lib/chains";
import { FindSwapPath } from "./types";
import {
  createSwapEstimator,
  findAllPaths,
  getBestSwapPath,
  getMarketsGraph,
  getMaxSwapPathLiquidity,
  getSwapPathStats,
} from "./utils";

export type SwapRoutesResult = {
  maxSwapLiquidity: BigNumber;
  maxLiquiditySwapPath?: string[];
  findSwapPath: FindSwapPath;
};
export function useSwapRoutes(chainId: number, p: {
  marketsInfoData?: MarketsInfoData;
  fromTokenAddress?: string;
  toTokenAddress?: string;
}): SwapRoutesResult {
  const { fromTokenAddress, toTokenAddress, marketsInfoData } = p;

  const wrappedToken = getWrappedToken(chainId);

  const isWrap = fromTokenAddress === NATIVE_TOKEN_ADDRESS && toTokenAddress === wrappedToken.address;
  const isUnwrap = fromTokenAddress === wrappedToken.address && toTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isSameToken = fromTokenAddress === toTokenAddress;

  const wrappedFromAddress = fromTokenAddress ? convertTokenAddress(chainId, fromTokenAddress, "wrapped") : undefined;
  const wrappedToAddress = toTokenAddress ? convertTokenAddress(chainId, toTokenAddress, "wrapped") : undefined;

  const { graph, estimator } = (() => {
    if (!marketsInfoData) {
      return { graph: undefined, estimator: undefined };
    }

    return {
      graph: getMarketsGraph(Object.values(marketsInfoData)),
      estimator: createSwapEstimator(marketsInfoData),
    };
  })();

  const allRoutes = (() => {
    if (!marketsInfoData || !graph || !wrappedFromAddress || !wrappedToAddress || isWrap || isUnwrap || isSameToken) {
      return undefined;
    }

    const paths = findAllPaths(marketsInfoData, graph, wrappedFromAddress, wrappedToAddress)
      ?.sort((a: any, b: any) => {
        return b.liquidity.sub(a.liquidity).gt(0) ? 1 : -1;
      })
      .slice(0, 5);

    return paths;
  })();

  const { maxLiquidity, maxLiquidityPath } = (() => {
    let maxLiquidity = BigNumber.from(0);
    let maxLiquidityPath: string[] | undefined = undefined;

    if (!allRoutes || !marketsInfoData || !wrappedFromAddress) {
      return { maxLiquidity, maxLiquidityPath };
    }

    for (const route of allRoutes) {
      const liquidity = getMaxSwapPathLiquidity({
        marketsInfoData,
        swapPath: route.path,
        initialCollateralAddress: wrappedFromAddress,
      });

      if (liquidity.gt(maxLiquidity)) {
        maxLiquidity = liquidity;
        maxLiquidityPath = route.path;
      }
    }

    return { maxLiquidity, maxLiquidityPath };
  })();

  const findSwapPath =
    (usdIn: BigNumber, opts: { byLiquidity?: boolean }) => {
      if (!allRoutes?.length || !estimator || !marketsInfoData || !fromTokenAddress) {
        return undefined;
      }

      let swapPath: string[] | undefined = undefined;

      if (opts.byLiquidity) {
        swapPath = allRoutes[0].path;
      } else {
        swapPath = getBestSwapPath(allRoutes, usdIn, estimator);
      }

      if (!swapPath) {
        return undefined;
      }

      const swapPathStats = getSwapPathStats({
        marketsInfoData,
        swapPath,
        initialCollateralAddress: fromTokenAddress,
        wrappedNativeTokenAddress: wrappedToken.address,
        shouldUnwrapNativeToken: toTokenAddress === NATIVE_TOKEN_ADDRESS,
        shouldApplyPriceImpact: true,
        usdIn,
      });

      if (!swapPathStats) {
        return undefined;
      }

      return swapPathStats;
    }

  return {
    maxSwapLiquidity: maxLiquidity,
    maxLiquiditySwapPath: maxLiquidityPath,
    findSwapPath,
  };
}
