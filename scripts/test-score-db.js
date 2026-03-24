const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: '152.53.83.69',
    user: 'userhari',
    password: 'Test@2020',
    database: 'buddykhel_db_pro',
    port: 5432,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('🔍 Testing connection to external PostgreSQL database...');
    console.log('');
    
    await client.connect();
    
    console.log('✅ Connection successful!');
    console.log('');
    
    // Get list of tables
    console.log('📋 Tables in database:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    tablesResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.table_name}`);
    });
    
    console.log('');
    console.log('🔍 Looking for match/score related tables...');
    const scoreRelatedTables = tablesResult.rows.filter(row => {
      const name = row.table_name.toLowerCase();
      return name.includes('match') || name.includes('score') || 
             name.includes('player') || name.includes('stat') ||
             name.includes('game') || name.includes('ipl') ||
             name.includes('cricket');
    });
    
    if (scoreRelatedTables.length > 0) {
      console.log('');
      console.log('📊 Potential score tables found:');
      for (const row of scoreRelatedTables) {
        const tableName = row.table_name;
        console.log(`\n  Table: ${tableName}`);
        
        // Get table structure
        const columnsResult = await client.query(`
          SELECT column_name, data_type, character_maximum_length
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [tableName]);
        
        console.log('  Columns:');
        columnsResult.rows.forEach(col => {
          const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
          console.log(`    - ${col.column_name}: ${col.data_type}${length}`);
        });
        
        // Get sample data count
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        console.log(`  Rows: ${countResult.rows[0].count}`);
      }
    }
    
    await client.end();
    console.log('');
    console.log('✅ Connection test completed');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    try {
      await client.end();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

testConnection();
