// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

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

contract YieldDistributor is Ownable, ReentrancyGuard, Pausable, AccessControl {
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    
    enum DistributionStatus { PENDING, DISTRIBUTING, COMPLETED, PAUSED }
    
    enum AgentActionType { DISTRIBUTE_YIELD, PAUSE_YIELD, ADJUST_RENT, FLAG_DEFAULT, NONE }
    
    struct Distribution {
        uint256 propertyId;
        uint256 totalYield;
        uint256 distributedYield;
        DistributionStatus status;
        uint256 distributionTimestamp;
        uint256[] holderBalances;
        address[] holders;
    }
    
    struct AgentDecision {
        uint256 propertyId;
        AgentActionType action;
        uint256 adjustmentPercent;
        string reason;
        uint256 confidence;
        bytes32 recommendationId;
        bool executed;
        uint256 timestamp;
    }
    
    mapping(uint256 => Distribution) private _distributions;
    mapping(uint256 => uint256) private _propertyYieldRates;
    mapping(uint256 => AgentDecision) private _pendingAgentDecisions;
    mapping(bytes32 => bool) private _executedDecisions;
    uint256 private _distributionCount;
    uint256 private _decisionCount;
    
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
    event AgentAction(
        address indexed agent,
        uint256 indexed propertyId,
        string actionType,
        string details,
        bytes32 txHash,
        uint256 timestamp
    );
    event AgentDecisionExecuted(
        uint256 indexed propertyId,
        string action,
        uint256 adjustmentPercent,
        string reason,
        uint256 confidence,
        bytes32 decisionId,
        bool success,
        uint256 timestamp
    );
    event YieldDistributionWithAI(
        uint256 indexed distributionId,
        uint256 indexed propertyId,
        uint256 amount,
        string aiReason,
        uint256 confidence,
        bytes32 recommendationId,
        uint256 timestamp
    );
    
    constructor(address initialOwner, address _ethUsdPriceFeed, address _inflationIndexFeed) Ownable(initialOwner) {
        _distributionCount = 0;
        _decisionCount = 0;
        _grantRole(AGENT_ROLE, initialOwner);
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
    ) external onlyOwner whenNotPaused returns (uint256 distributionId) {
        require(holderBalances.length > 0, "Cannot create distribution with no holders");
        require(holderBalances.length == holders.length, "Arrays length mismatch");
        require(totalYield > 0, "Total yield must be greater than 0");
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
    
    function claimYield(uint256 distributionId) external nonReentrant whenNotPaused {
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
    
    function updateYieldPool(uint256 amount) external payable onlyOwner {
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
    
    function _recordDefaultInternal(uint256 propertyId, uint256 defaultAmount) internal {
        propertyDefaults[propertyId] += defaultAmount;
        totalDefaults += defaultAmount;
        
        emit DefaultRecorded(propertyId, defaultAmount, block.timestamp);
        
        uint256 defaultRatio = (totalDefaults * 10000) / (totalYieldPool + 1);
        if (defaultRatio > defaultThreshold) {
            _triggerSafeguard("Default threshold exceeded");
        }
    }
    
    function recordDefault(uint256 propertyId, uint256 defaultAmount) external onlyRole(AGENT_ROLE) {
        _recordDefaultInternal(propertyId, defaultAmount);
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

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
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
        uint256 _defaultRatioVal,
        uint256 _reserveRatioVal,
        bool _safeguardActive,
        uint256 _lastRiskCheck
    ) {
        uint256 defaultRatioVal = totalYieldPool > 0 ? (totalDefaults * 10000) / totalYieldPool : 0;
        uint256 reserveRatioVal = totalDistributedYield > 0 
            ? (totalYieldPool * 10000) / totalDistributedYield 
            : 0;
        
        return (totalDefaults, defaultRatioVal, reserveRatioVal, safeguardActive, lastRiskCheck);
    }

    function setAgent(address _agent, bool _status) external onlyOwner {
        if (_status) {
            _grantRole(AGENT_ROLE, _agent);
        } else {
            _revokeRole(AGENT_ROLE, _agent);
        }
    }

    function submitAgentDecision(
        uint256 propertyId,
        AgentActionType action,
        uint256 adjustmentPercent,
        string calldata reason,
        uint256 confidence
    ) external onlyRole(AGENT_ROLE) returns (bytes32 decisionId) {
        decisionId = keccak256(
            abi.encodePacked(propertyId, action, block.timestamp, confidence, _decisionCount++)
        );
        
        _pendingAgentDecisions[propertyId] = AgentDecision({
            propertyId: propertyId,
            action: action,
            adjustmentPercent: adjustmentPercent,
            reason: reason,
            confidence: confidence,
            recommendationId: decisionId,
            executed: false,
            timestamp: block.timestamp
        });
        
        emit AgentAction(
            msg.sender,
            propertyId,
            "decision_submitted",
            string(abi.encodePacked("Action: ", Strings.toString(uint256(action)), " Confidence: ", Strings.toString(confidence))),
            decisionId,
            block.timestamp
        );
    }

    function executeAgentDecision(uint256 propertyId) external onlyRole(AGENT_ROLE) returns (bool success) {
        AgentDecision storage decision = _pendingAgentDecisions[propertyId];
        require(!decision.executed, "Decision already executed");
        
        bytes32 decisionId = decision.recommendationId;
        _executedDecisions[decisionId] = true;
        decision.executed = true;
        
        if (decision.action == AgentActionType.DISTRIBUTE_YIELD) {
            success = true;
        } else if (decision.action == AgentActionType.PAUSE_YIELD) {
            _pause();
            success = true;
        } else if (decision.action == AgentActionType.FLAG_DEFAULT) {
            _recordDefaultInternal(propertyId, decision.adjustmentPercent);
            success = true;
        } else {
            success = false;
        }
        
        emit AgentDecisionExecuted(
            propertyId,
            _actionToString(decision.action),
            decision.adjustmentPercent,
            decision.reason,
            decision.confidence,
            decisionId,
            success,
            block.timestamp
        );
    }

    function distributeWithAIRecommendation(
        uint256 propertyId,
        uint256 amount,
        string calldata aiReason,
        uint256 confidence,
        bytes32 recommendationId
    ) external onlyRole(AGENT_ROLE) whenNotPaused nonReentrant returns (uint256 distributionId) {
        require(amount > 0, "Amount must be positive");
        require(totalYieldPool >= amount, "Insufficient yield pool");
        
        distributionId = _distributionCount++;
        
        Distribution memory newDistribution = Distribution({
            propertyId: propertyId,
            totalYield: amount,
            distributedYield: 0,
            status: DistributionStatus.DISTRIBUTING,
            distributionTimestamp: block.timestamp,
            holderBalances: new uint256[](0),
            holders: new address[](0)
        });
        
        _distributions[distributionId] = newDistribution;
        totalYieldPool -= amount;
        totalDistributedYield += amount;
        
        emit YieldDistributionWithAI(
            distributionId,
            propertyId,
            amount,
            aiReason,
            confidence,
            recommendationId,
            block.timestamp
        );
        
        emit AgentAction(
            msg.sender,
            propertyId,
            "distribute_yield_with_ai",
            aiReason,
            recommendationId,
            block.timestamp
        );
    }

    function pauseYieldDistribution(uint256 propertyId) external onlyRole(AGENT_ROLE) {
        require(_propertyYieldRates[propertyId] > 0, "No active distribution");
        
        emit AgentAction(
            msg.sender,
            propertyId,
            "pause_yield",
            "Yield distribution paused by agent",
            bytes32(0),
            block.timestamp
        );
    }

    function flagPropertyDefault(uint256 propertyId, uint256 defaultAmount, string calldata reason) external onlyRole(AGENT_ROLE) {
        _recordDefaultInternal(propertyId, defaultAmount);
        
        emit AgentAction(
            msg.sender,
            propertyId,
            "flag_default",
            reason,
            bytes32(0),
            block.timestamp
        );
    }

    function getAgentDecision(uint256 propertyId) external view returns (
        uint256 propId,
        uint256 action,
        uint256 adjustmentPercent,
        string memory reason,
        uint256 confidence,
        bytes32 recommendationId,
        bool executed,
        uint256 timestamp
    ) {
        AgentDecision memory decision = _pendingAgentDecisions[propertyId];
        return (
            decision.propertyId,
            uint256(decision.action),
            decision.adjustmentPercent,
            decision.reason,
            decision.confidence,
            decision.recommendationId,
            decision.executed,
            decision.timestamp
        );
    }

    function isDecisionExecuted(bytes32 decisionId) external view returns (bool) {
        return _executedDecisions[decisionId];
    }

    function isAgent(address account) external view returns (bool) {
        return hasRole(AGENT_ROLE, account);
    }

    function _actionToString(AgentActionType action) internal pure returns (string memory) {
        if (action == AgentActionType.DISTRIBUTE_YIELD) return "distribute_yield";
        if (action == AgentActionType.PAUSE_YIELD) return "pause_yield";
        if (action == AgentActionType.ADJUST_RENT) return "adjust_rent";
        if (action == AgentActionType.FLAG_DEFAULT) return "flag_default";
        return "none";
    }

    // ============================================================================
    // ADVANCED PRICE FEED & RISK LOGIC - Phase 2
    // ============================================================================

    struct RiskProfile {
        uint256 maxDefaultRatio;
        uint256 maxReserveRatio;
        uint256 minDistributionFrequency;
        uint256 emergencyPauseThreshold;
        bool allowInflationAdjustment;
    }

    mapping(uint256 => RiskProfile) public propertyRiskProfiles;
    mapping(uint256 => uint256) public propertyLastYieldDistribution;
    mapping(uint256 => uint256) public propertyYieldAccumulated;
    mapping(uint256 => uint256) public propertyRiskScore;

    event RiskProfileUpdated(uint256 propertyId, uint256 maxDefaultRatio, uint256 maxReserveRatio);
    event YieldAdjustedForInflation(uint256 propertyId, uint256 oldYield, uint256 newYield, uint256 inflationFactor);
    event RiskThresholdBreached(uint256 propertyId, string metric, uint256 actual, uint256 threshold);
    event AutomaticPauseTriggered(uint256 propertyId, string reason, uint256 riskScore);

    function calculatePropertyInflationAdjustedYield(
        uint256 propertyId,
        uint256 baseYield
    ) external view returns (uint256 adjustedYield) {
        RiskProfile memory profile = propertyRiskProfiles[propertyId];
        
        if (!profile.allowInflationAdjustment || address(inflationIndexFeed) == address(0)) {
            return baseYield;
        }

        (, int256 inflationRate,,,) = inflationIndexFeed.latestRoundData();
        if (inflationRate <= 0) {
            return baseYield;
        }

        uint256 annualInflation = uint256(inflationRate);
        uint256 inflationFactor = 10000 + annualInflation;
        adjustedYield = (baseYield * inflationFactor) / 10000;
    }

    function calculateYieldInUsdFromPool(uint256 yieldAmountEth) external view returns (uint256) {
        uint256 price = lastEthUsdPrice;
        if (price == 0) {
            (, int256 currentPrice,,,) = ethUsdPriceFeed.latestRoundData();
            price = uint256(currentPrice);
        }
        return (yieldAmountEth * price) / 1e8;
    }

    function getYieldDistributionHealth() external view returns (
        uint256 totalPoolUsd,
        uint256 totalDistributedUsd,
        uint256 reserveRatio,
        bool isHealthy
    ) {
        uint256 price = lastEthUsdPrice;
        if (price == 0) {
            (, int256 currentPrice,,,) = ethUsdPriceFeed.latestRoundData();
            price = uint256(currentPrice);
        }

        totalPoolUsd = (totalYieldPool * price) / 1e8;
        totalDistributedUsd = (totalDistributedYield * price) / 1e8;
        reserveRatio = totalDistributedUsd > 0 
            ? (totalPoolUsd * 10000) / totalDistributedUsd 
            : 10000;
        isHealthy = reserveRatio >= minReserveRatio;
    }

    function recordYieldDistribution(uint256 propertyId, uint256 amount) external onlyRole(AGENT_ROLE) {
        propertyLastYieldDistribution[propertyId] = block.timestamp;
        propertyYieldAccumulated[propertyId] += amount;
    }

    function getPropertyYieldInfo(uint256 propertyId) external view returns (
        uint256 lastDistribution,
        uint256 accumulated,
        uint256 daysSinceLast
    ) {
        lastDistribution = propertyLastYieldDistribution[propertyId];
        accumulated = propertyYieldAccumulated[propertyId];
        daysSinceLast = lastDistribution > 0 
            ? (block.timestamp - lastDistribution) / 86400 
            : 0;
    }

    function canDistributeYield(uint256 propertyId) external view returns (bool canDistribute, string memory reason) {
        RiskProfile memory profile = propertyRiskProfiles[propertyId];
        
        if (profile.minDistributionFrequency == 0) {
            profile.minDistributionFrequency = distributionInterval;
        }

        uint256 daysSinceLast = propertyLastYieldDistribution[propertyId] > 0 
            ? (block.timestamp - propertyLastYieldDistribution[propertyId]) / 86400 
            : 0;

        if (daysSinceLast * 86400 < profile.minDistributionFrequency) {
            return (false, "Distribution frequency too low");
        }

        if (propertyRiskScore[propertyId] > profile.emergencyPauseThreshold) {
            return (false, "Risk score too high");
        }

        if (safeguardActive) {
            return (false, "System safeguard active");
        }

        return (true, "OK");
    }

    function autoCheckRiskThresholds(uint256 propertyId) external onlyRole(AGENT_ROLE) returns (bool shouldPause) {
        RiskProfile memory profile = propertyRiskProfiles[propertyId];
        
        if (profile.maxDefaultRatio == 0) {
            profile.maxDefaultRatio = defaultThreshold;
        }

        uint256 defaultRatio = totalYieldPool == 0 ? 0 : (totalDefaults * 10000) / totalYieldPool;
        
        if (defaultRatio > profile.maxDefaultRatio) {
            emit RiskThresholdBreached(
                propertyId, 
                "default_ratio", 
                defaultRatio, 
                profile.maxDefaultRatio
            );
            shouldPause = true;
        }

        if (propertyRiskScore[propertyId] > profile.emergencyPauseThreshold) {
            emit RiskThresholdBreached(
                propertyId,
                "risk_score",
                propertyRiskScore[propertyId],
                profile.emergencyPauseThreshold
            );
            shouldPause = true;
        }

        return shouldPause;
    }

    function getPriceFeedHealth() external view returns (
        bool ethUsdHealthy,
        bool inflationHealthy,
        uint256 ethUsdPrice,
        uint256 inflationIndex,
        uint256 timeSinceUpdate
    ) {
        (, int256 price,, uint256 ethTimestamp,) = ethUsdPriceFeed.latestRoundData();
        ethUsdPrice = price > 0 ? uint256(price) : 0;
        ethUsdHealthy = price > 0 && (block.timestamp - ethTimestamp) < 1 hours;

        if (address(inflationIndexFeed) != address(0)) {
            (, int256 inflation,, uint256 inflationTimestamp,) = inflationIndexFeed.latestRoundData();
            inflationIndex = inflation > 0 ? uint256(inflation) : 0;
            inflationHealthy = inflation > 0 && (block.timestamp - inflationTimestamp) < 1 hours;
        }

        timeSinceUpdate = block.timestamp - priceFeedUpdateTime;
    }

    function getSystemHealth() external view returns (
        bool priceFeedsHealthy,
        bool reservesHealthy,
        bool defaultsHealthy,
        bool systemOperational
    ) {
        priceFeedsHealthy = isPriceFeedHealthy();
        reservesHealthy = checkReserveHealthSimple();
        defaultsHealthy = (totalYieldPool == 0 ? 0 : (totalDefaults * 10000) / totalYieldPool) <= defaultThreshold;
        systemOperational = priceFeedsHealthy && reservesHealthy && defaultsHealthy && !safeguardActive;
    }

    function isPriceFeedHealthy() public view returns (bool) {
        if (address(ethUsdPriceFeed) == address(0)) return false;
        (, int256 price,, uint256 timestamp,) = ethUsdPriceFeed.latestRoundData();
        return price > 0 && (block.timestamp - timestamp) < 1 hours;
    }

    function checkReserveHealthSimple() public view returns (bool) {
        if (totalYieldPool == 0) return true;
        uint256 reserveRatio = totalDistributedYield > 0 
            ? (totalYieldPool * 10000) / totalDistributedYield 
            : 10000;
        return reserveRatio >= minReserveRatio;
    }
}
