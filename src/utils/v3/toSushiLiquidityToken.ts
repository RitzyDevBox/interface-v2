import { Token } from '@uniswap/sdk-core'
import { computeSushiPairAddress } from './computeSushiPairAddress'

export function toSushiLiquidityToken([tokenA, tokenB]: [Token, Token]): Token {
    return new Token(tokenA.chainId, computeSushiPairAddress({
        tokenA,
        tokenB
    }), 18, 'SLP', 'SushiSwap LP Token')
}
