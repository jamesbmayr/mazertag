/*** modules ***/
	if (!CORE) { var CORE = require("../node/core") }
	if (!SESSION) { var SESSION = require("../node/session") }
	module.exports = {}

/*** constants ***/
	var CONSTANTS = CORE.getAsset("constants")

/*** creates ***/
	/* createOne */
		module.exports.createOne = createOne
		function createOne(REQUEST, callback) {
			try {
				// create
					var player = CORE.getSchema("player")
						player.sessionId = REQUEST.session.id
						player.name = "PLAYER1"

					var game = CORE.getSchema("game")
						game.players[player.id] = player

				// query
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "insert"
						query.document = game

				// insert
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							callback(results)
							return
						}

						// update session
							REQUEST.updateSession = {
								playerId: player.id,
								gameId: game.id
							}
							SESSION.updateOne(REQUEST, null, function() {
								// redirect
									callback({success: true, message: "game created", location: "../game/" + game.id})
							})
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* joinOne */
		module.exports.joinOne = joinOne
		function joinOne(REQUEST, callback) {
			try {
				// validate
					if (!REQUEST.post.gameId || REQUEST.post.gameId.length !== CONSTANTS.gameIdLength || !CORE.isNumLet(REQUEST.post.gameId)) {
						callback({success: false, message: "gameId must be " + CONSTANTS.gameIdLength + " letters and numbers"})
						return
					}

				// query
					REQUEST.post.gameId = REQUEST.post.gameId.toLowerCase()
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "find"
						query.filters = {id: REQUEST.post.gameId}

				// find
					CORE.accessDatabase(query, function(results) {
						// not found
							if (!results.success) {
								callback({success: false, message: "no game found"})
								return
							}

						// already a player?
							var game = results.documents[0]
							var playerKeys = Object.keys(game.players)
							if (playerKeys.find(function(p) { return game.players[p].sessionId == REQUEST.session.id })) {
								callback({success: true, message: "re-joining game", location: "../game/" + game.id})
								return
							}

						// already started
							if (game.status && game.status.startTime) {
								callback({success: false, message: "game already started"})
								return
							}

						// already ended
							if (game.status && game.status.endTime) {
								callback({success: false, message: "already ended"})
								return
							}

						// player count
							if (playerKeys.length >= CONSTANTS.maximumPlayers) {
								callback({success: false, message: "maximum player count reached"})
								return
							}

						// create player
							var player = CORE.getSchema("player")
								player.sessionId = REQUEST.session.id

						// name
							var i = 1
							var name = ""
							do {
								name = "PLAYER" + i
								i++
							} while (playerKeys.find(function(k) { return game.players[k].name == name }))
							player.name = name

						// add to game
							game.players[player.id] = player

						// query
							game.updated = new Date().getTime()
							var query = CORE.getSchema("query")
								query.collection = "games"
								query.command = "update"
								query.filters = {id: game.id}
								query.document = game

						// update
							CORE.accessDatabase(query, function(results) {
								if (!results.success) {
									callback(results)
									return
								}

								// update session
									REQUEST.updateSession = {
										playerId: player.id,
										gameId: game.id
									}
									SESSION.updateOne(REQUEST, null, function() {
										// redirect
											callback({success: true, message: "game joined", location: "../game/" + game.id})
									})
							})
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

/*** reads ***/
	/* readOne */
		module.exports.readOne = readOne
		function readOne(REQUEST, callback) {
			try {
				// game id
					var gameId = REQUEST.path[REQUEST.path.length - 1]

				// query
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "find"
						query.filters = {id: gameId}

				// find
					CORE.accessDatabase(query, function(results) {
						// not found
							if (!results.success) {
								callback({gameId: gameId, success: false, message: "no game found", location: "../../../../", recipients: [REQUEST.session.id]})
								return
							}

						// get player id
							var game = results.documents[0]
							var playerId = null
							if (Object.keys(game.players).length) {
								playerId = Object.keys(game.players).find(function(p) {
									return game.players[p].sessionId == REQUEST.session.id
								})
							}

						// new player --> send full game
							if (playerId) {
								callback({gameId: game.id, success: true, message: null, playerId: playerId, launch: (game.status.startTime ? true : false), game: game, audio: CORE.getAsset("audio"), recipients: [REQUEST.session.id]})
								return
							}

						// existing spectator
							if (game.spectators[REQUEST.session.id]) {
								callback({gameId: game.id, success: true, message: "now observing the game", playerId: null, launch: (game.status.startTime ? true : false), game: game, audio: CORE.getAsset("audio"), recipients: [REQUEST.session.id]})
								return
							}

						// new spectator
							if (!game.spectators[REQUEST.session.id]) {
								// add spectator
									game.spectators[REQUEST.session.id] = true

								// query
									game.updated = new Date().getTime()
									var query = CORE.getSchema("query")
										query.collection = "games"
										query.command = "update"
										query.filters = {id: game.id}
										query.document = {updated: game.updated, spectators: game.spectators}

								// update
									CORE.accessDatabase(query, function(results) {
										if (!results.success) {
											results.gameId = game.id
											callback(results)
											return
										}

										// for this spectator
											callback({gameId: game.id, success: true, message: "now observing the game", playerId: null, launch: (game.status.startTime ? true : false), game: game, audio: CORE.getAsset("audio"), recipients: [REQUEST.session.id]})
									})
							}
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({gameId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

/*** updates ***/
	/* updateOne */
		module.exports.updateOne = updateOne
		function updateOne(REQUEST, callback) {
			try {
				// game id
					var gameId = REQUEST.path[REQUEST.path.length - 1]
					if (!gameId || gameId.length !== CONSTANTS.gameIdLength) {
						callback({gameId: gameId, success: false, message: "invalid game id", recipients: [REQUEST.session.id]})
						return
					}

				// player id
					if (!REQUEST.post || !REQUEST.post.playerId) {
						callback({gameId: gameId, success: false, message: "invalid player id", recipients: [REQUEST.session.id]})
						return
					}

				// action
					if (!REQUEST.post || !REQUEST.post.action || !["liftKey", "pressKey", "updateOption", "launchGame"].includes(REQUEST.post.action)) {
						callback({gameId: gameId, success: false, message: "invalid action", recipients: [REQUEST.session.id]})
						return
					}

				// no key
					if (["liftKey", "pressKey"].includes(REQUEST.post.action) && !REQUEST.post.key) {
						callback({gameId: gameId, success: false, message: "invalid key", recipients: [REQUEST.session.id]})
						return
					}

				// no option
					if ("updateOption" == REQUEST.post.action && (!REQUEST.post.section || !REQUEST.post.field || REQUEST.post.value == undefined)) {
						callback({gameId: gameId, success: false, message: "missing option data", recipients: [REQUEST.session.id]})
						return
					}

				// query
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "find"
						query.filters = {id: gameId}

				// find
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							callback({gameId: gameId, success: false, message: "game ended", recipients: [REQUEST.session.id]})
							return
						}

						// not a player?
							var game = results.documents[0]
							var player = game.players[REQUEST.post.playerId] || null
							if (!player) {
								callback({gameId: gameId, success: false, message: "not a player", recipients: [REQUEST.session.id]})
								return
							}

						// already ended?
							if (game.status && game.status.endTime) {
								callback({gameId: gameId, success: false, message: "game ended", recipients: [REQUEST.session.id]})
								return
							}

						// option
							if ("updateOption" == REQUEST.post.action) {
								updatePlayer(REQUEST, game, player, callback)
								return
							}

						// start game
							if ("launchGame" == REQUEST.post.action) {
								updateLaunch(REQUEST, game, callback)
								return
							}

						// keys
							updateKeys(REQUEST, game, player, callback)
							return
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({gameId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* updatePlayer */
		module.exports.updatePlayer = updatePlayer
		function updatePlayer(REQUEST, game, player, callback) {
			try {
				// already started?
					if (game.status && game.status.startTime) {
						callback({gameId: gameId, success: false, message: "game already started", recipients: [REQUEST.session.id]})
						return
					}

				// update game field
					if (REQUEST.post.section == "game") {
						if (!Object.keys(game.setup).includes(REQUEST.post.field)) {
							callback({gameId: gameId, success: false, message: "invalid game setup parameter", recipients: [REQUEST.session.id]})
							return
						}

						if (!CORE.getAsset("mapSetup")[REQUEST.post.field].find(function(option) { return option.value == REQUEST.post.value })) {
							callback({gameId: gameId, success: false, message: "invalid value for " + REQUEST.post.field, recipients: [REQUEST.session.id]})
							return
						}

						game.setup[REQUEST.post.field] = REQUEST.post.value
					}

				// update player field
					else if (REQUEST.post.section == "player") {
						// name
							if (REQUEST.post.field == "name") {
								if (!REQUEST.post.value || REQUEST.post.value.length < [CONSTANTS.minimumNameLength] || REQUEST.post.value.length > CONSTANTS.maximumNameLength || !CORE.isNumLet(REQUEST.post.value)) {
									callback({gameId: gameId, success: false, message: "name must be " + CONSTANTS.minimumNameLength + " - " + CONSTANTS.maximumNameLength + " letters and numbers", recipients: [REQUEST.session.id]})
									return
								}

								var names = Object.keys(game.players).map(function(p) { return game.players[p].name }) || []
								if (names.includes(REQUEST.post.value.toUpperCase())) {
									callback({gameId: gameId, success: false, message: "name already taken", recipients: [REQUEST.session.id]})
									return
								}

								player.name = REQUEST.post.value.toUpperCase()
							}

						// team
							else if (REQUEST.post.field == "team") {
								if (!CONSTANTS.teams.includes(REQUEST.post.value)) {
									callback({gameId: gameId, success: false, message: "invalid team", recipients: [REQUEST.session.id]})
									return
								}

								player.status.team = REQUEST.post.value
							}

						// statistic
							else if (Object.keys(player.setup).includes(REQUEST.post.field)) {
								var value = Number(REQUEST.post.value)
								if (value < CONSTANTS.minimumStatisticValue || value > CONSTANTS.maximumStatisticValue) {
									callback({gameId: gameId, success: false, message: "invalid statistic boundary", recipients: [REQUEST.session.id]})
									return
								}

								var beforeValue = player.setup[REQUEST.post.field]
								player.setup[REQUEST.post.field] = REQUEST.post.value

								var total = 0
								for (var i in player.setup) {
									total += Number(player.setup[i])
								}
								if (total > CONSTANTS.maximumTotalStatisticValue) {
									player.setup[REQUEST.post.field] = beforeValue
									callback({gameId: gameId, success: false, message: "statistic total cannot exceed " + CONSTANTS.maximumTotalStatisticValue, recipients: [REQUEST.session.id]})
									return
								}
							}

						// other
							else {
								callback({gameId: gameId, success: false, message: "invalid player setup parameter", recipients: [REQUEST.session.id]})
								return
							}
					}

				// query
					game.updated = new Date().getTime()
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "update"
						query.filters = {id: game.id}
						query.document = game

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							results.gameId = game.id
							callback(results)
							return
						}
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({gameId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* updateLaunch */
		module.exports.updateLaunch = updateLaunch
		function updateLaunch(REQUEST, game, callback) {
			try {
				// already started?
					if (game.status && game.status.startTime) {
						callback({gameId: gameId, success: false, message: "game already started", recipients: [REQUEST.session.id]})
						return
					}

				// not enough players
					if (Object.keys(game.players).length < CONSTANTS.minimumPlayers) {
						callback({gameId: gameId, success: false, message: "game requires at least " + CONSTANTS.minimumPlayers + " players", recipients: [REQUEST.session.id]})
						return
					}

				// too many players
					if (Object.keys(game.players).length > CONSTANTS.maximumPlayers) {
						callback({gameId: gameId, success: false, message: "game cannot have more than " + CONSTANTS.maximumPlayers + " players", recipients: [REQUEST.session.id]})
						return
					}

				// create from setup
					var roomsXY = game.setup.size.split(",")
						game.map.options.rooms.x = Number(roomsXY[0])
						game.map.options.rooms.y = Number(roomsXY[1])
					game.map.options.window.count = Number(game.setup.windows)
					game.map.options.mirror.count = Number(game.setup.mirrors)
					game.map.options.teleporter.count = Number(game.setup.teleporters)
					game.map.options.obstacle.count = Number(game.setup.obstacles)
					game.status.mode = game.setup.mode

				// create map
					game = createMap(game)

				// set time
					game.status.timeRemaining = Number(game.setup.time) + CONSTANTS.gameLaunchDelay

				// setup players
					var colors = CORE.getAsset("colors")
					for (var i in game.players) {
						var thatPlayer = game.players[i]

						// team
							var teamSpawner = game.items.find(function(item) { return item.team == thatPlayer.status.team }) || null
							thatPlayer.options.color = colors["medium-" + thatPlayer.status.team]
							thatPlayer.status.position.x = teamSpawner ? teamSpawner.position.x : (game.map.options.cells.x / 2 * game.map.options.cellsize)
							thatPlayer.status.position.y = teamSpawner ? teamSpawner.position.y : (game.map.options.cells.y / 2 * game.map.options.cellsize)

						// speed
							thatPlayer.options.friction               = thatPlayer.options.friction[Number(thatPlayer.setup.speed)]
							thatPlayer.options.maximumVelocity        = thatPlayer.options.maximumVelocity[Number(thatPlayer.setup.speed)]
							thatPlayer.options.acceleration           = thatPlayer.options.acceleration[Number(thatPlayer.setup.speed)]

						// strength
							thatPlayer.options.bump                   = thatPlayer.options.bump[Number(thatPlayer.setup.strength)]

						// laser
							thatPlayer.options.laserEnergy            = thatPlayer.options.laserEnergy[Number(thatPlayer.setup.laser)]
							thatPlayer.options.laserDissipation       = thatPlayer.options.laserDissipation[Number(thatPlayer.setup.laser)]

						// recovery
							thatPlayer.options.energyRecharge         = thatPlayer.options.energyRecharge[Number(thatPlayer.setup.recovery)]

						// vision
							thatPlayer.options.visibility             = thatPlayer.options.visibility[Number(thatPlayer.setup.vision)]
					}

				// game mode: classic_tag
					if (game.status.mode == "classic_tag") {
						// 1 player is It
						// that player cannot be killed
						var itKey = CORE.chooseRandom(Object.keys(game.players))
						game.players[itKey].status.isIt = true
						game.players[itKey].options.minimumEnergyFromDamage = game.players[itKey].options.minimumEnergyForLaser
					}

				// game mode: capture_the_hat
					if (game.status.mode == "capture_the_hat") {
						// create 1 orb
						var cell = CORE.chooseRandom(game.map.spaceCells)
						game.items.push({
							id: CORE.generateRandom(),
							type: "orb",
							options: game.map.options.orb,
							position: {
								x: Number(cell.split(",")[0]) * game.map.options.cellsize,
								y: Number(cell.split(",")[1]) * game.map.options.cellsize
							}
						})
					}

				// game mode: team_battle
					if (game.status.mode == "team_battle") {
						// track kills per team
						game.status.kills = {}
						for (var i in CONSTANTS.teams) {
							game.status.kills[CONSTANTS.teams[i]] = 0
						}
					}

				// game mode: collect_the_orbs
					if (game.status.mode == "collect_the_orbs") {
						// track orbs per team
						game.status.orbs = {}
						for (var i in CONSTANTS.teams) {
							game.status.orbs[CONSTANTS.teams[i]] = 0
						}
					}

				// actually start
					game.status.startTime = new Date().getTime() + CONSTANTS.gameLaunchDelay

				// query
					game.updated = new Date().getTime()
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "update"
						query.filters = {id: game.id}
						query.document = game

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							results.gameId = game.id
							callback(results)
							return
						}

						// recipients
							var recipients = []
							for (var i in game.players) {
								recipients.push(game.players[i].sessionId)
							}
							for (var i in game.spectators) {
								recipients.push(i)
							}

						// send game data to everyone
							callback({gameId: game.id, success: true, launch: true, message: "game launched!", game: game, recipients: recipients})
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({gameId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* updateKeys */
		module.exports.updateKeys = updateKeys
		function updateKeys(REQUEST, game, player, callback) {
			try {
				// not started
					if (!game.status || !game.status.startTime || new Date().getTime() < game.status.startTime) {
						return
					}

				// invalid
					var key = REQUEST.post.key.toLowerCase()
					if (!CONSTANTS.keys.includes(key)) {
						callback({gameId: gameId, success: false, message: "unable to process key action: " + key, recipients: [REQUEST.session.id]})
						return
					}

				// update key
					player.keys[key] = (REQUEST.post.action == "pressKey") ? true : false

				// query
					game.updated = new Date().getTime()
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "update"
						query.filters = {id: game.id}
						query.document = game

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							results.gameId = game.id
							callback(results)
							return
						}
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({gameId: REQUEST.path[REQUEST.path.length - 1], success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

/*** deletes ***/
	/* deleteOne */
		module.exports.deleteOne = deleteOne
		function deleteOne(gameId) {
			try {
				// game id
					if (!gameId || gameId.length !== CONSTANTS.gameIdLength) {
						return
					}

				// query
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "delete"
						query.filters = {id: gameId}

				// find
					CORE.accessDatabase(query, function(results) {
						return
					})
			}
			catch (error) {
				CORE.logError(error)
			}
		}

/*** tools ***/
	/* getDistance */
		module.exports.getDistance = getDistance
		function getDistance(pointA, pointB) {
			try {
				// calculate
					return getTriangleSide(pointA.x - pointB.x, pointA.y - pointB.y, null)
			}
			catch (error) {
				CORE.logError(error)
				return null
			}
		}

	/* getTriangleSide */
		module.exports.getTriangleSide = getTriangleSide
		function getTriangleSide(a, b, c) {
			try {
				// missing hypotenuse (get scalar)
					if (!c) {
						return Math.pow(Math.pow(a, 2) + Math.pow(b, 2), 0.5)
					}

				// missing side
					else if (!a || !b) {
						return Math.pow(Math.pow(c, 2) - Math.pow(a || b, 2), 0.5)
					}

				// all three present?
					else {
						return null
					}
			}
			catch (error) {
				CORE.logError(error)
				return null
			}
		}

	/* getAltitude */
		module.exports.getAltitude = getAltitude
		function getAltitude(lineLength, diagonal1, diagonal2) {
			try {
				// Heron's formula for area of a triangle:
				// A = Math.pow( (a + b + c) * (-a + b + c) * (a + -b + c) * (a + b + -c) , 0.5) / 4

				// regular formula for area of a triangle:
				// A = altitude * base / 2

				// thus
				// altitude = Math.pow( (a + b + c) * (-a + b + c) * (a + -b + c) * (a + b + -c) , 0.5) / 4 * 2 / base
				// altitude = Math.pow( (a + b + c) * (-a + b + c) * (a + -b + c) * (a + b + -c) , 0.5) / 2 / base
				return Math.pow( (lineLength + diagonal1 + diagonal2) * (-lineLength + diagonal1 + diagonal2) * (lineLength + -diagonal1 + diagonal2) * (lineLength + diagonal1 + -diagonal2) , 0.5) / 2 / lineLength
			}
			catch (error) {
				CORE.logError(error)
				return null
			}
		}

	/* getSlope */
		module.exports.getSlope = getSlope
		function getSlope(pointA, pointB) {
			try {
				return (pointB.y - pointA.y) / (pointB.x - pointA.x)
			}
			catch (error) {
				CORE.logError(error)
				return null
			}
		}
 
	/* getReflection */
		module.exports.getReflection = getReflection
		function getReflection(laserA, mirrorA) {
			try {
				// calculate
					return Math.round((((2 * mirrorA - laserA) + CONSTANTS.circleDegrees) % CONSTANTS.circleDegrees) * CONSTANTS.rounding) / CONSTANTS.rounding
			}
			catch (error) {
				CORE.logError(error)
				return laserA
			}
		}

	/* getCellCorners */
		module.exports.getCellCorners = getCellCorners
		function getCellCorners(cellX, cellY, cellsize) {
			try {
				// get components
					var centerX = cellX * cellsize
					var centerY = cellY * cellsize
					var halfCell = cellsize / 2

				// get corners
					return {
						topLeft: {
							x: centerX - halfCell,
							y: centerY + halfCell
						},
						topRight: {
							x: centerX + halfCell,
							y: centerY + halfCell
						},
						bottomRight: {
							x: centerX + halfCell,
							y: centerY - halfCell
						},
						bottomLeft: {
							x: centerX - halfCell,
							y: centerY - halfCell
						}
					}
			}
			catch (error) {
				CORE.logError(error)
				return null
			}
		}

	/* getOverlap */
		module.exports.getOverlap = getOverlap
		function getOverlap(object1, object2) {
			try {
				// circle - circle
					if (object1.type == "circle" && object2.type == "circle") {
						// get distances
							var distance = getDistance(object1, object2)
								var distanceX = object2.x - object1.x
								var distanceY = object2.y - object1.y
							var overlap = (object1.radius + object2.radius) - distance

						// get angle
							var angle = (Math.atan2(distanceY, distanceX) / CONSTANTS.radiansConversion + CONSTANTS.circleDegrees) % CONSTANTS.circleDegrees

						// return
							return {
								collision: Boolean(overlap > 0),
								d: overlap,
								x: Math.abs(distanceX),
								y: Math.abs(distanceY),
								a: angle
							}
					}

				// circle - line
					if (object1.type == "circle" && object2.type == "line") {
						// get lines
							var lineLength = getDistance(object2.point1, object2.point2)
							var diagonal1 = getDistance(object1, object2.point1)
							var diagonal2 = getDistance(object1, object2.point2)

						// get altitude of triangle
							var altitude = getAltitude(lineLength, diagonal1, diagonal2)

						// get intersection point
							var lineSlope = getSlope(object2.point1, object2.point2)
							var segment1 = getTriangleSide(altitude, null, diagonal1)
							var segment2 = getTriangleSide(altitude, null, diagonal2)
							var intersectionX = (Math.abs(lineSlope) == Infinity) ? object2.point1.x :
												(Math.abs(lineSlope) == 0) ? object1.x :
												( (segment1 * object2.point2.x) + (segment2 * object2.point1.x) ) / (segment1 + segment2)
							var intersectionY = (Math.abs(lineSlope) == Infinity) ? object1.y :
												(Math.abs(lineSlope) == 0) ? object2.point1.y :
												(lineSlope * intersectionX + (object2.point1.y - object2.point1.x * lineSlope))

						// get overlap
							var distance = getDistance(object1, {x: intersectionX, y: intersectionY})
							var overlap = object1.radius - distance

						// collision?
							var collision = Boolean((overlap > 0)
							 && ((object2.point1.x <= intersectionX && intersectionX <= object2.point2.x) || (object2.point2.x <= intersectionX && intersectionX <= object2.point1.x))
							 && ((object2.point1.y <= intersectionY && intersectionY <= object2.point2.y) || (object2.point2.y <= intersectionY && intersectionY <= object2.point1.y))
							)

						// return
							return {
								collision: collision,
								d: overlap,
								x: intersectionX,
								y: intersectionY
							}
					}

				// circle - rectangle
					if (object1.type == "circle" && object2.type == "rectangle") {
						// get each side
							return {
								top:    getOverlap(object1, {type: "line", point1: object2.topLeft,     point2: object2.topRight}),
								right:  getOverlap(object1, {type: "line", point1: object2.topRight,    point2: object2.bottomRight}),
								bottom: getOverlap(object1, {type: "line", point1: object2.bottomRight, point2: object2.bottomLeft}),
								left:   getOverlap(object1, {type: "line", point1: object2.bottomLeft,  point2: object2.topLeft})
							}
					}

				// line - line
					if (object1.type == "line" && object2.type == "line") {
						// slopes
							var line1Slope = getSlope(object1.point1, object1.point2)
							var line2Slope = getSlope(object2.point1, object2.point2)

						// parallel?
							if (line1Slope == line2Slope || (Math.abs(line1Slope) == Infinity && Math.abs(line2Slope) == Infinity)) {
								return {
									collision: false,
									d: null,
									x: null,
									y: null
								}
							}

						// intersection
							if (Math.abs(line1Slope) == Infinity) { // vertical laser
								var intersectionX = object1.point1.x
							}
							else if (Math.abs(line2Slope) == Infinity) { // vertical wall
								var intersectionX = object2.point1.x
							}
							else if (Math.abs(line2Slope) == 0) { // horizontal wall
								var intersectionY = object2.point1.y
								var intersectionX = (intersectionY - object1.point1.y) / line1Slope + object1.point1.x
							}
							else {
								var intersectionX = ((object1.point1.x * line1Slope) - (object2.point1.x * line2Slope)) / (line1Slope - line2Slope)
							}

							if (Math.abs(line1Slope) == Infinity) { // vertical laser
								var intersectionY = line2Slope * (intersectionX - object2.point1.x) + object2.point1.y
							}
							else if (Math.abs(line2Slope) !== 0) { // everything except horizontal wall
								var intersectionY = line1Slope * (intersectionX - object1.point1.x) + object1.point1.y
							}

						// collision
							var distance = getDistance(object1.point1, {x: intersectionX, y: intersectionY})
							var collision = Boolean(
								((object1.point1.x <= intersectionX && intersectionX <= object1.point2.x) || (object1.point2.x <= intersectionX && intersectionX <= object1.point1.x))
							 && ((object1.point1.y <= intersectionY && intersectionY <= object1.point2.y) || (object1.point2.y <= intersectionY && intersectionY <= object1.point1.y))
							 && ((object2.point1.x <= intersectionX && intersectionX <= object2.point2.x) || (object2.point2.x <= intersectionX && intersectionX <= object2.point1.x))
							 && ((object2.point1.y <= intersectionY && intersectionY <= object2.point2.y) || (object2.point2.y <= intersectionY && intersectionY <= object2.point1.y))
							)

						// return
							return {
								collision: collision,
								d: distance,
								x: intersectionX,
								y: intersectionY
							}
					}

				// line - rectangle
					if (object1.type == "line" && object2.type == "rectangle") {
						// get each side
							return {
								top:    getOverlap(object1, {type: "line", point1: object2.topLeft,     point2: object2.topRight}),
								right:  getOverlap(object1, {type: "line", point1: object2.topRight,    point2: object2.bottomRight}),
								bottom: getOverlap(object1, {type: "line", point1: object2.bottomRight, point2: object2.bottomLeft}),
								left:   getOverlap(object1, {type: "line", point1: object2.bottomLeft,  point2: object2.topLeft})
							}
					}
			}
			catch (error) {
				CORE.logError(error)
				return null
			}
		}

/*** game creation ***/
	/* createMap */
		module.exports.createMap = createMap
		function createMap(game) {
			try {
				// space
					// computed size
						game.map.options.cells.x = game.map.options.rooms.x * CONSTANTS.templateSize + game.map.options.exterior.count * 2 // 2 --> outer edges
						game.map.options.cells.y = game.map.options.rooms.y * CONSTANTS.templateSize + game.map.options.exterior.count * 2 // 2 --> outer edges

					// empty grid
						game.map.grid = createGrid(game.map.options)

				// wall
					// wall / exterior
						game.map = createWalls(game.map)

					// window
						game.map = createSpecialWalls(game.map, "window")

					// mirror
						game.map = createSpecialWalls(game.map, "mirror")

				// items
					// teleporter
						var temp = createItems(game.map, game.items, "teleporter")
							game.map   = temp.map
							game.items = temp.items
				
					// obstacle
						var temp = createItems(game.map, game.items, "obstacle")
							game.map   = temp.map
							game.items = temp.items

					// item
						var temp = createItems(game.map, game.items, "spawner")
							game.map   = temp.map
							game.items = temp.items

				// return
					return game
			}
			catch (error) {
				CORE.logError(error)
				return game
			}
		}

	/* createGrid */
		module.exports.createGrid = createGrid
		function createGrid(options) {
			try {
				// empty grid
					var grid = []

				// loop through to create empty grid
					for (var x = 0; x < options.cells.x; x++) {
						grid[x] = []

						for (var y = 0; y < options.cells.y; y++) {
							grid[x][y] = {x: x, y: y, type: "space"}
						}
					}

				// return
					return grid
			}
			catch (error) {
				CORE.logError(error)
				return grid
			}
		}

	/* createWalls */
		module.exports.createWalls = createWalls
		function createWalls(map) {
			try {
				// templates
					var roomTemplates = CORE.getAsset("roomTemplates")

				// exterior
					if (map.options.exterior.count) {
						for (var x = 0; x < map.options.cells.x; x++) {
							for (var y = 0; y < map.options.exterior.count; y++) {
								map.grid[x][y].type 			              = "exterior"
								map.grid[x][map.options.cells.y - 1 - y].type = "exterior"
							}
						}
						for (var y = 0; y < map.options.cells.y; y++) {
							for (var x = 0; x < map.options.exterior.count; x++) {
								map.grid[x][y].type 			              = "exterior"
								map.grid[map.options.cells.x - 1 - x][y].type = "exterior"
							}
						}
					}

				// create wall
					for (var roomX = 0; roomX < map.options.rooms.x; roomX++) {
						for (var roomY = 0; roomY < map.options.rooms.y; roomY++) {
							var template = CORE.chooseRandom(roomTemplates)

							for (var x = 0; x < CONSTANTS.templateSize; x++) {
								for (var y = 0; y < CONSTANTS.templateSize; y++) {
									var computedX = map.options.exterior.count + roomX * CONSTANTS.templateSize + x
									var computedY = map.options.exterior.count + roomY * CONSTANTS.templateSize + y
									map.grid[computedX][computedY].type = template[x][y] ? "wall" : "space"
									
									if (template[x][y] == 0) {
										map.spaceCells.push(computedX + "," + computedY)
									}
									else if (template[x][y] == 1) {
										map.wallCells.push(computedX + "," + computedY)
									}
								}
							}
						}
					}

				// return
					return map
			}
			catch (error) {
				CORE.logError(error)
				return map
			}
		}

	/* createSpecialWalls */
		module.exports.createSpecialWalls = createSpecialWalls
		function createSpecialWalls(map, wallType) {
			try {
				// create wall[#] (from options)
					for (var wallCount = 0; wallCount < map.options[wallType].count; wallCount++) {
						var cell = CORE.chooseRandom(map.wallCells)
						if (!cell) {
							break
						}

						var cellX = Number(cell.split(",")[0])
						var cellY = Number(cell.split(",")[1])
						map.grid[cellX][cellY].type = wallType
						map.wallCells = map.wallCells.filter(function(c) {
							return c !== cell
						}) || []
					}

				// return
					return map
			}
			catch (error) {
				CORE.logError(error)
				return map
			}
		}

	/* createItems */
		module.exports.createItems = createItems
		function createItems(map, items, itemType) {
			try {
				// create item[#] (from options)
					for (var itemCount = 0; itemCount < map.options[itemType].count; itemCount++) {
						var cell = CORE.chooseRandom(map.spaceCells)
						if (!cell) {
							break
						}

						var item = {
							id: CORE.generateRandom(),
							type: itemType,
							options: map.options[itemType],
							position: {
								x: Number(cell.split(",")[0]) * map.options.cellsize,
								y: Number(cell.split(",")[1]) * map.options.cellsize
							}
						}

						if (itemType == "spawner") {
							item.team = CONSTANTS.teams[itemCount] || null
						}

						items.push(item)

						map.spaceCells = map.spaceCells.filter(function(c) {
							return c !== cell
						}) || []
					}

				// return
					return {
						map: map,
						items: items
					}
			}
			catch (error) {
				CORE.logError(error)
				return {
					map: map,
					items: items
				}
			}
		}

/*** game loop ***/
	/* calculateGame */
		module.exports.calculateGame = calculateGame
		function calculateGame(gameId, callback) {
			try {
				// no gameId
					if (!gameId) {
						return
					}

				// query
					var query = CORE.getSchema("query")
						query.collection = "games"
						query.command = "find"
						query.filters = {id: gameId}

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							return
						}

						// no game
							var game = results.documents[0]
							if (!game) {
								return
							}

						// not started
							if (!game.status.startTime) {
								// all players
									for (var i in game.players) {
										callback({gameId: game.id, success: true, message: null, playerId: i, game: {updated: game.updated, status: game.status, players: game.players, setup: game.setup}, recipients: [game.players[i].sessionId]})
									}

								// spectators
									callback({gameId: game.id, success: true, game: {updated: game.updated, status: game.status, players: game.players, setup: game.setup}, recipients: Object.keys(game.spectators)})
							}

						// ended
							else if (game.status.endTime) {
								// all players
									for (var i in game.players) {
										callback({gameId: game.id, success: true, message: null, playerId: i, game: {updated: game.updated, status: game.status, players: game.players}, recipients: [game.players[i].sessionId]})
									}

								// spectators
									callback({gameId: game.id, success: true, game: {updated: game.updated, status: game.status, players: game.players}, recipients: Object.keys(game.spectators)})
							}

						// in play
							else {
								// time
									game.status.timeRemaining -= CONSTANTS.loopTime

								// message
									calculateMessage(game)

								// calculate cooldowns / sound effects
									for (var i in game.players) {
										calculateCooldowns(game, game.players[i])
									}

								// acceleration --> velocity --> position
									for (var i in game.players) {
										calculateAcceleration(game, game.players[i])
										calculateVelocity(game, game.players[i])
										calculatePosition(game, game.players[i])
									}

								// items
									for (var i in game.items) {
										calculateItemCollisions(game, game.items[i])
									}

								// calculate laser
									for (var i in game.players) {
										calculateLaser(game, game.players[i])
									}

								// game mode: team_freeze_tag
									if (game.status.mode == "team_freeze_tag") {
										var teamsUnfrozen = {}
										for (var i in game.players) {
											if (game.players[i].status.energy) {
												teamsUnfrozen[game.players[i].status.team] = true
											}
										}

										if (Object.keys(teamsUnfrozen).length < 2) {
											game.status.timeRemaining = 0
										}
									}

								// game mode: collect_the_orbs
									if (game.status.mode == "collect_the_orbs") {
										var orbs = game.items.filter(function(i) { return i.type == "orb" })
										if (orbs.length < game.map.options.orb.count) {
											var cell = CORE.chooseRandom(game.map.spaceCells)
											game.items.push({
												id: CORE.generateRandom(),
												type: "orb",
												options: game.map.options.orb,
												position: {
													x: Number(cell.split(",")[0]) * game.map.options.cellsize,
													y: Number(cell.split(",")[1]) * game.map.options.cellsize
												}
											})
										}
									}

								// game end
									if (game.status.timeRemaining <= 0) {
										game.status.endTime = new Date().getTime()
										calculateWinner(game)
									}

								// query
									game.updated = new Date().getTime()
									var query = CORE.getSchema("query")
										query.collection = "games"
										query.command = "update"
										query.filters = {id: gameId}
										query.document = game

								// update
									CORE.accessDatabase(query, function(results) {
										if (!results.success) {
											CORE.logError(results)
											return
										}

										// game
											var game = results.documents[0]
								
										// all players
											for (var i in game.players) {
												callback({gameId: game.id, success: true, message: null, playerId: i, game: {updated: game.updated, status: game.status, players: game.players, items: game.items}, recipients: [game.players[i].sessionId]})
											}

										// spectators
											callback({gameId: game.id, success: true, game: {updated: game.updated, status: game.status, players: game.players, items: game.items}, recipients: Object.keys(game.spectators)})

										// end -> delete
											if (game.status.endTime) {
												deleteOne(game.id)
											}
									})
							}
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({gameId: gameId, success: false, message: "unable to " + arguments.callee.name, recipients: [REQUEST.session.id]})
			}
		}

	/* calculateMessage */
		module.exports.calculateMessage = calculateMessage
		function calculateMessage(game) {
			try {
				// messageTimeRemaining
					game.status.messageTimeRemaining -= CONSTANTS.loopTime

				// clear?
					if (game.status.messageTimeRemaining <= 0) {
						game.status.messageTimeRemaining = 0
						game.status.message = null
					}

				// now
					var now = new Date().getTime()

				// pre game
					if (now < game.status.startTime) {
						if (game.status.startTime - now > CONSTANTS.second * 4) {
							game.status.message = "GET READY"
							game.status.messageTimeRemaining = CONSTANTS.messageDuration
							return
						}
						if (game.status.startTime - now > CONSTANTS.second * 3) {
							game.status.message = "3"
							game.status.messageTimeRemaining = CONSTANTS.messageDuration
							return
						}
						if (game.status.startTime - now > CONSTANTS.second * 2) {
							game.status.message = "2"
							game.status.messageTimeRemaining = CONSTANTS.messageDuration
							return
						}
						if (game.status.startTime - now > CONSTANTS.second * 1) {
							game.status.message = "1"
							game.status.messageTimeRemaining = CONSTANTS.messageDuration
							return
						}
						if (game.status.startTime - now > 0) {
							game.status.message = "GO"
							game.status.messageTimeRemaining = CONSTANTS.messageDuration
							return
						}
					}

				// minute warnings
					for (var i = CONSTANTS.minute; i <= Number(game.setup.time); i += CONSTANTS.minute) {
						if (game.status.timeRemaining == i) {
							game.status.message = String(i / CONSTANTS.minute) + " MIN REMAIN"
							game.status.messageTimeRemaining = CONSTANTS.messageDuration
							return
						}
					}

				// game end
					if (game.status.timeRemaining <= 0) {
						game.status.message = "GAME OVER"
						game.status.messageTimeRemaining = CONSTANTS.messageDuration
						return
					}

				// 10-second countdown
					if (game.status.timeRemaining <= CONSTANTS.second * 10) {
						game.status.message = String(Math.ceil(game.status.timeRemaining / CONSTANTS.second))
						game.status.messageTimeRemaining = CONSTANTS.messageDuration
						return
					}
			}
			catch (error) {
				CORE.logError(error)
			}
		}

	/* calculateCooldowns */
		module.exports.calculateCooldowns = calculateCooldowns
		function calculateCooldowns(game, player) {
			try {
				// recharge
					if (game.status.mode == "team_freeze_tag" && !player.status.energy) {}
					else {
						player.status.energy = Math.max(0, Math.min(player.options.maximumEnergy, player.status.energy + player.options.energyRecharge))
					}

				// loop through
					for (var i in player.status.cooldowns) {
						player.status.cooldowns[i] = Math.max(0, player.status.cooldowns[i] - 1)
					}

				// sound effects
					for (var i in player.status.sfx) {
						player.status.sfx[i] = false
					}
			}
			catch (error) {
				CORE.logError(error)
			}
		}

	/* calculateAcceleration */
		module.exports.calculateAcceleration = calculateAcceleration
		function calculateAcceleration(game, player) {
			try {
				// preload cos / sin
					var cosA = Math.cos(player.status.position.a * CONSTANTS.radiansConversion)
					var sinA = Math.sin(player.status.position.a * CONSTANTS.radiansConversion)

				// update - based on player input
					player.status.acceleration.x = Math.round((0 + (player.keys.right && !player.keys.left ? player.options.acceleration * cosA : 0) + (player.keys.left && !player.keys.right ? -1 * player.options.acceleration * cosA : 0) + (player.keys.up   && !player.keys.down  ? -1 * player.options.acceleration * sinA : 0) + (player.keys.down  && !player.keys.up   ? player.options.acceleration * sinA : 0)) * CONSTANTS.rounding) / CONSTANTS.rounding
					player.status.acceleration.y = Math.round((0 + (player.keys.up    && !player.keys.down ? player.options.acceleration * cosA : 0) + (player.keys.down && !player.keys.up    ? -1 * player.options.acceleration * cosA : 0) + (player.keys.left && !player.keys.right ? -1 * player.options.acceleration * sinA : 0) + (player.keys.right && !player.keys.left ? player.options.acceleration * sinA : 0)) * CONSTANTS.rounding) / CONSTANTS.rounding
					player.status.acceleration.a = Math.round((0 + (player.keys.ccw   && !player.keys.cw   ? player.options.angularAcceleration : 0) + (player.keys.cw   && !player.keys.ccw   ? -1 * player.options.angularAcceleration : 0)) * CONSTANTS.rounding) / CONSTANTS.rounding

				// diagonals --> square root 2
					if (!(player.keys.right && player.keys.left) && !(player.keys.up && player.keys.down)
					 && ((player.keys.right && player.keys.up) || (player.keys.right && player.keys.down) || (player.keys.left && player.keys.up) || (player.keys.left && player.keys.down))
					) {
						player.status.acceleration.x = player.status.acceleration.x / CONSTANTS.radical2
						player.status.acceleration.y = player.status.acceleration.y / CONSTANTS.radical2
					}
			}
			catch (error) {
				CORE.logError(error)
			}
		}

	/* calculateVelocity */
		module.exports.calculateVelocity = calculateVelocity
		function calculateVelocity(game, player) {
			try {
				// update - based on acceleration
					player.status.velocity.x = player.status.velocity.x + (player.status.acceleration.x ? player.status.acceleration.x : 0)
					player.status.velocity.y = player.status.velocity.y + (player.status.acceleration.y ? player.status.acceleration.y : 0)
					player.status.velocity.a = player.status.velocity.a + (player.status.acceleration.a ? player.status.acceleration.a : 0)

				// friction
					var speed                = getTriangleSide(player.status.velocity.x, player.status.velocity.y, null)
					var speedLessFriction    = Math.max(0, speed - player.options.friction)
					var speedAdjustmentRatio = speedLessFriction ? (speedLessFriction / speed) : 0
					player.status.velocity.x = Math.round(player.status.velocity.x * speedAdjustmentRatio * CONSTANTS.rounding) / CONSTANTS.rounding
					player.status.velocity.y = Math.round(player.status.velocity.y * speedAdjustmentRatio * CONSTANTS.rounding) / CONSTANTS.rounding
					player.status.velocity.a = Math.round(Math.sign(player.status.velocity.a) * Math.max(0, Math.abs(player.status.velocity.a) - player.options.angularFriction) * CONSTANTS.rounding) / CONSTANTS.rounding

				// totals bounded by maximums
					var topVelocity          = player.options.maximumVelocity * player.status.energy / player.options.maximumEnergy
					var totalVelocity        = getTriangleSide(player.status.velocity.x, player.status.velocity.y, null)
					var maximumAdjustment    = totalVelocity > topVelocity ? (topVelocity / totalVelocity) : 1
					player.status.velocity.x = Math.round(player.status.velocity.x * maximumAdjustment * CONSTANTS.rounding) / CONSTANTS.rounding
					player.status.velocity.y = Math.round(player.status.velocity.y * maximumAdjustment * CONSTANTS.rounding) / CONSTANTS.rounding
					player.status.velocity.a = Math.round(Math.sign(player.status.velocity.a) * Math.min(player.options.maximumAngularVelocity, Math.abs(player.status.velocity.a)) * CONSTANTS.rounding) / CONSTANTS.rounding
			}
			catch (error) {
				CORE.logError(error)
			}
		}

	/* calculatePosition */
		module.exports.calculatePosition = calculatePosition
		function calculatePosition(game, player) {
			try {
				// update - based on velocity
					var newX = Math.round((player.status.position.x + (player.status.velocity.x / 100 * game.map.options.cellsize)) * CONSTANTS.rounding) / CONSTANTS.rounding
					var newY = Math.round((player.status.position.y + (player.status.velocity.y / 100 * game.map.options.cellsize)) * CONSTANTS.rounding) / CONSTANTS.rounding
					var newA = Math.round((player.status.position.a + (player.status.velocity.a + CONSTANTS.circleDegrees)) * CONSTANTS.rounding) / CONSTANTS.rounding % CONSTANTS.circleDegrees
					player.status.position.a = newA

				// new cellCenter
					var cellX = Math.round(newX / game.map.options.cellsize)
					var cellY = Math.round(newY / game.map.options.cellsize)

				// out of bounds
					if (!game.map.grid[cellX] || !game.map.grid[cellX][cellY]) {
						return
					}

				// get player
					var playerCollisionCircle = {
						type: "circle",
						x: newX,
						y: newY,
						radius: player.options.size / 2
					}

				// corners
					var corners = getCellCorners(cellX, cellY, game.map.options.cellsize)
						corners.type = "rectangle"

				// get overlaps
					var overlap = getOverlap(playerCollisionCircle, corners)

				// wall collisions
					// assume none
						var collision = false

					// collision top center / bottom center
						if (overlap.top.collision) {
							if (game.map.grid[cellX] && game.map.grid[cellX][cellY + 1] && game.map.grid[cellX][cellY + 1].type !== "space") {
								collision = true
								newY -= overlap.top.d
								player.status.velocity.y = -player.status.velocity.y
							}
						}
						if (overlap.bottom.collision) {
							if (game.map.grid[cellX] && game.map.grid[cellX][cellY - 1] && game.map.grid[cellX][cellY - 1].type !== "space") {
								collision = true
								newY += overlap.bottom.d
								player.status.velocity.y = -player.status.velocity.y
							}
						}

					// collision center right / center left
						if (overlap.right.collision) {
							if (game.map.grid[cellX + 1] && game.map.grid[cellX + 1][cellY] && game.map.grid[cellX + 1][cellY].type !== "space") {
								collision = true
								newX -= overlap.right.d
								player.status.velocity.x = -player.status.velocity.x
							}
						}
						if (overlap.left.collision) {
							if (game.map.grid[cellX - 1] && game.map.grid[cellX - 1][cellY] && game.map.grid[cellX - 1][cellY].type !== "space") {
								collision = true
								newX += overlap.left.d
								player.status.velocity.x = -player.status.velocity.x
							}
						}

					// no collision? check corners
						if (!collision) {
							// collision top right / bottom right / bottom left / top left
								if (overlap.top.collision && overlap.right.collision) {
									var diagonal = getDistance(playerCollisionCircle, corners.topRight)
									if (diagonal < playerCollisionCircle.radius && game.map.grid[cellX + 1] && game.map.grid[cellX + 1][cellY + 1] && game.map.grid[cellX + 1][cellY + 1].type !== "space") {
										collision = true
										newX = (playerCollisionCircle.radius - diagonal) / diagonal * (playerCollisionCircle.x - corners.topRight.x) + playerCollisionCircle.x
										newY = (playerCollisionCircle.radius - diagonal) / diagonal * (playerCollisionCircle.y - corners.topRight.y) + playerCollisionCircle.y
									}
								}
								if (overlap.bottom.collision && overlap.right.collision) {
									var diagonal = getDistance(playerCollisionCircle, corners.bottomRight)
									if (diagonal < playerCollisionCircle.radius && game.map.grid[cellX + 1] && game.map.grid[cellX + 1][cellY - 1] && game.map.grid[cellX + 1][cellY - 1].type !== "space") {
										collision = true
										newX = (playerCollisionCircle.radius - diagonal) / diagonal * (playerCollisionCircle.x - corners.bottomRight.x) + playerCollisionCircle.x
										newY = (playerCollisionCircle.radius - diagonal) / diagonal * (playerCollisionCircle.y - corners.bottomRight.y) + playerCollisionCircle.y
									}
								}
								if (overlap.bottom.collision && overlap.left.collision) {
									var diagonal = getDistance(playerCollisionCircle, corners.bottomLeft)
									if (diagonal < playerCollisionCircle.radius && game.map.grid[cellX - 1] && game.map.grid[cellX - 1][cellY - 1] && game.map.grid[cellX - 1][cellY - 1].type !== "space") {
										collision = true
										newX = (playerCollisionCircle.radius - diagonal) / diagonal * (playerCollisionCircle.x - corners.bottomLeft.x) + playerCollisionCircle.x
										newY = (playerCollisionCircle.radius - diagonal) / diagonal * (playerCollisionCircle.y - corners.bottomLeft.y) + playerCollisionCircle.y
									}
								}
								if (overlap.top.collision && overlap.left.collision) {
									var diagonal = getDistance(playerCollisionCircle, corners.topLeft)
									if (diagonal < playerCollisionCircle.radius && game.map.grid[cellX - 1] && game.map.grid[cellX - 1][cellY + 1] && game.map.grid[cellX - 1][cellY + 1].type !== "space") {
										collision = true
										newX = (playerCollisionCircle.radius - diagonal) / diagonal * (playerCollisionCircle.x - corners.topLeft.x) + playerCollisionCircle.x
										newY = (playerCollisionCircle.radius - diagonal) / diagonal * (playerCollisionCircle.y - corners.topLeft.y) + playerCollisionCircle.y
									}
								}
						}

				// update
					player.status.position.x = newX
					player.status.position.y = newY

				// collision?
					if (collision) {
						player.status.sfx.collisionWall = true
						var speed = getTriangleSide(player.status.velocity.x, player.status.velocity.y, null)
						if (player.status.energy >= player.options.minimumEnergyForLaser) {
							player.status.energy = Math.max(player.options.minimumEnergyForLaser, Math.min(player.options.maximumEnergy, player.status.energy - Math.round(speed / 2)))
						}
					}

				// item collisions
					for (var i in game.items) {
						// item
							var item = game.items[i]

						// overlap
							var overlap = getOverlap({
								type: "circle",
								x: item.position.x,
								y: item.position.y,
								radius: item.options.size / 2,
							}, {
								type: "circle",
								x: player.status.position.x,
								y: player.status.position.y,
								radius: playerCollisionCircle.radius
							})

						// collision
							if (overlap.collision) {
								// spawner
									if (item.options.name == "spawner") {
										continue
									}

								// game mode: collect_the_orbs
									if (game.status.mode == "collect_the_orbs" && item.options.name == "orb") {
										player.status.sfx.collisionOrb = true

										game.status.orbs[player.status.team]++
										game.status.message = player.name + " COLLECTS ORB"
										game.status.messageTimeRemaining = CONSTANTS.messageDuration

										game.items.splice(i, 1)
										i--
										continue
									}

								// game mode: capture_the_hat
									if (game.status.mode == "capture_the_hat" && item.options.name == "orb" && !player.status.cooldowns.invincibility) {
										player.status.sfx.collisionOrb = true

										player.status.isIt = true
										game.status.message = player.name + " CAPTURES THE HAT"
										game.status.messageTimeRemaining = CONSTANTS.messageDuration

										game.items.splice(i, 1)
										i--
										continue
									}

								// obstacle
									if (item.options.name == "obstacle") {
										player.status.sfx.collisionObstacle = true

										// trig
											var cosOverlapA = Math.cos(overlap.a * CONSTANTS.radiansConversion)
											var sinOverlapA = Math.sin(overlap.a * CONSTANTS.radiansConversion)

										// push
											item.position.x -= player.options.bump * Math.abs(player.status.velocity.x) * cosOverlapA
											item.position.y -= player.options.bump * Math.abs(player.status.velocity.y) * sinOverlapA

										// bump back
											var speed = getTriangleSide(player.status.velocity.x, player.status.velocity.y, null)
											player.status.velocity.x = 0
											player.status.velocity.y = 0
											player.status.position.x += overlap.d * cosOverlapA
											player.status.position.y += overlap.d * sinOverlapA

										// reduce energy
											if (player.status.energy >= player.options.minimumEnergyForLaser) {
												player.status.energy = Math.max(player.options.minimumEnergyForLaser, Math.min(player.options.maximumEnergy, player.status.energy - Math.round(speed)))
											}

										continue
									}

								// teleporter
									if (item.options.name == "teleporter" && !player.status.cooldowns.teleport) {
										player.status.sfx.collisionTeleporter = true

										// filtered list
											var cellX = Math.round(newX / game.map.options.cellsize)
											var cellY = Math.round(newY / game.map.options.cellsize)
											var otherTeleporters = game.items.filter(function(i) {
												return (i.id !== item.id) && (i.options.name == "teleporter")
											}) || []

										// random
											var teleporter = CORE.chooseRandom(otherTeleporters) || null
											if (!teleporter) {
												return
											}

										// update position
											player.status.position.x = teleporter.position.x
											player.status.position.y = teleporter.position.y
											player.status.cooldowns.teleport = player.options.teleportCooldown
											break
									}
							}
					}

				// player collisions
					for (var i in game.players) {
						// player
							if (i == player.id) {
								continue
							}
							var thatPlayer = game.players[i]

						// overlap
							var overlap = getOverlap({
								type: "circle",
								x: thatPlayer.status.position.x,
								y: thatPlayer.status.position.y,
								radius: thatPlayer.options.size / 2,
							}, {
								type: "circle",
								x: player.status.position.x,
								y: player.status.position.y,
								radius: playerCollisionCircle.radius
							})

						// collision
							if (overlap.collision) {
								// trig
									var cosOverlapA = Math.cos(overlap.a * CONSTANTS.radiansConversion)
									var sinOverlapA = Math.sin(overlap.a * CONSTANTS.radiansConversion)

								// temp
									var tempVX = player.status.velocity.x
									var tempVY = player.status.velocity.y
									var tempSpeed = getTriangleSide(tempVX, tempVY, null)

								// bump back self
									player.status.sfx.collisionPlayer = true

									player.status.position.x += overlap.d * cosOverlapA
									player.status.position.y += overlap.d * sinOverlapA
									player.status.velocity.x = thatPlayer.status.velocity.x * thatPlayer.options.bump
									player.status.velocity.y = thatPlayer.status.velocity.y * thatPlayer.options.bump
									if (!player.status.cooldowns.invincibility) {
										player.status.energy = Math.max(player.options.minimumEnergyFromDamage, Math.min(player.options.maximumEnergy, player.status.energy - getTriangleSide(thatPlayer.status.velocity.x, thatPlayer.status.velocity.y, null) * thatPlayer.options.bump))
									}

								// push
									thatPlayer.status.sfx.collisionPlayer = true

									thatPlayer.status.position.x -= overlap.d * cosOverlapA
									thatPlayer.status.position.y -= overlap.d * sinOverlapA
									thatPlayer.status.velocity.x = tempVX * player.options.bump
									thatPlayer.status.velocity.y = tempVY * player.options.bump
									if (!thatPlayer.status.cooldowns.invincibility) {
										thatPlayer.status.energy = Math.max(thatPlayer.options.minimumEnergyFromDamage, Math.min(thatPlayer.options.maximumEnergy, thatPlayer.status.energy - tempSpeed * player.options.bump))
									}

								// game mode: classic_tag
									if (game.status.mode == "classic_tag") {
										if (player.status.isIt && !thatPlayer.status.energy) {
											thatPlayer.status.sfx.noEnergy = true

											thatPlayer.status.isIt = true
											thatPlayer.options.minimumEnergyFromDamage = player.options.minimumEnergyFromDamage

											player.status.isIt = false
											player.options.minimumEnergyFromDamage = 0
											player.status.cooldowns.invincibility = player.options.invincibilityCooldown

											game.status.message = thatPlayer.name + " IS IT"
											game.status.messageTimeRemaining = CONSTANTS.messageDuration
										}
										else if (thatPlayer.status.isIt && !player.status.energy) {
											player.status.sfx.noEnergy = true

											player.status.isIt = true
											player.options.minimumEnergyFromDamage = thatPlayer.options.minimumEnergyFromDamage

											thatPlayer.status.isIt = false
											thatPlayer.options.minimumEnergyFromDamage = 0
											thatPlayer.status.cooldowns.invincibility = player.options.invincibilityCooldown

											game.status.message = player.name + " IS IT"
											game.status.messageTimeRemaining = CONSTANTS.messageDuration
										}
									}

								// game mode: team_freeze_tag
									if (game.status.mode == "team_freeze_tag") {
										if (!thatPlayer.status.energy) {
											thatPlayer.status.sfx.noEnergy = true

											game.status.message = thatPlayer.name + " IS FROZEN"
											game.status.messageTimeRemaining = CONSTANTS.messageDuration
										}
										else if (!player.status.energy) {
											player.status.sfx.noEnergy = true

											game.status.message = player.name + " IS FROZEN"
											game.status.messageTimeRemaining = CONSTANTS.messageDuration
										}
									}

								// game mode: capture_the_hat
									if (game.status.mode == "capture_the_hat") {
										if (player.status.isIt && !player.status.energy) {
											player.status.sfx.noEnergy = true

											player.status.isIt = false
											player.status.cooldowns.invincibility = player.options.invincibilityCooldown

											game.status.message = player.name + " DROPS THE HAT"
											game.status.messageTimeRemaining = CONSTANTS.messageDuration

											game.items.push({
												id: CORE.generateRandom(),
												type: "orb",
												options: game.map.options.orb,
												position: {
													x: player.status.position.x,
													y: player.status.position.y
												}
											})
										}
										else if (thatPlayer.status.isIt && !thatPlayer.status.energy) {
											thatPlayer.status.sfx.noEnergy = true

											thatPlayer.status.isIt = false
											thatPlayer.status.cooldowns.invincibility = thatPlayer.options.invincibilityCooldown

											game.status.message = thatPlayer.name + " DROPS THE HAT"
											game.status.messageTimeRemaining = CONSTANTS.messageDuration

											game.items.push({
												id: CORE.generateRandom(),
												type: "orb",
												options: game.map.options.orb,
												position: {
													x: thatPlayer.status.position.x,
													y: thatPlayer.status.position.y
												}
											})
										}
									}

								// game mode: team_battle
									if (game.status.mode == "team_battle") {
										if (!thatPlayer.status.energy) {
											game.status.kills[player.status.team]++

											var teamSpawner = game.items.find(function(item) { return item.team == thatPlayer.status.team }) || null
											thatPlayer.status.position.x = teamSpawner ? teamSpawner.position.x : (game.map.options.cells.x / 2 * game.map.options.cellsize)
											thatPlayer.status.position.y = teamSpawner ? teamSpawner.position.y : (game.map.options.cells.y / 2 * game.map.options.cellsize)
											thatPlayer.status.energy = thatPlayer.options.maximumEnergy
											thatPlayer.status.cooldowns.invincibility = player.options.invincibilityCooldown

											thatPlayer.status.sfx.noEnergy = true

											game.status.message = player.name + " ZAPS " + thatPlayer.name
											game.status.messageTimeRemaining = CONSTANTS.messageDuration
										}
										else if (!player.status.energy) {
											game.status.kills[thatPlayer.status.team]++

											var teamSpawner = game.items.find(function(item) { return item.team == player.status.team }) || null
											player.status.position.x = teamSpawner ? teamSpawner.position.x : (game.map.options.cells.x / 2 * game.map.options.cellsize)
											player.status.position.y = teamSpawner ? teamSpawner.position.y : (game.map.options.cells.y / 2 * game.map.options.cellsize)
											player.status.energy = thatPlayer.options.maximumEnergy
											player.status.cooldowns.invincibility = player.options.invincibilityCooldown

											player.status.sfx.noEnergy = true

											game.status.message = thatPlayer.name + " ZAPS " + player.name
											game.status.messageTimeRemaining = CONSTANTS.messageDuration
										}
									}
							}
					}
			}
			catch (error) {
				CORE.logError(error)
			}
		}

	/* calculateItemCollisions */
		module.exports.calculateItemCollisions = calculateItemCollisions
		function calculateItemCollisions(game, item) {
			try {
				// not movable? skip
					if (!["obstacle"].includes(item.options.name)) {
						return
					}

				// new cellCenter
					var newX = item.position.x
					var newY = item.position.y
					var cellX = Math.round(newX / game.map.options.cellsize)
					var cellY = Math.round(newY / game.map.options.cellsize)

				// out of bounds
					if (!game.map.grid[cellX] || !game.map.grid[cellX][cellY]) {
						return
					}

				// get item
					var itemCollisionCircle = {
						type: "circle",
						x: newX,
						y: newY,
						radius: item.options.size / 2
					}

				// corners
					var corners = getCellCorners(cellX, cellY, game.map.options.cellsize)
						corners.type = "rectangle"

				// get overlaps
					var overlap = getOverlap(itemCollisionCircle, corners)

				// collisions
					// assume none
						var collision = false

					// collision top center / bottom center
						if (overlap.top.collision) {
							if (game.map.grid[cellX] && game.map.grid[cellX][cellY + 1] && game.map.grid[cellX][cellY + 1].type !== "space") {
								collision = true
								newY -= overlap.top.d
							}
						}
						if (overlap.bottom.collision) {
							if (game.map.grid[cellX] && game.map.grid[cellX][cellY - 1] && game.map.grid[cellX][cellY - 1].type !== "space") {
								collision = true
								newY += overlap.bottom.d
							}
						}

					// collision center right / center left
						if (overlap.right.collision) {
							if (game.map.grid[cellX + 1] && game.map.grid[cellX + 1][cellY] && game.map.grid[cellX + 1][cellY].type !== "space") {
								collision = true
								newX -= overlap.right.d
							}
						}
						if (overlap.left.collision) {
							if (game.map.grid[cellX - 1] && game.map.grid[cellX - 1][cellY] && game.map.grid[cellX - 1][cellY].type !== "space") {
								collision = true
								newX += overlap.left.d
							}
						}

					// no collision? check corners
						if (!collision) {
							// collision top right / bottom right / bottom left / top left
								if (overlap.top.collision && overlap.right.collision) {
									var diagonal = getDistance(itemCollisionCircle, corners.topRight)
									if (diagonal < itemCollisionCircle.radius && game.map.grid[cellX + 1] && game.map.grid[cellX + 1][cellY + 1] && game.map.grid[cellX + 1][cellY + 1].type !== "space") {
										newX = (itemCollisionCircle.radius - diagonal) / diagonal * (itemCollisionCircle.x - corners.topRight.x) + itemCollisionCircle.x
										newY = (itemCollisionCircle.radius - diagonal) / diagonal * (itemCollisionCircle.y - corners.topRight.y) + itemCollisionCircle.y
									}
								}
								if (overlap.bottom.collision && overlap.right.collision) {
									var diagonal = getDistance(itemCollisionCircle, corners.bottomRight)
									if (diagonal < itemCollisionCircle.radius && game.map.grid[cellX + 1] && game.map.grid[cellX + 1][cellY - 1] && game.map.grid[cellX + 1][cellY - 1].type !== "space") {
										newX = (itemCollisionCircle.radius - diagonal) / diagonal * (itemCollisionCircle.x - corners.bottomRight.x) + itemCollisionCircle.x
										newY = (itemCollisionCircle.radius - diagonal) / diagonal * (itemCollisionCircle.y - corners.bottomRight.y) + itemCollisionCircle.y
									}
								}
								if (overlap.bottom.collision && overlap.left.collision) {
									var diagonal = getDistance(itemCollisionCircle, corners.bottomLeft)
									if (diagonal < itemCollisionCircle.radius && game.map.grid[cellX - 1] && game.map.grid[cellX - 1][cellY - 1] && game.map.grid[cellX - 1][cellY - 1].type !== "space") {
										newX = (itemCollisionCircle.radius - diagonal) / diagonal * (itemCollisionCircle.x - corners.bottomLeft.x) + itemCollisionCircle.x
										newY = (itemCollisionCircle.radius - diagonal) / diagonal * (itemCollisionCircle.y - corners.bottomLeft.y) + itemCollisionCircle.y
									}
								}
								if (overlap.top.collision && overlap.left.collision) {
									var diagonal = getDistance(itemCollisionCircle, corners.topLeft)
									if (diagonal < itemCollisionCircle.radius && game.map.grid[cellX - 1] && game.map.grid[cellX - 1][cellY + 1] && game.map.grid[cellX - 1][cellY + 1].type !== "space") {
										newX = (itemCollisionCircle.radius - diagonal) / diagonal * (itemCollisionCircle.x - corners.topLeft.x) + itemCollisionCircle.x
										newY = (itemCollisionCircle.radius - diagonal) / diagonal * (itemCollisionCircle.y - corners.topLeft.y) + itemCollisionCircle.y
									}
								}
						}

				// update
					item.position.x = newX
					item.position.y = newY

				// other items
					for (var i in game.items) {
						// self
							if (game.items[i].id == item.id) {
								continue
							}

						// not obstacle
							if (game.items[i].options.name !== "obstacle") {
								continue
							}

						// overlap
							var overlap = getOverlap({
								type: "circle",
								x: game.items[i].position.x,
								y: game.items[i].position.y,
								radius: game.items[i].options.size / 2,
							}, {
								type: "circle",
								x: item.position.x,
								y: item.position.y,
								radius: itemCollisionCircle.radius
							})

							if (overlap.collision) {
								// trig
									var cosOverlapA = Math.cos(overlap.a * CONSTANTS.radiansConversion)
									var sinOverlapA = Math.sin(overlap.a * CONSTANTS.radiansConversion)

								// bump
									game.items[i].position.x -= overlap.d * cosOverlapA / 2
									game.items[i].position.x -= overlap.d * sinOverlapA / 2
									item.position.x          += overlap.d * cosOverlapA / 2
									item.position.y          += overlap.d * sinOverlapA / 2
							}
					}
			}
			catch (error) {
				CORE.logError(error)
			}
		}

	/* calculateLaser */
		module.exports.calculateLaser = calculateLaser
		function calculateLaser(game, player) {
			try {
				// not shooting
					if (!player.keys.space) {
						player.laser = []
						return
					}

				// not enough energy
					if (player.status.energy < player.options.minimumEnergyForLaser) {
						player.laser = []
						return
					}

				// game mode: capture_the_hat
					if (game.status.mode == "capture_the_hat" && player.status.isIt) {
						player.laser = []
						return
					}

				// decrease energy
					player.status.sfx.shootingLaser = true
					player.status.energy -= player.options.laserEnergy

				// starting angles
					var currentAngle = (player.status.position.a + CONSTANTS.circleDegrees / 4) % CONSTANTS.circleDegrees // 90 degree shift so it's always facing forward
					var cosCurrentA  = Math.cos(currentAngle * CONSTANTS.radiansConversion)
					var sinCurrentA  = Math.sin(currentAngle * CONSTANTS.radiansConversion)
					var tanCurrentA  = Math.tan(currentAngle * CONSTANTS.radiansConversion)

				// start laser
					var collision = false
					player.laser = [{
						x: player.status.position.x + (cosCurrentA * player.options.size / 2),
						y: player.status.position.y + (sinCurrentA * player.options.size / 2),
						a: currentAngle,
						e: player.options.laserEnergy
					}]

				// next
					do {
						// get previous point
							var previousPoint = {
								x: player.laser[player.laser.length - 1].x,
								y: player.laser[player.laser.length - 1].y
							}

						// get cell
							var cellX = Math.round(previousPoint.x / game.map.options.cellsize)
							var cellY = Math.round(previousPoint.y / game.map.options.cellsize)

						// get corners
							var corners = getCellCorners(cellX, cellY, game.map.options.cellsize)
								corners.type = "rectangle"

						// get overlap
							var overlap = getOverlap({
								type: "line",
								point1: previousPoint,
								point2: { // arbitrary point a few cells farther down the laser
									x: previousPoint.x + (cosCurrentA * game.map.options.cellsize * 2),
									y: previousPoint.y + (sinCurrentA * game.map.options.cellsize * 2)
								},
							}, corners)

						// get direction
							var overlapDirection = Object.keys(overlap).find(function(k) {
								return overlap[k].collision
							}) || null

						// no direction?
							if (!overlapDirection) {
								collision = true
								break
							}

						// direction found --> add point and determine reflection angle
							else {
								var reflectionAngle = (overlapDirection == "top") ? 0 :
									(overlapDirection == "left") ? CONSTANTS.circleDegrees / 4 :
									(overlapDirection == "bottom") ? CONSTANTS.circleDegrees / 2 :
									(overlapDirection == "right") ? CONSTANTS.circleDegrees * 3 / 4 : null

								player.laser.push({
									x: overlap[overlapDirection].x + cosCurrentA * 2, // tiny nudge to avoid getting stuck in the same cell
									y: overlap[overlapDirection].y + sinCurrentA * 2, // tiny nudge to avoid getting stuck in the same cell
									e: player.laser[player.laser.length - 1].e - player.options.laserDissipation
								})
							}

						// obstacles
							for (var i in game.items) {
								// not obstacles
									if (game.items[i].options.name !== "obstacle" && game.items[i].options.name !== "orb") {
										continue
									}

								// get collision
									var item = game.items[i]
									var overlap = getOverlap({
										type: "circle",
										x: item.position.x,
										y: item.position.y,
										radius: item.options.size / 2
									}, {
										type: "line",
										laser: true,
										point1: player.laser[player.laser.length - 2],
										point2: player.laser[player.laser.length - 1]
									})

								// overlap?
									if (overlap.collision)  {
										// end laser
											player.laser[player.laser.length - 1].x = overlap.x
											player.laser[player.laser.length - 1].y = overlap.y
											collision = true

										// game mode: collect_the_orbs
											if (game.status.mode == "collect_the_orbs" && item.options.name == "orb") {
												player.status.sfx.collisionOrb = true

												game.status.orbs[player.status.team]++
												game.status.message = player.name + " COLLECTS ORB"
												game.status.messageTimeRemaining = CONSTANTS.messageDuration

												game.items.splice(i, 1)
												i--
											}
										
										break
									}
							}

						// players
							for (var i in game.players) {
								// skip self on first segment
									if (player.laser.length == 2 && i == player.id) {
										continue
									}

								// get collision
									var thatPlayer = game.players[i]
									var overlap = getOverlap({
										type: "circle",
										x: thatPlayer.status.position.x,
										y: thatPlayer.status.position.y,
										radius: thatPlayer.options.size / 2
									}, {
										type: "line",
										laser: true,
										point1: player.laser[player.laser.length - 2],
										point2: player.laser[player.laser.length - 1]
									})

								// overlap?
									if (overlap.collision)  {
										// end laser
											player.laser[player.laser.length - 1].x = overlap.x
											player.laser[player.laser.length - 1].y = overlap.y
											collision = true

										// ally
											if (thatPlayer.status.team == player.status.team && !thatPlayer.status.isIt && !player.status.isIt) {
												thatPlayer.status.sfx.collisionAllyLaser = true
												thatPlayer.status.energy = Math.max(thatPlayer.options.minimumEnergyFromDamage, Math.min(thatPlayer.options.maximumEnergy, thatPlayer.status.energy + player.laser[player.laser.length - 1].e))
												break
											}

										// opponent
											if (!thatPlayer.status.cooldowns.invincibility) {
												thatPlayer.status.sfx.collisionOpponentLaser = true
												thatPlayer.status.energy = Math.max(thatPlayer.options.minimumEnergyFromDamage, Math.min(thatPlayer.options.maximumEnergy, thatPlayer.status.energy - player.options.laserAttackMultiplier * player.laser[player.laser.length - 1].e))

												// game mode: classic_tag
													if (game.status.mode == "classic_tag") {
														if (player.status.isIt && !thatPlayer.status.energy) {
															thatPlayer.status.sfx.noEnergy = true

															thatPlayer.status.isIt = true
															thatPlayer.options.minimumEnergyFromDamage = player.options.minimumEnergyFromDamage

															player.status.isIt = false
															player.options.minimumEnergyFromDamage = 0
															player.status.cooldowns.invincibility = player.options.invincibilityCooldown

															game.status.message = thatPlayer.name + " IS IT"
															game.status.messageTimeRemaining = CONSTANTS.messageDuration
														}
													}

												// game mode: team_freeze_tag
													if (game.status.mode == "team_freeze_tag") {
														if (!thatPlayer.status.energy) {
															thatPlayer.status.sfx.noEnergy = true

															game.status.message = thatPlayer.name + " IS FROZEN"
															game.status.messageTimeRemaining = CONSTANTS.messageDuration
														}
													}

												// game mode: capture_the_hat
													if (game.status.mode == "capture_the_hat") {
														if (thatPlayer.status.isIt && !thatPlayer.status.energy) {
															thatPlayer.status.sfx.noEnergy = true

															thatPlayer.status.isIt = false
															thatPlayer.status.cooldowns.invincibility = thatPlayer.options.invincibilityCooldown

															game.status.message = thatPlayer.name + " DROPS THE HAT"
															game.status.messageTimeRemaining = CONSTANTS.messageDuration

															game.items.push({
																id: CORE.generateRandom(),
																type: "orb",
																options: game.map.options.orb,
																position: {
																	x: thatPlayer.status.position.x,
																	y: thatPlayer.status.position.y
																}
															})
														}
													}

												// game mode: team_battle
													if (game.status.mode == "team_battle") {
														if (!thatPlayer.status.energy) {
															game.status.kills[player.status.team]++

															var teamSpawner = game.items.find(function(item) { return item.team == thatPlayer.status.team }) || null
															thatPlayer.status.position.x = teamSpawner ? teamSpawner.position.x : (game.map.options.cells.x / 2 * game.map.options.cellsize)
															thatPlayer.status.position.y = teamSpawner ? teamSpawner.position.y : (game.map.options.cells.y / 2 * game.map.options.cellsize)
															thatPlayer.status.energy = thatPlayer.options.maximumEnergy
															thatPlayer.status.cooldowns.invincibility = player.options.invincibilityCooldown

															thatPlayer.status.sfx.noEnergy = true

															game.status.message = player.name + " ZAPS " + thatPlayer.name
															game.status.messageTimeRemaining = CONSTANTS.messageDuration
														}
													}

												break
											}
									}
							}

						// get next cell
							var nextCellX = Math.round(player.laser[player.laser.length - 1].x / game.map.options.cellsize) 
							var nextCellY = Math.round(player.laser[player.laser.length - 1].y / game.map.options.cellsize)

						// next cell is exterior or wall?
							if (!game.map.grid[nextCellX] || !game.map.grid[nextCellX][nextCellY] || game.map.grid[nextCellX][nextCellY].type == "exterior" || game.map.grid[nextCellX][nextCellY].type == "wall") {
								collision = true
								break
							}

						// next cell is mirror?
							if (game.map.grid[nextCellX][nextCellY].type == "mirror") {
								currentAngle = player.laser[player.laser.length - 1].a = getReflection(currentAngle, reflectionAngle)
								cosCurrentA = Math.cos(currentAngle * CONSTANTS.radiansConversion)
								sinCurrentA = Math.sin(currentAngle * CONSTANTS.radiansConversion)
								tanCurrentA = Math.tan(currentAngle * CONSTANTS.radiansConversion)
							}
					} while (!collision && player.laser.length < CONSTANTS.maximumLaserSegments)

				// filter
					player.laser = player.laser.filter(function(value, index) {
						return (!index || index == player.laser.length - 1) || (value.a !== undefined) // keep first, last, and mirrors
					}) || []
			}
			catch (error) {
				CORE.logError(error)
			}
		}

	/* calculateWinner */
		module.exports.calculateWinner = calculateWinner
		function calculateWinner(game) {
			try {
				// end all SFX
					for (var i in game.players) {
						for (var j in game.players[i].status.sfx) {
							game.players[i].status.sfx[j] = false
						}
					}

				// game mode: classic_tag
					if (game.status.mode == "classic_tag") {
						// who is it
							var itKey = Object.keys(game.players).find(function(key) { return game.players[key].status.isIt })

						// message
							game.status.message = "LOSER: " + game.players[itKey].name
							game.status.messageTimeRemaining = CONSTANTS.messageDuration
					}

				// game mode: team_freeze_tag
					if (game.status.mode == "team_freeze_tag") {
						// get teams
							var teams = {}
							for (var i in CONSTANTS.teams) {
								teams[CONSTANTS.teams[i]] = {
									color: CONSTANTS.teams[i].toUpperCase(),
									frozen: 0,
									total: 0,
									percentage: 0
								}
							}

						// add players to teams
							for (var i in game.players) {
								teams[game.players[i].status.team].total++
								if (!game.players[i].status.energy) {
									teams[game.players[i].status.team].frozen++
								}
							}

						// determine percentages
							for (var i in teams) {
								if (!teams[i].total) {
									delete teams[i]
									continue
								}

								teams[i].percentage = teams[i].frozen / teams[i].total
							}

						// sort
							var teamKeys = Object.keys(teams).sort(function(a, b) { return teams[a].percentage - teams[b].percentage })

						// ties?
							var winningTeams = []
							var winningPercentage = teams[teamKeys[0]].percentage
							var i = 0
							while (teams[teamKeys[i]] && teams[teamKeys[i]].percentage == winningPercentage) {
								winningTeams.push(teams[teamKeys[i]].color)
								i++
							}

						// message
							game.status.message = "WINNING TEAM: " + (winningTeams.join(" & ") || "NO ONE")
							game.status.messageTimeRemaining = CONSTANTS.messageDuration
					}

				// game mode: capture_the_hat
					if (game.status.mode == "capture_the_hat") {
						// who is it
							var itKey = Object.keys(game.players).find(function(key) { return game.players[key].status.isIt }) || null

						// message
							game.status.message = "WINNER: " + (itKey ? game.players[itKey].name : "NO ONE")
							game.status.messageTimeRemaining = CONSTANTS.messageDuration
					}

				// game mode: team_battle
					if (game.status.mode == "team_battle") {
						// sort
							var teamKeys = Object.keys(game.status.kills).sort(function(a, b) { return game.status.kills[b] - game.status.kills[a] })

						// ties?
							var winningTeams = []
							var winningAmount = game.status.kills[teamKeys[0]]
							var i = 0
							while (game.status.kills[teamKeys[i]] && game.status.kills[teamKeys[i]] == winningAmount) {
								winningTeams.push(teamKeys[i].toUpperCase())
								i++
							}

						// message
							game.status.message = "WINNING TEAM: " + (winningTeams.join(" & ") || "NO ONE")
							game.status.messageTimeRemaining = CONSTANTS.messageDuration
					}

				// game mode: collect_the_orbs
					if (game.status.mode == "collect_the_orbs") {
						// sort
							var teamKeys = Object.keys(game.status.orbs).sort(function(a, b) { return game.status.orbs[b] - game.status.orbs[a] })

						// ties?
							var winningTeams = []
							var winningAmount = game.status.orbs[teamKeys[0]]
							var i = 0
							while (game.status.orbs[teamKeys[i]] && game.status.orbs[teamKeys[i]] == winningAmount) {
								winningTeams.push(teamKeys[i].toUpperCase())
								i++
							}

						// message
							game.status.message = "WINNING TEAM: " + (winningTeams.join(" & ") || "NO ONE")
							game.status.messageTimeRemaining = CONSTANTS.messageDuration
					}
			}
			catch (error) {
				CORE.logError(error)
			}
		}
