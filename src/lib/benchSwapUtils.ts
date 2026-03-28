// Utility functions for bench player auto-swap logic

interface PlayerStats {
  iplGameId: string;
  didNotPlay: boolean;
  points: number;
}

interface DraftPick {
  id: string;
  playerId: string;
  pickOrder: number;
  isBench: boolean;
  player: {
    id: string;
    name: string;
    stats: PlayerStats[];
  };
}

/**
 * Calculates the final lineup with bench auto-swap logic
 * 
 * Rules:
 * - Picks 1-10 are starting players (5 per user in snake draft)
 * - Picks 11-14 are bench players (2 per user)
 * - If a starter has didNotPlay=true, swap with first available bench player
 * - If two starters are DNP, use both bench players in order
 * 
 * @param userPicks - All draft picks for one user (7 total: 5 starters + 2 bench)
 * @param gameId - The IPL game ID to filter stats
 * @returns Object with active lineup and bench players (including swapped-out starters)
 */
export function calculateFinalLineup(userPicks: DraftPick[], gameId: string) {
  // Separate starters and bench
  const starters = userPicks.filter(p => !p.isBench).sort((a, b) => a.pickOrder - b.pickOrder);
  const bench = userPicks.filter(p => p.isBench).sort((a, b) => a.pickOrder - b.pickOrder);
  
  // Track which bench players have been used and which starters were benched
  let benchIndex = 0;
  const swappedOutPlayers: any[] = [];
  const usedBenchPlayerIds = new Set<string>();
  
  // Build final lineup
  const finalLineup = starters.map(starter => {
    const starterStats = starter.player.stats.find(s => s.iplGameId === gameId);
    
    // If starter did not play, cascade through bench to find a player who actually played
    if (starterStats?.didNotPlay) {
      while (benchIndex < bench.length) {
        const benchPlayer = bench[benchIndex];
        benchIndex++;
        const benchStats = benchPlayer.player.stats.find(s => s.iplGameId === gameId);
        
        if (!benchStats?.didNotPlay) {
          // Found a bench player who played — use them
          usedBenchPlayerIds.add(benchPlayer.playerId);
          
          swappedOutPlayers.push({
            ...starter,
            swappedOut: true,
            replacedBy: benchPlayer.player.name,
            points: starterStats?.points || 0
          });
          
          return {
            ...benchPlayer,
            swappedFor: starter.player.name,
            isSwapped: true,
            points: benchStats?.points || 0
          };
        }
        // else: this bench player is also DNP — skip and try next bench player
      }
      
      // All bench players exhausted or all DNP — starter stays with 0 points
      swappedOutPlayers.push({
        ...starter,
        swappedOut: true,
        replacedBy: null,
        points: 0
      });
      return {
        ...starter,
        isSwapped: false,
        points: 0
      };
    }
    
    // Use starter normally
    return {
      ...starter,
      isSwapped: false,
      points: starterStats?.points || 0
    };
  });
  
  // Get unused bench players
  const unusedBench = bench.filter(b => !usedBenchPlayerIds.has(b.playerId));
  
  // Combine swapped-out starters with unused bench players
  const benchPlayers = [...swappedOutPlayers, ...unusedBench];
  
  return { finalLineup, benchPlayers };
}

/**
 * Calculates total points for a user with bench auto-swap applied
 * 
 * @param userPicks - All draft picks for one user
 * @param gameId - The IPL game ID
 * @returns Total points after applying bench swaps
 */
export function calculateTotalPointsWithSwap(userPicks: DraftPick[], gameId: string): number {
  const { finalLineup } = calculateFinalLineup(userPicks, gameId);
  return finalLineup.reduce((total, player) => total + player.points, 0);
}
