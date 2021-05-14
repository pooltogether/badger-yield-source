// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.6.0 <0.7.0;

interface IBadgerSett {
    function deposit(uint256 _amount) external;

    function withdraw(uint256 _shares) external;

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    //
    function balance() external view returns (uint256);
}
