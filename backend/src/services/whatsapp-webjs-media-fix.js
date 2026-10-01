import fs from 'fs';
import { fileURLToPath } from 'url';

const injectedUtilsPath = fileURLToPath(
  new URL('../../node_modules/whatsapp-web.js/src/util/Injected/Utils.js', import.meta.url)
);

try {
  const source = fs.readFileSync(injectedUtilsPath, 'utf8');
  const marker = "        // Bot's won't reply if canonicalUrl is set (linking)";

  // Newer WhatsApp Web MediaData objects expose __x_id, which collides with
  // the outgoing message ID in whatsapp-web.js 1.34.7. The upstream fix removes it.
  if (source.includes('delete message.__x_id;')) {
    // The installed whatsapp-web.js already includes the upstream fix.
  } else if (source.includes(marker)) {
    const patchedSource = source.replace(
      marker,
      `        // Work around the whatsapp-web.js media __x_id collision (upstream PR #201923).\n        delete message.__x_id;\n\n${marker}`
    );
    fs.writeFileSync(injectedUtilsPath, patchedSource, 'utf8');
    console.info('[WhatsApp] Applied media message ID compatibility fix.');
  } else {
    console.warn('[WhatsApp] Media compatibility patch skipped: whatsapp-web.js source layout changed.');
  }
} catch (error) {
  console.error('[WhatsApp] Could not apply media compatibility patch:', error.message);
}
