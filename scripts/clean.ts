import { rm } from 'node:fs/promises';

const generatedPaths = ['dist', 'server.js'];

await Promise.all(
  generatedPaths.map((path) => rm(path, { recursive: true, force: true }))
);

console.log('Removed generated build artifacts.');
