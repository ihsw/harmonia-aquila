# Reject Multi-Artist Same-Name Album Output

Plan for making album organization fail before any copy when one invocation
would create the same normalized album directory name for more than one
normalized artist directory. The domain service owns the rule; CLI, REST,
GraphQL, and MCP expose the same failure through their existing error paths.

Scope: **album organization source, every client’s tests/collection coverage,
and public operation documentation.** No dependency, transport, or audiobook
changes.

- [Requirements](requirements.md)
- [Design](design.md)
- [Tasks](tasks.md)
