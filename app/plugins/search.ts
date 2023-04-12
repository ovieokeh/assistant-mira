import type { PluginDetail } from '~/types';
import { compareHTMLOutputWithPrompt } from '~/models/reasoning/chat.server';
import { searchApi } from '~/services/search.server';
import summarise from './summarise';

export const pluginDescription: PluginDetail = {
  name: 'search',
  displayName: 'Web Search',
  description: `
    Search for answers to factual questions.
    IMPORTANT: Do not use at the same time with the "summarise" tool.
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

    const pageSummary = await summarise({}, url);
    if (!pageSummary.summary) continue;

    const information = await compareHTMLOutputWithPrompt(
      query,
      pageSummary.summary
    );

    const satisfiesQuery = information.satisfiesQuery;

    visitedUrls.add(url);

    if (satisfiesQuery) {
      return {
        url,
        information,
        finalUrl: url,
        visitedUrls: [...visitedUrls],
        shouldSummarise: false,
        summary: `${information.message}
Sources:
${[...visitedUrls].map((url) => '- ' + url).join('\n')}
        `,
      };
    }
  }

  return 'Unable to find a satisfactory answer.';
}
