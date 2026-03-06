import { parseArgs } from 'util';
import { ethers } from 'ethers';

interface DeployConfig {
  network: string;
  rpcUrl: string;
  privateKey: string;
}

const getDeployConfig = (): DeployConfig => {
  const { values } = parseArgs({
    options: {
      network: { type: 'string', default: 'sepolia' },
      rpc: { type: 'string' },
      key: { type: 'string' },
    },
  });

  const network = values.network || 'sepolia';
  
  const configs: Record<string, { rpcUrl: string }> = {
    sepolia: {
      rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    },
    baseSepolia: {
      rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    },
  };

  const config = configs[network];
  if (!config) {
    throw new Error(`Unknown network: ${network}`);
  }

  return {
    network,
    rpcUrl: values.rpc || config.rpcUrl,
    privateKey: values.key || process.env.PRIVATE_KEY || '',
  };
};

// Marketplace ABI (simplified version)
const MARKETPLACE_ABI = [
  "function createListing(address propertyToken, uint256 amount, uint256 pricePerToken) returns (uint256)",
  "function cancelListing(uint256 listingId)",
  "function buyListing(uint256 listingId) payable",
  "function getListings() view returns (tuple(uint256 id, address seller, address propertyToken, uint256 amount, uint256 pricePerToken, uint256 totalPrice, bool isActive, uint256 createdAt)[])",
];

const main = async () => {
  const config = getDeployConfig();
  
  if (!config.privateKey) {
    console.error('Error: Private key required. Set PRIVATE_KEY env var or use --key flag');
    process.exit(1);
  }

  console.log('Deploying PropertyMarketplace contract...');
  console.log(`Network: ${config.network}`);
  console.log(`RPC: ${config.rpcUrl}`);
  
  try {
    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, provider);
    
    // Deploy marketplace contract
    const marketplaceFactory = new ethers.ContractFactory(
      // You'll need to compile the marketplace contract and get the bytecode
      "MARKETPLACE_BYTECODE_HERE", // Replace with actual bytecode
      MARKETPLACE_ABI,
      wallet
    );
    
    const marketplace = await marketplaceFactory.deploy();
    await marketplace.deployed();
    
    console.log(`✅ PropertyMarketplace deployed at: ${marketplace.address}`);
    
    // Generate environment variable
    const envVar = config.network === 'baseSepolia' 
      ? `VITE_MARKETPLACE_BASE_SEPOLIA=${marketplace.address}`
      : `VITE_MARKETPLACE_SEPOLIA=${marketplace.address}`;
    
    console.log(`\nAdd this to your .env file:`);
    console.log(envVar);
    
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
};

main().catch(console.error);
