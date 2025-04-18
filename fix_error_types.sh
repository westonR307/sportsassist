#!/bin/bash

# Find all catch statements in cache-utils.ts and replace "error" with "error: any"
sed -i 's/catch (error) {/catch (error: any) {/g' server/cache-utils.ts

# Make the script executable
chmod +x fix_error_types.sh

# Run the script
./fix_error_types.sh

# Verify the changes
grep -n "catch (error:" server/cache-utils.ts
