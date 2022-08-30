import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Currency, CurrencyAmount, Token, TradeType } from '@uniswap/sdk-core';
import { Trade as V3Trade } from 'lib/src/trade';
import JSBI from 'jsbi';
import { ArrowDown, CheckCircle, HelpCircle, Info } from 'react-feather';
import { RouteComponentProps, useHistory } from 'react-router-dom';
import { Text } from 'rebass';
import { ThemeContext } from 'styled-components/macro';
import { Helmet } from 'react-helmet';
import ReactGA from 'react-ga';
import { TYPE } from 'theme/index';
import './index.scss';
import { useActiveWeb3React } from 'hooks';
import useENSAddress from 'hooks/useENSAddress';
import Loader from 'components/Loader';
import {
  ApprovalState,
  useApproveCallbackFromTrade,
} from 'hooks/useV3ApproveCallback';
import { useSwapCallback } from 'hooks/v3/useSwapCallback';
import { useUSDCValue } from 'hooks/v3/useUSDCPrice';
import useWrapCallback, { WrapType } from 'hooks/useWrapCallback';
import { getTradeVersion } from 'utils/v3/getTradeVersion';
import { WrappedCurrency } from 'models/types';
import { useWalletModalToggle } from 'state/application/hooks';
import CurrencyLogo from 'components/CurrencyLogo';
import useToggledVersion, { Version } from 'hooks/v3/useToggledVersion';
import {
  useERC20PermitFromTrade,
  UseERC20PermitState,
} from 'hooks/v3/useERC20Permit';
import { warningSeverity } from 'utils/v3/prices';
import { maxAmountSpend } from 'utils/v3/maxAmountSpend';
import { V3TradeState } from 'hooks/v3/useBestV3Trade';
import { computeFiatValuePriceImpact } from 'utils/v3/computeFiatValuePriceImpact';
import { useAllTokens, useCurrency } from 'hooks/v3/Tokens';

import { AutoColumn } from 'components/v3/Column';
import Row, { AutoRow } from 'components/v3/Row';
import { GreyCard } from 'components/v3/Card';
import { ButtonConfirmed, ButtonError } from 'components/v3/Button';
import {
  MouseoverTooltip,
  MouseoverTooltipContent,
} from 'components/v3/Tooltip';
import TokenWarningModal from 'components/v3/TokenWarningModal';
import TradePrice from 'components/v3/swap/TradePrice';
import SwapHeader from 'components/v3/swap/SwapHeader';
import AddressInputPanel from 'components/v3/AddressInputPanel';
import { LinkStyledButton } from 'theme/components';
import {
  ArrowWrapper,
  Dots,
  SwapCallbackError,
} from 'components/v3/swap/styled';
import { AdvancedSwapDetails } from 'components/v3/swap/AdvancedSwapDetails';
import CurrencyInputPanel from 'components/v3/CurrencyInputPanel';
import {
  useDefaultsFromURLSearch,
  useDerivedSwapInfo,
  useSwapActionHandlers,
  useSwapState,
} from 'state/swap/v3/hooks';
import { Field } from 'state/swap/v3/actions';
import confirmPriceImpactWithoutFee from 'components/v3/swap/confirmPriceImpactWithoutFee';
import ConfirmSwapModal from 'components/v3/swap/ConfirmSwapModal';
import { useExpertModeManager } from 'state/user/hooks';
import Card from 'components/v3/Card/Card';
import CurrencyInputV3 from 'components/CurrencyInputV3';
import { Box } from '@material-ui/core';
import { PriceFormats } from 'components/v3/NewAddLiquidity/components/PriceFomatToggler';
import { ReactComponent as ExchangeIcon } from 'assets/images/ExchangeIcon.svg';
import { StyledButton } from 'components/v3/Common/styledElements';

