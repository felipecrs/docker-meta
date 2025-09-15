import { writeFile } from "node:fs/promises";

import { Command, Option, UsageError } from "clipanion";
import { cosmiconfig } from "cosmiconfig";
import spawn from "nano-spawn";
import pc from "picocolors";
import semver from "semver";
import type { DockerMetaConfig } from "./index.ts";
import { description, name, version } from "./package.ts";

class BakeTarget {
  tags: string[] = [];

  labels: {
    [label: string]: string;
  } = {};

  args: {
    [arg: string]: string;
  } = {};

  [key: string]: any;
}

class BakeFile {
  target: {
    [name: string]: BakeTarget;
  } = {};

  group?: {
    [name: string]: any;
  };
}

export class DockerMetaCommand extends Command {
  static usage = Command.Usage({
    description,
    details: `
      Generates docker bake metadata like tags, labels and build args.

      ## Configuration

      The configuration file can have any of the names and extensions accepted by ${pc.bold("cosmiconfig")} such as ${pc.cyan(`${name}.config.js`)}.

      When no configuration file is specified, a valid configuration file will be searched in the ${pc.bold("current directory")}.

      ## Output

      - By default, JSON is written to ${pc.bold("stdout")}.
      - Use ${pc.bold("--output")} to write to a file.

      ## Tag strategies

      - ${pc.bold("--tag-version")}: adds ${pc.cyan(":<version>")} tags (requires ${pc.cyan("version")} to be set).
      - ${pc.bold("--tag-git-sha")}: adds ${pc.cyan(":sha-<git-sha>")} tags.
      - ${pc.bold("--tag-semver")}: when version is SemVer and ${pc.bold("--latest")} is set, also adds ${pc.cyan(":<major>")}, ${pc.cyan(":<major>.<minor>")} and ${pc.cyan(":<major>.<minor>.<patch>")} tags.

      ## Change Request mode (Gerrit)

      - Enable with ${pc.bold("--change-request")} and provide ${pc.bold("--change-number")} (and optional ${pc.bold("--patchset-number")} ).
      - Generates ${pc.cyan(":gcr-<change-number>")} and ${pc.cyan(":gcr-<change-number>-<patchset-number>")} tags.
    `,
    examples: [
      [
        `Generate and print to ${pc.bold("stdout")} (search config in the ${pc.bold("current directory")})`,
        "$0",
      ],
      [
        `Use an explicit configuration file at ${pc.cyan("./docker-meta.config.js")}`,
        "$0 --config ./docker-meta.config.js",
      ],
      [`Write output to a file`, "$0 --output ./bake.json"],
      [
        `Include version and SemVer tags`,
        "$0 --version 1.2.3 --tag-version --tag-semver --latest",
      ],
      [
        `Change Request mode (Gerrit)`,
        "$0 --change-request --change-number 12345 --patchset-number 1",
      ],
      [`Use directly with docker bake`, "docker bake -f <($0)"],
    ],
  });

  config = Option.String("-c,--config", {
    description: `Path to the ${pc.bold("configuration file")}`,
  });

  output = Option.String("-o,--output", {
    description: "Path to the output file",
  });

  branch = Option.String("--branch", {
    description: "The branch",
  });

  version = Option.String("--version", {
    description: "The version to publish",
  });

  latest = Option.Boolean("--latest", {
    description: "Push as latest",
  });

  "tag-version" = Option.Boolean("--tag-version", {
    description: "Use `version` to generate tags",
  });

  "tag-git-sha" = Option.Boolean("--tag-git-sha", {
    description:
      "Generate tags like `:sha-<git-sha>` when not in change request mode",
  });

  "tag-semver" = Option.Boolean("--tag-semver", {
    description: "Use semver strategy to generate tags",
  });

  "change-request" = Option.Boolean("--change-request", {
    description: "Change request mode",
  });

  "change-number" = Option.String("--change-number", {
    description: "The change number",
  });

  "patchset-number" = Option.String("--patchset-number", {
    description: "The change patchset number",
  });

  "git-sha" = Option.String("--git-sha", {
    description: "The git sha",
  });

  "build-date" = Option.String("--build-date", {
    description: "The build date in ISO 8601",
  });

