import type { PluginDetail } from '~/types';
import { compareHTMLOutputWithPrompt } from '~/models/reasoning/chat.server';
import { searchApi } from '~/services/search.server';
import summarise from './summarise';

export const pluginDescription: PluginDetail = {
  name: 'search',
  displayName: 'Web Search API',
  description: `
    Search for answers to factual questions.
    Returns an AI summary of a Bing web search for the query.
  `,
  usage: 'search(query)',
};

export default async function search(config: any, query: string) {
  const searchResults = await searchApi(query);

  console.log('searchResults', searchResults);

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

    const pageSummary = await summarise({}, url);
    if (!pageSummary) continue;

    const information = await compareHTMLOutputWithPrompt(query, pageSummary);
    // Regex to remove any special characters and numbers
    const regex = /[^a-zA-Z ]/g;
    const informationWithoutSpecialCharacters = information.replace(regex, '');
    const satisfiesQuery =
      informationWithoutSpecialCharacters.toUpperCase() !== 'NO';

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
