import { NextRequest, NextResponse } from 'next/server';
import { scoreDB } from '@/lib/scoreDatabase';

/**
 * GET /api/admin/score-db/explore
 * Explore the external score database schema
 */
export async function GET(request: NextRequest) {
  try {
    if (!scoreDB.isConfigured()) {
      return NextResponse.json(
        { error: 'Score database not configured. Check environment variables.' },
        { status: 503 }
      );
    }

    // Test connection
    const isConnected = await scoreDB.testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Unable to connect to score database. Check credentials and network access.' },
        { status: 503 }
      );
    }

    // Get all tables
    const tables = await scoreDB.getTables();

    // Filter score-related tables
    const scoreRelatedTables = tables.filter(table => {
      const name = table.toLowerCase();
      return name.includes('match') || name.includes('score') || 
             name.includes('player') || name.includes('stat') ||
             name.includes('game') || name.includes('ipl') ||
             name.includes('cricket');
    });

    // Get structure of relevant tables
    const tableStructures: Record<string, any> = {};
    
    for (const table of scoreRelatedTables.slice(0, 10)) { // Limit to first 10 tables
      try {
        const structure = await scoreDB.getTableStructure(table);
        tableStructures[table] = structure;
      } catch (error) {
        console.error(`Error fetching structure for ${table}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      connected: true,
      database: process.env.SCORE_DB_NAME,
      totalTables: tables.length,
      allTables: tables,
      scoreRelatedTables,
      tableStructures,
    });

  } catch (error: any) {
    console.error('Error exploring score database:', error);
    return NextResponse.json(
      { 
        error: 'Failed to explore database',
        message: error.message,
        code: error.code 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/score-db/explore
 * Test query on specific table
 */
export async function POST(request: NextRequest) {
  try {
    const { tableName, limit = 5 } = await request.json();

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    if (!scoreDB.isConfigured()) {
      return NextResponse.json(
        { error: 'Score database not configured' },
        { status: 503 }
      );
    }

    // Get table structure
    const structure = await scoreDB.getTableStructure(tableName);

    // Get sample data
    const pool = (scoreDB as any).getPool();
    const [rows] = await pool.query(
      `SELECT * FROM ${tableName} LIMIT ?`,
      [limit]
    );

    return NextResponse.json({
      success: true,
      tableName,
      structure,
      sampleData: rows,
      rowCount: (rows as any[]).length
    });

  } catch (error: any) {
    console.error('Error querying table:', error);
    return NextResponse.json(
      { 
        error: 'Failed to query table',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
