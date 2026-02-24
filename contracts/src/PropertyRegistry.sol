// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
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

contract PropertyRegistry is Ownable, ReentrancyGuard, Pausable {
    struct Property {
        uint256 id;
        string uri;
        uint256 rentAmount;
        uint256 rentFrequency;
        uint256 totalSupply;
        address propertyToken;
        bool isActive;
        address owner;
        uint256 valuationUsd;
        uint256 lastValuationTimestamp;
    }

    AggregatorV3Interface public ethUsdPriceFeed;

    uint256 public nextPropertyId;
    mapping(uint256 => Property) public properties;
    mapping(address => bool) public issuers;
    mapping(uint256 => mapping(address => uint256)) public userHoldings;

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

    modifier onlyIssuer() {
        require(issuers[msg.sender], "PropertyRegistry: not an issuer");
        _;
    }

    constructor(address initialOwner, address _ethUsdPriceFeed) Ownable(initialOwner) {
        issuers[initialOwner] = true;
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
            owner: msg.sender,
            valuationUsd: valuationUsd,
            lastValuationTimestamp: block.timestamp
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
}
