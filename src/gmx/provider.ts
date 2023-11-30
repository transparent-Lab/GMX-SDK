import "@ethersproject/shims";
import { ethers } from "ethers";

export const rpcUrl: string = "https://arb1.arbitrum.io/rpc"
let chainId = 42161

export function getProvider() {
    return new ethers.providers.JsonRpcProvider({ url: rpcUrl }, chainId)
}

export function initProvider(rpc: string, chainId: number) {
    rpc = rpc
    chainId = chainId
}