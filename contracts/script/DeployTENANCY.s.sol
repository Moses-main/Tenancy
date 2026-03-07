// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TENToken} from "../src/TENToken.sol";
import {PropertyRegistry} from "../src/PropertyRegistry.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {PriceFeedConsumer} from "../src/PriceFeedConsumer.sol";
import {RentalToken} from "../src/RentalToken.sol";
import {PropertyMarketplace} from "../src/PropertyMarketplace.sol";
import {MockPriceFeed} from "../src/MockPriceFeed.sol";

contract DeployTENANCY is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Mock Price Feed for testing (inside broadcast so it lands on-chain)
        // Sepolia: 0x694AA1769357215DE4FAC081bf1f309aDC325306
        // Base Sepolia: 0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12 (real Chainlink feed)
        MockPriceFeed mockPriceFeed = new MockPriceFeed();
        console.log("MockPriceFeed deployed at:", address(mockPriceFeed));

        address ethUsdPriceFeed = address(mockPriceFeed);

        TENToken tenToken = new TENToken(deployer);
        console.log("TENToken deployed at:", address(tenToken));

        // Inflation Index (custom/mock) - placeholder address
        address inflationIndexFeed = 0x0000000000000000000000000000000000000001;
        
        // WETH token address on Base Sepolia (using WETH since USDC may not be deployed)
        address usdcToken = address(0x4200000000000000000000000000000000000006);
        
        PropertyMarketplace marketplace = new PropertyMarketplace(usdcToken);
        console.log("PropertyMarketplace deployed at:", address(marketplace));

        PropertyRegistry propertyRegistry = new PropertyRegistry(
            deployer, 
            ethUsdPriceFeed, 
            address(marketplace), 
            usdcToken
        );
        console.log("PropertyRegistry deployed at:", address(propertyRegistry));

        YieldDistributor yieldDistributor = new YieldDistributor(
            deployer,
            ethUsdPriceFeed,
            inflationIndexFeed
        );
        console.log("YieldDistributor deployed at:", address(yieldDistributor));

        // Skip PriceFeedConsumer for now due to Base Sepolia price feed issues
        // PriceFeedConsumer priceFeedConsumer = new PriceFeedConsumer(
        //     ethUsdPriceFeed,
        //     inflationIndexFeed
        // );
        // console.log("PriceFeedConsumer deployed at:", address(priceFeedConsumer));

        RentalToken rentalToken = new RentalToken(deployer);
        console.log("RentalToken deployed at:", address(rentalToken));

        propertyRegistry.setIssuer(deployer, true);
        tenToken.setMinter(deployer, true);

        vm.stopBroadcast();
    }
}
