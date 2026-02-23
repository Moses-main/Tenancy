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
        
        vm.startBroadcast(deployerPrivateKey);

        TENToken tenToken = new TENToken(msg.sender);
        console.log("TENToken deployed at:", address(tenToken));

        address ethUsdPriceFeed = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
        
        PropertyRegistry propertyRegistry = new PropertyRegistry(msg.sender, ethUsdPriceFeed);
        console.log("PropertyRegistry deployed at:", address(propertyRegistry));

        YieldDistributor yieldDistributor = new YieldDistributor(
            msg.sender,
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

        propertyRegistry.setIssuer(msg.sender, true);
        tenToken.setMinter(msg.sender, true);

        vm.stopBroadcast();
    }
}
