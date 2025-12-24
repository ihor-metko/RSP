# Image URL Migration Guide

This guide helps you migrate existing image URLs from the old API-based format (`/api/images/...`) to the new absolute URL format served by Nginx.

## Background

Previously, images were served through Next.js API routes:
```
/api/images/organizations/{id}/{filename}
```

Now, images are served directly by Nginx with absolute URLs:
```
https://dev.arenaone.app/uploads/organizations/{id}/{filename}
```

## Do You Need to Migrate?

**Check if you have existing records** with old-style URLs:

```sql
-- Check organizations
SELECT id, name, logo, "heroImage" 
FROM "Organization" 
WHERE logo LIKE '/api/images/%' 
   OR "heroImage" LIKE '/api/images/%';

-- Check clubs
SELECT id, name, logo, "heroImage" 
FROM "Club" 
WHERE logo LIKE '/api/images/%' 
   OR "heroImage" LIKE '/api/images/%';

-- Check users
SELECT id, name, email, image 
FROM "User" 
WHERE image LIKE '/api/images/%';
```

If these queries return no results, you don't need to migrate anything. The new upload system will automatically use absolute URLs.

## Migration Options

### Option 1: Automatic Migration (Recommended)

The system supports backward compatibility:
- Old `/api/images/...` URLs will continue to work
- New uploads will automatically use absolute URLs
- You can migrate gradually over time

**No immediate action required** - the system will work with both URL formats.

### Option 2: Batch Migration via SQL

If you want to migrate all URLs at once, use these SQL commands:

**⚠️ IMPORTANT: Backup your database first!**

```bash
# Backup your database
pg_dump -U your_user -d arenaone > backup_$(date +%Y%m%d_%H%M%S).sql
```

Then run the migration:

```sql
-- Set your base URL
-- Replace with your actual domain
DO $$
DECLARE
    base_url TEXT := 'https://arenaone.app';
BEGIN
    -- Migrate Organization logos
    UPDATE "Organization" 
    SET logo = CONCAT(base_url, REPLACE(logo, '/api/images', '/uploads'))
    WHERE logo LIKE '/api/images/%';

    -- Migrate Organization hero images
    UPDATE "Organization" 
    SET "heroImage" = CONCAT(base_url, REPLACE("heroImage", '/api/images', '/uploads'))
    WHERE "heroImage" LIKE '/api/images/%';

    -- Migrate Club logos
    UPDATE "Club" 
    SET logo = CONCAT(base_url, REPLACE(logo, '/api/images', '/uploads'))
    WHERE logo LIKE '/api/images/%';

    -- Migrate Club hero images
    UPDATE "Club" 
    SET "heroImage" = CONCAT(base_url, REPLACE("heroImage", '/api/images', '/uploads'))
    WHERE "heroImage" LIKE '/api/images/%';

    -- Migrate User avatars
    UPDATE "User" 
    SET image = CONCAT(base_url, REPLACE(image, '/api/images', '/uploads'))
    WHERE image LIKE '/api/images/%';
END $$;
```

### Option 3: Script-Based Migration

Create a migration script that validates URLs before updating:

