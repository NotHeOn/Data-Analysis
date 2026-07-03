'use strict'
const fs = require('fs')
const path = require('path')
const http = require('http')
const url = require('url')
const opn = require('open')
const destroyer = require('server-destroy')

const {google} = require('googleapis')
const { resolve } = require('dns')
const { waitForDebugger } = require('inspector')

const keyPath = path.join(__dirname,"../client_credentials/secret.json")
const tokenPath = path.join(__dirname,"../client_credentials/token.json")
let keys = {
    redirect_uris:[""]
}
if (fs.existsSync(keyPath)){
    keys = require(keyPath).web
}

const oauth2Client = new google.auth.OAuth2(
    keys.client_id,
    keys.client_secret,
    keys.redirect_uris[0]
)

google.options({auth:oauth2Client})

oauth2Client.on('tokens', (tokens) => {
    const existing = fs.existsSync(tokenPath) ? JSON.parse(fs.readFileSync(tokenPath)) : {}
    fs.writeFileSync(tokenPath, JSON.stringify({...existing, ...tokens}))
})

async function authenticate(scopes) {
    if (fs.existsSync(tokenPath)) {
        oauth2Client.setCredentials(JSON.parse(fs.readFileSync(tokenPath)))
        return oauth2Client
    }

    return new Promise((resolve,reject) => {
        // grab the url that will be used for authorization
        const authorizeUrl = oauth2Client.generateAuthUrl({
            access_type:'offline',
            prompt:'consent',
            scope: scopes.join(" ")
        })

        const server = http
        .createServer(async (req,res) => {
            try {
                const qs = new url.URL(req.url,'http://localhost:8080')
                .searchParams
                if(qs.has('code')){
                    res.end("Authentication successful")
                    server.destroy()
                    const {tokens} = await oauth2Client.getToken(qs.get("code"))
                    // eslint-disable-line require-atomic-updates
                    oauth2Client.credentials = tokens
                    resolve(oauth2Client);
                }
            } catch (e) {
                reject(e)
            }
        })
        .listen(8080, () => {
            opn(authorizeUrl,{wait:false}).then(cp => cp.unref())
        })
        destroyer(server)
    })
}

module.exports = {
    authenticate
}