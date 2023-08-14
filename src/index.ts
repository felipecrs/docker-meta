import { Command, flags } from "@oclif/command";
import { cosmiconfig } from "cosmiconfig";
import * as chalk from "chalk";
import * as execa from "execa";
import * as fs from "fs";
import * as semver from "semver";
require("pkginfo")(module, "description");

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

interface DockerMetaConfig {
  preset: "gerrit";
  version: string;
  branch: string;
  latest: boolean;
  "tag-version": boolean
  "tag-semver": boolean | "auto";
  "change-request": boolean;
  "change-number": string;
  "patchset-number": string;
  "git-sha": string;
  "build-date": string;
  targets: {
    [target: string]: {
      version: string;
      branch: string;
      latest: boolean;
      "git-sha": string;
      "build-date": string;
      images: string[];
      labels: {
        [label: string]: string;
      };
      args: {
        [arg: string]: string;
      };
      [key: string]: any;
    };
  };
  groups: {
    [group: string]: any;
  }
}

class DockerMeta extends Command {
  static description = `${module.exports.description}
  The config will be read from any valid config file in the current directory. The configuration file can be defined using all the extensions and names accepted by ${chalk.blue(
    "cosmiconfig"
  )}, such as ${chalk.blue("docker-meta.config.js")}
  `;

  static flags = {
    "": flags.version({ char: "V" }),
    help: flags.help({ char: "h" }),
    config: flags.string({
      char: "c",
      description: "Path to the config file",
    }),
    output: flags.string({
      char: "o",
      description: "Path to the output file",
    }),
    branch: flags.string({
      description: "The branch",
    }),
    version: flags.string({
      description: "The version to publish",
    }),
    latest: flags.boolean({
      description: "Push as latest",
      allowNo: true,
    }),
    "tag-version": flags.boolean({
      description: "Use `version` to generate tags",
      allowNo: true,
    }),
    "tag-semver": flags.boolean({
      description: "Use semver strategy to generate tags",
      allowNo: true,
    }),
    "change-request": flags.boolean({
      description: "Change request mode",
      allowNo: true,
    }),
    "change-number": flags.string({
      description: "The change number",
    }),
    "patchset-number": flags.string({
      description: "The change patchset number",
    }),
    "git-sha": flags.string({
      description: "The git sha",
    }),
    "build-date": flags.string({
      description: "The build date in ISO 8601",
    }),
  };

  // eslint-disable-next-line complexity
  async loadConfig(flags: {
    config?: string;
    version?: string;
    branch?: string;
    latest?: boolean;
    "tag-version"?: boolean;
    "tag-semver"?: boolean;
    "build-date"?: string;
    "git-sha"?: string;
    "change-request"?: boolean;
    "change-number"?: string;
    "patchset-number"?: string;
  }): Promise<DockerMetaConfig> {
    const explorer = cosmiconfig(this.config.name);

    const result = flags.config
      ? await explorer.load(flags.config)
      : await explorer.search();

    if (result) {
      const config: DockerMetaConfig = result.config;

      if (config.preset !== "gerrit") {
        this.error("The only supported preset for now is 'gerrit'.");
      }

      const resultConfig: DockerMetaConfig = {
        ...config,

        latest:
          // eslint-disable-next-line no-negated-condition
          typeof flags.latest !== "undefined"
            ? flags.latest
            : "LATEST" in process.env
              ? process.env.LATEST === "true"
              : // eslint-disable-next-line no-negated-condition
              typeof config.latest !== "undefined"
                ? config.latest
                : false,

        "tag-version":
          // eslint-disable-next-line no-negated-condition
          typeof flags["tag-version"] !== "undefined"
            ? flags["tag-version"]
            : // eslint-disable-next-line no-negated-condition
            typeof config["tag-version"] !== "undefined"
              ? config["tag-version"]
              : true,

        "tag-semver":
          // eslint-disable-next-line no-negated-condition
          typeof flags["tag-semver"] !== "undefined"
            ? flags["tag-semver"]
            : // eslint-disable-next-line no-negated-condition
            typeof config["tag-semver"] !== "undefined"
              ? config["tag-semver"]
              : "auto",

        version: flags.version || process.env.VERSION || config.version,

        branch:
          flags.branch ||
          process.env.BRANCH ||
          config.branch ||
          execa.commandSync("git branch --show-current").stdout,

        "git-sha":
          flags["build-date"] ||
          process.env.GIT_SHA ||
          process.env.GIT_COMMIT ||
          config["git-sha"] ||
          execa.commandSync("git rev-parse --short HEAD").stdout,

        "build-date":
          flags["build-date"] ||
          process.env.BUILD_DATE ||
          config["build-date"] ||
          new Date().toISOString(),

        "change-request":
          // eslint-disable-next-line no-negated-condition
          typeof flags["change-request"] !== "undefined"
            ? flags["change-request"]
            : "CHANGE_REQUEST" in process.env
              ? process.env.CHANGE_REQUEST === "true"
              : // eslint-disable-next-line no-negated-condition
              typeof config["change-request"] !== "undefined"
                ? config["change-request"]
                : true,

        "change-number":
          flags["change-number"] ||
          process.env.GERRIT_CHANGE_NUMBER ||
          config["change-number"],

        "patchset-number":
          flags["patchset-number"] ||
          process.env.GERRIT_PATCHSET_NUMBER ||
          config["patchset-number"],
      };

      if (resultConfig["tag-version"] === true && !resultConfig.version) {
        this.error("version unset");
      } else if (
        resultConfig["tag-semver"] === true &&
        !semver.valid(resultConfig.version)
      ) {
        this.error(
          "tag-semver is enabled but version doesn't seem to be valid semver"
        );
      }

      if (typeof resultConfig.latest === "undefined") {
        this.error("latest unset");
      }

      if (!resultConfig.branch) {
        this.error("branch unset");
      }

      if (!resultConfig["git-sha"]) {
        this.error("git-sha unset");
      }

      if (!resultConfig["build-date"]) {
        this.error("build-date unset");
      }

      if (typeof resultConfig["change-request"] === "undefined") {
        this.error("change-request unset");
      }

      if (resultConfig["change-request"] && !resultConfig["change-number"]) {
        this.error("change-number unset in change-request mode");
      }

      // If patchset number is not set, it's ok. It's not mandatory.

      return resultConfig;
    }
    this.error("Can not load the config file.");
  }

