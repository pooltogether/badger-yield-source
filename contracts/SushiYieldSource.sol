// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.8.0;
import {IYieldSource} from "./IYieldSource.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "hardhat/console.sol";

interface ISushiBar {
    function enter(uint256 _amount) external;

    function leave(uint256 _share) external;

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);
}

interface ISushi {
    function balanceOf(address account) external view returns (uint256);

    function transferFrom(
        address from,
        address account,
        uint256 amount
    ) external returns (bool);

    function transfer(address account, uint256 amount) external returns (bool);

    function approve(address spender, uint256 amount) external returns (bool);
}

contract SushiYieldSource is IYieldSource {
    using SafeMath for uint256;
    address public sushiBar =
        address(0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272);
    address public sushiAddr =
        address(0x6B3595068778DD592e39A122f4f5a5cF09C90fE2);
    mapping(address => uint256) public balances;

    /// @notice Returns the ERC20 asset token used for deposits.
    /// @return The ERC20 asset token
    function token() public view override returns (address) {
        return (sushiAddr);
    }

    /// @notice Returns the total balance (in asset tokens).  This includes the deposits and interest.
    /// @return The underlying balance of asset tokens
    function balanceOf(address addr) public view override returns (uint256) {
        uint256 shares = ISushiBar(sushiBar).balanceOf(address(this));
        uint256 totalShares = ISushiBar(sushiBar).totalSupply();
        uint256 sushiBalance =
            shares.mul(ISushi(sushiAddr).balanceOf(address(sushiBar))).div(
                totalShares
            );

        return (balances[addr].mul(sushiBalance).div(totalShares));
    }

    /// @notice Supplies asset tokens to the yield source.
    /// @param mintAmount The amount of asset tokens to be supplied
    /// @param to The account to be credited
    function supplyTo(uint256 mintAmount, address to) public override {
        ISushi(sushiAddr).transferFrom(msg.sender, address(this), mintAmount);
        ISushi(sushiAddr).approve(sushiBar, mintAmount);

        ISushiBar bar = ISushiBar(sushiBar);
        uint256 beforeBalance = bar.balanceOf(address(this));
        bar.enter(mintAmount);
        uint256 afterBalance = bar.balanceOf(address(this));
        uint256 balanceDiff = afterBalance.sub(beforeBalance);
        balances[to] = balances[to].add(balanceDiff);
    }

    /// @notice Redeems asset tokens from the yield source.
    /// @param redeemAmount The amount of yield-bearing tokens to be redeemed
    /// @return The actual amount of tokens that were redeemed.
    function redeem(uint256 redeemAmount) public override returns (uint256) {
        ISushiBar bar = ISushiBar(sushiBar);
        ISushi sushi = ISushi(sushiAddr);

        uint256 totalShares = bar.totalSupply();
        uint256 barSushiBalance = sushi.balanceOf(address(bar));
        uint256 requiredShares =
            redeemAmount.mul(totalShares).div(barSushiBalance);

        uint256 barBeforeBalance = bar.balanceOf(address(this));
        uint256 sushiBeforeBalance = sushi.balanceOf(address(this));

        bar.leave(requiredShares);

        uint256 barAfterBalance = bar.balanceOf(address(this));
        uint256 sushiAfterBalance = sushi.balanceOf(address(this));

        uint256 barBalanceDiff = barBeforeBalance.sub(barAfterBalance);
        uint256 sushiBalanceDiff = sushiAfterBalance.sub(sushiBeforeBalance);

        balances[msg.sender] = balances[msg.sender].sub(barBalanceDiff);
        sushi.transfer(msg.sender, sushiBalanceDiff);
        return (sushiBalanceDiff);
    }
}
