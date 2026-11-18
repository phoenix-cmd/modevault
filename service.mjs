// MODELVAULT — Composer service declaration.
// Pure data: the app's running unit on Prisma Compute, its database
// dependency, and the input it receives at boot. App code imports this file
// and reads everything through service.load() and service.input() — never
// from process.env.
// @ts-check
import nextjs from "@prisma/composer/nextjs";
import { compute } from "@prisma/composer-prisma-cloud";
import { dataContract, postgres } from "@prisma/composer-prisma-cloud/orm";
import { secretString } from "@prisma/composer/arktype";
import { type } from "arktype";
import contractJson from "./src/prisma/contract.json" with { type: "json" };

/** @typedef {import("./src/prisma/contract").Contract} Contract */

const dataContractTyped = /** @type {typeof dataContract<Contract>} */ (dataContract);

export const contract = dataContractTyped(contractJson);

export default compute({
  name: "modevault",
  deps: { db: postgres(contract) },
  input: type({ authSecret: secretString() }),
  build: nextjs({ module: import.meta.url, appDir: "." }),
});
