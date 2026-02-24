"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.hashData = hashData;
exports.maskSensitiveData = maskSensitiveData;
exports.maskAddress = maskAddress;
exports.maskAmount = maskAmount;
exports.maskEmail = maskEmail;
exports.sanitizePaymentData = sanitizePaymentData;
exports.calculatePrivateYield = calculatePrivateYield;
exports.verifyYieldCalculation = verifyYieldCalculation;
exports.createConfidentialRequest = createConfidentialRequest;
exports.logPrivacySafe = logPrivacySafe;
const crypto = __importStar(require("crypto"));
const ENCRYPTION_KEY = process.env.PRIVACY_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;
function encrypt(data) {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
function decrypt(encryptedData) {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
function hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}
function maskSensitiveData(data, visibleChars = 4) {
    if (data.length <= visibleChars) {
        return '*'.repeat(data.length);
    }
    const masked = '*'.repeat(data.length - visibleChars);
    return masked + data.slice(-visibleChars);
}
function maskAddress(address) {
    if (!address || address.length < 10)
        return '****';
    return address.slice(0, 6) + '...' + address.slice(-4);
}
function maskAmount(amount) {
    return '***.' + amount.slice(-2);
}
function maskEmail(email) {
    const parts = email.split('@');
    if (parts.length !== 2)
        return '****';
    const name = parts[0];
    const domain = parts[1];
    return name[0] + '***@' + domain;
}
function sanitizePaymentData(rawData) {
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
function calculatePrivateYield(holderAddress, totalHolding, distributionAmount, totalSupply) {
    const yieldAmount = (totalHolding * distributionAmount) / totalSupply;
    const calculationData = `${holderAddress}:${totalHolding}:${distributionAmount}:${totalSupply}`;
    return {
        holderAddress: maskAddress(holderAddress),
        totalHolding: totalHolding.toString(),
        yieldAmount: yieldAmount.toString(),
        calculationHash: hashData(calculationData),
    };
}
function verifyYieldCalculation(holderAddress, totalHolding, distributionAmount, totalSupply, providedHash) {
    const calculationData = `${holderAddress}:${totalHolding}:${distributionAmount}:${totalSupply}`;
    const expectedHash = hashData(calculationData);
    return expectedHash === providedHash;
}
function createConfidentialRequest(payload, apiKey) {
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
function logPrivacySafe(event, data) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        if (key.includes('address') || key.includes('Address')) {
            sanitized[key] = maskAddress(value);
        }
        else if (key.includes('amount') || key.includes('Amount')) {
            sanitized[key] = maskAmount(String(value));
        }
        else if (key.includes('email') || key.includes('Email')) {
            sanitized[key] = maskEmail(String(value));
        }
        else if (key.includes('phone') || key.includes('Phone')) {
            sanitized[key] = maskSensitiveData(String(value), 2);
        }
        else if (typeof value === 'string' && value.length > 20) {
            sanitized[key] = maskSensitiveData(value, 4);
        }
        else {
            sanitized[key] = value;
        }
    }
    console.log(`[PRIVACY] ${event}:`, JSON.stringify(sanitized));
}
