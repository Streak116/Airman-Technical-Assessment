module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    verbose: true,
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts'],
    coverageDirectory: '../coverage',
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
