import type { WebPage } from 'azure-cognitiveservices-websearch/lib/models';
import { fetch } from '@remix-run/web-fetch';

export async function searchApi(query: string) {
  if (process.env.BING_SEARCH_KEY_1 === undefined) {
    throw new Error('BING_SEARCH_API_KEY is not defined');
  }

  const response = await fetch(
    `${process.env.BING_SEARCH_ENDPOINT}v7.0/search?q=${query}`,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.BING_SEARCH_KEY_1,
      },
    }
  );

  const responseData = await response.json();
  return responseData as {
    webPages: {
      value: WebPage[];
    };
  };
}
