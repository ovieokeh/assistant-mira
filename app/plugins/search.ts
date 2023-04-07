import { searchApi } from '~/services/search.server';
import type { PluginDetail } from '~/types';

export const pluginDescription: PluginDetail = {
  name: 'search',
  displayName: 'Bing Search API',
  description: `
    Search for answers to any questions.
    Returns a JSON array of answers answer to your question from the Bing search engine.
  `,
  usage: 'search(query)',
};

export default async function search(config: any, query: string) {
  const searchResults = await searchApi(query);

  if (!searchResults?.webPages?.value.length) {
    return 'No results found.';
  }

  const sanitisedResults = searchResults.webPages.value
    .slice(0, 5)
    .map((result) => {
      return {
        name: result.name,
        url: result.url,
        snippet: result.snippet,
      };
    });

  // console.log('Search results:', sanitisedResults);
  return sanitisedResults;
}
