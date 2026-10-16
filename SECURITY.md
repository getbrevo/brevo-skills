# Security policy

## Reporting a vulnerability

**Don't open a public issue for a security problem.** Report it privately through GitHub:
on this repository, open the **Security** tab and choose **Report a vulnerability**. Only the
maintainers can see the report.

Include what you found, how to reproduce it, and the impact you expect. We'll acknowledge the
report, keep you informed while we investigate, and credit you when the fix is published if
you'd like.

## Scope

This repository contains agent skills (instructions) and the pipeline that packages them.
In scope:

- A skill that leads an agent to expose credentials, act on data without the user's approval,
  or follow instructions injected through content it processes
- A generated manifest that points an agent at the wrong server or requests more access than
  documented
- The build, sync and release workflows

Problems with the Brevo platform, API or MCP server itself are out of scope here: report them
through Brevo's own security contact.

## Supported versions

Only the latest release is supported. Fixes ship in a new release.
