// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface INomiswapStablePair {
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
    
    // address tokenIn：表示要存入的代币的合约地址。
    // uint256 amountOut：代表期望获取的另一种代币的数量。
    function getAmountIn(address tokenIn, uint256 amountOut) external view returns (uint256);

    // address tokenIn：同样是要存入的代币的合约地址。
    // uint256 amountIn：指的是用户打算投入进行兑换的代币的数量。
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256);
}