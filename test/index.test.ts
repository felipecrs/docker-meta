import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { stripIndent } from "common-tags";
import spawn from "nano-spawn";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";

const repoDirectory = path.normalize(`${import.meta.dirname}/..`);

const fixturesDirectory = path.normalize(`${repoDirectory}/test/fixtures`);
const mainConfigPath = path.normalize(
  `${fixturesDirectory}/main/docker-meta.config.js`,
);

declare module "vitest" {
  export interface TestContext {
    temporaryDirectory: string;
  }
}

describe("docker-meta", () => {
  beforeEach(async (context) => {
    context.temporaryDirectory = await mkdtemp(
      path.normalize(`${repoDirectory}/test/temp-`),
    );
    process.chdir(context.temporaryDirectory);
    await spawn("git", ["init"]);
    await spawn("git", [
      "commit",
      "--no-edit",
      "--allow-empty",
      "--allow-empty-message",
    ]);
    await copyFile(mainConfigPath, "docker-meta.config.js");
  });

  afterEach(async (context) => {
    process.chdir(repoDirectory);
    await rm(context.temporaryDirectory, { force: true, recursive: true });
  });

  it("generates correctly for gerrit change", async () => {
    process.env.CHANGE_REQUEST = "true";
    process.env.VERSION = "1.1.1";
    process.env.LATEST = "true";
    process.env.GERRIT_CHANGE_NUMBER = "123";
    process.env.GIT_COMMIT = "81a88f4";

    const result = await spawn("node", [
      path.normalize(`${repoDirectory}/src/index.ts`),
      "-o",
      "dm.json",
    ]);
    expect(result.stdout).toBe("");

    const file = await readFile("dm.json");
    expect(file.toString()).toEqual(stripIndent`
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

    const result = await spawn("node", [
      path.normalize(`${repoDirectory}/src/index.ts`),
      "-o",
      "dm.json",
    ]);
    expect(result.stdout).toBe("");

    const file = await readFile("dm.json");
    expect(file.toString()).toEqual(stripIndent`
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

    const result = await spawn("node", [
      path.normalize(`${repoDirectory}/src/index.ts`),
      "-o",
      "dm.json",
    ]);
    expect(result.stdout).toBe("");

    const file = await readFile("dm.json");
    expect(file.toString()).toEqual(stripIndent`
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

    const result = await spawn("node", [
      path.normalize(`${repoDirectory}/src/index.ts`),
      "-o",
      "dm.json",
      "--no-tag-semver",
    ]);
    expect(result.stdout).toBe("");

    const file = await readFile("dm.json");
    expect(file.toString()).toEqual(stripIndent`
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

    const result = await spawn("node", [
      path.normalize(`${repoDirectory}/src/index.ts`),
      "-o",
      "dm.json",
    ]);
    expect(result.stdout).toBe("");

    const file = await readFile("dm.json");
    expect(file.toString()).toEqual(stripIndent`
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

    const result = await spawn("node", [
      path.normalize(`${repoDirectory}/src/index.ts`),
      "-o",
      "dm.json",
    ]);
    expect(result.stdout).toBe("");

    const file = await readFile("dm.json");
    expect(file.toString()).toEqual(stripIndent`
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

  it("tags with git-sha properly", async () => {
    process.env.VERSION = "1.2.3";
    process.env.LATEST = "true";
    process.env.BRANCH = "develop";
    process.env.CHANGE_REQUEST = "false";
    process.env.GIT_COMMIT = "81a88f456";

    const result = await spawn("node", [
      path.normalize(`${repoDirectory}/src/index.ts`),
      "-o",
      "dm.json",
      "--tag-git-sha",
    ]);
    expect(result.stdout).toBe("");

    const file = await readFile("dm.json");
    expect(file.toString()).toEqual(stripIndent`
          {
            "target": {
              "docker-meta": {
                "tags": [
                  "felipecrs/docker-meta:sha-81a88f4",
                  "ghcr.io/felipecrs/docker-meta:sha-81a88f4",
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

    try {
      await spawn("node", [
        path.normalize(`${repoDirectory}/src/index.ts`),
        "-o",
        "dm.json",
        "--tag-semver",
      ]);
    } catch (error: any) {
      expect(error.exitCode).toBe(1);
    }
  });

  it("allows to disable the version", async () => {
    process.env.LATEST = "true";
    process.env.BRANCH = "develop";
    process.env.CHANGE_REQUEST = "false";
    process.env.GIT_COMMIT = "81a88f4";

    const result = await spawn("node", [
      path.normalize(`${repoDirectory}/src/index.ts`),
      "--no-tag-version",
      "-o",
      "dm.json",
    ]);
    expect(result.stdout).toBe("");

    const file = await readFile("dm.json");
    expect(file.toString()).toEqual(stripIndent`
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
