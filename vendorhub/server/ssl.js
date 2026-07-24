/**
 * SSL certificate management for VendorHub.
 *
 * Mode A — Internal / Self-Signed (for .local hostnames, no public DNS):
 *   Generates a self-signed Root CA + server certificate using node-forge.
 *   Stored in CERT_DIR. Admin can download the root cert to install on clients.
 *
 * Mode B — Public Domain / Let's Encrypt (HTTP-01 challenge via acme-client):
 *   Auto-obtains and renews certificates from Let's Encrypt.
 *   Stored in CERT_DIR/live/<domain>/.
 *   Requires ports 80 and 443 reachable from the internet.
 */

const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

// Windows: C:\ProgramData\VendorHub\certs
// Linux/Mac: /var/lib/vendorhub/certs (or adjacent to the data dir)
const CERT_DIR = process.env.VENDORHUB_CERT_DIR
  || (process.platform === 'win32'
    ? 'C:\\ProgramData\\VendorHub\\certs'
    : path.join(__dirname, '..', 'data', 'certs'));

fs.mkdirSync(CERT_DIR, { recursive: true });

const ROOT_KEY_PATH  = path.join(CERT_DIR, 'vendorhub-root.key');
const ROOT_CERT_PATH = path.join(CERT_DIR, 'vendorhub-root.crt');
const SRV_KEY_PATH   = path.join(CERT_DIR, 'vendorhub-server.key');
const SRV_CERT_PATH  = path.join(CERT_DIR, 'vendorhub-server.crt');

// ─── Mode A: self-signed ──────────────────────────────────────────────────

function generateSelfSigned(hostname) {
  // Only generate if missing — idempotent
  if (fs.existsSync(SRV_KEY_PATH) && fs.existsSync(SRV_CERT_PATH)) {
    return readSelfSigned();
  }

  console.log(`[VendorHub SSL] Generating self-signed certificate for ${hostname} …`);

  // --- Root CA ---
  const rootKeys = forge.pki.rsa.generateKeyPair(2048);
  const rootCert = forge.pki.createCertificate();
  rootCert.publicKey = rootKeys.publicKey;
  rootCert.serialNumber = '01';
  rootCert.validity.notBefore = new Date();
  rootCert.validity.notAfter  = new Date();
  rootCert.validity.notAfter.setFullYear(rootCert.validity.notBefore.getFullYear() + 10);

  const caAttrs = [
    { name: 'commonName',       value: 'VendorHub Root CA' },
    { name: 'organizationName', value: 'VendorHub' },
  ];
  rootCert.setSubject(caAttrs);
  rootCert.setIssuer(caAttrs);
  rootCert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true },
    { name: 'subjectKeyIdentifier' },
  ]);
  rootCert.sign(rootKeys.privateKey, forge.md.sha256.create());

  // --- Server cert signed by Root CA ---
  const srvKeys = forge.pki.rsa.generateKeyPair(2048);
  const srvCert = forge.pki.createCertificate();
  srvCert.publicKey = srvKeys.publicKey;
  srvCert.serialNumber = '02';
  srvCert.validity.notBefore = new Date();
  srvCert.validity.notAfter  = new Date();
  srvCert.validity.notAfter.setFullYear(srvCert.validity.notBefore.getFullYear() + 10);

  const srvAttrs = [
    { name: 'commonName',       value: hostname },
    { name: 'organizationName', value: 'VendorHub' },
  ];
  srvCert.setSubject(srvAttrs);
  srvCert.setIssuer(caAttrs);
  srvCert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true },
    { name: 'subjectAltName', altNames: [
      { type: 2, value: hostname },       // DNS
      { type: 7, ip: '127.0.0.1' },       // IP SANs for local testing
    ]},
    { name: 'subjectKeyIdentifier' },
  ]);
  srvCert.sign(rootKeys.privateKey, forge.md.sha256.create());

  // Write to disk
  fs.writeFileSync(ROOT_KEY_PATH,  forge.pki.privateKeyToPem(rootKeys.privateKey));
  fs.writeFileSync(ROOT_CERT_PATH, forge.pki.certificateToPem(rootCert));
  fs.writeFileSync(SRV_KEY_PATH,   forge.pki.privateKeyToPem(srvKeys.privateKey));
  fs.writeFileSync(SRV_CERT_PATH,  forge.pki.certificateToPem(srvCert));

  console.log(`[VendorHub SSL] Certificate written to ${CERT_DIR}`);
  return readSelfSigned();
}

function readSelfSigned() {
  return {
    key:  fs.readFileSync(SRV_KEY_PATH),
    cert: fs.readFileSync(SRV_CERT_PATH),
    ca:   fs.readFileSync(ROOT_CERT_PATH),
  };
}

function selfSignedExists() {
  return fs.existsSync(SRV_KEY_PATH) && fs.existsSync(SRV_CERT_PATH);
}

// ─── Mode B: Let's Encrypt ────────────────────────────────────────────────

const LE_DIR = path.join(CERT_DIR, 'live');

function leDomainDir(domain) {
  return path.join(LE_DIR, domain);
}

function leExists(domain) {
  const d = leDomainDir(domain);
  return fs.existsSync(path.join(d, 'privkey.pem')) && fs.existsSync(path.join(d, 'fullchain.pem'));
}

function readLE(domain) {
  const d = leDomainDir(domain);
  return {
    key:  fs.readFileSync(path.join(d, 'privkey.pem')),
    cert: fs.readFileSync(path.join(d, 'fullchain.pem')),
  };
}

/**
 * Obtain or renew a Let's Encrypt certificate for `domain`.
 * `challengeResponder` is a Map<token, keyAuth> that the HTTP-01 challenge
 * handler reads from — caller must expose /.well-known/acme-challenge/:token.
 *
 * Returns { key, cert } PEM buffers.
 */
async function obtainLE(domain, challengeResponder, staging = false) {
  const acme = require('acme-client');
  const dir = leDomainDir(domain);
  fs.mkdirSync(dir, { recursive: true });

  const accountKeyPath = path.join(CERT_DIR, 'le-account.key');
  let accountKey;
  if (fs.existsSync(accountKeyPath)) {
    accountKey = fs.readFileSync(accountKeyPath);
  } else {
    accountKey = await acme.crypto.createPrivateKey();
    fs.writeFileSync(accountKeyPath, accountKey);
  }

  const client = new acme.Client({
    directoryUrl: staging
      ? acme.directory.letsencrypt.staging
      : acme.directory.letsencrypt.production,
    accountKey,
  });

  const [srvKey, csr] = await acme.crypto.createCsr({ commonName: domain });

  const cert = await client.auto({
    csr,
    email: `admin@${domain}`,
    termsOfServiceAgreed: true,
    challengePriority: ['http-01'],
    challengeCreateFn: async (authz, challenge, keyAuthorization) => {
      challengeResponder.set(challenge.token, keyAuthorization);
    },
    challengeRemoveFn: async (authz, challenge) => {
      challengeResponder.delete(challenge.token);
    },
  });

  const privkeyPath   = path.join(dir, 'privkey.pem');
  const fullchainPath = path.join(dir, 'fullchain.pem');
  fs.writeFileSync(privkeyPath,   srvKey);
  fs.writeFileSync(fullchainPath, cert);

  console.log(`[VendorHub SSL] Let's Encrypt certificate obtained for ${domain}`);
  return { key: srvKey, cert };
}

module.exports = {
  CERT_DIR,
  ROOT_CERT_PATH,
  generateSelfSigned,
  readSelfSigned,
  selfSignedExists,
  leExists,
  readLE,
  obtainLE,
};
