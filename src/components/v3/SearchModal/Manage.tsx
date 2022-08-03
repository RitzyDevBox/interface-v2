import { Trans } from '@lingui/macro'
import React, { useState } from 'react'
import { PaddedColumn, Separator, ToggleOption, ToggleWrapper, Wrapper } from './styled'
import { RowBetween } from 'components/Row'
import { ArrowLeft } from 'react-feather'
import { Text } from 'rebass'
import { CloseIcon } from 'theme'
import { Token } from '@uniswap/sdk-core'
import { ManageLists } from './ManageLists'
import ManageTokens from './ManageTokens'
import { TokenList } from '@uniswap/token-lists'
import { CurrencyModalView } from './CurrencySearchModal'

export default function Manage({
    onDismiss,
    setModalView,
    setImportList,
    setImportToken,
    setListUrl
}: {
    onDismiss: () => void
    setModalView: (view: CurrencyModalView) => void
    setImportToken: (token: Token) => void
    setImportList: (list: TokenList) => void
    setListUrl: (url: string) => void
}) {
    // toggle between tokens and lists
    const [showLists, setShowLists] = useState(true)

    return (
        <Wrapper>
            <PaddedColumn>
                <RowBetween>
                    <ArrowLeft style={{ cursor: 'pointer' }}
                               onClick={() => setModalView(CurrencyModalView.search)} />
                    <Text fontWeight={500} fontSize={20}>
                        <Trans>Manage</Trans>
                    </Text>
                    <CloseIcon onClick={onDismiss} />
                </RowBetween>
            </PaddedColumn>
            <Separator />
            <PaddedColumn style={{ paddingBottom: 0 }}>
                <ToggleWrapper>
                    <ToggleOption onClick={() => setShowLists(!showLists)} active={showLists}>
                        <Trans>Lists</Trans>
                    </ToggleOption>
                    <ToggleOption onClick={() => setShowLists(!showLists)} active={!showLists}>
                        <Trans>Tokens</Trans>
                    </ToggleOption>
                </ToggleWrapper>
            </PaddedColumn>
            {showLists ? (
                <ManageLists setModalView={setModalView} setImportList={setImportList}
                             setListUrl={setListUrl} />
            ) : (
                <ManageTokens setModalView={setModalView} setImportToken={setImportToken} />
            )}
        </Wrapper>
    )
}
