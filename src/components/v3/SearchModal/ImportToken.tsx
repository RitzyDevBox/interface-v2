import React from 'react'
import { TokenList } from '@uniswap/token-lists/dist/types'
import { Currency, Token } from '@uniswap/sdk-core'
import { CloseIcon, TYPE } from 'theme'
import Card from 'components/Card'
import { AutoColumn } from 'components/Column'
import { RowBetween } from 'components/Row'
import CurrencyLogo from 'components/CurrencyLogo'
import { ArrowLeft } from 'react-feather'
import { ButtonPrimary } from 'components/Button'
import { SectionBreak } from '../swap/styled'
import { useAddUserToken } from 'state/user/hooks'
import { useActiveWeb3React } from 'hooks/web3'
import { ExternalLink } from '../../theme'
import { ExplorerDataType, getExplorerLink } from '../../utils/getExplorerLink'
import { AddressText, PaddedColumn } from './styled'
import { Plural, Trans } from '@lingui/macro'
import { WrappedCurrency } from '../../models/types'

interface ImportProps {
    tokens: Token[]
    list?: TokenList
    onBack?: () => void
    onDismiss?: () => void
    handleCurrencySelect?: (currency: Currency) => void
}

export function ImportToken({ tokens, onBack, onDismiss, handleCurrencySelect }: ImportProps) {

    const { chainId } = useActiveWeb3React()

    const addToken = useAddUserToken()

    return (
        <div className={'w-100 pos-r'}>
            <PaddedColumn gap='14px' style={{ width: '100%', flex: '1 1' }}>
                <RowBetween>
                    {onBack ? <ArrowLeft style={{ cursor: 'pointer' }} onClick={onBack} /> :
                        <div />}
                    <TYPE.mediumHeader>
                        <Plural value={tokens.length} one='Import token' other='Import tokens' />
                    </TYPE.mediumHeader>
                    {onDismiss ? <CloseIcon onClick={onDismiss} /> : <div />}
                </RowBetween>
            </PaddedColumn>
            <SectionBreak />
            <AutoColumn gap='md' style={{ marginBottom: '32px', padding: '1rem' }}>
                {tokens.map((token) => {
                    return (
                        <Card
                            backgroundColor={'rgba(60, 97, 126, 0.5)'}
                            key={'import' + token.address}
                            className='.token-warning-container'
                            padding='2rem'
                        >
                            <AutoColumn gap='10px' justify='center'>
                                <CurrencyLogo currency={token as WrappedCurrency} size={'32px'} />
                                <AutoColumn gap='4px' justify='center'>
                                    <TYPE.body ml='8px' mr='8px' fontWeight={500} fontSize={20}>
                                        {token.symbol}
                                    </TYPE.body>
                                    <TYPE.darkGray fontWeight={400} fontSize={14}>
                                        {token.name}
                                    </TYPE.darkGray>
                                </AutoColumn>
                                {chainId && (
                                    <ExternalLink
                                        href={getExplorerLink(chainId, token.address, ExplorerDataType.ADDRESS)}>
                                        <AddressText fontSize={12}>{token.address}</AddressText>
                                    </ExternalLink>
                                )}
                            </AutoColumn>
                        </Card>
                    )
                })}
                <ButtonPrimary
                    altDisabledStyle={true}
                    $borderRadius='20px'
                    padding='10px 1rem'
                    onClick={() => {
                        tokens.map((token) => addToken(token))
                        handleCurrencySelect && handleCurrencySelect(tokens[0])
                    }}
                    className='.token-dismiss-button'
                >
                    <Trans>Import</Trans>
                </ButtonPrimary>
            </AutoColumn>
        </div>
    )
}
