import React, { useState } from "react";
import JSBI from "jsbi";
import { CurrencyAmount, Percent, Token } from "@uniswap/sdk-core";
import { ChevronDown, ChevronUp } from "react-feather";
import { Link } from "react-router-dom";
import { Text } from "rebass";
import { useTotalSupply } from "hooks/v3/useTotalSupply";
import { useActiveWeb3React } from "hooks";
import { useTokenBalance } from "state/wallet/v3/hooks";
import { TYPE } from "theme/index";
import { currencyId } from "utils/v3/currencyId";
import { unwrappedToken } from "utils/unwrappedToken";
import { ButtonEmpty, ButtonPrimary } from "../Button";
import { useColor } from "hooks/v3/useColor";
import { GreyCard, LightCard } from "../Card";
import { AutoColumn } from "../Column";
import { AutoRow, RowBetween, RowFixed } from "../Row";
import { Dots } from "../swap/styled";
import Badge, { BadgeVariant } from "../Badge";
import { ButtonPrimaryStyled, FixedHeightRow, FixedHeightRowCurrency, MigrateShortcut, RowFixedLogo, RowFixedPrice, StyledPositionCard } from "./styled";
import { isMobile } from "react-device-detect";
import { Pair } from "utils/v3/computePairAddress";
import DoubleCurrencyLogo from "components/DoubleCurrencyLogo";
import CurrencyLogo from "components/CurrencyLogo";
import { BIG_INT_ZERO } from "constants/v3/misc";
import { WrappedCurrency } from "models/types";
import { ChainId } from "@uniswap/sdk";
import { V2Exchanges } from "constants/v3/addresses";

interface PositionCardProps {
    pair: Pair;
    showUnwrapped?: boolean;
    border?: string;
    stakedBalance?: CurrencyAmount<Token>; // optional balance to indicate that liquidity is deposited in mining pool
    exchange?: V2Exchanges;
}

export function MinimalPositionCard({ pair, showUnwrapped = false, exchange }: PositionCardProps) {
    const { account } = useActiveWeb3React();

    const currency0 = showUnwrapped ? pair.token0 : unwrappedToken(pair.token0);
    const currency1 = showUnwrapped ? pair.token1 : unwrappedToken(pair.token1);

    const [showMore, setShowMore] = useState(false);

    const userPoolBalance = useTokenBalance(account ?? undefined, pair.liquidityToken);
    const totalPoolTokens = useTotalSupply(pair.liquidityToken);

    const poolTokenPercentage =
        !!userPoolBalance && !!totalPoolTokens && JSBI.greaterThanOrEqual(totalPoolTokens.quotient, userPoolBalance.quotient)
            ? new Percent(userPoolBalance.quotient, totalPoolTokens.quotient)
            : undefined;

    const [token0Deposited, token1Deposited] =
        !!pair &&
        !!totalPoolTokens &&
        !!userPoolBalance &&
        // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
        JSBI.greaterThanOrEqual(totalPoolTokens.quotient, userPoolBalance.quotient)
            ? [pair.getLiquidityValue(pair.token0, totalPoolTokens, userPoolBalance, false), pair.getLiquidityValue(pair.token1, totalPoolTokens, userPoolBalance, false)]
            : [undefined, undefined];

    return (
        <>
            {userPoolBalance && JSBI.greaterThan(userPoolBalance.quotient, JSBI.BigInt(0)) ? (
                <GreyCard>
                    <AutoColumn gap="12px">
                        <FixedHeightRow>
                            <RowFixed style={{ width: "100%" }}>
                                <Text fontWeight={500} fontSize={16}>
                                    Your position
                                </Text>
                                <ButtonPrimaryStyled>
                                    <MigrateShortcut to={`/migrate/${Pair.getAddress(pair.token0, pair.token1, exchange)}`}>
                                        Migrate
                                    </MigrateShortcut>
                                </ButtonPrimaryStyled>
                            </RowFixed>
                        </FixedHeightRow>
                        <FixedHeightRowCurrency onClick={() => setShowMore(!showMore)}>
                            <RowFixedLogo>
                                <DoubleCurrencyLogo currency0={currency0} currency1={currency1} size={24} />
                                <Text style={{ marginLeft: "5px", marginRight: "5px" }} fontWeight={500} fontSize={20}>
                                    {currency1.symbol}/{currency0.symbol}
                                </Text>
                                {!isMobile && (
                                    <Badge
                                        style={{
                                            backgroundColor: "white",
                                            color: exchange == V2Exchanges.SushiSwap ? "#ed1185" : "#48b9cd",
                                            minWidth: "100px",
                                        }}
                                    >
                                        {exchange == V2Exchanges.SushiSwap ? "SushiSwap" : "QuickSwap"}
                                    </Badge>
                                )}
                            </RowFixedLogo>
                            <RowFixedPrice>
                                <Text fontWeight={500} fontSize={20} title={userPoolBalance.toExact()} style={{ cursor: "default" }}>
                                    {userPoolBalance ? parseFloat(userPoolBalance.toExact()).toFixed(6) : "-"}
                                </Text>
                                {isMobile && (
                                    <Badge
                                        style={{
                                            backgroundColor: "white",
                                            color: exchange == V2Exchanges.SushiSwap ? "#ed1185" : "#48b9cd",
                                            minWidth: "100px",
                                        }}
                                    >
                                        {exchange == V2Exchanges.SushiSwap ? "SushiSwap" : "QuickSwap"}
                                    </Badge>
                                )}
                            </RowFixedPrice>
                        </FixedHeightRowCurrency>
                        <AutoColumn gap="4px">
                            <FixedHeightRow>
                                <Text fontSize={16} fontWeight={500}>
                                    Your pool share:
                                </Text>
                                <Text fontSize={16} fontWeight={500}>
                                    {poolTokenPercentage ? poolTokenPercentage.toFixed(6) + "%" : "-"}
                                </Text>
                            </FixedHeightRow>
                            <FixedHeightRow>
                                <Text fontSize={16} fontWeight={500}>
                                    {currency0.symbol}:
                                </Text>
                                {token0Deposited ? (
                                    <RowFixed>
                                        <Text fontSize={16} fontWeight={500} marginLeft={"6px"}>
                                            {token0Deposited?.toSignificant(6)}
                                        </Text>
                                    </RowFixed>
                                ) : (
                                    "-"
                                )}
                            </FixedHeightRow>
                            <FixedHeightRow>
                                <Text fontSize={16} fontWeight={500}>
                                    {currency1.symbol}:
                                </Text>
                                {token1Deposited ? (
                                    <RowFixed>
                                        <Text fontSize={16} fontWeight={500} marginLeft={"6px"}>
                                            {token1Deposited?.toSignificant(6)}
                                        </Text>
                                    </RowFixed>
                                ) : (
                                    "-"
                                )}
                            </FixedHeightRow>
                        </AutoColumn>
                    </AutoColumn>
                </GreyCard>
            ) : (
                <LightCard>
                    <TYPE.subHeader style={{ textAlign: "center" }}>
                        <span role="img" aria-label="wizard-icon">
                            ⭐️
                        </span>
                        {" "}
                            By adding liquidity you&apos;ll earn 0.3% of all trades on this pair proportional to your share of the pool. Fees are added to the pool, accrue in real time and can be
                            claimed by withdrawing your liquidity.
                        {" "}
                    </TYPE.subHeader>
                </LightCard>
            )}
        </>
    );
}

