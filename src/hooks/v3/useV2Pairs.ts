import { useMemo } from 'react'
//@ts-ignore
import IUniswapV2PairABI from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { Interface } from '@ethersproject/abi'
import { useMultipleContractSingleData } from 'state/multicall/v3/hooks'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { computePairAddress, Pair } from 'utils/v3/computePairAddress'
import { EXCHANGE_FACTORY_ADDRESS_MAPS, V2Exchanges, V2_FACTORY_ADDRESSES } from 'constants/v3/addresses'
// import { Pair } from "@uniswap/v2-sdk"

const PAIR_INTERFACE = new Interface(IUniswapV2PairABI.abi)

export enum PairState {
    LOADING,
    NOT_EXISTS,
    EXISTS,
    INVALID,
}

export function useV2Pairs(currencies: [Currency | undefined, Currency | undefined][], v2Exchange: V2Exchanges = V2Exchanges.Quickswap): [PairState, Pair | null][] {
    const tokens = useMemo(
        () => currencies.map(([currencyA, currencyB]) => [currencyA?.wrapped, currencyB?.wrapped]),
        [currencies]
    )

const pairAddresses = useMemo(
    () =>
        tokens.map(([tokenA, tokenB]) => {
            return tokenA &&
            tokenB &&
            tokenA.chainId === tokenB.chainId &&
            !tokenA.equals(tokenB) &&
            //TODO: update to verify EXCHANGE_FACTORY_ADDRESS_MAPS && EXCHANGE_PAIR_INIT_HASH_MAPS values exist
            V2_FACTORY_ADDRESSES[tokenA.chainId]
                ? computePairAddress({
                    factoryAddress: EXCHANGE_FACTORY_ADDRESS_MAPS[v2Exchange][tokenA.chainId],
                    tokenA,
                    tokenB,
                    hash: EXCHANGE_PAIR_INIT_HASH_MAPS[v2Exchange][tokenA.chainId]
                })
                : undefined
        }),
    [tokens]
)

    const results = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves')

    return useMemo(() => {
        return results.map((result, i) => {
            const { result: reserves, loading } = result
            const tokenA = tokens[i][0]
            const tokenB = tokens[i][1]

            if (loading) return [PairState.LOADING, null]
            if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [PairState.INVALID, null]
            if (!reserves) return [PairState.NOT_EXISTS, null]
            const { reserve0, reserve1 } = reserves
            const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
            return [
                PairState.EXISTS,
                new Pair(
                    CurrencyAmount.fromRawAmount(token0, reserve0.toString()),
                    CurrencyAmount.fromRawAmount(token1, reserve1.toString()),
                    sushi
                )
            ]
        })
    }, [results, tokens])
}

export function useV2Pair(tokenA?: Currency, tokenB?: Currency, sushi?: boolean): [PairState, Pair | null] {
    const inputs: [[Currency | undefined, Currency | undefined]] = useMemo(() => [[tokenA, tokenB]], [tokenA, tokenB])
    return useV2Pairs(inputs, sushi)[0]
}
