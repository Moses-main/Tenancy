const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const inMemoryIdempotency = new Map();

async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        idempotency_key TEXT PRIMARY KEY,
        endpoint TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        status_code INTEGER,
        response_body JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.warn('Failed to ensure idempotency schema. Falling back to in-memory idempotency store.', error.message);
  }
}

ensureSchema();

const db = {
  // Verifications
  async createVerification(verification) {
    const result = await pool.query(
      `INSERT INTO verifications (verification_id, property_id, property_name, amount, tenant_name, tenant_address, proof_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        verification.verificationId,
        verification.propertyId,
        verification.propertyName,
        verification.amount,
        verification.tenantName,
        verification.tenantAddress,
        verification.proofUrl,
        verification.status || 'pending'
      ]
    );
    return result.rows[0];
  },

  async getVerification(verificationId) {
    const result = await pool.query(
      'SELECT * FROM verifications WHERE verification_id = $1',
      [verificationId]
    );
    return result.rows[0];
  },

  async getVerificationsByProperty(propertyId) {
    const result = await pool.query(
      'SELECT * FROM verifications WHERE property_id = $1 ORDER BY created_at DESC',
      [propertyId]
    );
    return result.rows;
  },

  async updateVerification(verificationId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return this.getVerification(verificationId);

    values.push(verificationId);
    const result = await pool.query(
      `UPDATE verifications SET ${fields.join(', ')} WHERE verification_id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async getAllVerifications() {
    const result = await pool.query('SELECT * FROM verifications ORDER BY created_at DESC');
    return result.rows;
  },

  async getVerificationByProviderReference(providerReference) {
    const result = await pool.query(
      'SELECT * FROM verifications WHERE provider_reference = $1 ORDER BY created_at DESC LIMIT 1',
      [providerReference]
    );
    return result.rows[0];
  },

  // Payments
  async createPayment(payment) {
    const result = await pool.query(
      `INSERT INTO payments (payment_id, property_id, property_name, amount, currency, tenant_address, status, payment_date, tx_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        payment.paymentId,
        payment.propertyId,
        payment.propertyName,
        payment.amount,
        payment.currency || 'USD',
        payment.tenantAddress,
        payment.status || 'pending',
        payment.paymentDate,
        payment.txHash
      ]
    );
    return result.rows[0];
  },

  async getPaymentsByProperty(propertyId) {
    const result = await pool.query(
      'SELECT * FROM payments WHERE property_id = $1 ORDER BY payment_date DESC',
      [propertyId]
    );
    return result.rows;
  },

  async getAllPayments() {
    const result = await pool.query('SELECT * FROM payments ORDER BY created_at DESC');
    return result.rows;
  },

  async getPayment(paymentId) {
    const result = await pool.query(
      'SELECT * FROM payments WHERE payment_id = $1',
      [paymentId]
    );
    return result.rows[0];
  },

  async updatePayment(paymentId, updates) {
    const fields = ['updated_at = CURRENT_TIMESTAMP'];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    values.push(paymentId);
    const result = await pool.query(
      `UPDATE payments SET ${fields.join(', ')} WHERE payment_id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  // Agent Decisions (Chainlink CRE)
  async createAgentDecision(decision) {
    const result = await pool.query(
      `INSERT INTO agent_decisions (decision_id, property_id, action, adjustment_percent, reason, confidence, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        decision.decisionId,
        decision.propertyId,
        decision.action,
        decision.adjustmentPercent || 0,
        decision.reason,
        decision.confidence,
        decision.status || 'pending'
      ]
    );
    return result.rows[0];
  },

  async getAgentDecisionsByProperty(propertyId) {
    const result = await pool.query(
      'SELECT * FROM agent_decisions WHERE property_id = $1 ORDER BY created_at DESC',
      [propertyId]
    );
    return result.rows;
  },

  async getAllAgentDecisions() {
    const result = await pool.query('SELECT * FROM agent_decisions ORDER BY created_at DESC');
    return result.rows;
  },

  async updateAgentDecision(decisionId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return;

    values.push(decisionId);
    const result = await pool.query(
      `UPDATE agent_decisions SET ${fields.join(', ')} WHERE decision_id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  // Yield Distributions
  async createYieldDistribution(distribution) {
    const result = await pool.query(
      `INSERT INTO yield_distributions (distribution_id, property_id, total_yield, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        distribution.distributionId,
        distribution.propertyId,
        distribution.totalYield,
        distribution.status || 'pending'
      ]
    );
    return result.rows[0];
  },

  async getYieldDistributionsByProperty(propertyId) {
    const result = await pool.query(
      'SELECT * FROM yield_distributions WHERE property_id = $1 ORDER BY created_at DESC',
      [propertyId]
    );
    return result.rows;
  },

  async updateYieldDistribution(distributionId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    values.push(distributionId);
    const result = await pool.query(
      `UPDATE yield_distributions SET ${fields.join(', ')} WHERE distribution_id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async getYieldDistribution(distributionId) {
    const result = await pool.query(
      'SELECT * FROM yield_distributions WHERE distribution_id = $1',
      [distributionId]
    );
    return result.rows[0];
  },

  // Stats
  async getStats() {
    const verifications = await pool.query(
      "SELECT status, COUNT(*) as count FROM verifications GROUP BY status"
    );
    const payments = await pool.query(
      "SELECT status, COUNT(*) as count FROM payments GROUP BY status"
    );
    const agentDecisions = await pool.query(
      "SELECT status, COUNT(*) as count FROM agent_decisions GROUP BY status"
    );

    return {
      verifications: verifications.rows,
      payments: payments.rows,
      agentDecisions: agentDecisions.rows
    };
  },

  // Idempotency keys
  async getIdempotencyKey(idempotencyKey, endpoint) {
    try {
      const result = await pool.query(
        'SELECT * FROM idempotency_keys WHERE idempotency_key = $1 AND endpoint = $2',
        [idempotencyKey, endpoint]
      );
      return result.rows[0];
    } catch {
      const entry = inMemoryIdempotency.get(`${endpoint}:${idempotencyKey}`);
      return entry || null;
    }
  },

  async createIdempotencyKey(record) {
    const { idempotencyKey, endpoint, requestHash } = record;
    try {
      const result = await pool.query(
        `INSERT INTO idempotency_keys (idempotency_key, endpoint, request_hash, status)
         VALUES ($1, $2, $3, 'pending')
         ON CONFLICT (idempotency_key)
         DO NOTHING
         RETURNING *`,
        [idempotencyKey, endpoint, requestHash]
      );
      return result.rows[0] || null;
    } catch {
      const key = `${endpoint}:${idempotencyKey}`;
      if (inMemoryIdempotency.has(key)) return null;
      const row = {
        idempotency_key: idempotencyKey,
        endpoint,
        request_hash: requestHash,
        status: 'pending',
        status_code: null,
        response_body: null,
      };
      inMemoryIdempotency.set(key, row);
      return row;
    }
  },

  async completeIdempotencyKey(idempotencyKey, endpoint, statusCode, responseBody, status = 'completed') {
    try {
      const result = await pool.query(
        `UPDATE idempotency_keys
         SET status = $3, status_code = $4, response_body = $5::jsonb, updated_at = CURRENT_TIMESTAMP
         WHERE idempotency_key = $1 AND endpoint = $2
         RETURNING *`,
        [idempotencyKey, endpoint, status, statusCode, JSON.stringify(responseBody || {})]
      );
      return result.rows[0] || null;
    } catch {
      const key = `${endpoint}:${idempotencyKey}`;
      const existing = inMemoryIdempotency.get(key);
      if (!existing) return null;
      const updated = {
        ...existing,
        status,
        status_code: statusCode,
        response_body: responseBody || {},
      };
      inMemoryIdempotency.set(key, updated);
      return updated;
    }
  }
};

module.exports = db;
