// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PropertyMarketplace is Ownable, ReentrancyGuard {
    struct Listing {
        uint256 id;
        address seller;
        address propertyToken;
        uint256 amount;
        uint256 pricePerToken;
        uint256 totalPrice;
        bool isActive;
        uint256 createdAt;
    }

    struct Offer {
        uint256 listingId;
        address buyer;
        uint256 amount;
        uint256 offeredPrice;
        bool accepted;
        bool cancelled;
    }

    uint256 public listingCount;
    uint256 public offerCount;
    uint256 public platformFeePercent = 25;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Offer[]) public listingOffers;
    mapping(address => uint256[]) public userListings;
    mapping(address => uint256[]) public userOffers;

    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address propertyToken,
        uint256 amount,
        uint256 pricePerToken
    );
    event ListingCancelled(uint256 indexed listingId);
    event ListingFilled(
        uint256 indexed listingId,
        address indexed buyer,
        address seller,
        uint256 amount,
        uint256 totalPrice
    );
    event OfferMade(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 amount,
        uint256 offeredPrice
    );
    event OfferAccepted(uint256 indexed listingId, uint256 offerId);
    event OfferCancelled(uint256 indexed listingId, uint256 offerId);
    event PlatformFeeUpdated(uint256 newFeePercent);

    constructor() Ownable(msg.sender) {}

    modifier onlyValidListing(uint256 listingId) {
        require(listings[listingId].id != 0, "Listing does not exist");
        require(listings[listingId].isActive, "Listing not active");
        _;
    }

    function createListing(
        address propertyToken,
        uint256 amount,
        uint256 pricePerToken
    ) external nonReentrant returns (uint256) {
        require(propertyToken != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        require(pricePerToken > 0, "Price must be greater than 0");

        ERC20 token = ERC20(propertyToken);
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        listingCount++;
        Listing storage listing = listings[listingCount];
        listing.id = listingCount;
        listing.seller = msg.sender;
        listing.propertyToken = propertyToken;
        listing.amount = amount;
        listing.pricePerToken = pricePerToken;
        listing.totalPrice = amount * pricePerToken / 1e18;
        listing.isActive = true;
        listing.createdAt = block.timestamp;

        userListings[msg.sender].push(listingCount);

        emit ListingCreated(listingCount, msg.sender, propertyToken, amount, pricePerToken);

        return listingCount;
    }

    function cancelListing(uint256 listingId) external nonReentrant onlyValidListing(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not the seller");

        listing.isActive = false;

        ERC20 token = ERC20(listing.propertyToken);
        require(token.transfer(msg.sender, listing.amount), "Refund failed");

        emit ListingCancelled(listingId);
    }

    function buyListing(uint256 listingId) external payable nonReentrant onlyValidListing(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.seller != msg.sender, "Cannot buy own listing");

        uint256 totalCost = listing.totalPrice;
        require(msg.value >= totalCost, "Insufficient payment");

        uint256 platformFee = (totalCost * platformFeePercent) / 1000;
        uint256 sellerProceeds = totalCost - platformFee;

        ERC20 token = ERC20(listing.propertyToken);
        require(token.transfer(msg.sender, listing.amount), "Token transfer failed");

        (bool sent,) = payable(listing.seller).call{value: sellerProceeds}("");
        require(sent, "Failed to send ETH to seller");

        if (msg.value > totalCost) {
            (bool refund,) = payable(msg.sender).call{value: msg.value - totalCost}("");
            require(refund, "Refund failed");
        }

        listing.isActive = false;

        emit ListingFilled(listingId, msg.sender, listing.seller, listing.amount, totalCost);
    }

    function makeOffer(
        uint256 listingId,
        uint256 amount,
        uint256 offeredPrice
    ) external onlyValidListing(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.seller != msg.sender, "Cannot offer on own listing");
        require(amount > 0 && amount <= listing.amount, "Invalid amount");

        Offer memory offer = Offer({
            listingId: listingId,
            buyer: msg.sender,
            amount: amount,
            offeredPrice: offeredPrice,
            accepted: false,
            cancelled: false
        });

        listingOffers[listingId].push(offer);
        offerCount++;
        userOffers[msg.sender].push(offerCount);

        emit OfferMade(listingId, msg.sender, amount, offeredPrice);
    }

    function acceptOffer(uint256 listingId, uint256 offerId) external nonReentrant onlyValidListing(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not the seller");

        Offer[] storage offers = listingOffers[listingId];
        require(offerId <= offers.length && offerId > 0, "Invalid offer");

        Offer storage offer = offers[offerId - 1];
        require(!offer.cancelled && !offer.accepted, "Offer not available");

        uint256 totalCost = offer.amount * offer.offeredPrice / 1e18;
        uint256 platformFee = (totalCost * platformFeePercent) / 1000;
        uint256 sellerProceeds = totalCost - platformFee;

        require(address(this).balance >= totalCost, "Contract insufficient balance");

        ERC20 token = ERC20(listing.propertyToken);
        require(token.transfer(offer.buyer, offer.amount), "Token transfer failed");

        (bool sent,) = payable(listing.seller).call{value: sellerProceeds}("");
        require(sent, "Failed to send ETH");

        offer.accepted = true;

        if (offer.amount == listing.amount) {
            listing.isActive = false;
        } else {
            listing.amount -= offer.amount;
            listing.totalPrice = listing.amount * listing.pricePerToken / 1e18;
        }

        emit OfferAccepted(listingId, offerId);
    }

    function cancelOffer(uint256 listingId, uint256 offerId) external {
        Offer[] storage offers = listingOffers[listingId];
        require(offerId <= offers.length && offerId > 0, "Invalid offer");

        Offer storage offer = offers[offerId - 1];
        require(offer.buyer == msg.sender, "Not your offer");
        require(!offer.accepted, "Offer already accepted");

        offer.cancelled = true;

        emit OfferCancelled(listingId, offerId);
    }

    function getListings() external view returns (Listing[] memory) {
        Listing[] memory result = new Listing[](listingCount);
        for (uint256 i = 1; i <= listingCount; i++) {
            result[i - 1] = listings[i];
        }
        return result;
    }

    function getActiveListings() external view returns (Listing[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= listingCount; i++) {
            if (listings[i].isActive) activeCount++;
        }

        Listing[] memory result = new Listing[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= listingCount; i++) {
            if (listings[i].isActive) {
                result[index] = listings[i];
                index++;
            }
        }
        return result;
    }

    function getUserListings(address user) external view returns (Listing[] memory) {
        uint256[] storage ids = userListings[user];
        Listing[] memory result = new Listing[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = listings[ids[i]];
        }
        return result;
    }

    function getListingOffers(uint256 listingId) external view returns (Offer[] memory) {
        return listingOffers[listingId];
    }

    function setPlatformFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 100, "Fee too high");
        platformFeePercent = newFeePercent;
        emit PlatformFeeUpdated(newFeePercent);
    }

    function withdrawFunds() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
}
