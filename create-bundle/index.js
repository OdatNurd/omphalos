#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import prompts from 'prompts';


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
  // CHeck to see if we are running from the development monorepo; if so, our
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
  const targetDir = path.join(process.cwd(), bundleName);

  fs.mkdirSync(targetDir, { recursive: true });

  // Set up the package.json file content.
  //
  // This should include the omphalos key, but this is just the early PoC
  // version of the tool, so. Among other things, the questions should ask for
  // the target omphalos version for the specifier and ask for the subfolder
  // that has the panel, graphics and sounds.
  const packageJson = {
    name: bundleName,
    version: "0.1.0",
    private: true,
    scripts: {
      "bundle": "omph .",
      "bundle:wrap": "omph . --wrap",
    },
    devDependencies: {
      "@odatnurd/omph": cliVersion,
    }
  };

  // Write the package.json out to disk.
  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
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
