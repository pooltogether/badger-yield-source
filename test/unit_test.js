const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { deployMockContract } = require("ethereum-waffle");
const { smoddit } = require("@eth-optimism/smock");
const chai = require("chai");
const { BigNumber } = require("ethers");

chai.use(solidity);
const toWei = ethers.utils.parseEther;
const { expect } = chai;

let overrides = { gasLimit: 9500000 };

describe("SushiYieldSource", function () {
  let sushi;
  let sushiBar;
  let wallet;
  let wallets;
  let yieldSource;

  before(async function () {
    wallets = await ethers.getSigners();
    wallet = wallets[0];
  });

  beforeEach(async function () {
    wallets = await ethers.getSigners();
    wallet = wallets[0];

    const ISUSHI = await hre.artifacts.readArtifact("ISushi");
    sushi = await deployMockContract(wallet, ISUSHI.abi, overrides);

    const ISUSHIBAR = await hre.artifacts.readArtifact("ISushiBar");
    sushiBar = await deployMockContract(wallet, ISUSHIBAR.abi, overrides);
    let factory = await smoddit("SushiYieldSource");

    yieldSource = await factory.deploy(
      sushiBar.address,
      sushi.address,
      overrides
    );
  });

  it("get token address", async function () {
    let address = await yieldSource.depositToken();
    expect(address == sushi);
  });

  it("supplyTokenTo and redeemToken", async function () {
    amount = toWei("100");
    // Supply
    await sushi.mock.transferFrom
      .withArgs(wallet.address, yieldSource.address, amount)
      .returns(true);
    await sushi.mock.approve.withArgs(sushiBar.address, amount).returns(true);
    await sushiBar.mock.balanceOf.withArgs(yieldSource.address).returns(0);
    await sushiBar.mock.enter.withArgs(amount).returns();
    await sushiBar.mock.balanceOf.withArgs(yieldSource.address).returns(amount);
    await yieldSource.supplyTokenTo(amount, wallet.address);

    // redeem
    await sushiBar.mock.totalSupply.returns(amount);
    await sushi.mock.balanceOf.withArgs(sushiBar.address).returns(amount);
    await sushi.mock.balanceOf.withArgs(yieldSource.address).returns(0);
    await sushiBar.mock.balanceOf.withArgs(yieldSource.address).returns(amount);
    await sushiBar.mock.leave.withArgs(amount).returns();
    await sushi.mock.balanceOf.withArgs(yieldSource.address).returns(amount); // Doesn't seems to work, would need some method to mockOnce.
    await sushiBar.mock.balanceOf.withArgs(yieldSource.address).returns(0);
    await sushi.mock.transfer.withArgs(wallet.address, 0).returns(true);
    await yieldSource.redeemToken(amount);
  });
  it("call balanceOfToken", async function () {
    amount = 1000;

    expect(await yieldSource.callStatic.balanceOfToken(wallet.address)).to.eq(
      0
    );

    await sushiBar.mock.totalSupply.returns(amount * 100);
    await sushi.mock.balanceOf.withArgs(sushiBar.address).returns(amount * 120);
    // 1xSushi = 1.2 sushi
    await sushiBar.mock.balanceOf
      .withArgs(yieldSource.address)
      .returns(amount * 2);

    yieldSource.smodify.put({
      balances: {
        [wallet.address]: amount,
        [wallets[1].address]: amount,
      },
    });
    expect(await yieldSource.callStatic.balanceOfToken(wallet.address)).to.eq(
      BigNumber.from(amount).mul(12).div(10)
    );
  });

  it("deposit, sushi accrues, withdrawal", async function () {
    // User deposit into the yield source
    amount = 10000;
    await sushiBar.mock.totalSupply.returns(amount * 100);
    await sushi.mock.balanceOf.withArgs(sushiBar.address).returns(amount * 100);
    // 1xsushi = 1 sushi
    yieldSource.smodify.put({
      balances: {
        [wallet.address]: amount,
        [wallets[1].address]: amount,
      },
    });

    await sushiBar.mock.balanceOf
      .withArgs(yieldSource.address)
      .returns(amount * 2);
    expect(await yieldSource.callStatic.balanceOfToken(wallet.address)).to.eq(
      BigNumber.from(amount)
    );
    // SushiBar value increase by 20%, 1xsushi = 1 sushi
    await sushi.mock.balanceOf.withArgs(sushiBar.address).returns(amount * 120);
    expect(await yieldSource.callStatic.balanceOfToken(wallet.address)).to.eq(
      BigNumber.from(amount).mul(12).div(10)
    );
    await sushi.mock.balanceOf.withArgs(yieldSource.address).returns(0);
    await sushiBar.mock.leave.withArgs(amount).returns();
    await sushi.mock.transfer.withArgs(wallet.address, 0).returns(0);

    await yieldSource.redeemToken(amount * 1.2);
  });
});
