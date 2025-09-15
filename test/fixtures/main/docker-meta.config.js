// @ts-check

/**
 * @type {import("../../../src/index.ts").DockerMetaConfig}
 */
const config = {
  preset: "gerrit",
  targets: {
    "docker-meta": {
      images: ["felipecrs/docker-meta", "ghcr.io/felipecrs/docker-meta"],
      labels: {
        "org.label-schema.build-date": "docker-meta",
      },
    },
  },
};

export default config;