export default function FullPositionCard({ pair, border, stakedBalance }: PositionCardProps) {
    const { account, chainId } = useActiveWeb3React();

    const currency0 = unwrappedToken(pair.token0);
    const currency1 = unwrappedToken(pair.token1);

    const [showMore, setShowMore] = useState(false);

    const userDefaultPoolBalance = useTokenBalance(account ?? undefined, pair.liquidityToken);
    const totalPoolTokens = useTotalSupply(pair.liquidityToken);

    // if staked balance balance provided, add to standard liquidity amount
    const userPoolBalance = stakedBalance ? userDefaultPoolBalance?.add(stakedBalance) : userDefaultPoolBalance;

    const poolTokenPercentage =
        !!userPoolBalance && !!totalPoolTokens && JSBI.greaterThanOrEqual(totalPoolTokens.quotient, userPoolBalance.quotient)
            ? new Percent(userPoolBalance.quotient, totalPoolTokens.quotient)
            : undefined;

    const [token0Deposited, token1Deposited] =
        !!pair &&
        !!totalPoolTokens &&
        !!userPoolBalance &&
        // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
        JSBI.greaterThanOrEqual(totalPoolTokens.quotient, userPoolBalance.quotient)
            ? [pair.getLiquidityValue(pair.token0, totalPoolTokens, userPoolBalance, false), pair.getLiquidityValue(pair.token1, totalPoolTokens, userPoolBalance, false)]
            : [undefined, undefined];

    const backgroundColor = useColor(pair?.token0);

    return (
        <StyledPositionCard border={border} bgColor={backgroundColor}>
            <AutoColumn gap="12px">
                <FixedHeightRow>
                    <AutoRow gap="8px" style={{ marginLeft: "8px" }}>
                        <DoubleCurrencyLogo currency0={currency0} currency1={currency1} size={20} />
                        <Text fontWeight={500} fontSize={20}>
                            {!currency0 || !currency1 ? (
                                <Dots>
                                    Loading
                                </Dots>
                            ) : (
                                `${currency0.symbol}/${currency1.symbol}`
                            )}
                        </Text>
                        <Badge variant={BadgeVariant.WARNING}/> QuickSwap
                    </AutoRow>
                    <RowFixed gap="8px" style={{ marginRight: "4px" }}>
                        <ButtonEmpty padding="6px 8px" $borderRadius="12px" width="100%" onClick={() => setShowMore(!showMore)}>
                            {showMore ? (
                                <>
                                    Manage
                                    <ChevronUp
                                        size="20"
                                        style={{
                                            marginLeft: "8px",
                                            height: "20px",
                                            minWidth: "20px",
                                        }}
                                    />
                                </>
                            ) : (
                                <>
                                    Manage
                                    <ChevronDown
                                        size="20"
                                        style={{
                                            marginLeft: "8px",
                                            height: "20px",
                                            minWidth: "20px",
                                        }}
                                    />
                                </>
                            )}
                        </ButtonEmpty>
                    </RowFixed>
                </FixedHeightRow>

                {showMore && (
                    <AutoColumn gap="8px">
                        <FixedHeightRow>
                            <Text fontSize={16} fontWeight={500}>
                                Your total pool tokens:
                            </Text>
                            <Text fontSize={16} fontWeight={500}>
                                {userPoolBalance ? userPoolBalance.toSignificant(4) : "-"}
                            </Text>
                        </FixedHeightRow>
                        {stakedBalance && (
                            <FixedHeightRow>
                                <Text fontSize={16} fontWeight={500}>
                                    Pool tokens in rewards pool:
                                </Text>
                                <Text fontSize={16} fontWeight={500}>
                                    {stakedBalance.toSignificant(4)}
                                </Text>
                            </FixedHeightRow>
                        )}
                        <FixedHeightRow>
                            <RowFixed>
                                <Text fontSize={16} fontWeight={500}>
                                    Pooled {currency0.symbol}:
                                </Text>
                            </RowFixed>
                            {token0Deposited ? (
                                <RowFixed>
                                    <Text fontSize={16} fontWeight={500} marginLeft={"6px"}>
                                        {token0Deposited?.toSignificant(6)}
                                    </Text>
                                    <CurrencyLogo size="24px" style={{ marginLeft: "8px" }} currency={currency0 as WrappedCurrency} />
                                </RowFixed>
                            ) : (
                                "-"
                            )}
                        </FixedHeightRow>

                        <FixedHeightRow>
                            <RowFixed>
                                <Text fontSize={16} fontWeight={500}>
                                    Pooled {currency1.symbol}:
                                </Text>
                            </RowFixed>
                            {token1Deposited ? (
                                <RowFixed>
                                    <Text fontSize={16} fontWeight={500} marginLeft={"6px"}>
                                        {token1Deposited?.toSignificant(6)}
                                    </Text>
                                    <CurrencyLogo size="24px" style={{ marginLeft: "8px" }} currency={currency1 as WrappedCurrency} />
                                </RowFixed>
                            ) : (
                                "-"
                            )}
                        </FixedHeightRow>

                        <FixedHeightRow>
                            <Text fontSize={16} fontWeight={500}>
                                Your pool share:
                            </Text>
                            <Text fontSize={16} fontWeight={500}>
                                {poolTokenPercentage ? {poolTokenPercentage.toFixed(2) === "0.00" ? "<0.01" : poolTokenPercentage.toFixed(2)} % : "-"}
                            </Text>
                        </FixedHeightRow>
                        {userDefaultPoolBalance && JSBI.greaterThan(userDefaultPoolBalance.quotient, BIG_INT_ZERO) && (
                            <RowBetween marginTop="10px">
                                <ButtonPrimary padding="8px" $borderRadius="8px" as={Link} to={`/migrate/${pair.liquidityToken.address}`} width="32%">
                                    Migrate
                                </ButtonPrimary>
                                <ButtonPrimary
                                    padding="8px"
                                    $borderRadius="8px"
                                    as={Link}
                                    to={`/add/${currencyId(currency0, chainId || ChainId.MATIC)}/${currencyId(currency1, chainId || ChainId.MATIC)}`}
                                    width="32%"
                                >
                                    Add
                                </ButtonPrimary>
                            </RowBetween>
                        )}
                        {stakedBalance && JSBI.greaterThan(stakedBalance.quotient, BIG_INT_ZERO) && (
                            <ButtonPrimary
                                padding="8px"
                                $borderRadius="8px"
                                as={Link}
                                to={`/uni/${currencyId(currency0, chainId || ChainId.MATIC)}/${currencyId(currency1, chainId || ChainId.MATIC)}`}
                                width="100%"
                            >
                                Manage Liquidity in Rewards Pool
                            </ButtonPrimary>
                        )}
                    </AutoColumn>
                )}
            </AutoColumn>
        </StyledPositionCard>
    );
}
