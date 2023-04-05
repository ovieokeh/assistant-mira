import type { ChatActionArgs } from '~/types';
import type { User } from '@prisma/client';
import { ActionStatus } from '@prisma/client';
import { MessagingState } from '@prisma/client';

import constructNextActionStepMessage from '~/lib/helpers/construct_next_action_step_message';
import sendWhatsappMessage from '~/lib/helpers/send_whatsapp_message';
import { setUserMessagingState } from '~/models/memory/user.server';
import { updateActionFlow } from '~/models/memory/action.server';

type ActionFlow = {
  user: User;
  messageData: any;
  action: any;
  actionFlowId?: number;
  args: ChatActionArgs;
};

export const processActionFlow = async ({
  user,
  messageData,
  action,
  actionFlowId,
  args,
}: ActionFlow) => {
  const AIMessage = await constructNextActionStepMessage({
    action,
    args,
  });

  let workingActionId = actionFlowId;

  if (!workingActionId) {
    // TODO: cancel previous action
    const workingAction = await updateActionFlow({
      user,
      action: {
        name: action,
      },
    });
    workingActionId = workingAction.id;
  } else {
    await updateActionFlow({
      user,
      action: {
        id: actionFlowId,
        status: ActionStatus.CANCELLED,
      },
    });
  }

  await setUserMessagingState({
    phone: user.phone,
    state: MessagingState.ACTION,
  });

  await sendWhatsappMessage({
    to: user.phone,
    text: AIMessage,
    humanText: messageData.humanText,
    userId: user.id,
    actionId: workingActionId,
  });

  return workingActionId;
};
