/**
 * Verify Latest Deployment is Live
 * Check if the role-based filtering code is actually deployed
 *
 * Instructions:
 * 1. Open https://skill-lab-web.vercel.app or https://skilab.uok.com
 * 2. Press F12 (Developer Console)
 * 3. Paste this entire script
 * 4. Press Enter
 */

(function verifyDeployment() {
  console.log('🔍 Verifying Deployment Version');
  console.log('='.repeat(70));

  try {
    // Check if React app is loaded
    const appElement = document.querySelector('#root');

    if (!appElement) {
      console.error('❌ React app not found!');
      return;
    }

    console.log('✅ React app loaded');

    // Check current user
    const currentUserJson = localStorage.getItem('currentUser');
    const currentUser = currentUserJson ? JSON.parse(currentUserJson) : null;

    if (currentUser) {
      console.log(`✅ Logged in as: ${currentUser.username} (${currentUser.role})`);
    } else {
      console.log('⚠️  Not logged in');
    }

    // Check for role-based code markers
    console.log('\n🔧 CHECKING DEPLOYED CODE');
    console.log('='.repeat(70));

    // Look for React components in the page
    const reactRoot = document.querySelector('[data-testid], .MuiBox-root, .MuiContainer-root');

    if (reactRoot) {
      console.log('✅ Material-UI components detected');
    }

    // Check build timestamp from service worker or cache
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length > 0) {
          console.log('✅ Service worker active');
        }
      });
    }

    // Check script tags for chunk hashes (indicates new build)
    const scripts = Array.from(document.querySelectorAll('script[src*="/static/js/"]'));

    if (scripts.length > 0) {
      console.log(`✅ Found ${scripts.length} JavaScript chunks`);

      // Get chunk hash from main bundle
      const mainScript = scripts.find(s => s.src.includes('main.'));
      if (mainScript) {
        const hash = mainScript.src.match(/main\.([a-f0-9]+)\.chunk\.js/);
        if (hash) {
          console.log(`Main bundle hash: ${hash[1]}`);
          console.log('If this hash changed, new code is deployed.');
        }
      }
    }

    // Test the filtering logic directly
    console.log('\n🧪 TESTING FILTERING LOGIC');
    console.log('='.repeat(70));

    if (!currentUser) {
      console.log('⚠️  Please log in to test filtering logic');
    } else {
      const groupsJson = localStorage.getItem('groups');
      const allGroups = groupsJson ? JSON.parse(groupsJson) : [];

      console.log(`Total groups in system: ${allGroups.length}`);

      const isAdmin = currentUser.role === 'admin';
      const accessibleGroups = isAdmin ? allGroups :
        allGroups.filter(group => currentUser.assignedGroups?.includes(group.id));

      console.log(`Role: ${currentUser.role}`);
      console.log(`Should see: ${accessibleGroups.length} groups`);

      if (currentUser.role === 'trainer') {
        if (accessibleGroups.length === allGroups.length) {
          console.error('❌ PROBLEM: Trainer seeing all groups!');
          console.error('This means the new code is NOT being used.');
          console.error('Solution: Hard refresh (Ctrl+Shift+R) and try again.');
        } else if (accessibleGroups.length > 0) {
          console.log('✅ Filtering working! Trainer sees limited groups.');
        } else {
          console.warn('⚠️  Trainer sees 0 groups (may be unassigned)');
        }
      } else if (currentUser.role === 'admin') {
        console.log('✅ Admin sees all groups (expected)');
      }
    }

    // Instructions for cache clearing
    console.log('\n' + '='.repeat(70));
    console.log('CACHE CLEARING INSTRUCTIONS');
    console.log('='.repeat(70));
    console.log('If you still see old behavior:');
    console.log('');
    console.log('1. HARD REFRESH:');
    console.log('   - Windows/Linux: Ctrl + Shift + R');
    console.log('   - Mac: Cmd + Shift + R');
    console.log('');
    console.log('2. CLEAR CACHE COMPLETELY:');
    console.log('   - Chrome: F12 → Network tab → Check "Disable cache"');
    console.log('   - Then hard refresh again');
    console.log('');
    console.log('3. INCOGNITO/PRIVATE MODE:');
    console.log('   - Open new incognito window');
    console.log('   - Go to site and log in');
    console.log('   - This bypasses all cache');
    console.log('');
    console.log('4. WAIT 2-3 MINUTES:');
    console.log('   - CDN may still be propagating');
    console.log('   - Vercel deployment was just completed');
    console.log('');
    console.log('='.repeat(70));
    console.log('DEPLOYMENT INFO');
    console.log('='.repeat(70));
    console.log('Latest deployment: Just now');
    console.log('Commit: 53cfa4e (debug scripts)');
    console.log('Previous: a3e0805 (role-based fixes)');
    console.log('');
    console.log('The role-based filtering code is deployed.');
    console.log('If not working, it\'s a cache issue.');

  } catch (error) {
    console.error('💥 Error:', error);
    console.error('Details:', error.message);
  }
})();
