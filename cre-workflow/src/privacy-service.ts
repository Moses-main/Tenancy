import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.PRIVACY_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

function encrypt(data: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }
  const masked = '*'.repeat(data.length - visibleChars);
  return masked + data.slice(-visibleChars);
}

function maskAddress(address: string): string {
  if (!address || address.length < 10) return '****';
  return address.slice(0, 6) + '...' + address.slice(-4);
}

function maskAmount(amount: string): string {
  return '***.' + amount.slice(-2);
}

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '****';
  const name = parts[0];
  const domain = parts[1];
  return name[0] + '***@' + domain;
}

interface SensitivePaymentData {
  tenantPersonalInfo: {
    name: string;
    email: string;
    phone: string;
    bankAccount: string;
  };
  paymentDetails: {
    amount: string;
    currency: string;
    transactionId: string;
  };
  propertyDetails: {
    address: string;
    rentAmount: string;
  };
}

function sanitizePaymentData(rawData: SensitivePaymentData): {
  maskedTenant: {
    name: string;
    email: string;
    phone: string;
  };
  maskedPayment: {
    amount: string;
    currency: string;
  };
  verificationHash: string;
} {
  const verificationData = JSON.stringify({
    amount: rawData.paymentDetails.amount,
    transactionId: rawData.paymentDetails.transactionId,
  });
  
  return {
    maskedTenant: {
      name: maskSensitiveData(rawData.tenantPersonalInfo.name, 1),
      email: maskEmail(rawData.tenantPersonalInfo.email),
      phone: maskSensitiveData(rawData.tenantPersonalInfo.phone, 2),
    },
    maskedPayment: {
      amount: maskAmount(rawData.paymentDetails.amount),
      currency: rawData.paymentDetails.currency,
    },
    verificationHash: hashData(verificationData),
  };
}

interface PrivateYieldCalculation {
  holderAddress: string;
  totalHolding: string;
  yieldAmount: string;
  calculationHash: string;
}

function calculatePrivateYield(
  holderAddress: string,
  totalHolding: bigint,
  distributionAmount: bigint,
  totalSupply: bigint
): PrivateYieldCalculation {
  const yieldAmount = (totalHolding * distributionAmount) / totalSupply;
  
  const calculationData = `${holderAddress}:${totalHolding}:${distributionAmount}:${totalSupply}`;
  
  return {
    holderAddress: maskAddress(holderAddress),
    totalHolding: totalHolding.toString(),
    yieldAmount: yieldAmount.toString(),
    calculationHash: hashData(calculationData),
  };
}

function verifyYieldCalculation(
  holderAddress: string,
  totalHolding: bigint,
  distributionAmount: bigint,
  totalSupply: bigint,
  providedHash: string
): boolean {
  const calculationData = `${holderAddress}:${totalHolding}:${distributionAmount}:${totalSupply}`;
  const expectedHash = hashData(calculationData);
  return expectedHash === providedHash;
}

interface ConfidentialRequest {
  headers: {
    'Authorization': string;
    'X-API-Key': string;
    'X-Request-ID': string;
    'X-Encryption-Key-ID'?: string;
  };
  body: string;
}

function createConfidentialRequest(
  payload: any,
  apiKey: string
): ConfidentialRequest {
  const requestId = `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const encryptedBody = encrypt(JSON.stringify(payload));
  
  return {
    headers: {
      'Authorization': `Bearer ${Buffer.from(apiKey).toString('base64')}`,
      'X-API-Key': apiKey.substring(0, 8) + '****',
      'X-Request-ID': requestId,
      'X-Encryption-Key-ID': 'key-001',
    },
    body: encryptedBody,
  };
}

function logPrivacySafe(event: string, data: Record<string, any>): void {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (key.includes('address') || key.includes('Address')) {
      sanitized[key] = maskAddress(value as string);
    } else if (key.includes('amount') || key.includes('Amount')) {
      sanitized[key] = maskAmount(String(value));
    } else if (key.includes('email') || key.includes('Email')) {
      sanitized[key] = maskEmail(String(value));
    } else if (key.includes('phone') || key.includes('Phone')) {
      sanitized[key] = maskSensitiveData(String(value), 2);
    } else if (typeof value === 'string' && value.length > 20) {
      sanitized[key] = maskSensitiveData(value, 4);
    } else {
      sanitized[key] = value;
    }
  }
  
  console.log(`[PRIVACY] ${event}:`, JSON.stringify(sanitized));
}

export {
  encrypt,
  decrypt,
  hashData,
  maskSensitiveData,
  maskAddress,
  maskAmount,
  maskEmail,
  sanitizePaymentData,
  PrivateYieldCalculation,
  calculatePrivateYield,
  verifyYieldCalculation,
  ConfidentialRequest,
  createConfidentialRequest,
  logPrivacySafe,
  SensitivePaymentData,
};
