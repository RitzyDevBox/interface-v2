import { Trans } from '@lingui/macro'
import { Currency } from '@uniswap/sdk-core'
import { COMMON_BASES } from '../../constants/routing'
import { currencyId } from '../../utils/currencyId'
import { AutoRow } from '../Row'
import CurrencyLogo from '../CurrencyLogo'
import { useActiveWeb3React } from '../../hooks/web3'
import { SupportedChainId } from '../../constants/chains'
import { WrappedCurrency } from '../../models/types'
import './index.scss'

interface CommonBasesProps {
    selectedCurrency?: Currency | null
    onSelect: (currency: Currency) => void
}

export default function CommonBases({ onSelect, selectedCurrency }: CommonBasesProps) {

    const bases = COMMON_BASES[SupportedChainId.POLYGON] as WrappedCurrency[]

    const { chainId } = useActiveWeb3React()

    return bases.length > 0 ? (
        <div className={'mv-1 common-bases'}>
            <AutoRow gap='4px'>
                {bases.map((currency) => {
                    const isSelected = selectedCurrency?.equals(currency)
                    return (
                        <button className={'br-8 bg-t f f-ac c-w p-05 hover-op trans-op'}
                                onClick={() => !isSelected && onSelect(currency)}
                                disabled={isSelected}
                                key={currencyId(currency, chainId || SupportedChainId.POLYGON)}
                        >
                            <CurrencyLogo currency={currency} style={{ marginRight: 8 }} />
                            <span>{currency.symbol}</span>
                        </button>
                    )
                })}
            </AutoRow>
        </div>
    ) : null
}
