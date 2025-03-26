// SPDX-License-Identifier: MIT

pragma solidity >=0.7.5;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

abstract contract IWETH is ERC20 {
    /// @notice Deposit ether to get wrapped ether
    function deposit() external payable virtual;

    /// @notice Withdraw wrapped ether to get ether
    function withdraw(uint256) external virtual;
}
