import { fetch } from '@remix-run/web-fetch';
import { load } from 'cheerio';
import {
  cleanHTMLSummary,
  getHTMLSummary,
} from '~/models/reasoning/chat.server';
import type { PluginDetail } from '~/types';

export const pluginDescription: PluginDetail = {
  name: 'summarise',
  displayName: 'Page Summariser',
  description: `
    Allows you to visit a webpage and extract a detailed summary of the content.
    Includes any relevant links.
  `,
  usage: 'summarise(url)',
};

export default async function summarise(config: any, url: string) {
  if (!url) return 'Please provide a url to summarise';
  const chunkSize = 15000;

  const html = await getPageContent({ url });

  if (!html) return 'Unable to extract webpage from URL';

  let chunksSummaries = [];
  const htmlLength = html.length;
  const numberOfChunks = Math.ceil(htmlLength / chunkSize); //

  for (let i = 0; i < numberOfChunks; i++) {
    const chunk = html.slice(i * chunkSize, (i + 1) * chunkSize);
    const chunkSummary = await getHTMLSummary(chunk);
    chunksSummaries.push(chunkSummary);

    console.log('Chunk', i, 'summarised');
  }

  const rawSummary = chunksSummaries.join(' ');
  const summary = await cleanHTMLSummary(rawSummary);

  return summary;
}

async function getPageContent({ url }: { url: string }) {
  console.log('Browsing: ', url);
  const response = await fetch(url);
  const body = await response.text();

  const $ = load(body);
  const elements = ['h1', 'h2', 'h3', 'h4', 'p'];
  let text = '';
  for (const element of elements) {
    text += $(element).text();
  }

  return text.replace(/[^\w ]/g, '');
}
