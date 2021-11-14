/*** modules ***/
	if (!HTTP)   { var HTTP   = require("http") }
	if (!FS)     { var FS     = require("fs") }
	module.exports = {}

/*** environment ***/
	var ENVIRONMENT = getEnvironment()

/*** logs ***/
	/* logError */
		module.exports.logError = logError
		function logError(error) {
			if (ENVIRONMENT.debug) {
				console.log("\n*** ERROR @ " + new Date().toLocaleString() + " ***")
				console.log(" - " + error)
				console.dir(arguments)
			}
		}

	/* logStatus */
		module.exports.logStatus = logStatus
		function logStatus(status) {
			if (ENVIRONMENT.debug) {
				console.log("\n--- STATUS @ " + new Date().toLocaleString() + " ---")
				console.log(" - " + status)

			}
		}

	/* logMessage */
		module.exports.logMessage = logMessage
		function logMessage(message) {
			if (ENVIRONMENT.debug) {
				console.log(" - " + new Date().toLocaleString() + ": " + message)
			}
		}

	/* logTime */
		module.exports.logTime = logTime
		function logTime(flag, callback) {
			if (ENVIRONMENT.debug) {
				var before = process.hrtime()
				callback()
				
				var after = process.hrtime(before)[1] / 1e6
				if (after > 10) {
					logMessage(flag + " " + after)
				} else {
					logMessage(".")
				}
			}
			else {
				callback()
			}
		}