```typescript
// scripts/migrateImageUrls.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.NEXT_PUBLIC_ASSETS_BASE_URL || 'https://arenaone.app';

async function migrateImageUrls() {
  console.log(`Migrating image URLs to use base URL: ${BASE_URL}`);

  // Migrate organizations
  const orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { logo: { startsWith: '/api/images/' } },
        { heroImage: { startsWith: '/api/images/' } },
      ],
    },
  });

  for (const org of orgs) {
    const updates: any = {};
    
    if (org.logo?.startsWith('/api/images/')) {
      updates.logo = `${BASE_URL}${org.logo.replace('/api/images', '/uploads')}`;
    }
    
    if (org.heroImage?.startsWith('/api/images/')) {
      updates.heroImage = `${BASE_URL}${org.heroImage.replace('/api/images', '/uploads')}`;
    }
    
    if (Object.keys(updates).length > 0) {
      await prisma.organization.update({
        where: { id: org.id },
        data: updates,
      });
      console.log(`Updated organization: ${org.name} (${org.id})`);
    }
  }

  // Migrate clubs (similar pattern)
  const clubs = await prisma.club.findMany({
    where: {
      OR: [
        { logo: { startsWith: '/api/images/' } },
        { heroImage: { startsWith: '/api/images/' } },
      ],
    },
  });

  for (const club of clubs) {
    const updates: any = {};
    
    if (club.logo?.startsWith('/api/images/')) {
      updates.logo = `${BASE_URL}${club.logo.replace('/api/images', '/uploads')}`;
    }
    
    if (club.heroImage?.startsWith('/api/images/')) {
      updates.heroImage = `${BASE_URL}${club.heroImage.replace('/api/images', '/uploads')}`;
    }
    
    if (Object.keys(updates).length > 0) {
      await prisma.club.update({
        where: { id: club.id },
        data: updates,
      });
      console.log(`Updated club: ${club.name} (${club.id})`);
    }
  }

  // Migrate users
  const users = await prisma.user.findMany({
    where: {
      image: { startsWith: '/api/images/' },
    },
  });

  for (const user of users) {
    if (user.image) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          image: `${BASE_URL}${user.image.replace('/api/images', '/uploads')}`,
        },
      });
      console.log(`Updated user: ${user.email} (${user.id})`);
    }
  }

  console.log('Migration completed!');
  console.log(`  Organizations updated: ${orgs.length}`);
  console.log(`  Clubs updated: ${clubs.length}`);
  console.log(`  Users updated: ${users.length}`);
}

migrateImageUrls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run the script:
```bash
ts-node --project tsconfig.scripts.json scripts/migrateImageUrls.ts
```

## Verification

After migration, verify the URLs are correct:

```sql
-- Verify organization images
SELECT id, name, 
       logo, 
       "heroImage"
FROM "Organization" 
WHERE logo IS NOT NULL 
   OR "heroImage" IS NOT NULL
LIMIT 10;

-- Verify club images
SELECT id, name, 
       logo, 
       "heroImage"
FROM "Club" 
WHERE logo IS NOT NULL 
   OR "heroImage" IS NOT NULL
LIMIT 10;

-- Verify user avatars
SELECT id, name, email, image
FROM "User" 
WHERE image IS NOT NULL
LIMIT 10;
```

All URLs should now start with `https://` instead of `/api/images/`.

## Rollback

If you need to rollback to the old format:

```sql
-- Rollback (use with caution)
DO $$
DECLARE
    base_url TEXT := 'https://arenaone.app';
BEGIN
    UPDATE "Organization" 
    SET logo = REPLACE(logo, CONCAT(base_url, '/uploads'), '/api/images')
    WHERE logo LIKE CONCAT(base_url, '/uploads/%');

    UPDATE "Organization" 
    SET "heroImage" = REPLACE("heroImage", CONCAT(base_url, '/uploads'), '/api/images')
    WHERE "heroImage" LIKE CONCAT(base_url, '/uploads/%');

    UPDATE "Club" 
    SET logo = REPLACE(logo, CONCAT(base_url, '/uploads'), '/api/images')
    WHERE logo LIKE CONCAT(base_url, '/uploads/%');

    UPDATE "Club" 
    SET "heroImage" = REPLACE("heroImage", CONCAT(base_url, '/uploads'), '/api/images')
    WHERE "heroImage" LIKE CONCAT(base_url, '/uploads/%');

    UPDATE "User" 
    SET image = REPLACE(image, CONCAT(base_url, '/uploads'), '/api/images')
    WHERE image LIKE CONCAT(base_url, '/uploads/%');
END $$;
```

## Testing

After migration, test:

1. **View existing images**: Check that previously uploaded images still load
2. **Upload new images**: Verify new uploads get absolute URLs
3. **Different environments**: Test on dev and production
4. **Browser console**: Check for any 404 errors on image requests

## Troubleshooting

### Images not loading after migration

1. Check that `NEXT_PUBLIC_ASSETS_BASE_URL` is set correctly
2. Verify Nginx is configured to serve `/uploads/` path
3. Check that the storage volume is mounted to both app and nginx containers
4. Verify the base URL in database matches your environment

### Mixed content warnings (HTTP/HTTPS)

Ensure your base URL uses HTTPS in production:
```
NEXT_PUBLIC_ASSETS_BASE_URL=https://arenaone.app
```

Not:
```
NEXT_PUBLIC_ASSETS_BASE_URL=http://arenaone.app
```

## Support

For issues or questions, refer to:
- [IMAGE_HANDLING.md](./IMAGE_HANDLING.md) - Complete image handling documentation
- GitHub Issues - Report problems or ask questions
