import pg from 'pg';
const { Pool } = pg;

async function getRegistrationsForCamp(campId) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log(`Fetching registrations for camp ID ${campId}...`);
    
    // First check basic registrations
    const registrationsResult = await pool.query(`
      SELECT * FROM registrations WHERE camp_id = $1
    `, [campId]);
    console.log(`Found ${registrationsResult.rowCount} registrations`);
    console.log(JSON.stringify(registrationsResult.rows, null, 2));
    
    if (registrationsResult.rowCount > 0) {
      // Now check the full join query to get parent/child info
      const joinResult = await pool.query(`
        SELECT r.id, r.camp_id, r.child_id, 
               c.full_name as child_name, c.parent_id, 
               CONCAT(u.first_name, ' ', u.last_name) as parent_name, 
               u.email as parent_email
        FROM registrations r
        JOIN children c ON r.child_id = c.id
        JOIN users u ON c.parent_id = u.id
        WHERE r.camp_id = $1
      `, [campId]);
      
      console.log(`Found ${joinResult.rowCount} registrations with parent info`);
      console.log(JSON.stringify(joinResult.rows, null, 2));
      
      // Return this data
      return joinResult.rows;
    }
    
    return [];
  } catch (error) {
    console.error("Error:", error);
    return [];
  } finally {
    await pool.end();
    console.log("Database connection closed");
  }
}

// Get registrations for camp ID 7
const campId = 7;
const registrations = await getRegistrationsForCamp(campId);
console.log(`Completed: Found ${registrations.length} registrations with full data for camp ID ${campId}`);