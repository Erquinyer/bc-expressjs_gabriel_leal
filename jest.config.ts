import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  testTimeout: 30000,
  clearMocks: true,
  // Fix sobre el starter: el código fuente importa módulos propios con
  // sufijo '.js' (estilo NodeNext/ESM: import '../foo.js' apuntando a
  // foo.ts). tsc lo resuelve bien, pero ts-jest bajo CommonJS no reescribe
  // esa extensión y falla con "Cannot find module './routes/auth.routes.js'"
  // en TODA la app (comprobado: los 4 test suites fallaban al arrancar).
  // Este mapper reescribe el import quitándole el '.js' antes de resolverlo.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/types/**',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
};

export default config;
