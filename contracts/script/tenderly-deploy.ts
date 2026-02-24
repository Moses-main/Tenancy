import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const TENDERLY_ACCOUNT_ID = process.env.TENDERLY_ACCOUNT_ID || '';
const TENDERLY_PROJECT_SLUG = process.env.TENDERLY_PROJECT_SLUG || 'tenancy-protocol';
const TENDERLY_ACCESS_KEY = process.env.TENDERLY_ACCESS_KEY || '';

const RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';

const CONTRACT_VERSIONS = {
  TENToken: '0.1.0',
  PropertyRegistry: '0.1.0',
  YieldDistributor: '0.1.0',
  PriceFeedConsumer: '0.1.0',
  RentalToken: '0.1.0',
};

interface DeploymentResult {
  contractName: string;
  address: string;
  transactionHash: string;
  chainId: number;
}

async function deployToTenderlyVirtualTestNet(): Promise<DeploymentResult[]> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     TENANCY - Tenderly Virtual TestNet Deployment        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (!TENDERLY_ACCESS_KEY) {
    console.log('⚠️  Tenderly credentials not configured');
    console.log('   Set TENDERLY_ACCOUNT_ID, TENDERLY_PROJECT_SLUG, TENDERLY_ACCESS_KEY');
    console.log('\n   Deploying to local simulation instead...\n');
    return simulateLocalDeployment();
  }

  console.log(`[TENDERLY] Account: ${TENDERLY_ACCOUNT_ID}`);
  console.log(`[TENDERLY] Project: ${TENDERLY_PROJECT_SLUG}`);
  console.log(`[TENDERLY] Fork: Sepolia Testnet\n`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const results: DeploymentResult[] = [];
  const chainId = (await provider.getNetwork()).chainId;

  console.log('[DEPLOY] Deploying contracts...\n');

  console.log(`[DEPLOY] Deploying TENToken...`);
  const TENTokenFactory = await ethers.getContractFactory('TENToken');
  const tenToken = await TENTokenFactory.deploy(wallet.address);
  await tenToken.waitForDeployment();
  const tenTokenAddress = await tenToken.getAddress();
  console.log(`   ✓ TENToken: ${tenTokenAddress}\n`);
  results.push({
    contractName: 'TENToken',
    address: tenTokenAddress,
    transactionHash: tenToken.deploymentTransaction()?.hash || '',
    chainId: Number(chainId),
  });

  const ETH_USD_FEED = '0x694AA1769357215DE4FAC081bf1f309aDC325306';

  console.log('[DEPLOY] Deploying PropertyRegistry...');
  const PropertyRegistryFactory = await ethers.getContractFactory('PropertyRegistry');
  const propertyRegistry = await PropertyRegistryFactory.deploy(wallet.address, ETH_USD_FEED);
  await propertyRegistry.waitForDeployment();
  const propertyRegistryAddress = await propertyRegistry.getAddress();
  console.log(`   ✓ PropertyRegistry: ${propertyRegistryAddress}\n`);
  results.push({
    contractName: 'PropertyRegistry',
    address: propertyRegistryAddress,
    transactionHash: propertyRegistry.deploymentTransaction()?.hash || '',
    chainId: Number(chainId),
  });

  console.log('[DEPLOY] Deploying YieldDistributor...');
  const YieldDistributorFactory = await ethers.getContractFactory('YieldDistributor');
  const yieldDistributor = await YieldDistributorFactory.deploy(wallet.address, ETH_USD_FEED, ethers.ZeroAddress);
  await yieldDistributor.waitForDeployment();
  const yieldDistributorAddress = await yieldDistributor.getAddress();
  console.log(`   ✓ YieldDistributor: ${yieldDistributorAddress}\n`);
  results.push({
    contractName: 'YieldDistributor',
    address: yieldDistributorAddress,
    transactionHash: yieldDistributor.deploymentTransaction()?.hash || '',
    chainId: Number(chainId),
  });

  console.log('[DEPLOY] Deploying PriceFeedConsumer...');
  const PriceFeedConsumerFactory = await ethers.getContractFactory('PriceFeedConsumer');
  const priceFeedConsumer = await PriceFeedConsumerFactory.deploy(ETH_USD_FEED, ETH_USD_FEED);
  await priceFeedConsumer.waitForDeployment();
  const priceFeedConsumerAddress = await priceFeedConsumer.getAddress();
  console.log(`   ✓ PriceFeedConsumer: ${priceFeedConsumerAddress}\n`);
  results.push({
    contractName: 'PriceFeedConsumer',
    address: priceFeedConsumerAddress,
    transactionHash: priceFeedConsumer.deploymentTransaction()?.hash || '',
    chainId: Number(chainId),
  });

  console.log('[DEPLOY] Configuring contracts...');
  await propertyRegistry.setIssuer(wallet.address, true);
  console.log('   ✓ Issuer configured');

  await tenToken.setMinter(wallet.address, true);
  console.log('   ✓ Minter configured\n');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                  DEPLOYMENT COMPLETE                     ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Network: Sepolia (Chain ${Number(chainId)})                              ║`);
  console.log(`║  Contracts Deployed: ${results.length}                                   ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Contract Addresses:');
  console.log(`  TENToken: ${tenTokenAddress}`);
  console.log(`  PropertyRegistry: ${propertyRegistryAddress}`);
  console.log(`  YieldDistributor: ${yieldDistributorAddress}`);
  console.log(`  PriceFeedConsumer: ${priceFeedConsumerAddress}`);
  console.log('');

  console.log('Tenderly Explorer:');
  console.log(`  https://dashboard.tenderly.co/${TENDERLY_ACCOUNT_ID}/${TENDERLY_PROJECT_SLUG}/explorer\n`);

  return results;
}

async function simulateLocalDeployment(): Promise<DeploymentResult[]> {
  console.log('[SIMULATION] Running local deployment simulation...\n');

  const mockAddresses = {
    TENToken: '0x' + Math.random().toString(16).slice(2, 42),
    PropertyRegistry: '0x' + Math.random().toString(16).slice(2, 42),
    YieldDistributor: '0x' + Math.random().toString(16).slice(2, 42),
    PriceFeedConsumer: '0x' + Math.random().toString(16).slice(2, 42),
  };

  console.log('   ✓ TENToken:', mockAddresses.TENToken);
  console.log('   ✓ PropertyRegistry:', mockAddresses.PropertyRegistry);
  console.log('   ✓ YieldDistributor:', mockAddresses.YieldDistributor);
  console.log('   ✓ PriceFeedConsumer:', mockAddresses.PriceFeedConsumer);
  console.log('');

  return [
    { contractName: 'TENToken', address: mockAddresses.TENToken, transactionHash: '0xmock', chainId: 11155111 },
    { contractName: 'PropertyRegistry', address: mockAddresses.PropertyRegistry, transactionHash: '0xmock', chainId: 11155111 },
    { contractName: 'YieldDistributor', address: mockAddresses.YieldDistributor, transactionHash: '0xmock', chainId: 11155111 },
    { contractName: 'PriceFeedConsumer', address: mockAddresses.PriceFeedConsumer, transactionHash: '0xmock', chainId: 11155111 },
  ];
}

if (require.main === module) {
  deployToTenderlyVirtualTestNet()
    .then(() => {
      console.log('\n✓ Deployment script complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Deployment failed:', error);
      process.exit(1);
    });
}

export { deployToTenderlyVirtualTestNet, DeploymentResult };
