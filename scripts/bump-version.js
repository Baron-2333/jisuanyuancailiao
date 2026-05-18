import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const appPath = resolve('./src/App.tsx');
const versionPath = resolve('./src/utils/version.ts');
const pkgPath = resolve('./package.json');

// 读取 package.json
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const currentVersion = pkg.version;

// 分割版本号
const [major, minor, patch] = currentVersion.split('.').map(Number);

// 自动增加 patch 版本号
const newVersion = `${major}.${minor}.${patch + 1}`;
pkg.version = newVersion;

// 更新 package.json
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// 获取当前时间
const now = new Date();
const buildTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

// 更新 App.tsx 中的版本号
let appContent = readFileSync(appPath, 'utf-8');
appContent = appContent.replace(/v\d+\.\d+\.\d+/g, `v${newVersion}`);
writeFileSync(appPath, appContent);

// 更新 version.ts
let versionContent = readFileSync(versionPath, 'utf-8');
versionContent = versionContent.replace(/VERSION = 'v\d+\.\d+\.\d+';/, `VERSION = 'v${newVersion}';`);
versionContent = versionContent.replace(/BUILD_TIME = '[^']+';/, `BUILD_TIME = '${buildTime}';`);
writeFileSync(versionPath, versionContent);

console.log(`版本更新: ${currentVersion} -> v${newVersion} (${buildTime})`);
