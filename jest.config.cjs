// jest.config.cjs — root (frontend) Jest configuration
// Uses babel-jest to transform ESM React source to CommonJS.
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.{js,jsx}'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    // Stub CSS and image imports so they don't crash the test runner
    '\\.css$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|svg|gif|webp)$': '<rootDir>/src/__tests__/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/main.jsx', '!src/assets/**'],
};
