// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";

contract MockPriceFeed is AggregatorV3Interface {
    int256 private constant PRICE = 3000 * 1e8; // $3000 ETH with 8 decimals
    
    function decimals() external pure override returns (uint8) {
        return 8;
    }
    
    function description() external pure override returns (string memory) {
        return "Mock ETH/USD Price Feed";
    }
    
    function version() external pure override returns (uint256) {
        return 1;
    }
    
    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (
            1,
            PRICE,
            block.timestamp,
            block.timestamp,
            1
        );
    }
}
