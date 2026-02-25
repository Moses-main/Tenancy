// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TENToken} from "../src/TENToken.sol";
import {PropertyRegistry} from "../src/PropertyRegistry.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {PriceFeedConsumer} from "../src/PriceFeedConsumer.sol";
import {RentalToken} from "../src/RentalToken.sol";
import {PropertyMarketplace} from "../src/PropertyMarketplace.sol";

contract DeployTENANCY is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Default to no price feed (can be set later)
        // Sepolia: 0x694AA1769357215DE4FAC081bf1f309aDC325306
        // Base Sepolia: Use address(0) initially - set later
        address ethUsdPriceFeed = vm.envOr("ETH_USD_PRICE_FEED", address(0));
        
        vm.startBroadcast(deployerPrivateKey);

        TENToken tenToken = new TENToken(deployer);
        console.log("TENToken deployed at:", address(tenToken));

        // Inflation Index (custom/mock) - placeholder address
        address inflationIndexFeed = 0x0000000000000000000000000000000000000001;
        
        PropertyRegistry propertyRegistry = new PropertyRegistry(deployer, ethUsdPriceFeed);
        console.log("PropertyRegistry deployed at:", address(propertyRegistry));

        YieldDistributor yieldDistributor = new YieldDistributor(
            deployer,
            ethUsdPriceFeed,
            inflationIndexFeed
        );
        console.log("YieldDistributor deployed at:", address(yieldDistributor));

        PriceFeedConsumer priceFeedConsumer = new PriceFeedConsumer(
            ethUsdPriceFeed,
            inflationIndexFeed
        );
        console.log("PriceFeedConsumer deployed at:", address(priceFeedConsumer));

        RentalToken rentalToken = new RentalToken(deployer);
        console.log("RentalToken deployed at:", address(rentalToken));

        PropertyMarketplace marketplace = new PropertyMarketplace();
        console.log("PropertyMarketplace deployed at:", address(marketplace));

        propertyRegistry.setIssuer(deployer, true);
        tenToken.setMinter(deployer, true);

        vm.stopBroadcast();
    }
}
