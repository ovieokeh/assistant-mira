import { fetch } from '@remix-run/web-fetch';
import axios from 'axios';
import { load } from 'cheerio';
import {
  cleanHTMLSummary,
  getHTMLSummary,
} from '~/models/reasoning/chat.server';
import type { PluginDetail } from '~/types';

export const pluginDescription: PluginDetail = {
  name: 'summarise',
  displayName: 'URL Summariser',
  description: `
    Extracts the main content from a webpage.
    Includes any relevant links.
    IMPORTANT: Do not use at the same time with the "search" tool.
  `,
  usage: 'summarise(url)',
};

export default async function summarise(
  config: any,
  url: string
): Promise<{
  summary?: string;
  error?: string;
}> {
  if (!url) return { error: 'Please provide a url to summarise' };
  const chunkSize = 15000;

  const html = await getPageContent({ url });

  if (!html) return { error: 'Unable to extract webpage from URL' };

  let chunksSummaries = [];
  const htmlLength = html.length;
  const numberOfChunks = Math.ceil(htmlLength / chunkSize); //

  for (let i = 0; i < numberOfChunks; i++) {
    const chunk = html.slice(i * chunkSize, (i + 1) * chunkSize);
    const chunkSummary = await getHTMLSummary(chunk);
    chunksSummaries.push(chunkSummary);

    console.log('web page chunk', i + 1, 'summarised');
  }

  const rawSummary = chunksSummaries.join(' ');
  const summary = await cleanHTMLSummary(rawSummary);

  return {
    summary,
  };
}

async function getPageContent({ url }: { url: string }) {
  console.log('browsing: ', url);
  const response = await axios(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'text/html',
    },
  });
  const body = await response.data;

  const $ = load(body);
  const elements = ['h1', 'h2', 'h3', 'h4', 'p'];
  let text = '';
  for (const element of elements) {
    text += $(element).text();
  }

  const regexToValidateOnlyText = /^[a-zA-Z0-9:/_-\s]*$/g;
  text = text.replace(regexToValidateOnlyText, '');

  return text;
}
