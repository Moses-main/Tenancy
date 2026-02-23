// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TENToken} from "../src/TENToken.sol";
import {PropertyRegistry} from "../src/PropertyRegistry.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {PriceFeedConsumer} from "../src/PriceFeedConsumer.sol";

contract DeployTENANCY is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        TENToken tenToken = new TENToken(deployer);
        console.log("TENToken deployed at:", address(tenToken));

        // Base Sepolia ETH/USD Price Feed - using placeholder for now
        address ethUsdPriceFeed = 0x0000000000000000000000000000000000000000;
        
        PropertyRegistry propertyRegistry = new PropertyRegistry(deployer, ethUsdPriceFeed);
        console.log("PropertyRegistry deployed at:", address(propertyRegistry));

        YieldDistributor yieldDistributor = new YieldDistributor(
            deployer,
            address(propertyRegistry),
            address(tenToken),
            ethUsdPriceFeed
        );
        console.log("YieldDistributor deployed at:", address(yieldDistributor));

        PriceFeedConsumer priceFeedConsumer = new PriceFeedConsumer(
            ethUsdPriceFeed,
            ethUsdPriceFeed
        );
        console.log("PriceFeedConsumer deployed at:", address(priceFeedConsumer));

        propertyRegistry.setIssuer(deployer, true);
        tenToken.setMinter(deployer, true);

        vm.stopBroadcast();
    }
}
