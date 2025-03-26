const { task } = require("hardhat/config");
const fs = require('fs')
const path = require('path')

let deployedContractsFilePath

function readDeployedContracts() {
    if (fs.existsSync(deployedContractsFilePath)) {
        return JSON.parse(fs.readFileSync(deployedContractsFilePath))
    }
    return {}
}

function writeDeployedContracts(name, address, hre) {
    let json = {};
    json[name] = address;
    const newJson = Object.assign(readDeployedContracts(hre), json)
    fs.writeFileSync(deployedContractsFilePath, JSON.stringify(newJson))
}

task("deploy-contract", "部署合约")
    // .addParam("参数名(代码中驼峰命名，命令行中为contract-name)", "参数描述", "参数默认值", "参数类型")
    .addParam("contractName", "合约名")
    .addOptionalVariadicPositionalParam("initParams", "初始参数", [])
    .setAction(async (taskArgs, hre) => {
        // 获取部署信息保存文件
        console.log("network:", hre.network.name)
        deployedContractsFilePath = path.join(__dirname, '..', 'deployed', `${hre.network.name}.json`)

        // 部署
        const Swap = await ethers.getContractFactory(taskArgs.contractName);
        const swap = await upgrades.deployProxy(Swap, taskArgs.initParams);

        // 保存部署信息
        const k = taskArgs.contractName;
        const v = await swap.getAddress();
        writeDeployedContracts(k, v);
        console.log("%s deployed at: %s", k, v);
    });