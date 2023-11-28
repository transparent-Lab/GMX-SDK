import { fetchTicksSurroundingPrice } from './uniswap/depth'

export const uniswap = {
    fetchTicksSurroundingPrice,
}

export const gmx = import('./gmx/index');