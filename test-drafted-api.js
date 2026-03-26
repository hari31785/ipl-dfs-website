// Test the drafted players API
const gameId = 'cmn6t9rta0001si8p8h5bc5ci'; // MI v RCB game

fetch(`http://localhost:3000/api/admin/games/${gameId}/drafted-players`)
  .then(response => response.json())
  .then(data => {
    console.log('API Response:', data);
    console.log('Player IDs count:', data.playerIds ? data.playerIds.length : 0);
    console.log('Player IDs:', data.playerIds);
  })
  .catch(error => console.error('Error:', error));
