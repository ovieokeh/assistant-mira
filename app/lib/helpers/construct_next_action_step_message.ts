import type { POSSIBLE_ACTIONS } from '~/config/actions';
import type { ChatActionArgs, ElementType } from '~/types';

export default async function constructNextActionStepMessage({
  action,
  args,
}: {
  action: ElementType<typeof POSSIBLE_ACTIONS>;
  args: ChatActionArgs;
}) {
  const argsIds = Object.keys(args);
  console.log('missing args', args);
  const missingArgsRequestMessage = `I need the following information to perform the ${action} action: ${argsIds.join(
    ', '
  )}`;

  // await transform to natural language
  return missingArgsRequestMessage;
}
