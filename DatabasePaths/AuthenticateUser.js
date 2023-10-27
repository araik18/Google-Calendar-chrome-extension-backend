const Database = require('./Database');

const AuthenticateUser = async (UserToken) => {
    const UserResp = await Database.query('SELECT UserID FROM Users WHERE UserToken = ?', [UserToken]);

    if(UserResp[0]) {
        return UserResp[0].UserID;
    }
    throw new Error('Authentication Failed');
};

module.exports = AuthenticateUser;