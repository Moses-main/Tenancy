// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";

contract PriceFeedConsumer {
    AggregatorV3Interface public ethUsdPriceFeed;
    AggregatorV3Interface public propertyIndexFeed;

    uint8 public decimals;
    uint256 public latestPrice;
    uint256 public latestTimestamp;

    event PriceUpdated(uint256 price, uint256 timestamp);

    constructor(address _ethUsdPriceFeed, address _propertyIndexFeed) {
        if (_ethUsdPriceFeed != address(0)) {
            ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
            decimals = ethUsdPriceFeed.decimals();
        }
        if (_propertyIndexFeed != address(0)) {
            propertyIndexFeed = AggregatorV3Interface(_propertyIndexFeed);
        }
    }

    function getEthUsdPrice() public returns (uint256) {
        (, int256 price,, uint256 timestamp,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        
        latestPrice = uint256(price);
        latestTimestamp = timestamp;
        
        emit PriceUpdated(latestPrice, latestTimestamp);
        return latestPrice;
    }

    function getEthUsdPriceView() public view returns (uint256) {
        (, int256 price,,,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }

    function getPropertyIndexPrice() public view returns (uint256) {
        (, int256 price,,,) = propertyIndexFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }

    function convertUsdToEth(uint256 usdAmount) public view returns (uint256) {
        uint256 price = getEthUsdPriceView();
        return (usdAmount * 1e8) / price;
    }

    function convertEthToUsd(uint256 ethAmount) public view returns (uint256) {
        uint256 price = getEthUsdPriceView();
        return (ethAmount * price) / 1e8;
    }

    function getPropertyValuationInUsd(uint256 rentAmount, uint256 months) public view returns (uint256) {
        uint256 annualRent = rentAmount * 12;
        uint256 capRate = 5e16;
        return (annualRent * months * 1e18) / capRate;
    }

    function getAnnualYieldInUsd(uint256 propertyValue, uint256 rentAmount) public pure returns (uint256) {
        return (propertyValue * rentAmount) / 1e18;
    }

    function getYieldPercentage(uint256 rentAmount, uint256 propertyValue) public pure returns (uint256) {
        require(propertyValue > 0, "Property value must be > 0");
        return (rentAmount * 10000) / propertyValue;
    }
}
