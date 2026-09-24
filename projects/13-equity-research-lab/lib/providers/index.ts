import { SecProvider } from "./sec";
import { FmpAnalystProvider } from "./fmp";

export const providers = {
  sec: new SecProvider(),
  analysts: new FmpAnalystProvider(),
};
