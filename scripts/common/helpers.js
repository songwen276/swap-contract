async function showBalance(account) {
    const balance = await ethers.provider.getBalance(account);
    console.log("%s balance: %s", account, ethers.formatEther(balance));
}

async function showERC20Balance(tokenAddress, account) {
    const ERC20 = await ethers.getContractAt("IWETH", tokenAddress);
    const balance = await ERC20.balanceOf(account);
    const symbol = await ERC20.symbol();
    console.log("%s balance: %s %s", account, ethers.formatEther(balance), symbol);
}

async function showERC20Allowance(tokenAddress, owner, spender) {
    const ERC20 = await ethers.getContractAt("IWETH", tokenAddress);
    const allowance = await ERC20.allowance(owner, spender);
    console.log("%s allowance %s %s", owner, spender, ethers.formatEther(allowance));
}

async function approveERC20(tokenAddress, msgSender, spender, amount) {
    const ERC20 = await ethers.getContractAt("IWETH", tokenAddress);
    await ERC20.connect(msgSender).approve(spender, ethers.parseEther(amount));
    console.log("%s approve %s %s", msgSender.address, spender, amount);
}

async function transferERC20(tokenAddress, from, to, amount) {
    const ERC20 = await ethers.getContractAt("IWETH", tokenAddress);
    await ERC20.connect(from).transfer(to, ethers.parseEther(amount));
    console.log("%s transfer %s to %s", from.address, amount, to);
}

async function depositERC20(tokenAddress, msgSender, amount) {
    const ERC20 = await ethers.getContractAt("IWETH", tokenAddress);
    await ERC20.connect(msgSender).deposit({ value: ethers.parseEther(amount) });
    console.log("%s deposit %s to WBNB", msgSender.address, amount);
}

module.exports = {
    showBalance,
    showERC20Balance,
    showERC20Allowance,
    approveERC20,
    transferERC20,
    depositERC20
}
