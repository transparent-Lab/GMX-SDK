import "@ethersproject/shims";
import CustomErrors from "../../abis/CustomErrors.json";
import { getRpcUrl } from "../consts";
import { MulticallRequestConfig, MulticallResult } from "./types";
import { Contract, providers, constants } from "ethers";

import { sleep } from "../sleep";
import { getProvider } from "../rpc";
import { getContract } from '../../config/contracts';
import mutilcall from '../../abis/Multicall.json';
import { Interface } from "@ethersproject/abi";
// import { callContract } from "../contracts";


export const MAX_TIMEOUT = 200000;

export async function executeMulticall(
  chainId: number,
  // signer: Signer | undefined,
  request: MulticallRequestConfig<any>
) {
  const multicall = await Multicall.getInstance(chainId);
  try {
    console.log('start multicall', Object.keys(request));
    return multicall?.call(request, MAX_TIMEOUT)
  } catch (e) {
    console.error("multicall.call error", e)
    return undefined
  }
}

export class Multicall {
  static instances: {
    [chainId: number]: Multicall | undefined;
  } = {};

  static async getInstance(chainId: number) {
    let instance = Multicall.instances[chainId];

    if (!instance || instance.chainId !== chainId) {
      const rpcUrl = getRpcUrl(chainId);

      if (!rpcUrl) {
        console.error("get rpcUrl error", chainId, rpcUrl)
        return undefined;
      }

      instance = new Multicall(chainId, rpcUrl);

      Multicall.instances[chainId] = instance;
    }

    return instance;
  }

  multicall: Contract; // multicall 

  constructor(public chainId: number, public rpcUrl: string) {
    const addr = getContract(chainId, "Multicall");
    const provider = getProvider(undefined, this.chainId) as providers.JsonRpcProvider;
    this.multicall = new Contract(addr, mutilcall.abi, provider);
  }

  async call(request: MulticallRequestConfig<any>, maxTimeout: number) {
    const originalKeys: {
      contractKey: string;
      callKey: string;
      abi: any;
      method?: string;
    }[] = [];

    const abis: any = {};

    const contractKeys = Object.keys(request);
    const nameCalls: { target: string, allowFailure?: boolean, callData: any }[] = [];

    contractKeys.forEach((contractKey) => {
      const contractCallConfig = request[contractKey];

      if (!contractCallConfig) {
        console.log("contractCallConfig not found", contractKey);
        return;
      }

      Object.keys(contractCallConfig.calls).forEach((callKey) => {
        const call = contractCallConfig.calls[callKey];

        if (!call) {
          console.log("call not found", callKey);
          return;
        }

        // Add Errors ABI to each contract ABI to correctly parse errors
        abis[contractCallConfig.contractAddress] =
          abis[contractCallConfig.contractAddress] || contractCallConfig.abi.concat(CustomErrors.abi);

        const abi = abis[contractCallConfig.contractAddress];

        const ct = new Contract(contractCallConfig.contractAddress, abi, undefined);
        originalKeys.push({
          contractKey,
          callKey,
          abi,
          method: call.methodName
        });

        nameCalls.push({
          target: contractCallConfig.contractAddress,
          allowFailure: false,
          callData: ct.interface.encodeFunctionData(call.methodName, call.params)
        })
      });
    });

    const response: any = await Promise.race([
      this.multicall.callStatic['aggregate3'](nameCalls),
      sleep(maxTimeout).then(() => Promise.reject(new Error("multicall timeout"))),
    ]).catch((_viemError) => {
      const e = new Error(_viemError.message.slice(0, 150));

      // eslint-disable-next-line no-console
      // console.groupCollapsed("multicall error:");
      // eslint-disable-next-line no-console
      console.error(e);
      // eslint-disable-next-line no-console
      // console.groupEnd();

      // eslint-disable-next-line no-console
      console.log(`using multicall fallback for chain ${this.chainId}`);
    });

    const multicallResult: MulticallResult<any> = {
      success: true,
      errors: {},
      data: {},
    };

    response.forEach(({ success, returnData }: any, i: number) => {
      const { contractKey, callKey, abi, method } = originalKeys[i];

      if (success) {
        multicallResult.data[contractKey] = multicallResult.data[contractKey] || {};

        let vals = new Interface(abi).decodeFunctionResult(method!, returnData);
        let result = vals.length === 1 ? vals[0] : vals;
        let values = undefined;

        if (Array.isArray(result)) {
          values = result;
        } else {
          values = [result];
        }

        multicallResult.data[contractKey][callKey] = {
          contractKey,
          callKey,
          returnValues: values,
          success: true,
        };
      } else {
        multicallResult.success = false;

        multicallResult.errors[contractKey] = multicallResult.errors[contractKey] || {};
        multicallResult.errors[contractKey][callKey] = "error";

        multicallResult.data[contractKey] = multicallResult.data[contractKey] || {};
        multicallResult.data[contractKey][callKey] = {
          contractKey,
          callKey,
          returnValues: [],
          success: false,
          error: "error",
        };
      }
      // if (status === "success") {
      //   let values: any;

      //   if (Array.isArray(result) || typeof result === "object") {
      //     values = result;
      //   } else {
      //     values = [result];
      //   }

      //   multicallResult.data[contractKey] = multicallResult.data[contractKey] || {};
      //   multicallResult.data[contractKey][callKey] = {
      //     contractKey,
      //     callKey,
      //     returnValues: values,
      //     success: true,
      //   };
      // } else {
      //   multicallResult.success = false;

      //   multicallResult.errors[contractKey] = multicallResult.errors[contractKey] || {};
      //   multicallResult.errors[contractKey][callKey] = error;

      //   multicallResult.data[contractKey] = multicallResult.data[contractKey] || {};
      //   multicallResult.data[contractKey][callKey] = {
      //     contractKey,
      //     callKey,
      //     returnValues: [],
      //     success: false,
      //     error: error,
      //   };
      // }
    });

    return multicallResult;
  }
}
