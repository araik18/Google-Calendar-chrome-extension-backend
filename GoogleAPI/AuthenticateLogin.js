const oAuth2ClientGenerator = require("./oAuth2Client");
const {google} = require('googleapis');
const StoreGoogleToken = require("../DatabasePaths/StoreGoogleTokens");

module.exports = async (code) => {
    const oAuth2Client = oAuth2ClientGenerator();

    const TokenResp = await oAuth2Client.getToken(code);

    oAuth2Client.setCredentials(TokenResp.tokens);
    
    const UserInfo = await google.oauth2('v2').userinfo.v2.me.get({auth: oAuth2Client});

    const UserToken = await StoreGoogleToken(UserInfo.data.email, TokenResp.tokens.access_token, TokenResp.tokens.expiry_date, TokenResp.tokens.refresh_token);

    return {UserToken, Email: UserInfo.data.email};
}