// import { writeFile } from 'fs/promises';
import invariant from 'tiny-invariant';

import { NATURAL_LANGUAGE_TO_DATE_PROMPTER } from '~/config/prompts';
import { gpt } from '~/services/gpt.server';

let MAX_RETRIES = 3;

export async function convertNaturalDateToISO(
  date: string,
  retries = 0
): Promise<string> {
  try {
    const { data } = await gpt.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: NATURAL_LANGUAGE_TO_DATE_PROMPTER(date),
        },
      ],
      temperature: 0.6,
    });

    if (!data?.choices[0]?.message?.content)
      invariant(false, 'No response from GPT-3');

    const response = data.choices[0].message.content;
    // eslint-disable-next-line no-new-func
    const getDateFn = Function(`return ${response}`);

    // await writeFile(`./date-fn.js`, response, { encoding: 'utf-8' });
    const parsedDate = getDateFn();

    return parsedDate;
  } catch (error) {
    console.error('Date converter:', error);
    if (retries >= MAX_RETRIES) throw new Error(`Unable to get today's date`);
    return await convertNaturalDateToISO(date, retries + 1);
  }
}
