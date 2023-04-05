import invariant from 'tiny-invariant';

import { NATURAL_LANGUAGE_TO_DATE_PROMPTER } from '~/config/prompts';
import { gpt } from '~/gpt.server';

export async function convertNaturalDateToISO(date: string) {
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

  if (!data?.choices[0]?.message) invariant(false, 'No response from GPT-3');

  // console.info("Date converter:", data.choices);

  const response = data.choices[0].message.content;
  // eslint-disable-next-line no-new-func
  const getDateFn = Function(`return ${response}`)();
  const parsedDate = getDateFn();

  console.log('Date converter:', parsedDate);

  return parsedDate;
}
