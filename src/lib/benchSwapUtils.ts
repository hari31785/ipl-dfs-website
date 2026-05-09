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
 * - If captainPickId is provided and the captain was DNP, the bench replacement inherits the 2× bonus
 * 
 * @param userPicks - All draft picks for one user (7 total: 5 starters + 2 bench)
 * @param gameId - The IPL game ID to filter stats
 * @param captainPickId - Optional DraftPick.id of the player chosen as captain (gets 2× points)
 * @returns Object with active lineup, bench players, captainActivePlayerId, and captainBonusPoints
 */
export function calculateFinalLineup(userPicks: DraftPick[], gameId: string, captainPickId?: string | null) {
  // Separate starters and bench
  const starters = userPicks.filter(p => !p.isBench).sort((a, b) => a.pickOrder - b.pickOrder);
  const bench = userPicks.filter(p => p.isBench).sort((a, b) => a.pickOrder - b.pickOrder);
  
  // Track which bench players have been used and which starters were benched
  let benchIndex = 0;
  const swappedOutPlayers: any[] = [];
  const usedBenchPlayerIds = new Set<string>();
  
  // Captain tracking: if original captain was DNP, track which bench pick inherited the bonus
  // captainInheritedPickId will be set to the bench pick's id that replaced the captain
  let captainInheritedPickId: string | null = null;
  let captainWasDNP = false;
  
  // Build final lineup
  const finalLineup = starters.map(starter => {
    const starterStats = starter.player.stats.find(s => s.iplGameId === gameId);
    const isThisCaptain = captainPickId != null && starter.id === captainPickId;
    
    // If starter did not play, cascade through bench to find a player who actually played
    if (starterStats?.didNotPlay) {
      if (isThisCaptain) captainWasDNP = true;
      
      while (benchIndex < bench.length) {
        const benchPlayer = bench[benchIndex];
        benchIndex++;
        const benchStats = benchPlayer.player.stats.find(s => s.iplGameId === gameId);
        
        if (!benchStats?.didNotPlay) {
          // Found a bench player who played — use them
          usedBenchPlayerIds.add(benchPlayer.playerId);
          
          // If original captain was DNP, bench replacement inherits the captain bonus
          if (isThisCaptain) {
            captainInheritedPickId = benchPlayer.id;
          }
          
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
  
  // Determine which pick id is the active captain (original if not DNP, inherited if DNP)
  const captainActivePickId: string | null = captainPickId
    ? (captainWasDNP ? captainInheritedPickId : captainPickId)
    : null;
  
  // Apply 2× bonus to the active captain's points in the lineup
  let captainBonusPoints = 0;
  const finalLineupWithCaptain = finalLineup.map(player => {
    const isCaptainActive = captainActivePickId != null && player.id === captainActivePickId;
    if (isCaptainActive) {
      captainBonusPoints = player.points; // extra 1× on top of base points
      return { ...player, isCaptain: true, points: player.points * 2 };
    }
    return { ...player, isCaptain: false };
  });
  
  // Get unused bench players
  const unusedBench = bench.filter(b => !usedBenchPlayerIds.has(b.playerId));
  
  // Combine swapped-out starters with unused bench players
  const benchPlayers = [...swappedOutPlayers, ...unusedBench];
  
  return { finalLineup: finalLineupWithCaptain, benchPlayers, captainActivePickId, captainBonusPoints };
}

/**
 * Calculates total points for a user with bench auto-swap and optional captain 2× bonus applied
 * 
 * @param userPicks - All draft picks for one user
 * @param gameId - The IPL game ID
 * @param captainPickId - Optional DraftPick.id of the captain (gets 2× points)
 * @returns Object with totalPoints and captainBonusPoints
 */
export function calculateTotalPointsWithSwap(
  userPicks: DraftPick[],
  gameId: string,
  captainPickId?: string | null
): { totalPoints: number; captainBonusPoints: number } {
  const { finalLineup, captainBonusPoints } = calculateFinalLineup(userPicks, gameId, captainPickId);
  const totalPoints = finalLineup.reduce((total, player) => total + player.points, 0);
  return { totalPoints, captainBonusPoints };
}
