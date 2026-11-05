/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "workflow-agent",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      home: "aws",
      providers: { aws: { region: "us-east-1" } },
    };
  },
  async run() {
    const llaves = {
      fields: { pk: "string", sk: "string" },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
    } as const;

    const negocios = new sst.aws.Dynamo("Negocios", llaves);
    const conversaciones = new sst.aws.Dynamo("Conversaciones", llaves);

    const web = new sst.aws.Nextjs("Web", {
      path: "packages/web",
      link: [negocios, conversaciones],
    });

    const admin = new sst.aws.Nextjs("Admin", {
      path: "packages/admin",
      link: [negocios, conversaciones],
    });

    return { web: web.url, admin: admin.url };
  },
});
