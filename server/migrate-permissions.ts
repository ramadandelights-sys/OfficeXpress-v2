import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { UserPermissions, PermissionLevel } from "@shared/schema";

/**
 * Migration script to convert old boolean permissions to new granular permission structure
 * 
 * Old format: { blogPosts: true, corporateBookings: false, ... }
 * New format: { blogPosts: { view: true, edit: true }, corporateBookings: { view: false, edit: false }, ... }
 */

// Sections that support CSV download
const CSV_SECTIONS = [
  'corporateBookings',
  'rentalBookings',
  'vendorRegistrations',
  'contactMessages',
  'driverManagement'
];

function convertLegacyPermissions(legacyPerms: any): UserPermissions {
  if (!legacyPerms || typeof legacyPerms !== 'object') {
    return {};
  }

  const newPermissions: UserPermissions = {};

  // Handle each permission
  for (const [key, value] of Object.entries(legacyPerms)) {
    // Driver Assignment stays as boolean (it's an action, not CRUD)
    if (key === 'driverAssignment') {
      newPermissions.driverAssignment = value as boolean;
      continue;
    }

    // Handle renamed "drivers" -> "driverManagement"
    const newKey = key === 'drivers' ? 'driverManagement' : key;

    // Convert boolean to PermissionLevel
    if (typeof value === 'boolean') {
      const permLevel: PermissionLevel = {
        view: value,
        edit: value,
      };

      // Add downloadCsv for sections that support CSV export
      if (CSV_SECTIONS.includes(newKey)) {
        permLevel.downloadCsv = value;
      }

      newPermissions[newKey as keyof UserPermissions] = permLevel as any;
    } else if (typeof value === 'object' && value !== null) {
      // Already in new format, just copy it
      newPermissions[newKey as keyof UserPermissions] = value as any;
    }
  }

  return newPermissions;
}

async function migratePermissions() {
  try {
    console.log('Starting permission migration...');

    // Get all employees
    const allUsers = await db.select().from(users).where(eq(users.role, 'employee'));

    console.log(`Found ${allUsers.length} employee accounts to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of allUsers) {
      // Check if permissions are already in new format
      const perms = user.permissions as any;
      
      // If any permission is an object with "view" property, it's already migrated
      const isAlreadyMigrated = perms && Object.values(perms).some(
        (val: any) => typeof val === 'object' && val !== null && 'view' in val
      );

      if (isAlreadyMigrated) {
        console.log(`Skipping user ${user.id} (${user.name}) - already migrated`);
        skippedCount++;
        continue;
      }

      // Convert permissions
      const newPermissions = convertLegacyPermissions(perms);

      // Update user
      await db.update(users)
        .set({ permissions: newPermissions as any })
        .where(eq(users.id, user.id));

      console.log(`Migrated user ${user.id} (${user.name})`);
      console.log(`  Old:`, JSON.stringify(perms));
      console.log(`  New:`, JSON.stringify(newPermissions));
      migratedCount++;
    }

    console.log('\nMigration complete!');
    console.log(`- Migrated: ${migratedCount} employees`);
    console.log(`- Skipped: ${skippedCount} employees (already migrated)`);
    console.log(`- Total: ${allUsers.length} employees`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
migratePermissions()
  .then(() => {
    console.log('\n✅ Permission migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Permission migration failed:', error);
    process.exit(1);
  });
