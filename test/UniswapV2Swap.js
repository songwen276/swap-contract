const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const tokens = require("../scripts/common/tokens.json")[network.name];
const { showERC20Balance, transferERC20, depositERC20 } = require("../scripts/common/helpers");

const uniswapV2Pair = "0x0D9044415aee4449a7CD8B9D475820B75b9aC80B"
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("UniswapV2Swap", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploySwapFixture() {
    // Contracts are deployed using the first signer/account by default
    const [deployer, keeper1, keeper2, keeper3] = await ethers.getSigners();

    const Swap = await ethers.getContractFactory("UniswapV2Swap");
    const swap = await upgrades.deployProxy(Swap, []);

    return { swap, deployer, keeper1, keeper2, keeper3 };
  }

  describe("Deployment", function () {
    it("deploy and update proxy", async function () {
      // Deploy BondingVault contract first
      const { swap } = await loadFixture(deploySwapFixture);

      // Upgrade after modifying BondingVault contract code
      const addr = await swap.getAddress();
      const Swap = await ethers.getContractFactory("UniswapV2Swap");
      const swapUpdate = await upgrades.upgradeProxy(addr, Swap);
      expect(await swapUpdate.getAddress()).to.equal(addr);

      // Set new value from upgraded instance, get the new value from old and upgraded instance
      expect(await swap.addPair(uniswapV2Pair, tokens.USDT.address, tokens.WBNB.address)).not.to.be.reverted;
      const pairUpdate = await swapUpdate.pairs(0);
      expect(pairUpdate.pairAddress).to.equal(uniswapV2Pair);
      expect(pairUpdate.token0).to.equal(tokens.USDT.address);
      expect(pairUpdate.token1).to.equal(tokens.WBNB.address);
      const pair = await swap.pairs(0);
      expect(pair.pairAddress).to.equal(uniswapV2Pair);
      expect(pair.token0).to.equal(tokens.USDT.address);
      expect(pair.token1).to.equal(tokens.WBNB.address);
    });
  });

  describe("Roles", function () {
    it("Initiate the right roles", async function () {
      const { swap, deployer, keeper1 } = await loadFixture(deploySwapFixture);

      let DEFAULT_ADMIN_ROLE = await swap.DEFAULT_ADMIN_ROLE();
      let KEEPER = await swap.KEEPER();
      let WHITELIST = await swap.WHITELIST();

      expect(await swap.getRoleAdmin(DEFAULT_ADMIN_ROLE)).to.equal(DEFAULT_ADMIN_ROLE);
      expect(await swap.getRoleAdmin(KEEPER)).to.equal(DEFAULT_ADMIN_ROLE);
      expect(await swap.getRoleAdmin(WHITELIST)).to.equal(DEFAULT_ADMIN_ROLE);

      expect(await swap.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.equal(true);
      expect(await swap.hasRole(KEEPER, deployer.address)).to.equal(false);
      expect(await swap.hasRole(WHITELIST, deployer.address)).to.equal(false);

      expect(await swap.hasRole(DEFAULT_ADMIN_ROLE, keeper1.address)).to.equal(false);
      expect(await swap.hasRole(KEEPER, keeper1.address)).to.equal(false);
      expect(await swap.hasRole(WHITELIST, keeper1.address)).to.equal(false);
    });

    it("RBAC: Only DEFAULT_ADMIN_ROLE can grant roles", async function () {
      const { swap, keeper1 } = await loadFixture(deploySwapFixture);

      let KEEPER = await swap.KEEPER();

      await expect(swap.connect(keeper1).grantRole(KEEPER, keeper1.address)).to.be.reverted;
      expect(await swap.hasRole(KEEPER, keeper1.address)).to.equal(false);

      await expect(swap.grantRole(KEEPER, keeper1.address)).to.emit(swap, "RoleGranted");
      expect(await swap.hasRole(KEEPER, keeper1.address)).to.equal(true);

      await expect(swap.revokeRole(KEEPER, keeper1.address)).to.emit(swap, "RoleRevoked");
      expect(await swap.hasRole(KEEPER, keeper1.address)).to.equal(false);
    });

  });

  describe("Functions", function () {
    describe("addPair", function () {
      it("only DEFAULT_ADMIN_ROLE", async function () {
        const { swap, keeper1 } = await loadFixture(deploySwapFixture);

        await expect(swap.addPair(uniswapV2Pair, tokens.USDT.address, tokens.WBNB.address)).not.to.be.reverted;
        await expect(swap.connect(keeper1).addPair("0xFc7AC742C051Ca19B9eA5725280eAAB5b3073534", tokens.USDC.address, tokens.WBNB.address)).to.be.reverted;
      });

      it("token is not address(0)", async function () {
        const { swap } = await loadFixture(deploySwapFixture);
        expect(swap.addPair(ZERO_ADDRESS, tokens.USDT.address, tokens.WBNB.address)).to.be.revertedWith("INVALID_ADDRESS(0)");
        expect(swap.addPair(uniswapV2Pair, ZERO_ADDRESS, tokens.WBNB.address)).to.be.revertedWith("INVALID_ADDRESS(0)");
        expect(swap.addPair(uniswapV2Pair, tokens.USDT.address, ZERO_ADDRESS)).to.be.revertedWith("INVALID_ADDRESS(0)");
      });

      it("token cannot be repeated", async function () {
        const { swap } = await loadFixture(deploySwapFixture);
        await expect(swap.addPair(uniswapV2Pair, tokens.USDT.address, tokens.WBNB.address)).not.to.be.reverted;
        await expect(swap.addPair(uniswapV2Pair, tokens.USDT.address, tokens.WBNB.address)).to.be.revertedWithCustomError(swap, "PairExsits");
      });
    });

    describe("calculateAmount", function () {
      it("the token1 cost of getting 1 token0", async function () {
        const { swap } = await loadFixture(deploySwapFixture);

        const token1Cost = await swap.calculateAmount(uniswapV2Pair, ethers.parseEther("1"), 0, true, 3, 1000);
        console.log("the token1 cost of getting 1 token0: %s", ethers.formatEther(token1Cost));
      });

      it("spending 1 token0 to get token1", async function () {
        const { swap } = await loadFixture(deploySwapFixture);

        const token1Get = await swap.calculateAmount(uniswapV2Pair, ethers.parseEther("1"), 0, false, 3, 1000);
        console.log("spending 1 token0 to get token1: %s", ethers.formatEther(token1Get));
      });

      it("the token0 cost of getting 0.1 token1", async function () {
        const { swap } = await loadFixture(deploySwapFixture);

        const token0Cost = await swap.calculateAmount(uniswapV2Pair, ethers.parseEther("0.1"), 1, true, 3, 1000);
        console.log("the token0 cost of getting 0.1 token1: %s", ethers.formatEther(token0Cost));
      });

      it("spending 1 token1 to get token0", async function () {
        const { swap } = await loadFixture(deploySwapFixture);

        const token0Get = await swap.calculateAmount(uniswapV2Pair, ethers.parseEther("1"), 1, false, 3, 1000);
        console.log("spending 1 token1 to get token0: %s", ethers.formatEther(token0Get));
      });

      it("tokenNum can only be 0 or 1", async function () {
        const { swap } = await loadFixture(deploySwapFixture);

        expect(swap.calculateAmount(uniswapV2Pair, ethers.parseEther("1"), 3, false)).to.be.revertedWith("only 0 or 1");
      });

      it("amountGet > reserve", async function () {
        const { swap } = await loadFixture(deploySwapFixture);

        expect(swap.calculateAmount(uniswapV2Pair, ethers.parseEther("1"), 1, true, 3, 1000)).to.be.revertedWith("amountGet >= reserve");
      });

    });

    describe("swap", function () {
      let swap;
      let deployer;
      beforeEach(async function () {
        ({ swap, deployer } = await loadFixture(deploySwapFixture));
        await depositERC20(tokens.WBNB.address, deployer, "2");
        await transferERC20(tokens.WBNB.address, deployer, swap.target, "1");
        await showERC20Balance(tokens.USDT.address, swap.target);
        await showERC20Balance(tokens.WBNB.address, swap.target);
        await expect(swap.addPair(uniswapV2Pair, tokens.USDT.address, tokens.WBNB.address)).not.to.be.reverted;
    })

      it("swap USDT to get WBNB", async function () {
        const token1Cost = await swap.calculateAmount(uniswapV2Pair, ethers.parseEther("1"), 0, true, 3, 1000);
        expect(await swap.swap(uniswapV2Pair, ethers.parseEther("1"), tokens.USDT.address, token1Cost, 3, 1000)).not.to.be.reverted;
        await showERC20Balance(tokens.USDT.address, swap.target);
        await showERC20Balance(tokens.WBNB.address, swap.target);

        const token1Get = await swap.calculateAmount(uniswapV2Pair, ethers.parseEther("1"), 0, false, 3, 1000);
        console.log("spending 1 token0 to get token1: %s", ethers.formatEther(token1Get));
        expect(await swap.swap(uniswapV2Pair, token1Get, tokens.WBNB.address, ethers.parseEther("1"), 3, 1000)).not.to.be.reverted;
        await showERC20Balance(tokens.USDT.address, swap.target);
        await showERC20Balance(tokens.WBNB.address, swap.target);
      });

      it("swap WBNB to get USDT", async function () {
        const token1Cost = await swap.calculateAmount(uniswapV2Pair, ethers.parseEther("1"), 0, true, 3, 1000);
        console.log("the token1 cost of getting 1 token0: %s", ethers.formatEther(token1Cost));
        expect(await swap.swap(uniswapV2Pair, ethers.parseEther("1"), tokens.USDT.address, token1Cost, 3, 1000)).not.to.be.reverted;
        await showERC20Balance(tokens.USDT.address, swap.target);
        await showERC20Balance(tokens.WBNB.address, swap.target);
      });
    });

  });

});
