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

		/* constants */
			var CONSTANTS = {
				circleDegrees: 360,
				laserLoopTime: 100,
				laserMaxCount: 5,
				laserColors: ["red", "orange", "yellow", "green", "blue", "purple"],
				laserMaxVX: 5,
				laserMaxVY: 5,
				laserMaxVA: 1,
				laserDeleteProbability: 0.01,
			}

	/*** elements ***/
		var ELEMENTS = {
			newGameForm: document.querySelector("#new-game-form"),
			newGameButton: document.querySelector("#new-game-button"),
			joinGameForm: document.querySelector("#join-game-form"),
			gameIdInput: document.querySelector("#game-id-input"),
			joinGameButton: document.querySelector("#join-game-button"),
			laserContainer: document.querySelector("#lasers"),
			lasers: {}
		}

	/*** tools ***/
		/* sendPost */
			function sendPost(options, callback) {
				try {
					// create request object and send to server
						var request = new XMLHttpRequest()
							request.open("POST", location.pathname, true)
							request.onload = function() {
								if (request.readyState !== XMLHttpRequest.DONE || request.status !== 200) {
									callback({success: false, readyState: request.readyState, message: request.status})
									return
								}
								
								callback(JSON.parse(request.responseText) || {success: false, message: "unknown error"})
							}
							request.send(JSON.stringify(options))
				} catch (error) {console.log(error)}
			}

		/* receivePost */
			function receivePost(data) {
				try {
					// redirect
						if (data.location) {
							window.location = data.location
							return
						}

					// message
						if (data.message) {
							showToast(data)
						}
				} catch (error) {console.log(error)}
			}

		/* isNumLet */
			function isNumLet(string) {
				try {
					return (/^[a-zA-Z0-9]+$/).test(string)
				} catch (error) {console.log(error)}
			}

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
						setTimeout(function() {
							window.TOAST.innerHTML = data.message
							window.TOAST.setAttribute("success", data.success || false)
							window.TOAST.setAttribute("visibility", true)
						}, 200)

					// hide
						window.TOASTTIME = setTimeout(function() {
							window.TOAST.setAttribute("visibility", false)
						}, 5000)
				} catch (error) {console.log(error)}
			}

	/*** submits ***/
		/* submitNewGame */
			ELEMENTS.newGameForm.addEventListener(window.TRIGGERS.submit, submitNewGame)
			function submitNewGame(event) {
				try {
					// post
						sendPost({
							action: "createGame",
						}, receivePost)
				} catch (error) {console.log(error)}
			}

		/* submitJoinGame */
			ELEMENTS.joinGameForm.addEventListener(window.TRIGGERS.submit, submitJoinGame)
			function submitJoinGame(event) {
				try {
					// validation
						var gameId = ELEMENTS.gameIdInput.value || null
						if (!gameId || gameId.length !== 4 || !isNumLet(gameId)) {
							showToast({success: false, message: "game id must be 4 letters & numbers"})
							return
						}

					// post
						sendPost({
							action: "joinGame",
							gameId: gameId
						}, receivePost)
				} catch (error) {console.log(error)}
			}

	/*** animation ***/
		/* animateLasers */
			var LASERLOOP = setInterval(animateLasers, CONSTANTS.laserLoopTime)
			function animateLasers() {
				try {
					// create
						if (Object.keys(ELEMENTS.lasers).length < CONSTANTS.laserMaxCount) {
							createLaser()
						}

					// animate
						for (var i in ELEMENTS.lasers) {
							animateLaser(ELEMENTS.lasers[i])
						}
				} catch (error) {console.log(error)}
			}

		/* createLaser */
			function createLaser() {
				try {
					// random id
						var id = Math.floor(Math.random() * 1000000000000).toString(36)

					// element
						var laserElement = document.createElement("div")
							laserElement.id = "laser-" + id
							laserElement.className = "laser"
							laserElement.style.background = "var(--medium-" + CONSTANTS.laserColors[Math.floor(Math.random() * CONSTANTS.laserColors.length)] + ")"
							laserElement.style.transform = "translateX(-50%) translateY(-50%) rotate(" + 
								(Math.floor(Math.random() * CONSTANTS.circleDegrees)) + 
								"deg)"
							laserElement.style.left = Math.floor(Math.random() * window.innerWidth / 2)  + (window.innerWidth / 4)  + "px"
							laserElement.style.top  = Math.floor(Math.random() * window.innerHeight / 2) + (window.innerHeight / 4) + "px"
							laserElement.setAttribute("v", 
								(Math.floor(Math.random() * (CONSTANTS.laserMaxVX * 2 + 1)) - CONSTANTS.laserMaxVX) + "," + 
								(Math.floor(Math.random() * (CONSTANTS.laserMaxVY * 2 + 1)) - CONSTANTS.laserMaxVY) + "," + 
								(Math.floor(Math.random() * (CONSTANTS.laserMaxVA * 2 + 1)) - CONSTANTS.laserMaxVA))
						ELEMENTS.laserContainer.appendChild(laserElement)

					// add to object
						ELEMENTS.lasers["laser-" + id] = laserElement
				} catch (error) {console.log(error)}
			}

		/* animateLaser */
			function animateLaser(laserElement) {
				try {
					// delete?
						if (Math.random() < CONSTANTS.laserDeleteProbability) {
							delete ELEMENTS.lasers[laserElement.id]
							laserElement.remove()
						}

					// get velocities
						var v = laserElement.getAttribute("v").split(",")
						var vx = Number(v[0])
						var vy = Number(v[1])
						var va = Number(v[2])

					// move
						laserElement.style.left = (Number(laserElement.style.left.replace("px", "")) + vx) + "px"
						laserElement.style.top  = (Number(laserElement.style.top.replace("px",  "")) + vy) + "px"
						laserElement.style.transform = "translateX(-50%) translateY(-50%) rotate(" + 
							(Number(laserElement.style.transform.replace("translateX(-50%) translateY(-50%) rotate(", "").replace("deg)", "")) + va) + 
							"deg)"
				} catch (error) {console.log(error)}
			}
})