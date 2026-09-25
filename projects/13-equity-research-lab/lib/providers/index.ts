import { SecProvider } from "./sec";
import { FmpAnalystProvider } from "./fmp";
import { FallbackMarketProvider } from "./market";
import { OpenAIResearchProvider } from "./openai";

export const providers = {
  sec: new SecProvider(),
  market: new FallbackMarketProvider(),
  analysts: new FmpAnalystProvider(),
  ai: new OpenAIResearchProvider(),
};
