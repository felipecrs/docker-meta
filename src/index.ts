import { Command, flags } from "@oclif/command";
import { cosmiconfig } from "cosmiconfig";
import * as chalk from "chalk";
import * as execa from "execa";
import * as fs from "fs";
require("pkginfo")(module, "description");

class BakeTarget {
  tags: string[] = [];

  labels: {
    [label: string]: string;
  } = {};

  args: {
    [arg: string]: string;
  } = {};
}

class BakeFile {
  target: {
    [name: string]: BakeTarget;
  } = {};
}

interface DockerMetaConfig {
  preset: "gerrit";
  version: string;
  branch: string;
  latest: boolean;
  "change-request": boolean;
  "change-number": string;
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
    };
  };
};

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
    "change-request": flags.boolean({
      description: "Change request mode",
      allowNo: true,
    }),
    "change-number": flags.string({
      description: "The change number",
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
    config?: string,
    version?: string,
    branch?: string,
    latest?: boolean,
    "build-date"?: string,
    "git-sha"?: string,
    "change-request"?: boolean,
    "change-number"?: string,
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

        version: flags.version || process.env.VERSION || config.version,

        branch: flags.branch || process.env.BRANCH || config.branch,

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
      };

      if (!resultConfig.version) {
        this.error("version unset");
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

      return resultConfig;
    }
    this.error("Can not load the config file.");
  }

  async run() {
    const { flags } = this.parse(DockerMeta);

    const config: DockerMetaConfig = await this.loadConfig(flags);

    const output = new BakeFile();

    for (const targetName in config.targets) {
      if (Object.prototype.hasOwnProperty.call(config.targets, targetName)) {
        const inputTarget = config.targets[targetName];

        const outputTargetName = `docker-meta-${targetName}`;
        const outputTarget: BakeTarget = new BakeTarget();

        outputTarget.labels["org.label-schema.vsc-ref"] = config["git-sha"];
        outputTarget.labels["org.label-schema.build-date"] = config["build-date"];
        outputTarget.labels["org.label-schema.version"] = config.version;
        outputTarget.labels["org.label-schema.schema-version"] = "1.0.0-rc1";

        // merge generated labels with the labels from the input
        outputTarget.labels = { ...outputTarget.labels, ...inputTarget.labels };

        if (config["change-request"]) {
          outputTarget.tags.push(
            ...inputTarget.images.map((image) => `${image}:gcr-${config["change-number"]}`)
          );
        } else {
          outputTarget.tags.push(
            ...inputTarget.images.map((image) => `${image}:${config.version}`)
          );

          if (config.latest) {
            outputTarget.tags.push(
              ...inputTarget.images.map((image) => `${image}:branch-${config.branch}`)
            );
            // eslint-disable-next-line max-depth
            if (config.branch === "master" || config.branch === "develop") {
              outputTarget.tags.push(
                ...inputTarget.images.map((image) => `${image}:latest`)
              );
            }
          }
        }

        outputTarget.args.VERSION = config.version
        outputTarget.args.BRANCH = config.branch

        output.target[outputTargetName] = outputTarget;
      }
    }
    if (flags.output) {
      fs.writeFileSync(flags.output, JSON.stringify(output, null, 2));
    } else {
      this.log(JSON.stringify(output, null, 2));
    }
  }
}

export = DockerMeta;
