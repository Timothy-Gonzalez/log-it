const express = require("express")
const cookieParser = require("cookie-parser")
const fs = require("fs")
const path = require("path")

const app = express()

app.use(
	express.urlencoded({
		extended: true,
	})
)
app.use(cookieParser())

const AUTH_FORM_TEMPLATE = `
	<html>
		<form action="/authenticate" method=POST style="text-align: center;">
			<label for="auth">Enter auth:</label>
			<br>
			<input type="password" name="auth">
			<input type="submit" value="Submit">
		</form>
	</html>
`

const TRY_AGAIN_TEMPLATE = (status) => `
	<html>
		<p>${status}</p>
		<a href="/auth">Try again</a>
	</html>
`

const LOG = process.env.LOG_IT_LOG || "log/"
const PORT = process.env.LOG_IT_PORT || 8000
const AUTH = process.env.LOG_IT_AUTH
const REDIRECT_TO = process.env.LOG_IT_REDIRECT_TO
const DEBUG = process.env.LOG_IT_DEBUG == 0 || 1
const AUTHENTICATE_RATELIMIT = process.env.LOG_IT_AUTHENTICATE_RATELIMIT || 5000

function debug(...data) {
	if (DEBUG) {
		console.log(...data)
	}
}

// Create log folder
debug("Checking for log folder...")

if (!fs.existsSync(LOG)) {
	debug("Creating log folder...")

	fs.mkdirSync(LOG, {
		recursive: true,
	})
}

// Read existing logs into memory
debug("Loading existing logs...")

const logs = {}

let onId = 1

const logPromises = []

for (fileName of fs.readdirSync(LOG)) {
	const n = parseInt(fileName.replace(".json", ""))

	if (!n) {
		continue
	}

	if (n >= onId) {
		onId = n + 1
	}

	logPromises.push(
		new Promise((res) => {
			fs.readFile(path.join(LOG, fileName), (err, data) => {
				logs[n] = data.toString("utf8")
				res()
			})
		})
	)
}

Promise.all(logPromises).then(setup)

// Credit to: https://stackoverflow.com/a/57448862
const escapeHTML = (str) =>
	str.replace(
		/[&<>'"]/g,
		(tag) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				"'": "&#39;",
				'"': "&quot;",
			}[tag])
	)

function makeLogList() {
	let items = ""

	for (let i = 1; i < onId; i++) {
		const log = logs[i]

		if (!log) {
			continue
		}

		items += `<h1>Request #${i}</h1>`

		items += "<pre>" + escapeHTML(log) + "</pre>"

		items += "<br><br>"
	}

	return `
		<html>
			${items}
		</html>
	`
}

// Setup server
function setup() {
	debug(`Loaded ${onId - 1} existing logs`)

	// Log on request
	app.get("/", (req, res) => {
		res.sendStatus(404)

		const thisId = onId
		onId += 1

		let timestamp = Date.now()

		debug(`Logging request #${thisId} at ${timestamp}`)

		const logged = JSON.stringify(
			{
				headers: req.headers,
				body: req.body,
				ip: req.ip,
				protocol: req.protocol,
				timestamp: timestamp,
			},
			undefined,
			4
		)

		logs[thisId] = logged

		debug(`Storing request #${thisId}`)
		fs.writeFile(path.join(LOG, `${thisId}.json`), logged, () => {})
	})

	// A request to view the auth form
	app.get("/auth", (req, res) => {
		res.send(AUTH_FORM_TEMPLATE)
	})

	// A request to authenticate
	const RATELIMITS = {}
	app.post("/authenticate", (req, res) => {
		const ip = req.ip
		const lastTry = RATELIMITS[ip] || 0

		if (Date.now() - lastTry >= AUTHENTICATE_RATELIMIT) {
			RATELIMITS[ip] = Date.now()

			if (req.body.auth == AUTH && AUTH) {
				res.cookie("AUTH", req.body.auth, {
					maxAge: 24 * 60 * 60 * 1000, // 24 hours
				})
				res.redirect("/logs")
			} else {
				res.status(403)
				res.send(TRY_AGAIN_TEMPLATE("Incorrect authentication!"))
			}
		} else {
			res.status(429)
			res.send(TRY_AGAIN_TEMPLATE("Please wait before trying again!"))
		}
	})

	// A request to view logs (requires authentication)
	app.get("/logs", (req, res) => {
		if (req.cookies["AUTH"] == AUTH && AUTH) {
			res.send(makeLogList())
		} else {
			res.redirect("/auth")
		}
	})

	// Start listening
	app.listen(PORT, () => {
		console.log(
			`Listening on port ${PORT}, logging to ${LOG}, auth ${
				AUTH ? "is set" : "is not set"
			}`
		)
	})
}
