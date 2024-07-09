import yargs from "yargs/yargs";

import { AgentBrowser } from "../src/agentBrowser";
import { Browser } from "../src/browser";
import { Agent } from "../src/agent/agent";
import { Inventory } from "../src/inventory";
import { completionApiBuilder } from "../src/agent";
import { Logger } from "../src/utils";

import { ModelResponseSchema, ObjectiveComplete } from "../src/types";

const parser = yargs(process.argv.slice(2)).options({
  headless: { type: "boolean", default: true },
});

async function main() {
  const argv = await parser.parse();

  const startUrl = "https://practicetestautomation.com/practice-test-login/";
  const objective = "please login into the website";
  const maxIterations = 10;

  const providerOptions = {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    provider: "anthropic",
  };

  // We can create a chat api using the completionApiBuilder.
  // These can be swapped out for other providers like OpenAI
  const chatApi = completionApiBuilder(providerOptions, {
    model: "claude-3-5-sonnet-20240620",
  });

  if (!chatApi) {
    throw new Error(
      `Failed to create chat api for ${providerOptions.provider}`
    );
  }

  // You can define a custom callback function to handle logs
  // this callback will print logs to the console
  // but you can further extend this to send logs to a logging service
  const logger = new Logger(["info"], (msg) => console.log(msg));

  // here we define the inventory
  // inventories are used to store values that can be used in the browser
  // for example, a username and password
  // information in the inventory can be used in the browser to to complete tasks
  // inventory values are never exposed to either collective memory or the model api
  const inventory = new Inventory([
    { value: "student", name: "Username", type: "string" },
    { value: "Password123", name: "Password", type: "string" },
  ]);

  const agent = new Agent({ modelApi: chatApi });
  const agentBrowser = new AgentBrowser({
    agent,
    browser: await Browser.launch(argv.headless, agent),
    inventory,
    logger,
  });

  const answer = await agentBrowser.browse(
    {
      startUrl: startUrl,
      objective: [objective],
      maxIterations: maxIterations,
    },
    ModelResponseSchema(ObjectiveComplete)
  );

  console.log("Answer:", answer?.result);
  await agentBrowser.close();
}

main();
