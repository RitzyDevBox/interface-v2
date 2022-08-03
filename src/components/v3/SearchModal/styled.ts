import React from 'react';
import styled from 'styled-components/macro'
import Column, { AutoColumn } from '../Column'
import Row, { RowBetween } from '../Row'
import { CheckCircle } from 'react-feather'
import { TYPE } from 'theme/index'
import { LinkStyledButton } from 'theme/components'

//All
export const Wrapper = styled.div`
    position: relative;
    width: 100%;
    overflow: auto;
`
export const PaddedColumn = styled(AutoColumn)`
    padding: 20px;
`
export const SearchInput = styled.input`
    position: relative;
    display: flex;
    height: 2rem;
    min-height: 2rem;
    max-height: 2rem;
    padding-left: 12px;
    padding-right: 12px;
    align-items: center;
    width: 100%;
    white-space: nowrap;
    background: transparent;
    outline: none;
    border-radius: 8px;
    color: white;
    border: 1px solid var(--primary);
    -webkit-appearance: none;

    font-size: 16px;

    ::placeholder {
        color: ${({ theme }) => theme.text3};
    }

    transition: border 100ms;

    :focus {
        border: 1px solid var(--primary);
        outline: none;
    }
`
export const Separator = styled.div`
    width: 100%;
    height: 1px;
    background-color: ${({ theme }) => theme.bg2};
`

//CommonBases
export const MobileWrapper = styled(AutoColumn)`
`
export const BaseWrapper = styled.div<{ disable?: boolean }>`
    border: 1px solid ${({ disable }) => (disable ? 'transparent' : '#3881a5')};
    border-radius: 10px;
    display: flex;
    padding: 6px;

    align-items: center;

    :hover {
        cursor: ${({ disable }) => !disable && 'pointer'};
        background-color: ${({ disable }) => !disable && '#9ddcfb'};
    }

    color: ${({ theme, disable }) => disable && theme.text3};
    background-color: ${({ disable }) => disable && '#e5e5e5'};
    filter: ${({ disable }) => disable && 'grayscale(1)'};
`

//CurrencyList
export const Tag = styled.div`
    background-color: ${({ theme }) => theme.bg3};
    color: ${({ theme }) => theme.text2};
    font-size: 14px;
    border-radius: 4px;
    padding: 0.25rem 0.3rem 0.25rem 0.3rem;
    max-width: 6rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    justify-self: flex-end;
    margin-right: 4px;
`
export const FixedContentRow = styled.div`
    padding: 4px 20px;
    height: 56px;
    display: grid;
    grid-gap: 16px;
    align-items: center;
`
export const TagContainer = styled.div`
    display: flex;
    justify-content: flex-end;
`
export const MenuItem = styled(RowBetween)`
    padding: 4px 20px;
    height: 56px;
    display: grid;
    grid-template-columns: auto minmax(auto, 1fr) auto minmax(0, 72px);
    grid-gap: 16px;
    cursor: ${({ disabled }) => !disabled && 'pointer'};
    pointer-events: ${({ disabled }) => disabled && 'none'};

    :hover {
        background-color: ${({ disabled }) => !disabled && '#9ddcfb'};
    }

    opacity: ${({ disabled, selected }) => (disabled || selected ? 0.5 : 1)};
`

//CurrencySearch
export const ContentWrapper = styled(Column)`
    width: 100%;
    flex: 1 1;
    position: relative;
    color: #080064;
`

//ImportRow
export const TokenSection = styled.div<{ dim?: boolean }>`
    padding: 4px 20px;
    height: 56px;
    display: grid;
    grid-template-columns: auto minmax(auto, 1fr) auto;
    grid-gap: 16px;
    align-items: center;
    color: #080064;

    opacity: ${({ dim }) => (dim ? '0.4' : '1')};
`
export const CheckIcon = styled(CheckCircle)`
    height: 16px;
    width: 16px;
    margin-right: 6px;
    stroke: ${({ theme }) => theme.green1};
`
export const NameOverflow = styled.div`
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 140px;
    font-size: 12px;
`

