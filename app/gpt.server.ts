import { Configuration, OpenAIApi } from 'openai';
import invariant from 'tiny-invariant';

let gpt: OpenAIApi;

declare global {
  var __gpt__: OpenAIApi;
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
// in production we'll have a single connection to the DB.
if (process.env.NODE_ENV === 'production') {
  gpt = getGPT();
} else {
  if (!global.__gpt__) {
    global.__gpt__ = getGPT();
  }
  gpt = global.__gpt__;
}

function getGPT() {
  const { OPENAI_API_KEY } = process.env;
  invariant(
    typeof OPENAI_API_KEY === 'string',
    'OPENAI_API_KEY env var not set'
  );

  console.info('🔌 setting up opnai gpt client');
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const gpt = new OpenAIApi(configuration);
  return gpt;
}

export { gpt };
