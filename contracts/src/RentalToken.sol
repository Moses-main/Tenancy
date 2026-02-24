// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract RentalToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18;
    
    uint256 private _totalYield;
    uint256 private _totalProperties;
    
    struct Property {
        string name;
        string description;
        string metadataURI;
        uint256 rentAmount;
        uint256 tenantCount;
        uint256 yieldRate; // yield per token
        bool isActive;
    }
    
    mapping(address => uint256) private _propertyBalances;
    mapping(uint256 => Property) private _properties;
    mapping(uint256 => address[]) private _propertyTokenHolders;
    
    event PropertyRegistered(uint256 propertyId, string name, uint256 rentAmount);
    event YieldDistributed(uint256 propertyId, uint256 amount);
    event YieldClaimed(address indexed claimant, uint256 amount);
    
    constructor(address initialOwner)
        ERC20("Rental Token", "RENT")
        Ownable(initialOwner)
    {
    }
    
    function registerProperty(
        string memory _name,
        string memory _description,
        string memory _metadataURI,
        uint256 _rentAmount,
        uint256 _tenantCount
    ) external onlyOwner returns (uint256 propertyId) {
        propertyId = _totalProperties + 1;
        
        Property memory newProperty = Property({
            name: _name,
            description: _description,
            metadataURI: _metadataURI,
            rentAmount: _rentAmount,
            tenantCount: _tenantCount,
            yieldRate: _rentAmount / _tenantCount,
            isActive: true
        });
        
        _properties[propertyId] = newProperty;
        _totalProperties = propertyId;
        
        emit PropertyRegistered(propertyId, _name, _rentAmount);
    }
    
    function distributeYield(uint256 propertyId, uint256 amount) external onlyOwner {
        require(_properties[propertyId].isActive, "Property not active");
        
        _totalYield += amount;
        
        // Calculate pro-rata distribution
        address[] storage holders = _propertyTokenHolders[propertyId];
        uint256 totalTokens = ERC20.totalSupply();
        
        for (uint256 i = 0; i < holders.length; i++) {
            address holder = holders[i];
            uint256 holderBalance = balanceOf(holder);
            uint256 holderYield = (holderBalance * amount) / totalTokens;
            
            _propertyBalances[holder] += holderYield;
        }
        
        emit YieldDistributed(propertyId, amount);
    }
    
    function claimYield() external {
        uint256 amount = _propertyBalances[msg.sender];
        require(amount > 0, "No yield to claim");
        
        _propertyBalances[msg.sender] = 0;
        _mint(msg.sender, amount);
        
        emit YieldClaimed(msg.sender, amount);
    }
    
    function buyTokens(uint256 amount) external payable {
        require(msg.value >= amount * 0.01 ether, "Minimum price not met");
        _mint(msg.sender, amount);
    }
    
    function sellTokens(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _burn(msg.sender, amount);
        
        // Send ETH back to user (simplified - would need proper pricing)
        payable(msg.sender).transfer(amount * 1e16);
    }
    
    function getTotalYield() external view returns (uint256) {
        return _totalYield;
    }
    
    function getPropertyYield(uint256 propertyId) external view returns (uint256) {
        return _properties[propertyId].yieldRate * _properties[propertyId].tenantCount;
    }
    
    function getPropertyInfo(uint256 propertyId) external view returns (string memory, string memory, string memory, uint256, uint256, uint256, bool) {
        Property storage property = _properties[propertyId];
        return (
            property.name,
            property.description,
            property.metadataURI,
            property.rentAmount,
            property.tenantCount,
            property.yieldRate,
            property.isActive
        );
    }
    
    function addTokenHolderToProperty(uint256 propertyId, address holder) external onlyOwner {
        _propertyTokenHolders[propertyId].push(holder);
    }
    
    function removeTokenHolderFromProperty(uint256 propertyId, address holder) external onlyOwner {
        address[] storage holders = _propertyTokenHolders[propertyId];
        for (uint256 i = 0; i < holders.length; i++) {
            if (holders[i] == holder) {
                holders[i] = holders[holders.length - 1];
                holders.pop();
                break;
            }
        }
    }
}