import { Token } from '@uniswap/sdk-core'
import { getCreate2Address } from '@ethersproject/address'
import { keccak256, pack } from '@ethersproject/solidity'
import { EXCHANGE_FACTORY_ADDRESS_MAPS, V2Exchanges } from 'constants/v3/addresses';


export const computeSushiPairAddress = ({ tokenA, tokenB }: { tokenA: Token; tokenB: Token }): string => {
    const sushiFactoryAddress = EXCHANGE_FACTORY_ADDRESS_MAPS[V2Exchanges.SushiSwap][137];
    const sushiPairHashInit = EXCHANGE_PAIR_INIT_HASH_MAPS[V2Exchanges.SushiSwap][137];
    const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA] // does safety checks
    return getCreate2Address(sushiFactoryAddress,
        keccak256(['bytes'], [pack(['address', 'address'], [token0.address, token1.address])]),
        sushiPairHashInit
    )
}
