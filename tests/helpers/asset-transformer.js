import { readFileSync } from 'fs';

export function process(_sourceText, sourcePath) {
  const content = readFileSync(sourcePath, 'utf8');
  return {
    code: `module.exports = ${JSON.stringify(content)};`,
  };
}
