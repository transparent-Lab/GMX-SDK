import { BigNumber, Contract, Wallet } from "ethers";
import { useMarketsInfo } from "../src/gmx/domain/synthetics/markets";
import { getPositionKey, usePositionsInfo } from "../src/gmx/domain/synthetics/positions";
import { getIncreasePositionAmounts, useSwapRoutes } from "../src/gmx/domain/synthetics/trade";
import { estimateExecuteIncreaseOrderGasLimit, gasLimits, getExecutionFee, useGasPrice } from "../src/gmx/domain/synthetics/fees";
import { createIncreaseOrderTxn } from '../src/gmx/lib/order';
import { OrderType } from "../src/gmx/domain/synthetics/orders";
import { getContract } from "../src/gmx/config/contracts";
import ExchangeRouter from "../src/gmx/abis/ExchangeRouter.json";
import { callContract } from "../src/gmx/lib/contracts";
import { getProvider } from "../src/gmx/provider";
import { useTokensAllowanceData } from "../src/gmx/domain/synthetics/tokens";
import Token from "../src/gmx/abis/Token.json";

describe("orders", () => {

    const chainId = 42161;
    const account = '0x23b27875ad09d21517101a7f83499c38f7ec2d2a';
    const marketAddress = "0x47c031236e19d024b42f8AE6780E44A573170703";
    const collateralTokenAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    // const indexTokenAddress = "0x47904963fc8b2340414262125aF798B9655E58Cd";
    const isLong = true;
    const leverage = BigNumber.from(2);
    const initialCollateralAmount = BigNumber.from(10_000_000)
    const priKey = process.env.PRIVATE_KEY

    
    it("increase", async () => {
        const { marketsInfoData, tokensData } = await useMarketsInfo(chainId, account);
        let market = marketsInfoData![marketAddress]
        let collateralToken = tokensData![collateralTokenAddress]

        
        const { positionsInfoData } = await usePositionsInfo(chainId, {
            account: account,
            marketsInfoData: marketsInfoData,
            tokensData: tokensData,
            showPnlInLeverage: false
        })

        const posKey = getPositionKey(account, marketAddress, collateralTokenAddress, isLong)

        const swapRoute = useSwapRoutes(chainId, {
            marketsInfoData,
            fromTokenAddress: collateralTokenAddress,
            toTokenAddress: collateralTokenAddress,
          });

        debugger
        const increaseAmounts = getIncreasePositionAmounts({
            marketInfo: market,
            indexToken: market.indexToken,
            initialCollateralToken: collateralToken,
            collateralToken: collateralToken,
            isLong: isLong,
            initialCollateralAmount: initialCollateralAmount,
            position: positionsInfoData![posKey],
            leverage: leverage,
            indexTokenAmount: BigNumber.from(100000),
            userReferralInfo: undefined,
            strategy: "leverageByCollateral",
            findSwapPath: swapRoute.findSwapPath,
        })

        expect(increaseAmounts).not.toBeNull()

        const _gasLimits = await gasLimits(42161)
        expect(_gasLimits).not.toBeNull()

        const estimatedGas = estimateExecuteIncreaseOrderGasLimit(_gasLimits, {
            swapsCount: increaseAmounts.swapPathStats?.swapPath.length,
        });

        const { gasPrice } = await useGasPrice(chainId);
        const executionFee = getExecutionFee(_gasLimits, tokensData!, estimatedGas, gasPrice!)
        expect(executionFee).not.toBeNull()

        const tx = await createIncreaseOrderTxn(chainId, {
            account: account,
            marketAddress: marketAddress,
            initialCollateralAddress: collateralTokenAddress,
            initialCollateralAmount: initialCollateralAmount,
            swapPath: increaseAmounts.swapPathStats?.swapPath || [],
            sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
            acceptablePrice: increaseAmounts.acceptablePrice,
            triggerPrice: undefined,
            isLong: isLong,
            orderType: OrderType.MarketIncrease,
            executionFee: executionFee?.feeTokenAmount!,
            allowedSlippage: 0,
            referralCode: undefined,
            indexToken: market.indexToken
        });

        expect(tx).not.toBeNull()



        // sign the tx
        const provider = new Wallet(priKey!, getProvider());

        const spenderAddress = getContract(chainId, "SyntheticsRouter")
        const { tokensAllowanceData } = await useTokensAllowanceData(chainId, account, {
            spenderAddress: spenderAddress,
            tokenAddresses: [collateralTokenAddress]
        })
        if (initialCollateralAmount.gt(tokensAllowanceData![collateralTokenAddress])) {
            const contract = new Contract(collateralTokenAddress, Token.abi, provider);
            const approveRes = await callContract(chainId, contract, "approve", [spenderAddress, increaseAmounts.initialCollateralUsd], {});
            console.log(approveRes)
        }

        const exchangeRouter = new Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, provider);
        const res = await callContract(chainId, exchangeRouter, "multicall", [tx], {
            value: executionFee?.feeTokenAmount!
        });
        expect(res).not.toBeNull()
    }, 1e6);

    it("allowance", async () => {
        debugger
        const allowrance = await useTokensAllowanceData(chainId, account, {
            spenderAddress: getContract(chainId, "SyntheticsRouter"),
            tokenAddresses: [collateralTokenAddress]
        })
        expect(allowrance).not.toBeNull()
    }, 1e6)
});