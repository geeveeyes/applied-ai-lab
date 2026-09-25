import {expect,it} from "vitest";
import {providerErrorDetail} from "../lib/providers/fmp";
it("does not pretend HTTP 402 proves an endpoint is excluded",()=>{
 const detail=providerErrorDetail(402,JSON.stringify({"Error Message":"Symbol NBIS is not available under this subscription"}),"secret");
 expect(detail).toContain("Symbol NBIS");
 expect(detail).toContain("endpoint or symbol entitlement");
 expect(detail).not.toContain("endpoint not included");
});
it("redacts echoed credentials and request URLs",()=>{
 const detail=providerErrorDetail(402,JSON.stringify({message:"key abc&123 at https://provider.test/path?apikey=abc%26123 token=other-secret"}),"abc&123");
 expect(detail).not.toMatch(/abc|other-secret|https:/);
 expect(detail).toContain("redacted");
});
it("does not expose an HTML error page",()=>{
 expect(providerErrorDetail(502,"<html>internal proxy details</html>","secret")).not.toContain("internal");
});
