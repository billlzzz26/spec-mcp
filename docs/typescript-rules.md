# TypeScript Rules

## Overview
TypeScript-specific conventions and best practices.

## Rules

### Type Safety
- Enable strict mode in tsconfig.json
- Use interfaces for object shapes
- Use type aliases for complex types
- Avoid using `any` type
- Use explicit return types for functions
- Use `unknown` instead of `any` when type is uncertain
- Implement proper error handling with try/catch
- Use enum for constant values
- Use namespace for grouping related code
- Use decorators for metadata (experimental)
- Use generics for reusable components
- Use readonly modifier for immutable properties
- Use abstract classes for base implementations

### Syntax Preferences
- Prefer `const` over `let` for variable declarations
- Use arrow functions for inline functions
- Use template literals for string concatenation
- Destructure objects and arrays when appropriate
- Use optional chaining (?.) for safe property access
- Use nullish coalescing (??) for default values