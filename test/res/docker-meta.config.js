module.exports = {
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
