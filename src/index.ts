import { Command, flags } from "@oclif/command";
import { cosmiconfig } from "cosmiconfig";
import * as chalk from "chalk";
import * as execa from "execa";
require("pkginfo")(module, "description");

const getShortSha = (): string => {
  return execa.commandSync("git rev-parse --short HEAD").stdout;
};

const getVersion = (): string => {
  if (process.env.VERSION) {
    return process.env.VERSION;
  }
  throw new Error("VERSION env var is mandatory")
};

const isChangeRequest = (): boolean => {
  if (process.env.CHANGE_REQUEST) {
    return process.env.CHANGE_REQUEST === "true";
  }
  throw new Error("CHANGE_REQUEST env var is mandatory")
};

const isLatest = (): boolean => {
  if (process.env.LATEST) {
    return process.env.LATEST === 'true';
  }
  throw new Error("LATEST env var is mandatory")
}

const getBranch = (): string => {
  if (process.env.BRANCH) {
    return process.env.BRANCH
  }
  throw new Error("BRANCH env var is mandatory")
}

const getChangeNumber = (): string => {
  if (process.env.GERRIT_CHANGE_NUMBER) {
    return process.env.GERRIT_CHANGE_NUMBER
  }
  throw new Error("GERRIT_CHANGE_NUMBER env var is mandatory")
}

const getBuildDate = (): string => {
  return new Date().toISOString()
}

class BakeTarget {
  tags: string[] = [];

  labels: Map<string, string> = new Map();

  args: Map<string, string> = new Map()
}

interface BakeFile {
  target: {
    [name: string]: BakeTarget;
  };
}

interface Config {
  preset: "gerrit";
  targets: {
    [name: string]: {
      images: string[],
      labels: Map<string, string> = new Map(),
    }
  },
};

class DockerMeta extends Command {
  static description = `${module.exports.description}
  The config will be read from any valid config file in the current directory. The configuration file can be defined using all the extensions and names accepted by ${chalk.blue(
    "cosmiconfig"
  )}, such as ${chalk.blue("docker-meta.config.js")}
  `;

  static flags = {
    version: flags.version(),
    help: flags.help({ char: "h" }),
    config: flags.string({
      char: "c",
      description: "Path to the config file",
    }),
  };

  async loadConfig(config?: string): Promise<Config> {
    const explorer = cosmiconfig(this.config.name);

    const result = config
      ? await explorer.load(config)
      : await explorer.search();

    if (result) {
      return result.config;
    }
    this.error("I was not able to load the configuration file.");
  }

  async run() {
    const { flags } = this.parse(DockerMeta);

    const config = await this.loadConfig(flags.config);

    if (config.preset !== "gerrit") {
      this.error("The only supported preset for now is 'gerrit'.")
    }

    let output: BakeFile;

    for (const targetName in config.targets) {
      if (Object.prototype.hasOwnProperty.call(config.targets, targetName)) {

        const inputTarget = config.targets[targetName]

        const outputTargetName = `docker-meta-${targetName}`
        const outputTarget: BakeTarget = new BakeTarget();

        outputTarget.labels.set("org.label-schema.vsc-ref", getShortSha());
        outputTarget.labels.set("org.label-schema.build-date", getBuildDate());
        outputTarget.labels.set("org.label-schema.version", getVersion());
        outputTarget.labels.set("org.label-schema.schema-version", '1.0.0-rc1');

        // merge generated labels with the labels from the input
        outputTarget.labels = new Map([...outputTarget.labels, ...inputTarget.labels])

        if (isChangeRequest()) {
          const changeNumber = getChangeNumber();
          outputTarget.tags.push(
            ...inputTarget.images.map((image) => `${image}:gcr-${changeNumber}`)
          );
        } else if (isLatest()) {
          const branch = getBranch()
          outputTarget.tags.push(
            ...inputTarget.images.map((image) => `${image}:branch-${branch}`)
          );
          if (branch === 'master' || branch === 'develop') {
            outputTarget.tags.push(
              ...inputTarget.images.map((image) => `${image}:latest`)
            );
          }
        }

        output.target[outputTargetName] = outputTarget
      }
    }
  }
}

export = DockerMeta;
