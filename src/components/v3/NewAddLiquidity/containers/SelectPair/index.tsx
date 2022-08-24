import React, { useEffect, useMemo, useState } from 'react';
import { TokenCard } from '../../components/TokenCard';
import { Currency } from '@uniswap/sdk-core';
import './index.scss';
import { useInfoLiquidity } from 'hooks/subgraph/useInfoLiquidity';
import Loader from 'components/Loader';
import { IDerivedMintInfo } from 'state/mint/v3/hooks';
import { PoolState } from 'hooks/usePools';
import { PriceFormats } from '../..//components/PriceFomatToggler';
import { useHistory } from 'react-router-dom';
import { fetchPoolsAPR } from 'utils/aprApi';
import { computePoolAddress } from 'hooks/v3/computePoolAddress';
import { POOL_DEPLOYER_ADDRESS } from 'constants/v3/addresses';
import { ReactComponent as AddLiquidityIconV3 } from 'assets/images/AddLiquidityIconV3.svg';
import { Box } from '@material-ui/core';

interface ISelectPair {
  baseCurrency: Currency | null | undefined;
  quoteCurrency: Currency | null | undefined;
  mintInfo: IDerivedMintInfo;
  isCompleted: boolean;
  priceFormat: PriceFormats;
  handleCurrencySwap: () => void;
  handleCurrencyASelect: (newCurrency: Currency) => void;
  handleCurrencyBSelect: (newCurrency: Currency) => void;
  handlePopularPairSelection: (pair: [string, string]) => void;
}

export function SelectPair({
  baseCurrency,
  quoteCurrency,
  mintInfo,
  isCompleted,
  priceFormat,
  handleCurrencySwap,
  handleCurrencyASelect,
  handleCurrencyBSelect,
}: ISelectPair) {
  const history = useHistory();

  const [aprs, setAprs] = useState<undefined | { [key: string]: number }>();

  const {
    fetchPopularPools: {
      popularPools,
      popularPoolsLoading,
      fetchPopularPoolsFn,
    },
  } = useInfoLiquidity();

  useEffect(() => {
    fetchPoolsAPR().then(setAprs);
    fetchPopularPoolsFn();
  }, []);

  const feeString = useMemo(() => {
    if (
      mintInfo.poolState === PoolState.INVALID ||
      mintInfo.poolState === PoolState.LOADING
    )
      return <Loader stroke='#22cbdc' />;

    if (mintInfo.noLiquidity) return `0.01% fee`;

    return `${(mintInfo.dynamicFee / 10000).toFixed(3)}% fee`;
  }, [mintInfo]);

  const aprString = useMemo(() => {
    if (!aprs || !baseCurrency || !quoteCurrency)
      return <Loader stroke='#22dc22' />;

    const poolAddress = computePoolAddress({
      poolDeployer: POOL_DEPLOYER_ADDRESS[137],
      tokenA: baseCurrency.wrapped,
      tokenB: quoteCurrency.wrapped,
    }).toLowerCase();

    return aprs[poolAddress]
      ? `${aprs[poolAddress].toFixed(2)}% APR`
      : undefined;
  }, [baseCurrency, quoteCurrency, aprs]);

  useEffect(() => {
    return () => {
      if (history.action === 'POP') {
        history.push('/v3pools');
      }
    };
  }, []);

  return (
    <Box className='flex justify-between items-center' mt={2.5}>
      <TokenCard
        currency={baseCurrency ?? undefined}
        otherCurrency={quoteCurrency ?? undefined}
        handleTokenSelection={handleCurrencyASelect}
      ></TokenCard>

      <Box className='exchangeSwap'>
        <AddLiquidityIconV3 />
      </Box>

      <TokenCard
        currency={quoteCurrency ?? undefined}
        otherCurrency={baseCurrency ?? undefined}
        handleTokenSelection={handleCurrencyBSelect}
      ></TokenCard>
    </Box>
  );
}
