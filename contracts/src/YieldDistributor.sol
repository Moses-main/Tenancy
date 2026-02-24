// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IPFSInterface {
    function store(string memory data) external returns (string memory ipfsHash);
    function retrieve(string memory ipfsHash) external returns (string memory data);
}

interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

contract YieldDistributor is Ownable {
    enum DistributionStatus { PENDING, DISTRIBUTING, COMPLETED, PAUSED }
    
    struct Distribution {
        uint256 propertyId;
        uint256 totalYield;
        uint256 distributedYield;
        DistributionStatus status;
        uint256 distributionTimestamp;
        uint256[] holderBalances;
        address[] holders;
    }
    
    mapping(uint256 => Distribution) private _distributions;
    mapping(uint256 => uint256) private _propertyYieldRates;
    uint256 private _distributionCount;
    
    AggregatorV3Interface public ethUsdPriceFeed;
    AggregatorV3Interface public inflationIndexFeed;
    
    uint256 public totalYieldPool;
    uint256 public totalDistributedYield;
    uint256 public lastDistributionTimestamp;
    uint256 public distributionInterval = 86400;
    
    uint256 public defaultYieldRate = 1000;
    
    uint256 public lastEthUsdPrice;
    uint256 public lastInflationIndex;
    uint256 public priceFeedUpdateTime;
    
    uint256 public minReserveRatio = 1500;
    uint256 public defaultThreshold = 1000;
    uint256 public totalDefaults;
    uint256 public lastRiskCheck;
    bool public safeguardActive;
    mapping(uint256 => uint256) public propertyDefaults;
    mapping(address => bool) public authorizedRiskOracles;
    
    event DistributionStarted(uint256 distributionId, uint256 propertyId, uint256 totalYield);
    event DistributionCompleted(uint256 distributionId, uint256 propertyId, uint256 distributedYield);
    event DistributionPaused(uint256 distributionId, uint256 propertyId);
    event DistributionResumed(uint256 distributionId, uint256 propertyId);
    event YieldClaimed(address indexed claimant, uint256 amount);
    event YieldPoolUpdated(uint256 newTotal, uint256 change);
    event PriceFeedUpdated(uint256 ethUsdPrice, uint256 inflationIndex, uint256 timestamp);
    event RiskAlert(uint256 alertType, string message, uint256 value);
    event ReserveHealthCheck(uint256 totalReserve, uint256 requiredReserve, bool isHealthy);
    event DefaultRecorded(uint256 propertyId, uint256 defaultAmount, uint256 timestamp);
    event SafeguardTriggered(string reason, uint256 timestamp);
    
    constructor(address initialOwner, address _ethUsdPriceFeed, address _inflationIndexFeed) Ownable(initialOwner) {
        _distributionCount = 0;
        if (_ethUsdPriceFeed != address(0)) {
            ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
        }
        if (_inflationIndexFeed != address(0)) {
            inflationIndexFeed = AggregatorV3Interface(_inflationIndexFeed);
        }
    }
    
    function createDistribution(
        uint256 propertyId,
        uint256 totalYield,
        uint256[] calldata holderBalances,
        address[] calldata holders
    ) external onlyOwner returns (uint256 distributionId) {
        distributionId = _distributionCount++;
        
        Distribution memory newDistribution = Distribution({
            propertyId: propertyId,
            totalYield: totalYield,
            distributedYield: 0,
            status: DistributionStatus.PENDING,
            distributionTimestamp: block.timestamp,
            holderBalances: holderBalances,
            holders: holders
        });
        
        _distributions[distributionId] = newDistribution;
        totalYieldPool += totalYield;
        
        emit DistributionStarted(distributionId, propertyId, totalYield);
    }
    
    function startDistribution(uint256 distributionId) external onlyOwner {
        Distribution storage distribution = _distributions[distributionId];
        require(distribution.status == DistributionStatus.PENDING, "Distribution not pending");
        require(distribution.totalYield > 0, "No yield to distribute");
        
        distribution.status = DistributionStatus.DISTRIBUTING;
        lastDistributionTimestamp = block.timestamp;
    }
    
    function pauseDistribution(uint256 distributionId) external onlyOwner {
        Distribution storage distribution = _distributions[distributionId];
        require(distribution.status == DistributionStatus.DISTRIBUTING, "Distribution not active");
        
        distribution.status = DistributionStatus.PAUSED;
        emit DistributionPaused(distributionId, distribution.propertyId);
    }
    
    function resumeDistribution(uint256 distributionId) external onlyOwner {
        Distribution storage distribution = _distributions[distributionId];
        require(distribution.status == DistributionStatus.PAUSED, "Distribution not paused");
        
        distribution.status = DistributionStatus.DISTRIBUTING;
        emit DistributionResumed(distributionId, distribution.propertyId);
    }
    
    function claimYield(uint256 distributionId) external {
        Distribution storage distribution = _distributions[distributionId];
        require(distribution.status == DistributionStatus.DISTRIBUTING, "Distribution not active");
        
        uint256 holderIndex = findHolderIndex(msg.sender, distribution.holders);
        require(holderIndex != type(uint256).max, "Holder not found");
        
        uint256 holderYield = distribution.holderBalances[holderIndex];
        require(holderYield > 0, "No yield to claim");
        
        // Transfer yield to holder (simplified - would need proper token transfer)
        distribution.holderBalances[holderIndex] = 0;
        distribution.distributedYield += holderYield;
        
        emit YieldClaimed(msg.sender, holderYield);
        
        // Check if distribution is complete
        if (distribution.distributedYield >= distribution.totalYield) {
            distribution.status = DistributionStatus.COMPLETED;
            emit DistributionCompleted(distributionId, distribution.propertyId, distribution.distributedYield);
        }
    }
    
    function calculateProRataDistribution(
        uint256 totalYield,
        uint256[] calldata holderBalances
    ) internal pure returns (uint256[] memory) {
        uint256 totalBalance = 0;
        for (uint256 i = 0; i < holderBalances.length; i++) {
            totalBalance += holderBalances[i];
        }
        
        uint256[] memory distributions = new uint256[](holderBalances.length);
        for (uint256 i = 0; i < holderBalances.length; i++) {
            distributions[i] = (holderBalances[i] * totalYield) / totalBalance;
        }
        
        return distributions;
    }
    
    function findHolderIndex(address holder, address[] storage holders) internal view returns (uint256) {
        for (uint256 i = 0; i < holders.length; i++) {
            if (holders[i] == holder) {
                return i;
            }
        }
        return type(uint256).max;
    }
    
    function updateYieldPool(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be positive");
        totalYieldPool += amount;
        emit YieldPoolUpdated(totalYieldPool, amount);
    }
    
    function withdrawYieldPool(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be positive");
        require(totalYieldPool >= amount, "Insufficient yield pool");
        totalYieldPool -= amount;
        payable(msg.sender).transfer(amount);
        emit YieldPoolUpdated(totalYieldPool, amount);
    }
    
    function setDistributionInterval(uint256 newInterval) external onlyOwner {
        distributionInterval = newInterval;
    }
    
    function setDefaultYieldRate(uint256 newRate) external onlyOwner {
        defaultYieldRate = newRate;
    }
    
    function getTotalYieldPool() external view returns (uint256) {
        return totalYieldPool;
    }
    
    function getTotalDistributedYield() external view returns (uint256) {
        return totalDistributedYield;
    }
    
    function getDistributionInfo(uint256 distributionId) external view returns (
        uint256 propertyId,
        uint256 totalYield,
        uint256 distributedYield,
        uint256 status,
        uint256 distributionTimestamp,
        uint256[] memory holderBalances
    ) {
        Distribution storage distribution = _distributions[distributionId];
        return (
            distribution.propertyId,
            distribution.totalYield,
            distribution.distributedYield,
            uint256(distribution.status),
            distribution.distributionTimestamp,
            distribution.holderBalances
        );
    }
    
    function isDistributionActive(uint256 distributionId) external view returns (bool) {
        Distribution storage distribution = _distributions[distributionId];
        return distribution.status == DistributionStatus.DISTRIBUTING;
    }
    
    function setPriceFeeds(address _ethUsdPriceFeed, address _inflationIndexFeed) external onlyOwner {
        if (_ethUsdPriceFeed != address(0)) {
            ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
        }
        if (_inflationIndexFeed != address(0)) {
            inflationIndexFeed = AggregatorV3Interface(_inflationIndexFeed);
        }
    }
    
    function updatePriceFeeds() external returns (uint256, uint256) {
        if (address(ethUsdPriceFeed) != address(0)) {
            (, int256 price,,,) = ethUsdPriceFeed.latestRoundData();
            require(price > 0, "Invalid ETH/USD price");
            lastEthUsdPrice = uint256(price);
        }
        
        if (address(inflationIndexFeed) != address(0)) {
            (, int256 index,,,) = inflationIndexFeed.latestRoundData();
            require(index > 0, "Invalid inflation index");
            lastInflationIndex = uint256(index);
        }
        
        priceFeedUpdateTime = block.timestamp;
        emit PriceFeedUpdated(lastEthUsdPrice, lastInflationIndex, priceFeedUpdateTime);
        
        return (lastEthUsdPrice, lastInflationIndex);
    }
    
    function getEthUsdPrice() external view returns (uint256) {
        require(address(ethUsdPriceFeed) != address(0), "Price feed not set");
        (, int256 price,,,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid ETH/USD price");
        return uint256(price);
    }
    
    function getInflationIndex() external view returns (uint256) {
        require(address(inflationIndexFeed) != address(0), "Inflation feed not set");
        (, int256 index,,,) = inflationIndexFeed.latestRoundData();
        require(index > 0, "Invalid inflation index");
        return uint256(index);
    }
    
    function calculateYieldInUsd(uint256 yieldAmountEth) external view returns (uint256) {
        uint256 price = lastEthUsdPrice;
        if (price == 0) {
            (, int256 currentPrice,,,) = ethUsdPriceFeed.latestRoundData();
            price = uint256(currentPrice);
        }
        return (yieldAmountEth * price) / 1e8;
    }
    
    function calculateYieldInEth(uint256 yieldAmountUsd) external view returns (uint256) {
        uint256 price = lastEthUsdPrice;
        if (price == 0) {
            (, int256 currentPrice,,,) = ethUsdPriceFeed.latestRoundData();
            price = uint256(currentPrice);
        }
        return (yieldAmountUsd * 1e8) / price;
    }
    
    function calculateInflationAdjustedYield(uint256 yieldAmount, uint256 months) external view returns (uint256) {
        if (lastInflationIndex == 0) {
            return yieldAmount;
        }
        uint256 inflationFactor = 10000 + (lastInflationIndex * months / 12);
        return (yieldAmount * inflationFactor) / 10000;
    }
    
    function getYieldDistributionUsd(uint256 distributionId) external view returns (uint256) {
        Distribution storage distribution = _distributions[distributionId];
        if (address(ethUsdPriceFeed) == address(0)) {
            return 0;
        }
        (, int256 price,,,) = ethUsdPriceFeed.latestRoundData();
        if (price <= 0) {
            return 0;
        }
        return (distribution.totalYield * uint256(price)) / 1e8;
    }
    
    function checkReserveHealth() external returns (bool isHealthy, uint256 totalReserve, uint256 requiredReserve) {
        totalReserve = totalYieldPool;
        uint256 totalPending = totalDistributedYield + totalYieldPool;
        requiredReserve = (totalPending * minReserveRatio) / 10000;
        
        isHealthy = totalReserve >= requiredReserve;
        
        emit ReserveHealthCheck(totalReserve, requiredReserve, isHealthy);
        
        if (!isHealthy && !safeguardActive) {
            _triggerSafeguard("Reserve ratio below minimum");
        }
        
        lastRiskCheck = block.timestamp;
        return (isHealthy, totalReserve, requiredReserve);
    }
    
    function recordDefault(uint256 propertyId, uint256 defaultAmount) external onlyOwner {
        propertyDefaults[propertyId] += defaultAmount;
        totalDefaults += defaultAmount;
        
        emit DefaultRecorded(propertyId, defaultAmount, block.timestamp);
        
        uint256 defaultRatio = (totalDefaults * 10000) / (totalYieldPool + 1);
        if (defaultRatio > defaultThreshold) {
            _triggerSafeguard("Default threshold exceeded");
        }
    }
    
    function getDefaultRatio() external view returns (uint256) {
        if (totalYieldPool == 0) return 0;
        return (totalDefaults * 10000) / totalYieldPool;
    }
    
    function _triggerSafeguard(string memory reason) internal {
        safeguardActive = true;
        emit SafeguardTriggered(reason, block.timestamp);
        emit RiskAlert(1, reason, totalDefaults);
    }
    
    function activateSafeguard(string memory reason) external onlyOwner {
        _triggerSafeguard(reason);
    }
    
    function deactivateSafeguard() external onlyOwner {
        safeguardActive = false;
        emit RiskAlert(2, "Safeguard deactivated", 0);
    }
    
    function setMinReserveRatio(uint256 _ratio) external onlyOwner {
        require(_ratio >= 1000 && _ratio <= 10000, "Ratio must be 10-100%");
        minReserveRatio = _ratio;
    }
    
    function setDefaultThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold >= 100 && _threshold <= 10000, "Threshold must be 1-100%");
        defaultThreshold = _threshold;
    }
    
    function isSystemHealthy() external view returns (bool) {
        if (safeguardActive) return false;
        if (totalYieldPool == 0) return true;
        
        uint256 defaultRatio = (totalDefaults * 10000) / totalYieldPool;
        return defaultRatio <= defaultThreshold;
    }
    
    function getRiskMetrics() external view returns (
        uint256 _totalDefaults,
        uint256 _defaultRatio,
        uint256 _reserveRatio,
        bool _safeguardActive,
        uint256 _lastRiskCheck
    ) {
        uint256 _defaultRatio = totalYieldPool > 0 ? (totalDefaults * 10000) / totalYieldPool : 0;
        uint256 _reserveRatio = totalDistributedYield > 0 
            ? (totalYieldPool * 10000) / totalDistributedYield 
            : 0;
        
        return (totalDefaults, _defaultRatio, _reserveRatio, safeguardActive, lastRiskCheck);
    }
}
