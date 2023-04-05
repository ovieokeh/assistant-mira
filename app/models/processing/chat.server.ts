import type { Message, User } from '@prisma/client';
import { MessagingState } from '@prisma/client';
import invariant from 'tiny-invariant';

import { ACTION_PRIMER } from '~/config/prompts';

import { gpt } from '~/services/gpt.server';
import validateAction from '~/lib/validators/validate_action';
import { getCurrentActionFlow } from '../memory/action.server';

export async function analysePossibleActions({
  message,
  user,
}: {
  message: string;
  user: User;
}) {
  try {
    if (user.currentState === MessagingState.ACTION) {
      const currentActionFlow = await getCurrentActionFlow(user);

      console.log('Current action flow:', currentActionFlow);
      // if the user is in the middle of an action flow and sends a message
      // we need to validate the message and return the next step in the flow
      // const { action, args } = await actionArgsFlow({
      //   message,
      //   user,
      // });

      // return { action, args };
    }

    const { data } = await gpt.createCompletion({
      model: 'text-davinci-003',
      prompt: `${ACTION_PRIMER(user.currentState)}\n${message}`,
      temperature: 0.2,
      user: user.phone,
    });

    // get the analysis from gpt
    const response = data.choices[0].text;
    if (!response) {
      invariant(false, 'No response from GPT-3');
    }

    console.log({ response });

    // validate if action is possible
    return await validateAction(response);
  } catch (error) {
    console.error(error);
  }
}

export async function completeChatMessages({
  messages,
  phone,
}: {
  messages: Pick<Message, 'role' | 'content'>[];
  phone: string;
}) {
  try {
    const { data } = await gpt.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.2,
      user: phone,
    });

    if (!data?.choices[0]?.message) invariant(false, 'No response from GPT-3');

    const reply = data.choices[0].message.content;
    const sanitisedReply = reply.replace(
      /As an AI language model,/g,
      'As your personal digital assistant,'
    );

    return sanitisedReply;
  } catch (error: any) {
    console.error(error.response.data);
  }
}
