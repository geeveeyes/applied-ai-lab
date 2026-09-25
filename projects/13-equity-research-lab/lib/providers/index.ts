import { SecProvider } from "./sec";
import { FmpAnalystProvider, FmpMarketProvider } from "./fmp";
import { OpenAIResearchProvider } from "./openai";

export const providers = {
  sec: new SecProvider(),
  market: new FmpMarketProvider(),
  analysts: new FmpAnalystProvider(),
  ai: new OpenAIResearchProvider(),
};
