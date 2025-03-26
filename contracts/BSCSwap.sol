// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interface/IBSCswapCallee.sol";
import "./interface/ISwapPair.sol";
import "./utils/Calculate.sol";

contract BSCSwap is
    Initializable,
    AccessControlUpgradeable,
    IBSCswapCallee,
    ReentrancyGuardUpgradeable
{
    error PairExsits();

    struct CallData {
        Pair pair;
        uint amountCostMax;
        uint feePri;
        uint feeSuf;
    }

    struct Pair {
        address pairAddress;
        address token0;
        address token1;
    }

    bytes32 public constant KEEPER = keccak256("KEEPER");
    bytes32 public constant WHITELIST = keccak256("WHITELIST");

    mapping(address pairAddress => uint) public pairMap;
    Pair[] public pairs;
    uint8 private maxCallCount;

    function initialize() public initializer {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        __ReentrancyGuard_init();
        maxCallCount = 1;
    }

    modifier backCallLimit() {
        require(maxCallCount == 1, "Back caller over limit");
        _;
        maxCallCount++;
    }

    modifier backCallReset() {
        _;
        maxCallCount = 1;
    }

    function addPair(
        address pairAddress,
        address token0,
        address token1
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            pairAddress != address(0) &&
                token0 != address(0) &&
                token1 != address(0),
            "INVALID_ADDRESS(0)"
        );
        Pair memory pair;
        for (uint256 i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            if (pair.pairAddress == pairAddress) {
                revert PairExsits();
            }
        }
        pairs.push(Pair(pairAddress, token0, token1));
        pairMap[pairAddress] = pairs.length;
    }

    // swap代币
    // @param pairAddress 交易对地址
    // @param amountGet 要兑换获取的代币数量
    // @param tokenGet 要兑换获取的代币地址
    // @param amountCostMax 设置花费对应代币的最大数量
    // @param feePri 手续费（最小整数）
    // @param feeSuf 手续费精度
    // 若手续费为0.3%，feePri=3，feeSuf=1000，若手续费为0.25%，feePri=25，feeSuf=10000，反正就是分子分母同时乘以10**n，使分子变为整数
    function swap(
        address pairAddress,
        uint amountGet,
        address tokenGet,
        uint amountCostMax,
        uint feePri,
        uint feeSuf
    ) external onlyRole(DEFAULT_ADMIN_ROLE) backCallReset {
        require(amountGet > 0, "INSUFFICIENT_OUTPUT_AMOUNT");
        uint pairNum = pairMap[pairAddress];
        require(pairNum > 0, "PAIR_NOT_EXISTS");

        Pair memory pair = pairs[pairNum - 1];
        require(
            tokenGet == pair.token0 || tokenGet == pair.token1,
            "INVALID_TOKEN"
        );
        CallData memory data = CallData(pair, amountCostMax, feePri, feeSuf);
        if (tokenGet == pair.token0) {
            ISwapPair(pairAddress).swap(
                amountGet,
                0,
                address(this),
                abi.encode(data)
            );
        } else {
            ISwapPair(pairAddress).swap(
                0,
                amountGet,
                address(this),
                abi.encode(data)
            );
        }
    }

    function BSCswapCall(
        address sender,
        uint amount0,
        uint amount1,
        bytes calldata data
    ) external override nonReentrant backCallLimit {
        CallData memory callData = abi.decode(data, (CallData));
        require(
            msg.sender == callData.pair.pairAddress,
            "Caller must be the Pair contract"
        );
        require(sender == address(this), "Back caller must be mine");

        // 从 Pair 合约获取token0, token1储备量
        (uint112 reserve0, uint112 reserve1, ) = ISwapPair(
            callData.pair.pairAddress
        ).getReserves();

        // 根据需要兑换获取的 token 数量，计算需要花费的另一 token 数量
        if (amount0 > 0) {
            // 转账 amount1Cost 个 token1 到 Pair 合约去兑换 amount0 个 token0
            uint amount1Cost = Calculate.calculateAmountCost(
                amount0,
                reserve0,
                reserve1,
                callData.feePri,
                callData.feeSuf
            );
            require(
                amount1Cost <= callData.amountCostMax,
                "token1 cost over max value"
            );
            IERC20(callData.pair.token1).transfer(
                callData.pair.pairAddress,
                amount1Cost + 1
            );
        } else {
            // 转账 amount0Cost 个 token0 到 Pair 合约去兑换 amount1 个 token0
            uint amount0Cost = Calculate.calculateAmountCost(
                amount1,
                reserve1,
                reserve0,
                callData.feePri,
                callData.feeSuf
            );
            require(
                amount0Cost <= callData.amountCostMax,
                "token0 cost over max value"
            );
            IERC20(callData.pair.token0).transfer(
                callData.pair.pairAddress,
                amount0Cost + 1
            );
        }
    }

    function calculateAmount(
        address pairAddress,
        uint amount,
        uint8 tokenNum,
        bool isGet,
        uint feePri,
        uint feeSuf
    ) external view returns (uint calAmount) {
        require(tokenNum == 0 || tokenNum == 1, "only 0 or 1");
        (uint112 reserve0, uint112 reserve1, ) = ISwapPair(pairAddress)
            .getReserves();
        if (tokenNum == 0 && isGet) {
            // 计算获取token0所需花费的token1
            calAmount = Calculate.calculateAmountCost(
                amount,
                reserve0,
                reserve1,
                feePri,
                feeSuf
            );
        } else if (tokenNum == 0 && !isGet) {
            // 计算花费token0能够获取多少token1
            calAmount = Calculate.calculateAmountGet(
                amount,
                reserve0,
                reserve1,
                feePri,
                feeSuf
            );
        } else if (tokenNum == 1 && isGet) {
            // 计算获取token1所需花费token0
            calAmount = Calculate.calculateAmountCost(
                amount,
                reserve1,
                reserve0,
                feePri,
                feeSuf
            );
        } else {
            // 计算花费token1能够兑换多少token0
            calAmount = Calculate.calculateAmountGet(
                amount,
                reserve1,
                reserve0,
                feePri,
                feeSuf
            );
        }
    }

}
