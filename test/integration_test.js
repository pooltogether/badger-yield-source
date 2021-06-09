const { ethers, waffle } = require("hardhat");
const hre = require("hardhat");
const { parseEther } = ethers.utils;
const { BigNumber } = require("ethers");
const { solidity } = require("ethereum-waffle");
const chai = require("chai");
chai.use(solidity);

const { expect } = chai;

async function getEvents(contract, tx) {
  let receipt = await ethers.provider.getTransactionReceipt(tx.hash);
  return receipt.logs.reduce((parsedEvents, log) => {
    try {
      parsedEvents.push(contract.interface.parseLog(log));
    } catch (e) {}
    return parsedEvents;
  }, []);
}

describe("BadgerYieldSource integration", function () {
  let badger;
  let poolWithMultipleWinnersBuilder;
  let factory;
  let prizePool;
  let prizeStrategy;
  let wallet;
  let wallets;
  let yieldSource;
  let badgerSett;
  let exchangeWallet;
  let yieldSourcePrizePoolABI;
  let multipleWinnersABI;
  let governance;
  let badgerHolder;

  before(async function () {
    // deploy all the pool together.
    const TicketProxyFactory = await ethers.getContractFactory(
      "TicketProxyFactory"
    );
    const ticketProxyFactory = await TicketProxyFactory.deploy({
      gasLimit: 20000000,
    });

    const ControlledTokenProxyFactory = await ethers.getContractFactory(
      "ControlledTokenProxyFactory"
    );
    const controlledTokenProxyFactory = await ControlledTokenProxyFactory.deploy(
      { gasLimit: 20000000 }
    );

    const ControlledTokenBuilder = await ethers.getContractFactory(
      "ControlledTokenBuilder"
    );
    const controlledTokenBuilder = await ControlledTokenBuilder.deploy(
      ticketProxyFactory.address,
      controlledTokenProxyFactory.address,
      { gasLimit: 20000000 }
    );

    const MultipleWinnersProxyFactory = await ethers.getContractFactory(
      "MultipleWinnersProxyFactory"
    );
    const multipleWinnersProxyFactory = await MultipleWinnersProxyFactory.deploy(
      { gasLimit: 20000000 }
    );

    const MultipleWinnersBuilder = await ethers.getContractFactory(
      "MultipleWinnersBuilder"
    );
    const multipleWinnersBuilder = await MultipleWinnersBuilder.deploy(
      multipleWinnersProxyFactory.address,
      controlledTokenBuilder.address,
      { gasLimit: 20000000 }
    );

    const StakePrizePoolProxyFactory = await ethers.getContractFactory(
      "StakePrizePoolProxyFactory"
    );
    const stakePrizePoolProxyFactory = await StakePrizePoolProxyFactory.deploy({
      gasLimit: 20000000,
    });

    const YieldSourcePrizePoolProxyFactory = await ethers.getContractFactory(
      "YieldSourcePrizePoolProxyFactory"
    );
    const yieldSourcePrizePoolProxyFactory = await YieldSourcePrizePoolProxyFactory.deploy(
      { gasLimit: 20000000 }
    );

    const CompoundPrizePoolProxyFactory = await ethers.getContractFactory(
      "CompoundPrizePoolProxyFactory"
    );
    const compoundPrizePoolProxyFactory = await CompoundPrizePoolProxyFactory.deploy(
      { gasLimit: 20000000 }
    );

    const Registry = await ethers.getContractFactory("Registry");
    const registry = await Registry.deploy({ gasLimit: 20000000 });

    const PoolWithMultipleWinnersBuilder = await ethers.getContractFactory(
      "PoolWithMultipleWinnersBuilder"
    );
    poolWithMultipleWinnersBuilder = await PoolWithMultipleWinnersBuilder.deploy(
      registry.address,
      compoundPrizePoolProxyFactory.address,
      yieldSourcePrizePoolProxyFactory.address,
      stakePrizePoolProxyFactory.address,
      multipleWinnersBuilder.address,
      { gasLimit: 9500000 }
    );

    const badgerWhaleAddress = "0x28C6c06298d514Db089934071355E5743bf21d60"; // binance-14 // might have to change if wallets are rotated
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [badgerWhaleAddress],
    });
    badgerWhale = await waffle.provider.getSigner(badgerWhaleAddress);

    const governanceAddress = "0xb65cef03b9b89f99517643226d76e286ee999e77";
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [governanceAddress],
    });
    governance = await waffle.provider.getSigner(governanceAddress);

    const exchangeWalletAddress = "0xD551234Ae421e3BCBA99A0Da6d736074f22192FF";
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [exchangeWalletAddress],
    });
    exchangeWallet = await waffle.provider.getSigner(exchangeWalletAddress);

    badger = await ethers.getVerifiedContractAt(
      "0x3472a5a71965499acd81997a54bba8d852c6e53d",
      exchangeWallet
    );
    badgerSett = (
      await ethers.getVerifiedContractAt(
        "0xe4ae305b08434bf3d74e0086592627f913a258a9" // proxy
      )
    ).attach("0x19d97d8fa813ee2f51ad4b4e04ea08baf4dffc28");

    factory = await ethers.getContractFactory("BadgerYieldSource");

    yieldSourcePrizePoolABI = (
      await hre.artifacts.readArtifact("YieldSourcePrizePool")
    ).abi;
    multipleWinnersABI = (await hre.artifacts.readArtifact("MultipleWinners"))
      .abi;
  });

  beforeEach(async function () {
    wallets = await ethers.getSigners();
    wallet = wallets[0];
    // setup

    yieldSource = await factory.deploy(badgerSett.address, badger.address, {
      gasLimit: 9500000,
    });

    const yieldSourcePrizePoolConfig = {
      yieldSource: yieldSource.address,
      maxExitFeeMantissa: parseEther("0.5"),
      maxTimelockDuration: 1000,
    };
    const RGNFactory = await ethers.getContractFactory("RNGServiceMock");
    rngServiceMock = await RGNFactory.deploy({ gasLimit: 9500000 });
    let decimals = 9;

    const multipleWinnersConfig = {
      rngService: rngServiceMock.address,
      prizePeriodStart: 0,
      prizePeriodSeconds: 100,
      ticketName: "badgerpass",
      ticketSymbol: "badgerp",
      sponsorshipName: "badgersponso",
      sponsorshipSymbol: "badgersp",
      ticketCreditLimitMantissa: parseEther("0.1"),
      ticketCreditRateMantissa: parseEther("0.1"),
      externalERC20Awards: [],
      numberOfWinners: 1,
    };

    let tx = await poolWithMultipleWinnersBuilder.createYieldSourceMultipleWinners(
      yieldSourcePrizePoolConfig,
      multipleWinnersConfig,
      decimals
    );
    let events = await getEvents(poolWithMultipleWinnersBuilder, tx);
    let prizePoolCreatedEvent = events.find(
      (e) => e.name == "YieldSourcePrizePoolWithMultipleWinnersCreated"
    );

    prizePool = await ethers.getContractAt(
      yieldSourcePrizePoolABI,
      prizePoolCreatedEvent.args.prizePool,
      wallet
    );
    prizeStrategy = await ethers.getContractAt(
      multipleWinnersABI,
      prizePoolCreatedEvent.args.prizeStrategy,
      wallet
    );

    await badgerSett
      .connect(governance)
      .approveContractAccess(yieldSource.address);

    // get some badger
    await badger
      .connect(badgerWhale)
      .transfer(wallet.address, parseEther("1000"));
    expect(await badger.balanceOf(wallet.address)).to.be.above(0);
  });

  it("should be able to get underlying balance", async function () {
    const amount = parseEther("100");
    await badger.connect(wallet).approve(prizePool.address, amount);
    let [token] = await prizePool.tokens();

    expect(
      await yieldSource.callStatic.balanceOfToken(prizePool.address)
    ).to.equal(0);

    await prizePool.depositTo(
      wallet.address,
      amount,
      token,
      wallets[1].address
    );

    expect(
      await yieldSource.callStatic.balanceOfToken(prizePool.address)
    ).to.be.closeTo(amount, 10);
    expect(await badgerSett.balanceOf(yieldSource.address)).to.be.above(0);
  });

  it("should be able to withdraw", async function () {
    await badger.connect(wallet).approve(prizePool.address, parseEther("100"));
    let [token] = await prizePool.tokens();

    await prizePool.depositTo(
      wallet.address,
      parseEther("100"),
      token,
      wallets[1].address
    );

    const beforeBalance = await badger.balanceOf(wallet.address);
    await prizePool.withdrawInstantlyFrom(
      wallet.address,
      parseEther("1"),
      token,
      1000
    );

    expect(await badger.balanceOf(wallet.address)).to.be.above(beforeBalance);
  });

  it("should be able to withdraw all", async function () {
    await badger.connect(wallet).approve(prizePool.address, parseEther("100"));
    let [token] = await prizePool.tokens();

    const initialBalance = await badger.balanceOf(wallet.address);

    await prizePool.depositTo(
      wallet.address,
      parseEther("100"),
      token,
      wallets[1].address
    );

    expect(await badgerSett.balanceOf(yieldSource.address)).to.not.equal(
      BigNumber.from(0)
    );

    hre.network.provider.send("evm_increaseTime", [10]);

    await expect(
      prizePool.withdrawInstantlyFrom(
        wallet.address,
        parseEther("200"),
        token,
        0
      )
    ).to.be.reverted;

    await prizePool.withdrawInstantlyFrom(
      wallet.address,
      parseEther("100"),
      token,
      0
    );

    expect(await badger.balanceOf(wallet.address)).to.be.closeTo(
      initialBalance,
      10
    );
  });

  it("should not leave funds behind", async function () {
    await badger.connect(wallet).approve(prizePool.address, parseEther("100"));

    let [token] = await prizePool.tokens();

    badger.connect(wallet).transfer(badgerSett.address, parseEther("10"));

    await prizePool.depositTo(
      wallet.address,
      parseEther("10"),
      token,
      wallets[1].address
    );

    hre.network.provider.send("evm_increaseTime", [10]);

    await prizePool.withdrawInstantlyFrom(
      wallet.address,
      parseEther("10"),
      token,
      0
    );
    expect(await badgerSett.balanceOf(yieldSource.address)).to.equal(
      BigNumber.from(0)
    );
  });
});
