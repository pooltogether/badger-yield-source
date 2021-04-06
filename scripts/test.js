const hardhat = require('hardhat')
const chalk = require("chalk")
const SUSHI_HOLDER = "0xE93381fB4c4F14bDa253907b18faD305D799241a"
const { ethers, deployments, getNamedAccounts } = hardhat
const hre = require("hardhat");

function dim() {
    console.log(chalk.dim.call(chalk, ...arguments))
}

function green() {
    console.log(chalk.green.call(chalk, ...arguments))
}


const toWei = ethers.utils.parseEther

async function getYieldSourcePrizePoolProxy(tx) {
    const stakePrizePoolProxyFactory = await ethers.getVerifiedContractAt("0x5Ae75894EFcC1f8340b58d0efb3d59Bf366b6A4E");
    const createResultReceipt = await ethers.provider.getTransactionReceipt(tx.hash)
    const createResultEvents = createResultReceipt.logs.map(log => {
        try { return stakePrizePoolProxyFactory.interface.parseLog(log) } catch (e) { return null }
    })
    const address = createResultEvents[0].args.proxy
    dim(`Found pool address at ${address}`)
    return address
}

async function run() {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [SUSHI_HOLDER],
    });

    const sushiHolder = await ethers.provider.getSigner(SUSHI_HOLDER)
    const sushi = await ethers.getContractAt('IERC20Upgradeable', '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2', sushiHolder)
    const builder = await ethers.getVerifiedContractAt("0x39E2F33ff4Ad3491106B3BB15dc66EbE24e4E9C7");

    SushiYieldSourceFactory = await ethers.getContractFactory("SushiYieldSource");
    sushiYieldSource = await SushiYieldSourceFactory.deploy(
        "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272",
        "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2"
    );

    const block = await ethers.provider.getBlock()

    const yieldSourcePrizePoolConfig = {
        yieldSource: sushiYieldSource.address,
        maxExitFeeMantissa: ethers.utils.parseEther('0.1'),
        maxTimelockDuration: 300
    }

    const multipleWinnersConfig = {
        rngService: "0xb1D89477d1b505C261bab6e73f08fA834544CD21",
        prizePeriodStart: block.timestamp,
        prizePeriodSeconds: 1,
        ticketName: "TICKET",
        ticketSymbol: "TICK",
        sponsorshipName: "SPONSORSHIP",
        sponsorshipSymbol: "SPON",
        ticketCreditLimitMantissa: ethers.utils.parseEther('0.1'),
        ticketCreditRateMantissa: '166666666666666',
        numberOfWinners: 1,
        splitExternalErc20Awards: false
    }

    const tx = await builder.createYieldSourceMultipleWinners(
        yieldSourcePrizePoolConfig,
        multipleWinnersConfig,
        18
    )
    const prizePool = await ethers.getContractAt('YieldSourcePrizePool', await getYieldSourcePrizePoolProxy(tx), sushiHolder)

    green(`Created YieldSourcePrizePool ${prizePool.address}`)

    const prizeStrategy = await ethers.getContractAt('MultipleWinners', await prizePool.prizeStrategy(), sushiHolder)
    const ticketAddress = await prizeStrategy.ticket()
    const ticket = await ethers.getContractAt('Ticket', ticketAddress, sushiHolder)

    const depositAmount = toWei('1000')

    dim(`Approving Sushi spend for ${sushiHolder._address}...`)
    await sushi.approve(prizePool.address, depositAmount)
    dim(`Depositing into Pool with ${sushiHolder._address}, ${depositAmount}, ${ticketAddress} ${ethers.constants.AddressZero}...`)
    await prizePool.depositTo(sushiHolder._address, depositAmount, ticketAddress, ethers.constants.AddressZero)
    dim(`Prize Pool sushi balance: ${ethers.utils.formatEther(await sushiYieldSource.callStatic.balanceOfToken(prizePool.address))}`)
    dim(`Withdrawing...`)
    const sushiBalanceBeforeWithdrawal = await sushi.balanceOf(sushiHolder._address)
    await prizePool.withdrawInstantlyFrom(sushiHolder._address, depositAmount, ticketAddress, depositAmount)
    const sushiDiffAfterWithdrawal = (await sushi.balanceOf(sushiHolder._address)).sub(sushiBalanceBeforeWithdrawal)
    dim(`Withdrew ${ethers.utils.formatEther(sushiDiffAfterWithdrawal)} sushi`)

    dim(`Prize Pool sushi balance: ${ethers.utils.formatEther(await sushiYieldSource.callStatic.balanceOfToken(prizePool.address))}`)

    // now there should be some prize
    await prizePool.captureAwardBalance()
    console.log(`Prize is now: ${ethers.utils.formatEther(await prizePool.awardBalance())}`)

    await sushi.approve(prizePool.address, depositAmount)
    await prizePool.depositTo(sushiHolder._address, depositAmount, await prizeStrategy.ticket(), ethers.constants.AddressZero)

    dim(`Starting award...`)
    await prizeStrategy.startAward()

    hre.network.provider.send("evm_increaseTime", [301]);
    await hre.network.provider.send('evm_mine', [])

    dim(`Completing award...`)
    const awardTx = await prizeStrategy.completeAward()
    const awardReceipt = await ethers.provider.getTransactionReceipt(awardTx.hash)
    const awardLogs = awardReceipt.logs.map(log => { try { return prizePool.interface.parseLog(log) } catch (e) { return null } })
    const strategyLogs = awardReceipt.logs.map(log => { try { return prizeStrategy.interface.parseLog(log) } catch (e) { return null } })

    // console.log({ awardLogs })
    // console.log({ strategyLogs })

    const awarded = awardLogs.find(event => event && event.name === 'Awarded')

    if (awarded) {
        console.log(`Awarded ${ethers.utils.formatEther(awarded.args.amount)} Sushi`)
    } else {
        console.log(`No prizes`)
    }

    const sushiBalance = await sushi.balanceOf(sushiHolder._address)
    const balance = await ticket.balanceOf(sushiHolder._address)
    dim(`Users balance is ${ethers.utils.formatEther(balance)}`)
    await prizePool.withdrawInstantlyFrom(sushiHolder._address, balance, ticketAddress, balance)

    const sushiDiff = (await sushi.balanceOf(sushiHolder._address)).sub(sushiBalance)
    dim(`Amount withdrawn is ${ethers.utils.formatEther(sushiDiff)}`)

}

run()