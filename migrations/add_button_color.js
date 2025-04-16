const { pool } = require("../server/db");

/**
 * Add the button_color column to the organizations table
 */
async function main() {
  const client = await pool.connect();
  
  try {
    console.log("Starting migration: Add button_color to organizations table");
    
    // Check if the column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
      AND column_name = 'button_color'
    `;
    
    const checkResult = await client.query(checkColumnQuery);
    
    if (checkResult.rows.length === 0) {
      console.log("Column 'button_color' does not exist. Adding it...");
      
      // Add the button_color column
      await client.query(`
        ALTER TABLE organizations 
        ADD COLUMN button_color TEXT
      `);
      
      console.log("Successfully added 'button_color' column to organizations table");
    } else {
      console.log("Column 'button_color' already exists. Skipping...");
    }
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed with error:", err);
    process.exit(1);
  });