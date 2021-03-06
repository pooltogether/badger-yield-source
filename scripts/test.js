const hardhat = require("hardhat");
const chalk = require("chalk");
const BADGER_HOLDER = "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be"; // binance
const { ethers, deployments, getNamedAccounts } = hardhat;
const hre = require("hardhat");

function dim() {
  console.log(chalk.dim.call(chalk, ...arguments));
}

function green() {
  console.log(chalk.green.call(chalk, ...arguments));
}

const toWei = ethers.utils.parseEther;

async function getYieldSourcePrizePoolProxy(tx) {
  const stakePrizePoolProxyFactory = await ethers.getVerifiedContractAt(
    "0x5Ae75894EFcC1f8340b58d0efb3d59Bf366b6A4E"
  );
  const createResultReceipt = await ethers.provider.getTransactionReceipt(
    tx.hash
  );
  const createResultEvents = createResultReceipt.logs.map((log) => {
    try {
      return stakePrizePoolProxyFactory.interface.parseLog(log);
    } catch (e) {
      return null;
    }
  });
  const address = createResultEvents[0].args.proxy;
  dim(`Found pool address at ${address}`);
  return address;
}

async function run() {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [BADGER_HOLDER],
  });

  const badgerHolder = await ethers.provider.getSigner(BADGER_HOLDER);
  const badger = await ethers.getContractAt(
    "IERC20Upgradeable",
    "0x3472a5a71965499acd81997a54bba8d852c6e53d",
    badgerHolder
  );
  const builder = await ethers.getVerifiedContractAt(
    "0x39E2F33ff4Ad3491106B3BB15dc66EbE24e4E9C7"
  );

  BadgerYieldSourceFactory = await ethers.getContractFactory(
    "BadgerYieldSource"
  );
  badgerYieldSource = await BadgerYieldSourceFactory.deploy(
    badger.address,
    "0x19d97d8fa813ee2f51ad4b4e04ea08baf4dffc28"
  );

  const block = await ethers.provider.getBlock();

  const yieldSourcePrizePoolConfig = {
    yieldSource: badgerYieldSource.address,
    maxExitFeeMantissa: ethers.utils.parseEther("0.1"),
    maxTimelockDuration: 300,
  };

  const multipleWinnersConfig = {
    rngService: "0xb1D89477d1b505C261bab6e73f08fA834544CD21",
    prizePeriodStart: block.timestamp,
    prizePeriodSeconds: 1,
    ticketName: "TICKET",
    ticketSymbol: "TICK",
    sponsorshipName: "SPONSORSHIP",
    sponsorshipSymbol: "SPON",
    ticketCreditLimitMantissa: ethers.utils.parseEther("0.1"),
    ticketCreditRateMantissa: "166666666666666",
    numberOfWinners: 1,
    splitExternalErc20Awards: false,
  };

  const tx = await builder.createYieldSourceMultipleWinners(
    yieldSourcePrizePoolConfig,
    multipleWinnersConfig,
    18
  );
  const prizePool = await ethers.getContractAt(
    "YieldSourcePrizePool",
    await getYieldSourcePrizePoolProxy(tx),
    badgerHolder
  );

  green(`Created YieldSourcePrizePool ${prizePool.address}`);

  const prizeStrategy = await ethers.getContractAt(
    "MultipleWinners",
    await prizePool.prizeStrategy(),
    badgerHolder
  );
  const ticketAddress = await prizeStrategy.ticket();
  const ticket = await ethers.getContractAt(
    "Ticket",
    ticketAddress,
    badgerHolder
  );

  const depositAmount = toWei("1000");

  dim(`Approving Badger spend for ${badgerHolder._address}...`);
  await badger.approve(prizePool.address, depositAmount);
  dim(
    `Depositing into Pool with ${badgerHolder._address}, ${depositAmount}, ${ticketAddress} ${ethers.constants.AddressZero}...`
  );
  await prizePool.depositTo(
    badgerHolder._address,
    depositAmount,
    ticketAddress,
    ethers.constants.AddressZero
  );
  dim(
    `Prize Pool badger balance: ${ethers.utils.formatEther(
      await badgerYieldSource.callStatic.balanceOfToken(prizePool.address)
    )}`
  );
  dim(`Withdrawing...`);
  const badgerBalanceBeforeWithdrawal = await badger.balanceOf(
    badgerHolder._address
  );
  await prizePool.withdrawInstantlyFrom(
    badgerHolder._address,
    depositAmount,
    ticketAddress,
    depositAmount
  );
  const badgerDiffAfterWithdrawal = (
    await badger.balanceOf(badgerHolder._address)
  ).sub(badgerBalanceBeforeWithdrawal);
  dim(`Withdrew ${ethers.utils.formatEther(badgerDiffAfterWithdrawal)} badger`);

  dim(
    `Prize Pool badger balance: ${ethers.utils.formatEther(
      await badgerYieldSource.callStatic.balanceOfToken(prizePool.address)
    )}`
  );

  // now there should be some prize
  await prizePool.captureAwardBalance();
  console.log(
    `Prize is now: ${ethers.utils.formatEther(await prizePool.awardBalance())}`
  );

  await badger.approve(prizePool.address, depositAmount);
  await prizePool.depositTo(
    badgerHolder._address,
    depositAmount,
    await prizeStrategy.ticket(),
    ethers.constants.AddressZero
  );

  dim(`Starting award...`);
  await prizeStrategy.startAward();

  hre.network.provider.send("evm_increaseTime", [301]);
  await hre.network.provider.send("evm_mine", []);

  dim(`Completing award...`);
  const awardTx = await prizeStrategy.completeAward();
  const awardReceipt = await ethers.provider.getTransactionReceipt(
    awardTx.hash
  );
  const awardLogs = awardReceipt.logs.map((log) => {
    try {
      return prizePool.interface.parseLog(log);
    } catch (e) {
      return null;
    }
  });
  const strategyLogs = awardReceipt.logs.map((log) => {
    try {
      return prizeStrategy.interface.parseLog(log);
    } catch (e) {
      return null;
    }
  });

  // console.log({ awardLogs })
  // console.log({ strategyLogs })

  const awarded = awardLogs.find((event) => event && event.name === "Awarded");

  if (awarded) {
    console.log(
      `Awarded ${ethers.utils.formatEther(awarded.args.amount)} Badger`
    );
  } else {
    console.log(`No prizes`);
  }

  const badgerBalance = await badger.balanceOf(badgerHolder._address);
  const balance = await ticket.balanceOf(badgerHolder._address);
  dim(`Users balance is ${ethers.utils.formatEther(balance)}`);
  await prizePool.withdrawInstantlyFrom(
    badgerHolder._address,
    balance,
    ticketAddress,
    balance
  );

  const badgerDiff = (await badger.balanceOf(badgerHolder._address)).sub(
    badgerBalance
  );
  dim(`Amount withdrawn is ${ethers.utils.formatEther(badgerDiff)}`);
}

run();
