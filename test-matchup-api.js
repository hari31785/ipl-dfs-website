fetch('http://localhost:3000/api/draft/cmn6tlaod000i6ixlvh59ls9t')
  .then(res => res.json())
  .then(data => {
    console.log('Has matchup:', !!data.matchup);
    if (data.matchup) {
      console.log('Game ID:', data.matchup.contest.iplGame.id);
      console.log('Game Title:', data.matchup.contest.iplGame.title);
      console.log('Total draft picks:', data.matchup.draftPicks.length);
      
      console.log('\nChecking each pick:');
      data.matchup.draftPicks.slice(0, 3).forEach((pick, i) => {
        console.log(`Pick ${i + 1}:`, pick.player.name);
        console.log('  Player ID:', pick.playerId);
        console.log('  Stats:', pick.player.stats);
      });
    } else {
      console.log('Error:', data);
    }
  })
  .catch(err => console.error('Error:', err));
