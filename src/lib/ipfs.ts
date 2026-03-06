import { ethers } from 'ethers';
const { parseUnits, parseEther } = ethers.utils;

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || '';
const ALLOW_MOCK_IPFS = import.meta.env.VITE_ALLOW_MOCK_IPFS === 'true';
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

function ensureIpfsConfigured(operation: string) {
  if (PINATA_JWT) return;

  if (ALLOW_MOCK_IPFS) {
    console.warn(`Pinata JWT not configured for ${operation}; using mock IPFS hash because VITE_ALLOW_MOCK_IPFS=true`);
    return;
  }

  throw new Error(`IPFS is not configured for ${operation}. Set VITE_PINATA_JWT or enable VITE_ALLOW_MOCK_IPFS=true for demo mode.`);
}

function generateMockIpfsHash() {
  const mockHash = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `ipfs://${mockHash}`;
}

export interface IPFSMetadata {
  name: string;
  description: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface PropertyProof {
  propertyAddress: string;
  monthlyRent: number;
  durationMonths: number;
  leaseAgreementHash: string;
  ownerAddress: string;
  timestamp: number;
}

export const uploadToIPFS = async (data: string): Promise<string> => {
  ensureIpfsConfigured('metadata upload');

  if (!PINATA_JWT) {
    return generateMockIpfsHash();
  }

  try {
    const formData = new FormData();
    const blob = new Blob([data], { type: 'application/json' });
    formData.append('file', blob, 'metadata.json');

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`IPFS upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return `ipfs://${result.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
};

export const uploadPropertyProof = async (proof: PropertyProof): Promise<string> => {
  const metadata: IPFSMetadata = {
    name: `Property Proof - ${proof.propertyAddress}`,
    description: `Rental income verification for property at ${proof.propertyAddress}`,
    attributes: [
      { trait_type: 'Monthly Rent', value: proof.monthlyRent },
      { trait_type: 'Duration (Months)', value: proof.durationMonths },
      { trait_type: 'Owner', value: proof.ownerAddress },
      { trait_type: 'Verification Timestamp', value: proof.timestamp },
    ],
  };

  return uploadToIPFS(JSON.stringify(metadata, null, 2));
};

export const uploadLeaseAgreement = async (file: File): Promise<string> => {
  ensureIpfsConfigured('lease upload');

  if (!PINATA_JWT) {
    return generateMockIpfsHash();
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`IPFS upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return `ipfs://${result.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading lease agreement:', error);
    throw error;
  }
};

export const getIPFSUrl = (ipfsHash: string): string => {
  if (!ipfsHash) return '';
  
  if (ipfsHash.startsWith('http')) {
    return ipfsHash;
  }
  
  const hash = ipfsHash.replace('ipfs://', '');
  return `${IPFS_GATEWAY}${hash}`;
};

export const fetchFromIPFS = async <T>(ipfsHash: string): Promise<T> => {
  const url = getIPFSUrl(ipfsHash);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw error;
  }
};

export const uploadPropertyMetadata = async (
  propertyAddress: string,
  monthlyRent: number,
  durationMonths: number,
  ownerAddress: string
): Promise<string> => {
  const metadata = {
    propertyAddress,
    monthlyRent,
    durationMonths,
    ownerAddress,
    createdAt: new Date().toISOString(),
    verificationStatus: 'pending',
  };

  return uploadToIPFS(JSON.stringify(metadata));
};
