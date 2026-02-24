import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

const SEPOLIA_CHAIN_ID = 11155111;
const BASE_SEPOLIA_CHAIN_ID = 84532;

const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const CHAINLINK_ETH_USD_BASE_SEPOLIA = "0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12";

interface DeploymentResult {
  network: string;
  chainId: number;
  contracts: {
    tenToken: string;
    propertyRegistry: string;
    yieldDistributor: string;
    priceFeedConsumer: string;
  };
  priceFeed: string;
  timestamp: string;
}

async function main() {
  console.log("=".repeat(60));
  console.log("  TENANCY Protocol - Thirdweb Deployment");
  console.log("=".repeat(60));
  console.log();

  const privateKey = process.env.PRIVATE_KEY;
  const network = process.env.NETWORK || "sepolia";

  if (!privateKey) {
    console.error("Error: PRIVATE_KEY not set in .env");
    console.log("\nPlease create a .env file with:");
    console.log("  PRIVATE_KEY=your_private_key");
    console.log("  NETWORK=sepolia  # or base-sepolia");
    process.exit(1);
  }

  const chainId = network === "base-sepolia" ? BASE_SEPOLIA_CHAIN_ID : SEPOLIA_CHAIN_ID;
  const priceFeed = network === "base-sepolia" ? CHAINLINK_ETH_USD_BASE_SEPOLIA : CHAINLINK_ETH_USD_SEPOLIA;
  const rpcUrl = network === "base-sepolia" 
    ? process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"
    : process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

  console.log(`Network: ${network} (Chain ID: ${chainId})`);
  console.log(`RPC URL: ${rpcUrl}`);
  console.log(`Price Feed: ${priceFeed}`);
  console.log();

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  console.log();

  console.log("Initializing Thirdweb SDK...");
  const sdk = await ThirdwebSDK.fromPrivateKey(privateKey, {
    chainId,
    rpcUrl,
  });

  const results: DeploymentResult = {
    network,
    chainId,
    contracts: {
      tenToken: "",
      propertyRegistry: "",
      yieldDistributor: "",
      priceFeedConsumer: "",
    },
    priceFeed,
    timestamp: new Date().toISOString(),
  };

  console.log("=".repeat(60));
  console.log("Deploying Contracts...");
  console.log("=".repeat(60));
  console.log();

  console.log("1. Deploying TENToken...");
  try {
    const tenTokenAddress = await sdk.deployer.deployContract(
      [
        "contract TENToken is ERC20, ERC20Permit, Ownable {",
        "    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18;",
        "    mapping(address => bool) public minter;",
        "    modifier onlyMinter() { require(minter[msg.sender], 'TENToken: not a minter'); _; }",
        "    constructor(address initialOwner) ERC20('TENANCY', 'TEN') Ownable(initialOwner) ERC20Permit('TENANCY') { minter[initialOwner] = true; }",
        "    function mint(address to, uint256 amount) external onlyMinter { require(totalSupply() + amount <= MAX_SUPPLY, 'TENToken: exceeds max supply'); _mint(to, amount); }",
        "    function burn(uint256 amount) external { _burn(msg.sender, amount); }",
        "    function setMinter(address _minter, bool _status) external onlyOwner { minter[_minter] = _status; }",
        "}",
      ],
      []
    );
    results.contracts.tenToken = tenTokenAddress;
    console.log(`   TENToken deployed at: ${tenTokenAddress}`);
  } catch (error: any) {
    console.error(`   Error deploying TENToken: ${error.message}`);
    process.exit(1);
  }

  console.log("\n2. Deploying PropertyRegistry...");
  try {
    const propertyRegistryAddress = await sdk.deployer.deployContract(
      [
        "contract PropertyToken is ERC20 {",
        "    address public propertyRegistry;",
        "    modifier onlyRegistry() { require(msg.sender == propertyRegistry, 'PropertyToken: only registry'); _; }",
        "    constructor(string memory name, string memory symbol, address _propertyRegistry) ERC20(name, symbol) { propertyRegistry = _propertyRegistry; }",
        "    function mint(address to, uint256 amount) external onlyRegistry { _mint(to, amount); }",
        "    function burn(address from, uint256 amount) external onlyRegistry { _burn(from, amount); }",
        "}",
        "",
        "contract PropertyRegistry is Ownable {",
        "    struct Property { uint256 id; string uri; uint256 rentAmount; uint256 rentFrequency; uint256 totalSupply; address propertyToken; bool isActive; address owner; uint256 valuationUsd; uint256 lastValuationTimestamp; }",
        "    AggregatorV3Interface public ethUsdPriceFeed;",
        "    uint256 public nextPropertyId;",
        "    mapping(uint256 => Property) public properties;",
        "    mapping(address => bool) public issuers;",
        "    mapping(uint256 => mapping(address => uint256)) public userHoldings;",
        "    event PropertyCreated(uint256 indexed propertyId, address indexed owner, address propertyToken, uint256 rentAmount, uint256 valuationUsd);",
        "    event TokensMinted(uint256 indexed propertyId, address indexed recipient, uint256 amount);",
        "    event YieldDistributed(uint256 indexed propertyId, uint256 amount);",
        "    event PropertyValuationUpdated(uint256 indexed propertyId, uint256 valuationUsd);",
        "    modifier onlyIssuer() { require(issuers[msg.sender], 'PropertyRegistry: not an issuer'); _; }",
        "    constructor(address initialOwner, address _ethUsdPriceFeed) Ownable(initialOwner) { issuers[initialOwner] = true; if (_ethUsdPriceFeed != address(0)) { ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed); } }",
        "    function setPriceFeed(address _ethUsdPriceFeed) external onlyOwner { require(_ethUsdPriceFeed != address(0), 'Invalid price feed'); ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed); }",
        "    function setIssuer(address _issuer, bool _status) external onlyOwner { issuers[_issuer] = _status; }",
        "    function getEthUsdPrice() public view returns (uint256) { require(address(ethUsdPriceFeed) != address(0), 'Price feed not set'); (, int256 price,,,) = ethUsdPriceFeed.latestRoundData(); require(price > 0, 'Invalid price'); return uint256(price); }",
        "    function calculatePropertyValuation(uint256 annualRentUsd) public view returns (uint256) { uint256 capRate = 500; return (annualRentUsd * 10000) / capRate; }",
        "    function createProperty(string memory uri, uint256 rentAmount, uint256 rentFrequency, uint256 initialSupply, string memory tokenName, string memory tokenSymbol, uint256 valuationUsd) external onlyIssuer returns (address) {",
        "        uint256 propertyId = nextPropertyId++;",
        "        PropertyToken propertyToken = new PropertyToken(tokenName, tokenSymbol, address(this));",
        "        if (valuationUsd == 0 && rentAmount > 0) { uint256 annualRent = rentAmount * 12; valuationUsd = calculatePropertyValuation(annualRent); }",
        "        Property memory newProperty = Property({ id: propertyId, uri: uri, rentAmount: rentAmount, rentFrequency: rentFrequency, totalSupply: initialSupply, propertyToken: address(propertyToken), isActive: true, owner: msg.sender, valuationUsd: valuationUsd, lastValuationTimestamp: block.timestamp });",
        "        properties[propertyId] = newProperty;",
        "        if (initialSupply > 0) { PropertyToken(propertyToken).mint(msg.sender, initialSupply); userHoldings[propertyId][msg.sender] = initialSupply; }",
        "        emit PropertyCreated(propertyId, msg.sender, address(propertyToken), rentAmount, valuationUsd);",
        "        return address(propertyToken);",
        "    }",
        "    function updatePropertyValuation(uint256 propertyId, uint256 newValuationUsd) external onlyIssuer { Property storage property = properties[propertyId]; require(property.owner == msg.sender, 'PropertyRegistry: not owner'); property.valuationUsd = newValuationUsd; property.lastValuationTimestamp = block.timestamp; emit PropertyValuationUpdated(propertyId, newValuationUsd); }",
        "    function refreshValuationFromChainlink(uint256 propertyId) external { Property storage property = properties[propertyId]; require(property.isActive, 'PropertyRegistry: property not active'); uint256 price = getEthUsdPrice(); uint256 updatedValuation = (property.valuationUsd * price) / 1e8; property.valuationUsd = updatedValuation; property.lastValuationTimestamp = block.timestamp; emit PropertyValuationUpdated(propertyId, updatedValuation); }",
        "    function getPropertyYieldPercentage(uint256 propertyId) external view returns (uint256) { Property memory property = properties[propertyId]; require(property.valuationUsd > 0, 'PropertyRegistry: no valuation'); return (property.rentAmount * 10000) / property.valuationUsd; }",
        "    function getPropertyValuationEth(uint256 propertyId) external view returns (uint256) { Property memory property = properties[propertyId]; uint256 price = getEthUsdPrice(); return (property.valuationUsd * 1e8) / price; }",
        "    function mintTokens(uint256 propertyId, address recipient, uint256 amount) external onlyIssuer { Property storage property = properties[propertyId]; require(property.isActive, 'PropertyRegistry: property not active'); PropertyToken(property.propertyToken).mint(recipient, amount); userHoldings[propertyId][recipient] += amount; property.totalSupply += amount; emit TokensMinted(propertyId, recipient, amount); }",
        "    function burnTokens(uint256 propertyId, address from, uint256 amount) external onlyIssuer { Property storage property = properties[propertyId]; require(property.isActive, 'PropertyRegistry: property not active'); require(userHoldings[propertyId][from] >= amount, 'PropertyRegistry: insufficient balance'); PropertyToken(property.propertyToken).burn(from, amount); userHoldings[propertyId][from] -= amount; property.totalSupply -= amount; }",
        "    function getProperty(uint256 propertyId) external view returns (Property memory) { return properties[propertyId]; }",
        "    function getUserBalance(uint256 propertyId, address user) external view returns (uint256) { return userHoldings[propertyId][user]; }",
        "    function getAllProperties() external view returns (Property[] memory) { Property[] memory allProperties = new Property[](nextPropertyId); for (uint256 i = 0; i < nextPropertyId; i++) { allProperties[i] = properties[i]; } return allProperties; }",
        "}",
        "",
        "interface AggregatorV3Interface { function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound); }",
      ],
      [wallet.address, priceFeed]
    );
    results.contracts.propertyRegistry = propertyRegistryAddress;
    console.log(`   PropertyRegistry deployed at: ${propertyRegistryAddress}`);
  } catch (error: any) {
    console.error(`   Error deploying PropertyRegistry: ${error.message}`);
    process.exit(1);
  }

  console.log("\n3. Deploying YieldDistributor...");
  try {
    const yieldDistributorAddress = await sdk.deployer.deployContract(
      [
        "interface AggregatorV3Interface { function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound); }",
        "",
        "contract YieldDistributor is Ownable {",
        "    enum DistributionStatus { PENDING, DISTRIBUTING, COMPLETED, PAUSED }",
        "    struct Distribution { uint256 propertyId; uint256 totalYield; uint256 distributedYield; DistributionStatus status; uint256 distributionTimestamp; uint256[] holderBalances; address[] holders; }",
        "    mapping(uint256 => Distribution) private _distributions;",
        "    mapping(uint256 => uint256) private _propertyYieldRates;",
        "    uint256 private _distributionCount;",
        "    AggregatorV3Interface public ethUsdPriceFeed;",
        "    AggregatorV3Interface public inflationIndexFeed;",
        "    uint256 public totalYieldPool;",
        "    uint256 public totalDistributedYield;",
        "    uint256 public lastDistributionTimestamp;",
        "    uint256 public distributionInterval = 86400;",
        "    uint256 public defaultYieldRate = 1000;",
        "    uint256 public lastEthUsdPrice;",
        "    uint256 public lastInflationIndex;",
        "    uint256 public priceFeedUpdateTime;",
        "    uint256 public minReserveRatio = 1500;",
        "    uint256 public defaultThreshold = 1000;",
        "    uint256 public totalDefaults;",
        "    uint256 public lastRiskCheck;",
        "    bool public safeguardActive;",
        "    mapping(uint256 => uint256) public propertyDefaults;",
        "    event DistributionStarted(uint256 distributionId, uint256 propertyId, uint256 totalYield);",
        "    event DistributionCompleted(uint256 distributionId, uint256 propertyId, uint256 distributedYield);",
        "    event DistributionPaused(uint256 distributionId, uint256 propertyId);",
        "    event DistributionResumed(uint256 distributionId, uint256 propertyId);",
        "    event YieldClaimed(address indexed claimant, uint256 amount);",
        "    event YieldPoolUpdated(uint256 newTotal, uint256 change);",
        "    event PriceFeedUpdated(uint256 ethUsdPrice, uint256 inflationIndex, uint256 timestamp);",
        "    event RiskAlert(uint256 alertType, string message, uint256 value);",
        "    event ReserveHealthCheck(uint256 totalReserve, uint256 requiredReserve, bool isHealthy);",
        "    event DefaultRecorded(uint256 propertyId, uint256 defaultAmount, uint256 timestamp);",
        "    event SafeguardTriggered(string reason, uint256 timestamp);",
        "    constructor(address initialOwner, address _ethUsdPriceFeed, address _inflationIndexFeed) Ownable(initialOwner) { _distributionCount = 0; if (_ethUsdPriceFeed != address(0)) { ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed); } if (_inflationIndexFeed != address(0)) { inflationIndexFeed = AggregatorV3Interface(_inflationIndexFeed); } }",
        "    function createDistribution(uint256 propertyId, uint256 totalYield, uint256[] calldata holderBalances, address[] calldata holders) external onlyOwner returns (uint256 distributionId) {",
        "        distributionId = _distributionCount++;",
        "        Distribution memory newDistribution = Distribution({ propertyId: propertyId, totalYield: totalYield, distributedYield: 0, status: DistributionStatus.PENDING, distributionTimestamp: block.timestamp, holderBalances: holderBalances, holders: holders });",
        "        _distributions[distributionId] = newDistribution;",
        "        totalYieldPool += totalYield;",
        "        emit DistributionStarted(distributionId, propertyId, totalYield);",
        "    }",
        "    function startDistribution(uint256 distributionId) external onlyOwner { Distribution storage distribution = _distributions[distributionId]; require(distribution.status == DistributionStatus.PENDING, 'Distribution not pending'); require(distribution.totalYield > 0, 'No yield to distribute'); distribution.status = DistributionStatus.DISTRIBUTING; lastDistributionTimestamp = block.timestamp; }",
        "    function pauseDistribution(uint256 distributionId) external onlyOwner { Distribution storage distribution = _distributions[distributionId]; require(distribution.status == DistributionStatus.DISTRIBUTING, 'Distribution not active'); distribution.status = DistributionStatus.PAUSED; emit DistributionPaused(distributionId, distribution.propertyId); }",
        "    function resumeDistribution(uint256 distributionId) external onlyOwner { Distribution storage distribution = _distributions[distributionId]; require(distribution.status == DistributionStatus.PAUSED, 'Distribution not paused'); distribution.status = DistributionStatus.DISTRIBUTING; emit DistributionResumed(distributionId, distribution.propertyId); }",
        "    function claimYield(uint256 distributionId) external { Distribution storage distribution = _distributions[distributionId]; require(distribution.status == DistributionStatus.DISTRIBUTING, 'Distribution not active'); uint256 holderIndex = findHolderIndex(msg.sender, distribution.holders); require(holderIndex != type(uint256).max, 'Holder not found'); uint256 holderYield = distribution.holderBalances[holderIndex]; require(holderYield > 0, 'No yield to claim'); distribution.holderBalances[holderIndex] = 0; distribution.distributedYield += holderYield; emit YieldClaimed(msg.sender, holderYield); if (distribution.distributedYield >= distribution.totalYield) { distribution.status = DistributionStatus.COMPLETED; emit DistributionCompleted(distributionId, distribution.propertyId, distribution.distributedYield); } }",
        "    function findHolderIndex(address holder, address[] storage holders) internal view returns (uint256) { for (uint256 i = 0; i < holders.length; i++) { if (holders[i] == holder) { return i; } } return type(uint256).max; }",
        "    function updateYieldPool(uint256 amount) external onlyOwner { require(amount > 0, 'Amount must be positive'); totalYieldPool += amount; emit YieldPoolUpdated(totalYieldPool, amount); }",
        "    function withdrawYieldPool(uint256 amount) external onlyOwner { require(amount > 0, 'Amount must be positive'); require(totalYieldPool >= amount, 'Insufficient yield pool'); totalYieldPool -= amount; payable(msg.sender).transfer(amount); emit YieldPoolUpdated(totalYieldPool, amount); }",
        "    function setDistributionInterval(uint256 newInterval) external onlyOwner { distributionInterval = newInterval; }",
        "    function setDefaultYieldRate(uint256 newRate) external onlyOwner { defaultYieldRate = newRate; }",
        "    function getTotalYieldPool() external view returns (uint256) { return totalYieldPool; }",
        "    function getTotalDistributedYield() external view returns (uint256) { return totalDistributedYield; }",
        "    function getDistributionInfo(uint256 distributionId) external view returns (uint256 propertyId, uint256 totalYield, uint256 distributedYield, uint256 status, uint256 distributionTimestamp, uint256[] memory holderBalances) { Distribution storage distribution = _distributions[distributionId]; return (distribution.propertyId, distribution.totalYield, distribution.distributedYield, uint256(distribution.status), distribution.distributionTimestamp, distribution.holderBalances); }",
        "    function isDistributionActive(uint256 distributionId) external view returns (bool) { Distribution storage distribution = _distributions[distributionId]; return distribution.status == DistributionStatus.DISTRIBUTING; }",
        "    function setPriceFeeds(address _ethUsdPriceFeed, address _inflationIndexFeed) external onlyOwner { if (_ethUsdPriceFeed != address(0)) { ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed); } if (_inflationIndexFeed != address(0)) { inflationIndexFeed = AggregatorV3Interface(_inflationIndexFeed); } }",
        "    function updatePriceFeeds() external returns (uint256, uint256) { if (address(ethUsdPriceFeed) != address(0)) { (, int256 price,,,) = ethUsdPriceFeed.latestRoundData(); require(price > 0, 'Invalid ETH/USD price'); lastEthUsdPrice = uint256(price); } if (address(inflationIndexFeed) != address(0)) { (, int256 index,,,) = inflationIndexFeed.latestRoundData(); require(index > 0, 'Invalid inflation index'); lastInflationIndex = uint256(index); } priceFeedUpdateTime = block.timestamp; emit PriceFeedUpdated(lastEthUsdPrice, lastInflationIndex, priceFeedUpdateTime); return (lastEthUsdPrice, lastInflationIndex); }",
        "    function getEthUsdPrice() external view returns (uint256) { require(address(ethUsdPriceFeed) != address(0), 'Price feed not set'); (, int256 price,,,) = ethUsdPriceFeed.latestRoundData(); require(price > 0, 'Invalid ETH/USD price'); return uint256(price); }",
        "    function getInflationIndex() external view returns (uint256) { require(address(inflationIndexFeed) != address(0), 'Inflation feed not set'); (, int256 index,,,) = inflationIndexFeed.latestRoundData(); require(index > 0, 'Invalid inflation index'); return uint256(index); }",
        "    function calculateYieldInUsd(uint256 yieldAmountEth) external view returns (uint256) { uint256 price = lastEthUsdPrice; if (price == 0) { (, int256 currentPrice,,,) = ethUsdPriceFeed.latestRoundData(); price = uint256(currentPrice); } return (yieldAmountEth * price) / 1e8; }",
        "    function calculateYieldInEth(uint256 yieldAmountUsd) external view returns (uint256) { uint256 price = lastEthUsdPrice; if (price == 0) { (, int256 currentPrice,,,) = ethUsdPriceFeed.latestRoundData(); price = uint256(currentPrice); } return (yieldAmountUsd * 1e8) / price; }",
        "    function calculateInflationAdjustedYield(uint256 yieldAmount, uint256 months) external view returns (uint256) { if (lastInflationIndex == 0) { return yieldAmount; } uint256 inflationFactor = 10000 + (lastInflationIndex * months / 12); return (yieldAmount * inflationFactor) / 10000; }",
        "    function getYieldDistributionUsd(uint256 distributionId) external view returns (uint256) { Distribution storage distribution = _distributions[distributionId]; if (address(ethUsdPriceFeed) == address(0)) { return 0; } (, int256 price,,,) = ethUsdPriceFeed.latestRoundData(); if (price <= 0) { return 0; } return (distribution.totalYield * uint256(price)) / 1e8; }",
        "    function checkReserveHealth() external returns (bool isHealthy, uint256 totalReserve, uint256 requiredReserve) { totalReserve = totalYieldPool; uint256 totalPending = totalDistributedYield + totalYieldPool; requiredReserve = (totalPending * minReserveRatio) / 10000; isHealthy = totalReserve >= requiredReserve; emit ReserveHealthCheck(totalReserve, requiredReserve, isHealthy); if (!isHealthy && !safeguardActive) { _triggerSafeguard('Reserve ratio below minimum'); } lastRiskCheck = block.timestamp; return (isHealthy, totalReserve, requiredReserve); }",
        "    function recordDefault(uint256 propertyId, uint256 defaultAmount) external onlyOwner { propertyDefaults[propertyId] += defaultAmount; totalDefaults += defaultAmount; emit DefaultRecorded(propertyId, defaultAmount, block.timestamp); uint256 defaultRatio = (totalDefaults * 10000) / (totalYieldPool + 1); if (defaultRatio > defaultThreshold) { _triggerSafeguard('Default threshold exceeded'); } }",
        "    function getDefaultRatio() external view returns (uint256) { if (totalYieldPool == 0) return 0; return (totalDefaults * 10000) / totalYieldPool; }",
        "    function _triggerSafeguard(string memory reason) internal { safeguardActive = true; emit SafeguardTriggered(reason, block.timestamp); emit RiskAlert(1, reason, totalDefaults); }",
        "    function activateSafeguard(string memory reason) external onlyOwner { _triggerSafeguard(reason); }",
        "    function deactivateSafeguard() external onlyOwner { safeguardActive = false; emit RiskAlert(2, 'Safeguard deactivated', 0); }",
        "    function setMinReserveRatio(uint256 _ratio) external onlyOwner { require(_ratio >= 1000 && _ratio <= 10000, 'Ratio must be 10-100%'); minReserveRatio = _ratio; }",
        "    function setDefaultThreshold(uint256 _threshold) external onlyOwner { require(_threshold >= 100 && _threshold <= 10000, 'Threshold must be 1-100%'); defaultThreshold = _threshold; }",
        "    function isSystemHealthy() external view returns (bool) { if (safeguardActive) return false; if (totalYieldPool == 0) return true; uint256 defaultRatio = (totalDefaults * 10000) / totalYieldPool; return defaultRatio <= defaultThreshold; }",
        "    function getRiskMetrics() external view returns (uint256 _totalDefaults, uint256 _defaultRatio, uint256 _reserveRatio, bool _safeguardActive, uint256 _lastRiskCheck) { uint256 _defaultRatio = totalYieldPool > 0 ? (totalDefaults * 10000) / totalYieldPool : 0; uint256 _reserveRatio = totalDistributedYield > 0 ? (totalYieldPool * 10000) / totalDistributedYield : 0; return (totalDefaults, _defaultRatio, _reserveRatio, safeguardActive, lastRiskCheck); }",
        "}",
      ],
      [wallet.address, priceFeed, ethers.ZeroAddress]
    );
    results.contracts.yieldDistributor = yieldDistributorAddress;
    console.log(`   YieldDistributor deployed at: ${yieldDistributorAddress}`);
  } catch (error: any) {
    console.error(`   Error deploying YieldDistributor: ${error.message}`);
    process.exit(1);
  }

  console.log("\n4. Deploying PriceFeedConsumer...");
  try {
    const priceFeedConsumerAddress = await sdk.deployer.deployContract(
      [
        "interface AggregatorV3Interface { function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound); function decimals() external view returns (uint8); }",
        "",
        "contract PriceFeedConsumer {",
        "    AggregatorV3Interface public ethUsdPriceFeed;",
        "    AggregatorV3Interface public propertyIndexFeed;",
        "    uint8 public decimals;",
        "    uint256 public latestPrice;",
        "    uint256 public latestTimestamp;",
        "    event PriceUpdated(uint256 price, uint256 timestamp);",
        "    constructor(address _ethUsdPriceFeed, address _propertyIndexFeed) { if (_ethUsdPriceFeed != address(0)) { ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed); decimals = ethUsdPriceFeed.decimals(); } if (_propertyIndexFeed != address(0)) { propertyIndexFeed = AggregatorV3Interface(_propertyIndexFeed); } }",
        "    function getEthUsdPrice() public returns (uint256) { (, int256 price,, uint256 timestamp,) = ethUsdPriceFeed.latestRoundData(); require(price > 0, 'Invalid price'); latestPrice = uint256(price); latestTimestamp = timestamp; emit PriceUpdated(latestPrice, latestTimestamp); return latestPrice; }",
        "    function getEthUsdPriceView() public view returns (uint256) { (, int256 price,,,) = ethUsdPriceFeed.latestRoundData(); require(price > 0, 'Invalid price'); return uint256(price); }",
        "    function getPropertyIndexPrice() public view returns (uint256) { (, int256 price,,,) = propertyIndexFeed.latestRoundData(); require(price > 0, 'Invalid price'); return uint256(price); }",
        "    function convertUsdToEth(uint256 usdAmount) public view returns (uint256) { uint256 price = getEthUsdPriceView(); return (usdAmount * 1e8) / price; }",
        "    function convertEthToUsd(uint256 ethAmount) public view returns (uint256) { uint256 price = getEthUsdPriceView(); return (ethAmount * price) / 1e8; }",
        "    function getPropertyValuationInUsd(uint256 rentAmount, uint256 months) public view returns (uint256) { uint256 annualRent = rentAmount * 12; uint256 capRate = 5e16; return (annualRent * months * 1e18) / capRate; }",
        "    function getAnnualYieldInUsd(uint256 propertyValue, uint256 rentAmount) public pure returns (uint256) { return (propertyValue * rentAmount) / 1e18; }",
        "    function getYieldPercentage(uint256 rentAmount, uint256 propertyValue) public pure returns (uint256) { require(propertyValue > 0, 'Property value must be > 0'); return (rentAmount * 10000) / propertyValue; }",
        "}",
      ],
      [priceFeed, ethers.ZeroAddress]
    );
    results.contracts.priceFeedConsumer = priceFeedConsumerAddress;
    console.log(`   PriceFeedConsumer deployed at: ${priceFeedConsumerAddress}`);
  } catch (error: any) {
    console.error(`   Error deploying PriceFeedConsumer: ${error.message}`);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Configuring Contracts...");
  console.log("=".repeat(60));

  console.log("\n1. Setting up PropertyRegistry...");
  const registry = await sdk.getContract(results.contracts.propertyRegistry);
  try {
    await registry.call("setIssuer", [wallet.address, true]);
    console.log("   Issuer role granted to deployer");
  } catch (error: any) {
    console.log(`   Note: ${error.message}`);
  }

  console.log("\n2. Setting up TENToken...");
  const tenToken = await sdk.getContract(results.contracts.tenToken);
  try {
    await tenToken.call("setMinter", [wallet.address, true]);
    console.log("   Minter role granted to deployer");
  } catch (error: any) {
    console.log(`   Note: ${error.message}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Deployment Complete!");
  console.log("=".repeat(60));
  console.log();
  console.log("Deployed Contracts:");
  console.log(`  TENToken:          ${results.contracts.tenToken}`);
  console.log(`  PropertyRegistry: ${results.contracts.propertyRegistry}`);
  console.log(`  YieldDistributor:  ${results.contracts.yieldDistributor}`);
  console.log(`  PriceFeedConsumer: ${results.contracts.priceFeedConsumer}`);
  console.log();
  console.log(`Price Feed (Chainlink): ${results.priceFeed}`);
  console.log();

  const outputPath = path.join(process.cwd(), "deployment-results.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Deployment results saved to: ${outputPath}`);

  console.log("\nNext Steps:");
  console.log("1. Update your .env file with the deployed contract addresses:");
  console.log(`   VITE_PROPERTY_REGISTRY_${network.toUpperCase()}=${results.contracts.propertyRegistry}`);
  console.log(`   VITE_TEN_TOKEN_${network.toUpperCase()}=${results.contracts.tenToken}`);
  console.log(`   VITE_YIELD_DISTRIBUTOR_${network.toUpperCase()}=${results.contracts.yieldDistributor}`);
  console.log(`   VITE_PRICE_FEED_CONSUMER_${network.toUpperCase()}=${results.contracts.priceFeedConsumer}`);
  console.log("\n2. Verify contracts on Etherscan:");
  console.log(`   npx thirdweb verify --chain ${network} --address ${results.contracts.propertyRegistry}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
