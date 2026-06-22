import { Client, Databases } from 'node-appwrite';

const APPWRITE_ENDPOINT = 'https://varios-appwrite-techpadah.fjueze.easypanel.host/v1';
const APPWRITE_PROJECT_ID = 'prestamos';
const APPWRITE_API_KEY = process.argv[2];
const DATABASE_ID = '6a30de0c001f63242bee';
const LOANS_COLLECTION_ID = '6a30def07be258c2fc52';
const PAYMENTS_COLLECTION_ID = '6a30def1cf16a69d1da6';

if (!APPWRITE_API_KEY) {
  console.error('Usage: node scripts/fix-permissions.mjs <API_KEY>');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function fix() {
  const roles = ['create("users")', 'read("users")', 'update("users")', 'delete("users")'];

  console.log('Updating loans collection permissions...');
  await databases.updateCollection(DATABASE_ID, LOANS_COLLECTION_ID, 'loans', roles);
  console.log('  ✅ loans collection updated');

  console.log('Updating payments collection permissions...');
  await databases.updateCollection(DATABASE_ID, PAYMENTS_COLLECTION_ID, 'payments', roles);
  console.log('  ✅ payments collection updated');

  console.log('\nDone! Collections now allow any authenticated user to CRUD.');
}

fix().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
