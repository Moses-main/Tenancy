// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PropertyRegistry} from "./PropertyRegistry.sol";
import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";

contract YieldDistributor is Ownable {
    PropertyRegistry public propertyRegistry;
    IERC20 public tenToken;
    AggregatorV3Interface public ethUsdPriceFeed;

    struct Distribution {
        uint256 propertyId;
        uint256 totalAmount;
        uint256 timestamp;
        bool executed;
    }

    uint256 public nextDistributionId;
    mapping(uint256 => Distribution) public distributions;
    mapping(uint256 => mapping(address => uint256)) public pendingYield;

    event YieldDeposited(uint256 indexed distributionId, uint256 amount, address indexed from);
    event YieldDistributed(uint256 indexed distributionId, uint256 propertyId, uint256 totalAmount);
    event YieldClaimed(address indexed user, uint256 propertyId, uint256 amount);

    modifier onlyPropertyOwner(uint256 propertyId) {
        require(
            propertyRegistry.getProperty(propertyId).owner == msg.sender,
            "YieldDistributor: not property owner"
        );
        _;
    }

    constructor(address initialOwner, address _propertyRegistry, address _tenToken, address _ethUsdPriceFeed) 
        Ownable(initialOwner) 
    {
        propertyRegistry = PropertyRegistry(_propertyRegistry);
        tenToken = IERC20(_tenToken);
        if (_ethUsdPriceFeed != address(0)) {
            ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
        }
    }

    function setPriceFeed(address _ethUsdPriceFeed) external onlyOwner {
        require(_ethUsdPriceFeed != address(0), "Invalid price feed");
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
    }

    function getEthUsdPrice() public view returns (uint256) {
        require(address(ethUsdPriceFeed) != address(0), "Price feed not set");
        (, int256 price,,,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }

    function depositYield(uint256 propertyId, uint256 amount) external onlyPropertyOwner(propertyId) {
        require(amount > 0, "YieldDistributor: amount must be > 0");
        require(tenToken.transferFrom(msg.sender, address(this), amount), "YieldDistributor: transfer failed");

        uint256 distributionId = nextDistributionId++;
        distributions[distributionId] = Distribution({
            propertyId: propertyId,
            totalAmount: amount,
            timestamp: block.timestamp,
            executed: false
        });

        emit YieldDeposited(distributionId, amount, msg.sender);
    }

    function depositYieldEth(uint256 propertyId) external payable onlyPropertyOwner(propertyId) {
        require(msg.value > 0, "YieldDistributor: must send ETH");
        
        uint256 distributionId = nextDistributionId++;
        distributions[distributionId] = Distribution({
            propertyId: propertyId,
            totalAmount: msg.value,
            timestamp: block.timestamp,
            executed: false
        });

        emit YieldDeposited(distributionId, msg.value, msg.sender);
    }

    function distributeYield(uint256 distributionId) external onlyOwner {
        Distribution storage distribution = distributions[distributionId];
        require(!distribution.executed, "YieldDistributor: already distributed");
        require(distribution.totalAmount > 0, "YieldDistributor: no yield to distribute");

        distribution.executed = true;

        emit YieldDistributed(distributionId, distribution.propertyId, distribution.totalAmount);
    }

    function calculateYield(uint256 propertyId, address user) public view returns (uint256) {
        uint256 userBalance = propertyRegistry.getUserBalance(propertyId, user);
        uint256 totalSupply = propertyRegistry.getProperty(propertyId).totalSupply;

        if (totalSupply == 0 || userBalance == 0) {
            return 0;
        }

        return userBalance;
    }

    function calculateYieldUsd(uint256 propertyId, address user) external view returns (uint256) {
        uint256 userBalance = propertyRegistry.getUserBalance(propertyId, user);
        uint256 totalSupply = propertyRegistry.getProperty(propertyId).totalSupply;
        
        if (totalSupply == 0 || userBalance == 0) {
            return 0;
        }

        uint256 totalPending = 0;
        for (uint256 i = 0; i < nextDistributionId; i++) {
            Distribution storage dist = distributions[i];
            if (dist.propertyId == propertyId && dist.executed) {
                uint256 userShare = (dist.totalAmount * userBalance) / totalSupply;
                totalPending += userShare;
            }
        }

        uint256 price = getEthUsdPrice();
        return (totalPending * price) / 1e8;
    }

    function claimYield(uint256 propertyId) external {
        uint256 userBalance = propertyRegistry.getUserBalance(propertyId, msg.sender);
        require(userBalance > 0, "YieldDistributor: no holdings");

        uint256 totalPending = 0;
        for (uint256 i = 0; i < nextDistributionId; i++) {
            Distribution storage dist = distributions[i];
            if (dist.propertyId == propertyId && dist.executed) {
                uint256 userShare = (dist.totalAmount * userBalance) / propertyRegistry.getProperty(propertyId).totalSupply;
                totalPending += userShare;
            }
        }

        require(totalPending > 0, "YieldDistributor: no yield to claim");
        
        tenToken.transfer(msg.sender, totalPending);
        emit YieldClaimed(msg.sender, propertyId, totalPending);
    }

    function getPendingYield(uint256 propertyId, address user) external view returns (uint256) {
        uint256 userBalance = propertyRegistry.getUserBalance(propertyId, user);
        uint256 totalSupply = propertyRegistry.getProperty(propertyId).totalSupply;
        
        if (totalSupply == 0 || userBalance == 0) {
            return 0;
        }

        uint256 totalPending = 0;
        for (uint256 i = 0; i < nextDistributionId; i++) {
            Distribution storage dist = distributions[i];
            if (dist.propertyId == propertyId && dist.executed) {
                uint256 userShare = (dist.totalAmount * userBalance) / totalSupply;
                totalPending += userShare;
            }
        }

        return totalPending;
    }
}
