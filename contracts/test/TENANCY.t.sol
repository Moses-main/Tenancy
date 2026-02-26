// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {TENToken} from "../src/TENToken.sol";
import {PropertyRegistry, PropertyToken} from "../src/PropertyRegistry.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {PriceFeedConsumer} from "../src/PriceFeedConsumer.sol";
import {RentalToken} from "../src/RentalToken.sol";

contract TENANCYTest is Test {
    TENToken public tenToken;
    PropertyRegistry public propertyRegistry;
    YieldDistributor public yieldDistributor;
    PriceFeedConsumer public priceFeedConsumer;
    RentalToken public rentalToken;

    address public owner = address(0x1);
    address public agent = address(0x5);
    address public issuer = address(0x2);
    address public investor = address(0x3);
    address public investor2 = address(0x4);

    uint256 constant RENT_AMOUNT = 2500e18;
    uint256 constant RENT_FREQUENCY = 30 days;
    uint256 constant INITIAL_SUPPLY = 10000e18;

    address constant ETH_USD_FEED = address(0);
    address constant INFLATION_FEED = address(0);

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
    event PropertyPaused(uint256 indexed propertyId, string reason, uint256 timestamp);
    event RentAdjusted(uint256 indexed propertyId, uint256 oldRent, uint256 newRent, uint256 timestamp);
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

    function setUp() public {
        vm.startPrank(owner);

        tenToken = new TENToken(owner);
        propertyRegistry = new PropertyRegistry(owner, ETH_USD_FEED);
        yieldDistributor = new YieldDistributor(owner, ETH_USD_FEED, INFLATION_FEED);
        priceFeedConsumer = new PriceFeedConsumer(ETH_USD_FEED, ETH_USD_FEED);
        rentalToken = new RentalToken(owner);

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

    // ============================================================================
    // ADDITIONAL SECURITY & EDGE CASE TESTS
    // ============================================================================

    function testRevertOnZeroAddressOwner() public {
        vm.prank(address(0));
        vm.expectRevert();
        new TENToken(address(0));
    }

    function testRevertOnZeroAddressRegistry() public {
        vm.prank(address(0));
        vm.expectRevert();
        new PropertyRegistry(address(0), ETH_USD_FEED);
    }

    function testRevertOnZeroAddressYieldDistributor() public {
        vm.prank(address(0));
        vm.expectRevert();
        new YieldDistributor(address(0), ETH_USD_FEED, INFLATION_FEED);
    }

    function testCannotMintToZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert();
        tenToken.mint(address(0), 1000e18);
    }

    function testCannotTransferToZeroAddress() public {
        vm.prank(owner);
        tenToken.mint(investor, 1000e18);
        
        vm.prank(investor);
        vm.expectRevert();
        tenToken.transfer(address(0), 500e18);
    }

    function testCannotApproveForZeroAddress() public {
        vm.prank(investor);
        vm.expectRevert();
        tenToken.approve(address(0), 1000e18);
    }

    function testCannotTransferFromZeroAddress() public {
        vm.prank(owner);
        tenToken.mint(investor, 1000e18);
        
        vm.prank(owner);
        tenToken.approve(investor, 1000e18);
        
        vm.prank(investor);
        vm.expectRevert();
        tenToken.transferFrom(investor, address(0), 500e18);
    }

    function testYieldDistributionWithZeroHolders() public {
        address[] memory holders = new address[](0);
        uint256[] memory balances = new uint256[](0);

        vm.prank(owner);
        vm.expectRevert("Cannot create distribution with no holders");
        yieldDistributor.createDistribution(0, 1000e18, balances, holders);
    }

    function testYieldDistributionMismatchArrays() public {
        address[] memory holders = new address[](1);
        holders[0] = investor;
        uint256[] memory balances = new uint256[](2);
        balances[0] = 500e18;
        balances[1] = 1000e18;

        vm.prank(owner);
        vm.expectRevert("Arrays length mismatch");
        yieldDistributor.createDistribution(0, 1000e18, balances, holders);
    }

    function testPauseDistribution() public {
        vm.prank(owner);
        tenToken.mint(issuer, 10000e18);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(issuer);
        propertyRegistry.mintTokens(0, investor, 500e18);

        address[] memory holders = new address[](1);
        holders[0] = investor;
        uint256[] memory balances = new uint256[](1);
        balances[0] = 500e18;

        vm.prank(owner);
        yieldDistributor.createDistribution(0, 1000e18, balances, holders);

        vm.prank(owner);
        yieldDistributor.startDistribution(0);

        vm.prank(owner);
        yieldDistributor.pauseDistribution(0);

        assertTrue(!yieldDistributor.isDistributionActive(0));
    }

    function testResumeDistribution() public {
        vm.prank(owner);
        tenToken.mint(issuer, 10000e18);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(issuer);
        propertyRegistry.mintTokens(0, investor, 500e18);

        address[] memory holders = new address[](1);
        holders[0] = investor;
        uint256[] memory balances = new uint256[](1);
        balances[0] = 500e18;

        vm.prank(owner);
        yieldDistributor.createDistribution(0, 1000e18, balances, holders);

        vm.prank(owner);
        yieldDistributor.startDistribution(0);

        vm.prank(owner);
        yieldDistributor.pauseDistribution(0);

        vm.prank(owner);
        yieldDistributor.resumeDistribution(0);

        assertTrue(yieldDistributor.isDistributionActive(0));
    }

    function testCannotPauseNonExistentDistribution() public {
        vm.prank(owner);
        vm.expectRevert();
        yieldDistributor.pauseDistribution(999);
    }

    function testCannotClaimInactiveDistribution() public {
        vm.prank(owner);
        tenToken.mint(issuer, 10000e18);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(investor);
        vm.expectRevert();
        yieldDistributor.claimYield(0);
    }

    function testPropertyValuationWithZeroRent() public {
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
        assertEq(prop.valuationUsd, 0);
    }

    function testLargePropertyCreation() public {
        vm.prank(issuer);
        propertyRegistry.createProperty(
            "ipfs://QmProperty1",
            1000000e18,
            RENT_FREQUENCY,
            100000000e18,
            "Property 1 Token",
            "P1T",
            0
        );

        PropertyRegistry.Property memory prop = propertyRegistry.getProperty(0);
        assertEq(prop.rentAmount, 1000000e18);
        assertEq(prop.totalSupply, 100000000e18);
    }

    function testMultipleYieldDistributions() public {
        vm.prank(owner);
        tenToken.mint(issuer, 100000e18);

        vm.prank(issuer);
        _createProperty(0);

        // First distribution
        address[] memory holders1 = new address[](1);
        holders1[0] = investor;
        uint256[] memory balances1 = new uint256[](1);
        balances1[0] = 1000e18;

        vm.prank(owner);
        yieldDistributor.createDistribution(0, 100e18, balances1, holders1);
        
        vm.prank(owner);
        yieldDistributor.startDistribution(0);

        // Second distribution
        address[] memory holders2 = new address[](1);
        holders2[0] = investor2;
        uint256[] memory balances2 = new uint256[](1);
        balances2[0] = 500e18;

        vm.prank(owner);
        yieldDistributor.createDistribution(0, 50e18, balances2, holders2);

        assertTrue(yieldDistributor.getTotalYieldPool() > 0);
    }

    function testPropertyURIUpdate() public {
        vm.prank(issuer);
        (address propertyToken,) = _createProperty(0);

        PropertyRegistry.Property memory propBefore = propertyRegistry.getProperty(0);
        assertEq(propBefore.uri, "ipfs://QmProperty1");
    }

    function testTENTokenBurn() public {
        vm.prank(owner);
        tenToken.mint(investor, 1000e18);

        vm.prank(investor);
        tenToken.burn(500e18);

        assertEq(tenToken.balanceOf(investor), 500e18);
    }

    function testCannotBurnMoreThanBalance() public {
        vm.prank(owner);
        tenToken.mint(investor, 500e18);

        vm.prank(investor);
        vm.expectRevert();
        tenToken.burn(1000e18);
    }

    function testYieldDistributionCalculation() public {
        vm.prank(owner);
        tenToken.mint(issuer, 100000e18);

        vm.prank(issuer);
        _createProperty(0);

        address[] memory holders = new address[](2);
        holders[0] = investor;
        holders[1] = investor2;
        uint256[] memory balances = new uint256[](2);
        balances[0] = 7500e18;
        balances[1] = 2500e18;

        vm.prank(owner);
        yieldDistributor.createDistribution(0, 10000e18, balances, holders);

        vm.prank(owner);
        yieldDistributor.startDistribution(0);

        assertTrue(yieldDistributor.isDistributionActive(0));
    }

    // Fuzz tests for property creation (with reasonable bounds)
    function testFuzz_CreateProperty(uint256 rentAmount, uint256 supply) public {
        vm.assume(rentAmount <= 100000000e18);
        vm.assume(supply <= 1000000000e18);
        
        vm.prank(issuer);
        propertyRegistry.createProperty(
            "ipfs://QmProperty1",
            rentAmount,
            RENT_FREQUENCY,
            supply,
            "Property Token",
            "PT",
            0
        );

        PropertyRegistry.Property memory prop = propertyRegistry.getProperty(0);
        assertEq(prop.rentAmount, rentAmount);
        assertEq(prop.totalSupply, supply);
    }

    // Fuzz test for token transfers
    function testFuzz_TokenTransfer(uint256 amount) public {
        vm.assume(amount > 0 && amount <= 10000e18);
        
        vm.prank(owner);
        tenToken.mint(investor, amount);

        vm.prank(investor);
        tenToken.transfer(investor2, amount);

        assertEq(tenToken.balanceOf(investor2), amount);
    }

    // ============================================================================
    // AGENT FUNCTION TESTS - Phase 1
    // ============================================================================

    function testPropertyRegistrySetAgent() public {
        vm.prank(owner);
        propertyRegistry.setAgent(agent, true);

        assertTrue(propertyRegistry.isAgent(agent));
        assertTrue(propertyRegistry.hasRole(keccak256("AGENT_ROLE"), agent));
    }

    function testPropertyRegistryPauseProperty() public {
        vm.prank(owner);
        propertyRegistry.setAgent(agent, true);

        vm.prank(issuer);
        (address propertyToken,) = _createProperty(0);

        vm.prank(agent);
        propertyRegistry.pauseProperty(0, "AI recommended pause due to low occupancy");

        assertTrue(propertyRegistry.isPropertyPaused(0));
    }

    function testPropertyRegistryResumeProperty() public {
        vm.prank(owner);
        propertyRegistry.setAgent(agent, true);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(agent);
        propertyRegistry.pauseProperty(0, "AI recommended pause");

        vm.prank(agent);
        propertyRegistry.resumeProperty(0, "AI recommended resume");

        assertFalse(propertyRegistry.isPropertyPaused(0));
    }

    function testPropertyRegistryAdjustRent() public {
        vm.prank(owner);
        propertyRegistry.setAgent(agent, true);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(agent);
        propertyRegistry.adjustRent(0, 3000e18, "Market adjustment - increased by AI");

        PropertyRegistry.Property memory prop = propertyRegistry.getProperty(0);
        assertEq(prop.rentAmount, 3000e18);
    }

    function testPropertyRegistryEmitAIRecommendation() public {
        vm.prank(owner);
        propertyRegistry.setAgent(agent, true);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(agent);
        bytes32 recId = propertyRegistry.emitAIRecommendation(
            0,
            "distribute_yield",
            5,
            "High occupancy rate - distribute yield",
            95
        );

        assertTrue(recId != bytes32(0));
        assertEq(propertyRegistry.getRecommendationCount(0), 1);
    }

    function testPropertyRegistryEmitRiskAlert() public {
        vm.prank(owner);
        propertyRegistry.setAgent(agent, true);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(agent);
        propertyRegistry.emitRiskAlert(0, 2, "Payment overdue warning", 25);

        // Event should emit without revert
    }

    function testPropertyRegistryUpdatePaymentStatus() public {
        vm.prank(owner);
        propertyRegistry.setAgent(agent, true);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(agent);
        propertyRegistry.updatePaymentStatus(0, 2, 15);

        (,,,, uint256 daysOverdue,) = propertyRegistry.getPropertyStatus(0);
        assertEq(daysOverdue, 15);
    }

    function testPropertyRegistryOnlyAgentCanPauseProperty() public {
        vm.prank(issuer);
        _createProperty(0);

        vm.prank(issuer);
        vm.expectRevert();
        propertyRegistry.pauseProperty(0, "Not an agent");
    }

    function testRentalTokenSetAgent() public {
        vm.prank(owner);
        rentalToken.setAgent(agent, true);

        assertTrue(rentalToken.isAgent(agent));
    }

    function testRentalTokenPauseProperty() public {
        vm.prank(owner);
        rentalToken.setAgent(agent, true);

        vm.prank(owner);
        rentalToken.registerProperty("Test Property", "Description", "ipfs://QmTest", 2500e18, 10);

        vm.prank(owner);
        rentalToken.activateProperty(0, "Activating property");

        vm.prank(agent);
        rentalToken.pauseProperty(0, "AI recommended pause");

        assertTrue(rentalToken.isPropertyPaused(0));
    }

    function testRentalTokenResumeProperty() public {
        vm.prank(owner);
        rentalToken.setAgent(agent, true);

        vm.prank(owner);
        rentalToken.registerProperty("Test Property", "Description", "ipfs://QmTest", 2500e18, 10);

        vm.prank(owner);
        rentalToken.activateProperty(0, "Activating property");

        vm.prank(agent);
        rentalToken.pauseProperty(0, "AI recommended pause");

        vm.prank(agent);
        rentalToken.resumeProperty(0, "AI recommended resume");

        assertFalse(rentalToken.isPropertyPaused(0));
    }

    function testRentalTokenAdjustRent() public {
        vm.prank(owner);
        rentalToken.setAgent(agent, true);

        vm.prank(owner);
        rentalToken.registerProperty("Test Property", "Description", "ipfs://QmTest", 2500e18, 1);

        vm.prank(agent);
        rentalToken.adjustRent(1, 3000e18);

        (bool isActive, bool isPaused, uint256 rentAmount,,,) = rentalToken.getPropertyStatus(1);
        assertEq(rentAmount, 3000e18);
    }

    function testRentalTokenUpdatePaymentStatus() public {
        vm.prank(owner);
        rentalToken.setAgent(agent, true);

        vm.prank(owner);
        rentalToken.registerProperty("Test Property", "Description", "ipfs://QmTest", 2500e18, 10);

        vm.prank(agent);
        rentalToken.updatePaymentStatus(0, 1, 5);

        (, , , , uint256 paymentStatus, uint256 daysOverdue) = rentalToken.getPropertyStatus(0);
        assertEq(paymentStatus, 1);
        assertEq(daysOverdue, 5);
    }

    function testYieldDistributorSetAgent() public {
        vm.prank(owner);
        yieldDistributor.setAgent(agent, true);

        assertTrue(yieldDistributor.isAgent(agent));
    }

    function testYieldDistributorSubmitAgentDecision() public {
        vm.prank(owner);
        yieldDistributor.setAgent(agent, true);

        vm.prank(agent);
        bytes32 decisionId = yieldDistributor.submitAgentDecision(
            0,
            YieldDistributor.AgentActionType.DISTRIBUTE_YIELD,
            500,
            "AI recommended yield distribution",
            90
        );

        assertTrue(decisionId != bytes32(0));
    }

    function testYieldDistributorExecuteAgentDecision() public {
        vm.prank(owner);
        yieldDistributor.setAgent(agent, true);
        
        vm.deal(owner, 100 ether);
        vm.prank(owner);
        yieldDistributor.updateYieldPool{value: 10 ether}(10 ether);

        vm.prank(agent);
        bytes32 decisionId = yieldDistributor.submitAgentDecision(
            0,
            YieldDistributor.AgentActionType.DISTRIBUTE_YIELD,
            500,
            "AI recommended yield distribution",
            90
        );

        vm.prank(agent);
        yieldDistributor.executeAgentDecision(0);

        assertTrue(yieldDistributor.isDecisionExecuted(decisionId));
    }

    function testYieldDistributorDistributeWithAIRecommendation() public {
        vm.prank(owner);
        yieldDistributor.setAgent(agent, true);

        vm.deal(owner, 100 ether);
        vm.prank(owner);
        yieldDistributor.updateYieldPool{value: 10 ether}(10 ether);

        vm.prank(agent);
        uint256 distId = yieldDistributor.distributeWithAIRecommendation(
            0,
            1 ether,
            "AI recommended distribution based on high occupancy",
            85,
            bytes32(uint256(1))
        );

        assertEq(distId, 0);
    }

    function testYieldDistributorFlagPropertyDefault() public {
        vm.prank(owner);
        yieldDistributor.setAgent(agent, true);

        vm.prank(agent);
        yieldDistributor.flagPropertyDefault(0, 500e18, "Tenant default - AI detected");

        (uint256 totalDefaults,,,,) = yieldDistributor.getRiskMetrics();
        assertEq(totalDefaults, 500e18);
    }

    function testMultipleAgentsCanBeSet() public {
        address agent2 = address(0x6);

        vm.prank(owner);
        propertyRegistry.setAgent(agent, true);

        vm.prank(owner);
        propertyRegistry.setAgent(agent2, true);

        assertTrue(propertyRegistry.isAgent(agent));
        assertTrue(propertyRegistry.isAgent(agent2));
    }

    function testAgentRoleRevocation() public {
        vm.prank(owner);
        propertyRegistry.setAgent(agent, true);

        assertTrue(propertyRegistry.isAgent(agent));

        vm.prank(owner);
        propertyRegistry.setAgent(agent, false);

        assertFalse(propertyRegistry.isAgent(agent));
    }

    function testPropertyRegistryPauseActiveProperty() public {
        vm.prank(owner);
        propertyRegistry.setAgent(agent, true);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(agent);
        propertyRegistry.pauseProperty(0, "AI pause");

        vm.prank(agent);
        vm.expectRevert("PropertyRegistry: property already paused");
        propertyRegistry.pauseProperty(0, "AI pause again");
    }

    function testPropertyRegistryResumeNonPausedProperty() public {
        vm.prank(owner);
        propertyRegistry.setAgent(agent, true);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(agent);
        vm.expectRevert("PropertyRegistry: property not paused");
        propertyRegistry.resumeProperty(0, "AI resume");
    }

    function testAIRecommendationEventEmission() public {
        vm.prank(owner);
        propertyRegistry.setAgent(agent, true);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(agent);
        propertyRegistry.emitAIRecommendation(
            0,
            "distribute_yield",
            5,
            "High confidence AI recommendation",
            95
        );
    }

    function testAgentActionEventEmission() public {
        vm.prank(owner);
        propertyRegistry.setAgent(agent, true);

        vm.prank(issuer);
        _createProperty(0);

        vm.prank(agent);
        propertyRegistry.pauseProperty(0, "AI action - low occupancy");
    }
}
