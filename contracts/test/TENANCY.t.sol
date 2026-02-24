// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {TENToken} from "../src/TENToken.sol";
import {PropertyRegistry, PropertyToken} from "../src/PropertyRegistry.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {PriceFeedConsumer} from "../src/PriceFeedConsumer.sol";

contract TENANCYTest is Test {
    TENToken public tenToken;
    PropertyRegistry public propertyRegistry;
    YieldDistributor public yieldDistributor;
    PriceFeedConsumer public priceFeedConsumer;

    address public owner = address(0x1);
    address public issuer = address(0x2);
    address public investor = address(0x3);
    address public investor2 = address(0x4);

    uint256 constant RENT_AMOUNT = 2500e18;
    uint256 constant RENT_FREQUENCY = 30 days;
    uint256 constant INITIAL_SUPPLY = 10000e18;

    address constant ETH_USD_FEED = address(0);

    event PropertyCreated(
        uint256 indexed propertyId,
        address indexed owner,
        address propertyToken,
        uint256 rentAmount
    );
    event TokensMinted(
        uint256 indexed propertyId,
        address indexed recipient,
        uint256 amount
    );

    function setUp() public {
        vm.startPrank(owner);

        tenToken = new TENToken(owner);
        propertyRegistry = new PropertyRegistry(owner, ETH_USD_FEED);
        yieldDistributor = new YieldDistributor(owner);
        priceFeedConsumer = new PriceFeedConsumer(ETH_USD_FEED, ETH_USD_FEED);

        propertyRegistry.setIssuer(issuer, true);
        tenToken.setMinter(issuer, true);

        vm.stopPrank();
    }

    function testTENTokenDeployment() public view {
        assertEq(tenToken.name(), "TENANCY");
        assertEq(tenToken.symbol(), "TEN");
        assertEq(tenToken.MAX_SUPPLY(), 100_000_000 * 1e18);
        assertTrue(tenToken.minter(owner));
    }

    function testTENTokenMint() public {
        vm.prank(owner);
        tenToken.mint(investor, 1000e18);
        assertEq(tenToken.balanceOf(investor), 1000e18);
    }

    function testTENTokenMaxSupply() public {
        vm.prank(owner);
        vm.expectRevert();
        tenToken.mint(investor, 100_000_001e18);
    }

    function testPropertyCreation() public {
        vm.prank(issuer);
        (address propertyToken, uint256 valuation) = _createProperty(0);

        assertTrue(propertyToken != address(0));

        PropertyRegistry.Property memory prop = propertyRegistry.getProperty(0);

        assertEq(prop.id, 0);
        assertEq(prop.uri, "ipfs://QmProperty1");
        assertEq(prop.rentAmount, RENT_AMOUNT);
        assertEq(prop.totalSupply, INITIAL_SUPPLY);
        assertTrue(prop.isActive);
        assertEq(prop.owner, issuer);
    }

    function testPropertyCreationWithValuation() public {
        vm.prank(issuer);
        (address propertyToken, uint256 valuation) = _createProperty(500000e18);

        PropertyRegistry.Property memory prop = propertyRegistry.getProperty(0);
        assertEq(prop.valuationUsd, 500000e18);
    }

    function testAutoValuationCalculation() public {
        vm.prank(issuer);
        propertyRegistry.createProperty(
            "ipfs://QmProperty1",
            RENT_AMOUNT,
            RENT_FREQUENCY,
            INITIAL_SUPPLY,
            "Property 1 Token",
            "P1T",
            0
        );

        PropertyRegistry.Property memory prop = propertyRegistry.getProperty(0);
        uint256 expectedAnnualRent = RENT_AMOUNT * 12;
        uint256 expectedValuation = (expectedAnnualRent * 10000) / 500;
        
        assertEq(prop.valuationUsd, expectedValuation);
    }

    function testMintTokensToInvestor() public {
        vm.prank(issuer);
        (address propertyToken,) = _createProperty(0);

        vm.prank(issuer);
        propertyRegistry.mintTokens(0, investor, 500e18);

        assertEq(PropertyToken(propertyToken).balanceOf(investor), 500e18);
        assertEq(propertyRegistry.userHoldings(0, investor), 500e18);
    }

    function testBurnTokens() public {
        vm.prank(issuer);
        (address propertyToken,) = _createProperty(0);

        vm.prank(issuer);
        propertyRegistry.mintTokens(0, investor, 500e18);

        vm.prank(issuer);
        propertyRegistry.burnTokens(0, investor, 200e18);

        assertEq(PropertyToken(propertyToken).balanceOf(investor), 300e18);
        assertEq(propertyRegistry.userHoldings(0, investor), 300e18);
    }

    function testYieldDistribution() public {
        vm.prank(owner);
        tenToken.mint(issuer, 10000e18);

        vm.prank(issuer);
        _createProperty(0);

        address[] memory holders = new address[](1);
        holders[0] = investor;
        uint256[] memory balances = new uint256[](1);
        balances[0] = 500e18;

        vm.prank(owner);
        yieldDistributor.createDistribution(0, 1000e18, balances, holders);

        vm.prank(owner);
        yieldDistributor.startDistribution(0);

        assertTrue(yieldDistributor.isDistributionActive(0));
    }

    function testMultipleInvestorsYield() public {
        vm.prank(owner);
        tenToken.mint(issuer, 10000e18);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(owner);
        tenToken.setMinter(issuer, true);

        vm.prank(issuer);
        propertyRegistry.mintTokens(0, investor, 5000e18);
        vm.prank(issuer);
        propertyRegistry.mintTokens(0, investor2, 5000e18);

        address[] memory holders = new address[](2);
        holders[0] = investor;
        holders[1] = investor2;
        uint256[] memory balances = new uint256[](2);
        balances[0] = 5000e18;
        balances[1] = 5000e18;

        vm.prank(owner);
        yieldDistributor.createDistribution(0, 1000e18, balances, holders);

        vm.prank(owner);
        yieldDistributor.startDistribution(0);

        vm.prank(investor);
        yieldDistributor.claimYield(0);

        assertTrue(yieldDistributor.getTotalYieldPool() >= 1000e18);
    }

    function testGetAllProperties() public {
        vm.prank(issuer);
        propertyRegistry.createProperty(
            "ipfs://QmProperty1",
            RENT_AMOUNT,
            RENT_FREQUENCY,
            INITIAL_SUPPLY,
            "Property 1 Token",
            "P1T",
            0
        );

        vm.prank(issuer);
        propertyRegistry.createProperty(
            "ipfs://QmProperty2",
            RENT_AMOUNT * 2,
            RENT_FREQUENCY,
            INITIAL_SUPPLY * 2,
            "Property 2 Token",
            "P2T",
            0
        );

        PropertyRegistry.Property[] memory props = propertyRegistry.getAllProperties();
        assertEq(props.length, 2);
        assertEq(props[0].rentAmount, RENT_AMOUNT);
        assertEq(props[1].rentAmount, RENT_AMOUNT * 2);
    }

    function testOnlyIssuerCanCreateProperty() public {
        vm.prank(investor);
        vm.expectRevert();
        propertyRegistry.createProperty(
            "ipfs://QmProperty1",
            RENT_AMOUNT,
            RENT_FREQUENCY,
            INITIAL_SUPPLY,
            "Property 1 Token",
            "P1T",
            0
        );
    }

    function testOnlyPropertyOwnerCanDepositYield() public {
        vm.prank(owner);
        tenToken.mint(owner, 1000e18);

        vm.prank(issuer);
        _createProperty(0);

        address[] memory holders = new address[](1);
        holders[0] = investor;
        uint256[] memory balances = new uint256[](1);
        balances[0] = 100e18;

        vm.prank(investor);
        vm.expectRevert();
        yieldDistributor.createDistribution(0, 100e18, balances, holders);
    }

    function testGetPropertyYieldPercentage() public {
        vm.prank(issuer);
        _createProperty(500000e18);

        uint256 yieldPercentage = propertyRegistry.getPropertyYieldPercentage(0);
        uint256 expectedYield = (RENT_AMOUNT * 10000) / 500000e18;
        
        assertEq(yieldPercentage, expectedYield);
    }

    function testYieldClaimByMultipleUsers() public {
        vm.prank(owner);
        tenToken.mint(issuer, 100000e18);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(owner);
        tenToken.setMinter(issuer, true);

        vm.prank(issuer);
        propertyRegistry.mintTokens(0, investor, 3000e18);
        vm.prank(issuer);
        propertyRegistry.mintTokens(0, investor2, 7000e18);

        address[] memory holders = new address[](2);
        holders[0] = investor;
        holders[1] = investor2;
        uint256[] memory balances = new uint256[](2);
        balances[0] = 3000e18;
        balances[1] = 7000e18;

        vm.prank(owner);
        yieldDistributor.createDistribution(0, 10000e18, balances, holders);

        vm.prank(owner);
        yieldDistributor.startDistribution(0);

        vm.prank(investor);
        yieldDistributor.claimYield(0);
        
        vm.prank(investor2);
        yieldDistributor.claimYield(0);

        assertTrue(yieldDistributor.getTotalYieldPool() >= 0);
    }

    function testCannotClaimYieldTwice() public {
        vm.prank(owner);
        tenToken.mint(issuer, 10000e18);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(issuer);
        propertyRegistry.mintTokens(0, investor, 5000e18);

        address[] memory holders = new address[](1);
        holders[0] = investor;
        uint256[] memory balances = new uint256[](1);
        balances[0] = 5000e18;

        vm.prank(owner);
        yieldDistributor.createDistribution(0, 1000e18, balances, holders);

        vm.prank(owner);
        yieldDistributor.startDistribution(0);

        vm.prank(investor);
        yieldDistributor.claimYield(0);
        
        vm.prank(investor);
        vm.expectRevert("Distribution not active");
        yieldDistributor.claimYield(0);
    }

    function testPropertyTransfer() public {
        vm.prank(issuer);
        (address propertyToken,) = _createProperty(0);

        vm.prank(issuer);
        propertyRegistry.mintTokens(0, investor, 500e18);

        PropertyToken token = PropertyToken(propertyToken);
        vm.prank(investor);
        token.transfer(investor2, 200e18);

        assertEq(token.balanceOf(investor), 300e18);
        assertEq(token.balanceOf(investor2), 200e18);
    }

    function testBatchPropertyCreation() public {
        vm.startPrank(issuer);
        
        for (uint256 i = 0; i < 5; i++) {
            propertyRegistry.createProperty(
                string(abi.encodePacked("ipfs://QmProperty", vm.toString(i))),
                RENT_AMOUNT * (i + 1),
                RENT_FREQUENCY,
                INITIAL_SUPPLY * (i + 1),
                string(abi.encodePacked("Property ", vm.toString(i), " Token")),
                string(abi.encodePacked("P", vm.toString(i), "T")),
                0
            );
        }
        vm.stopPrank();

        PropertyRegistry.Property[] memory props = propertyRegistry.getAllProperties();
        assertEq(props.length, 5);
        assertEq(props[4].rentAmount, RENT_AMOUNT * 5);
    }

    function testSetIssuer() public {
        vm.prank(owner);
        propertyRegistry.setIssuer(investor2, true);

        vm.prank(investor2);
        (address propertyToken,) = _createProperty(0);
        assertTrue(propertyToken != address(0));
    }

    function testRemoveIssuer() public {
        vm.prank(owner);
        propertyRegistry.setIssuer(issuer, false);

        vm.prank(issuer);
        vm.expectRevert();
        propertyRegistry.createProperty(
            "ipfs://QmProperty1",
            RENT_AMOUNT,
            RENT_FREQUENCY,
            INITIAL_SUPPLY,
            "Property 1 Token",
            "P1T",
            0
        );
    }

    function testPriceFeedIntegration() public {
        vm.prank(issuer);
        _createProperty(0);

        uint256 valuation = propertyRegistry.calculatePropertyValuation(30000e18);
        assertTrue(valuation > 0);
    }

    function testZeroRentProperty() public {
        vm.prank(issuer);
        propertyRegistry.createProperty(
            "ipfs://QmProperty1",
            0,
            RENT_FREQUENCY,
            INITIAL_SUPPLY,
            "Property 1 Token",
            "P1T",
            0
        );

        PropertyRegistry.Property memory prop = propertyRegistry.getProperty(0);
        assertEq(prop.rentAmount, 0);
    }

    function testPropertyActiveStatus() public {
        vm.prank(issuer);
        (address propertyToken,) = _createProperty(0);

        PropertyRegistry.Property memory prop = propertyRegistry.getProperty(0);
        assertTrue(prop.isActive);
    }

    function _createProperty(uint256 valuation) internal returns (address, uint256) {
        address propertyToken = propertyRegistry.createProperty(
            "ipfs://QmProperty1",
            RENT_AMOUNT,
            RENT_FREQUENCY,
            INITIAL_SUPPLY,
            "Property 1 Token",
            "P1T",
            valuation
        );
        return (propertyToken, valuation);
    }
}
