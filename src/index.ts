#!/usr/bin/env node

import { Builtins, Cli } from "clipanion";
import { DockerMetaCommand } from "./command.ts";
import { name, version } from "./package.ts";

export interface DockerMetaConfig {
  preset: "gerrit";
  version?: string;
  branch?: string;
  latest?: boolean;
  "tag-version"?: boolean;
  "tag-git-sha"?: boolean;
  "tag-semver"?: boolean | "auto";
  "change-request"?: boolean;
  "change-number"?: string;
  "patchset-number"?: string;
  "git-sha"?: string;
  "build-date"?: string;
  targets: {
    [target: string]: {
      version?: string;
      branch?: string;
      latest?: boolean;
      "git-sha"?: string;
      "build-date"?: string;
      images: string[];
      labels?: {
        [label: string]: string;
      };
      args?: {
        [arg: string]: string;
      };
      [key: string]: any;
    };
  };
  groups?: {
    [group: string]: any;
  };
}

/**
 * Define a docker-meta configuration
 *
 * @param config The docker-meta configuration object
 * @returns The same configuration object
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'docker-meta';
 *
 * export default defineConfig({
 *   // DockerMetaConfig object
 * });
 * ```
 */
export function defineConfig(config: DockerMetaConfig): DockerMetaConfig {
  return config;
}

// Only run the CLI if this file is being executed directly
if (import.meta.main) {
  const cli = new Cli({
    binaryLabel: name,
    binaryName: name,
    binaryVersion: version,
  });

  cli.register(DockerMetaCommand);
  cli.register(Builtins.HelpCommand);

  const processArguments = process.argv.slice(2);

  cli.runExit(processArguments);
}
