import { Contract } from "@ethersproject/contracts";
import { CurrencyAmount, Fraction, Percent, Price, Token } from "@uniswap/sdk-core";
import { useActiveWeb3React } from "../../hooks/web3";
import useTheme from "../../hooks/useTheme";
import { V2_FACTORY_ADDRESSES } from "../../constants/addresses";
import { useIsNetworkFailed } from "../../hooks/useIsNetworkFailed";
import { useSingleCallResult } from "../../state/multicall/hooks";
import usePrevious from "../../hooks/usePrevious";
import { useCallback, useMemo, useState } from "react";
import useTransactionDeadline from "../../hooks/useTransactionDeadline";
import useCurrentBlockTimestamp from "../../hooks/useCurrentBlockTimestamp";
import { useUserSlippageToleranceWithDefault } from "../../state/user/hooks";
import { unwrappedToken } from "../../utils/unwrappedToken";
import JSBI from "jsbi";
import { FeeAmount, Pool, Position, priceToClosestTick, TickMath } from "../../lib/src";
import { PoolState, usePool } from "../../hooks/usePools";
import { useRangeHopCallbacks, useV3DerivedMintInfo, useV3MintActionHandlers } from "../../state/mint/v3/hooks";
import { Bound } from "../../state/mint/v3/actions";
import { useV2MigratorContract } from "../../hooks/useContract";
import { ApprovalState, useApproveCallback } from "../../hooks/useApproveCallback";
import { useV2LiquidityTokenPermit } from "../../hooks/useERC20Permit";
import { useIsTransactionPending, useTransactionAdder } from "../../state/transactions/hooks";
import { TransactionResponse } from "@ethersproject/providers";
import ReactGA from "react-ga";
import { TransactionType } from "../../state/transactions/actions";
import { currencyId } from "../../utils/currencyId";
import { AutoColumn } from "../../components/Column";
import { BlueCard, DarkGreyCard, LightCard, YellowCard } from "../../components/Card";
import { RowBetween, RowFixed } from "../../components/Row";
import DoubleCurrencyLogo from "../../components/DoubleLogo";
import { TYPE } from "../../theme";
import Badge, { BadgeVariant } from "../../components/Badge";
import LiquidityInfo from "./LiquidityInfo";
import { AlertCircle, AlertTriangle, ArrowDown } from "react-feather";
import RateToggle from "../../components/RateToggle";
import RangeSelector from "../../components/RangeSelector";
import { formatCurrencyAmount } from "../../utils/formatCurrencyAmount";
import { WMATIC_EXTENDED } from "../../constants/tokens";
import { ButtonConfirmed } from "../../components/Button";
import { Dots } from "../../components/swap/styled";
import { Link } from "react-router-dom";
import { SupportedChainId } from "../../constants/chains";
import Card from "../../shared/components/Card/Card";

import { t, Trans } from "@lingui/macro";

interface V2PairMigrationProps {
    pair: Contract | null;
    pairBalance: CurrencyAmount<Token>;
    totalSupply: CurrencyAmount<Token>;
    reserve0: CurrencyAmount<Token>;
    reserve1: CurrencyAmount<Token>;
    token0: Token;
    token1: Token;
}

