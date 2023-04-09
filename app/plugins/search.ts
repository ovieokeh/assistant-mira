import { fetch } from '@remix-run/web-fetch';
import { load } from 'cheerio';
import { compareHTMLOutputWithPrompt } from '~/models/reasoning/chat.server';
import { searchApi } from '~/services/search.server';
import type { PluginDetail } from '~/types';

export const pluginDescription: PluginDetail = {
  name: 'search',
  displayName: 'Bing Search API',
  description: `
    Search for answers to factual questions.
    Returns a JSON array of answers from the Bing search engine.
  `,
  usage: 'search(query)',
};

export default async function search(config: any, query: string) {
  const searchResults = await searchApi(query);

  if (!searchResults?.webPages?.value.length) {
    return 'No results found.';
  }

  const sanitisedResults = searchResults.webPages.value
    .slice(0, 3)
    .map((result) => {
      return {
        url: result.url,
        snippet: result.snippet,
      };
    });

  const visitedUrls = new Set();

  for (const result of sanitisedResults) {
    const { url } = result;

    if (!url) continue;

    const resultHTML = await getPageContent({ url });

    if (!resultHTML) continue;

    const information = await compareHTMLOutputWithPrompt(query, resultHTML);
    const satisfiesQuery = information !== 'NO';

    visitedUrls.add(url);

    if (satisfiesQuery) {
      return {
        url,
        information,
        finalUrl: url,
        visitedUrls: [...visitedUrls],
        satisfiesQuery: true,
      };
    }
  }

  return 'Unable to find a satisfactory answer.';
}

async function getPageContent({ url }: { url: string }) {
  console.log('Browsing: ', url);
  // get html text from reddit
  const response = await fetch(url);
  // using await to ensure that the promise resolves
  const body = await response.text();
  // parse the html text and extract titles
  const $ = load(body);
  const elements = ['h1', 'h2', 'h3', 'h4', 'p'];
  let text = '';
  for (const element of elements) {
    text += $(element).text();
  }

  return text.replace(/[^\w ]/g, '').slice(0, 2000);
}
