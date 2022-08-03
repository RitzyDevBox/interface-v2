import { Trans } from "@lingui/macro";
import { Currency, Token } from "@uniswap/sdk-core";
import React, { CSSProperties, MutableRefObject, useCallback, useMemo } from "react";
import { FixedSizeList } from "react-window";
import { Text } from "rebass";
import { useCombinedActiveList } from "../../state/lists/hooks";
import { WrappedTokenInfo } from "../../state/lists/wrappedTokenInfo";
import { TYPE } from "../../theme";
import { useIsUserAddedToken } from "../../hooks/Tokens";
import { RowBetween, RowFixed } from "../Row";
import CurrencyLogo from "../CurrencyLogo";
import { MouseoverTooltip } from "../Tooltip";
import { isTokenOnList } from "../../utils";
import ImportRow from "./ImportRow";
import { LightGreyCard } from "components/Card";
import QuestionHelper from "components/QuestionHelper";
import useTheme from "hooks/useTheme";
import { FixedContentRow, Tag, TagContainer } from "./styled";
import { WrappedCurrency } from "../../models/types";
import "./index.scss";

function currencyKey(currency: Currency): string {
    return currency.isToken ? currency.address : "MATIC";
}

function TokenTags({ currency }: { currency: Currency }) {
    if (!(currency instanceof WrappedTokenInfo)) {
        return <span />;
    }

    const tags = currency.tags;
    if (!tags || tags.length === 0) return <span />;

    const tag = tags[0];

    return (
        <TagContainer>
            <MouseoverTooltip text={tag.description}>
                <Tag key={tag.id}>{tag.name}</Tag>
            </MouseoverTooltip>
            {tags.length > 1 ? (
                <MouseoverTooltip
                    text={tags
                        .slice(1)
                        .map(({ name, description }) => `${name}: ${description}`)
                        .join("; \n")}
                >
                    <Tag>...</Tag>
                </MouseoverTooltip>
            ) : null}
        </TagContainer>
    );
}

interface CurrencyRowProps {
    currency: Currency;
    onSelect: () => void;
    isSelected: boolean;
    otherSelected: boolean;
    style: CSSProperties;
    showCurrencyAmount?: boolean;
}

function CurrencyRow({ currency, onSelect, isSelected, otherSelected, style }: CurrencyRowProps) {
    const key = currencyKey(currency);
    const selectedTokenList = useCombinedActiveList();
    const isOnSelectedList = isTokenOnList(selectedTokenList, currency.isToken ? currency : undefined);
    const customAdded = useIsUserAddedToken(currency);

    // only show add or remove buttons if not on selected list
    return (
        <div className={`currency-row flex-s-between p-1 br-8 mv-05 token-item-${key}`} onClick={() => (isSelected ? null : onSelect())} data-disabled={isSelected} data-selected={otherSelected}>
            <div className={"f f-ac"}>
                <CurrencyLogo currency={currency as WrappedCurrency} size={"24px"} />
                <div className={"f c ml-05"}>
                    <Text title={currency.name} fontWeight={500}>
                        {currency.symbol}
                    </Text>
                    <span className={"fs-075"}>{!currency.isNative && !isOnSelectedList && customAdded ? <Trans>{currency.name} • Added by user</Trans> : "Matic"}</span>
                </div>
            </div>
            <TokenTags currency={currency} />
        </div>
    );
}

const BREAK_LINE = "BREAK";
type BreakLine = typeof BREAK_LINE;

function isBreakLine(x: unknown): x is BreakLine {
    return x === BREAK_LINE;
}

function BreakLineComponent({ style }: { style: CSSProperties }) {
    const theme = useTheme();
    return (
        <FixedContentRow style={style}>
            <LightGreyCard padding="8px 12px" $borderRadius="8px">
                <RowBetween>
                    <RowFixed>
                        <TYPE.main ml="6px" fontSize="12px" color={theme.text1}>
                            <Trans>Expanded results from inactive Token Lists</Trans>
                        </TYPE.main>
                    </RowFixed>
                    <QuestionHelper text={<Trans>Tokens from inactive lists. Import specific tokens below or click Manage to activate more lists.</Trans>} />
                </RowBetween>
            </LightGreyCard>
        </FixedContentRow>
    );
}

interface CurrenctListProps {
    height: number;
    currencies: Currency[];
    otherListTokens?: WrappedTokenInfo[];
    selectedCurrency?: Currency | null;
    onCurrencySelect: (currency: Currency) => void;
    otherCurrency?: Currency | null;
    fixedListRef?: MutableRefObject<FixedSizeList | undefined>;
    showImportView: () => void;
    setImportToken: (token: Token) => void;
    showCurrencyAmount?: boolean;
}

export default function CurrencyList({
    height,
    currencies,
    otherListTokens,
    selectedCurrency,
    onCurrencySelect,
    otherCurrency,
    fixedListRef,
    showImportView,
    setImportToken,
    showCurrencyAmount,
}: CurrenctListProps) {
    const itemData: (Currency | BreakLine)[] = useMemo(() => {
        if (otherListTokens && otherListTokens?.length > 0) {
            return [...currencies, BREAK_LINE, ...otherListTokens];
        }
        return currencies;
    }, [currencies, otherListTokens]);

    const Row = useCallback(
        function TokenRow({ data, index, style }: any) {
            const row: Currency | BreakLine = data[index];

            if (isBreakLine(row)) {
                return <BreakLineComponent style={style} />;
            }

            const currency = row;

            const isSelected = Boolean(currency && selectedCurrency && selectedCurrency.equals(currency));
            const otherSelected = Boolean(currency && otherCurrency && otherCurrency.equals(currency));
            const handleSelect = () => currency && onCurrencySelect(currency);

            const token = currency?.wrapped;

            const showImport = index > currencies.length;

            if (showImport && token) {
                return <ImportRow style={style} token={token} showImportView={showImportView} setImportToken={setImportToken} dim />;
            } else if (currency) {
                return <CurrencyRow style={style} currency={currency} isSelected={isSelected} onSelect={handleSelect} otherSelected={otherSelected} showCurrencyAmount={showCurrencyAmount} />;
            } else {
                return null;
            }
        },
        [currencies.length, onCurrencySelect, otherCurrency, selectedCurrency, setImportToken, showImportView, showCurrencyAmount]
    );

    const itemKey = useCallback((index: number, data: typeof itemData) => {
        const currency = data[index];
        if (isBreakLine(currency)) return BREAK_LINE;
        return currencyKey(currency);
    }, []);

    return (
        <FixedSizeList style={{ overflow: "unset" }} height={height} ref={fixedListRef as any} width="100%" itemData={itemData} itemCount={itemData.length} itemSize={56} itemKey={itemKey}>
            {Row}
        </FixedSizeList>
    );
}
