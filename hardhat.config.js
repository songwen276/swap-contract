require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
require("./tasks/0_deploySwap");
require("./tasks/1_upgradeSwap");

const env = require("./env.json");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        /*details: {
          yulDetails: {
            optimizerSteps: "u",
          },
        },*/
        runs: 200
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        // url: "https://bsc.rpc.blxrbdn.com",
        // url: "https://rpc-bsc.48.club",
        // url: "https://koge-rpc-bsc.48.club",
        // url: "https://rpc.ankr.com/bsc",
        // url: "https://bscrpc.com",
        url: "https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3",
        // url: "https://bsc-mainnet.rpcfast.com?api_key=xbhWBI1Wkguk8SNMu1bvvLurPGLXmgwYeC4S6g2H7WdwFigZSmPWVZRxrskEQwIf",
        // url: "https://bsc.blockpi.network/v1/rpc/public",

        blockNumber: 45352299
      },
      chains: {
        56: {
          hardforkHistory: {
            berlin: 1000000,
            london: 2000000,
          },
        }
      },
      accounts: [
        {"privateKey": env["hardhat"]["Bonding-Deployer-PK"], "balance": String(100e18)},
        {"privateKey": env["hardhat"]["Bonding-Keeper-1-PK"], "balance": String(101e18)},
        {"privateKey": env["hardhat"]["Bonding-Keeper-2-PK"], "balance": String(102e18)},
        {"privateKey": env["hardhat"]["Bonding-Keeper-3-PK"], "balance": String(103e18)}
      ]
    },
    "bsc-fork": {
      url: `http://127.0.0.1:8545/`,
      accounts: [
        env["bsc-fork"]["Bonding-Deployer-PK"],
        env["bsc-fork"]["Bonding-Keeper-1-PK"],
        env["bsc-fork"]["Bonding-Keeper-2-PK"],
        env["bsc-fork"]["Bonding-Keeper-3-PK"]
      ]
    },
    "bsc": {
      url: `https://bsc-dataseed.binance.org`,
      chainId: 56,
      gasPrice: 1000000000,
      accounts: [
        env["bsc"]["Bonding-Deployer-PK"],
        env["bsc"]["Bonding-Keeper-1-PK"],
        env["bsc"]["Bonding-Keeper-2-PK"],
        env["bsc"]["Bonding-Keeper-3-PK"]
      ]
    }
  }
};
