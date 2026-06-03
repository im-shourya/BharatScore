import { registerAs } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * JWT configuration with RS256 asymmetric keys.
 * Auto-generates a dev key pair if env vars are not set.
 */
function generateDevKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  console.warn('⚠️  [JWT] Auto-generated RSA key pair for development. Do NOT use in production.');
  return { publicKey, privateKey };
}

export default registerAs('jwt', () => {
  let privateKey = process.env.JWT_ACCESS_SECRET;
  let publicKey = process.env.JWT_ACCESS_PUBLIC;

  if (!privateKey || !publicKey) {
    const generated = generateDevKeyPair();
    privateKey = generated.privateKey;
    publicKey = generated.publicKey;
  }

  return {
    privateKey,
    publicKey,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '900s',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  };
});