export function V2PairMigration({ pair, pairBalance, totalSupply, reserve0, reserve1, token0, token1 }: V2PairMigrationProps) {
    const ZERO = JSBI.BigInt(0);
    const percentageToMigrate = 100;
    const { chainId, account } = useActiveWeb3React();
    const theme = useTheme();
    const v2FactoryAddress = chainId ? V2_FACTORY_ADDRESSES[chainId] : undefined;
    const DEFAULT_MIGRATE_SLIPPAGE_TOLERANCE = new Percent(75, 10_000);

    const networkFailed = useIsNetworkFailed();

    const pairFactory = useSingleCallResult(pair, "factory");
    const isNotUniswap = !pairFactory.result ? null : pairFactory.result?.[0] && pairFactory.result[0].toLowerCase() !== v2FactoryAddress?.toLowerCase();
    const prevIsNotUniswap = usePrevious(isNotUniswap);
    const _isNotUniswap = useMemo(() => {
        if (isNotUniswap === null && prevIsNotUniswap) {
            return prevIsNotUniswap;
        }
        return isNotUniswap;
    }, [pairFactory]);

    const deadline = useTransactionDeadline(); // custom from users settings
    const blockTimestamp = useCurrentBlockTimestamp();
    const allowedSlippage = useUserSlippageToleranceWithDefault(DEFAULT_MIGRATE_SLIPPAGE_TOLERANCE); // custom from users

    const currency0 = unwrappedToken(token0);
    const currency1 = unwrappedToken(token1);

    // this is just getLiquidityValue with the fee off, but for the passed pair
    const token0Value = useMemo(
        () => CurrencyAmount.fromRawAmount(token0, JSBI.divide(JSBI.multiply(pairBalance.quotient, reserve0.quotient), totalSupply.quotient)),
        [token0, pairBalance, reserve0, totalSupply]
    );
    const token1Value = useMemo(
        () => CurrencyAmount.fromRawAmount(token1, JSBI.divide(JSBI.multiply(pairBalance.quotient, reserve1.quotient), totalSupply.quotient)),
        [token1, pairBalance, reserve1, totalSupply]
    );

    // set up v3 pool
    const [feeAmount, setFeeAmount] = useState(FeeAmount.MEDIUM);
    const [poolState, pool] = usePool(token0, token1);
    const noLiquidity = poolState === PoolState.NOT_EXISTS;

    // get spot prices + price difference
    const v2SpotPrice = useMemo(() => new Price(token0, token1, reserve0.quotient, reserve1.quotient), [token0, token1, reserve0, reserve1]);
    const v3SpotPrice = poolState === PoolState.EXISTS ? pool?.token0Price : undefined;

    let priceDifferenceFraction: Fraction | string | undefined =
        v2SpotPrice && v3SpotPrice ? (v2SpotPrice.divide(v3SpotPrice).greaterThan(10000) ? "> 1000" : v3SpotPrice.divide(v2SpotPrice).subtract(1).multiply(100)) : undefined;

    if (typeof priceDifferenceFraction !== "string" && priceDifferenceFraction?.lessThan(ZERO)) {
        priceDifferenceFraction = priceDifferenceFraction.multiply(-1);
    }

    const largePriceDifference = useMemo(() => {
        if (typeof priceDifferenceFraction === "string") {
            return true;
        }
        return priceDifferenceFraction && !priceDifferenceFraction?.lessThan(JSBI.BigInt(2));
    }, [priceDifferenceFraction]);

    // the following is a small hack to get access to price range data/input handlers
    const [baseToken, setBaseToken] = useState(token0);
    const { ticks, pricesAtTicks, invertPrice, invalidRange, outOfRange, ticksAtLimit } = useV3DerivedMintInfo(token0, token1, feeAmount, baseToken);

    // get value and prices at ticks
    const { [Bound.LOWER]: tickLower, [Bound.UPPER]: tickUpper } = ticks;
    const { [Bound.LOWER]: priceLower, [Bound.UPPER]: priceUpper } = pricesAtTicks;

    const { getDecrementLower, getIncrementLower, getDecrementUpper, getIncrementUpper } = useRangeHopCallbacks(baseToken, baseToken.equals(token0) ? token1 : token0, feeAmount, tickLower, tickUpper);

    const { onLeftRangeInput, onRightRangeInput } = useV3MintActionHandlers(noLiquidity);

    // the v3 tick is either the pool's tickCurrent, or the tick closest to the v2 spot price
    const tick = pool?.tickCurrent ?? priceToClosestTick(v2SpotPrice);
    // the price is either the current v3 price, or the price at the tick
    const sqrtPrice = pool?.sqrtRatioX96 ?? TickMath.getSqrtRatioAtTick(tick);
    const position =
        typeof tickLower === "number" && typeof tickUpper === "number" && !invalidRange
            ? Position.fromAmounts({
                  pool: pool ?? new Pool(token0, token1, feeAmount, sqrtPrice, 0, tick, []),
                  tickLower,
                  tickUpper,
                  amount0: token0Value.quotient,
                  amount1: token1Value.quotient,
                  useFullPrecision: true, // we want full precision for the theoretical position
              })
            : undefined;

    const { amount0: v3Amount0Min, amount1: v3Amount1Min } = useMemo(
        () =>
            position
                ? position.mintAmountsWithSlippage(allowedSlippage)
                : {
                      amount0: undefined,
                      amount1: undefined,
                  },
        [position, allowedSlippage]
    );

    const refund0 = useMemo(() => position && CurrencyAmount.fromRawAmount(token0, JSBI.subtract(token0Value.quotient, position.amount0.quotient)), [token0Value, position, token0]);
    const refund1 = useMemo(() => position && CurrencyAmount.fromRawAmount(token1, JSBI.subtract(token1Value.quotient, position.amount1.quotient)), [token1Value, position, token1]);

    const [confirmingMigration, setConfirmingMigration] = useState<boolean>(false);
    const [pendingMigrationHash, setPendingMigrationHash] = useState<string | null>(null);

    const migrator = useV2MigratorContract();

    // approvals
    const [approval, approveManually] = useApproveCallback(pairBalance, migrator?.address);
    const { signatureData, gatherPermitSignature } = useV2LiquidityTokenPermit(pairBalance, migrator?.address);

    const approve = useCallback(async () => {
        // sushi has to be manually approved
        await approveManually();
    }, [gatherPermitSignature, approveManually]);

    const addTransaction = useTransactionAdder();
    const isMigrationPending = useIsTransactionPending(pendingMigrationHash ?? undefined);

    const migrate = useCallback(() => {
        if (!migrator || !account || !deadline || !blockTimestamp || typeof tickLower !== "number" || typeof tickUpper !== "number" || !v3Amount0Min || !v3Amount1Min || !chainId) return;

        const deadlineToUse = signatureData?.deadline ?? deadline;

        const data: string[] = [];

        // permit if necessary
        if (signatureData) {
            data.push(
                //@ts-ignore
                migrator.interface.encodeFunctionData("selfPermit", [pair?.address, `0x${pairBalance.quotient.toString(16)}`, deadlineToUse, signatureData.v, signatureData.r, signatureData.s])
            );
        }

        // create/initialize pool if necessary
        if (noLiquidity) {
            data.push(
                //@ts-ignore
                migrator.interface.encodeFunctionData("createAndInitializePoolIfNecessary", [token0.address, token1.address, `0x${sqrtPrice.toString(16)}`])
            );
        }

        // TODO could save gas by not doing this in multicall
        data.push(
            //@ts-ignore
            migrator.interface.encodeFunctionData("migrate", [
                {
                    pair: pair?.address,
                    liquidityToMigrate: `0x${pairBalance.quotient.toString(16)}`,
                    percentageToMigrate,
                    token0: token0.address,
                    token1: token1.address,
                    tickLower,
                    tickUpper,
                    amount0Min: `0x${v3Amount0Min.toString(16)}`,
                    amount1Min: `0x${v3Amount1Min.toString(16)}`,
                    recipient: account,
                    deadline: deadlineToUse,
                    refundAsNative: false, // hard-code this for now
                },
            ])
        );

        setConfirmingMigration(true);

        migrator.estimateGas
            .multicall(data)
            .then(() => {
                return migrator.multicall(data, { gasLimit: 10000000 }).then((response: TransactionResponse) => {
                    ReactGA.event({
                        category: "Migrate",
                        action: `${isNotUniswap ? "SushiSwap" : "QuickSwap"}->Algebra`,
                        label: `${currency0.symbol}/${currency1.symbol}`,
                    });

                    addTransaction(response, {
                        //@ts-ignore
                        type: TransactionType.MIGRATE_LIQUIDITY_V3,
                        baseCurrencyId: currencyId(currency0, SupportedChainId.POLYGON),
                        quoteCurrencyId: currencyId(currency1, SupportedChainId.POLYGON),
                        isFork: _isNotUniswap,
                    });
                    setPendingMigrationHash(response.hash);
                });
            })
            .catch(() => {
                setConfirmingMigration(false);
            });
    }, [
        chainId,
        _isNotUniswap,
        migrator,
        noLiquidity,
        blockTimestamp,
        token0,
        token1,
        feeAmount,
        pairBalance,
        tickLower,
        tickUpper,
        sqrtPrice,
        v3Amount0Min,
        v3Amount1Min,
        account,
        deadline,
        signatureData,
        addTransaction,
        pair,
        currency0,
        currency1,
    ]);

    const isSuccessfullyMigrated = !!pendingMigrationHash && JSBI.equal(pairBalance.quotient, ZERO);

    return (
        <AutoColumn gap="20px">
            <Card isDark={false} classes={"p-1 br-12"}>
                <AutoColumn gap="lg">
                    <RowBetween>
                        <RowFixed style={{ marginLeft: "8px" }}>
                            <DoubleCurrencyLogo currency0={currency0} currency1={currency1} margin={false} size={24} />
                            <TYPE.mediumHeader style={{ marginLeft: "8px" }}>
                                <Trans>
                                    {currency1.symbol}/{currency0.symbol} LP Tokens
                                </Trans>
                            </TYPE.mediumHeader>
                        </RowFixed>
                        {pairFactory.result && (
                            <Badge
                                variant={BadgeVariant.WARNING}
                                style={{
                                    backgroundColor: "white",
                                    color: _isNotUniswap ? "#48b9cd" : "#f241a5",
                                }}
                            >
                                {_isNotUniswap ? "SushiSwap" : "QuickSwap"}
                            </Badge>
                        )}
                    </RowBetween>
                    <LiquidityInfo token0Amount={token0Value} token1Amount={token1Value} />
                </AutoColumn>
            </Card>

            <div style={{ display: "flex", justifyContent: "center" }}>
                <ArrowDown size={24} />
            </div>

            <Card isDark={false} classes={"p-1 br-12"}>
                <AutoColumn gap="lg">
                    <RowBetween>
                        <RowFixed style={{ marginLeft: "8px" }}>
                            <DoubleCurrencyLogo currency0={currency0} currency1={currency1} margin={false} size={24} />
                            <TYPE.mediumHeader style={{ marginLeft: "8px" }}>
                                <Trans>
                                    {currency1.symbol}/{currency0.symbol} LP NFT
                                </Trans>
                            </TYPE.mediumHeader>
                        </RowFixed>
                        <Badge variant={BadgeVariant.PRIMARY}>Algebra</Badge>
                    </RowBetween>

                    {noLiquidity && (
                        <BlueCard
                            style={{
                                display: "flex",
                                backgroundColor: "#0e3459",
                                flexDirection: "column",
                                alignItems: "center",
                            }}
                        >
                            <AlertCircle color={theme.text1} style={{ marginBottom: "12px", opacity: 0.8 }} />
                            <TYPE.body fontSize={14} style={{ marginBottom: 8, fontWeight: 500, opacity: 0.8 }} textAlign="center">
                                <Trans>You are the first liquidity provider for this Algebra pool. Your liquidity will migrate at the current</Trans>
                                {_isNotUniswap ? "SushiSwap" : "QuickSwap"} price.
                            </TYPE.body>

                            <TYPE.body fontWeight={500} textAlign="center" fontSize={14} style={{ marginTop: "8px", opacity: 0.8 }}>
                                <Trans>Your transaction cost will be much higher as it includes the gas to create the pool.</Trans>
                            </TYPE.body>

                            {v2SpotPrice && (
                                <AutoColumn gap="8px" style={{ marginTop: "12px" }}>
                                    <RowBetween>
                                        <TYPE.body fontWeight={500} fontSize={14}>
                                            {_isNotUniswap ? "SushiSwap" : "QuickSwap"} {invertPrice ? currency1.symbol : currency0.symbol} <Trans>Price: </Trans>
                                            {invertPrice ? `${v2SpotPrice?.invert()?.toSignificant(6)} ${currency0.symbol}` : `${v2SpotPrice?.toSignificant(6)} ${currency1.symbol}`}
                                        </TYPE.body>
                                    </RowBetween>
                                </AutoColumn>
                            )}
                        </BlueCard>
                    )}

                    {largePriceDifference ? (
                        <YellowCard>
                            <AutoColumn gap="8px">
                                <RowBetween>
                                    <TYPE.body fontSize={14}>
                                        {_isNotUniswap ? "SushiSwap" : "QuickSwap"} {invertPrice ? currency1.symbol : currency0.symbol} <Trans>Price:</Trans>
                                    </TYPE.body>
                                    <TYPE.black fontSize={14}>
                                        {invertPrice ? `${v2SpotPrice?.invert()?.toSignificant(6)} ${currency0.symbol}` : `${v2SpotPrice?.toSignificant(6)} ${currency1.symbol}`}
                                    </TYPE.black>
                                </RowBetween>

                                <RowBetween>
                                    <TYPE.body fontSize={14}>{t`Algebra ${invertPrice ? currency1.symbol : currency0.symbol} Price:`}</TYPE.body>
                                    <TYPE.black fontSize={14}>
                                        {invertPrice
                                            ? `${v3SpotPrice?.invert()?.toSignificant(6)} ${currency0.symbol}`
                                            : `${Number(v3SpotPrice?.toSignificant(6)) < 0.0001 ? "< 0.0001" : v3SpotPrice?.toSignificant(6)} ${currency1.symbol}`}
                                    </TYPE.black>
                                </RowBetween>

                                <RowBetween>
                                    <TYPE.body fontSize={14} color="inherit">
                                        <Trans>Price Difference:</Trans>
                                    </TYPE.body>
                                    <TYPE.black fontSize={14} color="inherit">
                                        {`${typeof priceDifferenceFraction !== "string" ? priceDifferenceFraction?.toSignificant(4) : priceDifferenceFraction}%`}
                                    </TYPE.black>
                                </RowBetween>
                            </AutoColumn>
                            <TYPE.body fontSize={14} style={{ marginTop: 8, fontWeight: 400 }}>
                                <Trans>
                                    You should only deposit liquidity into Algebra at a price you believe is correct. <br />
                                    If the price seems incorrect, you can either make a swap to move the price or wait for someone else to do so.
                                </Trans>
                            </TYPE.body>
                        </YellowCard>
                    ) : !noLiquidity && v3SpotPrice ? (
                        <RowBetween>
                            <TYPE.body fontSize={14}>
                                <Trans>Algebra {invertPrice ? currency1.symbol : currency0.symbol} Price:</Trans>
                            </TYPE.body>
                            <TYPE.black fontSize={14}>
                                {invertPrice ? `${v3SpotPrice?.invert()?.toSignificant(6)} ${currency0.symbol}` : `${v3SpotPrice?.toSignificant(6)} ${currency1.symbol}`}
                            </TYPE.black>
                        </RowBetween>
                    ) : null}

                    <RowBetween>
                        <TYPE.label>
                            <Trans>Set Price Range</Trans>
                        </TYPE.label>
                        <RateToggle
                            currencyA={invertPrice ? currency1 : currency0}
                            currencyB={invertPrice ? currency0 : currency1}
                            handleRateToggle={() => {
                                onLeftRangeInput("");
                                onRightRangeInput("");
                                setBaseToken((base) => (base.equals(token0) ? token1 : token0));
                            }}
                        />
                    </RowBetween>

                    <RangeSelector
                        priceLower={priceLower}
                        priceUpper={priceUpper}
                        getDecrementLower={getDecrementLower}
                        getIncrementLower={getIncrementLower}
                        getDecrementUpper={getDecrementUpper}
                        getIncrementUpper={getIncrementUpper}
                        onLeftRangeInput={onLeftRangeInput}
                        onRightRangeInput={onRightRangeInput}
                        currencyA={invertPrice ? currency1 : currency0}
                        currencyB={invertPrice ? currency0 : currency1}
                        feeAmount={feeAmount}
                        ticksAtLimit={ticksAtLimit}
                        disabled={false}
                        initial={false}
                    />

                    {outOfRange ? (
                        <YellowCard padding="8px 12px" $borderRadius="12px">
                            <RowBetween>
                                <AlertTriangle stroke={theme.yellow3} size="16px" />
                                <TYPE.yellow ml="12px" fontSize="12px">
                                    <Trans>Your position will not earn fees or be used in trades until the market price moves into your range.</Trans>
                                </TYPE.yellow>
                            </RowBetween>
                        </YellowCard>
                    ) : null}

                    {invalidRange ? (
                        <YellowCard padding="8px 12px" $borderRadius="12px">
                            <RowBetween>
                                <AlertTriangle stroke={theme.yellow3} size="16px" />
                                <TYPE.yellow ml="12px" fontSize="12px">
                                    <Trans>Invalid range selected. The min price must be lower than the max price.</Trans>
                                </TYPE.yellow>
                            </RowBetween>
                        </YellowCard>
                    ) : null}

                    {position ? (
                        <DarkGreyCard>
                            <AutoColumn gap="md">
                                <LiquidityInfo token0Amount={position.amount0} token1Amount={position.amount1} />
                                {chainId && refund0 && refund1 ? (
                                    <TYPE.black fontSize={12}>
                                        <Trans>
                                            At least {formatCurrencyAmount(refund0, 4)} {token0.equals(WMATIC_EXTENDED[chainId]) ? "MATIC" : token0.symbol} and {formatCurrencyAmount(refund1, 4)}{" "}
                                            {token1.equals(WMATIC_EXTENDED[chainId]) ? "MATIC" : token1.symbol} will be refunded to your wallet due to selected price range.
                                        </Trans>
                                    </TYPE.black>
                                ) : null}
                            </AutoColumn>
                        </DarkGreyCard>
                    ) : null}

                    <AutoColumn gap="12px">
                        {!isSuccessfullyMigrated && !isMigrationPending ? (
                            <AutoColumn gap="12px" style={{ flex: "1" }}>
                                <ButtonConfirmed
                                    confirmed={approval === ApprovalState.APPROVED || signatureData !== null}
                                    disabled={approval !== ApprovalState.NOT_APPROVED || signatureData !== null || !v3Amount0Min || !v3Amount1Min || invalidRange || confirmingMigration}
                                    onClick={approve}
                                >
                                    {approval === ApprovalState.PENDING ? (
                                        <Dots>
                                            <Trans>Approving</Trans>
                                        </Dots>
                                    ) : approval === ApprovalState.APPROVED || signatureData !== null ? (
                                        <span>
                                            <Trans>Allowed</Trans>
                                        </span>
                                    ) : (
                                        <span>
                                            <Trans>Allow LP token migration</Trans>
                                        </span>
                                    )}
                                </ButtonConfirmed>
                            </AutoColumn>
                        ) : null}
                        <AutoColumn gap="12px" style={{ flex: "1" }}>
                            <ButtonConfirmed
                                disabled={
                                    !v3Amount0Min || !v3Amount1Min || invalidRange || (approval !== ApprovalState.APPROVED && signatureData === null) || confirmingMigration || isMigrationPending
                                }
                                //@ts-ignore
                                as={isSuccessfullyMigrated ? Link : null}
                                to={`/pool`}
                                //@ts-ignore
                                onClick={isSuccessfullyMigrated ? null : migrate}
                            >
                                {isSuccessfullyMigrated ? (
                                    t`Success! View pools`
                                ) : isMigrationPending ? (
                                    <Dots>
                                        <Trans>Migrating</Trans>
                                    </Dots>
                                ) : networkFailed ? (
                                    <span>
                                        <Trans>Connecting to network...</Trans>
                                    </span>
                                ) : (
                                    <span>
                                        <Trans>Migrate</Trans>
                                    </span>
                                )}
                            </ButtonConfirmed>
                        </AutoColumn>
                    </AutoColumn>
                </AutoColumn>
            </Card>
        </AutoColumn>
    );
}
