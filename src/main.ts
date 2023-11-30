import { fetchPositions, createIncreaseOrder, createDecreaseOrder, fetchMarkets } from './gmx'
import { fetchTicksSurroundingPrice } from './uniswap/depth'

export const uniswap = {
    fetchTicksSurroundingPrice,
}

export const gmx = {
    fetchPositions,
    createIncreaseOrder, createDecreaseOrder, fetchMarkets
}