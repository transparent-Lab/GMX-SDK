import { EXECUTION_FEE_CONFIG_V2, GAS_PRICE_ADJUSTMENT_MAP } from "../../../config/chains";
import { bigNumberify } from "../../../lib/numbers";
import { getProvider } from "../../../lib/rpc";

export async function useGasPrice(chainId: number) {
  const executionFeeConfig = EXECUTION_FEE_CONFIG_V2[chainId];
  const provider = getProvider(undefined, chainId);
  if (!provider) {
    return undefined;
  }

  try {
    let gasPrice = await provider.getGasPrice();
    if (executionFeeConfig.shouldUseMaxPriorityFeePerGas) {
      const feeData = await provider.getFeeData();

      // the wallet provider might not return maxPriorityFeePerGas in feeData
      // in which case we should fallback to the usual getGasPrice flow handled below
      if (feeData && feeData.maxPriorityFeePerGas) {
        gasPrice = gasPrice.add(feeData.maxPriorityFeePerGas);
      }
    }
    const premium = bigNumberify(GAS_PRICE_ADJUSTMENT_MAP[chainId]) || bigNumberify(0);
    gasPrice.add(premium!)
    return { gasPrice };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return undefined;
  }
}
