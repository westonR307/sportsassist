import pg from 'pg';
const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log("Testing database connection...");
    await pool.query('SELECT NOW()');
    console.log("Database connection successful!");

    // First check registrations for camp ID 7
    console.log("\nChecking registrations for camp ID 7:");
    const registrationsResult = await pool.query(`
      SELECT * FROM registrations WHERE camp_id = 7
    `);
    console.log(`Found ${registrationsResult.rowCount} registrations for camp ID 7`);
    console.log(JSON.stringify(registrationsResult.rows, null, 2));

    // Then check the full join query
    console.log("\nChecking full join query for camp ID 7:");
    const joinResult = await pool.query(`
      SELECT r.id, r.camp_id, r.child_id, 
             c.full_name as child_name, c.parent_id, 
             CONCAT(u.first_name, ' ', u.last_name) as parent_name, 
             u.email as parent_email
      FROM registrations r
      JOIN children c ON r.child_id = c.id
      JOIN users u ON c.parent_id = u.id
      WHERE r.camp_id = 7
    `);
    console.log(`Found ${joinResult.rowCount} registrations with parent info for camp ID 7`);
    console.log(JSON.stringify(joinResult.rows, null, 2));
    
    // Check for case issues or null values in the fields
    console.log("\nChecking for potential field issues:");
    const fieldsResult = await pool.query(`
      SELECT 
        r.id, r.camp_id, r.child_id,
        c.id as child_db_id, c.full_name, c.parent_id,
        u.id as user_db_id, u.first_name, u.last_name, u.email
      FROM registrations r
      LEFT JOIN children c ON r.child_id = c.id
      LEFT JOIN users u ON c.parent_id = u.id
      WHERE r.camp_id = 7
    `);
    console.log(`Field inspection results: ${fieldsResult.rowCount} rows`);
    console.log(JSON.stringify(fieldsResult.rows, null, 2));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
    console.log("Connection closed");
  }
}

main();