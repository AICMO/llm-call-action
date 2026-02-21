import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const entryPoints = ['src/prompt-builder.ts', 'src/api-caller.ts', 'src/response-parser.ts'];

export default defineConfig(
  entryPoints.map((input) => ({
    input,
    output: {
      dir: 'dist',
      format: 'cjs',
      entryFileNames: '[name].js',
      sourcemap: false,
    },
    plugins: [
      typescript({ tsconfig: './tsconfig.json', outputToFilesystem: true }),
      resolve({ preferBuiltins: true }),
      commonjs(),
      json(),
    ],
    external: [],
  })),
);
