import { createReadStream, createWriteStream } from 'fs';
import https from 'https';

import { CREATE_SUMMARY_PRIMER, TRANSCRIPTION_PROMPT } from '~/config/prompts';
import { gpt } from '~/services/gpt.server';
import exec from '~/helpers/exec';
import invariant from 'tiny-invariant';

const generateRandomId = () => Math.random().toString(36).substring(2, 15);

export async function createSummary({
  dataType,
  jsonData,
}: {
  dataType: string;
  jsonData: string;
}) {
  try {
    const { data } = await gpt.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: CREATE_SUMMARY_PRIMER(dataType, jsonData),
        },
      ],
      temperature: 0.9,
    });

    const response = data.choices[0].message?.content;
    if (!response) {
      invariant(false, 'No response from GPT-3');
    }

    return response;
  } catch (error: any) {
    console.error('summary error', error?.response.data);
    return '';
  }
}

export async function createTranscription({ audioUrl }: { audioUrl: string }) {
  const id = generateRandomId();
  const filename = `/tmp/${id}.mp3`;

  try {
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filename);

      https.get(audioUrl, (stream) => {
        stream.on('end', async () => {
          const audioFileBuffer = createReadStream(filename);
          const transcription = await gpt.createTranscription(
            audioFileBuffer as any,
            'whisper-1',
            TRANSCRIPTION_PROMPT,
            'text',
            0.5
          );

          await exec(`rm ${filename}`);
          resolve(transcription.data);
        });

        stream.pipe(writeStream);
      });
    });
  } catch (error: any) {
    console.error('transcription error', error?.response.data);
    return '';
  }
}
