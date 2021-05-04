/**
 * @type import('hardhat/config').HardhatUserConfig
 */
import { HardhatUserConfig, HardhatNetworkUserConfig } from 'hardhat/types';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-typechain';
import 'hardhat-etherscan-abi';
import '@nomiclabs/hardhat-solhint';
import 'solidity-coverage';
import 'hardhat-deploy';
import 'hardhat-dependency-compiler';

// const accounts = {
//   mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk",
//   accountsBalance: "990000000000000000000",
// }

let hardhat: HardhatNetworkUserConfig = {
  blockGasLimit: 20000000,
  allowUnlimitedContractSize: true,
  chainId: 1,
};

if (process.env.FORK_MAINNET) {
  console.log('Using mainnet fork');
  hardhat = {
    forking: {
      url: `https://mainnet.infura.io/v3/${process.env.WEB3_INFURA_PROJECT_ID}`,
    },
    ...hardhat,
  };
}

const config: HardhatUserConfig = {
  solidity: {
    version: '0.6.12',
    settings: {
      outputSelection: {
        '*': {
          '*': ['storageLayout'],
        },
      },
    },
  },

  networks: {
    hardhat,
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.WEB3_INFURA_PROJECT_ID}`,
      accounts: {
        mnemonic: process.env.HDWALLET_MNEMONIC || '',
      },
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${process.env.WEB3_INFURA_PROJECT_ID}`,
      accounts: {
        mnemonic: process.env.HDWALLET_MNEMONIC || '',
      },
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.WEB3_INFURA_PROJECT_ID}`,
      accounts: {
        mnemonic: process.env.HDWALLET_MNEMONIC || '',
      },
    },
    localhost: {
      chainId: 1,
      url: 'http://127.0.0.1:8545',
      allowUnlimitedContractSize: true,
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_TOKEN,
  },
  mocha: {
    timeout: 60000,
  },
  dependencyCompiler: {
    paths: [
      '@pooltogether/pooltogether-contracts/contracts/builders/PoolWithMultipleWinnersBuilder.sol',
      '@pooltogether/pooltogether-contracts/contracts/registry/Registry.sol',
      '@pooltogether/pooltogether-contracts/contracts/prize-pool/compound/CompoundPrizePoolProxyFactory.sol',
      '@pooltogether/pooltogether-contracts/contracts/prize-pool/yield-source/YieldSourcePrizePoolProxyFactory.sol',
      '@pooltogether/pooltogether-contracts/contracts/prize-pool/stake/StakePrizePoolProxyFactory.sol',
      '@pooltogether/pooltogether-contracts/contracts/builders/MultipleWinnersBuilder.sol',
      '@pooltogether/pooltogether-contracts/contracts/prize-strategy/multiple-winners/MultipleWinnersProxyFactory.sol',
      '@pooltogether/pooltogether-contracts/contracts/builders/ControlledTokenBuilder.sol',
      '@pooltogether/pooltogether-contracts/contracts/token/ControlledTokenProxyFactory.sol',
      '@pooltogether/pooltogether-contracts/contracts/token/TicketProxyFactory.sol',
    ],
  },

  namedAccounts: {
    deployer: {
      default: 0,
    },
    badgerSett: {
      localhost: '0x19d97d8fa813ee2f51ad4b4e04ea08baf4dffc28',
      mainnet: '0x19d97d8fa813ee2f51ad4b4e04ea08baf4dffc28',
    },
    badger: {
      localhost: '0x3472A5A71965499acd81997a54BBA8D852C6E53d',
      mainnet: '0x3472A5A71965499acd81997a54BBA8D852C6E53d',
    },
  },
};

export default config;
