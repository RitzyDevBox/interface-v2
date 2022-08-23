import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IPresetArgs, PresetRanges } from '../../components/PresetRanges';
import { RangeSelector } from '../../components/RangeSelector';
import { Currency } from '@uniswap/sdk-core';
import './index.scss';
import {
  Bound,
  updateCurrentStep,
  updateSelectedPreset,
} from 'state/mint/v3/actions';
import {
  IDerivedMintInfo,
  useRangeHopCallbacks,
  useV3MintActionHandlers,
  useV3MintState,
} from 'state/mint/v3/hooks';
import { USDPrices } from '../../components/USDPrices';
import useUSDCPrice, { useUSDCValue } from 'hooks/v3/useUSDCPrice';
import { useAppDispatch } from 'state/hooks';
import { useActivePreset } from 'state/mint/v3/hooks';
import { tryParseAmount } from 'state/swap/v3/hooks';
import { Presets } from 'state/mint/v3/reducer';
import { StepTitle } from '../../components/StepTitle';
import { PriceFormats } from '../../components/PriceFomatToggler';
import { useHistory } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import LiquidityChartRangeInput from 'components/AddLiquidityV3/components/LiquidityChartRangeInput';
import { GlobalValue } from 'constants/index';
import { toToken } from 'constants/v3/routing';
import { Box } from '@material-ui/core';
import { fetchPoolsAPR } from 'utils/aprApi';
import { PoolState } from 'hooks/usePools';
import Loader from 'components/Loader';
import { computePoolAddress } from 'hooks/v3/computePoolAddress';
import { POOL_DEPLOYER_ADDRESS } from 'constants/v3/addresses';

interface IRangeSelector {
  currencyA: Currency | null | undefined;
  currencyB: Currency | null | undefined;
  mintInfo: IDerivedMintInfo;
  isCompleted: boolean;
  additionalStep: boolean;
  priceFormat: PriceFormats;
  disabled: boolean;
  backStep: number;
}

