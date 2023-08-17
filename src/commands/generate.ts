import { Command, Flags } from '@oclif/core';
import { executeGeneration } from '../generate/generate-module';
import { execQuietly } from '../generate/helpers/execQuietly';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { findProjectMainPath } from '../generate/helpers/findProjectMainPath';
import { newTask, setupListr } from '../generate/helpers/ListrHelper';

const runTypeGen = async (projectMainPath: string, appPrefix: string) => {
  const customCodegenConfig = path.join(projectMainPath, './codegen.js');
  const codegenConfigPath = fs.existsSync(customCodegenConfig)
    ? customCodegenConfig
    : path.join(__dirname, '../generate/runtime-config-helpers/codegen.js');
  await execQuietly(`APP_PREFIX=${appPrefix} npx graphql-codegen --config ${codegenConfigPath}`, {
    cwd: projectMainPath,
  });
};

const fixGenerated = async (projectMainPath: string) => {
  const customFixGenerated = path.join(projectMainPath, 'fix-generated.js');
  const fixGeneratedPath = fs.existsSync(customFixGenerated)
    ? customFixGenerated
    : path.join(__dirname, '../generate/runtime-config-helpers/fix-generated.js');
  await execQuietly(`node ${fixGeneratedPath}`, { cwd: projectMainPath });
};

const prettifyGenerated = async (projectMainPath: string, modulesPath = 'src') => {
  await execQuietly(`npx prettier --write "${modulesPath}/**/*.ts" "generated/**/*.ts" --log-level error`, {
    cwd: projectMainPath,
  });
};

export default class Generate extends Command {
  static description = 'generate GraphQL code';

  static examples = ['$ chimp generate', '$ chimp generate -a ~src -g ~chimp-helpers'];

  static flags = {
    help: Flags.help({ char: 'h' }),
    appPrefix: Flags.string({
      char: 'a',
      description: 'prefix that points to the sourcecode of your app',
      default: '~app',
    }),
    generatedPrefix: Flags.string({
      char: 'g',
      description: 'prefix that points to the generated by chimp helper code',
      default: '~generated',
    }),
    modulesPath: Flags.string({
      char: 'p',
      description:
        'path to the graphQL modules, only use if you are migrating an existing Apollo App and you want to use chimp only for a part of it',
    }),
  };

  async run() {
    const { flags } = await this.parse(Generate);
    const projectMainPath = findProjectMainPath();

    const tasks = setupListr([
      newTask('Generating code', async () =>
        executeGeneration(flags.appPrefix, flags.generatedPrefix, flags.modulesPath),
      ),
      newTask('Generating types', async () => runTypeGen(projectMainPath, flags.appPrefix)),
      newTask('Tweak the generated types', async () => fixGenerated(projectMainPath)),
      newTask('Prettify the generated code', async () => prettifyGenerated(projectMainPath, flags.modulesPath)),
    ]);

    try {
      await tasks.run();
    } catch (error) {
      console.error(error);
    }
  }
}
