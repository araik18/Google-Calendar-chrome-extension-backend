const oAuth2ClientGenerator = require('./oAuth2Client');

module.exports = () => {
    return oAuth2ClientGenerator().generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/userinfo.email'],
        prompt: 'consent'
    });
}