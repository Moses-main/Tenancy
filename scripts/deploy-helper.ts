import { parseArgs } from 'util';

interface DeployConfig {
  network: string;
  rpcUrl: string;
  privateKey: string;
  ethUsdPriceFeed?: string;
}

const getDeployConfig = (): DeployConfig => {
  const { values } = parseArgs({
    options: {
      network: { type: 'string', default: 'baseSepolia' },
      rpc: { type: 'string' },
      key: { type: 'string' },
      priceFeed: { type: 'string' },
    },
  });

  const network = values.network || 'baseSepolia';
  
  const configs: Record<string, { rpcUrl: string; priceFeed?: string }> = {
    baseSepolia: {
      rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
      priceFeed: '0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12',
    },
    sepolia: {
      rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
      priceFeed: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
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
    ethUsdPriceFeed: values.priceFeed || config.priceFeed,
  };
};

const generateEnvOutput = (addresses: {
  tenToken: string;
  propertyRegistry: string;
  yieldDistributor: string;
  priceFeedConsumer: string;
}, network: string) => {
  const prefix = network === 'baseSepolia' ? 'VITE' : 'VITE';
  const networkUpper = network.charAt(0).toUpperCase() + network.slice(1);
  
  console.log(`
# Generated deployment addresses for ${network}
# Run this after deploying contracts

# ${networkUpper} Contract Addresses
${prefix}_TEN_TOKEN_${networkUpper.toUpperCase()}=${addresses.tenToken}
${prefix}_PROPERTY_REGISTRY_${networkUpper.toUpperCase()}=${addresses.propertyRegistry}
${prefix}_YIELD_DISTRIBUTOR_${networkUpper.toUpperCase()}=${addresses.yieldDistributor}
${prefix}_PRICE_FEED_CONSUMER_${networkUpper.toUpperCase()}=${addresses.priceFeedConsumer}

# Update your .env file with these addresses
`);
};

const main = async () => {
  const config = getDeployConfig();
  
  if (!config.privateKey) {
    console.error('Error: Private key required. Set PRIVATE_KEY env var or use --key flag');
    process.exit(1);
  }

  console.log('Deploying TENANCY Protocol contracts...');
  console.log(`Network: ${config.network}`);
  console.log(`RPC: ${config.rpcUrl}`);
  console.log(`Price Feed: ${config.ethUsdPriceFeed}`);
  
  console.log('\nTo deploy, run the following from the contracts directory:');
  console.log(`
  cd contracts
  forge script script/DeployTENANCY.s.sol:DeployTENANCY \\
    --rpc-url ${config.rpcUrl} \\
    --private-key ${config.privateKey} \\
    --broadcast
  `);
  
  console.log('\nAfter deployment, update your frontend .env file with the deployed addresses.');
};

main().catch(console.error);
