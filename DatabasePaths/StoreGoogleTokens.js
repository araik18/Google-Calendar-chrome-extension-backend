const Database = require('./Database');
const { promisify } = require('util')
const randomBytesAsync = promisify(require('crypto').randomBytes)

const StoreGoogleToken = async (Email, AccessToken, ExpiryDate, RefreshToken) => {

    const [UserToken, TempToken] = (await Promise.all([randomBytesAsync(200), randomBytesAsync(200)])).map(item => item.toString('hex'));

    const conn = await Database.getConnection();
    try {
        await conn.beginTransaction();
        try {
            if(RefreshToken) {
                await conn.query(`
                    INSERT INTO Users (Email, AccessToken, RefreshToken, ExpiryDate, UserToken) VALUES(?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE AccessToken = ?, RefreshToken = ?, ExpiryDate = ?, UserToken = ?`, 
                    [Email, AccessToken, RefreshToken, ExpiryDate, UserToken, AccessToken, RefreshToken, ExpiryDate, UserToken]
                );
            } else {
                await conn.query(`
                    INSERT INTO Users (Email, AccessToken, RefreshToken, ExpiryDate, UserToken) VALUES(?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE AccessToken = ?, ExpiryDate = ?, UserToken = ?`, 
                    [Email, AccessToken, RefreshToken, ExpiryDate, UserToken, AccessToken, ExpiryDate, UserToken]
                );
            }

            const {UserID} = (await conn.query('SELECT UserID FROM Users WHERE UserToken = ?', [UserToken]))[0];

            await conn.query(`
                INSERT INTO UserTempToken (UserID, UserTempToken) VALUES(?, ?)
                ON DUPLICATE KEY UPDATE UserID = ?, UserTempToken = ?, Timestamp = now()`, 
                [UserID, TempToken, UserID, TempToken]
            );

            await conn.commit();

            conn.release();

            return TempToken;

        } catch(err) {
            await conn.rollback();
            throw err;
        }
    } catch(err) {
        console.log(err);
        conn.release();
        throw err;
    }
};

module.exports = StoreGoogleToken;