import React, { useCallback, useMemo, useState } from 'react';
import { useV3NFTPositionManagerContract } from 'hooks/useContract';
import useTransactionDeadline from 'hooks/useTransactionDeadline';
import { useActiveWeb3React } from 'hooks';
import { useUserSlippageTolerance } from 'state/user/hooks';
import { NonfungiblePositionManager as NonFunPosMan } from 'v3lib/nonfungiblePositionManager';
import { Percent, Currency } from '@uniswap/sdk-core';
import { useAppDispatch, useAppSelector } from 'state/hooks';
import { GAS_PRICE_MULTIPLIER } from 'hooks/useGasPrice';
import {
  useAllTransactions,
  useTransactionAdder,
} from 'state/transactions/hooks';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { IDerivedMintInfo, useAddLiquidityTxHash } from 'state/mint/v3/hooks';
import { ApprovalState, useApproveCallback } from 'hooks/useV3ApproveCallback';
import { Field } from 'state/mint/actions';
import { Bound, setAddLiquidityTxHash } from 'state/mint/v3/actions';
import { ZERO_PERCENT } from 'constants/v3/misc';
import { useIsNetworkFailedImmediate } from 'hooks/v3/useIsNetworkFailed';
import { JSBI } from '@uniswap/sdk';
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESSES } from 'constants/v3/addresses';
import {
  addMaticToMetamask,
  calculateGasMarginV3,
  formatTokenAmount,
  isSupportedNetwork,
} from 'utils';
import {
  StyledButton,
  StyledFilledBox,
  StyledLabel,
  StyledNumber,
} from 'components/v3/Common/styledElements';
import { useWalletModalToggle } from 'state/application/hooks';
import { Box } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import TransactionConfirmationModal, {
  ConfirmationModalContentV3,
  TransactionErrorContent,
} from 'components/TransactionConfirmationModal';
import DoubleCurrencyLogo from 'components/DoubleCurrencyLogo';
import CurrencyLogo from 'components/CurrencyLogo';
import { formatCurrencyAmount } from 'utils/v3/formatCurrencyAmount';
import {
  PriceFormats,
  PriceFormatToggler,
} from '../../components/PriceFomatToggler';

interface IAddLiquidityButton {
  baseCurrency: Currency | undefined;
  quoteCurrency: Currency | undefined;
  mintInfo: IDerivedMintInfo;
  handleAddLiquidity: () => void;
  title: string;
  setRejected?: (rejected: boolean) => void;
  priceFormat: PriceFormats;
  handlePriceFormat: (priceFormat: PriceFormats) => void;
}
const DEFAULT_ADD_IN_RANGE_SLIPPAGE_TOLERANCE = new Percent(50, 10_000);

