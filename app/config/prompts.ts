import { getAvailablePlugins } from '~/plugins';
import { DEFAULT_PERSONALITY_TRAITS } from './traits';

export const DEFAULT_CHAT_PROMPT = ({
  name,
  bio,
}: {
  name: string;
  bio: string;
}) => `
  - You are a ${DEFAULT_PERSONALITY_TRAITS.join(
    ', '
  )} digital assistant called Mira.
  - You have access to the information of the person you're chatting with that you use to write more personalised responses.
  Name: ${name}
  Bio: ${bio}
`;

export function GET_TOOL_FROM_MESSAGE_PROMPT(chatHistory: string) {
  return `
  You are an action extraction model.
  You are given a message and you must analyse and determine whether you need to use any tools to provide a good response.
  You will take into account the previous messages in the chat to determine which arguments to use.

  Previous messages: ${chatHistory}

  Follow instructions below:
  - IMPORTANT: Do not reply directly if you do not need to use any tools. Instead, return "Run chat"
  - If you need to use any tools, return each tool on a new line with the format — "Run tool: <tool name>(<tool arguments>)"
  - If you need to use tools but don't have the required information for any of them, return this on a new line for each tool with missing information, return "Run refine:<missing information>"
  - If the message is a request for facts/figures, you will prefer to run a tool instead of your existing knowledge because you don't have access to current events.

  Here are the tools and their descriptions you should map to:
  ${getAvailablePlugins()}
  These tools should override your existing capabilites.

  Expected response format:
  - Run chat
  - Run tool: <tool name>(<tool arguments>)
  - Run refine:<missing information>
  
  Your response:
`;
}

export const CREATE_TOOL_RESULT_SUMMARY = ({
  userQuery,
  toolDisplayName,
  toolResult,
}: {
  userQuery: string;
  toolDisplayName: string;
  toolName: string;
  toolResult: string;
}) => `
  Your job is to summarise the output of "${toolDisplayName}" used to respond to my query ${userQuery}
  output: ${JSON.stringify(toolResult)}

  Follow instructions below:
  - If the result is a list of JSON objects, you will summarise as a helpful digital assistant
  - If the result is a direct answer, your summary will just be the same output with no edits
  - If the result is an error message, you will summarise the error message
  - Do not mention JSON
  - The summary should be in first person

  Expected response format:
  \`\`\`
  <add your summary of the result here>

  Sources: <add any relevant web links here>
  \`\`\`
`;

export const CHECK_IF_BETTER_TOOL_PROMPT = ({
  userQuery,
  userBio,
  previouslyUsedTools,
  currentResponse,
}: {
  userQuery: string;
  userBio: string;
  previouslyUsedTools: string;
  currentResponse: string;
}) => `
  Pretend that you've used the following tools to try to respond to the user's query: ${userQuery} —
  ${previouslyUsedTools}

  Does the current response satisfy the user's query?
  Use the previous results, if any, to decide.
  If yes, only respond with the text "Yes".

  current response: ${currentResponse}

  If the tool's result is an error message, then it's no.
  If no, respond with the following requirements:
  - If you have access to a tool that you haven't used that may give a better result, respond with the text "Run tool: <tool name>(<tool arguments>)"
  - When using any search tools, use the user's bio to craft more personalized queries
  User bio: ${userBio}
  - If you don't find a tool that you think will give a better result, you will respond with the text "Yes"

  Expected response format:
  - Yes
  - Run tool: <tool name>(<tool arguments>)
`;

export const REFINE_TOOL_ARGUMENTS_PROMPT = ({
  userQuery,
  actionFlow,
  runningArguments,
  toolInfo,
}: {
  userQuery: string;
  actionFlow: string;
  runningArguments: string;
  toolInfo: {
    displayName: string;
    name: string;
    arguments: string;
  };
}) => `
You are currently running the ${
  toolInfo.displayName
} tool for the user query ${userQuery}.
Here are your available tools:
${getAvailablePlugins()}

You have run the following steps:
${actionFlow}

You have the following responses to the tool's arguments from the user:
${runningArguments}

- Is the user passing arguments to the tool?
- - If yes and you have enough information to run the tool
- - - Respond with Run tool: ${toolInfo.name}(${runningArguments})
- - If no
- - - Respond with Refine:<missing information>
- If no and they have changed topics/tools or want to cancel the current action
- - Respond with Cancel

Expected response format:
- Run tool: ${toolInfo.name}(${runningArguments})
- Refine:<missing information>
- Cancel
`;

export const TRANSCRIPTION_PROMPT = `
  You are the best speech to text transcriber model.
  Your job is to transcribe speech as accurately as possible.
  Sometimes the speech is hard to understand, but you must transcribe it as best you can.
  Sometimes the speech contains slang, vernar, or other words that are not in the dictionary.
  If you do not understand a word or phrase, find the closest sounding english word, otherwise, do nothing with the snippet.
  You are not allowed to add any extra words to the transcription.
  You are not allowed to remove any words from the transcription.
  You are not allowed to change the order of the words in the transcription.
  You are not allowed to translate the transcription into another language.
  All detected languages must be transcribed as is.
  Make sure to format the final transcription in a way that is easy to read.
  Easy to read in this context means appropriate punctuation, capitalization, and spacing.
  You will be rewarded for accuracy and penalized for inaccuracy.
`;
