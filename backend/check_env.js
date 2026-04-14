require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
console.log('JWT_SECRET defined:', !!JWT_SECRET);
console.log('JWT_SECRET length:', JWT_SECRET ? JWT_SECRET.length : 0);

// Intentem decodificar un token fals per veure si el secret funciona
try {
  const testPayload = { id: 1, email: 'test@test.com' };
  const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '1h' });
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ JWT signing/verification works. Decoded id:', decoded.id);
} catch (e) {
  console.error('❌ JWT error:', e.message);
}

// Check all env vars
const required = ['JWT_SECRET', 'DB_PASSWORD', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'];
console.log('\n=== ENV VARS ===');
required.forEach(v => {
  const val = process.env[v];
  console.log(`  ${v}: ${val ? '✅ SET (len:' + val.length + ')' : '❌ MISSING'}`);
});
