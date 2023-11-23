// This file contains code to easily connect to and get information from a wallet on chain

import { BigNumber, ethers } from 'ethers'
import JSBI from 'jsbi'

import {
    MAX_FEE_PER_GAS,
    MAX_PRIORITY_FEE_PER_GAS,
    WETH_ABI,
    WETH_CONTRACT_ADDRESS,
} from './consts'
import { getProvider, getWalletAddress, sendTransaction } from './provider'

// wraps ETH (rounding up to the nearest ETH for decimal places)
export async function wrapETH(eth: number) {
    const provider = getProvider()
    const address = getWalletAddress()
    if (!provider || !address) {
        throw new Error('Cannot wrap ETH without a provider and wallet address')
    }

    const wethContract = new ethers.Contract(
        WETH_CONTRACT_ADDRESS,
        WETH_ABI,
        provider
    )

    const transaction = {
        data: wethContract.interface.encodeFunctionData('deposit'),
        value: BigNumber.from(Math.ceil(eth))
            .mul(JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(18)).toString())
            .toString(),
        from: address,
        to: WETH_CONTRACT_ADDRESS,
        maxFeePerGas: MAX_FEE_PER_GAS,
        maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
    }

    await sendTransaction(transaction)
}

// unwraps ETH (rounding up to the nearest ETH for decimal places)
export async function unwrapETH(eth: number) {
    const provider = getProvider()
    const address = getWalletAddress()
    if (!provider || !address) {
        throw new Error('Cannot unwrap ETH without a provider and wallet address')
    }

    const wethContract = new ethers.Contract(
        WETH_CONTRACT_ADDRESS,
        WETH_ABI,
        provider
    )

    const transaction = {
        data: wethContract.interface.encodeFunctionData('withdraw', [
            BigNumber.from(Math.ceil(eth))
                .mul(JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(18)).toString())
                .toString(),
        ]),
        from: address,
        to: WETH_CONTRACT_ADDRESS,
        maxFeePerGas: MAX_FEE_PER_GAS,
        maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
    }

    await sendTransaction(transaction)
}
