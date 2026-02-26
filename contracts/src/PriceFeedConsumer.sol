// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";

contract PriceFeedConsumer {
    AggregatorV3Interface public ethUsdPriceFeed;
    AggregatorV3Interface public propertyIndexFeed;
    AggregatorV3Interface public rentIndexFeed;
    AggregatorV3Interface public inflationFeed;

    uint8 public decimals;
    uint256 public latestPrice;
    uint256 public latestTimestamp;
    uint256 public stalePriceThreshold = 1 hours;

    struct PriceData {
        uint256 price;
        uint256 timestamp;
        bool isStale;
    }

    event PriceUpdated(uint256 price, uint256 timestamp);
    event PriceFeedUpdated(string feedName, uint256 price, uint256 timestamp);
    event StalePriceDetected(string feedName, uint256 lastUpdate);

    modifier onlyValidPrice(int256 price) {
        require(price > 0, "Invalid price");
        _;
    }

    constructor(address _ethUsdPriceFeed, address _propertyIndexFeed) {
        if (_ethUsdPriceFeed != address(0)) {
            ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
            decimals = ethUsdPriceFeed.decimals();
        }
        if (_propertyIndexFeed != address(0)) {
            propertyIndexFeed = AggregatorV3Interface(_propertyIndexFeed);
        }
    }

    function setRentIndexFeed(address _rentIndexFeed) external {
        if (_rentIndexFeed != address(0)) {
            rentIndexFeed = AggregatorV3Interface(_rentIndexFeed);
        }
    }

    function setInflationFeed(address _inflationFeed) external {
        if (_inflationFeed != address(0)) {
            inflationFeed = AggregatorV3Interface(_inflationFeed);
        }
    }

    function setStalePriceThreshold(uint256 _threshold) external {
        stalePriceThreshold = _threshold;
    }

    function getEthUsdPrice() public returns (uint256) {
        (, int256 price,, uint256 timestamp,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        
        latestPrice = uint256(price);
        latestTimestamp = timestamp;
        
        if (block.timestamp - timestamp > stalePriceThreshold) {
            emit StalePriceDetected("ETH/USD", timestamp);
        }
        
        emit PriceUpdated(latestPrice, latestTimestamp);
        return latestPrice;
    }

    function getEthUsdPriceView() public view returns (uint256) {
        (, int256 price,,,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }

    function getPriceData() public returns (PriceData memory) {
        (, int256 price,, uint256 timestamp,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        
        uint256 priceValue = uint256(price);
        bool isStale = (block.timestamp - timestamp) > stalePriceThreshold;
        
        if (isStale) {
            emit StalePriceDetected("ETH/USD", timestamp);
        }
        
        return PriceData({
            price: priceValue,
            timestamp: timestamp,
            isStale: isStale
        });
    }

    function getPropertyIndexPrice() public view returns (uint256) {
        (, int256 price,,,) = propertyIndexFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }

    function getRentIndexPrice() public view returns (uint256) {
        require(address(rentIndexFeed) != address(0), "Rent index not set");
        (, int256 price,,,) = rentIndexFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }

    function getInflationRate() public view returns (uint256) {
        require(address(inflationFeed) != address(0), "Inflation feed not set");
        (, int256 rate,,,) = inflationFeed.latestRoundData();
        require(rate > 0, "Invalid inflation rate");
        return uint256(rate);
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

    function calculateInflationAdjustedRent(uint256 baseRent, uint256 months) public view returns (uint256) {
        if (address(inflationFeed) == address(0)) {
            return baseRent;
        }
        
        uint256 inflationRate = getInflationRate();
        uint256 inflationFactor = 10000 + (inflationRate * months / 12);
        return (baseRent * inflationFactor) / 10000;
    }

    function calculateMarketAdjustedRent(uint256 baseRent, uint256 marketIndex) public view returns (uint256) {
        if (address(rentIndexFeed) == address(0)) {
            return baseRent;
        }
        
        uint256 currentIndex = getRentIndexPrice();
        uint256 adjustmentFactor = (currentIndex * 10000) / marketIndex;
        return (baseRent * adjustmentFactor) / 10000;
    }

    function getYieldInUsdWithFees(uint256 yieldAmountEth, uint256 feeBasisPoints) public view returns (uint256, uint256) {
        uint256 price = getEthUsdPriceView();
        uint256 yieldUsd = (yieldAmountEth * price) / 1e8;
        uint256 fees = (yieldUsd * feeBasisPoints) / 10000;
        uint256 netYield = yieldUsd - fees;
        return (netYield, fees);
    }

    function isPriceFeedHealthy() public view returns (bool) {
        (, int256 price,, uint256 timestamp,) = ethUsdPriceFeed.latestRoundData();
        if (price <= 0) return false;
        return (block.timestamp - timestamp) <= stalePriceThreshold;
    }
}
