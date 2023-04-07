import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import formatWhatsappMessages from '~/helpers/format_whatsapp_messages';
import processAudioMessages from '~/processors/process_audio_messages';
import processChatMessages from '~/processors/process_chat_messages';
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

    await processChatMessages(chatMessages as WhatsappTextMessageContent[]);
    await processAudioMessages(audioMessages as WhatsappAudioMessageContent[]);

    statusCode = 200;
    response = 'RESPONSE_FLOW_STARTED';
    return json(response, statusCode);
  } catch (error: any) {
    console.error('final catch', error);
    return json(error, statusCode);
  }
}
