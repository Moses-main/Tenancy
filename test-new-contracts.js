import { ethers } from 'ethers';

// Test the newly deployed contracts
const PROPERTY_REGISTRY = '0xCd5E04B88789bd2772AbFf6e9642B08A074a8326';
const RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/igSo1TQOzun0wSumQjuIM';

const REGISTRY_ABI = [
    "function getAllProperties() view returns (tuple(uint256 id, string uri, uint256 rentAmount, uint256 rentFrequency, uint256 totalSupply, address propertyToken, address owner, bool isActive)[])",
    "function nextPropertyId() view returns (uint256)",
    "function issuers(address) view returns (bool)",
    "function paused() view returns (bool)",
    "function createProperty(string uri, uint256 rentAmount, uint256 rentFrequency, uint256 initialSupply, string tokenName, string tokenSymbol, uint256 valuationUsd) returns (address)"
];

async function testNewContracts() {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const registry = new ethers.Contract(PROPERTY_REGISTRY, REGISTRY_ABI, provider);
    
    try {
        console.log('🔍 Testing Newly Deployed Contracts...');
        console.log('PropertyRegistry Address:', PROPERTY_REGISTRY);
        
        // Test basic contract calls
        const nextId = await registry.nextPropertyId();
        console.log('✅ nextPropertyId:', nextId.toString());
        
        const isPaused = await registry.paused();
        console.log('✅ paused:', isPaused);
        
        // Test getAllProperties
        console.log('🏠 Testing getAllProperties...');
        const properties = await registry.getAllProperties();
        console.log('✅ Properties found:', properties.length);
        
        if (properties.length > 0) {
            properties.forEach((prop, index) => {
                console.log(`\n🏠 Property #${prop.id}:`);
                console.log(`  URI: ${prop.uri.substring(0, 80)}...`);
                console.log(`  Owner: ${prop.owner}`);
                console.log(`  Active: ${prop.isActive}`);
                console.log(`  Tokens: ${ethers.utils.formatUnits(prop.totalSupply, 18)}`);
                
                // Check if owner is zero address
                const isZeroOwner = prop.owner === '0x0000000000000000000000000000000000000' || 
                                   prop.owner === '0x0000000000000000000000000000000000001';
                console.log(`  Zero Owner: ${isZeroOwner}`);
                console.log(`  Should Display: ${prop.isActive && !isZeroOwner}`);
            });
        } else {
            console.log('📝 No properties found. Let\'s try creating one...');
            
            // Test property creation
            const PRIVATE_KEY = '0xcb601f9647fa12dea8081b5bfed574f40f4f41996401ea5901bcb314392e90e9';
            const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
            const registryWithSigner = new ethers.Contract(PROPERTY_REGISTRY, REGISTRY_ABI, wallet);
            
            // Check if we're an issuer
            const isIssuer = await registryWithSigner.issuers(wallet.address);
            console.log('Is Issuer:', isIssuer);
            
            if (!isIssuer) {
                console.log('❌ Not authorized as issuer. This might be issue.');
            } else {
                console.log('✅ Authorized as issuer. Trying to create property...');
                
                const tx = await registryWithSigner.createProperty(
                    "https://bullionriseconsult.com/wp-content/uploads/2025/12/4-Bedroom-Bungalow-3d-Exterior-Designs-in-Nigeria-Bullionrise-Consult-2-scaled.jpg",
                    ethers.utils.parseUnits('1000', 6), // $1000 rent
                    30 * 24 * 60 * 60, // 30 days
                    ethers.utils.parseUnits('100', 18), // 100 tokens
                    "Test Property New",
                    "TEST",
                    ethers.utils.parseUnits('100000', 8) // $100k valuation
                );
                
                console.log('🔄 Transaction submitted:', tx.hash);
                const receipt = await tx.wait();
                console.log('✅ Property created! Status:', receipt.status);
                
                if (receipt.status === 1) {
                    // Check properties again
                    const newProperties = await registry.getAllProperties();
                    console.log('🎉 Properties after creation:', newProperties.length);
                    
                    const lastProperty = newProperties[newProperties.length - 1];
                    console.log('🏠 Last Property Created:');
                    console.log('  ID:', lastProperty.id.toString());
                    console.log('  Owner:', lastProperty.owner);
                    console.log('  Active:', lastProperty.isActive);
                    console.log('  URI:', lastProperty.uri.substring(0, 80) + '...');
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.transaction) {
            console.error('Transaction hash:', error.transaction.hash);
        }
    }
}

testNewContracts();
