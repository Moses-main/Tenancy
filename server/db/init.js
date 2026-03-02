const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initSchema = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Initializing database schema...');
    
    // Create verifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS verifications (
        id SERIAL PRIMARY KEY,
        verification_id VARCHAR(255) UNIQUE NOT NULL,
        property_id INTEGER NOT NULL,
        property_name VARCHAR(255),
        amount DECIMAL(20, 8) NOT NULL,
        tenant_name VARCHAR(255),
        tenant_address VARCHAR(42),
        proof_url TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP,
        chainlink_job_id VARCHAR(255),
        chainlink_tx VARCHAR(255),
        provider_reference VARCHAR(255),
        chainlink_triggered_at TIMESTAMP,
        price_feed_at_verification DECIMAL(20, 8),
        error_message TEXT
      )
    `);
    console.log('✓ verifications table created');

    // Create payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        payment_id VARCHAR(255) UNIQUE NOT NULL,
        property_id INTEGER NOT NULL,
        property_name VARCHAR(255),
        amount DECIMAL(20, 8) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        tenant_address VARCHAR(42),
        status VARCHAR(50) DEFAULT 'pending',
        payment_date TIMESTAMP,
        tx_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ payments table created');

    // Create agent_decisions table for Chainlink CRE automation
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_decisions (
        id SERIAL PRIMARY KEY,
        decision_id VARCHAR(255) UNIQUE NOT NULL,
        property_id INTEGER NOT NULL,
        action VARCHAR(50) NOT NULL,
        adjustment_percent INTEGER DEFAULT 0,
        reason TEXT,
        confidence INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        executed_at TIMESTAMP,
        tx_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ agent_decisions table created');

    // Create yield_distributions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS yield_distributions (
        id SERIAL PRIMARY KEY,
        distribution_id VARCHAR(255) UNIQUE NOT NULL,
        property_id INTEGER NOT NULL,
        total_yield DECIMAL(20, 8) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        distribution_date TIMESTAMP,
        tx_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ yield_distributions table created');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_verifications_property_id ON verifications(property_id);
      CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);
      CREATE INDEX IF NOT EXISTS idx_payments_property_id ON payments(property_id);
      CREATE INDEX IF NOT EXISTS idx_agent_decisions_property_id ON agent_decisions(property_id);
    `);
    console.log('✓ Indexes created');

    console.log('Database schema initialized successfully!');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

initSchema()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
