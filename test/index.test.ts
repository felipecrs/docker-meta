import { getBinPathSync } from "get-bin-path";
import * as execa from "execa";
import * as shell from "shelljs";
import * as tmp from "tmp";
import * as fs from "fs";
import { stripIndent } from "common-tags";

const bin = getBinPathSync();

const configPath = `${process.cwd()}/test/res/docker-meta.config.js`;

jest.setTimeout(30000);

beforeAll(() => {
  process.env = Object.assign(process.env, { FORCE_COLOR: 0 });
});

describe("docker-meta", () => {
  let dir: tmp.DirResult;
  let cleanEnv: any;

  beforeEach(() => {
    cleanEnv = process.env;
    dir = tmp.dirSync({ unsafeCleanup: true });
    shell.cd(dir.name);
    execa.commandSync("git init");
    execa.commandSync(
      "git commit --no-edit --allow-empty --allow-empty-message"
    );
    shell.cp("-f", configPath, "docker-meta.config.js");
  });

  afterEach(() => {
    shell.cd("-");
    dir.removeCallback();
    jest.resetModules();
    process.env = cleanEnv;
  });

  it("generates correctly for gerrit change", async () => {
    process.env.VERSION = "1.1.1";
    process.env.LATEST = "true";
    process.env.GERRIT_CHANGE_NUMBER = "123";
    process.env.GIT_COMMIT = "81a88f4";

    const result = execa.commandSync(`${bin} -o dm.json`);
    expect(result.stdout).toBe("");
    expect(result.exitCode).toBe(0);

    expect(fs.readFileSync("dm.json").toString()).toEqual(stripIndent`
      {
        "target": {
          "docker-meta": {
            "tags": [
              "felipecrs/docker-meta:gcr-123",
              "ghcr.io/felipecrs/docker-meta:gcr-123"
            ],
            "labels": {
              "org.label-schema.vsc-ref": "81a88f4",
              "org.label-schema.build-date": "docker-meta",
              "org.label-schema.version": "1.1.1",
              "org.label-schema.schema-version": "1.0.0-rc1"
            },
            "args": {
              "VERSION": "1.1.1",
              "BRANCH": "master"
            }
          }
        }
      }`);
  });

  it("generates correctly for gerrit change with patchset number", async () => {
    process.env.VERSION = "1.1.1";
    process.env.LATEST = "true";
    process.env.GERRIT_CHANGE_NUMBER = "123";
    process.env.GERRIT_PATCHSET_NUMBER = "321";
    process.env.GIT_COMMIT = "81a88f4";

    const result = execa.commandSync(`${bin} -o dm.json`);
    expect(result.stdout).toBe("");
    expect(result.exitCode).toBe(0);

    expect(fs.readFileSync("dm.json").toString()).toEqual(stripIndent`
      {
        "target": {
          "docker-meta": {
            "tags": [
              "felipecrs/docker-meta:gcr-123",
              "ghcr.io/felipecrs/docker-meta:gcr-123",
              "felipecrs/docker-meta:gcr-123-321",
              "ghcr.io/felipecrs/docker-meta:gcr-123-321"
            ],
            "labels": {
              "org.label-schema.vsc-ref": "81a88f4",
              "org.label-schema.build-date": "docker-meta",
              "org.label-schema.version": "1.1.1",
              "org.label-schema.schema-version": "1.0.0-rc1"
            },
            "args": {
              "VERSION": "1.1.1",
              "BRANCH": "master"
            }
          }
        }
      }`);
  });

  it("generates correctly for non change-request", async () => {
    process.env.VERSION = "1.2.3";
    process.env.LATEST = "true";
    process.env.BRANCH = "develop";
    process.env.CHANGE_REQUEST = "false";
    process.env.GIT_COMMIT = "81a88f4";

    const result = execa.commandSync(`${bin} -o dm.json`);
    expect(result.stdout).toBe("");
    expect(result.exitCode).toBe(0);

    expect(fs.readFileSync("dm.json").toString()).toEqual(stripIndent`
          {
            "target": {
              "docker-meta": {
                "tags": [
                  "felipecrs/docker-meta:1.2.3",
                  "ghcr.io/felipecrs/docker-meta:1.2.3",
                  "felipecrs/docker-meta:1",
                  "ghcr.io/felipecrs/docker-meta:1",
                  "felipecrs/docker-meta:1.2",
                  "ghcr.io/felipecrs/docker-meta:1.2",
                  "felipecrs/docker-meta:develop",
                  "ghcr.io/felipecrs/docker-meta:develop",
                  "felipecrs/docker-meta:latest",
                  "ghcr.io/felipecrs/docker-meta:latest"
                ],
                "labels": {
                  "org.label-schema.vsc-ref": "81a88f4",
                  "org.label-schema.build-date": "docker-meta",
                  "org.label-schema.version": "1.2.3",
                  "org.label-schema.schema-version": "1.0.0-rc1"
                },
                "args": {
                  "VERSION": "1.2.3",
                  "BRANCH": "develop"
                }
              }
            }
          }`);
  });

  it("disables tag-semver properly", async () => {
    process.env.VERSION = "1.2.3";
    process.env.LATEST = "true";
    process.env.BRANCH = "develop";
    process.env.CHANGE_REQUEST = "false";
    process.env.GIT_COMMIT = "81a88f4";

    const result = execa.commandSync(`${bin} -o dm.json --no-tag-semver`);
    expect(result.stdout).toBe("");
    expect(result.exitCode).toBe(0);

    expect(fs.readFileSync("dm.json").toString()).toEqual(stripIndent`
          {
            "target": {
              "docker-meta": {
                "tags": [
                  "felipecrs/docker-meta:1.2.3",
                  "ghcr.io/felipecrs/docker-meta:1.2.3",
                  "felipecrs/docker-meta:develop",
                  "ghcr.io/felipecrs/docker-meta:develop",
                  "felipecrs/docker-meta:latest",
                  "ghcr.io/felipecrs/docker-meta:latest"
                ],
                "labels": {
                  "org.label-schema.vsc-ref": "81a88f4",
                  "org.label-schema.build-date": "docker-meta",
                  "org.label-schema.version": "1.2.3",
                  "org.label-schema.schema-version": "1.0.0-rc1"
                },
                "args": {
                  "VERSION": "1.2.3",
                  "BRANCH": "develop"
                }
              }
            }
          }`);
  });

  it("disables tag-semver if version is invalid and tag-semver is auto", async () => {
    process.env.VERSION = "invalid1.2.3";
    process.env.LATEST = "true";
    process.env.BRANCH = "develop";
    process.env.CHANGE_REQUEST = "false";
    process.env.GIT_COMMIT = "81a88f4";

    const result = execa.commandSync(`${bin} -o dm.json`);
    expect(result.stdout).toBe("");
    expect(result.exitCode).toBe(0);

    expect(fs.readFileSync("dm.json").toString()).toEqual(stripIndent`
          {
            "target": {
              "docker-meta": {
                "tags": [
                  "felipecrs/docker-meta:invalid1.2.3",
                  "ghcr.io/felipecrs/docker-meta:invalid1.2.3",
                  "felipecrs/docker-meta:develop",
                  "ghcr.io/felipecrs/docker-meta:develop",
                  "felipecrs/docker-meta:latest",
                  "ghcr.io/felipecrs/docker-meta:latest"
                ],
                "labels": {
                  "org.label-schema.vsc-ref": "81a88f4",
                  "org.label-schema.build-date": "docker-meta",
                  "org.label-schema.version": "invalid1.2.3",
                  "org.label-schema.schema-version": "1.0.0-rc1"
                },
                "args": {
                  "VERSION": "invalid1.2.3",
                  "BRANCH": "develop"
                }
              }
            }
          }`);
  });

  it("normalizes the version", async () => {
    process.env.VERSION = "v1.2.3";
    process.env.LATEST = "true";
    process.env.BRANCH = "develop";
    process.env.CHANGE_REQUEST = "false";
    process.env.GIT_COMMIT = "81a88f4";

    const result = execa.commandSync(`${bin} -o dm.json`);
    expect(result.stdout).toBe("");
    expect(result.exitCode).toBe(0);

    expect(fs.readFileSync("dm.json").toString()).toEqual(stripIndent`
          {
            "target": {
              "docker-meta": {
                "tags": [
                  "felipecrs/docker-meta:1.2.3",
                  "ghcr.io/felipecrs/docker-meta:1.2.3",
                  "felipecrs/docker-meta:1",
                  "ghcr.io/felipecrs/docker-meta:1",
                  "felipecrs/docker-meta:1.2",
                  "ghcr.io/felipecrs/docker-meta:1.2",
                  "felipecrs/docker-meta:develop",
                  "ghcr.io/felipecrs/docker-meta:develop",
                  "felipecrs/docker-meta:latest",
                  "ghcr.io/felipecrs/docker-meta:latest"
                ],
                "labels": {
                  "org.label-schema.vsc-ref": "81a88f4",
                  "org.label-schema.build-date": "docker-meta",
                  "org.label-schema.version": "1.2.3",
                  "org.label-schema.schema-version": "1.0.0-rc1"
                },
                "args": {
                  "VERSION": "1.2.3",
                  "BRANCH": "develop"
                }
              }
            }
          }`);
  });

  it("refuses to work if tag-semver is enabled and version is not valid", async () => {
    process.env.VERSION = "invalid1.2.3";
    process.env.LATEST = "true";
    process.env.BRANCH = "develop";
    process.env.CHANGE_REQUEST = "false";
    process.env.GIT_COMMIT = "81a88f4";

    const result = execa.commandSync(`${bin} -o dm.json --tag-semver`, {
      reject: false,
    });
    expect(result.exitCode).toBe(2);
  });

  it("allows to disable the version", async () => {
    process.env.LATEST = "true";
    process.env.BRANCH = "develop";
    process.env.CHANGE_REQUEST = "false";
    process.env.GIT_COMMIT = "81a88f4";

    const result = execa.commandSync(`${bin} --no-tag-version -o dm.json`);
    expect(result.stdout).toBe("");
    expect(result.exitCode).toBe(0);

    expect(fs.readFileSync("dm.json").toString()).toEqual(stripIndent`
          {
            "target": {
              "docker-meta": {
                "tags": [
                  "felipecrs/docker-meta:develop",
                  "ghcr.io/felipecrs/docker-meta:develop",
                  "felipecrs/docker-meta:latest",
                  "ghcr.io/felipecrs/docker-meta:latest"
                ],
                "labels": {
                  "org.label-schema.vsc-ref": "81a88f4",
                  "org.label-schema.build-date": "docker-meta",
                  "org.label-schema.schema-version": "1.0.0-rc1"
                },
                "args": {
                  "BRANCH": "develop"
                }
              }
            }
          }`);
  });
});
