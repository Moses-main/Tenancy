// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";

contract PropertyToken is ERC20, ReentrancyGuard {
    address public propertyRegistry;

    modifier onlyRegistry() {
        require(msg.sender == propertyRegistry, "PropertyToken: only registry");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address _propertyRegistry
    ) ERC20(name, symbol) {
        propertyRegistry = _propertyRegistry;
    }

    function mint(address to, uint256 amount) external onlyRegistry {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRegistry {
        _burn(from, amount);
    }
}

contract PropertyRegistry is Ownable, ReentrancyGuard, Pausable, AccessControl {
    struct Property {
        uint256 id;
        string uri;
        uint256 rentAmount;
        uint256 rentFrequency;
        uint256 totalSupply;
        address propertyToken;
        bool isActive;
        bool isPaused;
        address owner;
        uint256 valuationUsd;
        uint256 lastValuationTimestamp;
        uint256 paymentStatus;
        uint256 daysOverdue;
    }

    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    AggregatorV3Interface public ethUsdPriceFeed;

    uint256 public nextPropertyId;
    mapping(uint256 => Property) public properties;
    mapping(address => bool) public issuers;
    mapping(address => bool) public agents;
    mapping(uint256 => mapping(address => uint256)) public userHoldings;
    mapping(uint256 => bytes32[]) public propertyRecommendationIds;
    mapping(uint256 => uint256) public propertyPauseTimestamps;

    event PropertyCreated(
        uint256 indexed propertyId,
        address indexed owner,
        address propertyToken,
        uint256 rentAmount,
        uint256 valuationUsd
    );
    event TokensMinted(
        uint256 indexed propertyId,
        address indexed recipient,
        uint256 amount
    );
    event YieldDistributed(uint256 indexed propertyId, uint256 amount);
    event PropertyValuationUpdated(uint256 indexed propertyId, uint256 valuationUsd);
    event AIRecommendation(
        uint256 indexed propertyId,
        string action,
        uint256 adjustmentPercent,
        string reason,
        uint256 confidence,
        bytes32 recommendationId,
        uint256 timestamp
    );
    event AgentAction(
        address indexed agent,
        uint256 indexed propertyId,
        string actionType,
        string details,
        bytes32 txHash,
        uint256 timestamp
    );
    event RiskAlert(
        uint256 indexed propertyId,
        uint256 alertType,
        string message,
        uint256 value,
        uint256 timestamp
    );
    event PropertyPaused(uint256 indexed propertyId, string reason, uint256 timestamp);
    event PropertyResumed(uint256 indexed propertyId, string reason, uint256 timestamp);
    event RentAdjusted(uint256 indexed propertyId, uint256 oldRent, uint256 newRent, uint256 timestamp);

    modifier onlyIssuer() {
        require(issuers[msg.sender], "PropertyRegistry: not an issuer");
        _;
    }

    constructor(address initialOwner, address _ethUsdPriceFeed) Ownable(initialOwner) {
        issuers[initialOwner] = true;
        agents[initialOwner] = true;
        _grantRole(AGENT_ROLE, initialOwner);
        if (_ethUsdPriceFeed != address(0)) {
            ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
        }
    }

    function setPriceFeed(address _ethUsdPriceFeed) external onlyOwner {
        require(_ethUsdPriceFeed != address(0), "Invalid price feed");
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
    }

    function setIssuer(address _issuer, bool _status) external onlyOwner {
        issuers[_issuer] = _status;
    }

    function getEthUsdPrice() public view returns (uint256) {
        require(address(ethUsdPriceFeed) != address(0), "Price feed not set");
        (, int256 price,,,) = ethUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }

    function calculatePropertyValuation(uint256 annualRentUsd) public view returns (uint256) {
        uint256 capRate = 500;
        return (annualRentUsd * 10000) / capRate;
    }

    function createProperty(
        string memory uri,
        uint256 rentAmount,
        uint256 rentFrequency,
        uint256 initialSupply,
        string memory tokenName,
        string memory tokenSymbol,
        uint256 valuationUsd
    ) external onlyIssuer whenNotPaused nonReentrant returns (address) {
        uint256 propertyId = nextPropertyId++;

        PropertyToken propertyToken = new PropertyToken(
            tokenName,
            tokenSymbol,
            address(this)
        );

        if (valuationUsd == 0 && rentAmount > 0) {
            uint256 annualRent = rentAmount * 12;
            valuationUsd = calculatePropertyValuation(annualRent);
        }

        Property memory newProperty = Property({
            id: propertyId,
            uri: uri,
            rentAmount: rentAmount,
            rentFrequency: rentFrequency,
            totalSupply: initialSupply,
            propertyToken: address(propertyToken),
            isActive: true,
            isPaused: false,
            owner: msg.sender,
            valuationUsd: valuationUsd,
            lastValuationTimestamp: block.timestamp,
            paymentStatus: 0,
            daysOverdue: 0
        });

        properties[propertyId] = newProperty;

        if (initialSupply > 0) {
            PropertyToken(propertyToken).mint(msg.sender, initialSupply);
            userHoldings[propertyId][msg.sender] = initialSupply;
        }

        emit PropertyCreated(propertyId, msg.sender, address(propertyToken), rentAmount, valuationUsd);

        return address(propertyToken);
    }

    function updatePropertyValuation(uint256 propertyId, uint256 newValuationUsd) external onlyIssuer {
        Property storage property = properties[propertyId];
        require(property.owner == msg.sender, "PropertyRegistry: not owner");
        property.valuationUsd = newValuationUsd;
        property.lastValuationTimestamp = block.timestamp;
        emit PropertyValuationUpdated(propertyId, newValuationUsd);
    }

    function refreshValuationFromChainlink(uint256 propertyId) external {
        Property storage property = properties[propertyId];
        require(property.isActive, "PropertyRegistry: property not active");
        
        uint256 price = getEthUsdPrice();
        uint256 updatedValuation = (property.valuationUsd * price) / 1e8;
        property.valuationUsd = updatedValuation;
        property.lastValuationTimestamp = block.timestamp;
        
        emit PropertyValuationUpdated(propertyId, updatedValuation);
    }

    function getPropertyYieldPercentage(uint256 propertyId) external view returns (uint256) {
        Property memory property = properties[propertyId];
        require(property.valuationUsd > 0, "PropertyRegistry: no valuation");
        return (property.rentAmount * 10000) / property.valuationUsd;
    }

    function getPropertyValuationEth(uint256 propertyId) external view returns (uint256) {
        Property memory property = properties[propertyId];
        uint256 price = getEthUsdPrice();
        return (property.valuationUsd * 1e8) / price;
    }

    function mintTokens(uint256 propertyId, address recipient, uint256 amount) external onlyIssuer whenNotPaused nonReentrant {
        Property storage property = properties[propertyId];
        require(property.isActive, "PropertyRegistry: property not active");

        PropertyToken(property.propertyToken).mint(recipient, amount);
        userHoldings[propertyId][recipient] += amount;
        property.totalSupply += amount;

        emit TokensMinted(propertyId, recipient, amount);
    }

    function burnTokens(uint256 propertyId, address from, uint256 amount) external onlyIssuer whenNotPaused nonReentrant {
        Property storage property = properties[propertyId];
        require(property.isActive, "PropertyRegistry: property not active");
        require(userHoldings[propertyId][from] >= amount, "PropertyRegistry: insufficient balance");

        PropertyToken(property.propertyToken).burn(from, amount);
        userHoldings[propertyId][from] -= amount;
        property.totalSupply -= amount;
    }

    function getProperty(uint256 propertyId) external view returns (Property memory) {
        return properties[propertyId];
    }

    function getUserBalance(uint256 propertyId, address user) external view returns (uint256) {
        return userHoldings[propertyId][user];
    }

    function getAllProperties() external view returns (Property[] memory) {
        Property[] memory allProperties = new Property[](nextPropertyId);
        for (uint256 i = 0; i < nextPropertyId; i++) {
            allProperties[i] = properties[i];
        }
        return allProperties;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setAgent(address _agent, bool _status) external onlyOwner {
        agents[_agent] = _status;
        if (_status) {
            _grantRole(AGENT_ROLE, _agent);
        } else {
            _revokeRole(AGENT_ROLE, _agent);
        }
    }

    function pauseProperty(uint256 propertyId, string calldata reason) external onlyRole(AGENT_ROLE) {
        Property storage property = properties[propertyId];
        require(property.isActive, "PropertyRegistry: property not active");
        require(!property.isPaused, "PropertyRegistry: property already paused");
        
        property.isPaused = true;
        propertyPauseTimestamps[propertyId] = block.timestamp;
        
        emit PropertyPaused(propertyId, reason, block.timestamp);
        emit AgentAction(msg.sender, propertyId, "pause_property", reason, bytes32(0), block.timestamp);
    }

    function resumeProperty(uint256 propertyId, string calldata reason) external onlyRole(AGENT_ROLE) {
        Property storage property = properties[propertyId];
        require(property.isPaused, "PropertyRegistry: property not paused");
        
        property.isPaused = false;
        
        emit PropertyResumed(propertyId, reason, block.timestamp);
        emit AgentAction(msg.sender, propertyId, "resume_property", reason, bytes32(0), block.timestamp);
    }

    function adjustRent(uint256 propertyId, uint256 newRentAmount, string calldata reason) external onlyRole(AGENT_ROLE) returns (uint256 oldRent) {
        Property storage property = properties[propertyId];
        require(property.isActive, "PropertyRegistry: property not active");
        
        oldRent = property.rentAmount;
        property.rentAmount = newRentAmount;
        
        emit RentAdjusted(propertyId, oldRent, newRentAmount, block.timestamp);
        emit AgentAction(
            msg.sender, 
            propertyId, 
            "adjust_rent", 
            string(abi.encodePacked(reason, " - Old: ", Strings.toString(oldRent), " New: ", Strings.toString(newRentAmount))),
            bytes32(0), 
            block.timestamp
        );
    }

    function emitAIRecommendation(
        uint256 propertyId,
        string calldata action,
        uint256 adjustmentPercent,
        string calldata reason,
        uint256 confidence
    ) external onlyRole(AGENT_ROLE) returns (bytes32 recommendationId) {
        Property storage property = properties[propertyId];
        require(property.isActive, "PropertyRegistry: property not active");
        
        recommendationId = keccak256(
            abi.encodePacked(propertyId, action, block.timestamp, confidence)
        );
        
        propertyRecommendationIds[propertyId].push(recommendationId);
        
        emit AIRecommendation(
            propertyId,
            action,
            adjustmentPercent,
            reason,
            confidence,
            recommendationId,
            block.timestamp
        );
        emit AgentAction(
            msg.sender,
            propertyId,
            "ai_recommendation",
            string(abi.encodePacked("Action: ", action, " Confidence: ", Strings.toString(confidence))),
            recommendationId,
            block.timestamp
        );
    }

    function emitRiskAlert(
        uint256 propertyId,
        uint256 alertType,
        string calldata message,
        uint256 value
    ) external onlyRole(AGENT_ROLE) {
        emit RiskAlert(propertyId, alertType, message, value, block.timestamp);
        emit AgentAction(
            msg.sender,
            propertyId,
            "risk_alert",
            message,
            bytes32(0),
            block.timestamp
        );
    }

    function updatePaymentStatus(
        uint256 propertyId,
        uint256 newPaymentStatus,
        uint256 daysOverdue
    ) external onlyRole(AGENT_ROLE) {
        Property storage property = properties[propertyId];
        property.paymentStatus = newPaymentStatus;
        property.daysOverdue = daysOverdue;
        
        if (daysOverdue > 30) {
            emit RiskAlert(propertyId, 1, "Payment overdue > 30 days", daysOverdue, block.timestamp);
        }
    }

    function getPropertyStatus(uint256 propertyId) external view returns (
        bool isActive,
        bool isPaused,
        uint256 rentAmount,
        uint256 paymentStatus,
        uint256 daysOverdue,
        uint256 valuationUsd
    ) {
        Property memory property = properties[propertyId];
        return (
            property.isActive,
            property.isPaused,
            property.rentAmount,
            property.paymentStatus,
            property.daysOverdue,
            property.valuationUsd
        );
    }

    function getRecommendationCount(uint256 propertyId) external view returns (uint256) {
        return propertyRecommendationIds[propertyId].length;
    }

    function isPropertyPaused(uint256 propertyId) external view returns (bool) {
        return properties[propertyId].isPaused;
    }

    function isAgent(address account) external view returns (bool) {
        return agents[account];
    }
}
