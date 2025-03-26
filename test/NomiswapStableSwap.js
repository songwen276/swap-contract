const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const tokens = require("../scripts/common/tokens.json")[network.name];
const { showERC20Balance, transferERC20, depositERC20 } = require("../scripts/common/helpers");

const nomiswapStableSwap = "0x3A667100753cFb7538208Af98Cb472F65F10Da87"
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("NomiswapStableSwap", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploySwapFixture() {
    // Contracts are deployed using the first signer/account by default
    const [deployer, keeper1, keeper2, keeper3] = await ethers.getSigners();

    const Swap = await ethers.getContractFactory("NomiswapStableSwap");
    const swap = await upgrades.deployProxy(Swap, []);

    return { swap, deployer, keeper1, keeper2, keeper3 };
  }

  describe("Deployment", function () {
    it("deploy and update proxy", async function () {
      // Deploy BondingVault contract first
      const { swap } = await loadFixture(deploySwapFixture);

      // Upgrade after modifying BondingVault contract code
      const addr = await swap.getAddress();
      const Swap = await ethers.getContractFactory("NomiswapStableSwap");
      const swapUpdate = await upgrades.upgradeProxy(addr, Swap);
      expect(await swapUpdate.getAddress()).to.equal(addr);

      // Set new value from upgraded instance, get the new value from old and upgraded instance
      expect(await swap.addPair(nomiswapStableSwap, tokens.USDT.address, tokens.BUSD.address)).not.to.be.reverted;
      const pairUpdate = await swapUpdate.pairs(0);
      expect(pairUpdate.pairAddress).to.equal(nomiswapStableSwap);
      expect(pairUpdate.token0).to.equal(tokens.USDT.address);
      expect(pairUpdate.token1).to.equal(tokens.BUSD.address);
      const pair = await swap.pairs(0);
      expect(pair.pairAddress).to.equal(nomiswapStableSwap);
      expect(pair.token0).to.equal(tokens.USDT.address);
      expect(pair.token1).to.equal(tokens.BUSD.address);
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

        await expect(swap.addPair(nomiswapStableSwap, tokens.USDT.address, tokens.BUSD.address)).not.to.be.reverted;
        await expect(swap.connect(keeper1).addPair("0xFc7AC742C051Ca19B9eA5725280eAAB5b3073534", tokens.USDC.address, tokens.BUSD.address)).to.be.reverted;
      });

      it("token is not address(0)", async function () {
        const { swap } = await loadFixture(deploySwapFixture);
        expect(swap.addPair(ZERO_ADDRESS, tokens.USDT.address, tokens.BUSD.address)).to.be.revertedWith("INVALID_ADDRESS(0)");
        expect(swap.addPair(nomiswapStableSwap, ZERO_ADDRESS, tokens.BUSD.address)).to.be.revertedWith("INVALID_ADDRESS(0)");
        expect(swap.addPair(nomiswapStableSwap, tokens.USDT.address, ZERO_ADDRESS)).to.be.revertedWith("INVALID_ADDRESS(0)");
      });

      it("token cannot be repeated", async function () {
        const { swap } = await loadFixture(deploySwapFixture);
        await expect(swap.addPair(nomiswapStableSwap, tokens.USDT.address, tokens.BUSD.address)).not.to.be.reverted;
        await expect(swap.addPair(nomiswapStableSwap, tokens.USDT.address, tokens.BUSD.address)).to.be.revertedWithCustomError(swap, "PairExsits");
      });
    });

    describe("calculateAmount", function () {
      let swap;
      beforeEach(async function () {
        ({swap} = await loadFixture(deploySwapFixture));
        await expect(swap.addPair(nomiswapStableSwap, tokens.USDT.address, tokens.BUSD.address)).not.to.be.reverted;
      });

      it("the token1 cost of getting 1 token0", async function () {
        const token1Cost = await swap.calculateAmount(nomiswapStableSwap, ethers.parseEther("1"), 0, true);
        console.log("the token1 cost of getting 1 token0: %s", ethers.formatEther(token1Cost));
      });

      it("spending 1 token0 to get token1", async function () {
        const token1Get = await swap.calculateAmount(nomiswapStableSwap, ethers.parseEther("1"), 0, false);
        console.log("spending 1 token0 to get token1: %s", ethers.formatEther(token1Get));
      });

      it("the token0 cost of getting 1 token1", async function () {
        const token0Cost = await swap.calculateAmount(nomiswapStableSwap, ethers.parseEther("1"), 1, true);
        console.log("the token0 cost of getting 1 token1: %s", ethers.formatEther(token0Cost));
      });

      it("spending 1 token1 to get token0", async function () {
        const token0Get = await swap.calculateAmount(nomiswapStableSwap, ethers.parseEther("1"), 1, false);
        console.log("spending 1 token1 to get token0: %s", ethers.formatEther(token0Get));
      });

      it("tokenNum can only be 0 or 1", async function () {
        expect(swap.calculateAmount(nomiswapStableSwap, ethers.parseEther("1"), 3, false)).to.be.revertedWith("only 0 or 1");
      });

      it("PAIR_NOT_EXISTS", async function () {
        expect(swap.calculateAmount(ZERO_ADDRESS, ethers.parseEther("1"), 1, false)).to.be.revertedWith("PAIR_NOT_EXISTS");
      });

    });

    describe("swap", function () {
      let swap;
      let swapRouter = "0x1b81D678ffb9C0263b24A97847620C99d213eB14";
      let deployer;
      beforeEach(async function () {
        ({ swap, deployer } = await loadFixture(deploySwapFixture));

        const pancakeV3SwapRouter = await ethers.getContractAt("IPancakeV3SwapRouter", swapRouter);

        const params = {
          tokenIn: tokens.WBNB.address,
          tokenOut: tokens.USDT.address,
          fee: 500,
          recipient: deployer.address,
          deadline: Math.floor(Date.now() / 1000) + 60 * 10,
          amountIn: ethers.parseEther("1"),
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0
        };
        await pancakeV3SwapRouter.exactInputSingle(params, { value: ethers.parseEther("1") });
        await showERC20Balance(tokens.USDT.address, deployer.address);
        await showERC20Balance(tokens.BUSD.address, deployer.address);

        await transferERC20(tokens.USDT.address, deployer, swap.target, "10");
        await showERC20Balance(tokens.USDT.address, swap.target);
        await showERC20Balance(tokens.BUSD.address, swap.target);
        await expect(swap.addPair(nomiswapStableSwap, tokens.USDT.address, tokens.BUSD.address)).not.to.be.reverted;
      });


      it("swap USDT to get BUSD", async function () {
        const token0Cost = await swap.calculateAmount(nomiswapStableSwap, ethers.parseEther("1"), 1, true);
        console.log("the token0 cost of getting 1 token1: %s", ethers.formatEther(token0Cost));
        expect(await swap.swap(nomiswapStableSwap, ethers.parseEther("1"), tokens.BUSD.address, token0Cost)).not.to.be.reverted;
        await showERC20Balance(tokens.USDT.address, swap.target);
        await showERC20Balance(tokens.BUSD.address, swap.target);
      });

      it("swap BUSD to get USDT", async function () {
        const token0Cost = await swap.calculateAmount(nomiswapStableSwap, ethers.parseEther("2"), 1, true);
        console.log("the token0 cost of getting 1 token1: %s", ethers.formatEther(token0Cost));
        expect(await swap.swap(nomiswapStableSwap, ethers.parseEther("2"), tokens.BUSD.address, token0Cost)).not.to.be.reverted;
        await showERC20Balance(tokens.USDT.address, swap.target);
        await showERC20Balance(tokens.BUSD.address, swap.target);

        const token0Get = await swap.calculateAmount(nomiswapStableSwap, ethers.parseEther("1"), 1, false);
        console.log("spending 1 token1 to get token0: %s", ethers.formatEther(token0Get));
        expect(await swap.swap(nomiswapStableSwap, token0Get, tokens.USDT.address, ethers.parseEther("1"))).not.to.be.reverted;
        await showERC20Balance(tokens.USDT.address, swap.target);
        await showERC20Balance(tokens.BUSD.address, swap.target);
      });

    });

  });

});
