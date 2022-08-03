import { Currency, Token } from "@uniswap/sdk-core";
import React, { KeyboardEvent, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t, Trans } from "@lingui/macro";
import { FixedSizeList } from "react-window";
import { ExtendedEther } from "../../constants/tokens";
import { useActiveWeb3React } from "../../hooks/web3";
import { useAllTokens, useIsUserAddedToken, useSearchInactiveTokenLists, useToken } from "../../hooks/Tokens";
import { CloseIcon, TYPE } from "../../theme";
import { isAddress } from "../../utils";
import Column from "../Column";
import CommonBases from "./CommonBases";
import CurrencyList from "./CurrencyList";
import { filterTokens, useSortedTokensByQuery } from "./filtering";
import { useTokenComparator } from "./sorting";
import { SearchInput } from "./styled";
import useToggle from "hooks/useToggle";
import { useOnClickOutside } from "hooks/useOnClickOutside";
import useTheme from "hooks/useTheme";
import ImportRow from "./ImportRow";
import useDebounce from "hooks/useDebounce";
import ReactGA from "react-ga";

interface CurrencySearchProps {
    isOpen: boolean;
    onDismiss: () => void;
    selectedCurrency?: Currency | null;
    onCurrencySelect: (currency: Currency) => void;
    otherSelectedCurrency?: Currency | null;
    showCommonBases?: boolean;
    showCurrencyAmount?: boolean;
    disableNonToken?: boolean;
    showManageView: () => void;
    showImportView: () => void;
    setImportToken: (token: Token) => void;
}

export function CurrencySearch({
    selectedCurrency,
    onCurrencySelect,
    otherSelectedCurrency,
    showCommonBases,
    showCurrencyAmount,
    disableNonToken,
    onDismiss,
    isOpen,
    showImportView,
    setImportToken,
}: CurrencySearchProps) {
    const { chainId } = useActiveWeb3React();
    const theme = useTheme();

    // refs for fixed size lists
    const fixedList = useRef<FixedSizeList>();

    const [searchQuery, setSearchQuery] = useState<string>("");
    const debouncedQuery = useDebounce(searchQuery, 200);

    const [invertSearchOrder] = useState<boolean>(false);

    const allTokens = useAllTokens();

    // if they input an address, use it
    const isAddressSearch = isAddress(debouncedQuery);

    const searchToken = useToken(debouncedQuery);

    const searchTokenIsAdded = useIsUserAddedToken(searchToken);

    useEffect(() => {
        if (isAddressSearch) {
            ReactGA.event({
                category: "Currency Select",
                action: "Search by address",
                label: isAddressSearch,
            });
        }
    }, [isAddressSearch]);

    const tokenComparator = useTokenComparator(invertSearchOrder);

    const filteredTokens: Token[] = useMemo(() => {
        return filterTokens(Object.values(allTokens), debouncedQuery);
    }, [allTokens, debouncedQuery]);

    const sortedTokens: Token[] = useMemo(() => {
        return filteredTokens.sort(tokenComparator);
    }, [filteredTokens, tokenComparator]);

    const filteredSortedTokens = useSortedTokensByQuery(sortedTokens, debouncedQuery);

    const ether = useMemo(() => chainId && ExtendedEther.onChain(chainId), [chainId]);

    //TODO

    // let chainSymbol
    //
    // if (chainId === 137) {
    //     chainSymbol = 'MATIC'
    // }
    //
    // if (ether) {
    //
    //     // @ts-ignore
    //     ether.name = chainSymbol
    //     // @ts-ignore
    //     ether.symbol = chainSymbol
    // }

    const filteredSortedTokensWithETH: Currency[] = useMemo(() => {
        const s = debouncedQuery.toLowerCase().trim();
        if (s === "m" || s === "ma" || s === "mat" || s === "mati" || s === "matic") {
            return ether ? [ether, ...filteredSortedTokens] : filteredSortedTokens;
        }
        return filteredSortedTokens;
    }, [debouncedQuery, ether, filteredSortedTokens]);

    const handleCurrencySelect = useCallback(
        (currency: Currency) => {
            onCurrencySelect(currency);
            onDismiss();
        },
        [onDismiss, onCurrencySelect]
    );

    // clear the input on open
    useEffect(() => {
        if (isOpen) setSearchQuery("");
    }, [isOpen]);

    // manage focus on modal show
    const inputRef = useRef<HTMLInputElement>();
    const handleInput = useCallback((event) => {
        const input = event.target.value;
        const checksummedInput = isAddress(input);
        setSearchQuery(checksummedInput || input);
        fixedList.current?.scrollTo(0);
    }, []);

    const handleEnter = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                const s = debouncedQuery.toLowerCase().trim();
                if (s === "matic" && ether) {
                    handleCurrencySelect(ether);
                } else if (filteredSortedTokensWithETH.length > 0) {
                    if (filteredSortedTokensWithETH[0].symbol?.toLowerCase() === debouncedQuery.trim().toLowerCase() || filteredSortedTokensWithETH.length === 1) {
                        handleCurrencySelect(filteredSortedTokensWithETH[0]);
                    }
                }
            }
        },
        [debouncedQuery, ether, filteredSortedTokensWithETH, handleCurrencySelect]
    );

    // menu ui
    const [open, toggle] = useToggle(false);
    const node = useRef<HTMLDivElement>();
    useOnClickOutside(node, open ? toggle : undefined);

    // if no results on main list, show option to expand into inactive
    const filteredInactiveTokens = useSearchInactiveTokenLists(filteredTokens.length === 0 || (debouncedQuery.length > 2 && !isAddressSearch) ? debouncedQuery : undefined);

    return (
        <div>
            <div>
                <div className={"flex-s-between mb-1"}>
                    <Trans>Select a token</Trans>
                    <CloseIcon onClick={onDismiss} />
                </div>
                <SearchInput
                    type="text"
                    id="token-search-input"
                    placeholder={t`Search name or paste address`}
                    autoComplete="off"
                    value={searchQuery}
                    ref={inputRef as RefObject<HTMLInputElement>}
                    onChange={handleInput}
                    onKeyDown={handleEnter}
                />
                {showCommonBases && <CommonBases onSelect={handleCurrencySelect} selectedCurrency={selectedCurrency} />}
            </div>
            {searchToken && !searchTokenIsAdded ? (
                <div>
                    <ImportRow token={searchToken} showImportView={showImportView} setImportToken={setImportToken} />
                </div>
            ) : filteredSortedTokens?.length > 0 || filteredInactiveTokens?.length > 0 ? (
                <div className={"h-200"} style={{ overflow: "auto" }}>
                    <CurrencyList
                        height={200}
                        currencies={disableNonToken ? filteredSortedTokens : filteredSortedTokensWithETH}
                        otherListTokens={filteredInactiveTokens}
                        onCurrencySelect={handleCurrencySelect}
                        otherCurrency={otherSelectedCurrency}
                        selectedCurrency={selectedCurrency}
                        fixedListRef={fixedList}
                        showImportView={showImportView}
                        setImportToken={setImportToken}
                        showCurrencyAmount={showCurrencyAmount}
                    />
                </div>
            ) : (
                <Column style={{ padding: "20px", height: "auto" }}>
                    <TYPE.main color={theme.text3} textAlign="center" mb="20px">
                        <Trans>No results found.</Trans>
                    </TYPE.main>
                </Column>
            )}
        </div>
    );
}
