# Performance Optimization

## Overview
Guidelines for optimizing application performance and resource usage.

## Rules

### Frontend Performance
- Use lazy loading for non-critical resources
- Implement caching strategies (browser caching, service workers)
- Use CDN for static assets
- Optimize images for web use (proper formats, compression)
- Minimize DOM manipulations
- Use request batching where possible
- Implement server-side rendering for SEO
- Use websockets for real-time communication
- Compress responses (gzip, brotli)
- Optimize critical rendering path
- Use efficient animations and transitions
- Implement virtual scrolling for large lists
- Use IntersectionObserver for lazy loading
- Preload critical resources
- Use font-display: swap for web fonts

### Backend Performance
- Optimize database queries
- Use pagination for large datasets
- Implement database indexing
- Use connection pooling for databases
- Implement caching strategies (Redis, in-memory)
- Use efficient algorithms and data structures
- Profile application performance regularly
- Monitor key performance indicators
- Use async/await for non-blocking operations
- Implement proper error handling to prevent crashes
- Use worker threads for CPU-intensive tasks
- Implement rate limiting to prevent abuse
- Use load balancing for horizontal scaling
- Implement circuit breaker pattern for external services
- Use bulk operations when possible
- Optimize serialization/deserialization

### Build and Deployment
- Use code splitting for smaller bundle sizes
- Implement tree shaking to remove unused code
- Use production mode optimizations
- Enable gzip/brotli compression on server
- Use HTTP/2 when possible
- Implement proper cache headers
- Use service workers for offline capability
- Preconnect to required origins
- Use DNS prefetching for third-party resources
- Optimize critical CSS delivery
- Use async/defer for non-critical JavaScript