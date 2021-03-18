/**
 * @type import('hardhat/config').HardhatUserConfig
 */
import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";
import "hardhat-etherscan-abi";
import "@nomiclabs/hardhat-solhint";
import "solidity-coverage";
import 'hardhat-deploy';
import 'hardhat-dependency-compiler';

// const accounts = {
//   mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk",
//   accountsBalance: "990000000000000000000",
// }

const config: HardhatUserConfig = {
  solidity: "0.6.12",
  networks: {
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${process.env.WEB3_INFURA_PROJECT_ID}`,
      },
      blockGasLimit: 20000000,
      allowUnlimitedContractSize: true,
        chainId: 1,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.WEB3_INFURA_PROJECT_ID}`,
      accounts: {
        mnemonic: process.env.HDWALLET_MNEMONIC || ""
      }
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_TOKEN
  },
  mocha: {
    timeout: 60000
  },
  dependencyCompiler: {
    paths: [
      "@pooltogether/pooltogether-contracts/contracts/builders/PoolWithMultipleWinnersBuilder.sol",
      "@pooltogether/pooltogether-contracts/contracts/registry/Registry.sol",
      "@pooltogether/pooltogether-contracts/contracts/prize-pool/compound/CompoundPrizePoolProxyFactory.sol",
      "@pooltogether/pooltogether-contracts/contracts/prize-pool/yield-source/YieldSourcePrizePoolProxyFactory.sol",
      "@pooltogether/pooltogether-contracts/contracts/prize-pool/stake/StakePrizePoolProxyFactory.sol",
      "@pooltogether/pooltogether-contracts/contracts/builders/MultipleWinnersBuilder.sol",
      "@pooltogether/pooltogether-contracts/contracts/prize-strategy/multiple-winners/MultipleWinnersProxyFactory.sol",
      "@pooltogether/pooltogether-contracts/contracts/builders/ControlledTokenBuilder.sol",
      "@pooltogether/pooltogether-contracts/contracts/token/ControlledTokenProxyFactory.sol",
      "@pooltogether/pooltogether-contracts/contracts/token/TicketProxyFactory.sol",
    ]
  },
  
  namedAccounts: {
    deployer: {
      default: 0
    }
  },
};

export default config;