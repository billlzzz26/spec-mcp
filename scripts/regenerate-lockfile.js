import { execSync } from 'child_process';

try {
  console.log('Regenerating package-lock.json...');
  execSync('npm install --package-lock-only', {
    cwd: '/vercel/share/v0-project',
    stdio: 'inherit'
  });
  console.log('Lock file regenerated successfully');
} catch (error) {
  console.error('Failed to regenerate lock file:', error.message);
  process.exit(1);
}