  "docker-meta-version" = Option.Boolean("-V,--docker-meta-version", {
    description: "Print docker-meta version",
  });

  async loadConfig(): Promise<DockerMetaConfig> {
    const explorer = cosmiconfig(name);

    const result = this.config
      ? await explorer.load(this.config)
      : await explorer.search();

    if (result) {
      const config: DockerMetaConfig = result.config;

      if (config.preset !== "gerrit") {
        throw new UsageError("The only supported preset for now is 'gerrit'.");
      }

      const resultConfig: DockerMetaConfig = {
        ...config,

        latest:
          this.latest === undefined
            ? "LATEST" in process.env
              ? process.env.LATEST === "true"
              : // eslint-disable-next-line unicorn/no-nested-ternary
                config.latest === undefined
                ? false
                : config.latest
            : this.latest,

        "tag-version":
          this["tag-version"] === undefined
            ? // eslint-disable-next-line unicorn/no-nested-ternary
              config["tag-version"] === undefined
              ? true
              : config["tag-version"]
            : this["tag-version"],

        "tag-git-sha":
          this["tag-git-sha"] === undefined
            ? // eslint-disable-next-line unicorn/no-nested-ternary
              config["tag-git-sha"] === undefined
              ? false
              : config["tag-git-sha"]
            : this["tag-git-sha"],

        "tag-semver":
          this["tag-semver"] === undefined
            ? // eslint-disable-next-line unicorn/no-nested-ternary
              config["tag-semver"] === undefined
              ? "auto"
              : config["tag-semver"]
            : this["tag-semver"],

        version: this.version || process.env.VERSION || config.version,

        branch:
          this.branch ||
          process.env.BRANCH ||
          config.branch ||
          // eslint-disable-next-line unicorn/no-await-expression-member
          (await spawn("git", ["branch", "--show-current"])).stdout,

        "git-sha":
          this["git-sha"] ||
          process.env.GIT_SHA ||
          process.env.GIT_COMMIT ||
          config["git-sha"] ||
          // eslint-disable-next-line unicorn/no-await-expression-member
          (await spawn("git", ["rev-parse", "--short", "HEAD"])).stdout,

        "build-date":
          this["build-date"] ||
          process.env.BUILD_DATE ||
          config["build-date"] ||
          new Date().toISOString(),

        "change-request":
          this["change-request"] === undefined
            ? "CHANGE_REQUEST" in process.env
              ? process.env.CHANGE_REQUEST === "true"
              : // eslint-disable-next-line unicorn/no-nested-ternary
                config["change-request"] === undefined
                ? false
                : config["change-request"]
            : this["change-request"],

        "change-number":
          this["change-number"] ||
          process.env.GERRIT_CHANGE_NUMBER ||
          config["change-number"],

        "patchset-number":
          this["patchset-number"] ||
          process.env.GERRIT_PATCHSET_NUMBER ||
          config["patchset-number"],
      };

      if (resultConfig["tag-version"] === true && !resultConfig.version) {
        throw new UsageError("version unset");
      } else if (
        resultConfig["tag-semver"] === true &&
        !semver.valid(resultConfig.version)
      ) {
        throw new UsageError(
          "tag-semver is enabled but version doesn't seem to be valid semver",
        );
      }

      if (resultConfig.latest === undefined) {
        throw new UsageError("latest unset");
      }

      if (!resultConfig.branch) {
        throw new UsageError("branch unset");
      }

      if (!resultConfig["git-sha"]) {
        throw new UsageError("git-sha unset");
      }

      // Shorten the git sha to 7 characters
      resultConfig["git-sha"] = resultConfig["git-sha"].slice(0, 7);

      if (!resultConfig["build-date"]) {
        throw new UsageError("build-date unset");
      }

      if (resultConfig["change-request"] === undefined) {
        throw new UsageError("change-request unset");
      }

      if (resultConfig["change-request"] && !resultConfig["change-number"]) {
        throw new UsageError("change-number unset in change-request mode");
      }

      // If patchset number is not set, it''s' ok. It's not mandatory.

      return resultConfig;
    }
    throw new UsageError("Can not load the config file.");
  }

