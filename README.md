# log-it

A simple tool to... you guessed it - log it!

Logs all request made to the server.

# Usage

To begin, you'll first need node (and npm).

First install dependencies:

```bash
npm install
```

Then, to run, use:

```bash
npm run start
```

# Configuration

To configure log-it, you can use the following environment variables:

-   `LOG_IT_PORT` = The port log-it will bind to, default is `8000`
-   `LOG_IT_LOG` = The folder log-it will log to, default is `log/`
-   `LOG_IT_REDIRECT_TO` = The website log-it will redirect to after logging, default is `undefined`
-   `LOG_IT_DEBUG` = Set to `1` to enable debug logs, `0` to disable them, default is `1`
-   `LOG_IT_AUTH` = The authentication password required to view the `/logs/` endpoint (optional)
-   `LOG_IT_AUTHENTICATE_RATELIMIT` = The ratelimit at which a specific ip can authenticate in milliseconds, default is `5000`

# License

Licensed under the [MIT License](LICENSE)