/*** maps ***/
	/* getEnvironment */
		module.exports.getEnvironment = getEnvironment
		function getEnvironment() {
			try {
				if (process.env.DOMAIN !== undefined) {
					return {
						port:            process.env.PORT,
						domain:          process.env.DOMAIN,
						debug:           process.env.DEBUG || false,
						db: {
							sessions: {},
							games: {}
						},
						ws_config: {
							autoAcceptConnections: false
						}
					}
				}
				else {
					return {
						port:            3000,
						domain:          "localhost",
						debug:           true,
						db: {
							sessions: {},
							games: {}
						},
						ws_config: {
							autoAcceptConnections: false
						}
					}
				}
			}
			catch (error) {
				logError(error)
				return false
			}
		}

	/* getContentType */
		module.exports.getContentType = getContentType
		function getContentType(string) {
			try {
				var array = string.split(".")
				var extension = array[array.length - 1].toLowerCase()

				switch (extension) {
					// application
						case "json":
						case "pdf":
						case "rtf":
						case "xml":
						case "zip":
							return "application/" + extension
						break

					// font
						case "otf":
						case "ttf":
						case "woff":
						case "woff2":
							return "font/" + extension
						break

					// audio
						case "aac":
						case "midi":
						case "wav":
							return "audio/" + extension
						break
						case "mid":
							return "audio/midi"
						break
						case "mp3":
							return "audio/mpeg"
						break
						case "oga":
							return "audio/ogg"
						break
						case "weba":
							return "audio/webm"
						break

					// images
						case "iso":
						case "bmp":
						case "gif":
						case "jpeg":
						case "png":
						case "tiff":
						case "webp":
							return "image/" + extension
						break
						case "jpg":
							return "image/jpeg"
						break
						case "svg":
							return "image/svg+xml"
						break
						case "tif":
							return "image/tiff"
						break

					// video
						case "mpeg":
						case "webm":
							return "video/" + extension
						break
						case "ogv":
							return "video/ogg"
						break

					// text
						case "css":
						case "csv":
						case "html":
						case "js":
							return "text/" + extension
						break

						case "md":
							return "text/html"
						break

						case "txt":
						default:
							return "text/plain"
						break
				}
			}
			catch (error) {logError(error)}
		}

	/* getSchema */
		module.exports.getSchema = getSchema
		function getSchema(index) {
			try {
				switch (index) {
					// core
						case "query":
							return {
								collection: null,
								command: null,
								filters: null,
								document: null,
								options: {}
							}
						break

						case "session":
							return {
								id: generateRandom(),
								updated: new Date().getTime(),
								playerId: null,
								gameId: null,
								info: {
									"ip":         null,
						 			"user-agent": null,
						 			"language":   null
								}
							}
						break

					// large structures
						case "player":
							return {
								id: generateRandom(),
								sessionId: null,
								name: null,
								setup: {
									speed: "2",
									strength: "2",
									laser: "2",
									recovery: "2",
									vision: "2"
								},
								status: {
									team: chooseRandom(getAsset("constants").teams),
									controls: "keys",
									energy: 100,
									position: {
										x: 0,
										y: 0,
										a: 0,
									},
									velocity: {
										x: 0,
										y: 0,
										a: 0
									},
									acceleration: {
										x: 0,
										y: 0,
										a: 0
									},
									cooldowns: {
										teleport: 0
									},
									sfx: {
										collisionOpponentLaser: false,
										collisionAllyLaser: false,
										collisionPlayer: false,
										collisionWall: false,
										collisionObstacle: false,
										collisionTeleporter: false,
										collisionOrb: false,
										dropOrb: false,
										moving: false,
										shootingLaser: false,
										laserHitting: false,
										noEnergy: false,
										taggedIt: false
									}
								},
								keys: {
									up: false,
									right: false,
									down: false,
									left: false,
									space: false,
									cw: false,
									ccw: false
								},
								laser: [],
								options: {
									color: null,
									fontSize: 10,
									textOpacity: 0.5,
									size: 50,
									roundness: 50,
									friction: [0, 3, 4, 5],
									angularFriction: 3,
									maximumVelocity: [0, 12, 16, 20],
									maximumAngularVelocity: 5,
									acceleration: [0, 4, 5, 6],
									angularAcceleration: 5,
									bump: [0, 1, 2, 3],
									teleportCooldown: 40,
									invincibilityCooldown: 100,
									maximumEnergy: 100,
									energyRecharge: [0, 1, 2, 3],
									minimumEnergyForLaser: 25,
									minimumEnergyFromDamage: 0,
									laserEnergy: [0, 3, 4, 5],
									laserUseEnergy: 3,
									laserDissipation: [1, 0.5, 0.25, 0],
									laserAttackMultiplier: 2,
									visionTopToBottom: 3,
									visionRightToLeft: 1,
									visionZoom: 1,
									visibility: [0, 5, 6, 7],
									desaturatedOpacity: 0.5
								}
							}
						break

						case "game":
							var colors = getAsset("colors")
							return {
								id: generateRandom(null, getAsset("constants").gameIdLength).toLowerCase(),
								created: new Date().getTime(),
								updated: new Date().getTime(),
								status: {
									startTime: null,
									endTime: null,
									timeRemaining: null,
									mode: null,
									message: null,
									messageTimeRemaining: null
								},
								setup: {
									mode: "capture_the_hat",
									time: "180000",
									size: "2,2",
									mirrors: "10",
									windows: "10",
									teleporters: "2",
									obstacles: "10"
								},
								map: {
									wallCells: [],
									spaceCells: [],
									options: {
										backgroundImage: "background",
										backgroundOpacity: 0.75,
										background: colors["medium-gray"],
										special: colors["dark-gray"],
										cellsize: 100,
										text: {
											fontSize: 25,
											color: colors["light-gray"],
											opacity: 0.5,
											xOffset: 0.5,
											yOffset: 0.95
										},
										time: {
											fontSize: 25,
											color: colors["light-gray"],
											opacity: 0.5,
											xOffset: 0.1,
											yOffset: 0.95
										},
										score: {
											fontSize: 25,
											color: colors["light-gray"],
											opacity: 0.5,
											xOffset: 0.9,
											yOffset: 0.95
										},
										rooms: {
											x: 0,
											y: 0
										},
										cells: {
											x: 0,
											y: 0
										},
										shadow: {
											angle: 1 / 2,
											step: 1 / 100,
											color: colors["dark-gray"],
											opacity: 0.2,
											blur: 2
										},
										edgeDetection: 1,
										exterior: {
											name: "wall",
											color: colors["dark-gray"],
											size: 100,
											roundness: 0,
											count: 1,
											opacity: 1
										},
										wall: {
											name: "wall",
											color: colors["dark-gray"],
											roundness: 5,
											size: 100,
											opacity: 1
										},
										window: {
											name: "window",
											color: colors["light-blue"],
											roundness: 5,
											size: 100,
											count: 0,
											opacity: 0.5
										},
										mirror: {
											name: "mirror",
											color: colors["light-gray"],
											roundness: 5,
											size: 100,
											count: 0,
											opacity: 1
										},
										teleporter: {
											name: "teleporter",
											color: colors["light-orange"],
											image: "teleporter",
											roundness: 48,
											size: 70,
											count: 0,
											opacity: 0.5
										},
										obstacle: {
											name: "obstacle",
											color: colors["dark-purple"],
											image: "obstacle",
											roundness: 48,
											size: 90,
											count: 0,
											opacity: 1
										},
										spawner: {
											name: "spawner",
											color: null,
											roundness: 50,
											size: 0,
											count: 6,
											opacity: 0
										},
										orb: {
											name: "orb",
											color: colors["dark-gray"],
											image: "orb",
											roundness: 50,
											size: 20,
											count: 10,
											opacity: 1
										}
									},
									grid: []
								},
								items: [],
								players: {},
								spectators: {}
							}
						break

					// other
						default:
							return null
						break
				}
			}
			catch (error) {
				logError(error)
				return false
			}
		}

	/* getAsset */
		module.exports.getAsset = getAsset
		function getAsset(index) {
			try {
				switch (index) {
					// web
						case "title":
							return "MazerTag"
						break
						case "logo":
							return `<link rel="shortcut icon" href="logo.png"/>`
						break
						case "meta":
							return `<meta charset="UTF-8"/>
									<meta name="description" content="MazerTag is a multiplayer top-down arcade game by James Mayr. Audio by Alex Berg. Visuals by Liz Ford."/>
									<meta name="author" content="James Mayr"/>
									<meta property="og:title" content="MazerTag"/>
									<meta property="og:url" content="https://mazertag.herokuapp.com/"/>
									<meta property="og:description" content="MazerTag is a multiplayer top-down arcade game by James Mayr. Audio by Alex Berg. Visuals by Liz Ford."/>
									<meta property="og:image" content="https://mazertag.herokuapp.com/banner.png"/>
									<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0"/>`
						break
						case "fonts":
							return `<link href="https://fonts.googleapis.com/css?family=Questrial&display=swap" rel="stylesheet">`
						break
						case "css-variables":
							// output
								var output = ""

							// colors
								var colors = getAsset("colors")
								for (var i in colors) {
									output += ("--" + i + ": " + colors[i] + "; ")
								}

							// sizes
								var sizes = getAsset("sizes")
								for (var i in sizes) {
									output += ("--" + i + ": " + sizes[i] + "; ")
								}

							// fonts
								var fonts = getAsset("fonts")
									fonts = fonts.slice(fonts.indexOf("family=") + 7, fonts.indexOf("&display="))
									fonts = fonts.split("|")
								for (var i in fonts) {
									output += ("--font-" + i + ": '" + fonts[i].replace(/\+/i, " ") + "', sans-serif; ")
								}

							// return data
								return `<style>:root {` + 
									output +
									`}</style>`
						break

						case "colors":
							return {
								"light-gray": "#dddddd",
								"medium-gray": "#555555",
								"dark-gray": "#111111",
								"light-red": "#ddaaaa",
								"medium-red": "#aa5555",
								"dark-red": "#551111",
								"light-orange": "#ddaa77",
								"medium-orange": "#aa7755",
								"dark-orange": "#775511",
								"light-yellow": "#ddddaa",
								"medium-yellow": "#aaaa55",
								"dark-yellow": "#555511",
								"light-green": "#aaddaa",
								"medium-green": "#55aa55",
								"dark-green": "#115511",
								"light-blue": "#aaaadd",
								"medium-blue": "#5555aa",
								"dark-blue": "#111155",
								"light-purple": "#ddaadd",
								"medium-purple": "#aa55aa",
								"dark-purple": "#551155",
							}
						break

						case "sizes":
							return {
								"shadow-size": "5px",
								"border-radius": "20px",
								"blur-size": "5px",
								"border-size": "2px",
								"small-gap-size": "5px",
								"medium-gap-size": "10px",
								"large-gap-size": "20px",
								"small-font-size": "15px",
								"medium-font-size": "20px",
								"large-font-size": "35px",
								"huge-font-size": "50px",
								"card-size": "80px",
								"transition-time": "1s"
							}
						break

						case "audio":
							return [
								// soundName_msUntilChange_msToFadeOut_version
								"musicMenu",
								"musicGame",
								"collisionAllyLaser_1000_0_1",
								"collisionObstacle",
								"collisionOpponentLaser_1000_0_1",
								"collisionOrb",
								"collisionPlayer",
								"collisionTeleporter",
								"collisionWall",
								"dropOrb",
								"laserHitting_160_0_1",
								"laserHitting_160_0_2",
								"laserHitting_160_0_3",
								"laserHitting_160_0_4",
								"moving_400_0_1",
								"moving_400_0_2",
								"moving_400_0_3",
								"moving_400_0_4",
								"noEnergy",
								"shootingLaser_0_100_1",
								"shootingLaser_0_100_2",
								"taggedIt"
							]
						break

						case "images":
							return [
								"background",
								"obstacle",
								"orb",
								"teleporter"
							]
						break

						case "constants":
							return {
								minute: 60000,
								second: 1000,
								cookieLength: 1000 * 60 * 60 * 24 * 7,
								loopTime: 50,
								gameLaunchDelay: 5000,
								messageDuration: 3000,
								minimumPlayers: 2,
								maximumPlayers: 8,
								gameTime: 1000 * 60 * 3,
								circleRadians: Math.PI * 2,
								circleDegrees: 360,
								radiansConversion: Math.PI / 180,
								radical2: Math.pow(2, (1 / 2)),
								templateSize: 10,
								rounding: 100,
								minimumNameLength: 3,
								maximumNameLength: 15,
								gameIdLength: 4,
								maximumLaserSegments: 100,
								teams: ["red", "orange", "yellow", "green", "blue", "purple"],
								controls: ["keys", "mouse"],
								minimumStatisticValue: 1,
								maximumStatisticValue: 3,
								maximumTotalStatisticValue: 10,
								keys: ["up", "right", "down", "left", "space", "cw", "ccw"]
							}
						break

						case "roomTemplates":
							return [
								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,1,1,1,1,0,0,0]	,
									[0,0,0,1,1,1,1,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,1,1,1,1,0,0,0]	,
									[0,0,0,1,1,1,1,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,1,1,1,1,0,0,0]	,
									[0,0,0,1,1,1,1,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,1,1,0,0,0,1]	,
									[0,0,0,1,1,1,1,0,0,0]	,
									[0,0,0,1,1,1,1,0,0,0]	,
									[1,0,0,0,1,1,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,1,1,1,1,1,1,0,0]	,
									[0,0,1,1,1,1,1,1,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,1,1,1,1,1,1,0,0]	,
									[0,0,1,1,1,1,1,1,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,1,1,0,0,0,1]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,1,1,1,1,1,1,0,0]	,
									[0,0,1,1,1,1,1,1,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[1,0,0,0,1,1,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,1,1,0,0,0,1]	,
									[1,0,0,0,1,1,0,0,0,1]	,
									[0,0,1,1,1,1,1,1,0,0]	,
									[0,0,1,1,1,1,1,1,0,0]	,
									[1,0,0,0,1,1,0,0,0,1]	,
									[1,0,0,0,1,1,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,1,1,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,1,1,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,1,1,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,1,1,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,0,1,1,0,1,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,1,0,1,1,0,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,0,1,1,0,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[0,0,1,0,1,1,0,1,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,0,1,1,0,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,1,0,0,1,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,1,0,0,1,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,1,0,0,1,0,0,1]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[1,0,0,1,0,0,1,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,1,0,0,1,0,0,1]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[1,0,0,1,0,0,1,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[0,0,0,0,1,1,0,0,0,0]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,1,1,1,1,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,1,1,1,1,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,1,1,1,1,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,1,1,1,1,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,1,1,1,1,0,0,1]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[1,0,0,1,1,1,1,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,1,1,1,1,0,0,1]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[1,0,0,1,1,1,1,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,0,1,0,0,1,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,1,0,0,1,0,0,1]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,1,0,0,1,1,0,0]	,
									[1,0,0,1,0,0,1,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,0,1,0,0,1,0,0,1]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[1,0,1,1,0,0,1,1,0,1]	,
									[1,0,0,1,0,0,1,0,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,1,0,1,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,0,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,0,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,1,0,1,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,1,1,1,0,1,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,0,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,0,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,1,0,1,1,1,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,1,1,0,1,1,0,1]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,0,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,0,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[1,0,1,1,0,1,1,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,1,1,0,1,1,0,1]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[0,0,0,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,0,0,0]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[1,0,1,1,0,1,1,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,0,1,1,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,1,1,0,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,1,1,0,1,1,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,1,1,0,1,1,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,1,0,1,1,1,0,1]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[1,0,1,1,1,0,1,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,1,0,1,1,1,0,1]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[0,0,1,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,1,0,0]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[1,0,1,1,1,0,1,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,1,1,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,1,1,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,1,1,1,1,1,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,1,1,1,1,1,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,1,1,1,1,1,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,1,1,1,1,1,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,1,1,1,1,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,1,1,1,1,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],


								[	[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,0,0,0,0,0,0,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	],

								[	[1,1,0,0,0,0,0,0,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,0,0,0,0,0,0,1,1]	],

								[	[1,1,1,0,0,0,0,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,0,0,0,0,1,1,1]	],

								[	[1,1,1,1,0,0,1,1,1,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[0,0,1,0,0,0,0,1,0,0]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[1,0,1,0,0,0,0,1,0,1]	,
									[1,0,0,0,0,0,0,0,0,1]	,
									[1,1,1,1,0,0,1,1,1,1]	],
							]
						break

						case "mapSetup":
							var constants = getAsset("constants")
							return {
								mode: [
									{value: "classic_tag", name: "classic tag", description: "If you're \"it\", bump or zap someone to make them \"it\". Whoever's \"it\" when time runs out loses."},
									{value: "team_freeze_tag", name: "team freeze tag", description: "Zap opponents to freeze them in place. Zap allies to unfreeze them. Win by freezing all other teams."},
									{value: "capture_the_hat", name: "capture the hat", description: "Find the hat - or whoever has it. Then run into the shadows and hold it until time runs out."},
									{value: "team_battle", name: "team battle", description: "Zap someone down to 0 to get a point for your team. The team with the most points wins."},
									{value: "collect_the_orbs", name: "collect the orbs", description: "Zap or run into orbs to earn a point for your team. The team with the most points wins."}
								],
								time: [
									{value: String(constants.minute * 1), name: "short (1 minute)"},
									{value: String(constants.minute * 3), name: "medium (3 minutes)"},
									{value: String(constants.minute * 5), name: "long (5 minutes)"},
									{value: String(constants.minute * 10), name: "marathon (10 minutes)"},
								],
								size: [
									{value: "1,1", name: "tiny (1x1)"},
									{value: "2,2", name: "small (2x2)"},
									{value: "3,2", name: "medium (3x2)"},
									{value: "3,3", name: "large (3x3)"}
								],
								windows: [
									{value: "0", name: "none (0)"},
									{value: "10", name: "few (10)"},
									{value: "20", name: "some (20)"},
									{value: "30", name: "many (30)"},
									{value: "40", name: "lots (40)"}
								],
								mirrors: [
									{value: "0", name: "none (0)"},
									{value: "10", name: "few (10)"},
									{value: "20", name: "some (20)"},
									{value: "30", name: "many (30)"},
									{value: "40", name: "lots (40)"}
								],
								teleporters: [
									{value: "0", name: "none (0)"},
									{value: "2", name: "few (2)"},
									{value: "3", name: "some (3)"},
									{value: "4", name: "many (4)"},
									{value: "5", name: "lots (5)"}
								],
								obstacles: [
									{value: "0", name: "none (0)"},
									{value: "5", name: "few (5)"},
									{value: "10", name: "some (10)"},
									{value: "15", name: "many (15)"},
									{value: "20", name: "lots (20)"}
								]
							}
						break

					// other
						default:
							return null
						break
				}
			}
			catch (error) {
				logError(error)
				return false
			}
		}

/*** checks ***/
	/* isNumLet */
		module.exports.isNumLet = isNumLet
		function isNumLet(string) {
			try {
				return (/^[a-zA-Z0-9]+$/).test(string)
			}
			catch (error) {
				logError(error)
				return false
			}
		}

/*** tools ***/
	/* renderHTML */
		module.exports.renderHTML = renderHTML
		function renderHTML(REQUEST, path, callback) {
			try {
				var html = {}
				FS.readFile(path, "utf8", function (error, file) {
					if (error) {
						logError(error)
						callback("")
						return
					}
					
					html.original = file
					html.array = html.original.split(/<script\snode>|<\/script>node>/gi)

					for (html.count = 1; html.count < html.array.length; html.count += 2) {
						try {
							html.temp = eval(html.array[html.count])
						}
						catch (error) {
							html.temp = ""
							logError("<sn>" + Math.ceil(html.count / 2) + "</sn>\n" + error)
						}
						html.array[html.count] = html.temp
					}

					callback(html.array.join(""))
				})
			}
			catch (error) {
				logError(error)
				callback("")
			}
		}

	/* constructHeaders */
		module.exports.constructHeaders = constructHeaders
		function constructHeaders(REQUEST) {
			try {
				// asset
					if (REQUEST.method == "GET" && (REQUEST.fileType || !REQUEST.session)) {
						return  {
							"Content-Type": REQUEST.contentType
						}
					}

				// get
					if (REQUEST.method == "GET") {
						return  {
							"Set-Cookie": ("session=" + REQUEST.session.id + "; expires=" + (new Date(new Date().getTime() + ENVIRONMENT.cookieLength).toUTCString()) + "; path=/; domain=" + ENVIRONMENT.domain),
							"Content-Type": "text/html; charset=utf-8"
						}
					}

				// post
					else if (REQUEST.method == "POST") {
						return {
							"Content-Type": "application/json"
						}
					}
			}
			catch (error) {
				logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

	/* duplicateObject */
		module.exports.duplicateObject = duplicateObject
		function duplicateObject(object) {
			try {
				return JSON.parse(JSON.stringify(object))
			}
			catch (error) {
				logError(error)
				return null
			}
		}

/*** randoms ***/
	/* generateRandom */
		module.exports.generateRandom = generateRandom
		function generateRandom(set, length) {
			try {
				set = set || "abcdefghijklmnopqrstuvwxyz"
				length = length || 16
				
				var output = ""
				for (var i = 0; i < length; i++) {
					output += (set[Math.floor(Math.random() * set.length)])
				}

				return output
			}
			catch (error) {
				logError(error)
				return null
			}
		}

	/* chooseRandom */
		module.exports.chooseRandom = chooseRandom
		function chooseRandom(options) {
			try {
				if (!Array.isArray(options)) {
					return false
				}
				
				return options[Math.floor(Math.random() * options.length)]
			}
			catch (error) {
				logError(error)
				return false
			}
		}

	/* sortRandom */
		module.exports.sortRandom = sortRandom
		function sortRandom(input) {
			try {
				// duplicate array
					var array = []
					for (var i in input) {
						array[i] = input[i]
					}

				// fisher-yates shuffle
					var x = array.length
					while (x > 0) {
						var y = Math.floor(Math.random() * x)
						x = x - 1
						var temp = array[x]
						array[x] = array[y]
						array[y] = temp
					}

				return array
			}
			catch (error) {
				logError(error)
				return false
			}
		}

/*** database ***/
	/* accessDatabase */
		module.exports.accessDatabase = accessDatabase
		function accessDatabase(query, callback) {
			try {
				// no query?
					if (!query) {
						if (typeof ENVIRONMENT.db !== "object") {
							callback({success: false, message: "invalid database"})
							return
						}
						callback(ENVIRONMENT.db)
						return
					}

				// log
					// logMessage("db: " + query.command + " " + query.collection)

				// fake database?
					if (!ENVIRONMENT.db) {
						logError("database not found")
						callback({success: false, message: "database not found"})
						return
					}

				// collection
					if (!ENVIRONMENT.db[query.collection]) {
						logError("collection not found")
						callback({success: false, message: "collection not found"})
						return
					}

				// find
					if (query.command == "find") {
						// all documents
							var documentKeys = Object.keys(ENVIRONMENT.db[query.collection])

						// apply filters
							var filters = Object.keys(query.filters)
							for (var f in filters) {
								var property = filters[f]
								var filter = query.filters[property]

								if (filter instanceof RegExp) {
									documentKeys = documentKeys.filter(function(key) {
										return filter.test(ENVIRONMENT.db[query.collection][key][property])
									})
								}
								else {
									documentKeys = documentKeys.filter(function(key) {
										return filter == ENVIRONMENT.db[query.collection][key][property]
									})
								}
							}

						// get documents
							var documents = []
							for (var d in documentKeys) {
								documents.push(duplicateObject(ENVIRONMENT.db[query.collection][documentKeys[d]]))
							}

						// no documents
							if (!documents.length) {
								callback({success: false, count: 0, documents: []})
								return
							}

						// yes documents
							callback({success: true, count: documentKeys.length, documents: documents})
							return
					}

				// insert
					if (query.command == "insert") {
						// unique id
							do {
								var id = generateRandom()
							}
							while (ENVIRONMENT.db[query.collection][id])

						// insert document
							ENVIRONMENT.db[query.collection][id] = duplicateObject(query.document)

						// return document
							callback({success: true, count: 1, documents: [query.document]})
							return
					}

				// update
					if (query.command == "update") {
						// all documents
							var documentKeys = Object.keys(ENVIRONMENT.db[query.collection])

						// apply filters
							var filters = Object.keys(query.filters)
							for (var f in filters) {
								documentKeys = documentKeys.filter(function(key) {
									return ENVIRONMENT.db[query.collection][key][filters[f]] == query.filters[filters[f]]
								})
							}

						// update keys
							var updateKeys = Object.keys(query.document)

						// update
							for (var d in documentKeys) {
								var document = ENVIRONMENT.db[query.collection][documentKeys[d]]

								for (var u in updateKeys) {
									document[updateKeys[u]] = query.document[updateKeys[u]]
								}
							}

						// update documents
							var documents = []
							for (var d in documentKeys) {
								documents.push(duplicateObject(ENVIRONMENT.db[query.collection][documentKeys[d]]))
							}

						// no documents
							if (!documents.length) {
								callback({success: false, count: 0, documents: []})
								return
							}

						// yes documents
							callback({success: true, count: documentKeys.length, documents: documents})
							return
					}

				// delete
					if (query.command == "delete") {
						// all documents
							var documentKeys = Object.keys(ENVIRONMENT.db[query.collection])

						// apply filters
							var filters = Object.keys(query.filters)
							for (var f in filters) {
								documentKeys = documentKeys.filter(function(key) {
									return ENVIRONMENT.db[query.collection][key][filters[f]] == query.filters[filters[f]]
								})
							}

						// delete
							for (var d in documentKeys) {
								delete ENVIRONMENT.db[query.collection][documentKeys[d]]
							}

						// no documents
							if (!documentKeys.length) {
								callback({success: false, count: 0})
							}

						// yes documents
							callback({success: true, count: documentKeys.length})
							return
					}
			}
			catch (error) {
				logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}
