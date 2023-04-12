import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import formatWhatsappMessages from '~/helpers/format_whatsapp_messages';
import sendWhatsappMessage from '~/helpers/send_whatsapp_message';
import { getUserProfile } from '~/models/memory/user.server';
import { processChatMessage } from '~/processors/process_chat_message';
import processAudioMessages from '~/processors/process_audio_message';
import type {
  WhatsappAudioMessageContent,
  WhatsappTextMessageContent,
} from '~/types';

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const challenge = url.searchParams.get('hub.challenge');
  const providedVerifyToken = url.searchParams.get('hub.verify_token');

  let statusCode = 400;
  let response = null;

  switch (mode) {
    case 'subscribe':
      if (providedVerifyToken !== process.env.VERIFY_TOKEN) {
        response = 'WEBHOOK_VERIFICATION_FAILED';
        break;
      }

      response = challenge ? +challenge : 'NO_CHALLENGE';
      statusCode = challenge ? 200 : statusCode;

      return json(response, statusCode);

    default:
      return json('OK', 200);
  }
}

export async function action({ request }: ActionArgs) {
  const body = await request.json();

  let statusCode = 400;
  let response = null;

  try {
    if (body.object !== 'whatsapp_business_account') {
      response = 'UNKOWN_OBJECT';
      return json(response, statusCode);
    }

    const { chatMessages, audioMessages } = formatWhatsappMessages(body.entry);
    const message = chatMessages[0] as WhatsappTextMessageContent;

    const user = await getUserProfile({ phone: message.from });
    if (!user)
      return await sendWhatsappMessage({
        to: message.from,
        text: `I don't know who you are. Please register with me first at https://mira-assistant-staging.fly.dev/join`,
        humanText: message.text.body,
        userId: null,
      });

    await processChatMessage({ message, user });
    await processAudioMessages(audioMessages as WhatsappAudioMessageContent[]);

    statusCode = 200;
    response = 'RESPONSE_FLOW_STARTED';
    return json(response, statusCode);
  } catch (error: any) {
    console.error('final catch', error);
    return json(error, statusCode);
  }
}
