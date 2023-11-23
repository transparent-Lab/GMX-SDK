import { fetchTicksSurroundingPrice } from './uniswap/depth'
import { hashData, hashString } from "./gmx/lib/hash";

export const uniswap = {
    fetchTicksSurroundingPrice,
}

export const ether = {
    hashData, hashString
}