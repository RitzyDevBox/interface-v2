import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Box, Typography, Grid, Divider } from '@material-ui/core';
import { useLairInfo, useSyrupInfo } from 'state/stake/hooks';
import { CurrencyLogo, FarmCard, ToggleSwitch } from 'components';
import { useGlobalData } from 'state/application/hooks';
import { ReactComponent as HelpIcon } from 'assets/images/HelpIcon1.svg';
import { ReactComponent as SearchIcon } from 'assets/images/SearchIcon.svg';
import BlindEyeIcon from 'assets/images/blindeye.svg';
import ArrowUpIcon from 'assets/images/arrowup.svg';

const useStyles = makeStyles(({ palette, breakpoints }) => ({
  helpWrapper: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    border: '1px solid #252833',
    borderRadius: 10,
    '& p': {
      color: '#636780',
    },
    '& svg': {
      marginLeft: 8
    }
  },
  dragonWrapper: {
    backgroundColor: '#1b1e29',
    borderRadius: 20,
    padding: 32,
    position: 'relative',
    overflow: 'hidden'
  },
  dragonBg: {
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    background: 'rgb(225, 190, 231, 0.1)',
    maxHeight: 207,
    overflow: 'hidden',
    '& img': {
      width: '100%'
    }
  },
  stepWrapper: {
    width: 80,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121319',
    '& span': {
      fontWeight: 'bold',
      color: '#b6b9cc'
    },
  },
  dragonTitle: {
    margin: '24px 0 64px',
    '& h5': {
      marginBottom: 16,
      color: '#c7cad9'
    },
    '& p': {
      maxWidth: 280,
      color: '#c7cad9'
    }
  },
  stakeButton: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  searchInput: {
    height: 50,
    background: '#121319',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    '& input': {
      background: 'transparent',
      border: 'none',
      boxShadow: 'none',
      outline: 'none',
      marginLeft: 8,
      fontSize: 14,
      fontWeight: 500,
      color: '#c7cad9',
      flex: 1
    }
  },
  thirdColor: {
    color: '#448aff',
    cursor: 'pointer'
  }
}));

