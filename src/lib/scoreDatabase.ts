/**
 * External Score Database Client
 * Connects to the buddykhel_db_pro PostgreSQL database for fetching match scores
 */

import { Pool, PoolClient } from 'pg';

interface ScoreDBConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
  max?: number;
}

interface PlayerScore {
  playerId: number;
  playerName: string;
  teamName: string;
  runs: number;
  wickets: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  didNotPlay: boolean;
}

interface GameData {
  gameId: number;
  dateScheduled: Date;
  homeTeam: string;
  visitingTeam: string;
  winner: string | null;
  status: string;
  players: PlayerScore[];
}

class ScoreDatabase {
  private pool: Pool | null = null;
  private config: ScoreDBConfig;

  constructor() {
    this.config = {
      host: process.env.SCORE_DB_HOST || '',
      user: process.env.SCORE_DB_USER || '',
      password: process.env.SCORE_DB_PASSWORD || '',
      database: process.env.SCORE_DB_NAME || '',
      port: parseInt(process.env.SCORE_DB_PORT || '5432'),
      max: 10,
    };
  }

  /**
   * Check if database is configured
   */
  isConfigured(): boolean {
    return !!(
      this.config.host &&
      this.config.user &&
      this.config.password &&
      this.config.database &&
      process.env.ENABLE_SCORE_DB === 'true'
    );
  }

  /**
   * Get or create database connection pool
   */
  private getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        host: this.config.host,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        port: this.config.port,
        max: this.config.max,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }
    return this.pool;
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const pool = this.getPool();
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('Score DB connection test failed:', error);
      return false;
    }
  }

  /**
   * Get game data by game ID or external ID
   */
  async getGameData(gameId: string | number): Promise<GameData | null> {
    if (!this.isConfigured()) {
      throw new Error('Score database not configured');
    }

    try {
      const pool = this.getPool();
      
      const result = await pool.query(`
        SELECT 
          g.game_id,
          g.date_scheduled,
          ht.name as home_team,
          vt.name as visiting_team,
          wt.name as winner,
          g.status_id
        FROM game g
        LEFT JOIN team ht ON g.home_team_id = ht.team_id
        LEFT JOIN team vt ON g.visiting_team_id = vt.team_id
        LEFT JOIN team wt ON g.winner_team_id = wt.team_id
        WHERE (g.game_id = $1::bigint OR g.external_id = $1::bigint)
        AND g.is_active = true
        LIMIT 1
      `, [gameId]);

      if (result.rows.length === 0) {
        return null;
      }

      const game = result.rows[0];
      const players = await this.getPlayerScores(game.game_id);

      return {
        gameId: game.game_id,
        dateScheduled: game.date_scheduled,
        homeTeam: game.home_team,
        visitingTeam: game.visiting_team,
        winner: game.winner,
        status: game.status_id?.toString() || 'unknown',
        players
      };
    } catch (error) {
      console.error('Error fetching game data:', error);
      throw error;
    }
  }

  /**
   * Get player statistics for a game
   * 
   * We only fetch raw statistics (data field), not scores.
   * Points are calculated using OUR scoring system:
   * - Runs: 1 point per run
   * - Wickets: 20 points per wicket
   * - Catches/Run Outs/Stumpings: 5 points each
   * 
   * Point types in buddykhel DB:
   * - 45: Runs scored (data = runs)
   * - 51: Wickets (data = count)
   * - 57: Catches (data = count)
   * - 58: Run outs (data = count)
   * - 61: Stumpings (data = count)
   */
  async getPlayerScores(gameId: number): Promise<PlayerScore[]> {
    if (!this.isConfigured()) {
      throw new Error('Score database not configured');
    }

    try {
      const pool = this.getPool();
      
      const result = await pool.query(`
        SELECT 
          p.player_id,
          p.full_name as player_name,
          t.name as team_name,
          MAX(CASE WHEN si.point_type_id = 45 THEN si.data::numeric ELSE 0 END) as runs,
          MAX(CASE WHEN si.point_type_id = 51 THEN si.data::numeric ELSE 0 END) as wickets,
          MAX(CASE WHEN si.point_type_id = 57 THEN si.data::numeric ELSE 0 END) as catches,
          MAX(CASE WHEN si.point_type_id = 58 THEN si.data::numeric ELSE 0 END) as run_outs,
          MAX(CASE WHEN si.point_type_id = 61 THEN si.data::numeric ELSE 0 END) as stumpings,
          COUNT(DISTINCT si.point_type_id) as has_stats
        FROM score_info si
        JOIN player p ON si.player_id = p.player_id
        LEFT JOIN player_series ps ON p.player_id = ps.player_id AND ps.is_active = true
        LEFT JOIN team t ON ps.team_id = t.team_id
        WHERE si.game_id = $1::bigint
        AND si.is_active = true
        GROUP BY p.player_id, p.full_name, t.name
        ORDER BY runs DESC, wickets DESC
      `, [gameId]);

      return result.rows.map(row => ({
        playerId: parseInt(row.player_id),
        playerName: row.player_name,
        teamName: row.team_name || 'Unknown',
        runs: parseFloat(row.runs) || 0,
        wickets: parseFloat(row.wickets) || 0,
        catches: parseFloat(row.catches) || 0,
        runOuts: parseFloat(row.run_outs) || 0,
        stumpings: parseFloat(row.stumpings) || 0,
        didNotPlay: parseInt(row.has_stats) === 0
      }));
    } catch (error) {
      console.error('Error fetching player scores:', error);
      throw error;
    }
  }

  /**
   * Get all tables in the database (for exploration)
   */
  async getTables(): Promise<string[]> {
    if (!this.isConfigured()) {
      throw new Error('Score database not configured');
    }

    try {
      const pool = this.getPool();
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      return result.rows.map(row => row.table_name);
    } catch (error) {
      console.error('Error fetching tables:', error);
      throw error;
    }
  }

  /**
   * Get table structure (for exploration)
   */
  async getTableStructure(tableName: string): Promise<any[]> {
    if (!this.isConfigured()) {
      throw new Error('Score database not configured');
    }

    try {
      const pool = this.getPool();
      const result = await pool.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching table structure:', error);
      throw error;
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Export singleton instance
export const scoreDB = new ScoreDatabase();
