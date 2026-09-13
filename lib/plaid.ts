import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";

function getEnvConfig() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const envName = (process.env.PLAID_ENV ?? "sandbox").toLowerCase();

  if (!clientId || !secret) {
    throw new Error(
      "PLAID_CLIENT_ID and PLAID_SECRET must be set. See .env.example.",
    );
  }

  const basePath =
    envName === "production"
      ? PlaidEnvironments.production
      : envName === "development"
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox;

  return { clientId, secret, basePath, envName };
}

let cached: PlaidApi | null = null;

/** Server-side Plaid client. All credentials come from env vars only.
 *  Never log tokens — the plaid SDK request objects may contain them. */
export function getPlaidClient(): PlaidApi {
  if (!cached) {
    const { clientId, secret, basePath } = getEnvConfig();
    const configuration = new Configuration({
      basePath,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": clientId,
          "PLAID-SECRET": secret,
          "Plaid-Version": "2020-09-14",
        },
      },
    });
    cached = new PlaidApi(configuration);
  }
  return cached;
}

export const PLAID_PRODUCTS: Products[] = [Products.Transactions];
export const PLAID_COUNTRY_CODES: CountryCode[] = [CountryCode.Us];
