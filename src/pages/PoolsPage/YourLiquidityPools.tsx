import React, { useCallback, useMemo, useState } from 'react';
import { Pair } from '@uniswap/sdk';
import { Box } from '@material-ui/core';
import Skeleton from '@material-ui/lab/Skeleton';
import NoLiquidity from 'assets/images/NoLiquidityPool.png';
import { PoolFinderModal, PoolPositionCard } from 'components';
import { useActiveWeb3React } from 'hooks';
import { usePairs } from 'data/Reserves';
import { toV2LiquidityToken, useTrackedTokenPairs } from 'state/user/hooks';
import { useTokenBalancesWithLoadingIndicator } from 'state/wallet/hooks';
import { Trans, useTranslation } from 'react-i18next';
import VersionToggle from 'components/Toggle/VersionToggle';
import { useHistory } from 'react-router-dom';
import useParsedQueryString from 'hooks/useParsedQueryString';

const YourLiquidityPools: React.FC = () => {
  const { t } = useTranslation();
  const { account } = useActiveWeb3React();
  const [openPoolFinder, setOpenPoolFinder] = useState(false);
  const trackedTokenPairs = useTrackedTokenPairs();
  const tokenPairsWithLiquidityTokens = useMemo(
    () =>
      trackedTokenPairs.map((tokens) => ({
        liquidityToken: toV2LiquidityToken(tokens),
        tokens,
      })),
    [trackedTokenPairs],
  );
  const liquidityTokens = useMemo(
    () => tokenPairsWithLiquidityTokens.map((tpwlt) => tpwlt.liquidityToken),
    [tokenPairsWithLiquidityTokens],
  );
  const [
    v2PairsBalances,
    fetchingV2PairBalances,
  ] = useTokenBalancesWithLoadingIndicator(
    account ?? undefined,
    liquidityTokens,
  );

  // fetch the reserves for all V2 pools in which the user has a balance
  const liquidityTokensWithBalances = useMemo(
    () =>
      tokenPairsWithLiquidityTokens.filter(({ liquidityToken }) =>
        v2PairsBalances[liquidityToken.address]?.greaterThan('0'),
      ),
    [tokenPairsWithLiquidityTokens, v2PairsBalances],
  );

  const v2Pairs = usePairs(
    liquidityTokensWithBalances.map(({ tokens }) => tokens),
  );
  const v2IsLoading =
    fetchingV2PairBalances ||
    v2Pairs?.length < liquidityTokensWithBalances.length ||
    v2Pairs?.some((V2Pair) => !V2Pair);

  const allV2PairsWithLiquidity = v2Pairs
    .map(([, pair]) => pair)
    .filter((v2Pair): v2Pair is Pair => Boolean(v2Pair));

  const parsedQuery = useParsedQueryString();
  const poolVersion =
    parsedQuery && parsedQuery.version ? (parsedQuery.version as string) : 'v3';

  const history = useHistory();
  const handleToggleAction = useCallback(
    (isV3: boolean) => {
      const url = isV3 ? '/v3Pools?version=v3' : '/pools?version=v2';
      history.push(url);
    },
    [history],
  );

  return (
    <>
      {openPoolFinder && (
        <PoolFinderModal
          open={openPoolFinder}
          onClose={() => setOpenPoolFinder(false)}
        />
      )}
      <Box className='pageHeading'>
        <p className='weight-600'>{t('yourliquidityPools')}</p>
        <VersionToggle
          isV3={poolVersion === 'v3'}
          onToggleV3={handleToggleAction}
        />
      </Box>

      <Box mt={3}>
        {v2IsLoading ? (
          <Box width={1}>
            <Skeleton width='100%' height={50} />
          </Box>
        ) : allV2PairsWithLiquidity.length > 0 ? (
          <Box>
            <small className='liquidityText'>
              <Trans
                i18nKey='poolMissingComment'
                components={{
                  pspan: <small onClick={() => setOpenPoolFinder(true)} />,
                }}
              />
            </small>
            {allV2PairsWithLiquidity.map((pair, ind) => (
              <Box key={ind} mt={2}>
                <PoolPositionCard
                  key={pair.liquidityToken.address}
                  pair={pair}
                />
              </Box>
            ))}
          </Box>
        ) : (
          <Box textAlign='center'>
            <img
              src={NoLiquidity}
              alt='No Liquidity'
              className='noLiquidityImage'
            />
            <p className='small liquidityText'>
              <Trans
                i18nKey='poolMissingComment'
                components={{
                  pspan: <small onClick={() => setOpenPoolFinder(true)} />,
                }}
              />
            </p>
          </Box>
        )}
      </Box>
    </>
  );
};

export default YourLiquidityPools;
