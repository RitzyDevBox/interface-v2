import React, { useMemo, useState } from 'react';
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
import { setAddLiquidityTxHash } from 'state/mint/v3/actions';
import { ZERO_PERCENT } from 'constants/v3/misc';
import { useIsNetworkFailedImmediate } from 'hooks/v3/useIsNetworkFailed';
import { JSBI } from '@uniswap/sdk';
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESSES } from 'constants/v3/addresses';
import {
  addMaticToMetamask,
  calculateGasMarginV3,
  isSupportedNetwork,
} from 'utils';
import { StyledButton } from 'components/v3/Common/styledElements';
import { useWalletModalToggle } from 'state/application/hooks';

interface IAddLiquidityButton {
  baseCurrency: Currency | undefined;
  quoteCurrency: Currency | undefined;
  mintInfo: IDerivedMintInfo;
  handleAddLiquidity: () => void;
  title: string;
  setRejected?: (rejected: boolean) => void;
}
const DEFAULT_ADD_IN_RANGE_SLIPPAGE_TOLERANCE = new Percent(50, 10_000);

export function AddLiquidityButton({
  baseCurrency,
  quoteCurrency,
  mintInfo,
  handleAddLiquidity,
  title,
  setRejected,
}: IAddLiquidityButton) {
  const { chainId, library, account } = useActiveWeb3React();

  const positionManager = useV3NFTPositionManagerContract();

  const deadline = useTransactionDeadline();

  const dispatch = useAppDispatch();

  const txHash = useAddLiquidityTxHash();

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

  const [approvalA] = useApproveCallback(
    mintInfo.parsedAmounts[Field.CURRENCY_A],
    chainId ? NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId] : undefined,
  );
  const [approvalB] = useApproveCallback(
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

  async function onAdd() {
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

  return (
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
  );
}
