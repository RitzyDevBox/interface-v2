import React, { useCallback, useEffect, useState } from 'react';
import { Box } from '@material-ui/core';
import { ReactComponent as SettingsIcon } from 'assets/images/SettingsIcon.svg';
import { AddLiquidity, QuestionHelper, SettingsModal } from 'components';
import useParsedQueryString from 'hooks/useParsedQueryString';
import { useCurrency } from 'hooks/Tokens';
import { useTranslation } from 'react-i18next';
import AddLiquidityV3 from 'components/AddLiquidityV3';

const SupplyLiquidity: React.FC<{ isV3: boolean }> = ({ isV3 }) => {
  const { t } = useTranslation();
  const [openSettingsModal, setOpenSettingsModal] = useState(false);
  const parsedQuery = useParsedQueryString();
  const qCurrency0 = useCurrency(
    parsedQuery && parsedQuery.currency0
      ? (parsedQuery.currency0 as string)
      : undefined,
  );
  const qCurrency1 = useCurrency(
    parsedQuery && parsedQuery.currency1
      ? (parsedQuery.currency1 as string)
      : undefined,
  );

  const handleSettingsModalOpen = useCallback(
    (flag: boolean) => {
      setOpenSettingsModal(flag);
    },
    [openSettingsModal, setOpenSettingsModal],
  );

  return (
    <>
      {openSettingsModal && (
        <SettingsModal
          open={openSettingsModal}
          onClose={() => setOpenSettingsModal(false)}
        />
      )}
      {!isV3 && (
        <>
          {' '}
          <Box className='flex justify-between items-center'>
            <p className='weight-600'>{t('supplyLiquidity')}</p>
            <Box className='flex items-center'>
              <Box className='headingItem'>
                <QuestionHelper
                  size={24}
                  className='text-secondary'
                  text={t('supplyLiquidityHelp')}
                />
              </Box>
              <Box className='headingItem'>
                <SettingsIcon onClick={() => setOpenSettingsModal(true)} />
              </Box>
            </Box>
          </Box>
          <Box mt={2.5}>
            <AddLiquidity
              currency0={qCurrency0 ?? undefined}
              currency1={qCurrency1 ?? undefined}
            />
          </Box>
        </>
      )}
      {isV3 && (
        <AddLiquidityV3
          // currencyId0={''}
          // currencyId1={''}
          // tokenId={''}
          handleSettingsOpen={handleSettingsModalOpen}
        />
      )}
    </>
  );
};

export default SupplyLiquidity;
