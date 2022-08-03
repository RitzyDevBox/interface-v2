import React, { CSSProperties } from 'react'
import { Token } from '@uniswap/sdk-core'
import { AutoRow, RowFixed } from 'components/Row'
import { AutoColumn } from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import { TYPE } from 'theme'
import useTheme from 'hooks/useTheme'
import { ButtonPrimary } from 'components/Button'
import { useIsTokenActive, useIsUserAddedToken } from 'hooks/Tokens'
import { Trans } from '@lingui/macro'
import { CheckIcon, NameOverflow, TokenSection } from './styled'
import { WrappedCurrency } from '../../models/types'
import './index.scss'

interface ImportRowProps {
    token: Token
    style?: CSSProperties
    dim?: boolean
    showImportView: () => void
    setImportToken: (token: Token) => void
}

export default function ImportRow({ token, style, dim, showImportView, setImportToken }: ImportRowProps) {
    const theme = useTheme()

    // check if already active on list or local storage tokens
    const isAdded = useIsUserAddedToken(token)
    const isActive = useIsTokenActive(token)

    return (
        <div className={'currency-row flex-s-between p-1 br-8 mv-05'}>
            <div className={'f f-ac'}>
                <CurrencyLogo currency={token as WrappedCurrency} size={'24px'} style={{ opacity: dim ? '0.6' : '1' }} />
                <div className={'f f-ac ml-05'}>
                    {token.symbol}
                    <div className={'fs-075 c-p l ml-05'} title={token.name}>
                        {token.name}
                    </div>
                </div>
            </div>
            {!isActive && !isAdded ? (
                <button
                    className={'btn primary br-8 w-fc pv-05 ph-075 fs-085'}
                    onClick={() => {
                        setImportToken && setImportToken(token)
                        showImportView()
                    }}
                >
                    <Trans>Import</Trans>
                </button>
            ) : (
                <RowFixed style={{ minWidth: 'fit-content' }}>
                    <CheckIcon />
                    <TYPE.main color={theme.green1}>
                        <Trans>Active</Trans>
                    </TYPE.main>
                </RowFixed>
            )}
        </div>
    )
}
