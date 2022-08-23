import React, { useMemo } from 'react';
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { Box } from '@material-ui/core';
import { NumericalInput } from 'components';
import { useActiveWeb3React } from 'hooks';
import 'components/styles/CurrencyInput.scss';
import { useTranslation } from 'react-i18next';
import { TokenCard } from 'components/v3/NewAddLiquidity/components/TokenCard';
import { useCurrencyBalance } from 'state/wallet/hooks';
import useUSDCPrice from 'hooks/v3/useUSDCPrice';
import Loader from 'components/Loader';
import { PriceFormats } from 'components/v3/NewAddLiquidity/components/PriceFomatToggler';

interface CurrencyInputProps {
  handleCurrencySelect: (currency: Currency) => void;
  currency: Currency | undefined;
  otherCurrency?: Currency | undefined;
  amount: string;
  fiatValue: CurrencyAmount<Token> | null;
  setAmount: (value: string) => void;
  onMax?: () => void;
  onHalf?: () => void;
  showHalfButton?: boolean;
  showMaxButton?: boolean;
  showPrice?: boolean;
  priceFormat: PriceFormats;
  isBase: boolean;
  bgClass?: string;
  id?: string;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  handleCurrencySelect,
  currency,
  otherCurrency,
  amount,
  fiatValue,
  setAmount,
  onMax,
  onHalf,
  showMaxButton,
  showHalfButton,
  showPrice,
  priceFormat,
  isBase,
  bgClass,
  id,
}) => {
  const { t } = useTranslation();

  const { account } = useActiveWeb3React();

  const balance = useCurrencyBalance(
    account ?? undefined,
    currency ?? undefined,
  );
  const balanceUSD = useUSDCPrice(currency ?? undefined);

  const isUSD = useMemo(() => {
    return priceFormat === PriceFormats.USD;
  }, [priceFormat]);

  const balanceString = useMemo(() => {
    if (!balance || !currency) return <Loader stroke={'white'} />;

    const _balance =
      isUSD && balanceUSD
        ? String(
            parseFloat(
              String(
                (
                  +balance.toSignificant(5) * +balanceUSD.toSignificant(5)
                ).toFixed(5),
              ),
            ),
          )
        : String(
            parseFloat(String(Number(balance.toSignificant(5)).toFixed(5))),
          );

    if (_balance.split('.')[0].length > 10) {
      return `${isUSD ? '$ ' : ''}${_balance.slice(0, 7)}...${
        isUSD ? '' : ` ${currency.symbol}`
      }`;
    }

    if (+balance.toFixed() === 0) {
      return `${isUSD ? '$ ' : ''}0${isUSD ? '' : ` ${currency.symbol}`}`;
    }
    if (+balance.toFixed() < 0.0001) {
      return `< ${isUSD ? '$ ' : ''}0.0001${
        isUSD ? '' : ` ${currency.symbol}`
      }`;
    }

    return `${isUSD ? '$ ' : ''}${_balance}${
      isUSD ? '' : ` ${currency.symbol}`
    }`;
  }, [balance, isUSD, fiatValue, currency]);

  return (
    <Box
      id={id}
      className={`swapBox${showPrice ? ' priceShowBox' : ''} ${bgClass ??
        'bg-secondary2'}`}
    >
      <Box mb={2}>
        <TokenCard
          currency={currency ?? undefined}
          otherCurrency={otherCurrency ?? undefined}
          handleTokenSelection={handleCurrencySelect}
          hideIcon={true}
        />
        <Box className='inputWrapper'>
          <NumericalInput
            value={amount}
            align='right'
            placeholder='0.00'
            onUserInput={(val) => {
              setAmount(val);
            }}
          />
        </Box>
      </Box>
      <Box className='flex justify-between'>
        <Box display='flex'>
          <small className='text-secondary'>
            {t('balance')}: {balance?.toSignificant(5)}
          </small>

          {account && currency && showHalfButton && (
            <Box className='maxWrapper' onClick={onHalf}>
              <small>50%</small>
            </Box>
          )}
          {account && currency && showMaxButton && (
            <Box className='maxWrapper' marginLeft='20px' onClick={onMax}>
              <small>{t('max')}</small>
            </Box>
          )}
        </Box>

        <small className='text-secondary'>${balanceString}</small>
      </Box>
    </Box>
  );
};

export default CurrencyInput;
