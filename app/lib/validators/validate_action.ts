import type { ChatActionArgs, ElementType } from '~/types';
import {
  ACTION_REQUIRED_ARGS,
  ACTION_TYPE_DATA_REGEX,
  CHAT_ACTION,
  POSSIBLE_ACTIONS,
  REFINE_ACTION,
} from '~/config/actions';
import { convertNaturalDateToISO } from '~/models/processing/formatting.server';
import constructNextActionStepMessage from '../helpers/construct_next_action_step_message';
import { updateActionFlow } from '~/models/memory/action.server';
import type { User } from '@prisma/client';

export default async function validateAction(
  response: string,
  actionFlowId: number | undefined,
  user: User
) {
  // terminate early if gpt can't map the response to an action
  const sanitisedResponse = response.split('Assistant: ')[1] || CHAT_ACTION;
  if (sanitisedResponse === CHAT_ACTION) {
    return { action: CHAT_ACTION, args: {} };
  }

  // sanitise the response and extract the action and args
  const [possibleAction, possibleArgs] = sanitisedResponse.split('|');
  let action = POSSIBLE_ACTIONS.includes(possibleAction as any)
    ? (possibleAction as ElementType<typeof POSSIBLE_ACTIONS>)
    : CHAT_ACTION;

  // terminate early if gpt outputs an action that can't be performed
  if (action === CHAT_ACTION) return { action, args: {} };

  const REQUIRED_ARGS = ACTION_REQUIRED_ARGS[action];
  // convert the args to the ChatActionArgs type
  let processedArgs =
    possibleArgs
      ?.split('&')
      .map((arg) => arg.split('='))
      .reduce((acc, [key, value]) => {
        const argBody = {
          id: key,
          value,
          isValid: false,
          isRequired: REQUIRED_ARGS?.length && REQUIRED_ARGS.includes(key),
        };

        acc[key] = argBody;
        return acc;
      }, {} as ChatActionArgs) || {};

  const processedArgKeys = Object.keys(processedArgs);
  // Check if there are any required args to be validated
  // and return early if there are none
  if (!processedArgKeys.length) return { action, args: processedArgs };

  // validate if given args are valid for the action
  for (const key of processedArgKeys) {
    const argRegex = ACTION_TYPE_DATA_REGEX[key];
    const argBody = processedArgs[key as any];
    const argValue = argBody.value;

    // We need to run a freshly built script to get the current date
    // as gpt isn't able to do this by itself
    if (key === 'date' && argValue) {
      const possibleDate = await convertNaturalDateToISO(argValue);
      const isValidDate = possibleDate;

      if (isValidDate) {
        argBody.value = possibleDate;
        argBody.isValid = true;
      } else {
        argBody.isValid = false;
      }
      // use regexes to validate every other type of arg
    } else if (!argRegex.test(argValue)) {
      argBody.isValid = false;
    }

    processedArgs[key] = argBody;
  }

  const allInvalidArgs = Object.values(processedArgs).filter(
    (arg) => arg.isValid === false
  );

  if (allInvalidArgs.length) {
    return {
      action: REFINE_ACTION,
      args: processedArgs,
      // generate a message to obtain missing args from the user
      message: await constructNextActionStepMessage({
        action,
        args: processedArgs,
      }),
    };
  }

  if (!actionFlowId) {
    const actionFlow = await updateActionFlow({
      user,
      action: {
        name: action,
      },
    });
    actionFlowId = actionFlow.id;
  }

  return { action, args: processedArgs, actionFlowId };
}
