import React, { useCallback, useState } from 'react';
import { WrappedCurrency } from 'models/types';
import { Currency } from '@uniswap/sdk-core';
import CurrencyLogo from 'components/CurrencyLogo';
import CurrencySearchModal from 'components/CurrencySearchModal';
import { Box } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { ReactComponent as ArrowDownIcon } from 'assets/images/arrowDown.svg';

interface ITokenCard {
  handleTokenSelection: (currency: Currency) => void;
  currency: Currency | undefined;
  otherCurrency: Currency | undefined;
  hideIcon?: boolean;
}

export function TokenCard({
  handleTokenSelection,
  currency,
  otherCurrency,
  hideIcon,
}: ITokenCard) {
  const [selectModal, toggleSelectModal] = useState(false);

  const { t } = useTranslation();

  const handleDismissSearch = useCallback(() => {
    toggleSelectModal(false);
  }, [toggleSelectModal]);

  return (
    <Box>
      <Box
        className={`currencyButton  ${
          hideIcon
            ? 'token-select-background-small-v3'
            : 'token-select-background-v3'
        }  ${currency ? 'currencySelected' : 'noCurrency'}`}
        onClick={() => toggleSelectModal(true)}
      >
        {currency ? (
          <Box className='flex w-100 justify-between items-center'>
            <Box className='flex'>
              <CurrencyLogo
                size={'25px'}
                currency={currency as WrappedCurrency}
              ></CurrencyLogo>
              <p>{currency?.symbol}</p>
            </Box>
            <Box hidden={hideIcon}>
              <ArrowDownIcon />
            </Box>
          </Box>
        ) : (
          <p>{t('selectToken')}</p>
        )}
      </Box>
      {selectModal && (
        <CurrencySearchModal
          isOpen={selectModal}
          onDismiss={handleDismissSearch}
          onCurrencySelect={handleTokenSelection}
          selectedCurrency={currency}
          otherSelectedCurrency={otherCurrency}
          showCommonBases={true}
        ></CurrencySearchModal>
      )}
    </Box>
  );
}
