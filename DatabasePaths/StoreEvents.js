const { google } = require('googleapis');
const oAuth2ClientGenerator = require('../GoogleAPI/oAuth2Client');
const Database = require('./Database');

/**
 * 
 * @param {Number} UserID 
 * @param {import('mariadb').PoolConnection} conn 
 * @param {oAuth2Client} oAuth2Client 
 * @param {String} NextPageToken 
 * @param {String} NextSyncToken 
 */

const StoreEvents = async (UserID, conn, oAuth2Client, NextPageToken, NextSyncToken, InitialFullSync = false) => {
    const Options = {
        calendarId: 'primary',
        maxResults: 500, //Max 500 Events at a time.
        singleEvents: true
    };
    if (NextPageToken) {
        Options.pageToken = NextPageToken;
    }
    if (!InitialFullSync && NextSyncToken) {
        Options.syncToken = NextSyncToken;
    }

    // console.info("oAuth2Client", oAuth2Client);
    // console.info("NextPageToken", NextPageToken);
    // console.info("NextSyncToken", NextSyncToken);

    let Events;
    try {
        Events = (await google.calendar({ version: 'v3', auth: oAuth2Client }).events.list(Options)).data;
    } catch (e) {
        console.log('sync-error', e.message);
        return StoreEvents(UserID, conn, oAuth2Client, NextPageToken, null, true);
    }

    console.info('Event.items', Events.items);

    if (Events.items.length) {

        //Inserting all the events to the Database.
        await conn.batch(
            'INSERT INTO `Events` (EventID, CreatorEmail, UserID, ColorID, StartDateTime, EndDataTime, Status) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE ColorID = ?, StartDateTime = ?, EndDataTime = ?, Status = ?',
            Events.items.map(item => {
                console.log(item);
                if (item.status === 'cancelled') {
                    item.colorId = 7;
                    item.start = {
                        dateTime: null
                    }
                    item.end = {
                        dateTime: null
                    }
                    item.status = item.status === 'cancelled' ? 0 : 1;
                } else {
                    (!item.colorId) && (item.colorId = 7); //Default color is Peacock and the ColorID for Peacock is 7

                    (!item.start.dateTime) && (item.start.dateTime = item.start.date);
                    (!item.end.dateTime) && (item.end.dateTime = item.end.date);
                    item.status = item.status === 'cancelled' ? 0 : 1;
                }

                let creator = '';
                if (item.creator && item.creator.email) {
                    creator = item.creator.email;
                }

                return [item.id, creator, UserID, item.colorId, item.start.dateTime, item.end.dateTime, item.status, item.colorId, item.start.dateTime, item.end.dateTime, item.status]
            })
        ).catch(err => {
            console.log(err);
        });
        
        //Now Inserting All the Event Attendees to the database.
        for (let i = 0; i < Events.items.length; i = i + 10) {
            let Promises = [];
            for (let j = i; j < i + 10 && j < Events.items.length; j++) {
                let item = Events.items[j];
                if (item.attendees) {
                    Promises.push(conn.batch(
                        'INSERT IGNORE INTO `EventAttendees` (EventID, AttendeeEmail, AttendeeName) VALUES (?, ?, ?)',
                        item.attendees.map(attendees => [item.id, attendees.email, attendees.displayName ? attendees.displayName : ''])
                    ).catch(err => {
                        console.log(err);
                    }));
                }
            }
            await Promise.allSettled(Promises);
        }
    }

    if (Events.nextPageToken) {
        return await StoreEvents(UserID, conn, oAuth2Client, Events.nextPageToken);
    } else {
        return Events.nextSyncToken;
    }
}

const StoreEventsInit = async (UserID) => {

    const conn = await Database.getConnection();

    try {
        await conn.beginTransaction();
        try {
            const GoogleTokens = await conn.query('SELECT AccessToken, RefreshToken, ExpiryDate, SyncToken FROM Users LEFT JOIN UserSyncToken ON Users.UserID = UserSyncToken.UserID WHERE Users.UserID = ?', [UserID]);
            if (GoogleTokens[0]) {
                const oAuth2Client = oAuth2ClientGenerator();
                oAuth2Client.setCredentials({
                    access_token: GoogleTokens[0].AccessToken,
                    refresh_token: GoogleTokens[0].RefreshToken,
                    expiry_date: GoogleTokens[0].ExpiryDate
                });

                oAuth2Client.on('tokens', async (credentials) => {
                    await conn.query('UPDATE Users SET AccessToken = ?, ExpiryDate = ? WHERE UserID = ?', [credentials.access_token, credentials.expiry_date, UserID]);
                });

                try {
                    const nextSyncToken = await StoreEvents(UserID, conn, oAuth2Client, undefined, GoogleTokens[0].SyncToken);

                    await conn.query('INSERT INTO UserSyncToken (UserID, SyncToken) VALUES (?, ?) ON DUPLICATE KEY UPDATE SyncToken = ?', [UserID, nextSyncToken, nextSyncToken]);

                } catch (err) {
                    throw err;
                }
                await conn.commit();
                conn.release();
            } else {
                throw new Error();
            }
        } catch (err) {
            conn.rollback();
            throw err;
        }
    } catch (err) {
        conn.release();
        console.log(err);
    }
};

module.exports = StoreEventsInit;