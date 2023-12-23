const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'cricketMatchDetails.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const convertPlayerObjectToResponseObject = playerObject => {
  return {
    playerId: playerObject.player_id,
    playerName: playerObject.player_name,
  }
}

const convertMatchObjectToResponseObject = matchObject => {
  return {
    matchId: matchObject.match_id,
    match: matchObject.match,
    year: matchObject.year,
  }
}

// Get players API

app.get('/players/', async (request, response) => {
  const getPlayersQuery = `
    SELECT *
    FROM player_details
    ORDER BY 
    player_id;`

  const playersArray = await db.all(getPlayersQuery)
  response.send(
    playersArray.map(eachPlayer =>
      convertPlayerObjectToResponseObject(eachPlayer),
    ),
  )
})

// Get player withId API

app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const getPlayerQuery = `
    SELECT 
    * 
    FROM 
    player_details
    WHERE 
    player_id = ${playerId};`
  const newPlayer = await db.get(getPlayerQuery)
  response.send(convertPlayerObjectToResponseObject(newPlayer))
})

// Put player API

app.put('/players/:playerId/', async (request, response) => {
  const {playerName} = request.body
  const {playerId} = request.params
  const updatePlayerQuery = `
  UPDATE
    player_details
  SET
    player_name = "${playerName}"
  WHERE
    player_id = ${playerId};`

  await db.run(updatePlayerQuery)
  response.send('Player Details Updated')
})

// Get match withId API

app.get('/matches/:matchId/', async (request, response) => {
  const {matchId} = request.params
  const getMatchQuery = `
    SELECT 
    * 
    FROM 
    match_details
    WHERE 
    match_id = ${matchId};`
  const newMatch = await db.get(getMatchQuery)
  response.send(convertMatchObjectToResponseObject(newMatch))
})

// Get matches with playerId API

app.get('/players/:playerId/matches', async (request, response) => {
  const {playerId} = request.params
  const getMatchQuery = `
    SELECT 
     match_id, match, year
    FROM 
    match_details NATURAL JOIN player_match_score
    WHERE 
    player_id = ${playerId};`
  const matchArray = await db.all(getMatchQuery)
  response.send(
    matchArray.map(eachMatch => convertMatchObjectToResponseObject(eachMatch)),
  )
})

// Get Players with matchId API

app.get('/matches/:matchId/players', async (request, response) => {
  const {matchId} = request.params
  const getPlayerQuery = `
    SELECT 
     player_id, player_name
    FROM 
    player_details NATURAL JOIN player_match_score
    WHERE 
    match_id = ${matchId};`
  const playerArray = await db.all(getPlayerQuery)
  response.send(
    playerArray.map(eachPlayer =>
      convertPlayerObjectToResponseObject(eachPlayer),
    ),
  )
})

// Get Player Details with playerId API

app.get('/players/:playerId/playerScores', async (request, response) => {
  const {playerId} = request.params
  const getPlayerQuery = `
    SELECT 
     player_id,
     player_name,
     SUM(score),
     SUM(fours),
     SUM(sixes)
    FROM 
    player_details NATURAL JOIN player_match_score
    WHERE 
    player_id = ${playerId}
    GROUP BY
    player_id;`
  const playerDetails = await db.get(getPlayerQuery)
  response.send({
    playerId: playerDetails['player_id'],
    playerName: playerDetails['player_name'],
    totalScore: playerDetails['SUM(score)'],
    totalFours: playerDetails['SUM(fours)'],
    totalSixes: playerDetails['SUM(sixes)'],
  })
})

module.exports = app
