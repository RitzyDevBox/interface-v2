import React, { useMemo } from 'react';
import { Currency, CurrencyAmount } from '@uniswap/sdk-core';
import './index.scss';
import { Field } from 'state/mint/actions';
import {
  IDerivedMintInfo,
  useRangeHopCallbacks,
  useV3MintActionHandlers,
  useV3MintState,
} from 'state/mint/v3/hooks';
import { ApprovalState, useApproveCallback } from 'hooks/useV3ApproveCallback';
import { useActiveWeb3React } from 'hooks';
import { Bound, updateCurrentStep } from 'state/mint/v3/actions';
import { useHistory } from 'react-router-dom';
import { useAppDispatch } from 'state/hooks';
import { useUSDCValue } from 'hooks/v3/useUSDCPrice';
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESSES } from 'constants/v3/addresses';
import { maxAmountSpend } from 'utils/v3/maxAmountSpend';
import { tryParseAmount } from 'state/swap/v3/hooks';
import { PriceFormats } from '../../components/PriceFomatToggler';
import { Box } from '@material-ui/core';
import CurrencyInputV3 from 'components/CurrencyInputV3';
import { useTranslation } from 'react-i18next';

interface IEnterAmounts {
  currencyA: Currency | undefined;
  currencyB: Currency | undefined;
  mintInfo: IDerivedMintInfo;
  isCompleted?: boolean;
  additionalStep?: boolean;
  priceFormat: PriceFormats;
  backStep?: number;
}

