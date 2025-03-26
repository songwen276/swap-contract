// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IPlanetCallee {
    function planetCall(address sender, uint amount0, uint amount1, bytes calldata data) external;
}