  async run(): Promise<void> {
    const { flags } = this.parse(DockerMeta);

    const config: DockerMetaConfig = await this.loadConfig(flags);

    const output = new BakeFile();

    for (const targetName in config.targets) {
      if (Object.prototype.hasOwnProperty.call(config.targets, targetName)) {
        const inputTarget = config.targets[targetName];

        const outputTargetName = targetName;
        let outputTarget: BakeTarget = new BakeTarget();

        // semver.parse will normalize the version if it's a valid semver
        // example: v1.0.0 -> 1.0.0
        // otherwise we leave it as is
        const normalizedVersion = `${semver.parse(config.version) || config.version
          }`;

        outputTarget.labels["org.label-schema.vsc-ref"] = config["git-sha"];
        outputTarget.labels["org.label-schema.build-date"] =
          config["build-date"];
        if (config["tag-version"] === true) {
          outputTarget.labels["org.label-schema.version"] = normalizedVersion;
        }
        outputTarget.labels["org.label-schema.schema-version"] = "1.0.0-rc1";

        // extract needed fields
        const { labels: inputLabels, images: inputImages, args: inputArgs, tags: inputTags, ...inputExtraKeys } = inputTarget;
        // merge generated labels with the labels from the input
        outputTarget.labels = { ...outputTarget.labels, ...inputLabels };

        if (config["change-request"]) {
          outputTarget.tags.push(
            ...inputImages.map(
              (image) => `${image}:gcr-${config["change-number"]}`
            )
          );
          // Push patchset number too if set
          if (config["patchset-number"]) {
            outputTarget.tags.push(
              ...inputImages.map(
                (image) =>
                  `${image}:gcr-${config["change-number"]}-${config["patchset-number"]}`
              )
            );
          }
        } else {
          if (config["tag-version"] === true) {
            outputTarget.tags.push(
              ...inputImages.map(
                (image) => `${image}:${normalizedVersion}`
              )
            );
          }

          if (config.latest) {
            // eslint-disable-next-line max-depth
            if (config["tag-version"] === true && config["tag-semver"] && semver.valid(config.version)) {
              const versionTags: string[] = [];

              const majorTag = `${semver.major(normalizedVersion)}`;
              versionTags.push(majorTag);
              const minorTag = `${majorTag}.${semver.minor(normalizedVersion)}`;
              versionTags.push(minorTag);
              const patchTag = `${minorTag}.${semver.patch(normalizedVersion)}`;
              // prevent adding duplicated version tags
              // eslint-disable-next-line max-depth
              if (patchTag !== normalizedVersion) {
                versionTags.push(patchTag);
              }

              versionTags.forEach((versionTag) =>
                outputTarget.tags.push(
                  ...inputImages.map((image) => `${image}:${versionTag}`)
                )
              );
            }

            outputTarget.tags.push(
              ...inputImages.map(
                (image) =>
                  `${image}:${config.branch.replace(/[^a-zA-Z0-9._-]+/g, "-")}`
              )
            );

            // eslint-disable-next-line max-depth
            if (config.branch === "master" || config.branch === "develop") {
              outputTarget.tags.push(
                ...inputImages.map((image) => `${image}:latest`)
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
        outputTarget.args.BRANCH = config.branch;

        // Merge generated args with the args from the input
        outputTarget.args = { ...outputTarget.args, ...inputArgs };

        // Add extra keys
        outputTarget = { ...outputTarget, ...inputExtraKeys };

        output.target[outputTargetName] = outputTarget;
      }
    }

    if(config.groups) {
      output.group = config.groups;
    }

    if (flags.output) {
      fs.writeFileSync(flags.output, JSON.stringify(output, null, 2));
    } else {
      this.log(JSON.stringify(output, null, 2));
    }
  }
}

export = DockerMeta;
