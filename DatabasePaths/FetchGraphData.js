const Database = require('./Database');
const moment = require('moment-timezone');

const FetchGraphData = async (UserID, {DataRangeStart, DataRangeEnd, ColorID, GroupBy, Timezone}) => {
    console.log("User information ---------------------------------");
    console.log(Timezone);
    Timezone = Timezone || 'UTC';
    // const TimezoneFloat = moment().tz(Timezone).format('Z');
    const TimezoneFloat = "-07:00";
    UserID = 68;
    const TodayDate = (new Date()).toISOString().substring(0,11);
    let DateTodayWithTime = TodayDate + "00:00:00" + TimezoneFloat;

    const _tomorrow = new Date();
    _tomorrow.setDate(_tomorrow.getDate() + 1);
    let DateTomorrowWithTime = (new Date(_tomorrow).toISOString().substring(0,11)) + "00:00:00" + TimezoneFloat;
    console.log("TimezoneFloat", TimezoneFloat);
    // let DateTomorrowWithTime = TodayDate + "23:59:59" + TimezoneFloat;

    let DataRangeStartWhere = `AND StartDateTime >= '${DateTodayWithTime}'`;
    let DataRangeEndWhere = `AND EndDataTime <= '${DateTomorrowWithTime}'`;

    try {
        console.log("DataRangeStartutc time",new Date(DataRangeStart).toISOString());
        DataRangeStart = (new Date(DataRangeStart).toISOString().substring(0,11)) + "00:00:00" + TimezoneFloat;
        console.log("String to Date format", new Date(DataRangeStart));
        DataRangeStartWhere = `AND StartDateTime >= '${DataRangeStart}'`;

    } catch(err) {}

    try {
        const tomorrow = new Date(DataRangeEnd);
        tomorrow.setDate(tomorrow.getDate() + 1);
        DataRangeEnd = (new Date(tomorrow).toISOString().substring(0,11)) + "00:00:00" + TimezoneFloat;
        DataRangeEndWhere = `AND EndDataTime <= '${DataRangeEnd}'`;

    } catch(err) {}

    let SQL;
    console.log("Date start", DataRangeStartWhere);
    console.log("Date end", DataRangeEndWhere);
    if(ColorID && ColorID > 0 && ColorID < 12) {
        if(GroupBy && parseInt(GroupBy) === 1) {
            SQL = `
                SELECT
                    Events.CreatorEmail,
                    ROUND(SUM(TIMESTAMPDIFF(MINUTE, Events.StartDateTime, Events.EndDataTime))/60, 2) as TimeSpend,
                    count(Events.Status) as EventCount
                FROM Events
                WHERE Events.UserID = ${UserID} AND Events.Status = 1 AND Events.ColorID = ${ColorID} ${DataRangeStartWhere} ${DataRangeEndWhere} AND ROUND(TIMESTAMPDIFF(MINUTE, Events.StartDateTime, Events.EndDataTime)/60, 2)<24
                GROUP BY Events.CreatorEmail
            `;
        } else {
            SQL = `
                SELECT
                    EventAttendees.AttendeeEmail,
                    ROUND(SUM(TIMESTAMPDIFF(MINUTE, Events.StartDateTime, Events.EndDataTime))/60, 2) as TimeSpend,
                    count(Events.Status) as EventCount
                FROM EventAttendees
                INNER JOIN Events ON Events.EventID = EventAttendees.EventID
                WHERE Events.UserID = ${UserID} AND Events.Status = 1 AND Events.ColorID = ${ColorID} ${DataRangeStartWhere} ${DataRangeEndWhere} AND ROUND(TIMESTAMPDIFF(MINUTE, Events.StartDateTime, Events.EndDataTime)/60, 2)<24
                GROUP BY EventAttendees.AttendeeEmail
            `;
        }
    } else {
        SQL = `
            SELECT
                ColorID,
                ROUND(SUM(TIMESTAMPDIFF(MINUTE, Events.StartDateTime, Events.EndDataTime))/60, 2) as TimeSpend,
                count(Events.Status) as EventCount
            FROM ChromeExtension.Events
            WHERE UserID = ${UserID} AND Status = 1 ${DataRangeStartWhere} ${DataRangeEndWhere} AND ROUND(TIMESTAMPDIFF(MINUTE, Events.StartDateTime, Events.EndDataTime)/60, 2)<24
            GROUP BY ColorID
        `;
    }
    console.log("-------------------------Data-----------------------------");
    console.log(SQL);
    return await Database.query(SQL);
};

module.exports = FetchGraphData;