export function EnterAmounts({
  currencyA,
  currencyB,
  mintInfo,
  isCompleted,
  additionalStep,
  priceFormat,
  backStep,
}: IEnterAmounts) {
  const { chainId } = useActiveWeb3React();

  const { independentField, typedValue } = useV3MintState();

  const {
    onFieldAInput,
    onFieldBInput,
    onLeftRangeInput,
    onRightRangeInput,
  } = useV3MintActionHandlers(mintInfo.noLiquidity);

  // get value and prices at ticks
  const { [Bound.LOWER]: tickLower, [Bound.UPPER]: tickUpper } = useMemo(() => {
    return mintInfo.ticks;
  }, [mintInfo]);

  const {
    getDecrementLower,
    getIncrementLower,
    getDecrementUpper,
    getIncrementUpper,
  } = useRangeHopCallbacks(
    currencyA ?? undefined,
    currencyB ?? undefined,
    mintInfo.dynamicFee,
    tickLower,
    tickUpper,
    mintInfo.pool,
  );

  const { t } = useTranslation();
  // get formatted amounts
  const formattedAmounts = {
    [independentField]: typedValue,
    [mintInfo.dependentField]:
      mintInfo?.parsedAmounts?.[mintInfo?.dependentField]?.toSignificant(6) ??
      '',
  };

  const usdcValues = {
    [Field.CURRENCY_A]: useUSDCValue(
      mintInfo.parsedAmounts[Field.CURRENCY_A],
      true,
    ),
    [Field.CURRENCY_B]: useUSDCValue(
      mintInfo.parsedAmounts[Field.CURRENCY_B],
      true,
    ),
  };

  // get the max amounts user can add
  const maxAmounts: { [field in Field]?: CurrencyAmount<Currency> } = [
    Field.CURRENCY_A,
    Field.CURRENCY_B,
  ].reduce((accumulator, field) => {
    return {
      ...accumulator,
      [field]: maxAmountSpend(mintInfo.currencyBalances[field]),
    };
  }, {});

  const atMaxAmounts: { [field in Field]?: CurrencyAmount<Currency> } = [
    Field.CURRENCY_A,
    Field.CURRENCY_B,
  ].reduce((accumulator, field) => {
    return {
      ...accumulator,
      [field]: maxAmounts[field]?.equalTo(mintInfo.parsedAmounts[field] ?? '0'),
    };
  }, {});

  // check whether the user has approved the router on the tokens
  const [approvalA, approveACallback] = useApproveCallback(
    mintInfo.parsedAmounts[Field.CURRENCY_A] ||
      tryParseAmount('1000000000000000000000', currencyA),
    chainId ? NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId] : undefined,
  );
  const [approvalB, approveBCallback] = useApproveCallback(
    mintInfo.parsedAmounts[Field.CURRENCY_B] ||
      tryParseAmount('1000000000000000000000', currencyB),
    chainId ? NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId] : undefined,
  );

  const showApprovalA = useMemo(() => {
    if (approvalA === ApprovalState.UNKNOWN) return undefined;

    if (approvalA === ApprovalState.NOT_APPROVED) return true;

    return approvalA !== ApprovalState.APPROVED;
  }, [approvalA]);

  const showApprovalB = useMemo(() => {
    if (approvalB === ApprovalState.UNKNOWN) return undefined;

    if (approvalB === ApprovalState.NOT_APPROVED) return true;

    return approvalB !== ApprovalState.APPROVED;
  }, [approvalB]);

  const [token0Ratio, token1Ratio] = useMemo(() => {
    const currentPrice = mintInfo.price?.toSignificant(5);

    const left = mintInfo?.lowerPrice?.toSignificant(5);
    const right = mintInfo?.upperPrice?.toSignificant(5);

    //TODO
    if (
      right === '338490000000000000000000000000000000000000000000000' ||
      right === '338490000000000000000000000000000000000'
    )
      return ['50', '50'];

    if (!currentPrice) return ['0', '0'];

    if (!left && !right) return ['0', '0'];

    if (!left && right) return ['0', '100'];

    if (!right && left) return ['100', '0'];

    if (mintInfo.depositADisabled) {
      return ['0', '100'];
    }

    if (mintInfo.depositBDisabled) {
      return ['100', '0'];
    }

    if (left && right && currentPrice) {
      const leftRange = +currentPrice - +left;
      const rightRange = +right - +currentPrice;

      const totalSum = +leftRange + +rightRange;

      const leftRate = (+leftRange * 100) / totalSum;
      const rightRate = (+rightRange * 100) / totalSum;

      if (mintInfo.invertPrice) {
        return [String(leftRate), String(rightRate)];
      } else {
        return [String(rightRate), String(leftRate)];
      }
    }

    return ['0', '0'];
  }, [currencyA, currencyB, mintInfo]);

  const currencyAError = useMemo(() => {
    if (
      (mintInfo.errorCode !== 4 && mintInfo.errorCode !== 5) ||
      !mintInfo.errorMessage ||
      !currencyA
    )
      return;

    const erroredToken = mintInfo.errorMessage.split(' ')[1];

    if (currencyA.wrapped.symbol === erroredToken) return mintInfo.errorMessage;

    return;
  }, [mintInfo, currencyA]);

  const currencyBError = useMemo(() => {
    if (
      (mintInfo.errorCode !== 5 && mintInfo.errorCode !== 4) ||
      !mintInfo.errorMessage ||
      !currencyB
    )
      return;

    const erroredToken = mintInfo.errorMessage.split(' ')[1];

    if (currencyB.wrapped.symbol === erroredToken) return mintInfo.errorMessage;

    return;
  }, [mintInfo, currencyB]);

  const history = useHistory();
  const dispatch = useAppDispatch();

  // useEffect(() => {
  //   return () => {
  //     if (history.action === 'POP') {
  //       dispatch(updateCurrentStep({ currentStep: backStep }));
  //     }
  //   };
  // });

  // const leftPrice = useMemo(() => {
  //   return mintInfo.invertPrice
  //     ? mintInfo.upperPrice?.invert()
  //     : mintInfo.lowerPrice;
  // }, [mintInfo]);

  // const rightPrice = useMemo(() => {
  //   return mintInfo.invertPrice
  //     ? mintInfo.lowerPrice?.invert()
  //     : mintInfo.upperPrice;
  // }, [mintInfo]);

  return (
    <Box className='flex flex-col mt-2'>
      <Box mb={2}>
        <CurrencyInputV3
          id='add-liquidity-input-tokena'
          currency={mintInfo?.currencies?.[Field.CURRENCY_A]}
          showHalfButton={Boolean(maxAmounts?.[Field.CURRENCY_A])}
          showMaxButton={!atMaxAmounts?.[Field.CURRENCY_A]}
          onMax={() =>
            onFieldAInput(maxAmounts?.[Field.CURRENCY_A]?.toExact() ?? '')
          }
          onHalf={() =>
            onFieldAInput(
              maxAmounts?.[Field.CURRENCY_A]
                ? (
                    Number(maxAmounts?.[Field.CURRENCY_A]?.toExact()) / 2
                  ).toString()
                : '',
            )
          }
          handleCurrencySelect={(currency: any) => {
            console.log('selected ', currency);
          }}
          amount={formattedAmounts?.[Field.CURRENCY_A]}
          fiatValue={usdcValues[Field.CURRENCY_A]}
          setAmount={onFieldAInput}
          priceFormat={priceFormat}
          isBase={false}
        />
      </Box>

      <Box>
        <CurrencyInputV3
          id='add-liquidity-input-tokenb'
          showHalfButton={Boolean(maxAmounts[Field.CURRENCY_B])}
          currency={mintInfo?.currencies?.[Field.CURRENCY_B]}
          showMaxButton={!atMaxAmounts[Field.CURRENCY_B]}
          onHalf={() =>
            onFieldBInput(
              maxAmounts[Field.CURRENCY_B]
                ? (
                    Number(maxAmounts[Field.CURRENCY_B]?.toExact()) / 2
                  ).toString()
                : '',
            )
          }
          onMax={() =>
            onFieldBInput(maxAmounts[Field.CURRENCY_B]?.toExact() ?? '')
          }
          handleCurrencySelect={(currency: any) => {
            console.log('selected', currency);
          }}
          amount={formattedAmounts[Field.CURRENCY_B]}
          fiatValue={usdcValues[Field.CURRENCY_B]}
          setAmount={onFieldBInput}
          priceFormat={priceFormat}
          isBase={true}
        />
      </Box>
    </Box>
  );
}
