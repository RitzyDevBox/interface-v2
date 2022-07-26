import { Currency } from '@uniswap/sdk-core';
import JSBI from 'jsbi';
import { PoolState, usePool } from './usePools';
import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import ms from 'ms.macro';
import { AllV3TicksQuery } from 'state/v3Data/generated';
import { FeeAmount } from 'lib/src/constants';
import { Pool } from 'v3lib/entities';
import { useAllV3TicksQuery } from 'state/v3Data/tickHooks';
import computeSurroundingTicks from 'v3lib/utils/computeSurroundingTicks';
import { tickToPrice } from 'v3lib/utils';

const PRICE_FIXED_DIGITS = 8;

// Tick with fields parsed to JSBIs, and active liquidity computed.
export interface TickProcessed {
  tickIdx: number;
  liquidityActive: JSBI;
  liquidityNet: JSBI;
  price0: string;
}

const getActiveTick = (
  tickCurrent: number | undefined,
  feeAmount: FeeAmount | undefined,
) => (tickCurrent && feeAmount ? Math.floor(tickCurrent / 60) * 60 : undefined);

// Fetches all ticks for a given pool
export function useAllV3Ticks(
  currencyA: Currency | undefined,
  currencyB: Currency | undefined,
  feeAmount: FeeAmount | undefined,
) {
  const poolAddress =
    currencyA && currencyB && feeAmount
      ? Pool.getAddress(currencyA?.wrapped, currencyB?.wrapped, feeAmount)
      : undefined;

  //TODO(judo): determine if pagination is necessary for this query
  const {
    isLoading,
    isError,
    error,
    isUninitialized,
    data,
  } = useAllV3TicksQuery(
    { poolAddress: poolAddress?.toLowerCase(), skip: 0 },
    {
      pollingInterval: ms`10m`,
    },
  );

  // const { isLoading, isError, error, isUninitialized, data } = {
  //   isLoading: false,
  //   isError: false,
  //   error: {},
  //   isUninitialized: false,
  //   data: { ticks: [] },
  // };

  return {
    isLoading,
    isUninitialized,
    isError,
    error,
    ticks: data?.ticks as AllV3TicksQuery['ticks'],
  };
}

// todo fix crash
export function usePoolActiveLiquidity(
  currencyA: Currency | undefined,
  currencyB: Currency | undefined,
  feeAmount: FeeAmount | undefined,
): {
  isLoading: boolean;
  isUninitialized: boolean;
  isError: boolean;
  error: any;
  activeTick: number | undefined;
  data: TickProcessed[] | undefined;
} {
  const pool = usePool(currencyA, currencyB);

  // Find nearest valid tick for pool in case tick is not initialized.
  const activeTick = useMemo(
    () => getActiveTick(pool[1]?.tickCurrent, feeAmount),
    [pool, feeAmount],
  );

  const { isLoading, isUninitialized, isError, error, ticks } = useAllV3Ticks(
    currencyA,
    currencyB,
    feeAmount,
  );
  // testing crash fix
  // const { isLoading, isUninitialized, isError, error, ticks } = {
  //   isLoading: false,
  //   isUninitialized: false,
  //   isError: false,
  //   error: {},
  //   ticks: [],
  // };
  //

  return useMemo(() => {
    if (
      !currencyA ||
      !currencyB ||
      activeTick === undefined ||
      pool[0] !== PoolState.EXISTS ||
      !ticks ||
      ticks.length === 0 ||
      isLoading ||
      isUninitialized
    ) {
      return {
        isLoading: isLoading || pool[0] === PoolState.LOADING,
        isUninitialized,
        isError,
        error,
        activeTick,
        data: undefined,
      };
    }

    const token0 = currencyA?.wrapped;
    const token1 = currencyB?.wrapped;

    // find where the active tick would be to partition the array
    // if the active tick is initialized, the pivot will be an element
    // if not, take the previous tick as pivot
    const pivot = ticks.findIndex(({ tickIdx }) => tickIdx > activeTick) - 1;

    if (pivot < 0) {
      // consider setting a local error
      console.error('TickData pivot not found');
      return {
        isLoading,
        isUninitialized,
        isError,
        error,
        activeTick,
        data: undefined,
      };
    }

    // todo: testing changes to fix crash, revert after fix
    // const activeTickProcessed: TickProcessed = {
    //   liquidityActive: JSBI.BigInt(pool[1]?.liquidity ?? 0),
    //   tickIdx: activeTick,
    //   liquidityNet: JSBI.BigInt(0),
    //   price0: tickToPrice(token0, token1, activeTick).toFixed(
    //     PRICE_FIXED_DIGITS,
    //   ),
    // };

    const activeTickProcessed: TickProcessed = {
      liquidityActive: JSBI.BigInt(pool[1]?.liquidity ?? 0),
      tickIdx: activeTick,
      liquidityNet:
        Number(ticks[pivot].tickIdx) === activeTick
          ? JSBI.BigInt(ticks[pivot].liquidityNet)
          : JSBI.BigInt(0),
      price0: tickToPrice(token0, token1, activeTick).toFixed(
        PRICE_FIXED_DIGITS,
      ),
    };

    const subsequentTicks = computeSurroundingTicks(
      token0,
      token1,
      activeTickProcessed,
      ticks,
      pivot,
      true,
    );

    const previousTicks = computeSurroundingTicks(
      token0,
      token1,
      activeTickProcessed,
      ticks,
      pivot,
      false,
    );

    const ticksProcessed = previousTicks
      .concat(activeTickProcessed)
      .concat(subsequentTicks);

    return {
      isLoading,
      isUninitialized,
      isError: isError,
      error,
      activeTick,
      data: ticksProcessed,
    };
  }, [
    currencyA,
    currencyB,
    activeTick,
    pool,
    ticks,
    isLoading,
    isUninitialized,
    isError,
    error,
  ]);
}
