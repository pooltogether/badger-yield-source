const { ethers } = require('hardhat');
const { solidity } = require('ethereum-waffle');
const chai = require('chai');

chai.use(solidity);
const toWei = ethers.utils.parseEther;
const toEth = ethers.utils.formatEther;
const { expect } = chai;

let overrides = { gasLimit: 9500000 };

describe('BadgerYieldSource', function () {
  let badger;
  let badgerSett;
  let wallet;
  let wallet2;
  let yieldSource;
  let amount;

  beforeEach(async function () {
    [wallet, wallet2] = await ethers.getSigners();
    const ERC20MintableContract = await hre.ethers.getContractFactory(
      'ERC20Mintable',
      wallet,
      overrides
    );
    badger = await ERC20MintableContract.deploy('Badger', 'BADGER');

    const BadgerSettContract = await hre.ethers.getContractFactory(
      'BadgerSett',
      wallet,
      overrides
    );
    badgerSett = await BadgerSettContract.deploy(badger.address);

    const BadgerYieldSourceContract = await ethers.getContractFactory(
      'BadgerYieldSource'
    );
    yieldSource = await BadgerYieldSourceContract.deploy(
      badgerSett.address,
      badger.address,
      overrides
    );
    amount = toWei('100');
    await badger.mint(wallet.address, amount);
    await badger.mint(wallet2.address, amount.mul(99));
    await badger.connect(wallet2).approve(badgerSett.address, amount.mul(99));
    await badgerSett.connect(wallet2).enter(amount.mul(99));
  });

  it('get token address', async function () {
    let address = await yieldSource.depositToken();
    expect(address == badger);
  });

  it('balanceOfToken', async function () {
    expect(await yieldSource.callStatic.balanceOfToken(wallet.address)).to.eq(
      0
    );

    await badger.connect(wallet).approve(yieldSource.address, amount);
    await yieldSource.supplyTokenTo(amount, wallet.address);
    expect(await yieldSource.callStatic.balanceOfToken(wallet.address)).to.eq(
      amount
    );
  });

  it('supplyTokenTo', async function () {
    await badger.connect(wallet).approve(yieldSource.address, amount);
    await yieldSource.supplyTokenTo(amount, wallet.address);
    expect(await badger.balanceOf(badgerSett.address)).to.eq(amount.mul(100));
    expect(await yieldSource.callStatic.balanceOfToken(wallet.address)).to.eq(
      amount
    );
  });

  it('redeemToken', async function () {
    await badger.connect(wallet).approve(yieldSource.address, amount);
    await yieldSource.supplyTokenTo(amount, wallet.address);

    expect(await badger.balanceOf(wallet.address)).to.eq(0);
    await yieldSource.redeemToken(amount);
    expect(await badger.balanceOf(wallet.address)).to.eq(amount);
  });

  [toWei('100'), toWei('100').mul(10), toWei('100').mul(99)].forEach(function (
    amountToDeposit
  ) {
    it(
      'deposit ' + toEth(amountToDeposit) + ', badger accrues, withdrawal',
      async function () {
        await badger.mint(wallet.address, amountToDeposit.sub(amount));
        await badger
          .connect(wallet)
          .approve(yieldSource.address, amountToDeposit);
        await yieldSource.supplyTokenTo(amountToDeposit, wallet.address);
        // increase total balance by amount
        await badger.mint(badgerSett.address, amount);

        const totalAmount = await yieldSource.callStatic.balanceOfToken(
          wallet.address
        );
        const expectedAmount = amountToDeposit
          .mul(amountToDeposit.add(amount.mul(100)))
          .div(amountToDeposit.add(amount.mul(99)));
        expect(totalAmount).to.eq(expectedAmount);

        await yieldSource.redeemToken(totalAmount);
        expect(await badger.balanceOf(wallet.address)).to.be.closeTo(
          totalAmount,
          1
        );
      }
    );
  });
});
