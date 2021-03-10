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

// const accounts = {
//   mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk",
//   accountsBalance: "990000000000000000000",
// }

const config: HardhatUserConfig = {
  solidity: "0.7.3",
  networks: {
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${process.env.WEB3_INFURA_PROJECT_ID}`,
      },
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
  namedAccounts: {
    deployer: {
      default: 0
    }
  },
};

export default config;