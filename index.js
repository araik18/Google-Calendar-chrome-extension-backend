require('dotenv').config()
const express = require('express');
const AuthenticateUser = require('./DatabasePaths/AuthenticateUser');
const app = express();
const AuthenticateLogin = require('./GoogleAPI/AuthenticateLogin');
const GenerateAuthURL = require('./GoogleAPI/GenerateAuthURL');
const StoreEvents = require('./DatabasePaths/StoreEvents');
const GenerateUserToken = require('./DatabasePaths/GenerateUserToken');
const FetchGraphData = require('./DatabasePaths/FetchGraphData');
const cors = require('cors');

const corsOptions = {
    origin: `chrome-extension://${process.env.ExtensionID}`,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.use(cors(corsOptions));

app.use(express.json());

const moment = require('moment-timezone');

app.get('/', (req, res) => {
    const Timezone = "Asia/Colombo";

    var tomorrow = new Date("2021-05-31");
    tomorrow.setDate(tomorrow.getDate() + 1);
    const TodayDate = (new Date(tomorrow)).toISOString().substring(0,11);

    res.send({Message: TodayDate});
});

app.get('/Login', (req, res) => {
    const LoginURL = GenerateAuthURL();
    res.redirect(LoginURL);
});

app.get('/AuthenticateLogin', async (req, res) => {
    try {
        const {UserToken, Email} = await AuthenticateLogin(req.query.code);

        console.log(UserToken);
                
        const RedirectLink = `chrome-extension://${process.env.ExtensionID}/Contents/AuthenticateLogin.html?UserToken=${UserToken}&Email=${Email}`;
        res.send(`
            <html>
                <style>
                    .container {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        -moz-transform: translateX(-50%) translateY(-50%);
                        -webkit-transform: translateX(-50%) translateY(-50%);
                        transform: translateX(-50%) translateY(-50%);
                    }
                </style>
                <div class="container">
                    <a href="${RedirectLink}"><span>Click to continue</span></a>
                </div>
            </html>
        `)
    } catch(err) {
        console.log(err);
        res.send({Error: true, Message: 'Something went wrong while generating temp token'});
    }
});

app.post('/GenerateAccessToken', async (req, res) => {
    try {
        const UserToken = await GenerateUserToken(req.body.code, req.body.email);
        res.send({UserToken});
    } catch(err) {
        console.log(err);
        res.send({Error: true, Message: 'Something went wrong while generating user token'});
    }
});

app.post('/StoreEvents', async (req, res) => {
    const UserToken = req.headers.authorization;
    try {
        if(UserToken) {
            console.log("what");
            const UserID = await AuthenticateUser(UserToken);
            res.setTimeout(500000);
            await StoreEvents(UserID);
            res.send({Success: true});
        } else {
            res.send({Error: true, Message: 'Authentication Error'})
        }
    } catch(err) {
        console.log(err);
        res.send({Error: true, Message: 'Authentication Error'})
    }
});

app.get('/FetchReports', async (req, res) => {
    const UserToken = req.headers.authorization;
    try {
        if(UserToken) {
            const UserID = await AuthenticateUser(UserToken);

            res.send(await FetchGraphData(UserID, req.query));

        } else {
            res.send({Error: true, Message: 'Authentication Error'})
        }
    } catch(err) {
        console.log(err);
        res.send({Error: true, Message: 'Data Fetch Error'})
    }
});

app.listen(process.env.PORT, () => {
    console.log(`app listening at http://localhost:${process.env.PORT}`)
});