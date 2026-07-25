#!/usr/bin/env node

import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import prompts from 'prompts';
import semver from 'semver';

import { defaultBundleManifest } from '@odatnurd/omphalos-common/schema';


// =============================================================================


/* Get the version specififer for the target Omphalos version in bundles that we
 * create.
 *
 * Since our version number is synced with the version number of released
 * Omphalos versions, if we gather our version from our own package file, we end
 * up with a decent version. */
function getTargetOmphalosVersion() {
  const manifest = join(dirname(fileURLToPath(import.meta.url)), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(manifest, 'utf8'));

  return `~${packageJson.version ?? '0.1.0'}`;
}


// =============================================================================


/* Using the process environment that we were given, determine what command the
 * user invoked in order to run us, so that we can offer to invoke it ourselves
 * in order to install things. */
function getPackageManager() {
  const userAgent = process.env.npm_config_user_agent || '';
  const managers = ['pnpm', 'yarn', 'bun'];

  return managers.find(pm => userAgent.startsWith(pm) === true) || 'npm';
}


// =============================================================================


/* Get the configuration for the new bundle and return the values back.
 *
 * This asks a series of questions, each of which has default values, and also
 * does some simple validations to ensure that the user's input is consistent.
 *
 * The answers to the questions are returned back in an object where the "name"
 * of each question is the key, and the value is the value provided by the user,
 * along with the addition of pkgManager to indicate what package manager the
 * user used.
 *
 * An example of this would be:
 *     {
 *       bundleName: 'my-omohalos-bundle',
 *       initGit: true,
 *       installDeps: true,
 *       pkgManager: 'pnpm'
 *     }
 *
 * The validation in the underlying library ensures that the values are of the
 * types required. */
async function getConfiguration() {
  const pkgManager = getPackageManager();

  const questions = [
    {
      type: 'text',
      name: 'bundleName',
      message: 'Bundle name:',
      initial: 'my-omphalos-bundle',
      validate: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return 'Bundle name cannot be empty.';
        }
        if (fs.existsSync(trimmed) === true) {
          return 'Directory already exists. Please choose a different name.';
        }
        return true;
      }
    },
    {
      type: 'text',
      name: 'version',
      message: 'Bundle Version:',
      initial: '1.0.0',
      validate: (value) => {
        if (semver.valid(value) === null) {
          return 'A valid semantic version is required.';
        }
        return true;
      }
    },
    {
      type: 'text',
      name: 'omphalosVersion',
      message: 'Target Omphalos Version:',
      initial: getTargetOmphalosVersion(),
      validate: (value) => {
        if (semver.validRange(value) === null) {
          return 'A valid semantic version range is required.';
        }
        return true;
      }
    },
    {
      type: 'confirm',
      name: 'initGit',
      message: 'Initialize a new git repository?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'installDeps',
      message: `Install dependencies with ${pkgManager}?`,
      initial: true
    }
  ];

  // Exit the process if any of the prompts are cancelled.
  const onCancel = () => {
    console.log('Operation cancelled.');
    process.exit(1);
  };

  // Perform all of the prompts, and then return the collected answers.
  const answers = await prompts(questions, { onCancel });
  return { ...answers, pkgManager };
}


// =============================================================================


async function main() {
  // Check to see if we are running from the development monorepo; if so, our
  // templates need to use a different version of the script.
  const isWorkspaceDev = process.argv.includes('--workspace');
  const cliVersion = isWorkspaceDev ? "workspace:*" : "latest";

  // Ask the user all of the related questions; if this ends us up with a bundle
  // that does not exist, then we should bail out.
  const config = await getConfiguration();
  if (config.bundleName === undefined) {
    return;
  }

  // Get the appropriate bundle name from the user's input, and its name as a
  // path, and then make the folder.
  //
  //  The configuration function validates that this does not already  exist
  const bundleName = config.bundleName.trim();
  const targetDir = join(process.cwd(), bundleName);

  fs.mkdirSync(targetDir, { recursive: true });

  // Set up the package.json file content.
  const packageJson = defaultBundleManifest(bundleName, config.version,
                                            config.omphalosVersion, cliVersion);

  // Write the package.json out to disk.
  fs.writeFileSync(
    join(targetDir, 'package.json'),
    JSON.stringify(packageJson, null, 2) + '\n'
  );

  // We can now say that we have created the bundle.
  console.log(`\nCreated bundle folder at ${targetDir}`);

  // If we are supposed to initialize a git repo, do that now.
  //
  // Note that we should probably be also creating a stub .gitignore file here
  // as well as creating the panel and graphics (and maybe also asking the user
  // if they want a sample of them, too).
  if (config.initGit === true) {
    try {
      execSync('git init', { cwd: targetDir, stdio: 'ignore' });
      console.log('Initialized empty Git repository.');
    } catch (error) {
      console.error('Failed to initialize git repository.');
    }
  }

  // If we were asked to install dependencies, then go ahead and trigger that
  // now, using the package manager the user used. In order to make sure this
  // works on windows, we ensure that this is executed via a shell since I
  // gather that some package managers implement as .cmd files or such.
  if (config.installDeps === true) {
    console.log(`\nInstalling dependencies using ${config.pkgManager}...`);
    try {
      execSync(`${config.pkgManager} install`, { cwd: targetDir, stdio: 'inherit', shell: true });
      console.log('Dependencies installed successfully.');
    } catch (error) {
      console.error('Failed to install dependencies.');
    }
  }

  // Tell the user how to proceed from here; they need to at least go into the
  // folder, and possibly also set up dependencies, if we didn't just do that.
  console.log('\nScaffolding complete. To get started:');
  console.log(`  cd ${bundleName}`);
  if (config.installDeps === false) {
    console.log(`  ${config.pkgManager} install`);
  }
}


// =============================================================================


try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}


// =============================================================================