export function AddLiquidityButton({
  baseCurrency,
  quoteCurrency,
  mintInfo,
  handleAddLiquidity,
  title,
  setRejected,
  priceFormat,
  handlePriceFormat,
}: IAddLiquidityButton) {
  const { chainId, library, account } = useActiveWeb3React();

  const positionManager = useV3NFTPositionManagerContract();

  const deadline = useTransactionDeadline();

  const dispatch = useAppDispatch();

  const [attemptingTxn, setAttemptingTxn] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [approvingA, setApprovingA] = useState(false);
  const [approvingB, setApprovingB] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const txHash = useAddLiquidityTxHash();
  const { t } = useTranslation();

  const isNetworkFailed = useIsNetworkFailedImmediate();

  const [allowedSlippage] = useUserSlippageTolerance();
  const allowedSlippagePercent: Percent = useMemo(() => {
    return new Percent(JSBI.BigInt(allowedSlippage), JSBI.BigInt(10000));
  }, [allowedSlippage]);

  const gasPrice = useAppSelector((state) => {
    if (!state.application.gasPrice.fetched) return 36;
    return state.application.gasPrice.override
      ? 36
      : state.application.gasPrice.fetched;
  });

  const addTransaction = useTransactionAdder();

  const [approvalA, approveACallback] = useApproveCallback(
    mintInfo.parsedAmounts[Field.CURRENCY_A],
    chainId ? NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId] : undefined,
  );
  const [approvalB, approveBCallback] = useApproveCallback(
    mintInfo.parsedAmounts[Field.CURRENCY_B],
    chainId ? NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId] : undefined,
  );

  const isReady = useMemo(() => {
    return Boolean(
      (mintInfo.depositADisabled
        ? true
        : approvalA === ApprovalState.APPROVED) &&
        (mintInfo.depositBDisabled
          ? true
          : approvalB === ApprovalState.APPROVED) &&
        !mintInfo.errorMessage &&
        !mintInfo.invalidRange &&
        !txHash &&
        !isNetworkFailed,
    );
  }, [mintInfo, approvalA, approvalB]);

  const {
    [Bound.LOWER]: priceLower,
    [Bound.UPPER]: priceUpper,
  } = useMemo(() => {
    return mintInfo.pricesAtTicks;
  }, [mintInfo]);

  const onAdd = () => {
    setShowConfirm(true);
  };

  async function onAddLiquidity() {
    if (!chainId || !library || !account) return;

    if (!positionManager || !baseCurrency || !quoteCurrency) {
      return;
    }

    if (mintInfo.position && account && deadline) {
      const useNative = baseCurrency.isNative
        ? baseCurrency
        : quoteCurrency.isNative
        ? quoteCurrency
        : undefined;

      const { calldata, value } = NonFunPosMan.addCallParameters(
        mintInfo.position,
        {
          slippageTolerance: allowedSlippagePercent,
          recipient: account,
          deadline: deadline.toString(),
          useNative,
          createPool: mintInfo.noLiquidity,
        },
      );

      const txn: { to: string; data: string; value: string } = {
        to: NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId],
        data: calldata,
        value,
      };

      setRejected && setRejected(false);

      library
        .getSigner()
        .estimateGas(txn)
        .then((estimate) => {
          const newTxn = {
            ...txn,
            gasLimit: calculateGasMarginV3(chainId, estimate),
            gasPrice: gasPrice * GAS_PRICE_MULTIPLIER,
          };

          return library
            .getSigner()
            .sendTransaction(newTxn)
            .then((response: TransactionResponse) => {
              addTransaction(response, {
                summary: mintInfo.noLiquidity
                  ? `Create pool and add ${baseCurrency?.symbol}/${quoteCurrency?.symbol} liquidity`
                  : `Add ${baseCurrency?.symbol}/${quoteCurrency?.symbol} liquidity`,
              });

              handleAddLiquidity();
              dispatch(setAddLiquidityTxHash({ txHash: response.hash }));
            });
        })
        .catch((error) => {
          console.error('Failed to send transaction', error);
          // we only care if the error is something _other_ than the user rejected the tx
          setRejected && setRejected(true);
          if (error?.code !== 4001) {
            console.error(error);
          }
        });
    } else {
      return;
    }
  }

  const { ethereum } = window as any;
  const toggleWalletModal = useWalletModalToggle();
  const connectWallet = () => {
    if (ethereum && !isSupportedNetwork(ethereum)) {
      addMaticToMetamask();
    } else {
      toggleWalletModal();
    }
  };

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false);
    // if there was a tx hash, we want to clear the input
    // if (txHash) {
    //   onFieldAInput('');
    // }
    // setTxHash('');
  }, []);

  const modalHeader = () => {
    return (
      <Box>
        <Box className='flex justify-between items-center' mt={2.5} mb={2.5}>
          <DoubleCurrencyLogo
            currency0={mintInfo?.currencies?.[Field.CURRENCY_A]}
            currency1={mintInfo?.currencies?.[Field.CURRENCY_B]}
            size={32}
          />
          <Box
            bgcolor={' rgba(15, 198, 121, 0.3)'}
            className='flex items-center'
            px={1.5}
            py={0.5}
            ml={1.5}
            borderRadius={8}
          >
            <Box
              height={10}
              width={10}
              borderRadius={'50%'}
              bgcolor='#0fc679'
              mr={1}
            ></Box>
            <StyledLabel fontSize='12px' color='#0fc679'>
              in range
            </StyledLabel>
          </Box>
        </Box>

        <StyledFilledBox
          className='flex flex-col items-center justify-evenly'
          alignSelf='center'
          justifySelf={'center'}
          height={100}
          mt={2}
        >
          <Box className='flex justify-between' width='90%'>
            <Box className='flex items-center'>
              <CurrencyLogo
                currency={mintInfo?.currencies?.CURRENCY_A}
                size={'28px'}
              />

              <StyledLabel fontSize='14px' style={{ marginLeft: 5 }}>
                {t(`${mintInfo?.currencies?.CURRENCY_A?.symbol}`)}
              </StyledLabel>
            </Box>

            <Box>
              {' '}
              <StyledNumber fontSize='16px'>
                {formatCurrencyAmount(
                  mintInfo?.parsedAmounts?.[Field.CURRENCY_A],
                  4,
                )}
              </StyledNumber>
            </Box>
          </Box>
          <Box className='flex justify-between' width='90%'>
            <Box className='flex items-center'>
              <CurrencyLogo
                currency={mintInfo?.currencies?.CURRENCY_B}
                size={'28px'}
              />
              <StyledLabel fontSize='14px' style={{ marginLeft: 5 }}>
                {t(`${mintInfo?.currencies?.CURRENCY_B?.symbol}`)}
              </StyledLabel>
            </Box>

            <Box>
              {' '}
              <StyledNumber fontSize='16px'>
                {formatCurrencyAmount(
                  mintInfo?.parsedAmounts?.[Field.CURRENCY_B],
                  4,
                )}
              </StyledNumber>
            </Box>
          </Box>
        </StyledFilledBox>

        <Box
          className='flex justify-between'
          alignSelf='center'
          justifySelf={'center'}
          mt={2.5}
        >
          <StyledLabel fontSize='14px'>{t('Selected range')}</StyledLabel>
          <PriceFormatToggler
            currentFormat={priceFormat}
            handlePriceFormat={handlePriceFormat}
          />
        </Box>

        <Box
          className='flex justify-between'
          alignSelf='center'
          justifySelf={'center'}
          mt={2.5}
        >
          <StyledFilledBox
            width='48%'
            className='flex flex-col justify-center items-center'
            padding={2}
            textAlign='center'
          >
            <StyledLabel color='#696c80'>Min price</StyledLabel>
            <StyledNumber fontSize='18px'>
              {priceLower?.toSignificant()}
            </StyledNumber>
            <StyledLabel color='#696c80' style={{ marginBottom: 10 }}>
              {t(`Your position will be ${'x%'}`)}
            </StyledLabel>
            <StyledLabel color='#696c80' className='mt-1'>
              {t(
                `Composed of ${mintInfo?.currencies?.CURRENCY_A?.symbol} at this price`,
              )}
            </StyledLabel>
          </StyledFilledBox>
          <StyledFilledBox
            width='48%'
            className='flex flex-col justify-center items-center'
            padding={2}
            textAlign='center'
          >
            <StyledLabel color='#696c80'>Max price</StyledLabel>
            <StyledNumber fontSize='18px'>
              {priceUpper?.toSignificant()}
            </StyledNumber>
            <StyledLabel color='#696c80' style={{ marginBottom: 10 }}>
              {t(`Your position will be ${'x%'}`)}
            </StyledLabel>
            <StyledLabel color='#696c80' className='mt-1'>
              {t(
                `Composed of ${mintInfo?.currencies?.CURRENCY_B?.symbol} at this price`,
              )}
            </StyledLabel>
          </StyledFilledBox>
        </Box>

        <Box justifySelf={'center'} alignSelf='center' mt={2.5} mb={2.5}>
          <StyledFilledBox
            className='flex flex-col justify-evenly items-center'
            height={120}
          >
            <StyledLabel color='#696c80'>{t(`Current price`)}</StyledLabel>
            <StyledNumber fontSize='18px'>
              {mintInfo?.price?.toSignificant()}
            </StyledNumber>
            <StyledLabel color='#696c80'>
              {t(
                `${mintInfo?.currencies?.CURRENCY_B?.symbol} per ${mintInfo?.currencies?.CURRENCY_A?.symbol}`,
              )}
            </StyledLabel>
          </StyledFilledBox>

          <Box mt={2.5}>
            <StyledButton onClick={onAddLiquidity}>{t('Confirm')}</StyledButton>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box className='flex-wrap' mt={2.5}>
      {showConfirm && (
        <TransactionConfirmationModal
          isOpen={showConfirm}
          onDismiss={handleDismissConfirmation}
          attemptingTxn={attemptingTxn}
          txPending={txPending}
          hash={txHash}
          modalWrapper='modalWrapper'
          content={() =>
            mintInfo?.errorMessage ? (
              <TransactionErrorContent
                onDismiss={handleDismissConfirmation}
                message={mintInfo?.errorMessage}
              />
            ) : (
              <ConfirmationModalContentV3
                title={t('Supply Liquidity')}
                onDismiss={handleDismissConfirmation}
                content={modalHeader}
              />
            )
          }
          pendingText={'pendingText'}
          modalContent={
            txPending ? t('submittedTxLiquidity') : t('successAddedliquidity')
          }
        />
      )}
      {(approvalA === ApprovalState.NOT_APPROVED ||
        approvalA === ApprovalState.PENDING ||
        approvalB === ApprovalState.NOT_APPROVED ||
        approvalB === ApprovalState.PENDING) &&
        !mintInfo?.errorMessage && (
          <Box className='flex fullWidth justify-between' mb={2}>
            {approvalA !== ApprovalState.APPROVED && (
              <Box
                width={approvalB !== ApprovalState.APPROVED ? '48%' : '100%'}
              >
                <StyledButton
                  onClick={async () => {
                    setApprovingA(true);
                    try {
                      await approveACallback();
                      setApprovingA(false);
                    } catch (e) {
                      setApprovingA(false);
                    }
                  }}
                  disabled={approvingA || approvalA === ApprovalState.PENDING}
                >
                  {approvalA === ApprovalState.PENDING
                    ? `${t('approving')} ${
                        mintInfo?.currencies?.[Field.CURRENCY_A]?.symbol
                      }`
                    : `${t('approve')} ${
                        mintInfo?.currencies?.[Field.CURRENCY_A]?.symbol
                      }`}
                </StyledButton>
              </Box>
            )}
            {approvalB !== ApprovalState.APPROVED && (
              <Box
                width={approvalA !== ApprovalState.APPROVED ? '48%' : '100%'}
              >
                <StyledButton
                  fullWidth
                  onClick={async () => {
                    setApprovingB(true);
                    try {
                      await approveBCallback();
                      setApprovingB(false);
                    } catch (e) {
                      setApprovingB(false);
                    }
                  }}
                  disabled={approvingB || approvalB === ApprovalState.PENDING}
                >
                  {approvalB === ApprovalState.PENDING
                    ? `${t('approving')} ${
                        mintInfo?.currencies?.[Field.CURRENCY_B]?.symbol
                      }`
                    : `${t('approve')} ${
                        mintInfo?.currencies?.[Field.CURRENCY_B]?.symbol
                      }`}
                </StyledButton>
              </Box>
            )}
          </Box>
        )}

      <StyledButton
        disabled={
          Boolean(account) &&
          (Boolean(mintInfo?.errorMessage) ||
            approvalA !== ApprovalState.APPROVED ||
            approvalB !== ApprovalState.APPROVED)
        }
        onClick={account ? onAdd : connectWallet}
      >
        {' '}
        {title}
      </StyledButton>
    </Box>
  );
}
