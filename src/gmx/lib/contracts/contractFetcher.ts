import { Signer, ethers } from "ethers";
import { getFallbackProvider, getProvider } from "../rpc";
import { getGasLimit, setGasPrice } from "./utils";
import { BigNumber, Contract } from "ethers";

export async function callContract(
  chainId: number,
  contract: Contract,
  method: string,
  params: any,
  opts: {
    value?: BigNumber | number;
    gasLimit?: BigNumber | number;
    sentMsg?: string;
    successMsg?: string;
    failMsg?: string;
    setPendingTxns?: (txns: any) => void;
  }
) {
  try {
    if (!Array.isArray(params) && typeof params === "object" && opts === undefined) {
      opts = params;
      params = [];
    }

    if (!opts) {
      opts = {};
    }

    const txnOpts: any = {};

    if (opts.value) {
      txnOpts.value = opts.value;
    }

    txnOpts.gasLimit = opts.gasLimit ? opts.gasLimit : await getGasLimit(contract, method, params, opts.value);

    await setGasPrice(txnOpts, contract.provider, chainId);

    const res = await contract[method](...params, txnOpts);

    return res;
  } catch (e) {
    throw e;
  }
}

export const contractFetcher =
  <T>(signer: Signer | undefined, contractInfo: any, additionalArgs?: any[]) =>
    (args: any): Promise<T> => {
      // eslint-disable-next-line
      const [id, chainId, arg0, arg1, ...params] = args;
      const provider = getProvider(signer, chainId);

      const method = ethers.utils.isAddress(arg0) ? arg1 : arg0;

      const contractCall = getContractCall({
        provider,
        contractInfo,
        arg0,
        arg1,
        method,
        params,
        additionalArgs,
      });

      let shouldCallFallback = true;

      const handleFallback = async (resolve: any, reject: any, error: any) => {
        if (!shouldCallFallback) {
          return;
        }
        // prevent fallback from being called twice
        shouldCallFallback = false;

        const fallbackProvider = getFallbackProvider(chainId);
        if (!fallbackProvider) {
          reject(error);
          return;
        }

        // eslint-disable-next-line no-console
        console.info("using fallbackProvider for", method);
        const fallbackContractCall = getContractCall({
          provider: fallbackProvider,
          contractInfo,
          arg0,
          arg1,
          method,
          params,
          additionalArgs,
        });

        fallbackContractCall
          .then((result: any) => resolve(result))
          .catch((e: Error) => {
            // eslint-disable-next-line no-console
            console.error("fallback fetcher error", id, contractInfo.contractName, method, e);
            reject(e);
          });
      };

      return new Promise(async (resolve, reject) => {
        contractCall
          .then((result: any) => {
            shouldCallFallback = false;
            resolve(result);
          })
          .catch((e: any) => {
            // eslint-disable-next-line no-console
            console.error("fetcher error", id, contractInfo.contractName, method, e);
            handleFallback(resolve, reject, e);
          });

        setTimeout(() => {
          handleFallback(resolve, reject, "contractCall timeout");
        }, 2000);
      });
    };

function getContractCall({ provider, contractInfo, arg0, arg1, method, params, additionalArgs }: any) {
  if (ethers.utils.isAddress(arg0)) {
    const address = arg0;
    const contract = new ethers.Contract(address, contractInfo.abi, provider);

    if (additionalArgs) {
      return contract[method](...params.concat(additionalArgs));
    }
    return contract[method](...params);
  }

  if (!provider) {
    return;
  }

  return provider[method](arg1, ...params);
}
