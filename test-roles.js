const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgres://postgres:postgres1@localhost:15432/gdprod?sslmode=disable'
});

async function main() {
    await client.connect();
    const res = await client.query(`
    select u.id, u.name, u.email, r.name as role_name
    from users u
    left join user_roles ur on u.id = ur.user_id
    left join roles r on ur.role_id = r.id
  `);

    const users = {};
    res.rows.forEach(row => {
        if (!users[row.email]) {
            users[row.email] = { name: row.name, roles: [] };
        }
        if (row.role_name) {
            users[row.email].roles.push(row.role_name);
        }
    });

    console.log(JSON.stringify(users, null, 2));
    await client.end();
}

main().catch(console.error);
