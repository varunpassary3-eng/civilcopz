const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      continue;
    }

    const trimmed = token.slice(2);
    const [rawKey, inlineValue] = trimmed.split('=');
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }

    const nextToken = argv[index + 1];
    if (!nextToken || nextToken.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = nextToken;
    index += 1;
  }

  return args;
}

function envOrArg(args, argName, envName, fallback) {
  if (args[argName] !== undefined) {
    return args[argName];
  }

  if (process.env[envName] !== undefined) {
    return process.env[envName];
  }

  return fallback;
}

function requireValue(name, value) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function toCliCsv(record) {
  return Object.entries(record)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${String(value).replace(/,/g, '\\,')}`)
    .join(',');
}

function runCommand(bin, args, options = {}) {
  const {
    capture = true,
    dryRun = false,
    allowFailure = false,
    cwd = process.cwd(),
    env = process.env,
  } = options;

  const prettyCommand = [bin, ...args].join(' ');
  console.log(`$ ${prettyCommand}`);

  if (dryRun) {
    return { status: 0, stdout: '', stderr: '' };
  }

  const result = spawnSync(bin, args, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    shell: true,
  });


  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !allowFailure) {
    const stderr = result.stderr || result.stdout || '';
    throw new Error(`${prettyCommand} failed with exit code ${result.status}\n${stderr}`);
  }

  return {
    status: result.status || 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function runGcloud(args, options = {}) {
  return runCommand(process.env.GCLOUD_BIN || 'gcloud', args, options);
}

function runGcloudJson(args, options = {}) {
  const result = runGcloud([...args, '--format=json'], options);
  return result.stdout ? JSON.parse(result.stdout) : {};
}

function runK6(args, options = {}) {
  return runCommand(process.env.K6_BIN || 'k6', args, options);
}

function printCheck(name, ok, details) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${details}`);
  if (!ok) {
    process.exitCode = 1;
  }
}

function buildImage(projectId, region, repository, imageName, tag) {
  return `${region}-docker.pkg.dev/${projectId}/${repository}/${imageName}:${tag}`;
}

function runBuild(image, contextDir = '.', options = {}) {
  const args = [
    'builds',
    'submit',
    contextDir,
  ];

  if (options.config) {
    args.push('--config', options.config);
  } else {
    args.push('--tag', image);
  }

  if (options.substitutions) {
    args.push('--substitutions', options.substitutions);
  }

  if (options.project) {
    args.push('--project', options.project);
  }

  return runGcloud(args, options);
}



function outputContract(data) {
  const isJson = process.argv.includes('--json');
  if (isJson) {
    console.log(JSON.stringify(data));
  }
}

function runContractScript(scriptPath, args = [], options = {}) {
  const { dryRun = false, ...runOptions } = options;
  // We MUST execute the script even in dryRun mode so it can return its dry-run contract.
  // The sub-script itself handles the --dryRun flag.
  const result = runCommand('node', [scriptPath, ...args], { ...runOptions, capture: true, dryRun: false });
  const lines = result.stdout.trim().split('\n');
  const lastLine = lines[lines.length - 1];

  try {
    const contract = JSON.parse(lastLine);
    if (contract.status !== 'SUCCESS' && !options.allowFailure) {
      throw new Error(`Contract failure in ${scriptPath}: ${contract.details || 'Unknown error'}`);
    }
    return contract;
  } catch (error) {
    if (options.allowFailure) {
      return { status: 'FAILURE', details: `Failed to parse contract: ${error.message}` };
    }
    const diagnosticOutput = result.stdout.length > 500 ? `...${result.stdout.slice(-500)}` : result.stdout;
    throw new Error(`Failed to parse execution contract from ${scriptPath}: ${error.message}\nLast 500 chars of output:\n${diagnosticOutput}`);
  }
}



module.exports = {
  buildImage,
  envOrArg,
  outputContract,
  parseArgs,
  printCheck,
  requireValue,
  runBuild,
  runCommand,
  runContractScript,

  runGcloud,
  runGcloudJson,
  runK6,
  toCliCsv,
};


