import { createReadStream, createWriteStream } from 'fs';
import https from 'https';

import { TRANSCRIPTION_PROMPT } from '~/config/prompts';
import { gpt } from '~/gpt.server';
import exec from '~/lib/helpers/exec';

const generateRandomId = () => Math.random().toString(36).substring(2, 15);

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
