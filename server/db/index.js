const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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
  }
};

module.exports = db;
