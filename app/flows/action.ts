import type { User } from '@prisma/client';
import type { ChatActionArgs } from '~/types';
import { MessagingState } from '@prisma/client';

import { prisma } from '~/db.server';
import constructNextActionStepMessage from '~/lib/helpers/construct_next_action_step_message';
import sendWhatsappMessage from '~/lib/helpers/send_whatsapp_message';
import { setUserMessagingState } from '~/models/memory/user.server';

type ActionFlow = {
  user: User;
  messageData: any;
  action: any;
  args: ChatActionArgs;
};

export const processActionFlow = async ({
  user,
  messageData,
  action,
  args,
}: ActionFlow) => {
  const AIMessage = await constructNextActionStepMessage({
    action,
    args,
  });

  const previousAction = await prisma.action.findFirst({
    where: {
      userId: user.id,
      status: 'PENDING',
    },
  });

  let workingAction = previousAction;

  if (!previousAction) {
    // TODO: cancel previous action
    workingAction = await prisma.action.create({
      data: {
        userId: user.id,
        name: action,
        status: 'PENDING',
      },
    });

    console.log('starting action flow', action, AIMessage);
    await setUserMessagingState({
      phone: user.phone,
      state: MessagingState.ACTION,
    });

    await sendWhatsappMessage({
      to: user.phone,
      text: AIMessage,
      humanText: messageData.humanText,
      userId: user.id,
      actionId: workingAction.id,
    });
  } else {
    console.log('continuing action flow', AIMessage);
  }

  return workingAction;
};
