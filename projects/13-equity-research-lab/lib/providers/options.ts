export type OptionChainRow = {
  expiration: string;
  strike: number;
  type: "call" | "put";
  bid?: number;
  ask?: number;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  openInterest?: number;
  volume?: number;
};

export interface OptionsProvider {
  getChain(ticker: string): Promise<OptionChainRow[]>;
}

export class MassiveOptionsProvider implements OptionsProvider {
  async getChain(_ticker: string): Promise<OptionChainRow[]> {
    if (!process.env.MASSIVE_API_KEY) return [];
    // Adapter boundary intentionally isolated: map your licensed provider's
    // option-chain response into OptionChainRow here. Never expose API keys client-side.
    return [];
  }
}
