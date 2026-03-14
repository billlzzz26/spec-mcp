# Testing Guidelines

## Overview
Standards and practices for writing and maintaining tests.

## Rules

### Testing Framework
- Use Jest as the testing framework
- Aim for test coverage above 80%
- Write unit tests for all utility functions
- Write integration tests for API endpoints
- Mock external dependencies in tests

### Test Organization
- Use describe() and it() blocks for test organization
- Use expect().toBe() for primitive values
- Use expect().toEqual() for objects and arrays
- Use beforeEach() and afterEach() for setup/teardown
- Test both positive and negative cases
- Use snapshot testing for UI components
- Run tests with coverage report: npm test -- --coverage

### Best Practices
- Tests should be independent and repeatable
- Name tests descriptively: should do X when Y
- Arrange, Act, Assert (AAA) pattern
- Test one thing per test
- Avoid testing implementation details
- Keep tests fast and focused