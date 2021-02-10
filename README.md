# docker-meta

Download and extract binaries from compressed packages.

[![ci](https://github.com/felipecrs/docker-meta/workflows/ci/badge.svg)](https://github.com/felipecrs/docker-meta/actions?query=workflow%3Aci)
[![Version](https://img.shields.io/npm/v/docker-meta.svg)](https://npmjs.org/package/docker-meta)
[![Downloads/week](https://img.shields.io/npm/dw/docker-meta.svg)](https://npmjs.org/package/docker-meta)
[![License](https://img.shields.io/npm/l/docker-meta.svg)](https://github.com/felipecassiors/docker-meta/blob/master/package.json)
[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

<!-- toc -->
* [docker-meta](#docker-meta)
* [Usage](#usage)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g docker-meta
$ docker-meta COMMAND
running command...
$ docker-meta (-v|--version|version)
docker-meta/1.1.0 linux-x64 node-v12.20.1
$ docker-meta --help [COMMAND]
USAGE
  $ docker-meta COMMAND
...
```
<!-- usagestop -->

```sh-session
$ docker-meta --help
Downloads and extracts binaries from compressed packages using a config file

USAGE
  $ docker-meta

OPTIONS
  -c, --config=config  Path to the config file
  -h, --help           show CLI help
  --version            show CLI version

DESCRIPTION
  The config will be read from any valid config file in the current directory. The configuration file can be
  defined using all the extensions and names accepted by cosmiconfig, such as docker-meta.config.js
```

You can find an example of config file [here](./test/res/docker-meta.config.js).

<!-- commands -->

<!-- commandsstop -->
