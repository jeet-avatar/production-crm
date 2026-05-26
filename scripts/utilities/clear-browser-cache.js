/**
 * BROWSER CONSOLE SCRIPT - Clear Cache and Force Reload
 *
 * Instructions:
 * 1. Open Chrome DevTools (F12 or Right-click → Inspect)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 */

(async function clearCacheAndReload() {
  console.clear();
  console.log('🧹 Starting cache clear process...\n');

  try {
    // Step 1: Clear localStorage
    console.log('1️⃣  Clearing localStorage...');
    const localStorageSize = Object.keys(localStorage).length;
    localStorage.clear();
    console.log(`   ✅ Cleared ${localStorageSize} items from localStorage`);

    // Step 2: Clear sessionStorage
    console.log('\n2️⃣  Clearing sessionStorage...');
    const sessionStorageSize = Object.keys(sessionStorage).length;
    sessionStorage.clear();
    console.log(`   ✅ Cleared ${sessionStorageSize} items from sessionStorage`);

    // Step 3: Clear IndexedDB
    console.log('\n3️⃣  Clearing IndexedDB...');
    if (window.indexedDB) {
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
          console.log(`   ✅ Deleted database: ${db.name}`);
        }
      }
    }

    // Step 4: Clear Service Worker caches
    console.log('\n4️⃣  Clearing Service Worker caches...');
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log(`   ✅ Deleted cache: ${cacheName}`);
      }
    }

    // Step 5: Unregister Service Workers
    console.log('\n5️⃣  Unregistering Service Workers...');
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log(`   ✅ Unregistered service worker: ${registration.scope}`);
      }
    }

    // Step 6: Clear cookies for this domain
    console.log('\n6️⃣  Clearing cookies...');
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    }
    console.log(`   ✅ Cleared ${cookies.length} cookies`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ CACHE CLEAR COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   • localStorage: ${localStorageSize} items cleared`);
    console.log(`   • sessionStorage: ${sessionStorageSize} items cleared`);
    console.log(`   • Cookies: ${cookies.length} cleared`);
    console.log(`   • Service Workers: All unregistered`);
    console.log(`   • Caches: All deleted`);

    console.log('\n⏰ Reloading page in 2 seconds...');

    // Reload with cache bypass
    setTimeout(() => {
      console.log('\n🔄 Performing hard reload...');
      location.reload(true);
    }, 2000);

  } catch (error) {
    console.error('❌ Error during cache clear:', error);
    console.log('\n⚠️  Fallback: Performing standard hard reload...');
    setTimeout(() => {
      location.reload(true);
    }, 1000);
  }
})();

// Alternative: If the above doesn't work, use this simple version:
// localStorage.clear(); sessionStorage.clear(); location.reload(true);
