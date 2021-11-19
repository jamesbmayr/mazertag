window.addEventListener("load", function() {
	/*** globals ***/
		/* triggers */
			window.TRIGGERS = {
				submit: "submit",
				change: "change",
				input: "input",
				focus: "focus",
				blur: "blur",
				resize: "resize",
				keydown: "keydown",
				keyup: "keyup"
			}
			if ((/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i).test(navigator.userAgent)) {
				window.TRIGGERS.click = "touchstart"
				window.TRIGGERS.mousedown = "touchstart"
				window.TRIGGERS.mousemove = "touchmove"
				window.TRIGGERS.mouseup = "touchend"
				window.TRIGGERS.mouseenter = "touchstart"
				window.TRIGGERS.mouseleave = "touchend"
				window.TRIGGERS.rightclick = "contextmenu"
			}
			else {
				window.TRIGGERS.click = "click"
				window.TRIGGERS.mousedown = "mousedown"
				window.TRIGGERS.mousemove = "mousemove"
				window.TRIGGERS.mouseup = "mouseup"
				window.TRIGGERS.mouseenter = "mouseenter"
				window.TRIGGERS.mouseleave = "mouseleave"
				window.TRIGGERS.rightclick = "contextmenu"
			}

		/* defaults */
			document.addEventListener("dblclick", function(event) {
				event.preventDefault()
			})

			document.addEventListener("contextmenu", function(event) {
				event.preventDefault()
			})
	
		/* elements */
			var ELEMENTS = {
				body: document.body,
				canvas: document.querySelector("#map"),
				context: document.querySelector("#map").getContext("2d"),
				setup: {
					element: document.querySelector("#setup"),
					launch: document.querySelector("#setup-launch"),
					descriptions: document.querySelector("#setup-descriptions"),
					game: {
						mode: document.querySelector("#setup-game-mode"),
						time: document.querySelector("#setup-game-time"),
						size: document.querySelector("#setup-game-size"),
						windows: document.querySelector("#setup-game-windows"),
						mirrors: document.querySelector("#setup-game-mirrors"),
						teleporters: document.querySelector("#setup-game-teleporters"),
						obstacles: document.querySelector("#setup-game-obstacles")
					},
					players: {
						element: document.querySelector("#setup-players")
					}
				},
				mobileControlsContainer: document.querySelector("#mobile-controls"),
				mobileControls: {
					"up-left": document.querySelector("#mobile-controls-up-left"),
					"up": document.querySelector("#mobile-controls-up"),
					"up-right": document.querySelector("#mobile-controls-up-right"),
					"left": document.querySelector("#mobile-controls-left"),
					"right": document.querySelector("#mobile-controls-right"),
					"down-left": document.querySelector("#mobile-controls-down-left"),
					"down": document.querySelector("#mobile-controls-down"),
					"down-right": document.querySelector("#mobile-controls-down-right"),
					"ccw": document.querySelector("#mobile-controls-ccw"),
					"space": document.querySelector("#mobile-controls-space"),
					"cw": document.querySelector("#mobile-controls-cw")
				},
				audio: {},
				images: {}
			}
			window.ELEMENTS = ELEMENTS

		/* constants */
			var CONSTANTS = {
				second: 1000,
				circleRadians: Math.PI * 2,
				circleDegrees: 360,
				radiansConversion: Math.PI / 180,
				loopTime: 50,
				fadeTime: 1000,
				rounding: 100,
				reflectionWedgeWidth: 2,
				maximumReflections: 4,
				observerZoom: 0.2,
				audioVolume: 0.6,
				mouseThreshold: 100
			}

		/* game */
			var INTERACTED = false
			var MOUSE = {
				x: null,
				y: null,
				a: null
			}

			var PLAYERID = null
			var GAME = null
			var GAMELOOP = setInterval(displayGame, CONSTANTS.loopTime)

	/*** tools ***/
		/* showToast */
			window.TOASTTIME = null
			function showToast(data) {
				try {
					// clear existing countdowns
						if (window.TOASTTIME) {
							clearTimeout(window.TOASTTIME)
							window.TOASTTIME = null
						}

					// append
						if (!window.TOAST) {
							window.TOAST = document.createElement("div")
							window.TOAST.id = "toast"
							window.TOAST.setAttribute("visibility", false)
							window.TOAST.setAttribute("success", false)
							document.body.appendChild(window.TOAST)
						}

					// show
						window.TOAST.innerHTML = data.message
						window.TOAST.setAttribute("success", data.success || false)
						window.TOAST.setAttribute("visibility", true)

					// hide
						window.TOASTTIME = setTimeout(function() {
							window.TOAST.setAttribute("visibility", false)
						}, 5000)
				} catch (error) {console.log(error)}
			}

	/*** socket ***/
		/* start */
			var SOCKET = null
			var SOCKETCHECK = null
			checkSocket()

		/* checkSocket */
			function checkSocket() {
				createSocket()
				SOCKETCHECK = setInterval(function() {
					try {
						if (!SOCKET) {
							try {
								createSocket()
							}
							catch (error) {console.log(error)}
						}
						else {
							clearInterval(SOCKETCHECK)
						}
					}
					catch (error) {console.log(error)}
				}, 5000)
			}

		/* createSocket */
			function createSocket() {
				try {
					SOCKET = new WebSocket(location.href.replace("http","ws"))
					SOCKET.onopen = function() {
						SOCKET.send(null)
					}
					SOCKET.onerror = function(error) {
						showToast({success: false, message: error})
					}
					SOCKET.onclose = function() {
						showToast({success: false, message: "disconnected"})
						SOCKET = null
						checkSocket()
					}
					SOCKET.onmessage = function(message) {
						try {
							var post = JSON.parse(message.data)
							if (post && (typeof post == "object")) {
								receiveSocket(post)
							}
						}
						catch (error) {console.log(error)}
					}
				}
				catch (error) {console.log(error)}
			}

		/* receiveSocket */
			function receiveSocket(data) {
				try {
					// meta
						// redirect
							if (data.location) {
								window.location = data.location
								return
							}
							
						// failure
							if (!data || !data.success) {
								showToast({success: false, message: data.message || "unknown websocket error"})
								return
							}

						// toast
							if (data.message) {
								showToast(data)
							}

					// data
						// player id
							if (data.playerId !== undefined) {
								PLAYERID = data.playerId
								if (!PLAYERID) {
									ELEMENTS.mobileControlsContainer.setAttribute("visibility", false)
								}
							}

						// audio
							if (data.audio) {
								preloadAudio(data.audio)
							}

						// image
							if (data.images) {
								preloadImages(data.images)
							}

						// launch
							if (data.launch) {
								ELEMENTS.body.setAttribute("mode", "game")
							}

						// game data
							if (data.game) {
								receiveGame(data.game)
							}
				} catch (error) {console.log(error)}
			}

	/*** game ***/
		/* receiveGame */
			function receiveGame(data) {
				try {
					// no game yet
						if (!GAME) {
							GAME = data

							return
						}

					// update status
						if (data.status) {
							GAME.status = data.status

							if (!data.status.startTime) {
								ELEMENTS.body.setAttribute("mode", "setup")
							}

							if (data.status.endTime) {
								ELEMENTS.body.setAttribute("mode", "gameover")
							}
						}

					// update setup
						if (data.setup) {
							GAME.setup = data.setup
						}

					// update grid / options
						if (data.map) {
							GAME.map = data.map
						}

					// update items
						if (data.items) {
							GAME.items = data.items
						}

					// update players
						if (data.players) {
							GAME.players = data.players
						}
				} catch (error) {console.log(error)}
			}

		/* displayGame */
			function displayGame() {
				try {
					// no game
						if (!GAME) {
							return
						}
						
					// not started
						if (!GAME.status.startTime) {
							displayMenu(GAME, GAME.players[PLAYERID])
							return
						}

					// draw canvas
						drawGame(ELEMENTS.canvas, ELEMENTS.context, GAME, GAME.players[PLAYERID])

					// update sounds
						updateSFX(GAME, GAME.players[PLAYERID])

					// angle
						if (PLAYERID && GAME.players[PLAYERID].status.controls == "mouse") {
							if (MOUSE.a == -1) {
								SOCKET.send(JSON.stringify({action: "liftKey", playerId: PLAYERID, gameId: GAME.id, key: "cw"}))
								SOCKET.send(JSON.stringify({action: "pressKey", playerId: PLAYERID, gameId: GAME.id, key: "ccw"}))
							}
							else if (MOUSE.a == 1) {
								SOCKET.send(JSON.stringify({action: "liftKey", playerId: PLAYERID, gameId: GAME.id, key: "ccw"}))
								SOCKET.send(JSON.stringify({action: "pressKey", playerId: PLAYERID, gameId: GAME.id, key: "cw"}))
							}
							else {
								SOCKET.send(JSON.stringify({action: "liftKey", playerId: PLAYERID, gameId: GAME.id, key: "cw"}))
								SOCKET.send(JSON.stringify({action: "liftKey", playerId: PLAYERID, gameId: GAME.id, key: "ccw"}))
							}
						}

					// done
						if (GAME.status.endTime) {
							clearInterval(GAMELOOP)

							// stop sfx / game music
								if (INTERACTED) {
									for (var i in ELEMENTS.audio) {
										for (var j in ELEMENTS.audio[i].tracks) {
											ELEMENTS.audio[i].tracks[j].pause()
										}
									}

									ELEMENTS.audio.musicMenu.tracks._1.play()
								}
						}
				} catch (error) {console.log(error)}
			}

		/* displayMenu */
			function displayMenu(game, player) {
				try {
					// update all setup fields (except focused)
						for (var i in ELEMENTS.setup.game) {
							if (ELEMENTS.setup.game[i] !== document.activeElement) {
								ELEMENTS.setup.game[i].value = game.setup[i]

								if (i == "mode") {
									ELEMENTS.setup.descriptions.querySelectorAll(".setup-description").forEach(function(element) {
										element.setAttribute("visibility", false)
									})
									
									ELEMENTS.setup.descriptions.querySelector("#setup-description-" + game.setup[i]).setAttribute("visibility", true)
								}
							}
						}

					// loop through players
						for (var i in game.players) {
							var thatPlayer = game.players[i]
							var playerElement = ELEMENTS.setup.players[i] || createPlayerMenu(thatPlayer)

							if (playerElement.name !== document.activeElement) {
								playerElement.name.value = thatPlayer.name
							}

							playerElement.element.setAttribute("team", thatPlayer.status.team)
							if (playerElement.team !== document.activeElement) {
								playerElement.team.value = thatPlayer.status.team
							}

							if (playerElement.controls !== document.activeElement) {
								playerElement.controls.value = thatPlayer.status.controls
							}

							playerElement.bar.setAttribute("statistics", JSON.stringify({
								speed: thatPlayer.setup.speed,
								strength: thatPlayer.setup.strength,
								laser: thatPlayer.setup.laser,
								recovery: thatPlayer.setup.recovery,
								vision: thatPlayer.setup.vision
							}))
							
							if (!document.activeElement || document.activeElement.className !== "setup-player-dragger") {
								playerElement.bar.querySelectorAll(".setup-player-minibar").forEach(function(element) {
									element.style.width = (thatPlayer.setup[element.getAttribute("statistic")] * 10) + "%"
								})
							}
						}

					// play menu music
						if (INTERACTED) {
							if (ELEMENTS.audio.musicMenu && ELEMENTS.audio.musicMenu.tracks._1.paused) {
								ELEMENTS.audio.musicMenu.tracks._1.play()
							}
						}
				} catch (error) {console.log(error)}
			}

		/* createPlayerMenu */
			function createPlayerMenu(player) {
				try {
					// container
						var playerElement = document.createElement("div")
							playerElement.id = "setup-player-" + player.id
							playerElement.className = "setup-player"
						ELEMENTS.setup.players[player.id] = {
							element: playerElement
						}
						ELEMENTS.setup.players.element.appendChild(playerElement)

					// name
						var nameLabel = document.createElement("label")
							nameLabel.className = "setup-row"
						playerElement.appendChild(nameLabel)

						var nameSpan = document.createElement("span")
							nameSpan.innerText = "name"
						nameLabel.appendChild(nameSpan)

						var nameInput = document.createElement("input")
							nameInput.className = "setup-input"
							nameInput.type = "text"
							nameInput.placeholder = "name"
							nameInput.id = "setup-player-" + player.id + "-name"
							if (player.id !== PLAYERID) { nameInput.setAttribute("readonly", true) }
							else { nameInput.addEventListener("change", updateOption) }
						nameLabel.appendChild(nameInput)
						ELEMENTS.setup.players[player.id].name = nameInput

					// team
						var teamLabel = document.createElement("label")
							teamLabel.className = "setup-row"
						playerElement.appendChild(teamLabel)

						var teamSpan = document.createElement("span")
							teamSpan.innerText = "team"
						teamLabel.appendChild(teamSpan)

						var teamSelect = document.createElement("select")
							teamSelect.className = "setup-select"
							teamSelect.id = "setup-player-" + player.id + "-team"
							if (player.id !== PLAYERID) { teamSelect.setAttribute("readonly", true) }
							else { teamSelect.addEventListener("input", updateOption) }
						teamLabel.appendChild(teamSelect)
						ELEMENTS.setup.players[player.id].team = teamSelect

						var colors = ["red", "orange", "yellow", "green", "blue", "purple"]
						for (var i in colors) {
							var option = document.createElement("option")
								option.value = option.innerText = colors[i]
							teamSelect.appendChild(option)
						}

					// controls
						var controlsLabel = document.createElement("label")
							controlsLabel.className = "setup-row setup-controls"
						playerElement.appendChild(controlsLabel)

						var controlsSpan = document.createElement("span")
							controlsSpan.innerText = "controls"
						controlsLabel.appendChild(controlsSpan)

						var controlsSelect = document.createElement("select")
							controlsSelect.className = "setup-select"
							controlsSelect.id = "setup-player-" + player.id + "-controls"
							if (player.id !== PLAYERID) { controlsSelect.setAttribute("readonly", true) }
							else { controlsSelect.addEventListener("input", updateOption) }
						controlsLabel.appendChild(controlsSelect)
						ELEMENTS.setup.players[player.id].controls = controlsSelect

						var option = document.createElement("option")
							option.value = "keys"
							option.innerText = "keys only"
						controlsSelect.appendChild(option)

						var option = document.createElement("option")
							option.value = "mouse"
							option.innerText = "keys + mouse"
						controlsSelect.appendChild(option)

						var fakeSelect = document.createElement("select")
							fakeSelect.className = "setup-select setup-fake"
							fakeSelect.setAttribute("readonly", true)
						controlsLabel.appendChild(fakeSelect)

						var fakeOption = document.createElement("option")
							fakeOption.value = null
							fakeOption.innerText = "on-screen buttons"
						fakeSelect.appendChild(fakeOption)

					// stats
						var notches = document.createElement("div")
							notches.className = "setup-player-notches"
						playerElement.appendChild(notches)

						for (var i = 0; i < 9; i++) {
							var notch = document.createElement("div")
								notch.className = "setup-player-notch"
							notches.appendChild(notch)
						}

						var bar = document.createElement("div")
							bar.className = "setup-player-bar"
							bar.setAttribute("statistics", "")
						playerElement.appendChild(bar)
						ELEMENTS.setup.players[player.id].bar = bar

						var stats = ["speed", "strength", "laser", "recovery", "vision"]
						for (var i = 0; i < stats.length; i++) {
							var minibar = document.createElement("div")
								minibar.className = "setup-player-minibar"
								minibar.setAttribute("statistic", stats[i])
								minibar.innerText = stats[i]
							bar.appendChild(minibar)

							if (player.id == PLAYERID && i < stats.length - 1) {
								var dragger = document.createElement("div")
									dragger.className = "setup-player-dragger"
									dragger.setAttribute("statistics", stats[i] + "," + stats[i + 1])
									dragger.setAttribute("tabindex", 0)
									dragger.addEventListener(TRIGGERS.mousedown, startDragging)
								bar.appendChild(dragger)
							}
						}

					// return
						return ELEMENTS.setup.players[player.id]
				} catch (error) {console.log(error)}
			}
	
	/*** interaction ***/
		/* startDragging */
			function startDragging(event) {
				try {
					// set interacted
						INTERACTED = true

					// not dragger
						if (event.target.className !== "setup-player-dragger") {
							return
						}

					// not a player
						if (!PLAYERID || !GAME.players[PLAYERID]) {
							return false
						}

					// select
						ELEMENTS.dragging = event.target
				} catch (error) {console.log(error)}
			}

		/* moveDragging */
			ELEMENTS.body.addEventListener(TRIGGERS.mousemove, moveDragging)
			function moveDragging(event) {
				try {
					// not dragger
						if (!ELEMENTS.dragging) {
							return
						}

					// not a player
						if (!PLAYERID || !GAME.players[PLAYERID]) {
							return false
						}

					// get parent
						var parentElement = ELEMENTS.dragging.closest(".setup-player-bar")
						var rect = parentElement.getBoundingClientRect()

					// get coordinate
						var x = event.touches ? event.touches[0].clientX : event.clientX
						var percentage = Math.max(0, Math.min(100, Math.round((x - rect.left) / rect.width * 100)))
						
					// statistics
						var theseStatistics = ELEMENTS.dragging.getAttribute("statistics").split(",")
						var currentStatistics = JSON.parse(parentElement.getAttribute("statistics"))

					// get total before and after
						var beforeTotal = 0
						var afterTotal = 0
						var side = "before"
						for (var i in currentStatistics) {
							if (i == theseStatistics[0] || i == theseStatistics[1]) {
								side = "after"
							}
							else if (side == "before") {
								beforeTotal += Number(currentStatistics[i]) * 10
							}
							else {
								afterTotal += Number(currentStatistics[i]) * 10
							}
						}

					// new values
						var newLeftValue = percentage - beforeTotal
						var newRightValue = 100 - afterTotal - percentage

						if (10 <= newLeftValue  && newLeftValue  <= 30
						 && 10 <= newRightValue && newRightValue <= 30) {
						 	// resize
						 		parentElement.querySelector(".setup-player-minibar[statistic='" + theseStatistics[0] + "']").style.width = (percentage - beforeTotal) + "%"
						 		parentElement.querySelector(".setup-player-minibar[statistic='" + theseStatistics[1] + "']").style.width = (100 - afterTotal - percentage) + "%"
							
							// different?
								newLeftValue  = Math.round(newLeftValue / 10)
								newRightValue = Math.round(newRightValue / 10)

								if (currentStatistics[theseStatistics[0]] !== newLeftValue && currentStatistics[theseStatistics[1]] !== newRightValue) {
									if (newLeftValue < currentStatistics[theseStatistics[0]]) {
										SOCKET.send(JSON.stringify({action: "updateOption", playerId: PLAYERID, gameId: GAME.id, section: "player", field: theseStatistics[0], value: newLeftValue}))
										SOCKET.send(JSON.stringify({action: "updateOption", playerId: PLAYERID, gameId: GAME.id, section: "player", field: theseStatistics[1], value: newRightValue}))
									}
									else {
										SOCKET.send(JSON.stringify({action: "updateOption", playerId: PLAYERID, gameId: GAME.id, section: "player", field: theseStatistics[1], value: newRightValue}))
										SOCKET.send(JSON.stringify({action: "updateOption", playerId: PLAYERID, gameId: GAME.id, section: "player", field: theseStatistics[0], value: newLeftValue}))
									}
								}
						}
				} catch (error) {console.log(error)}
			}

		/* stopDragging */
			ELEMENTS.body.addEventListener(TRIGGERS.mouseup, stopDragging)
			function stopDragging(event) {
				try {
					// not dragger
						if (!ELEMENTS.dragging) {
							return
						}

					// not a player
						if (!PLAYERID || !GAME.players[PLAYERID]) {
							return false
						}

					// unselect
						ELEMENTS.dragging.blur()
						ELEMENTS.dragging = null
				} catch (error) {console.log(error)}
			}

		/* updateOption */
			for (var i in ELEMENTS.setup.game) { ELEMENTS.setup.game[i].addEventListener("input", updateOption) }
			function updateOption(event) {
				try {
					// set interacted
						INTERACTED = true

					// not a player
						if (!PLAYERID || !GAME.players[PLAYERID]) {
							return false
						}

					// get info
						var info = event.target.id.split("-")
						var section = info[1]
						var field = info[info.length - 1]
						var value = event.target.value

					// missing?
						if (!section || !field || value == undefined) {
							return false
						}

					// another player
						if (section == "player" && info[2] !== PLAYERID) {
							return false
						}

					// send update
						SOCKET.send(JSON.stringify({action: "updateOption", playerId: PLAYERID, gameId: GAME.id, section: section, field: field, value: value}))
						event.target.blur()
				} catch (error) {console.log(error)}
			}

		/* launchGame */
			ELEMENTS.setup.launch.addEventListener("submit", launchGame)
			function launchGame(event) {
				try {
					// set interacted
						INTERACTED = true

					// not a player
						if (!PLAYERID || !GAME.players[PLAYERID]) {
							return false
						}

					// send update
						SOCKET.send(JSON.stringify({action: "launchGame", playerId: PLAYERID, gameId: GAME.id}))
				} catch (error) {console.log(error)}
			}

		/* pressKey */
			for (var i in ELEMENTS.mobileControls) { ELEMENTS.mobileControls[i].addEventListener(TRIGGERS.mousedown, pressKey) }
			window.addEventListener(TRIGGERS.keydown, pressKey)
			function pressKey(event) {
				try {
					// set interacted
						INTERACTED = true

					// no game or not started
						if (!GAME || !GAME.status.startTime) {
							return
						}

					// not a player
						if (!PLAYERID || !GAME.players[PLAYERID]) {
							return false
						}

					// button
						if (event.target && event.target.className == "mobile-controls-button") {
							var mobileControls = event.target.id.replace("mobile-controls-", "").split("-")
						}

					// get key
						if ((event.key && (event.key == "ArrowUp" || event.key.toLowerCase() == "w")) || (mobileControls && mobileControls.includes("up"))) {
							SOCKET.send(JSON.stringify({action: "pressKey", playerId: PLAYERID, gameId: GAME.id, key: "up"}))
						}
						if ((event.key && (event.key == "ArrowRight" || event.key.toLowerCase() == "d")) || (mobileControls && mobileControls.includes("right"))) {
							SOCKET.send(JSON.stringify({action: "pressKey", playerId: PLAYERID, gameId: GAME.id, key: "right"}))
						}
						if ((event.key && (event.key == "ArrowDown" || event.key.toLowerCase() == "s")) || (mobileControls && mobileControls.includes("down"))) {
							SOCKET.send(JSON.stringify({action: "pressKey", playerId: PLAYERID, gameId: GAME.id, key: "down"}))
						}
						if ((event.key && (event.key == "ArrowLeft" || event.key.toLowerCase() == "a")) || (mobileControls && mobileControls.includes("left"))) {
							SOCKET.send(JSON.stringify({action: "pressKey", playerId: PLAYERID, gameId: GAME.id, key: "left"}))
						}
						if ((event.key && (event.key == " " || event.code == "Space")) || (mobileControls && mobileControls.includes("space"))) {
							SOCKET.send(JSON.stringify({action: "pressKey", playerId: PLAYERID, gameId: GAME.id, key: "space"}))
						}
						if ((event.key && (event.key == "[" || event.code == "BracketLeft" || event.key == "," || event.code == "Comma" || event.key.toLowerCase() == "z")) || (mobileControls && mobileControls.includes("ccw"))) {
							SOCKET.send(JSON.stringify({action: "pressKey", playerId: PLAYERID, gameId: GAME.id, key: "ccw"}))
						}
						if ((event.key && (event.key == "]" || event.code == "BracketRight" || event.key == "." || event.code == "Period" || event.key.toLowerCase() == "x")) || (mobileControls && mobileControls.includes("cw"))) {
							SOCKET.send(JSON.stringify({action: "pressKey", playerId: PLAYERID, gameId: GAME.id, key: "cw"}))
						}
				} catch (error) {console.log(error)}
			}

		/* liftKey */
			for (var i in ELEMENTS.mobileControls) { ELEMENTS.mobileControls[i].addEventListener(TRIGGERS.mouseup, liftKey) }
			window.addEventListener(TRIGGERS.keyup, liftKey)
			function liftKey(event) {
				try {
					// set interacted
						INTERACTED = true

					// no game or not started
						if (!GAME || !GAME.status.startTime) {
							return
						}

					// not a player
						if (!PLAYERID || !GAME.players[PLAYERID]) {
							return false
						}

					// button
						if (event.target && event.target.className == "mobile-controls-button") {
							var mobileControls = event.target.id.replace("mobile-controls-", "").split("-")
						}

					// get key
						if ((event.key && (event.key == "ArrowUp" || event.key.toLowerCase() == "w")) || (mobileControls && mobileControls.includes("up"))) {
							SOCKET.send(JSON.stringify({action: "liftKey", playerId: PLAYERID, gameId: GAME.id, key: "up"}))
						}
						if ((event.key && (event.key == "ArrowRight" || event.key.toLowerCase() == "d")) || (mobileControls && mobileControls.includes("right"))) {
							SOCKET.send(JSON.stringify({action: "liftKey", playerId: PLAYERID, gameId: GAME.id, key: "right"}))
						}
						if ((event.key && (event.key == "ArrowDown" || event.key.toLowerCase() == "s")) || (mobileControls && mobileControls.includes("down"))) {
							SOCKET.send(JSON.stringify({action: "liftKey", playerId: PLAYERID, gameId: GAME.id, key: "down"}))
						}
						if ((event.key && (event.key == "ArrowLeft" || event.key.toLowerCase() == "a")) || (mobileControls && mobileControls.includes("left"))) {
							SOCKET.send(JSON.stringify({action: "liftKey", playerId: PLAYERID, gameId: GAME.id, key: "left"}))
						}
						if ((event.key && (event.key == " " || event.code == "Space")) || (mobileControls && mobileControls.includes("space"))) {
							SOCKET.send(JSON.stringify({action: "liftKey", playerId: PLAYERID, gameId: GAME.id, key: "space"}))
						}
						if ((event.key && (event.key == "[" || event.code == "BracketLeft" || event.key == "," || event.code == "Comma" || event.key.toLowerCase() == "z")) || (mobileControls && mobileControls.includes("ccw"))) {
							SOCKET.send(JSON.stringify({action: "liftKey", playerId: PLAYERID, gameId: GAME.id, key: "ccw"}))
						}
						if ((event.key && (event.key == "]" || event.code == "BracketRight" || event.key == "." || event.code == "Period" || event.key.toLowerCase() == "x")) || (mobileControls && mobileControls.includes("cw"))) {
							SOCKET.send(JSON.stringify({action: "liftKey", playerId: PLAYERID, gameId: GAME.id, key: "cw"}))
						}
				} catch (error) {console.log(error)}
			}

		/* pressMouse */
			window.addEventListener(TRIGGERS.mousedown, pressMouse)
			function pressMouse(event) {
				try {
					// no game or not started
						if (!GAME || !GAME.status.startTime) {
							return
						}

					// not a player
						if (!PLAYERID || !GAME.players[PLAYERID]) {
							return false
						}

					// not mouse controls
						if (GAME.players[PLAYERID].status.controls !== "mouse") {
							return false
						}

					// space
						SOCKET.send(JSON.stringify({action: "pressKey", playerId: PLAYERID, gameId: GAME.id, key: "space"}))
				} catch (error) {console.log(error)}
			}

		/* liftMouse */
			window.addEventListener(TRIGGERS.mouseup, liftMouse)
			function liftMouse(event) {
				try {
					// no game or not started
						if (!GAME || !GAME.status.startTime) {
							return
						}

					// not a player
						if (!PLAYERID || !GAME.players[PLAYERID]) {
							return false
						}

					// not mouse controls
						if (GAME.players[PLAYERID].status.controls !== "mouse") {
							return false
						}

					// space
						SOCKET.send(JSON.stringify({action: "liftKey", playerId: PLAYERID, gameId: GAME.id, key: "space"}))
				} catch (error) {console.log(error)}
			}

		/* moveMouse */
			window.addEventListener(TRIGGERS.mousemove, moveMouse)
			function moveMouse(event) {
				try {
					// no game or not started
						if (!GAME || !GAME.status.startTime) {
							return
						}

					// not a player
						if (!PLAYERID || !GAME.players[PLAYERID]) {
							return false
						}

					// not mouse controls
						if (GAME.players[PLAYERID].status.controls !== "mouse") {
							return false
						}

					// get coordinates
						MOUSE.x = (event.touches ? event.touches[0].clientX : event.clientX)
						MOUSE.y = (event.touches ? event.touches[0].clientY : event.clientY)

					// get distance from center line
						var dx = MOUSE.x - (window.innerWidth / 2)
						if (dx < -CONSTANTS.mouseThreshold) {
							MOUSE.a = -1
						}
						else if (dx > CONSTANTS.mouseThreshold) {
							MOUSE.a = 1
						}
						else {
							MOUSE.a = 0
						}
				} catch (error) {console.log(error)}
			}

	/*** geometry ***/
		/* getReflection */
			function getReflection(laserA, mirrorA) {
				try {
					// calculate
						return Math.round((((2 * mirrorA - laserA) + CONSTANTS.circleDegrees) % CONSTANTS.circleDegrees) * CONSTANTS.rounding) / CONSTANTS.rounding
				} catch (error) {console.log(error)}
			}

		/* getDistance */
			function getDistance(pointA, pointB) {
				try {
					// calculate
						return Math.pow(Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2), 0.5)
				} catch (error) {console.log(error)}
			}

		/* getShadowData */
			function getShadowData(game, player) {
				try {
					// no player
						if (!PLAYERID || !player) {
							return null
						}

					// create starting variables
						var cellsize = game.map.options.cellsize
						var outerEdge = cellsize * player.options.visibility
						var shadowOptions = game.map.options.shadow
						var shadowData = {
							visiblePoints: [],
							mirrorPoints: [],
							reflectionPoints: [],
							cornerPoints: [
								{x: player.status.position.x + outerEdge, y: player.status.position.y + outerEdge},
								{x: player.status.position.x + outerEdge, y: player.status.position.y - outerEdge},
								{x: player.status.position.x - outerEdge, y: player.status.position.y - outerEdge},
								{x: player.status.position.x - outerEdge, y: player.status.position.y + outerEdge},
								{x: player.status.position.x + outerEdge, y: player.status.position.y + outerEdge}
							]
						}

					// loop through all angles to get visible points & mirror points
						for (var angle = 0; angle <= CONSTANTS.circleDegrees; angle += shadowOptions.angle) {
							// move out from center
								var distance = player.options.size / 2 // start at edge of player
								while (distance <= outerEdge) {
									// get position
										var x = player.status.position.x + distance * Math.cos(angle * CONSTANTS.radiansConversion)
										var y = player.status.position.y + distance * Math.sin(angle * CONSTANTS.radiansConversion)

									// get cell
										var cellX = Math.round(x / cellsize)
										var cellY = Math.round(y / cellsize)

									// out of bounds
										if (!game.map.grid[cellX] || !game.map.grid[cellX][cellY]) {
											shadowData.visiblePoints.push({x: x, y: y})
										}

									// occludes vision
										if (["exterior", "wall", "mirror"].includes(game.map.grid[cellX][cellY].type)) {
											// start shadow
												var newPoint = {x: x, y: y}
												shadowData.visiblePoints.push(newPoint)

											// mirror
												if (game.map.grid[cellX][cellY].type == "mirror") {
													var distances = [
														{side: "bottom", distance: getDistance(newPoint, {x:  cellX        * cellsize, y: (cellY + 0.5) * cellsize}), angle: 0},
														{side: "right",  distance: getDistance(newPoint, {x: (cellX - 0.5) * cellsize, y:  cellY        * cellsize}), angle: CONSTANTS.circleDegrees / 4},
														{side: "top",    distance: getDistance(newPoint, {x:  cellX        * cellsize, y: (cellY - 0.5) * cellsize}), angle: CONSTANTS.circleDegrees / 2},
														{side: "left",   distance: getDistance(newPoint, {x: (cellX + 0.5) * cellsize, y:  cellY        * cellsize}), angle: CONSTANTS.circleDegrees * 3 / 4},
													]
													distances.sort(function(a, b) {
														return a.distance - b.distance
													})
													shadowData.mirrorPoints.push({x: x, y: y, a: getReflection(angle, distances[0].angle), order: 1})
												}

											// next angle
												break
										}

									// at edge
										if (distance == outerEdge) {
											shadowData.visiblePoints.push({x: x, y: y})
										}

									// otherwise, continue
										distance += cellsize * shadowOptions.step
								}
						}

					// loop through mirror points to get reflection points & more mirror points
						for (var i = 0; i < shadowData.mirrorPoints.length; i++) {
							var distance = cellsize * shadowOptions.step
							while (distance <= 2 * outerEdge) {
								// get position
									var x = shadowData.mirrorPoints[i].x + distance * Math.cos(shadowData.mirrorPoints[i].a * CONSTANTS.radiansConversion)
									var y = shadowData.mirrorPoints[i].y + distance * Math.sin(shadowData.mirrorPoints[i].a * CONSTANTS.radiansConversion)

								// get cell
									var cellX = Math.round(x / cellsize)
									var cellY = Math.round(y / cellsize)

								// out of bounds
									if (!game.map.grid[cellX] || !game.map.grid[cellX][cellY]) {
										shadowData.reflectionPoints.push({x: x, y: y})
									}

								// occludes vision
									if (["exterior", "wall", "mirror"].includes(game.map.grid[cellX][cellY].type)) {
										// start reflection
											var newPoint = {x: x, y: y}
											shadowData.reflectionPoints.push(newPoint)

										// second-order mirrors
											if (game.map.grid[cellX][cellY].type == "mirror" && shadowData.mirrorPoints[i].order < CONSTANTS.maximumReflections) {
												var distances = [
													{side: "bottom", distance: getDistance(newPoint, {x:  cellX        * cellsize, y: (cellY + 0.5) * cellsize}), angle: 0},
													{side: "right",  distance: getDistance(newPoint, {x: (cellX - 0.5) * cellsize, y:  cellY        * cellsize}), angle: CONSTANTS.circleDegrees / 4},
													{side: "top",    distance: getDistance(newPoint, {x:  cellX        * cellsize, y: (cellY - 0.5) * cellsize}), angle: CONSTANTS.circleDegrees / 2},
													{side: "left",   distance: getDistance(newPoint, {x: (cellX + 0.5) * cellsize, y:  cellY        * cellsize}), angle: CONSTANTS.circleDegrees * 3 / 4},
												]
												distances.sort(function(a, b) {
													return a.distance - b.distance
												})
												shadowData.mirrorPoints.push({x: x, y: y, a: getReflection(shadowData.mirrorPoints[i].a, distances[0].angle), order: shadowData.mirrorPoints[i].order + 1})
											}

										// next mirror point
											break
									}

								// at edge
									if (distance == 2 * outerEdge) {
										shadowData.reflectionPoints.push({x: x, y: y})
									}

								// otherwise, continue
									distance += cellsize * shadowOptions.step
							}
						}

					// return
						return shadowData
				} catch (error) {console.log(error)}
			}

	/*** canvas tools ***/
		/* resizeCanvas */
			resizeCanvas()
			window.addEventListener(TRIGGERS.resize, resizeCanvas)
			function resizeCanvas(event) {
				try {
					// update canvas
						ELEMENTS.canvas.height = window.innerHeight
						ELEMENTS.canvas.width = window.innerWidth
				} catch (error) {console.log(error)}
			}

		/* clearCanvas */
			function clearCanvas(canvas, context) {
				try {
					// clear
						context.clearRect(0, 0, canvas.width, canvas.height)
				} catch (error) {console.log(error)}
			}

		/* translateCanvas */
			function translateCanvas(canvas, context, options) {
				try {
					// offset
						var offsetX = (options ? options.x : 0) || 0
						var offsetY = (options ? options.y : 0) || 0

					// center canvas
						context.translate(offsetX, -1 * offsetY)
				} catch (error) {console.log(error)}
			}

		/* rotateCanvas */
			function rotateCanvas(canvas, context, options, callback) {
				try {
					// rotate
						context.translate(options.x, options.y)
						context.rotate(options.a * CONSTANTS.radiansConversion)
						context.translate(-options.x, -options.y)

					// do whatever
						callback()

					// rotate back
						context.translate(options.x, options.y)
						context.rotate(-options.a * CONSTANTS.radiansConversion)
						context.translate(-options.x, -options.y)
				} catch (error) {console.log(error)}
			}

		/* drawShape */
			function drawShape(canvas, context, options) {
				try {
					// parameters
						options = options || {}
						context.beginPath()
						context.fillStyle   = options.color || "transparent"
						context.lineWidth   = options.border || 1
						context.shadowBlur  = options.blur ? options.blur : 0
						context.shadowColor = options.shadow ? options.shadow : "transparent"
						context.globalAlpha = options.opacity !== undefined ? options.opacity : 1

					// points
						context.beginPath()
						context.moveTo(options.points[0].x, canvas.height - options.points[0].y)
						for (var i = 1; i < options.points.length; i++) {
							context.lineTo(options.points[i].x, canvas.height - options.points[i].y)
						}
						context.closePath()

					// color
						context.fill()
				} catch (error) {console.log(error)}
			}

		/* drawRectangle */
			function drawRectangle(canvas, context, options) {
				try {
					// parameters
						options = options || {}
						context.beginPath()
						context.fillStyle   = options.color || "transparent"
						context.strokeStyle = options.color || "transparent"
						context.lineWidth   = options.border || 1
						context.shadowBlur  = options.blur ? options.blur : 0
						context.shadowColor = options.shadow ? options.shadow : "transparent"
						context.globalAlpha = options.opacity !== undefined ? options.opacity : 1

					// geometry
						var x = options.x - (options.width / 2)
						var y = options.y - (options.height / 2)

					// draw
						if (options.radii) {
							context.moveTo(x + options.radii.topLeft, canvas.height - y - options.height)
							context.lineTo(x + options.width - options.radii.topRight, canvas.height - y - options.height)
							context.quadraticCurveTo(x + options.width, canvas.height - y - options.height, x + options.width, canvas.height - y - options.height + options.radii.topRight)
							context.lineTo(x + options.width, canvas.height - y - options.radii.bottomRight)
							context.quadraticCurveTo(x + options.width, canvas.height - y, x + options.width - options.radii.bottomRight, canvas.height - y)
							context.lineTo(x + options.radii.bottomLeft, canvas.height - y)
							context.quadraticCurveTo(x, canvas.height - y, x, canvas.height - y - options.radii.bottomLeft)
							context.lineTo(x, canvas.height - y - options.height + options.radii.topLeft)
							context.quadraticCurveTo(x, canvas.height - y - options.height, x + options.radii.topLeft, canvas.height - y - options.height)
							context.closePath()
							context.fill()
						}
						else {
							context.fillRect(x, canvas.height - y, options.width, -1 * options.height)
						}
				} catch (error) {console.log(error)}
			}

		/* drawCircle */
			function drawCircle(canvas, context, options) {
				try {
					// parameters
						options = options || {}
						context.beginPath()
						context.fillStyle   = options.color || "transparent"
						context.strokeStyle = options.color || "transparent"
						context.lineWidth   = options.border || 0
						context.shadowBlur  = options.blur ? options.blur : 0
						context.shadowColor = options.shadow ? options.shadow : "transparent"
						context.globalAlpha = options.opacity !== undefined ? options.opacity : 1

					// draw
						if (options.border) {
							context.arc(options.x, canvas.height - options.y, options.radius, (options.start || 0), (options.end || CONSTANTS.circleRadians))
							context.stroke()
						}
						else {
							context.moveTo(options.x, canvas.height - options.y)
							context.arc(options.x, canvas.height - options.y, options.radius, (options.start || 0), (options.end || CONSTANTS.circleRadians), true)
							context.closePath()
							context.fill()
						}
				} catch (error) {console.log(error)}
			}

		/* drawLine */
			function drawLine(canvas, context, options) {
				try {
					// parameters
						options = options || {}
						context.beginPath()
						context.strokeStyle = options.color || "transparent"
						context.lineWidth   = options.border || 0
						context.shadowBlur  = options.blur ? options.blur : 0
						context.shadowColor = options.shadow ? options.shadow : "transparent"
						context.globalAlpha = options.opacity !== undefined ? options.opacity : 1

					// draw
						context.moveTo(options.x1, canvas.height - options.y1)
						context.lineTo(options.x2, canvas.height - options.y2)

					// draw
						context.stroke()
				} catch (error) {console.log(error)}
			}

		/* drawText */
			function drawText(canvas, context, options) {
				try {
					// parameters
						options = options || {}
						context.beginPath()
						context.fillStyle   = options.color || "transparent"
						context.shadowBlur  = options.blur ? options.blur : 0
						context.shadowColor = options.shadow ? options.shadow : "transparent"
						context.globalAlpha = options.opacity !== undefined ? options.opacity : 1
						context.font        = (options.fontSize ? options.fontSize : 10) + "px " + (options.font ? options.font : "sans-serif")
						context.textAlign   = options.textAlign ? options.textAlign : "center"
						context.textBaseline= "middle"

					// draw
						context.fillText(options.text, options.x, canvas.height - options.y)
				} catch (error) {console.log(error)}
			}

		/* drawImage */
			function drawImage(canvas, context, options) {
				try {
					// parameters
						options = options || {}
						context.globalAlpha = options.opacity !== undefined ? options.opacity : 1

					// geometry
						var x = options.x - (options.width / 2)
						var y = options.y - (options.height / 2)

					// draw
						context.drawImage(options.image, x, canvas.height - y, options.width, -1 * options.height)
				} catch (error) {console.log(error)}
			}

	/*** canvas content ***/
		/* drawGame */
			function drawGame(canvas, context, game, player) {
				try {
					// zoom canvas
						canvas.height = window.innerHeight / (player ? player.options.visionZoom : CONSTANTS.observerZoom)
						canvas.width  = window.innerWidth  / (player ? player.options.visionZoom : CONSTANTS.observerZoom)

					// clear canvas
						clearCanvas(canvas, context)

					// image dimensions
						var mapWidth  = game.map.options.cells.x * game.map.options.cellsize
						var mapHeight = game.map.options.cells.y * game.map.options.cellsize
						var offsetX = canvas.width / 2
							offsetX = player ? (offsetX / player.options.visionRightToLeft) - player.status.position.x : offsetX - mapWidth / 2
						var offsetY = canvas.height / 2
							offsetY = player ? (offsetY / player.options.visionTopToBottom) - player.status.position.y : offsetY - mapHeight / 2

					// adjust center to camera
						translateCanvas(canvas, context, {
							x: offsetX,
							y: offsetY
						})

					// rotate around player
						rotateCanvas(canvas, context, {
							x: player ? player.status.position.x : 0,
							y: player ? canvas.height - player.status.position.y : 0,
							a: player ? player.status.position.a : 0
						}, function() {
							// compute shadow
								var shadowData = getShadowData(game, player)

							// SPECTATORS ONLY
								if (!shadowData) {
									// drawRectangle(canvas, context, {
									// 	color: game.map.options.background,
									// 	opacity: 1,
									// 	x: mapWidth / 2,
									// 	y: mapHeight / 2,
									// 	width: canvas.width,
									// 	height: canvas.height,
									// })

									drawImage(canvas, context, {
										image: ELEMENTS.images[game.map.options.backgroundImage],
										opacity: game.map.options.backgroundOpacity,
										x: mapWidth / 2 - game.map.options.cellsize / 2,
										y: mapHeight / 2 - game.map.options.cellsize / 2,
										width: mapWidth,
										height: mapHeight
									})
								}

							// PLAYERS ONLY
								else {
									// source-over
										context.globalCompositeOperation = "source-over"

									// draw visible area (gray)
										drawShape(canvas, context, {
											color: game.map.options.background,
											opacity: 1,
											points: shadowData.visiblePoints
										})

									// draw thick mirror (gray)
										for (var i = 0; i < shadowData.mirrorPoints.length; i++) {
											drawReflectionWedge(canvas, context, {
												color: game.map.options.background,
												mirror: shadowData.mirrorPoints[i],
												reflection: shadowData.reflectionPoints[i]
											})
										}

									// source-atop
										context.globalCompositeOperation = "source-atop"

									// draw background (opaque gray)
										// drawCircle(canvas, context, {
										// 	color: game.map.options.background,
										// 	opacity: 1,
										// 	x: player.status.position.x,
										// 	y: player.status.position.y,
										// 	radius: game.map.options.cellsize * player.options.visibility
										// })

										drawImage(canvas, context, {
											image: ELEMENTS.images[game.map.options.backgroundImage],
											opacity: game.map.options.backgroundOpacity,
											x: mapWidth / 2,
											y: mapHeight / 2,
											width: mapWidth,
											height: mapHeight
										})
								}

							// draw lasers
								for (var i in game.players) {
									drawLaser(canvas, context, game.players[i], game.map.options)
								}

							// draw players
								for (var i in game.players) {
									drawPlayer(canvas, context, game.players[i], game.map.options)
								}

							// draw items
								for (var i = 0; i < game.items.length; i++) {
									drawItem(canvas, context, game.items[i], game.map.options)
								}

							// PLAYERS ONLY
								if (shadowData) {
									// back to source-over
										context.globalCompositeOperation = "source-over"

									// draw background (translucent gray)
										drawShape(canvas, context, {
											color: game.map.options.background,
											opacity: game.map.options.shadow.opacity * 2, // darker background shadow
											points: shadowData.visiblePoints.concat(shadowData.cornerPoints)
										})
								}

							// draw walls
								for (var x = 0; x < game.map.options.cells.x; x++) {
									for (var y = 0; y < game.map.options.cells.y; y++) {
										if (game.map.grid[x][y].type !== "space") {
											var neighbors = {
												top:    game.map.grid[x][y + 1] ? game.map.grid[x][y + 1].type !== "space" : false,
												right:  game.map.grid[x + 1] ? game.map.grid[x + 1][y].type !== "space" : false,
												bottom: game.map.grid[x][y - 1] ? game.map.grid[x][y - 1].type !== "space" : false,
												left:   game.map.grid[x - 1] ? game.map.grid[x - 1][y].type !== "space" : false
											}
											drawCell(canvas, context, game.map.grid[x][y], game.map.options, neighbors)
										}
									}
								}

							// PLAYERS ONLY
								if (shadowData) {
									// draw shadows (translucent gray)
										drawShape(canvas, context, {
											color: game.map.options.shadow.color,
											blur: game.map.options.shadow.blur,
											shadow: game.map.options.shadow.color,
											opacity: game.map.options.shadow.opacity / 2, // lighter second-layer shadow (to differentiate reflection zones)
											points: shadowData.visiblePoints.concat(shadowData.cornerPoints)
										})

									// clip circle
										context.save()
										context.globalCompositeOperation = "destination-in"
										drawCircle(canvas, context, {
											color: game.map.options.shadow.color,
											opacity: 1,
											x: player.status.position.x,
											y: player.status.position.y,
											radius: game.map.options.cellsize * player.options.visibility
										})
										context.restore()
								}
						})

					// readjust center for next loop
						translateCanvas(canvas, context, {
							x: -offsetX,
							y: -offsetY
						})

					// message
						if (game.status.message) {
							drawText(canvas, context, {
								x: canvas.width * game.map.options.text.xOffset,
								y: canvas.height * game.map.options.text.yOffset,
								text: game.status.message,
								color: game.map.options.text.color,
								opacity: game.map.options.text.opacity,
								fontSize: game.map.options.text.fontSize / (player ? 1 : CONSTANTS.observerZoom)
							})
						}

					// score
						// game mode: classic_tag
							if (game.status.mode == "classic_tag") {
								drawText(canvas, context, {
									x: canvas.width * game.map.options.score.xOffset,
									y: canvas.height * game.map.options.score.yOffset,
									text: game.status.it ? game.players[game.status.it].name : "?",
									color: game.map.options.score.color,
									opacity: game.map.options.score.opacity,
									fontSize: game.map.options.score.fontSize / (player ? 1 : CONSTANTS.observerZoom)
								})
							}

						// game mode: team_freeze_tag
							if (game.status.mode == "team_freeze_tag") {
								var offset = game.map.options.score.yOffset
								for (var i in game.status.frozen) {
									if (game.status.frozen[i]) {
										drawText(canvas, context, {
											x: canvas.width * game.map.options.score.xOffset,
											y: canvas.height * offset,
											text: i.toUpperCase() + ": " + game.status.frozen[i],
											color: game.map.options.score.color,
											opacity: game.map.options.score.opacity,
											fontSize: game.map.options.score.fontSize / (player ? 1 : CONSTANTS.observerZoom)
										})
										offset -= (1 - game.map.options.score.yOffset)
									}
								}
							}

						// game mode: capture_the_hat
							if (game.status.mode == "capture_the_hat") {
								drawText(canvas, context, {
									x: canvas.width * game.map.options.score.xOffset,
									y: canvas.height * game.map.options.score.yOffset,
									text: game.status.it ? game.players[game.status.it].name : "?",
									color: game.map.options.score.color,
									opacity: game.map.options.score.opacity,
									fontSize: game.map.options.score.fontSize / (player ? 1 : CONSTANTS.observerZoom)
								})
							}

						// game mode: team_battle
							if (game.status.mode == "team_battle") {
								var offset = game.map.options.score.yOffset
								for (var i in game.status.kills) {
									if (game.status.kills[i]) {
										drawText(canvas, context, {
											x: canvas.width * game.map.options.score.xOffset,
											y: canvas.height * offset,
											text: i.toUpperCase() + ": " + game.status.kills[i],
											color: game.map.options.score.color,
											opacity: game.map.options.score.opacity,
											fontSize: game.map.options.score.fontSize / (player ? 1 : CONSTANTS.observerZoom)
										})
										offset -= (1 - game.map.options.score.yOffset)
									}
								}
							}

						// game mode: collect_the_orbs
							if (game.status.mode == "collect_the_orbs") {
								var offset = game.map.options.score.yOffset
								for (var i in game.status.orbs) {
									if (game.status.orbs[i]) {
										drawText(canvas, context, {
											x: canvas.width * game.map.options.score.xOffset,
											y: canvas.height * offset,
											text: i.toUpperCase() + ": " + game.status.orbs[i],
											color: game.map.options.score.color,
											opacity: game.map.options.score.opacity,
											fontSize: game.map.options.score.fontSize / (player ? 1 : CONSTANTS.observerZoom)
										})
										offset -= (1 - game.map.options.score.yOffset)
									}
								}
							}

					// game over?
						if (game.status.timeRemaining <= 0) {
							return
						}

					// timer
						drawText(canvas, context, {
							x: canvas.width * game.map.options.time.xOffset,
							y: canvas.height * game.map.options.time.yOffset,
							text: Math.floor(game.status.timeRemaining / CONSTANTS.second),
							color: game.map.options.time.color,
							opacity: game.map.options.time.opacity,
							fontSize: game.map.options.time.fontSize / (player ? 1 : CONSTANTS.observerZoom)
						})
				} catch (error) {console.log(error)}
			}

		/* drawReflectionWedge */
			function drawReflectionWedge(canvas, context, options) {
				try {
					// missing anything
						if (!options.reflection || !options.mirror) {
							return
						}

					// angle
						var yDiff = options.reflection.y - options.mirror.y
						var xDiff = options.reflection.x - options.mirror.x
						var radius = Math.pow(Math.pow(xDiff, 2) + Math.pow(yDiff, 2), 0.5)
						var angle = -Math.atan2(yDiff, xDiff)
					
					// draw circle
						drawCircle(canvas, context, {
							opacity: 1,
							color: options.color,
							x: options.mirror.x,
							y: options.mirror.y,
							radius: radius,
							start: angle + CONSTANTS.radiansConversion * CONSTANTS.reflectionWedgeWidth,
							end:   angle - CONSTANTS.radiansConversion * CONSTANTS.reflectionWedgeWidth
						})
				} catch (error) {console.log(error)}
			}

		/* drawCell */
			function drawCell(canvas, context, cell, mapOptions, neighbors) {
				try {
					// space
						if (!cell || !cell.type || cell.type == "space") {
							return
						}

					// get options
						var cellOptions = mapOptions[cell.type]
						if (!cellOptions) {
							return
						}

					// computed
						var size = cellOptions.size ? (cellOptions.size * mapOptions.cellsize / 100) : mapOptions.cellsize

					// circle
						if (cellOptions.roundness == 50) {
							drawCircle(canvas, context, {
								x: cell.x * mapOptions.cellsize,
								y: cell.y * mapOptions.cellsize,
								radius: size / 2,
								color: cellOptions.color,
								opacity: cellOptions.opacity
							})
						}

					// rectangle
						else {
							var roundness = (cellOptions.roundness || 0) * size / 100

							drawRectangle(canvas, context, {
								x: cell.x * mapOptions.cellsize,
								y: cell.y * mapOptions.cellsize,
								width: size,
								height: size,
								color: cellOptions.color,
								opacity: cellOptions.opacity,
								radii: roundness ? {
									topLeft: neighbors.top || neighbors.left ? 0 : roundness,
									topRight: neighbors.top || neighbors.right ? 0 : roundness,
									bottomLeft: neighbors.bottom || neighbors.left ? 0 : roundness,
									bottomRight: neighbors.bottom || neighbors.right ? 0 : roundness
								} : null
							})
						}
				} catch (error) {console.log(error)}
			}

		/* drawItem */
			function drawItem(canvas, context, item, mapOptions) {
				try {
					// computed
						var size = item.options.size ? (item.options.size * mapOptions.cellsize / 100) : mapOptions.cellsize

					// image
						if (item.options.image) {
							drawImage(canvas, context, {
								x: item.position.x,
								y: item.position.y,
								width: size,
								height: size,
								opacity: item.options.opacity,
								image: ELEMENTS.images[item.options.image]
							})
						}

					// circle
						else if (item.options.roundness == 50) {
							drawCircle(canvas, context, {
								x: item.position.x,
								y: item.position.y,
								radius: size / 2,
								color: item.options.color,
								opacity: item.options.opacity
							})
						}

					// rectangle
						else {
							var roundness = (item.options.roundness || 0) * size / 100

							drawRectangle(canvas, context, {
								x: item.position.x,
								y: item.position.y,
								width: size,
								height: size,
								color: item.options.color,
								opacity: item.options.opacity,
								radii: roundness ? {
									topLeft: roundness,
									topRight: roundness,
									bottomLeft: roundness,
									bottomRight: roundness
								} : null
							})
						}
				} catch (error) {console.log(error)}
			}

		/* drawLaser */
			function drawLaser(canvas, context, player, mapOptions) {
				try {
					// draw laser
						for (var i = 1; i < player.laser.length; i++) {
							drawLine(canvas, context, {
								x1: player.laser[i - 1].x,
								y1: player.laser[i - 1].y,
								x2: player.laser[i].x,
								y2: player.laser[i].y,
								color: player.status.isIt ? mapOptions.special : player.options.color,
								border: player.laser[i].e
							})
						}
				} catch (error) {console.log(error)}
			}

		/* drawPlayer */
			function drawPlayer(canvas, context, player, mapOptions) {
				try {
					// computed
						var size = player.options.size / 100 * mapOptions.cellsize

					// draw rotated player
						rotateCanvas(canvas, context, {
							x: player.status.position.x,
							y: canvas.height - player.status.position.y,
							a: -player.status.position.a
						}, function() {
							// outer circle
								drawCircle(canvas, context, {
									player: true,
									x: player.status.position.x,
									y: player.status.position.y,
									radius: size / 2,
									color: mapOptions.background,
									opacity: 1
								})

								drawCircle(canvas, context, {
									player: true,
									x: player.status.position.x,
									y: player.status.position.y,
									radius: size / 2,
									color: player.status.isIt ? mapOptions.special : player.options.color,
									opacity: player.options.desaturatedOpacity
								})

							// inner circle
								drawCircle(canvas, context, {
									player: true,
									x: player.status.position.x,
									y: player.status.position.y,
									radius: size / 2 * player.status.energy / player.options.maximumEnergy,
									color: player.status.isIt ? mapOptions.special : player.options.color,
									opacity: 1
								})

							// draw name
								drawText(canvas, context, {
									x: player.status.position.x,
									y: player.status.position.y,
									text: player.name,
									color: player.status.isIt ? mapOptions.text.color : mapOptions.shadow.color,
									fontSize: player.options.fontSize * mapOptions.cellsize / 100,
									opacity: player.options.textOpacity
								})
						})
				} catch (error) {console.log(error)}
			}

	/*** assets ***/
		/* preloadImages */
			function preloadImages(imageNames) {
				try {
					// loop through all imageNames
						for (var i in imageNames) {
							// create image element
								var imageElement = new Image()
									imageElement.src = "/assets/" + imageNames[i] + ".png"

							// add to list of audio objects
								if (!ELEMENTS.images[imageNames[i]]) {
									ELEMENTS.images[imageNames[i]] = imageElement
								}
						}
				} catch (error) {console.log(error)}
			}

		/* preloadAudio */
			function preloadAudio(soundNames) {
				try {
					// loop through all soundNames
						for (var i in soundNames) {
							// get file name
								var info = soundNames[i].split("_")
								var soundName = info[0]
								var loopDuration = info[1] && Number(info[1]) ? (Number(info[1]) / CONSTANTS.loopTime - 1) : null
								var fadePerLoop = info[2] && Number(info[2]) ? (CONSTANTS.loopTime / Number(info[2])) : (CONSTANTS.loopTime / CONSTANTS.fadeTime)
									fadePerLoop = fadePerLoop * CONSTANTS.audioVolume
								var version = Number(info[3]) || 1

							// create audio element that loops this file
								var audioElement = new Audio()
									audioElement.loop = soundName.includes("music") ? true : false
									audioElement.src = "/assets/" + soundNames[i] + ".mp3"
									audioElement.volume = CONSTANTS.audioVolume

							// add to list of audio objects
								if (!ELEMENTS.audio[soundName]) {
									ELEMENTS.audio[soundName] = {
										fadePerLoop: fadePerLoop,
										loopDuration: loopDuration,
										remainingLoops: 0,
										activeTrack: null,
										tracks: {}
									}
								}

							// add to list of versions for that audio effect
								ELEMENTS.audio[soundName].tracks["_" + version] = audioElement
						}
				} catch (error) {console.log(error)}
			}

		/* updateSFX */
			function updateSFX(game, player) {
				try {
					// not interacted yet --> browsers block autoplay
						if (!INTERACTED) {
							return
						}

					// play music
						var now = new Date().getTime()
						if (ELEMENTS.audio.musicGame && ELEMENTS.audio.musicGame.tracks._1.paused && (GAME.status.startTime < now && !GAME.status.endTime)) {
							ELEMENTS.audio.musicMenu.tracks._1.pause()
							ELEMENTS.audio.musicGame.tracks._1.play()
						}

					// play menu
						else if (ELEMENTS.audio.musicMenu && ELEMENTS.audio.musicMenu.tracks._1.paused && GAME.status.endTime) {
							ELEMENTS.audio.musicMenu.tracks._1.play()
							ELEMENTS.audio.musicGame.tracks._1.pause()
						}

					// not a player
						if (!PLAYERID || !player) {
							return false
						}

					// loop through soundNames on player object
						for (var soundName in player.status.sfx) {
							// get current status (true / false)
								var status = player.status.sfx[soundName]

							// audio object not found
								if (!ELEMENTS.audio[soundName]) {
									continue
								}

							// should be playing
								if (status == true) {
									// already playing --> keep playing (on a loop)
										if (ELEMENTS.audio[soundName].activeTrack) {
											// not time to switch tracks
												if (ELEMENTS.audio[soundName].remainingLoops) {
													ELEMENTS.audio[soundName].remainingLoops--
													continue
												}
											
											// infinite duration --> keep playing
												if (!ELEMENTS.audio[soundName].loopDuration) {
													continue
												}

											// multiple versions --> choose a random one
												var previousTrackKey = ELEMENTS.audio[soundName].activeTrack
												ELEMENTS.audio[soundName].tracks[previousTrackKey].volume = 0
												ELEMENTS.audio[soundName].tracks[previousTrackKey].pause()

												var trackKeys = Object.keys(ELEMENTS.audio[soundName].tracks)
												var newTrackKey = trackKeys[Math.floor(Math.random() * trackKeys.length)]

												ELEMENTS.audio[soundName].activeTrack = newTrackKey
												ELEMENTS.audio[soundName].remainingLoops = ELEMENTS.audio[soundName].loopDuration
												ELEMENTS.audio[soundName].tracks[newTrackKey].volume = CONSTANTS.audioVolume
												ELEMENTS.audio[soundName].tracks[newTrackKey].currentTime = 0
												ELEMENTS.audio[soundName].tracks[newTrackKey].play()
												continue
										}

									// start from beginning at full volume
										// random from versions
											var trackKeys = Object.keys(ELEMENTS.audio[soundName].tracks)
											var trackKey = trackKeys[Math.floor(Math.random() * trackKeys.length)]

										// start
											ELEMENTS.audio[soundName].activeTrack = trackKey
											ELEMENTS.audio[soundName].remainingLoops = ELEMENTS.audio[soundName].loopDuration
											ELEMENTS.audio[soundName].tracks[trackKey].volume = CONSTANTS.audioVolume
											ELEMENTS.audio[soundName].tracks[trackKey].currentTime = 0
											ELEMENTS.audio[soundName].tracks[trackKey].play()
											continue
								}

							// should not be playing
								if (status == false) {
									// get active track
										var trackKey = ELEMENTS.audio[soundName].activeTrack

									// already stopped
										if (!trackKey) {
											continue
										}

									// volume is 0 --> stop
										if (ELEMENTS.audio[soundName].tracks[trackKey].volume <= ELEMENTS.audio[soundName].fadePerLoop) {
											ELEMENTS.audio[soundName].tracks[trackKey].volume = 0
											ELEMENTS.audio[soundName].tracks[trackKey].pause()
											ELEMENTS.audio[soundName].activeTrack = null
											continue
										}

									// still going --> decrease volume
										ELEMENTS.audio[soundName].tracks[trackKey].volume -= ELEMENTS.audio[soundName].fadePerLoop
										continue
								}
						}
				} catch (error) {console.log(error)}
			}
})