/*** modules ***/
	if (!CORE) { var CORE = require("../node/core") }
	module.exports = {}

/*** creates ***/
	/* createOne */
		module.exports.createOne = createOne
		function createOne(REQUEST, RESPONSE, callback) {
			try {
				// session
					var session = CORE.getSchema("session")
						session.info.ip = REQUEST.ip
						session.info["user-agent"] = REQUEST.headers["user-agent"]
						session.info.language = REQUEST.headers["accept-language"]

				// query
					var query = CORE.getSchema("query")
						query.collection = "sessions"
						query.command = "insert"
						query.document = session

				// insert
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							CORE.logError(results.message)
							return
						}

						REQUEST.session = session
						REQUEST.cookie.session = session.id
						callback(REQUEST, RESPONSE)
						return
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

/*** reads ***/
	/* readOne */
		module.exports.readOne = readOne
		function readOne(REQUEST, RESPONSE, callback) {
			try {
				// asset
					if (REQUEST.fileType) {
						callback(REQUEST, RESPONSE)
						return
					}

				// no cookie
					if (!REQUEST.cookie.session || REQUEST.cookie.session == null || REQUEST.cookie.session == 0) {
						createOne(REQUEST, RESPONSE, callback)
						return
					}

				// query
					var query = CORE.getSchema("query")
						query.collection = "sessions"
						query.command = "find"
						query.filters = {id: REQUEST.cookie.session}

				// find
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							REQUEST.session = REQUEST.cookie.session = null
							readOne(REQUEST, RESPONSE, callback)
							return
						}

						// update
							REQUEST.session = results.documents[0]
							updateOne(REQUEST, RESPONSE, callback)
							return
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}

/*** updates ***/
	/* updateOne */
		module.exports.updateOne = updateOne
		function updateOne(REQUEST, RESPONSE, callback) {
			try {
				// query
					var query = CORE.getSchema("query")
						query.collection = "sessions"
						query.command = "update"
						query.filters = {id: REQUEST.session.id}
						query.document = {
							updated: new Date().getTime()
						}
						
						if (REQUEST.updateSession && REQUEST.updateSession.playerId) {
							query.document.playerId = REQUEST.updateSession.playerId
						}
						if (REQUEST.updateSession && REQUEST.updateSession.gameId) {
							query.document.gameId = REQUEST.updateSession.gameId
						}

				// update
					CORE.accessDatabase(query, function(results) {
						if (!results.success) {
							REQUEST.session = REQUEST.cookie.session = null
							readOne(REQUEST, RESPONSE, callback)
							return
						}

						// results
							REQUEST.session = results.documents[0]
							REQUEST.cookie.session = results.documents[0].id
							callback(REQUEST, RESPONSE)
					})
			}
			catch (error) {
				CORE.logError(error)
				callback({success: false, message: "unable to " + arguments.callee.name})
			}
		}
	