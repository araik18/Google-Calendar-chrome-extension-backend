const { GoogleClientID, GoogleClientSecret, GoogleRedirectURL } = process.env;
const {google} = require('googleapis');

module.exports = () => {
    return new google.auth.OAuth2(GoogleClientID, GoogleClientSecret, GoogleRedirectURL);
}