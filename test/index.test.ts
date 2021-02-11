import { getBinPathSync } from "get-bin-path";
import * as execa from "execa";
import * as shell from "shelljs";
import * as tmp from "tmp";
import * as fs from "fs";

const bin = getBinPathSync();

const configPath = `${process.cwd()}/test/res/docker-meta.config.js`;

jest.setTimeout(30000);

beforeAll(() => {
  process.env = Object.assign(process.env, { FORCE_COLOR: 0 });
});

describe("docker-meta", () => {
  let dir: tmp.DirResult;
  const OLD_ENV = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    dir = tmp.dirSync({ unsafeCleanup: true });
    shell.cd(dir.name);
    // execa.commandSync("git init");
    // execa.commandSync("git commit -m initial --allow-empty");
    shell.cp("-f", configPath, "docker-meta.config.js");
  });

  afterEach(async () => {
    process.env = OLD_ENV;
    dir.removeCallback();
  });

  it("generates correctly for gerrit change", async () => {
    process.env.VERSION = "1.1.1";
    process.env.LATEST = "true";
    process.env.BRANCH = "develop";
    process.env.GERRIT_CHANGE_NUMBER = "123";
    process.env.GIT_COMMIT = "81a88f4";

    const result = execa.commandSync(`${bin} -o dm.json`);
    expect(result.stdout).toBe("");
    expect(result.exitCode).toBe(0);

    expect(fs.readFileSync("dm.json").toString()).toEqual(`\
{
  "target": {
    "docker-meta-docker-meta": {
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
        "BRANCH": "develop"
      }
    }
  }
}`);
  });
});
