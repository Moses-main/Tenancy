// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IPFSInterface {
    function store(string memory data) external returns (string memory ipfsHash);
    function retrieve(string memory ipfsHash) external returns (string memory data);
}

interface IPriceFeed {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
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
    
    uint256 public totalYieldPool;
    uint256 public totalDistributedYield;
    uint256 public lastDistributionTimestamp;
    uint256 public distributionInterval = 86400; // 24 hours
    
    uint256 public defaultYieldRate = 1000; // base yield rate
    
    event DistributionStarted(uint256 distributionId, uint256 propertyId, uint256 totalYield);
    event DistributionCompleted(uint256 distributionId, uint256 propertyId, uint256 distributedYield);
    event DistributionPaused(uint256 distributionId, uint256 propertyId);
    event DistributionResumed(uint256 distributionId, uint256 propertyId);
    event YieldClaimed(address indexed claimant, uint256 amount);
    event YieldPoolUpdated(uint256 newTotal, uint256 change);
    
    constructor(address initialOwner) Ownable(initialOwner) {
        _distributionCount = 0;
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
}
