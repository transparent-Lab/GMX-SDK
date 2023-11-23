import { BaseProvider } from '@ethersproject/providers'
import { BigNumber, ethers, providers } from 'ethers'

import { CurrentConfig } from './config'


export enum TransactionState {
    Failed = 'Failed',
    New = 'New',
    Rejected = 'Rejected',
    Sending = 'Sending',
    Sent = 'Sent',
}

export function getMainnetProvider(): BaseProvider {
    return new ethers.providers.JsonRpcProvider(
        CurrentConfig.rpc, 1
    )
}

export function getProvider(): BaseProvider | null {
    return new ethers.providers.JsonRpcProvider(
        CurrentConfig.rpc, CurrentConfig.chainId
    )
}

export function getWalletAddress(): string | null {
    return getWallet().address
}

export async function sendTransaction(
    transaction: ethers.providers.TransactionRequest
): Promise<TransactionState> {
    if (transaction.value) {
        transaction.value = BigNumber.from(transaction.value)
    }
    return sendTransactionViaWallet(transaction)
}

export function getWallet(): ethers.Wallet {
    let provider = new ethers.providers.JsonRpcProvider(CurrentConfig.rpc)
    return new ethers.Wallet(CurrentConfig.wallet.privateKey, provider)
}

async function sendTransactionViaWallet(
    transaction: ethers.providers.TransactionRequest
): Promise<TransactionState> {
    if (transaction.value) {
        transaction.value = BigNumber.from(transaction.value)
    }
    const txRes = await getWallet().sendTransaction(transaction)

    let receipt = null
    const provider = getProvider()
    if (!provider) {
        return TransactionState.Failed
    }

    while (receipt === null) {
        try {
            receipt = await provider.getTransactionReceipt(txRes.hash)
            if (receipt === null) {
                continue
            }
        } catch (e) {
            console.log(`Receipt error:`, e)
            break
        }
    }

    // Transaction was successful if status === 1
    if (receipt) {
        return TransactionState.Sent
    } else {
        return TransactionState.Failed
    }
}
