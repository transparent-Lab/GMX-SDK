import { fetchPositions, createIncreaseOrder, createDecreaseOrder, fetchMarkets, fetchOrders, cancelOrder } from './gmx'
import { fetchTicksSurroundingPrice } from './uniswap/depth'

export const uniswap = {
    fetchTicksSurroundingPrice,
}

export const gmx = {
    fetchPositions,
    createIncreaseOrder,
    createDecreaseOrder,
    fetchMarkets,
    fetchOrders,
    cancelOrder
}