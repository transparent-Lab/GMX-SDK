import { getTokensMap, getV2Tokens } from "../../../config/tokens";
import { bigNumberify } from "../../../lib/numbers";
import { TokensData } from "./types";
import { useTokenRecentPrices } from "./useTokenRecentPricesData";

type TokensDataResult = {
  tokensData?: TokensData;
  pricesUpdatedAt?: number;
};

export async function useTokensData(chainId: number): Promise<TokensDataResult> {
  const tokenConfigs = getTokensMap(chainId);
  const tokenAddresses = getV2Tokens(chainId).map((token) => token.address);
  const { pricesData, updatedAt: pricesUpdatedAt } = await useTokenRecentPrices(chainId);
    return {
      tokensData: tokenAddresses.reduce((acc: TokensData, tokenAddress) => {
        const tokenConfig = tokenConfigs[tokenAddress];

        const prices = pricesData![tokenAddress];

        if (!prices) {
          return acc;
        }
        acc[tokenAddress] = {
          ...tokenConfig,
          prices: prices,
          balance: bigNumberify(0),
        };
        return acc;
      }, {} as TokensData),
      pricesUpdatedAt: pricesUpdatedAt
    };
}