//ImportList
export const TextDot = styled.div`
    height: 3px;
    width: 3px;
    background-color: ${({ theme }) => theme.text2};
    border-radius: 50%;
`
export const Checkbox = styled.input`
    border: 1px solid ${({ theme }) => theme.red1};
    height: 20px;
    margin: 0;
`

//ImportTokens
export const AddressText = styled(TYPE.blue)`
    font-size: 12px;
    word-break: break-all;

    ${({ theme }) => theme.mediaWidth.upToSmall`
    font-size: 10px;
  `}
`

//Manage
export const ToggleWrapper = styled(RowBetween)`
    background-color: ${({ theme }) => theme.bg3};
    border-radius: 12px;
    padding: 6px;
`
export const ToggleOption = styled.div<{ active?: boolean }>`
    width: 48%;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    font-weight: 600;
    background-color: ${({ theme, active }) => (active ? theme.bg1 : theme.bg3)};
    color: ${({ theme, active }) => (active ? theme.text1 : theme.text2)};
    user-select: none;

    :hover {
        cursor: pointer;
        opacity: 0.7;
    }
`

//ManageLists
export const ManageWrapper = styled(Column)`
    height: 100%;
`
export const UnpaddedLinkStyledButton = styled(LinkStyledButton)`
    padding: 0;
    font-size: 1rem;
    opacity: ${({ disabled }) => (disabled ? '0.4' : '1')};
`
export const PopoverContainer = styled.div<{ show: boolean }>`
    z-index: 100;
    visibility: ${(props) => (props.show ? 'visible' : 'hidden')};
    opacity: ${(props) => (props.show ? 1 : 0)};
    transition: visibility 150ms linear, opacity 150ms linear;
    background: ${({ theme }) => theme.bg2};
    border: 1px solid ${({ theme }) => theme.bg3};
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.01), 0 4px 8px rgba(0, 0, 0, 0.04), 0 16px 24px rgba(0, 0, 0, 0.04),
    0 24px 32px rgba(0, 0, 0, 0.01);
    color: ${({ theme }) => theme.text2};
    border-radius: 0.5rem;
    padding: 1rem;
    display: grid;
    grid-template-rows: 1fr;
    grid-gap: 8px;
    font-size: 1rem;
    text-align: left;
`
export const StyledMenu = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    border: none;
`
export const StyledTitleText = styled.div<{ active: boolean }>`
    font-size: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 600;
    color: ${({ theme, active }) => (active ? theme.white : theme.text2)};
`
export const StyledListUrlText = styled(TYPE.main)<{ active: boolean }>`
    font-size: 12px;
    color: ${({ theme, active }) => (active ? theme.white : theme.text2)};
`
export const RowWrapper = styled(Row)<{ bgColor: string; active: boolean; hasActiveTokens: boolean }>`
    background-color: ${({
        bgColor,
        active,
        theme
    }) => (active ? bgColor ?? 'transparent' : theme.bg2)};
    opacity: ${({ hasActiveTokens }) => (hasActiveTokens ? 1 : 0.4)};
    transition: 200ms;
    align-items: center;
    padding: 1rem;
    border-radius: 20px;
`
export const ListContainer = styled.div`
    height: 100%;
    overflow: auto;
    padding: 1rem 1rem 80px;
`
export const SeparatorDark = styled.div`
    width: 100%;
    height: 1px;
    background-color: ${({ theme }) => theme.bg3};
`

//ManageTokens
export const ManageTokensWrapper = styled.div`
    width: 100%;
    height: calc(100% - 60px);
    position: relative;
    padding-bottom: 80px;
`
export const Footer = styled.div`
    position: absolute;
    bottom: 0;
    width: 100%;
    border-radius: 0 0 20px 20px;
    border-top: 1px solid ${({ theme }) => theme.bg3};
    padding: 20px;
    text-align: center;
`
