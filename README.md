# docker-meta

Generates docker bake metadata like tags, labels and build args

[![ci](https://github.com/felipecrs/docker-meta/workflows/ci/badge.svg)](https://github.com/felipecrs/docker-meta/actions?query=workflow%3Aci)
[![Version](https://img.shields.io/npm/v/docker-meta.svg)](https://npmjs.org/package/docker-meta)
[![Downloads/week](https://img.shields.io/npm/dw/docker-meta.svg)](https://npmjs.org/package/docker-meta)
[![License](https://img.shields.io/npm/l/docker-meta.svg)](https://github.com/felipecassiors/docker-meta/blob/master/package.json)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Usage

```sh-session
$ npm install -D docker-meta

$ npx docker-meta --help
Generates docker bake metadata like tags, labels and build args

━━━ Usage ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$ docker-meta

━━━ Options ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  -c,--config #0              Path to the configuration file
  -o,--output #0              Path to the output file
  --branch #0                 The branch
  --version #0                The version to publish
  --latest                    Push as latest
  --tag-version               Use `version` to generate tags
  --tag-git-sha               Generate tags like `:sha-<git-sha>` when not in change request mode
  --tag-semver                Use semver strategy to generate tags
  --change-request            Change request mode
  --change-number #0          The change number
  --patchset-number #0        The change patchset number
  --git-sha #0                The git sha
  --build-date #0             The build date in ISO 8601
  -V,--docker-meta-version    Print docker-meta version

━━━ Details ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generates docker bake metadata like tags, labels and build args.

## Configuration

The configuration file can have any of the names and extensions accepted by
cosmiconfig such as docker-meta.config.js.

When no configuration file is specified, a valid configuration file will be
searched in the current directory.

## Output

- By default, JSON is written to stdout.

- Use --output to write to a file.

## Tag strategies

- --tag-version: adds :<version> tags (requires
  version to be set).

- --tag-git-sha: adds :sha-<git-sha> tags.

- --tag-semver: when version is SemVer and --latest is set,
  also adds :<major>, :<major>.<minor> and
  :<major>.<minor>.<patch> tags.

## Change Request mode (Gerrit)

- Enable with --change-request and provide --change-number
  (and optional --patchset-number ).

- Generates :gcr-<change-number> and
  :gcr-<change-number>-<patchset-number> tags.

━━━ Examples ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate and print to stdout (search config in the current directory)
  $ docker-meta

Use an explicit configuration file at ./docker-meta.config.js
  $ docker-meta --config ./docker-meta.config.js

Write output to a file
  $ docker-meta --output ./bake.json

Include version and SemVer tags
  $ docker-meta --version 1.2.3 --tag-version --tag-semver --latest

Change Request mode (Gerrit)
  $ docker-meta --change-request --change-number 12345 --patchset-number 1

Use directly with docker bake
  $ docker bake -f <(docker-meta)
```

To use with [docker bake](https://docs.docker.com/build/bake/):

```sh-session
docker bake -f <(docker-meta)
```

You can find an example of config file [here](./test/fixtures/main/docker-meta.config.js).
