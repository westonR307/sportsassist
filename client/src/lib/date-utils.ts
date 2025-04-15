/**
 * Date utilities for consistent date handling across the application
 */

/**
 * Formats a date for PostgreSQL database storage
 * Ensures consistent YYYY-MM-DD format regardless of input type
 * 
 * @param dateValue Date value (can be Date object, ISO string, or YYYY-MM-DD string)
 * @returns Formatted YYYY-MM-DD string for PostgreSQL
 */
export function formatDateForPostgres(dateValue: Date | string | null | undefined): string {
  console.log(`[formatDateForPostgres] Input:`, dateValue, `Type: ${typeof dateValue}`);
  
  // Handle null/undefined
  if (!dateValue) {
    console.warn('[formatDateForPostgres] Null/undefined date provided');
    return new Date().toISOString().split('T')[0]; // Default to current date
  }
  
  // If already in correct format, return as is
  if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    console.log('[formatDateForPostgres] Already formatted correctly:', dateValue);
    return dateValue;
  }
  
  try {
    // Parse to Date object if it's a string
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    // Validate date
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error('[formatDateForPostgres] Invalid date:', dateValue);
      return new Date().toISOString().split('T')[0]; // Fall back to current date
    }
    
    // Extract date components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Create YYYY-MM-DD format
    const formattedDate = `${year}-${month}-${day}`;
    console.log(`[formatDateForPostgres] Formatted ${dateValue} to ${formattedDate}`);
    
    return formattedDate;
  } catch (error) {
    console.error('[formatDateForPostgres] Error formatting date:', error);
    return new Date().toISOString().split('T')[0]; // Fall back to current date
  }
}

/**
 * Normalizes a date value for display and form handling
 * 
 * @param dateValue Any date value (Date, string, etc.)
 * @returns A normalized YYYY-MM-DD string
 */
export function normalizeDate(dateValue: Date | string | null | undefined): string {
  console.log(`[NormalizeDate] Input:`, dateValue);
  
  if (!dateValue) {
    console.log('[NormalizeDate] Empty input, returning empty string');
    return '';
  }
  
  // If already a string in YYYY-MM-DD format, return as is
  if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    console.log(`[NormalizeDate] Already in YYYY-MM-DD format: ${dateValue}`);
    return dateValue;
  }
  
  try {
    // If it's a Date object, use it directly
    if (dateValue instanceof Date) {
      console.log(`[NormalizeDate] Using Date object directly: ${dateValue}`);
      // Preserve local date without timezone conversion
      const year = dateValue.getFullYear();
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const day = String(dateValue.getDate()).padStart(2, '0');
      
      const normalized = `${year}-${month}-${day}`;
      console.log(`[NormalizeDate] Final result: ${dateValue} → UTC date: ${utcDate.toISOString()} → Normalized: ${normalized}`);
      return normalized;
    }
    
    // Otherwise parse the string to a Date
    const parsedDate = new Date(String(dateValue));
    if (isNaN(parsedDate.getTime())) {
      console.error(`[NormalizeDate] Invalid date: ${dateValue}`);
      return '';
    }
    
    // Format using UTC to avoid timezone issues
    const year = parsedDate.getUTCFullYear();
    const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getUTCDate()).padStart(2, '0');
    
    const normalized = `${year}-${month}-${day}`;
    console.log(`[NormalizeDate] From string: ${dateValue} → Parsed: ${parsedDate.toISOString()} → Normalized: ${normalized}`);
    
    return normalized;
  } catch (error) {
    console.error(`[NormalizeDate] Error processing date ${dateValue}:`, error);
    return '';
  }
}

/**
 * Formats a date for display to users
 * 
 * @param dateValue Any date value
 * @param format The desired format ('short', 'long', or 'full')
 * @returns Formatted date string
 */
export function formatDateForDisplay(
  dateValue: Date | string | null | undefined, 
  format: 'short' | 'long' | 'full' = 'short'
): string {
  if (!dateValue) return '';
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    
    if (format === 'short') {
      return date.toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } else if (format === 'long') {
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric', 
        year: 'numeric'
      });
    }
  } catch (error) {
    console.error('Error formatting date for display:', error);
    return '';
  }
}