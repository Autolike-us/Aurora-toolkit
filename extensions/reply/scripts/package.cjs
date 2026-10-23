// Builds dist/aurora-reply-<version>.zip (the extension) and dist/aurora-reply-backend-update.zip (the server files to extract into public_html).
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..'), HG = path.join(ROOT, '..', '..', 'aurora-site', 'hostgator');
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')).version;
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const walk = (d) => fs.readdirSync(path.join(ROOT, d)).filter((f) => !f.startsWith('.')).map((f) => d + '/' + f);
const ext = ['manifest.json', 'background.js', 'profiles.js', 'sync.js', 'write.js', 'options.html', 'options.js', 'popup.html', 'popup.js', 'ui.css', ...walk('content'), ...walk('icons')];
const py = `import zipfile,sys,json
out,base,files=sys.argv[1],sys.argv[2],json.loads(sys.argv[3])
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for arc,src in files: z.write(src,arc)
print(out,len(files),'files')`;
const zip = (out, pairs) => execFileSync('python3', ['-I', '-c', py, out, '', JSON.stringify(pairs)], { stdio: 'inherit' });
zip(path.join(ROOT, 'dist', `aurora-reply-${version}.zip`), ext.map((f) => [f, path.join(ROOT, f)]));
const be = ['api/index.php', 'api/lib/pricing.php', 'api/lib/reply.php', 'api/lib/paypal.php', 'api/lib/stripe.php', 'api/routes/reply.php', 'api/routes/billing.php', 'api/routes/webhooks.php', 'api/lib/auth.php', 'api/lib/audit.php', 'api/lib/write.php', 'api/routes/audit.php', 'api/routes/write.php', 'api/routes/admin.php'];
zip(path.join(ROOT, 'dist', 'aurora-reply-backend-update.zip'), be.map((f) => [f, path.join(HG, f)]));
// One-time tools for the owner: upload to public_html/api/, open once, delete (they never print secrets).
const tools = ['tools/paypal-setup-ONE-TIME.php', 'tools/stripe-setup-ONE-TIME.php', 'tools/payments-check-ONE-TIME.php', 'tools/master-key-ONE-TIME.php'];
zip(path.join(ROOT, 'dist', 'aurora-payments-tools.zip'), tools.map((f) => [path.basename(f), path.join(HG, f)]));
