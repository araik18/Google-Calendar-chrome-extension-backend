
const Database = require('./Database');
const StoreEvents = require('./StoreEvents');

const GenerateUserToken = async (TempToken, UserEmail) => {
    const UserResp = await Database.query('SELECT Users.UserToken, Users.UserID FROM Users INNER JOIN UserTempToken ON UserTempToken.UserID = Users.UserID WHERE UserTempToken.UserTempToken = ? AND Users.Email = ? AND UserTempToken.Timestamp > NOW() - INTERVAL 15 MINUTE', [TempToken, UserEmail]);

    if(UserResp[0]) {
        StoreEvents(UserResp[0].UserID).catch(err => {
            console.log(err);
        });

        await Database.query('DELETE FROM UserTempToken WHERE UserTempToken.UserTempToken = ?', [TempToken]);

        return UserResp[0].UserToken; 
    }
    throw new Error('Authentication Failed');
};

module.exports = GenerateUserToken;