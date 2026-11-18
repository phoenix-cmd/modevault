// @ts-check
import { module } from "@prisma/composer";
import { envSecret } from "@prisma/composer-prisma-cloud";
import { postgres } from "@prisma/composer-prisma-cloud/orm";
import service, { contract } from "./service.mjs";

export default module("prisma-postgres-indigo-umbrella", ({ provision }) => {
  const db = provision(
    postgres({
      name: "db",
      contract,
      config: "./prisma.config.ts",
    }),
  );

  provision(service, {
    deps: { db },
    input: {
      authSecret: envSecret("AUTH_SECRET"), // Signs the app's session cookies.
    },
  });
});
