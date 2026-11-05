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
    const keys = {
      fields: { pk: "string", sk: "string" },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
    } as const;

    const businesses = new sst.aws.Dynamo("Businesses", keys);
    const conversations = new sst.aws.Dynamo("Conversations", keys);

    const web = new sst.aws.Nextjs("Web", {
      path: "packages/web",
      link: [businesses, conversations],
    });

    const admin = new sst.aws.Nextjs("Admin", {
      path: "packages/admin",
      link: [businesses, conversations],
    });

    return { web: web.url, admin: admin.url };
  },
});
