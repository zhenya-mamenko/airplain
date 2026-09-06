const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const isWin = process.platform === 'win32';
const SUPPORTED_JAVA_MAJORS = new Set([17, 21]);

function javaBin(javaHome) {
  return path.join(javaHome, 'bin', isWin ? 'java.exe' : 'java');
}

function parseJavaMajor(versionText) {
  const match = versionText.match(/version\s+"([^"]+)"/i);
  if (!match) return null;

  const raw = match[1];
  if (raw.startsWith('1.')) {
    const major = Number(raw.split('.')[1]);
    return Number.isFinite(major) ? major : null;
  }

  const major = Number(raw.split('.')[0]);
  return Number.isFinite(major) ? major : null;
}

function readJavaMajor(javaHome) {
  if (!javaHome) return null;
  const exe = javaBin(javaHome);
  if (!fs.existsSync(exe)) return null;

  const result = spawnSync(exe, ['-version'], {
    encoding: 'utf8',
    shell: false,
  });

  if (result.error) return null;
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  return parseJavaMajor(output);
}

function collectCandidates() {
  const candidates = [];
  const add = (value) => {
    if (!value) return;
    const normalized = path.resolve(value);
    if (!candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  add(process.env.AIRPLAIN_JAVA_HOME);
  add(process.env.JAVA17_HOME);
  add(process.env.JDK17_HOME);
  add(process.env.ORG_GRADLE_JAVA_HOME);
  add(process.env.JAVA_HOME);

  const gradleJdksDir = path.join(os.homedir(), '.gradle', 'jdks');
  if (fs.existsSync(gradleJdksDir)) {
    for (const name of fs.readdirSync(gradleJdksDir)) {
      add(path.join(gradleJdksDir, name));
    }
  }

  if (isWin) {
    const adoptiumDir = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Eclipse Adoptium');
    if (fs.existsSync(adoptiumDir)) {
      for (const name of fs.readdirSync(adoptiumDir)) {
        add(path.join(adoptiumDir, name));
      }
    }
  }

  return candidates;
}

function pickJavaHome(minimumJavaMajor = 17) {
  const candidates = collectCandidates();
  let fallback = null;

  for (const candidate of candidates) {
    const major = readJavaMajor(candidate);
    if (!SUPPORTED_JAVA_MAJORS.has(major) || major < minimumJavaMajor) continue;

    if (major === minimumJavaMajor) {
      return { javaHome: candidate, major };
    }

    fallback ??= { javaHome: candidate, major };
  }

  return fallback;
}

function parseCommand() {
  const [javaFlag, requiredJavaVersion, target, ...args] = process.argv.slice(2);
  const requiredJavaMajor = Number(requiredJavaVersion);

  if (
    javaFlag !== '--java' ||
    !SUPPORTED_JAVA_MAJORS.has(requiredJavaMajor) ||
    !['gradle', 'expo'].includes(target) ||
    args.length === 0
  ) {
    console.error('Usage: node scripts/run-android.js --java <17|21> <gradle|expo> <arguments>');
    process.exit(1);
  }

  return { requiredJavaMajor, target, args };
}

function runAndroidCommand(env, target, args) {
  const isGradleBuild = target === 'gradle';
  const command = isGradleBuild ? (isWin ? 'gradlew.bat' : './gradlew') : 'npx';
  const commandArgs = isGradleBuild ? args : ['expo', ...args];

  const result = spawnSync(command, commandArgs, {
    cwd: isGradleBuild ? path.join(__dirname, '..', 'android') : undefined,
    stdio: 'inherit',
    shell: isWin,
    env,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status == null ? 1 : result.status);
}

const { requiredJavaMajor, target, args } = parseCommand();
const selected = pickJavaHome(requiredJavaMajor);

if (selected) {
  const env = { ...process.env };
  env.JAVA_HOME = selected.javaHome;
  env.ORG_GRADLE_JAVA_HOME = selected.javaHome;
  env.PATH = `${path.join(selected.javaHome, 'bin')}${path.delimiter}${process.env.PATH || ''}`;

  console.log(`[android] Using JAVA_HOME=${selected.javaHome} (Java ${selected.major})`);
  runAndroidCommand(env, target, args);
} else {
  console.error(`[android] Java ${requiredJavaMajor} not found.`);
  process.exit(1);
}
