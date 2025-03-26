# Bonding Contract

### Setting up a Hardhat Project

```shell
npm install --save-dev hardhat
# run the following command ，init your project
npx hardhat init  
```

### Install OpenZeppelin Hardhat Upgrades Plugin

```shell
npm install --save-dev @openzeppelin/hardhat-upgrades
```

### Importing OpenZeppelin Contracts

```shell
npm install @openzeppelin/contracts
npm install @openzeppelin/contracts-upgradeable
```

### Create Mnemonics

```shell
npm install --save-dev ganache-cli
ganache-cli
```

### Command simplification

```shell
# npx hardhat ==> hh
npm install --global hardhat-shorthand

# tab completion
hardhat-completion install
```

### Run Hardhat localhost node forked from BSC Mainnet

```shell
hh --fork https://rpc.ankr.com/bsc --fork-block-number 45352299
```

same as:

```shell
# Use hardhat.config.js default network: hardhat
hh node
```

### Test Contract

```shell
hh test test/PlanetSwap.js
```

### Run task to deploy or upgrade Contract

```shell
hh compile
hh deploy-contract --contract-name name --init-params "args1" "args2" "args3" ... --network bsc-fork
hh upgrade-contract --contract-name name --network bsc-fork
```