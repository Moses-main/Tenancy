import { ethers } from 'ethers';

// Check what contract is at the price feed address
const PRICE_FEED_ADDRESS = '0x5aAdFB43eF8dAF45DD80F4676345b7676f1D70e3';
const RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/igSo1TQOzun0wSumQjuIM';

const PRICE_FEED_ABI = [
    "function decimals() view returns (uint8)",
    "function description() view returns (string)",
    "function version() view returns (uint256)",
    "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
];

async function checkPriceFeed() {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    try {
        console.log('🔍 Checking contract at:', PRICE_FEED_ADDRESS);
        
        // Check if there's any code at the address
        const code = await provider.getCode(PRICE_FEED_ADDRESS);
        console.log('Contract exists:', code !== '0x');
        
        if (code !== '0x') {
            const priceFeed = new ethers.Contract(PRICE_FEED_ADDRESS, PRICE_FEED_ABI, provider);
            
            try {
                const decimals = await priceFeed.decimals();
                console.log('✅ Decimals:', decimals);
                
                const description = await priceFeed.description();
                console.log('✅ Description:', description);
                
                const version = await priceFeed.version();
                console.log('✅ Version:', version);
                
                const roundData = await priceFeed.latestRoundData();
                console.log('✅ Latest Round Data:');
                console.log('  Price:', roundData.answer.toString());
                console.log('  Round ID:', roundData.roundId.toString());
            } catch (error) {
                console.log('❌ Error calling price feed functions:', error.message);
            }
        } else {
            console.log('❌ No contract deployed at this address');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkPriceFeed();
