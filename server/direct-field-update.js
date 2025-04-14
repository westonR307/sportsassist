// Direct custom field update script
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Update a custom field directly in the database
 * @param {number} fieldId - The ID of the field to update
 * @param {object} updateData - The data to update
 * @returns {Promise<object>} - The updated field
 */
async function updateField(fieldId, updateData) {
  // Start a client
  const client = await pool.connect();

  try {
    console.log("Direct update script running for field ID:", fieldId);
    console.log("Update data:", updateData);

    // First check if the field exists
    const checkResult = await client.query(
      'SELECT * FROM custom_fields WHERE id = $1',
      [fieldId]
    );

    if (checkResult.rows.length === 0) {
      console.error("Field not found with ID:", fieldId);
      throw new Error("Custom field not found");
    }

    console.log("Field found, proceeding with update");

    // Filter fields that shouldn't be updated
    const filteredData = { ...updateData };
    delete filteredData.id;
    delete filteredData.organizationId;
    delete filteredData.createdAt;

    // Build query parts
    const setClause = [];
    const values = [];
    let paramCounter = 1;

    for (const [key, value] of Object.entries(filteredData)) {
      // Convert camelCase to snake_case for column names
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClause.push(`${snakeKey} = $${paramCounter}`);
      values.push(value);
      paramCounter++;
    }

    // Add updated_at
    setClause.push(`updated_at = NOW()`);

    // Construct the query
    const updateQuery = `
      UPDATE custom_fields 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;
    values.push(fieldId);

    console.log("Update query:", updateQuery);
    console.log("Query values:", values);

    // Execute the update
    const result = await client.query(updateQuery, values);

    if (result.rows.length === 0) {
      throw new Error("Update failed");
    }

    console.log("Update successful");
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Delete a custom field directly from the database
 * @param {number} fieldId - The ID of the field to delete
 * @returns {Promise<boolean>} - Whether the deletion was successful
 */
async function deleteField(fieldId) {
  // Start a client
  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');

    try {
      console.log("Starting direct deletion for field ID:", fieldId);

      // First check if the field exists
      const checkResult = await client.query(
        'SELECT * FROM custom_fields WHERE id = $1',
        [fieldId]
      );

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      console.log("Field found, proceeding with deletion");

      // 1. Delete any camp custom fields associations
      const campFieldsResult = await client.query(
        'DELETE FROM camp_custom_fields WHERE custom_field_id = $1 RETURNING id',
        [fieldId]
      );
      console.log(`Deleted ${campFieldsResult.rowCount} camp field associations`);

      // 2. Delete any custom field responses
      const responsesResult = await client.query(
        'DELETE FROM custom_field_responses WHERE custom_field_id = $1 RETURNING id',
        [fieldId]
      );
      console.log(`Deleted ${responsesResult.rowCount} field responses`);

      // 3. Delete any camp meta values
      try {
        const metaFieldsResult = await client.query(
          'DELETE FROM camp_meta_fields WHERE custom_field_id = $1 RETURNING id',
          [fieldId]
        );
        console.log(`Deleted ${metaFieldsResult.rowCount} camp meta fields`);
      } catch (e) {
        // Table might not exist
        console.log("Note: camp_meta_fields table might not exist, skipping");
      }

      // 4. Finally delete the custom field itself
      const fieldResult = await client.query(
        'DELETE FROM custom_fields WHERE id = $1 RETURNING id',
        [fieldId]
      );

      if (fieldResult.rowCount === 0) {
        throw new Error("Field was not deleted, may have foreign key constraints");
      }

      // Commit the transaction
      await client.query('COMMIT');
      console.log("Transaction committed successfully");

      return true;
    } catch (err) {
      // If any error happens, roll back the transaction
      await client.query('ROLLBACK');
      console.error("Transaction error, rolled back:", err);
      throw err;
    }
  } finally {
    client.release();
  }
}

export {
  updateField,
  deleteField
};