const { ethers, waffle } = require("hardhat");
const hre = require("hardhat");
const { expect } = require("chai");
const { AddressZero } = ethers.constants;
const toWei = ethers.utils.parseEther;
const { BigNumber } = require("ethers");
const { deployments } = require("hardhat");

const yieldSourcePrizePoolABI = require("@pooltogether/pooltogether-contracts/abis/YieldSourcePrizePool.json");
const multipleWinnersABI = require("@pooltogether/pooltogether-contracts/abis/MultipleWinners.json");

async function getEvents(contract, tx) {
  let receipt = await ethers.provider.getTransactionReceipt(tx.hash);
  return receipt.logs.reduce((parsedEvents, log) => {
    try {
      parsedEvents.push(contract.interface.parseLog(log));
    } catch (e) {}
    return parsedEvents;
  }, []);
}

describe("SushiYieldSource", function () {
  let sushi;
  let sushiDecimals;
  let poolWithMultipleWinnersBuilder;
  let factory;
  let prizePool;
  let prizeStrategy;
  let wallet;
  let wallets;
  let yieldSource;
  let sushiBar;
  let exchangeWallet;
  before(async function () {
    // deploy all the pool together.
    const TicketProxyFactory = await ethers.getContractFactory("TicketProxyFactory");
    const ticketProxyFactory = await TicketProxyFactory.deploy({ gasLimit: 20000000 }); 

    const ControlledTokenProxyFactory = await ethers.getContractFactory("ControlledTokenProxyFactory");
    const controlledTokenProxyFactory = await ControlledTokenProxyFactory.deploy({ gasLimit: 20000000 }); 

    const ControlledTokenBuilder = await ethers.getContractFactory("ControlledTokenBuilder");
    const controlledTokenBuilder = await ControlledTokenBuilder.deploy(ticketProxyFactory.address, controlledTokenProxyFactory.address, { gasLimit: 20000000 }); 

    const MultipleWinnersProxyFactory = await ethers.getContractFactory("MultipleWinnersProxyFactory");
    const multipleWinnersProxyFactory = await MultipleWinnersProxyFactory.deploy({ gasLimit: 20000000 }); 

    const MultipleWinnersBuilder = await ethers.getContractFactory("MultipleWinnersBuilder");
    const multipleWinnersBuilder = await MultipleWinnersBuilder.deploy(multipleWinnersProxyFactory.address, controlledTokenBuilder.address, { gasLimit: 20000000 }); 

    const StakePrizePoolProxyFactory = await ethers.getContractFactory("StakePrizePoolProxyFactory");
    const stakePrizePoolProxyFactory = await StakePrizePoolProxyFactory.deploy({ gasLimit: 20000000 }); 

    const YieldSourcePrizePoolProxyFactory = await ethers.getContractFactory("YieldSourcePrizePoolProxyFactory");
    const yieldSourcePrizePoolProxyFactory = await YieldSourcePrizePoolProxyFactory.deploy({ gasLimit: 20000000 }); 

    const CompoundPrizePoolProxyFactory = await ethers.getContractFactory("CompoundPrizePoolProxyFactory");
    const compoundPrizePoolProxyFactory = await CompoundPrizePoolProxyFactory.deploy({ gasLimit: 20000000 }); 

    const Registry = await ethers.getContractFactory("Registry");
    const registry = await Registry.deploy({ gasLimit: 20000000 }); 
    
    const PoolWithMultipleWinnersBuilder = await ethers.getContractFactory("PoolWithMultipleWinnersBuilder");
    poolWithMultipleWinnersBuilder = await PoolWithMultipleWinnersBuilder.deploy(
      registry.address,
      compoundPrizePoolProxyFactory.address,
      yieldSourcePrizePoolProxyFactory.address,
      stakePrizePoolProxyFactory.address,
      multipleWinnersBuilder.address,
      { gasLimit: 9500000 });
   
   const exchangeWalletAddress = "0xD551234Ae421e3BCBA99A0Da6d736074f22192FF";
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [exchangeWalletAddress],
    });
    exchangeWallet = await waffle.provider.getSigner(exchangeWalletAddress);
    sushi = await ethers.getVerifiedContractAt(
      "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
      exchangeWallet
    );
    sushiBar = await ethers.getVerifiedContractAt(
      "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272"
    );

    sushiDecimals = await sushi.decimals();
    factory = await ethers.getContractFactory("SushiYieldSource");
  });

  beforeEach(async function () {
    wallets = await ethers.getSigners();
    wallet = wallets[0];
    // setup

    yieldSource = await factory.deploy({ gasLimit: 9500000 });
    const yieldSourcePrizePoolConfig = {
      yieldSource: yieldSource.address,
      maxExitFeeMantissa: toWei("0.5"),
      maxTimelockDuration: 1000,
    };
    const RGNFactory = await ethers.getContractFactory("RNGServiceMock");
    rngServiceMock = await RGNFactory.deploy({ gasLimit: 9500000 });
    let decimals = 9;

    const multipleWinnersConfig = {
      proxyAdmin: AddressZero,
      rngService: rngServiceMock.address,
      prizePeriodStart: 0,
      prizePeriodSeconds: 100,
      ticketName: "sushipass",
      ticketSymbol: "suship",
      sponsorshipName: "sushisponso",
      sponsorshipSymbol: "sushisp",
      ticketCreditLimitMantissa: toWei("0.1"),
      ticketCreditRateMantissa: toWei("0.1"),
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

    // get some sushi
    await sushi.transfer(
      wallet.address,
      BigNumber.from(1000).mul(BigNumber.from(10).pow(sushiDecimals))
    );
  });

  it("get token address", async function () {
    expect((await yieldSource.depositToken()) == sushi);
  });

  it("should be able to get underlying balance", async function () {
    await sushi.connect(wallet).approve(prizePool.address, toWei("100"));
    let [token] = await prizePool.tokens();
    console.log("AAAAAAA")
    await prizePool.depositTo(
      wallet.address,
      toWei("100"),
      token,
      wallets[1].address
    );
    console.log("BBBBBB")

    expect(await sushiBar.balanceOf(prizePool.address)) != 0;
  });

  it("should be able to withdraw", async function () {
    await sushi.connect(wallet).approve(prizePool.address, toWei("100"));
    let [token] = await prizePool.tokens();

    await prizePool.depositTo(
      wallet.address,
      toWei("100"),
      token,
      wallets[1].address
    );
    expect(await sushiBar.balanceOf(prizePool.address)) != 0;

    const balanceBefore = await sushi.balanceOf(wallet.address);
    await prizePool.withdrawInstantlyFrom(
      wallet.address,
      toWei("1"),
      token,
      1000
    );
    expect(await sushiBar.balanceOf(wallet.address)) > balanceBefore;
  });

  it("should be able to withdraw all", async function () {
    await sushi.connect(wallet).approve(prizePool.address, toWei("100"));
    let [token] = await prizePool.tokens();

    const initialBalance = await sushi.balanceOf(wallet.address);

    await prizePool.depositTo(
      wallet.address,
      toWei("100"),
      token,
      wallets[1].address
    );

    expect(await sushiBar.balanceOf(prizePool.address)) != 0;

    hre.network.provider.send("evm_increaseTime", [1000]);

    await expect(
      prizePool.withdrawInstantlyFrom(wallet.address, toWei("200"), token, 0)
    ).to.be.reverted;

    await prizePool.withdrawInstantlyFrom(
      wallet.address,
      toWei("100"),
      token,
      0
    );

    expect(await sushi.balanceOf(wallet.address)) == initialBalance;
  });
});
