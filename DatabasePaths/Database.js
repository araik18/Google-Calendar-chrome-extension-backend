const mariadb = require('mariadb');

const pool = mariadb.createPool({
	host: process.env.MySqlHost,
	user: process.env.MySqlUser,
	password: process.env.MySqlPassword,
	database: process.env.MySqlDB,
	connectionLimit: 45,
	//timezone: '+05:30'
});

module.exports = pool;