const FarmPage: React.FC = () => {
  const classes = useStyles();
  const [ isQUICKRate, setIsQUICKRate ] = useState(false);
  const lairInfo = useLairInfo();
  const syrupInfo = useSyrupInfo();
  const { globalData } = useGlobalData();
  const APR =(((Number(lairInfo?.oneDayVol) * 0.04 * 0.01) / Number(lairInfo?.dQuickTotalSupply.toSignificant(6))) * 365) / (Number(lairInfo?.dQUICKtoQUICK.toSignificant()) * Number(lairInfo?.quickPrice));
  const APY = APR ? (Math.pow(1 + APR / 365, 365) - 1).toFixed(4) : 0;
  const [ stakedOnly, setStakeOnly ] = useState(false);
  const [ syrupSearch, setSyrupSearch ] = useState('');

  return (
    <Box width='100%' mb={3}>
      <Box mb={4} display='flex' alignItems='flex-start' justifyContent='space-between' width='100%'>
        <Box>
          <Typography variant='h4'>Farm</Typography>
          <Typography variant='body1'>Stake LP Tokens to Earn dQUICK + Pool Fees</Typography>
        </Box>
        <Box className={classes.helpWrapper}>
          <Typography variant='body2'>Help</Typography>
          <HelpIcon />
        </Box>
      </Box>
      <Divider />
      <Box display='flex' flexDirection='row' alignItems='flex-start' justifyContent='space-between' width='100%' mt={4} mb={4} pr={4} >
        <Box display='flex' flexDirection='column' alignItems='flex-start' justifyContent='space-between'>
          <Typography variant='caption' color='secondary'>Reward Rate:</Typography>
          <Box display='flex' flexDirection='row' alignItems='flex-end'>
            <Typography variant='body1'>150 dQUICK</Typography>
            <Typography variant='body2' text-sm color='secondary'>&nbsp;/day</Typography>
          </Box>
        </Box>
        <Box display='flex' flexDirection='column' alignItems='flex-start' justifyContent='space-between'>
          <Typography variant='caption' color='secondary'>Total Rewards:</Typography>
          <Box display='flex' flexDirection='row' alignItems='flex-end'>
            <Typography variant='body1'>$128,340</Typography>
          </Box>
        </Box>
        <Box display='flex' flexDirection='column' alignItems='flex-start' justifyContent='space-between'>
          <Typography variant='caption' color='secondary'>24h Fees:</Typography>
          <Box display='flex' flexDirection='row' alignItems='flex-end'>
            <Typography variant='body1'>$187,348</Typography>
          </Box>
        </Box>
        <Box display='flex' flexDirection='column' alignItems='flex-start' justifyContent='space-between'>
          <Box display='flex' flexDirection='row' alignItems='center'>
            <Typography variant='caption' color='secondary'>My deposits:</Typography>
            <Box ml={1} style={{height: '15px'}}><img src={BlindEyeIcon} alt={'blind eye deposits'} /></Box>
          </Box>
          <Box display='flex' flexDirection='row' alignItems='flex-end'>
            <Typography variant='body1'>$7,348.23</Typography>
          </Box>
        </Box>
        <Box display='flex' flexDirection='column' alignItems='flex-start' justifyContent='space-between'>
          <Box display='flex' flexDirection='row' alignItems='center'>
            <Typography variant='caption' color='secondary'>Unclaimed rewards:</Typography>
            <Box ml={1} style={{height: '15px'}}><img src={BlindEyeIcon} alt={'blind eye deposits'} /></Box>
          </Box>
          <Box display='flex' flexDirection='row' alignItems='flex-end'>
            <Typography variant='body1'>0.023 dQUICK</Typography>
          </Box>
          <Box mt={1}>
            <Typography className={classes.thirdColor} variant='body2'>Claim all</Typography>
          </Box>
        </Box>
      </Box>
      <Grid container spacing={4}>
        <Grid item sm={12}>
          <Box className={classes.dragonWrapper}>
            <Box display='flex' alignItems='center' mb={3.5}>
              <Box className={classes.searchInput} flex={1}>
                <SearchIcon />
                <input placeholder='Search name, symbol or paste address' value={syrupSearch} onChange={(evt: any) => setSyrupSearch(evt.target.value)} />
              </Box>
              <Box display='flex' alignItems='center' ml={4}>
                <Typography variant='body2' style={{ color: '#626680', marginRight: 8 }}>Staked Only</Typography>
                <ToggleSwitch toggled={stakedOnly} onToggle={() => setStakeOnly(!stakedOnly)} />
              </Box>
            </Box>
            <Divider />
            <Box mt={2.5} display='flex' paddingX={2}>
              <Box width={0.3}>
                <Typography color='secondary' variant='body2'>Pool</Typography>
              </Box>
              <Box width={0.25} display='flex' flexDirection='row' alignItems='center'>
                <Typography color='secondary' variant='body2'>TVL</Typography>
                <Box ml={1} style={{height: '23px'}}><img src={ArrowUpIcon} alt={'arrow up'} /></Box>
              </Box>
              <Box width={0.25} display='flex' flexDirection='row' alignItems='center'>
                <Typography color='secondary' variant='body2'>Rewards</Typography>
                <Box ml={1} style={{height: '23px'}}><img src={ArrowUpIcon} alt={'arrow up'} /></Box>
              </Box>
              <Box width={0.2} display='flex' flexDirection='row' alignItems='center' justifyContent='center'>
                <Typography color='secondary' variant='body2'>APY</Typography>
                <Box ml={1} style={{height: '23px'}}><img src={ArrowUpIcon} alt={'arrow up'} /></Box>
              </Box>
              <Box width={0.1} display='flex' flexDirection='row' alignItems='center' justifyContent='flex-end' mr={2}>
                <Typography color='secondary' variant='body2'>Earned</Typography>
                <Box ml={1} style={{height: '23px'}}><img src={ArrowUpIcon} alt={'arrow up'} /></Box>
              </Box>
            </Box>
            {
              syrupInfo && syrupInfo.map(syrup => (
                <FarmCard syrup={syrup} />
              ))
            }
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FarmPage;
