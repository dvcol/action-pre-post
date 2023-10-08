import { getInput, info } from '@actions/core';
import { exec } from '@actions/exec';
import { writeFile } from 'fs/promises';
import { v4 } from 'uuid';

// Based on https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsshell
const shellOptions = (shell: string, cmd: string, args: string[] = []): [string, string[]] => {
  switch (shell) {
    case 'bash':
      return [shell, ['--noprofile', '--norc', '-eo', 'pipefail', ...args, cmd]];
    case 'sh':
      return [shell, ['-e', ...args, cmd]];
    case 'powershell':
      return [shell, ['-command', ...args, `". '${cmd}'"`]];
    case 'pwsh':
      return [shell, ['-command', ...args, `". '${cmd}'"`]];
    case 'python':
      return [shell, [...args, cmd]];
    default:
      return [shell.replace('{0}', cmd), []];
  }
};

export const run = async (scope: 'main' | 'post' | 'pre'): Promise<void> => {
  const shell = getInput('shell');
  const main = getInput(scope);
  const cwd = getInput(`${scope}-cwd`);
  const args = getInput(`${scope}-args`);

  if (main) {
    info([`Running '${scope}' script`, args ? ` with '${args}'` : undefined, cwd ? ` in '${cwd}'.` : undefined].filter(Boolean).join(' '));
    const options = args
      .split(',')
      ?.map(t => t.trim())
      .filter(Boolean);

    const tmp = process.env['RUNNER_TEMP'] || '/tmp';
    const path = [tmp, `/post-run-${v4()}`];

    if (['pwsh', 'powershell'].includes(shell)) path.push('.ps1');
    if (['bash', 'sh'].includes(shell)) path.push('.sh');

    const script = path.join('');
    await writeFile(script, main);

    const [_shell, _options] = shellOptions(shell, script, options);
    await exec(_shell, _options, { cwd });
  } else {
    info(`Skipping '${scope}', no script found`);
  }
};
