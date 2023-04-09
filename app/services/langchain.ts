import { OpenAI } from 'langchain';

import { initializeAgentExecutor } from 'langchain/agents';
import { SerpAPI, Calculator } from 'langchain/tools';

export async function getAgentModel() {
  const model = new OpenAI({ temperature: 0 });
  const tools = [new SerpAPI(), new Calculator()];

  const executor = await initializeAgentExecutor(
    tools,
    model,
    'zero-shot-react-description'
  );
  console.log('Loaded agent.');

  return executor;
}

export function getChatModel({ temperature = 0.1 }: { temperature?: number }) {
  const aiModel = new OpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature,
  });

  return aiModel;
}
