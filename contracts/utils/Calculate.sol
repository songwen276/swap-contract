// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

library Calculate{

    // 计算获取一定数量的代币需要花费的另一代币数量
    function calculateAmountCost(
        uint amountGet,
        uint reserveGet,
        uint reserveCost,
        uint feePri,
        uint feeSuf
    ) internal pure returns (uint) {
        // 公式：cost > reserveCost * 10000 * amountGet * 10000 / (9975 * reserveGet * 10000 - 9975 * amountGet * 10000)
        require(amountGet < reserveGet, 'amountGet >= reserve');
        return (reserveCost * feeSuf * amountGet * feeSuf) /
               ((feeSuf - feePri) * reserveGet * feeSuf - (feeSuf - feePri) * amountGet * feeSuf);
    }

    // 计算花费一定数量的代币能够获取的另一代币数量
    function calculateAmountGet(
        uint amountCost,
        uint reserveCost,
        uint reserveGet,
        uint feePri,
        uint feeSuf
    ) internal pure returns (uint) {
        // 公式：(AmountCost * 9975 * reserveGet * 10000) / (reserveCost * 10000 * 10000 + AmountCost * 9975 * 10000) > amountGet
        return (amountCost * (feeSuf - feePri) * reserveGet * feeSuf) /
               (reserveCost * feeSuf * feeSuf + amountCost * (feeSuf - feePri) * feeSuf);
    }

}