export function SelectRange({
  currencyA,
  currencyB,
  mintInfo,
  isCompleted,
  additionalStep,
  priceFormat,
  backStep,
  disabled,
}: IRangeSelector) {
  const { startPriceTypedValue } = useV3MintState();
  const history = useHistory();

  const dispatch = useAppDispatch();
  const activePreset = useActivePreset();

  const currencyAUSDC = useUSDCPrice(currencyA ?? undefined);
  const currencyBUSDC = useUSDCPrice(currencyB ?? undefined);

  //TODO - create one main isUSD
  const isUSD = useMemo(() => {
    return priceFormat === PriceFormats.USD;
  }, []);

  const isStablecoinPair = useMemo(() => {
    if (!currencyA || !currencyB) return false;

    const MAI = toToken(GlobalValue.tokens.COMMON.MI);
    const USDC = toToken(GlobalValue.tokens.COMMON.USDC);
    const USDT = toToken(GlobalValue.tokens.COMMON.USDT);
    const stablecoins = [USDC.address, USDT.address, MAI.address];

    return (
      stablecoins.includes(currencyA.wrapped.address) &&
      stablecoins.includes(currencyB.wrapped.address)
    );
  }, [currencyA, currencyB]);

  // get value and prices at ticks
  const { [Bound.LOWER]: tickLower, [Bound.UPPER]: tickUpper } = useMemo(() => {
    return mintInfo.ticks;
  }, [mintInfo]);

  const {
    [Bound.LOWER]: priceLower,
    [Bound.UPPER]: priceUpper,
  } = useMemo(() => {
    return mintInfo.pricesAtTicks;
  }, [mintInfo]);

  const {
    getDecrementLower,
    getIncrementLower,
    getDecrementUpper,
    getIncrementUpper,
    getSetFullRange,
  } = useRangeHopCallbacks(
    currencyA ?? undefined,
    currencyB ?? undefined,
    mintInfo.dynamicFee,
    tickLower,
    tickUpper,
    mintInfo.pool,
  );

  const { onLeftRangeInput, onRightRangeInput } = useV3MintActionHandlers(
    mintInfo.noLiquidity,
  );

  const tokenA = (currencyA ?? undefined)?.wrapped;
  const tokenB = (currencyB ?? undefined)?.wrapped;

  const isSorted = useMemo(() => {
    return tokenA && tokenB && tokenA.sortsBefore(tokenB);
  }, [tokenA, tokenB, mintInfo]);

  const leftPrice = useMemo(() => {
    return isSorted ? priceLower : priceUpper?.invert();
  }, [isSorted, priceLower, priceUpper, mintInfo]);

  const rightPrice = useMemo(() => {
    return isSorted ? priceUpper : priceLower?.invert();
  }, [isSorted, priceUpper, priceLower, mintInfo]);

  const price = useMemo(() => {
    if (!mintInfo.price) return;

    return mintInfo.invertPrice
      ? mintInfo.price.invert().toSignificant(5)
      : mintInfo.price.toSignificant(5);
  }, [mintInfo]);

  const currentPriceInUSD = useUSDCValue(
    tryParseAmount(Number(price).toFixed(5), currencyB ?? undefined),
    true,
  );

  const isBeforePrice = useMemo(() => {
    if (!price || !leftPrice || !rightPrice) return false;

    return mintInfo.outOfRange && price > rightPrice.toSignificant(5);
  }, [price, leftPrice, rightPrice, mintInfo]);

  const isAfterPrice = useMemo(() => {
    if (!price || !leftPrice || !rightPrice) return false;

    return mintInfo.outOfRange && price < leftPrice.toSignificant(5);
  }, [price, leftPrice, rightPrice, mintInfo]);

  const handlePresetRangeSelection = useCallback(
    (preset: IPresetArgs | null) => {
      console.log('handleing present range selection ', { preset, price });
      if (!price) return;

      dispatch(updateSelectedPreset({ preset: preset ? preset.type : null }));

      if (preset && preset.type === Presets.FULL) {
        getSetFullRange();
      } else {
        onLeftRangeInput(preset ? String(+price * preset.min) : '');
        onRightRangeInput(preset ? String(+price * preset.max) : '');
      }
    },
    [price],
  );

  const [aprs, setAprs] = useState<undefined | { [key: string]: number }>();

  useEffect(() => {
    fetchPoolsAPR().then(setAprs);
  }, []);

  const feeString = useMemo(() => {
    if (
      mintInfo.poolState === PoolState.INVALID ||
      mintInfo.poolState === PoolState.LOADING
    )
      return '';

    if (mintInfo.noLiquidity) return `0.01% fee`;

    return `${(mintInfo.dynamicFee / 10000).toFixed(3)}% fee`;
  }, [mintInfo]);

  const aprString = useMemo(() => {
    if (!aprs || !currencyA || !currencyB) return '';

    const poolAddress = computePoolAddress({
      poolDeployer: POOL_DEPLOYER_ADDRESS[137],
      tokenA: currencyA.wrapped,
      tokenB: currencyB.wrapped,
    }).toLowerCase();

    return aprs[poolAddress]
      ? `${aprs[poolAddress].toFixed(2)}% APR`
      : undefined;
  }, [currencyA, currencyB, aprs]);

  return (
    <Box>
      <PresetRanges
        isInvalid={mintInfo.invalidRange}
        outOfRange={mintInfo.outOfRange}
        isStablecoinPair={isStablecoinPair}
        activePreset={activePreset}
        handlePresetRangeSelection={handlePresetRangeSelection}
        priceLower={leftPrice?.toSignificant(5)}
        priceUpper={rightPrice?.toSignificant(5)}
        price={price}
        fee={feeString}
        apr={aprString}
      />

      <Box>
        {currencyA && currencyB && (
          <USDPrices
            currencyA={currencyA}
            currencyB={currencyB}
            currencyAUSDC={currencyAUSDC}
            currencyBUSDC={currencyBUSDC}
            priceFormat={priceFormat}
          />
        )}
      </Box>

      <RangeSelector
        priceLower={priceLower}
        priceUpper={priceUpper}
        getDecrementLower={getDecrementLower}
        getIncrementLower={getIncrementLower}
        getDecrementUpper={getDecrementUpper}
        getIncrementUpper={getIncrementUpper}
        onLeftRangeInput={onLeftRangeInput}
        onRightRangeInput={onRightRangeInput}
        currencyA={currencyA}
        currencyB={currencyB}
        mintInfo={mintInfo}
        initial={!!mintInfo.noLiquidity}
        disabled={!startPriceTypedValue && !mintInfo.price}
        isBeforePrice={isBeforePrice}
        isAfterPrice={isAfterPrice}
        priceFormat={priceFormat}
      />

      {!currencyA || !currencyB ? (
        <div>...</div>
      ) : (
        <LiquidityChartRangeInput
          currencyA={currencyA ?? undefined}
          currencyB={currencyB ?? undefined}
          feeAmount={mintInfo.dynamicFee}
          ticksAtLimit={mintInfo.ticksAtLimit}
          price={
            priceFormat === PriceFormats.USD
              ? currentPriceInUSD
                ? parseFloat(currentPriceInUSD.toSignificant(5))
                : undefined
              : price
              ? parseFloat(price)
              : undefined
          }
          priceLower={priceLower}
          priceUpper={priceUpper}
          onLeftRangeInput={onLeftRangeInput}
          onRightRangeInput={onRightRangeInput}
          interactive={false}
          priceFormat={priceFormat}
        />
      )}

      {mintInfo.outOfRange && (
        <div className='range__notification out-of-range'>
          <div>Out of range</div>
        </div>
      )}
      {mintInfo.invalidRange && (
        <div className='range__notification error w-100'>
          <div>Invalid range</div>
        </div>
      )}
    </Box>
  );
}
