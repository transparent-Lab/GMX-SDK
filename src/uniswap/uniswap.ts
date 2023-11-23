import { AlphaRouter, SwapOptionsSwapRouter02, SwapRoute, SwapType } from '@uniswap/smart-order-router'
import { TradeType, CurrencyAmount, Percent, Token, Currency } from '@uniswap/sdk-core'
import { fromReadableAmount } from './conversion'
import { ethers, BigNumber } from 'ethers'
import { ERC20_ABI, SWAP_ROUTER_ADDRESS, MAX_FEE_PER_GAS, MAX_PRIORITY_FEE_PER_GAS } from './consts';
import { getProvider, getWalletAddress, sendTransaction, } from './provider';
import { CurrentConfig } from './config';
import { SwapOptions, SwapRouter, Trade } from '@uniswap/v3-sdk';
import { Route } from '@uniswap/v3-sdk';
import { JSBI } from '@uniswap/sdk';

export enum TransactionState {
  Failed = 'Failed',
  New = 'New',
  Rejected = 'Rejected',
  Sending = 'Sending',
  Sent = 'Sent',
}

class RouteReq {
  chainId: any;
  recipient: string;

  /**
   * Slippage tolerance in basis points
   */
  slippageTolerance: number;

  /**
   * Timeout in seconds
   */
  deadline: number;
  // swapType?: SwapType = SwapType.SWAP_ROUTER_02;

  tokenIn: string;
  tokenInDecimals: number;

  tokenOut: string;
  tokenOutDecimals: number;
  tradeType?: TradeType = TradeType.EXACT_INPUT;

  amount: number;
}

class ExactReq {
  tradeType: TradeType;
  tokenIn: Currency;

  /**
   * Trading routes
   */
  routes: {
    route: Route<Token, Token>;
    amount: CurrencyAmount<Token>;
  }[];
}


/**
 * Get the best trading route
 * @param req
 * @returns
 */
export async function genRoute(req: RouteReq): Promise<SwapRoute | null> {
  const router = new AlphaRouter({
    chainId: req.chainId,
    provider: getProvider()!,
  })
  const token_in = new Token(req.chainId, req.tokenIn, req.tokenInDecimals)
  const token_out = new Token(req.chainId, req.tokenOut, req.tokenOutDecimals)

  const options: SwapOptionsSwapRouter02 = {
    recipient: req.recipient,
    slippageTolerance: new Percent(req.slippageTolerance, 10_000),
    deadline: Math.floor(Date.now() / 1000 + req.deadline),
    type: SwapType.SWAP_ROUTER_02,
  }

  if (req.tradeType == TradeType.EXACT_INPUT) {
    return await router.route(
      CurrencyAmount.fromRawAmount(
        token_in,
        fromReadableAmount(
          req.amount,
          req.tokenInDecimals
        ).toString()
      ),
      token_out,
      req.tradeType!,
      options
    )
  } else {
    return await router.route(
      CurrencyAmount.fromRawAmount(
        token_out,
        fromReadableAmount(
          req.amount,
          req.tokenOutDecimals
        ).toString()
      ),
      token_in,
      req.tradeType!,
      options
    )
  }
}

export async function setRpc(rpc: string, chainId = 1) {
  CurrentConfig.rpc = rpc;
  CurrentConfig.chainId = chainId

  console.log('current provider', CurrentConfig, getProvider())

  // let network = await provider?.getNetwork()
  // console.log(`\ncurrent network: ${JSON.stringify(network, null, 2)}\n`)
}

export function setPrivateKey(key: string) {
  CurrentConfig.wallet.privateKey = key
}

export async function getTokenTransferApproval(
  token: Token, amount: number
): Promise<TransactionState> {
  const provider = getProvider()
  const address = getWalletAddress()
  if (!provider || !address) {
    console.log('No Provider Found')
    return TransactionState.Failed
  }

  try {
    const tokenContract = new ethers.Contract(
      token.address,
      ERC20_ABI,
      provider
    )

    const transaction = await tokenContract.populateTransaction.approve(
      SWAP_ROUTER_ADDRESS,
      fromReadableAmount(
        amount,
        token.decimals
      ).toString()
    )

    return sendTransaction({
      ...transaction,
      from: address,
    })
  } catch (e) {
    console.error('get approval error', e)
    return TransactionState.Failed
  }
}

export async function executeTrade(
  trade: TokenTrade, tokenIn: Token
): Promise<TransactionState> {
  const walletAddress = getWalletAddress()
  const provider = getProvider()

  if (!walletAddress || !provider) {
    throw new Error('Cannot execute a trade without a connected wallet')
  }

  // Give approval to the router to spend the token
  const tokenApproval = await getTokenTransferApproval(tokenIn, JSBI.toNumber(trade.inputAmount.quotient))

  // Fail if transfer approvals do not go through
  if (tokenApproval !== TransactionState.Sent) {
    return TransactionState.Failed
  }

  const options: SwapOptions = {
    slippageTolerance: new Percent(50, 10_000), // 50 bips, or 0.50%
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
    recipient: walletAddress,
  }

  const methodParameters = SwapRouter.swapCallParameters([trade], options)

  const tx = {
    data: methodParameters.calldata,
    to: SWAP_ROUTER_ADDRESS,
    value: methodParameters.value,
    from: walletAddress,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  }

  return await sendTransaction(tx)
}

export type TokenTrade = Trade<Token, Token, TradeType>

/**
 *
 * @param req Trade
 * @returns
 */
export async function exact(req: ExactReq): Promise<String | null> {
  // fee,
  // let trade = await Trade.fromRoutes<Token, Token, TradeType>(req.routes,  req.tradeType!);
  console.log(JSON.stringify(req, null, 2))
  return null;
}

export async function trade(req: RouteReq): Promise<String | null> {
  let route = await genRoute(req);
  if (route == null) {
    throw new Error("router not found")
  }

  let tokenIn = new Token(req.chainId, req.tokenIn, req.tokenInDecimals);
  let approval = await getTokenTransferApproval(tokenIn, req.amount);

  // Fail if transfer approvals do not go through
  if (approval !== TransactionState.Sent) {
    throw new Error("get approval fail")
  }


  const provider = await getProvider()!;

  // let wallet = getWallet();
  let gasPrice = await provider.getGasPrice()

  gasPrice = gasPrice?.mul(BigNumber.from(12)).div(BigNumber.from(10)) // *1.2

  const walletAddress = getWalletAddress()!
  let gas = await provider.estimateGas({
    data: route!.methodParameters?.calldata,
    to: SWAP_ROUTER_ADDRESS,
    from: walletAddress,
  })

  console.log(">>>> estimate gas res", gas)

  return null;
  // const tx = {
  //   data: route!.methodParameters?.calldata,
  //   to: SWAP_ROUTER_ADDRESS,
  //   value: route?.methodParameters?.value,
  //   from: walletAddress,
  //   gasPrice: gasPrice,
  //   gas: gas
  // }

  // const res = await wallet.sendTransaction(tx)
  // return res.hash;
}



