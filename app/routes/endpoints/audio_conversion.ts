import type { JobTemplate } from 'cloudconvert/built/lib/JobsResource';
import type { ActionArgs } from '@remix-run/node';
import { ConversionState } from '@prisma/client';
import { json } from '@remix-run/node';
import CloudConvert from 'cloudconvert';

import { createConversionJob } from '~/models/memory/conversion.server';

export async function action({ request }: ActionArgs) {
  try {
    const { CLOUD_CONVERT_API_KEY } = process.env;

    if (!CLOUD_CONVERT_API_KEY) {
      return json({ error: 'No CloudConvert API key provided' }, 500);
    }

    const cloudConvert = new CloudConvert(CLOUD_CONVERT_API_KEY);
    const audioMessages = await request.json();

    for (const audioMessage of audioMessages) {
      if (!audioMessage.url) continue;

      const conversionData: JobTemplate = {
        tasks: {
          import: {
            operation: 'import/url',
            url: audioMessage.url,
            headers: {
              Authorization: `Bearer ${process.env.CLOUD_API_PERMANENT_TOKEN}`,
            },
          },
          convert: {
            operation: 'convert',
            input: ['import'],
            input_format: 'oga',
            output_format: 'mp3',
            engine: 'ffmpeg',
            audio_codec: 'mp3',
            audio_qscale: 0,
          },
          export: {
            operation: 'export/url',
            input: ['convert'],
          },
        },
      };

      const conversionResponseData = await cloudConvert.jobs.create(
        conversionData
      );

      const conversionJobId = conversionResponseData.id;

      await createConversionJob({
        id: conversionJobId,
        user: audioMessage.from,
        currentState: ConversionState.PENDING,
        url: audioMessage.url,
      });
    }

    const statusCode = 200;
    const response = 'CONVERSIONS_STARTED';
    return json(response, statusCode);
  } catch (error: any) {
    const statusCode = 500;
    const response = 'CONVERSIONS_FAILED';
    return json({ response, error: error.message }, statusCode);
  }
}
