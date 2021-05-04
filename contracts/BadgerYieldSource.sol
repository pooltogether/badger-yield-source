// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.6.12;

import {IYieldSource} from "@pooltogether/yield-source-interface/contracts/IYieldSource.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./IBadgerSett.sol";
import "./IBadger.sol";

/// @title A pooltogether yield source for badger sett
/// @author Steffel Fenix, 0xkarl
contract BadgerYieldSource is IYieldSource {
    using SafeMath for uint256;
    address public badgerSettAddr;
    address public badgerAddr;
    mapping(address => uint256) public balances;

    constructor(address _badgerSettAddr, address _badgerAddr) public {
        badgerSettAddr = _badgerSettAddr;
        badgerAddr = _badgerAddr;
    }

    /// @notice Returns the ERC20 asset token used for deposits.
    /// @return The ERC20 asset token
    function depositToken() public view override returns (address) {
        return (badgerAddr);
    }

    /// @notice Returns the total balance (in asset tokens).  This includes the deposits and interest.
    /// @return The underlying balance of asset tokens
    function balanceOfToken(address addr) public override returns (uint256) {
        if (balances[addr] == 0) return 0;
        IBadgerSett badgerSett = IBadgerSett(badgerSettAddr);

        uint256 shares = badgerSett.balanceOf(address(this));
        uint256 totalShares = badgerSett.totalSupply();

        uint256 badgerBalance =
            shares
                .mul(IBadger(badgerAddr).balanceOf(address(badgerSettAddr)))
                .div(totalShares);
        uint256 sourceShares = badgerSett.balanceOf(address(this));

        return (balances[addr].mul(badgerBalance).div(sourceShares));
    }

    /// @notice Allows assets to be supplied on other user's behalf using the `to` param.
    /// @param amount The amount of `token()` to be supplied
    /// @param to The user whose balance will receive the tokens
    function supplyTokenTo(uint256 amount, address to) public override {
        IBadger(badgerAddr).transferFrom(msg.sender, address(this), amount);
        IBadger(badgerAddr).approve(badgerSettAddr, amount);

        IBadgerSett badgerSett = IBadgerSett(badgerSettAddr);
        uint256 beforeBalance = badgerSett.balanceOf(address(this));
        badgerSett.deposit(amount);
        uint256 afterBalance = badgerSett.balanceOf(address(this));
        uint256 balanceDiff = afterBalance.sub(beforeBalance);
        balances[to] = balances[to].add(balanceDiff);
    }

    /// @notice Redeems tokens from the yield source from the msg.sender, it burn yield bearing tokens and return token to the sender.
    /// @param amount The amount of `token()` to withdraw.  Denominated in `token()` as above.
    /// @return The actual amount of tokens that were redeemed.
    function redeemToken(uint256 amount) public override returns (uint256) {
        IBadgerSett badgerSett = IBadgerSett(badgerSettAddr);
        IBadger badger = IBadger(badgerAddr);

        uint256 totalShares = badgerSett.totalSupply();
        uint256 badgerSettBadgerBalance = badger.balanceOf(address(badgerSett));
        uint256 requiredShares =
            amount.mul(totalShares).div(badgerSettBadgerBalance);

        uint256 badgerSettBeforeBalance = badgerSett.balanceOf(address(this));
        uint256 badgerBeforeBalance = badger.balanceOf(address(this));

        badgerSett.withdraw(requiredShares);

        uint256 badgerSettAfterBalance = badgerSett.balanceOf(address(this));
        uint256 badgerAfterBalance = badger.balanceOf(address(this));

        uint256 badgerSettBalanceDiff =
            badgerSettBeforeBalance.sub(badgerSettAfterBalance);
        uint256 badgerBalanceDiff = badgerAfterBalance.sub(badgerBeforeBalance);

        balances[msg.sender] = balances[msg.sender].sub(badgerSettBalanceDiff);
        badger.transfer(msg.sender, badgerBalanceDiff);
        return (badgerBalanceDiff);
    }
}
