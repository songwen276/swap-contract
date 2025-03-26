const { task } = require("hardhat/config");

task("upgrade-contract", "升级合约")
    // .addParam("参数名(代码中驼峰命名，命令行中为contract-name)", "参数描述", "参数默认值", "参数类型")
    .addParam("contractName", "合约名")
    .setAction(async (taskArgs, hre) => {
        const contracts = require(`../deployed/${hre.network.name}.json`);
        // 升级
        const Swap = await ethers.getContractFactory(taskArgs.contractName);
        const swap = await upgrades.upgradeProxy(contracts[taskArgs.contractName], Swap);

        console.log("%s upgraded at: %s", taskArgs.contractName, await swap.getAddress());
    });