const SwapV3Page: React.FC = () => {
  const { account } = useActiveWeb3React();
  const history = useHistory();
  const loadedUrlParams = useDefaultsFromURLSearch();

  // token warning stuff
  const [loadedInputCurrency, loadedOutputCurrency] = [
    useCurrency(loadedUrlParams?.inputCurrencyId),
    useCurrency(loadedUrlParams?.outputCurrencyId),
  ];
  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(
    false,
  );
  const urlLoadedTokens: Token[] = useMemo(
    () =>
      [loadedInputCurrency, loadedOutputCurrency]?.filter(
        (c): c is Token => c?.isToken ?? false,
      ) ?? [],
    [loadedInputCurrency, loadedOutputCurrency],
  );
  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true);
  }, []);

  // dismiss warning if all imported tokens are in active lists
  const defaultTokens = useAllTokens();
  const importTokensNotInDefault =
    urlLoadedTokens &&
    urlLoadedTokens.filter((token: Token) => {
      return !Boolean(token.address in defaultTokens);
    });

  const theme = useContext(ThemeContext);

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle();

  // for expert mode
  const [isExpertMode] = useExpertModeManager();

  // get version from the url
  const toggledVersion = useToggledVersion();

  // swap state
  const { independentField, typedValue, recipient } = useSwapState();
  const {
    v3TradeState: { state: v3TradeState },
    toggledTrade: trade,
    allowedSlippage,
    currencyBalances,
    parsedAmount,
    currencies,
    inputError: swapInputError,
  } = useDerivedSwapInfo();

  const {
    wrapType,
    execute: onWrap,
    inputError: wrapInputError,
  } = useWrapCallback(
    currencies[Field.INPUT],
    currencies[Field.OUTPUT],
    typedValue,
  );

  const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE;
  const { address: recipientAddress } = useENSAddress(recipient);

  const parsedAmounts = useMemo(
    () =>
      showWrap
        ? {
            [Field.INPUT]: parsedAmount,
            [Field.OUTPUT]: parsedAmount,
          }
        : {
            [Field.INPUT]:
              independentField === Field.INPUT
                ? parsedAmount
                : trade?.inputAmount,
            [Field.OUTPUT]:
              independentField === Field.OUTPUT
                ? parsedAmount
                : trade?.outputAmount,
          },
    [independentField, parsedAmount, showWrap, trade],
  );

  const fiatValueInput = useUSDCValue(parsedAmounts[Field.INPUT]);
  const fiatValueOutput = useUSDCValue(parsedAmounts[Field.OUTPUT]);
  const priceImpact = computeFiatValuePriceImpact(
    fiatValueInput,
    fiatValueOutput,
  );

  const {
    onSwitchTokens,
    onCurrencySelection,
    onUserInput,
    onChangeRecipient,
  } = useSwapActionHandlers();
  const isValid = !swapInputError;
  const dependentField: Field =
    independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT;

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value);
    },
    [onUserInput],
  );
  const handleTypeOutput = useCallback(
    (value: string) => {
      onUserInput(Field.OUTPUT, value);
    },
    [onUserInput],
  );

  // reset if they close warning without tokens in params
  const handleDismissTokenWarning = useCallback(() => {
    setDismissTokenWarning(true);
    history.push('/swap/');
  }, [history]);

  // modal and loading
  const [
    { showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash },
    setSwapState,
  ] = useState<{
    showConfirm: boolean;
    tradeToConfirm: V3Trade<Currency, Currency, TradeType> | undefined;
    attemptingTxn: boolean;
    swapErrorMessage: string | undefined;
    txHash: string | undefined;
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined,
  });

  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: showWrap
      ? parsedAmounts[independentField]?.toExact() ?? ''
      : parsedAmounts[dependentField]?.toSignificant(6) ?? '',
  };

  const userHasSpecifiedInputOutput = Boolean(
    currencies[Field.INPUT] &&
      currencies[Field.OUTPUT] &&
      parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0)),
  );

  const routeNotFound = !trade?.route;
  const isLoadingRoute =
    toggledVersion === Version.v3 && V3TradeState.LOADING === v3TradeState;

  const dynamicFee = useMemo(() => {
    const _trade = trade as any;
    if (!_trade) return;
    return _trade.swaps[0]?.route?.pools[0].fee;
  }, [trade]);

  // check whether the user has approved the router on the input token
  const [approvalState, approveCallback] = useApproveCallbackFromTrade(
    trade,
    allowedSlippage,
  );
  const {
    state: signatureState,
    signatureData,
    gatherPermitSignature,
  } = useERC20PermitFromTrade(trade, allowedSlippage);

  const handleApprove = useCallback(async () => {
    if (
      signatureState === UseERC20PermitState.NOT_SIGNED &&
      gatherPermitSignature
    ) {
      try {
        await gatherPermitSignature();
      } catch (error) {
        // try to approve if gatherPermitSignature failed for any reason other than the user rejecting it
        if (error?.code !== 4001) {
          await approveCallback();
        }
      }
    } else {
      await approveCallback();
      ReactGA.event({
        category: 'Swap',
        action: 'Approve',
        label: [trade?.inputAmount.currency.symbol, toggledVersion].join('/'),
      });
    }
  }, [approveCallback, gatherPermitSignature, signatureState]);

  // check if user has gone through approval process, used to show two step buttons, reset on token change
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false);

  // mark when a user has submitted an approval, reset onTokenSelection for input field
  useEffect(() => {
    if (approvalState === ApprovalState.PENDING) {
      setApprovalSubmitted(true);
    }
  }, [approvalState, approvalSubmitted]);

  const maxInputAmount: CurrencyAmount<Currency> | undefined = maxAmountSpend(
    currencyBalances[Field.INPUT],
  );
  const showMaxButton = Boolean(
    maxInputAmount?.greaterThan(0) &&
      !parsedAmounts[Field.INPUT]?.equalTo(maxInputAmount),
  );

  // the callback to execute the swap
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const { callback: swapCallback, error: swapCallbackError } = useSwapCallback(
    trade,
    allowedSlippage,
    recipient,
    signatureData,
  );

  const singleHopOnly = false;

  const handleSwap = useCallback(() => {
    if (!swapCallback) {
      return;
    }
    if (priceImpact && !confirmPriceImpactWithoutFee(priceImpact)) {
      return;
    }
    setSwapState({
      attemptingTxn: true,
      tradeToConfirm,
      showConfirm,
      swapErrorMessage: undefined,
      txHash: undefined,
    });
    swapCallback()
      .then((hash) => {
        setSwapState({
          attemptingTxn: false,
          tradeToConfirm,
          showConfirm,
          swapErrorMessage: undefined,
          txHash: hash,
        });
        ReactGA.event({
          category: 'Swap',
          action:
            recipient === null
              ? 'Swap w/o Send'
              : (recipientAddress ?? recipient) === account
              ? 'Swap w/o Send + recipient'
              : 'Swap w/ Send',
          label: [
            trade?.inputAmount?.currency?.symbol,
            trade?.outputAmount?.currency?.symbol,
            getTradeVersion(trade),
            'MH',
            account,
          ].join('/'),
        });
      })
      .catch((error) => {
        setSwapState({
          attemptingTxn: false,
          tradeToConfirm,
          showConfirm,
          swapErrorMessage: error.message,
          txHash: undefined,
        });
      });
  }, [
    swapCallback,
    priceImpact,
    tradeToConfirm,
    showConfirm,
    recipient,
    recipientAddress,
    account,
    trade,
    singleHopOnly,
  ]);

  // errors
  const [showInverted, setShowInverted] = useState<boolean>(false);

  // warnings on the greater of fiat value price impact and execution price impact
  const priceImpactSeverity = useMemo(() => {
    const executionPriceImpact = trade?.priceImpact;
    return warningSeverity(
      executionPriceImpact && priceImpact
        ? executionPriceImpact.greaterThan(priceImpact)
          ? executionPriceImpact
          : priceImpact
        : executionPriceImpact ?? priceImpact,
    );
  }, [priceImpact, trade]);

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    !swapInputError &&
    (approvalState === ApprovalState.NOT_APPROVED ||
      approvalState === ApprovalState.PENDING ||
      (approvalSubmitted && approvalState === ApprovalState.APPROVED)) &&
    !(priceImpactSeverity > 3 && !isExpertMode);

  const handleConfirmDismiss = useCallback(() => {
    setSwapState({
      showConfirm: false,
      tradeToConfirm,
      attemptingTxn,
      swapErrorMessage,
      txHash,
    });
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onUserInput(Field.INPUT, '');
    }
  }, [attemptingTxn, onUserInput, swapErrorMessage, tradeToConfirm, txHash]);

  const handleAcceptChanges = useCallback(() => {
    setSwapState({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      tradeToConfirm: trade,
      swapErrorMessage,
      txHash,
      attemptingTxn,
      showConfirm,
    });
  }, [attemptingTxn, showConfirm, swapErrorMessage, trade, txHash]);

  const handleInputSelect = useCallback(
    (inputCurrency) => {
      setApprovalSubmitted(false); // reset 2 step UI for approvals
      onCurrencySelection(Field.INPUT, inputCurrency);
    },
    [onCurrencySelection],
  );

  const handleMaxInput = useCallback(() => {
    maxInputAmount && onUserInput(Field.INPUT, maxInputAmount.toExact());
    ReactGA.event({
      category: 'Swap',
      action: 'Max',
    });
  }, [maxInputAmount, onUserInput]);

  const handleHalfInput = useCallback(() => {
    maxInputAmount &&
      onUserInput(
        Field.INPUT,
        (Number(maxInputAmount.toExact()) / 2)?.toString(),
      );
    ReactGA.event({
      category: 'Swap',
      action: 'Max',
    });
  }, [maxInputAmount, onUserInput]);

  const handleOutputSelect = useCallback(
    (outputCurrency) => {
      onCurrencySelection(Field.OUTPUT, outputCurrency);
    },
    [onCurrencySelection],
  );

  //TODO
  const priceImpactTooHigh = priceImpactSeverity > 3 && !isExpertMode;

  return (
    <>
      <Helmet>
        <meta
          name={'description'}
          content={`Quickswap is one of the first concentrated liquidity DEX on Polygon: best rates for traders and liquidity providers on the Polygon Network, with built-in farming and adaptive fees.`}
        />
        <meta
          name={'keywords'}
          content={`best dex, quickswap exchange, quickswap crypto, quickswap finance, quickswap dex, defi, polygon dex, exchange on polygon, matic exchange`}
        />
      </Helmet>
      <TokenWarningModal
        isOpen={importTokensNotInDefault.length > 0 && !dismissTokenWarning}
        tokens={importTokensNotInDefault}
        onConfirm={handleConfirmTokenWarning}
        onDismiss={handleDismissTokenWarning}
      />

      <Box className='flex flex-col mt-2'>
        <SwapHeader allowedSlippage={allowedSlippage} dynamicFee={dynamicFee} />

        <ConfirmSwapModal
          isOpen={showConfirm}
          trade={trade}
          originalTrade={tradeToConfirm}
          onAcceptChanges={handleAcceptChanges}
          attemptingTxn={attemptingTxn}
          txHash={txHash}
          recipient={recipient}
          allowedSlippage={allowedSlippage}
          onConfirm={handleSwap}
          swapErrorMessage={swapErrorMessage}
          onDismiss={handleConfirmDismiss}
        />

        <Box mb={2}>
          <CurrencyInputV3
            id='tokena'
            currency={currencies[Field.INPUT]}
            showHalfButton={Boolean(maxInputAmount)}
            showMaxButton={showMaxButton}
            onMax={handleMaxInput}
            onHalf={handleHalfInput}
            handleCurrencySelect={handleInputSelect}
            amount={formattedAmounts?.[Field.INPUT]}
            usdValue={fiatValueInput}
            setAmount={handleTypeInput}
          />

          <Box className='exchangeSwap'>
            <ExchangeIcon onClick={onSwitchTokens} />
          </Box>
          <CurrencyInputV3
            id='tokenb'
            currency={currencies[Field.OUTPUT]}
            showHalfButton={false}
            showMaxButton={false}
            handleCurrencySelect={handleOutputSelect}
            amount={formattedAmounts?.[Field.OUTPUT]}
            usdValue={fiatValueOutput}
            setAmount={handleTypeOutput}
          />

          <div className='mt-1'>
            {!account ? (
              <StyledButton onClick={toggleWalletModal}>
                Connect Wallet
              </StyledButton>
            ) : showWrap ? (
              <StyledButton disabled={Boolean(wrapInputError)} onClick={onWrap}>
                {wrapInputError ??
                  (wrapType === WrapType.WRAP
                    ? 'Wrap'
                    : wrapType === WrapType.UNWRAP
                    ? 'Unwrap'
                    : null)}
              </StyledButton>
            ) : routeNotFound && userHasSpecifiedInputOutput ? (
              <StyledButton
                disabled={true}
                style={{
                  textAlign: 'center',
                }}
              >
                <TYPE.main mb='4px'>
                  {isLoadingRoute ? (
                    <Dots>Loading</Dots>
                  ) : singleHopOnly ? (
                    'Insufficient liquidity for this trade. Try enabling multi-hop trades.'
                  ) : (
                    'Insufficient liquidity for this trade.'
                  )}
                </TYPE.main>
              </StyledButton>
            ) : showApproveFlow ? (
              <AutoRow style={{ flexWrap: 'nowrap', width: '100%' }}>
                <AutoColumn style={{ width: '100%' }} gap='12px'>
                  <StyledButton
                    onClick={handleApprove}
                    disabled={
                      approvalState !== ApprovalState.NOT_APPROVED ||
                      approvalSubmitted ||
                      signatureState === UseERC20PermitState.SIGNED
                    }
                    style={{
                      background: theme.winterMainButton,
                      color: 'white',
                    }}
                    width='100%'
                    // altDisabledStyle={approvalState === ApprovalState.PENDING} // show solid button while waiting
                    // confirmed={
                    //   approvalState === ApprovalState.APPROVED ||
                    //   signatureState === UseERC20PermitState.SIGNED
                    // }
                  >
                    <AutoRow
                      justify='space-between'
                      style={{
                        flexWrap: 'nowrap',
                        display: 'flex',
                        justifyContent: 'center',
                        background: theme.winterMainButton,
                        color: 'white',
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: theme.winterMainButton,
                          color: 'white',
                        }}
                      >
                        <CurrencyLogo
                          currency={currencies[Field.INPUT] as WrappedCurrency}
                          size={'24px'}
                          style={{ marginRight: '8px', flexShrink: 0 }}
                        />
                        {/* we need to shorten this string on mobile */}
                        {approvalState === ApprovalState.APPROVED ||
                        signatureState === UseERC20PermitState.SIGNED
                          ? `You can now trade ${
                              currencies[Field.INPUT]?.symbol
                            }`
                          : `Allow Algebra to use your ${
                              currencies[Field.INPUT]?.symbol
                            }`}
                      </span>
                      {approvalState === ApprovalState.PENDING ? (
                        <Loader stroke='white' style={{ marginLeft: '5px' }} />
                      ) : (approvalSubmitted &&
                          approvalState === ApprovalState.APPROVED) ||
                        signatureState === UseERC20PermitState.SIGNED ? (
                        <CheckCircle
                          size='20'
                          style={{ marginLeft: '5px' }}
                          color={theme.green1}
                        />
                      ) : (
                        <MouseoverTooltip
                          text={`You must give the Quickswap smart contracts permission to use your " ${
                            currencies[Field.INPUT]?.symbol
                          }. You only have to do this once per token.`}
                        >
                          <HelpCircle
                            size='20'
                            color={'white'}
                            style={{ marginLeft: '8px' }}
                          />
                        </MouseoverTooltip>
                      )}
                    </AutoRow>
                  </StyledButton>
                  <StyledButton
                    onClick={() => {
                      if (isExpertMode) {
                        handleSwap();
                      } else {
                        setSwapState({
                          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          //@ts-ignore
                          tradeToConfirm: trade,
                          attemptingTxn: false,
                          swapErrorMessage: undefined,
                          showConfirm: true,
                          txHash: undefined,
                        });
                      }
                    }}
                    style={{
                      backgroundColor:
                        !isValid ||
                        (approvalState !== ApprovalState.APPROVED &&
                          signatureState !== UseERC20PermitState.SIGNED) ||
                        priceImpactTooHigh ||
                        priceImpactSeverity
                          ? theme.winterDisabledButton
                          : theme.winterMainButton,
                      color:
                        !isValid ||
                        (approvalState !== ApprovalState.APPROVED &&
                          signatureState !== UseERC20PermitState.SIGNED) ||
                        priceImpactTooHigh ||
                        priceImpactSeverity
                          ? 'rgb(195, 197, 203)'
                          : 'white',
                      border:
                        !isValid ||
                        (approvalState !== ApprovalState.APPROVED &&
                          signatureState !== UseERC20PermitState.SIGNED) ||
                        priceImpactTooHigh ||
                        priceImpactSeverity
                          ? '1px solid #073c66'
                          : `1px solid ${({ theme }: any) =>
                              theme.winterMainButton}`,
                    }}
                    width='100%'
                    id='swap-button'
                    disabled={
                      !isValid ||
                      (approvalState !== ApprovalState.APPROVED &&
                        signatureState !== UseERC20PermitState.SIGNED) ||
                      priceImpactTooHigh
                    }
                    // error={isValid && priceImpactSeverity > 2}
                  >
                    <Text fontSize={16} fontWeight={500}>
                      {priceImpactTooHigh
                        ? 'High Price Impact'
                        : priceImpactSeverity > 2
                        ? 'Swap Anyway'
                        : 'Swap'}
                    </Text>
                  </StyledButton>
                </AutoColumn>
              </AutoRow>
            ) : (
              <StyledButton
                onClick={() => {
                  if (isExpertMode) {
                    handleSwap();
                  } else {
                    setSwapState({
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      //@ts-ignore
                      tradeToConfirm: trade,
                      attemptingTxn: false,
                      swapErrorMessage: undefined,
                      showConfirm: true,
                      txHash: undefined,
                    });
                  }
                }}
                id='swap-button'
                disabled={!isValid || priceImpactTooHigh || !!swapCallbackError}
                // error={isValid && priceImpactSeverity > 2 && !swapCallbackError}
              >
                <Text fontSize={20} fontWeight={500}>
                  {swapInputError
                    ? swapInputError
                    : priceImpactTooHigh
                    ? 'Price Impact Too High'
                    : priceImpactSeverity > 2
                    ? 'Swap Anyway'
                    : 'Swap'}
                </Text>
              </StyledButton>
            )}
            {isExpertMode && swapErrorMessage ? (
              <SwapCallbackError error={swapErrorMessage} />
            ) : null}
          </div>
        </Box>
      </Box>
    </>
  );
};

export default SwapV3Page;
