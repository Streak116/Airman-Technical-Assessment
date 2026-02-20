module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    verbose: true,
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.spec.ts'],
    coverageDirectory: '../coverage',
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
};
