import { CacheKey, MulticallRequestConfig, MulticallResult, SkipKey } from "./types";
import { executeMulticall } from "./utils";

/**
 * A hook to fetch data from contracts via multicall.
 * Preferably wrapped in custom hooks, such as useMarkets, usePositions, etc.
 *
 * @param chainId - on which network the request should be executed
 * @param name - an unique name for the request, used as a part of swr cache key
 * @param params.key - the cache key as an array, if a falsy value is passed, the request will be skipped
 * @param params.request - contract calls config or callback which returns it
 * @param params.parseResponse - optional callback to pre-process and format the response
 */
export async function useMulticall<TConfig extends MulticallRequestConfig<any>, TResult = MulticallResult<TConfig>>(
  chainId: number,
  name: string,
  params: {
    key: CacheKey | SkipKey;
    refreshInterval?: number | null;
    clearUnusedKeys?: boolean;
    keepPreviousData?: boolean;
    request: TConfig | ((chainId: number, key: CacheKey) => TConfig);
    parseResponse?: (result: MulticallResult<TConfig>, chainId: number, key: CacheKey) => TResult;
  }
) {
  try {
    // prettier-ignore
    const request = typeof params.request === "function"
      ? params.request(chainId, params.key as CacheKey)
      : params.request;

    if (Object.keys(request).length === 0) {
      throw new Error(`Multicall request is empty`);
    }

    console.log("useMulticall", "executeMulticall");

    const response = await executeMulticall(chainId, request);

    if (!response) {
      throw new Error(`Multicall response is empty`);
    }

    // prettier-ignore
    const result = typeof params.parseResponse === "function"
      ? params.parseResponse(response, chainId, params.key as CacheKey)
      : response;

    return { data: result as TResult };
  } catch (e) {
    console.error(`Multicall request failed: ${name}`, e);
    throw e;
  }
}
