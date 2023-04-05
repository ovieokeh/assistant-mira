import { ConversionState } from '@prisma/client';
import type { ActionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import type { JobEventData } from 'cloudconvert/built/lib/JobsResource';
import sendWhatsappMessage from '~/lib/helpers/send_whatsapp_message';
import {
  getConversionJob,
  updateConversionJob,
} from '~/models/memory/conversion.server';
import { getUserProfile } from '~/models/memory/user.server';
import { createTranscription } from '~/models/processing/actions.server';

export async function action({ request }: ActionArgs) {
  let statusCode = 400;
  let response = null;

  try {
    const body = (await request.json()) as JobEventData;
    const jobId = body.job.id;

    const jobInDb = await getConversionJob(jobId);
    if (!jobInDb) {
      return json('UNABLE_TO_FIND_TRANSCRIPTION_JOB', 404);
    }

    if (jobInDb.currentState === ConversionState.COMPLETED) {
      return json('TRANSCRIPTIONS_ALREADY_DONE', 204);
    }

    if (!body.job.tasks || !body.job.tasks.length) {
      return json('NO_TASKS_FOUND', 404);
    }

    const audioUrls = body.job.tasks
      .map((task) =>
        task.result?.files ? task.result.files.map((file) => file.url) : null
      )
      .flat(3)
      .filter(Boolean);

    for (const url of audioUrls) {
      if (!url) continue;

      const transcription = await createTranscription({ audioUrl: url });

      if (transcription) {
        const user = await getUserProfile({ phone: jobInDb.user });

        if (!user) continue;

        const message = {
          to: jobInDb.user,
          humanText: 'You sent an audio file.',
          text: `Here's your transcription: \n\n${transcription}\n\n`,
          userId: user.id,
        };

        await sendWhatsappMessage(message);
      }
    }

    await updateConversionJob({
      id: jobId,
      data: {
        currentState: ConversionState.COMPLETED,
      },
    });

    statusCode = 200;
    response = 'TRANSCRIPTIONS_COMPLETED';
    return json(response, statusCode);
  } catch (error) {
    return json(error, statusCode);
  }
}
