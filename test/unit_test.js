const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const chai = require("chai");

chai.use(solidity);
const toWei = ethers.utils.parseEther;
const toEth = ethers.utils.formatEther;
const { expect } = chai;

let overrides = { gasLimit: 9500000 };

describe("BadgerYieldSource", function () {
  let badger;
  let badgerSett;
  let wallet;
  let wallet2;
  let yieldSource;
  let amount;

  beforeEach(async function () {
    [wallet, wallet2, wallet3] = await ethers.getSigners();

    const ERC20MintableContract = await ethers.getContractFactory(
      "ERC20Mintable",
      wallet,
      overrides
    );
    badger = await ERC20MintableContract.deploy("Badger", "BADGER");

    const BadgerSettContract = await ethers.getContractFactory(
      "Sett",
      wallet,
      overrides
    );
    badgerSett = await BadgerSettContract.deploy();

    //

    const tokenAddress = badger.address;
    const governanceAddress = wallet.address;
    const guardianAddress = wallet.address;
    const keeperAddress = wallet.address;
    const rewardsAddress = wallet.address;
    const strategistAddress = wallet.address;

    //

    const Controller = await ethers.getContractFactory(
      "Controller",
      wallet,
      overrides
    );
    controller = await Controller.deploy();
    await controller.initialize(
      governanceAddress,
      strategistAddress,
      keeperAddress,
      rewardsAddress
    );

    const Strategy = await ethers.getContractFactory(
      "StrategyBadgerRewards",
      wallet,
      overrides
    );
    strategy = await Strategy.deploy();

    await strategy.initialize(
      governanceAddress,
      strategistAddress,
      controller.address,
      keeperAddress,
      guardianAddress,
      [tokenAddress, badgerSett.address], // want, geyser
      [1000, 1000, 50] // performanceFeeStrategist, performanceFeeGovernance, withdrawalFee
    );

    await controller.approveStrategy(tokenAddress, strategy.address);
    await controller.setStrategy(tokenAddress, strategy.address);

    await badgerSett.initialize(
      tokenAddress,
      controller.address,
      governanceAddress,
      keeperAddress,
      guardianAddress,
      true,
      "Badger Sett Badger",
      "bBADGER"
    );

    const BadgerYieldSourceContract = await ethers.getContractFactory(
      "BadgerYieldSource"
    );
    yieldSource = await BadgerYieldSourceContract.deploy(
      badgerSett.address,
      badger.address,
      overrides
    );

    // whilelist the yield source
    await badgerSett.approveContractAccess(yieldSource.address);

    amount = toWei("100");
    await badger.mint(wallet3.address, amount);
    await badger.mint(wallet2.address, amount.mul(99));
    // let wallet2 deposit some badger into badgersett
    await badger.connect(wallet2).approve(badgerSett.address, amount.mul(99));
    await badgerSett.connect(wallet2).deposit(amount.mul(99));
  });

  it("get token address", async function () {
    let address = await yieldSource.depositToken();
    expect(address == badger);
  });

  it("balanceOfToken", async function () {
    expect(await yieldSource.callStatic.balanceOfToken(wallet3.address)).to.eq(
      0
    );
    expect(await badger.callStatic.balanceOf(wallet3.address)).to.eq(amount);
    await badger.connect(wallet3).approve(yieldSource.address, amount);
    await yieldSource.connect(wallet3).supplyTokenTo(amount, wallet3.address);
    expect(await yieldSource.callStatic.balanceOfToken(wallet3.address)).to.eq(
      amount
    );
    expect(await badger.callStatic.balanceOf(wallet3.address)).to.eq(0);
  });

  it("supplyTokenTo", async function () {
    await badger.connect(wallet3).approve(yieldSource.address, amount);
    await yieldSource.connect(wallet3).supplyTokenTo(amount, wallet3.address);
    expect(await badger.balanceOf(badgerSett.address)).to.eq(amount.mul(100));
    expect(await yieldSource.callStatic.balanceOfToken(wallet3.address)).to.eq(
      amount
    );
  });

  it("redeemToken", async function () {
    await badger.connect(wallet3).approve(yieldSource.address, amount);
    await yieldSource.connect(wallet3).supplyTokenTo(amount, wallet3.address);

    expect(await badger.balanceOf(wallet3.address)).to.eq(0);
    await yieldSource.connect(wallet3).redeemToken(amount);
    expect(await badger.balanceOf(wallet3.address)).to.eq(amount);
  });

  [toWei("100"), toWei("100").mul(10), toWei("100").mul(99)].forEach(function (
    amountToDeposit
  ) {
    it(
      "deposit " + toEth(amountToDeposit) + ", badger accrues, withdrawal",
      async function () {
        await badger.mint(wallet3.address, amountToDeposit.sub(amount));
        await badger
          .connect(wallet3)
          .approve(yieldSource.address, amountToDeposit);
        await yieldSource
          .connect(wallet3)
          .supplyTokenTo(amountToDeposit, wallet3.address);
        // increase total balance by amount
        await badger.mint(badgerSett.address, amount);

        const totalAmount = await yieldSource.callStatic.balanceOfToken(
          wallet3.address
        );
        const expectedAmount = amountToDeposit
          .mul(amountToDeposit.add(amount.mul(100)))
          .div(amountToDeposit.add(amount.mul(99)));
        expect(totalAmount).to.eq(expectedAmount);

        await yieldSource.connect(wallet3).redeemToken(totalAmount);
        expect(await badger.balanceOf(wallet3.address)).to.be.closeTo(
          totalAmount,
          2
        );
      }
    );
  });
});