  async execute(): Promise<void> {
    if (this["docker-meta-version"]) {
      console.log(version);
      return;
    }

    const config: DockerMetaConfig = await this.loadConfig();

    const output = new BakeFile();

    for (const targetName in config.targets) {
      if (Object.prototype.hasOwnProperty.call(config.targets, targetName)) {
        const inputTarget = config.targets[targetName];

        const outputTargetName = targetName;
        let outputTarget: BakeTarget = new BakeTarget();

        // semver.parse will normalize the version if it's a valid semver
        // example: v1.0.0 -> 1.0.0
        // otherwise we leave it as is
        const normalizedVersion = `${
          semver.parse(config.version) || config.version
        }`;

        outputTarget.labels["org.label-schema.vsc-ref"] = config["git-sha"]!;
        outputTarget.labels["org.label-schema.build-date"] =
          config["build-date"]!;
        if (config["tag-version"] === true) {
          outputTarget.labels["org.label-schema.version"] = normalizedVersion;
        }
        outputTarget.labels["org.label-schema.schema-version"] = "1.0.0-rc1";

        // extract needed fields
        const {
          labels: inputLabels,
          images: inputImages,
          args: inputArguments,
          tags: inputTags,
          ...inputExtraKeys
        } = inputTarget;
        // merge generated labels with the labels from the input
        outputTarget.labels = { ...outputTarget.labels, ...inputLabels };

        if (config["change-request"]) {
          outputTarget.tags.push(
            ...inputImages.map(
              (image) => `${image}:gcr-${config["change-number"]}`,
            ),
          );
          // Push patchset number too if set
          if (config["patchset-number"]) {
            outputTarget.tags.push(
              ...inputImages.map(
                (image) =>
                  `${image}:gcr-${config["change-number"]}-${config["patchset-number"]}`,
              ),
            );
          }
        } else {
          if (config["tag-git-sha"] === true) {
            outputTarget.tags.push(
              ...inputImages.map(
                (image) => `${image}:sha-${config["git-sha"]}`,
              ),
            );
          }

          if (config["tag-version"] === true) {
            outputTarget.tags.push(
              ...inputImages.map((image) => `${image}:${normalizedVersion}`),
            );
          }

          if (config.latest) {
            if (
              config["tag-version"] === true &&
              config["tag-semver"] &&
              semver.valid(config.version)
            ) {
              const versionTags: string[] = [];

              const majorTag = `${semver.major(normalizedVersion)}`;
              versionTags.push(majorTag);
              const minorTag = `${majorTag}.${semver.minor(normalizedVersion)}`;
              versionTags.push(minorTag);
              const patchTag = `${minorTag}.${semver.patch(normalizedVersion)}`;
              // prevent adding duplicated version tags
              if (patchTag !== normalizedVersion) {
                versionTags.push(patchTag);
              }

              for (const versionTag of versionTags) {
                outputTarget.tags.push(
                  ...inputImages.map((image) => `${image}:${versionTag}`),
                );
              }
            }

            outputTarget.tags.push(
              ...inputImages.map(
                (image) =>
                  `${image}:${config.branch!.replaceAll(/[^a-zA-Z0-9._-]+/g, "-")}`,
              ),
            );

            if (config.branch === "master" || config.branch === "develop") {
              outputTarget.tags.push(
                ...inputImages.map((image) => `${image}:latest`),
              );
            }
          }
        }

        if (Array.isArray(inputTags)) {
          outputTarget.tags.push(...inputTags);
        }

        if (config["tag-version"] === true) {
          outputTarget.args.VERSION = normalizedVersion;
        }
        outputTarget.args.BRANCH = config.branch!;

        // Merge generated args with the args from the input
        outputTarget.args = { ...outputTarget.args, ...inputArguments };

        // Add extra keys
        outputTarget = { ...outputTarget, ...inputExtraKeys };

        output.target[outputTargetName] = outputTarget;
      }
    }

    if (config.groups) {
      output.group = config.groups;
    }

    if (this.output) {
      await writeFile(this.output, JSON.stringify(output, undefined, 2));
    } else {
      console.log(JSON.stringify(output, undefined, 2));
    }
  }
}
