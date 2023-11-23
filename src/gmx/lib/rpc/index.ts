import { WebSocketProvider } from "@ethersproject/providers";
import {
  FALLBACK_PROVIDERS,
  getFallbackRpcUrl,
  getRpcUrl,
} from "../../config/chains";
import { Signer, ethers } from "ethers";

export function getProvider(signer: Signer | undefined, chainId: number) {
  let provider;

  if (signer) {
    return signer;
  }

  provider = getRpcUrl(chainId);

  return new ethers.providers.StaticJsonRpcProvider(
    provider,
    // @ts-ignore incorrect Network param types
    { chainId }
  );
}


export function getFallbackProvider(chainId: number) {
  if (!FALLBACK_PROVIDERS[chainId]) {
    return;
  }

  const provider = getFallbackRpcUrl(chainId);

  return new ethers.providers.StaticJsonRpcProvider(
    provider,
    // @ts-ignore incorrect Network param types
    { chainId }
  );
}

export function isWebsocketProvider(provider: any): provider is WebSocketProvider {
  return Boolean(provider?._websocket);
}

export enum WSReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export function isProviderInClosedState(wsProvider: WebSocketProvider) {
  return [WSReadyState.CLOSED, WSReadyState.CLOSING].includes(wsProvider._websocket.readyState);
}

export function closeWsConnection(wsProvider: WebSocketProvider) {
  if (isProviderInClosedState(wsProvider)) {
    return;
  }

  wsProvider.removeAllListeners();
  wsProvider._websocket.close();
}
